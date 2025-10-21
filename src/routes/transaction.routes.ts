// src/routes/transaction.routes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// ==========================================================
// TRANSACTIONS ENDPOINTS
// ==========================================================

/**
 * @route   POST /transactions
 * @desc    Membuat transaksi pembelian baru [cite: 23]
 * @access  Private (Asumsi: Nanti butuh middleware auth)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // 1. Ambil data dari body
    const { userId, items } = req.body; // items: [{ bookId: string, quantity: number }]

    // 2. Validasi input
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid input: userId and a non-empty items array are required.' });
    }
    // Tambahkan validasi lebih detail jika perlu (misal: quantity harus > 0)

    // 3. Siapkan data & hitung total
    let totalAmount = 0;
    const processedBooks: { id: string; price: number; newStock: number; quantity: number }[] = [];

    // 4. Loop cek stok & harga (Perlu `await` di loop, tidak bisa pakai map async)
    for (const item of items) {
      if (!item.bookId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ message: `Invalid item data: ${JSON.stringify(item)}` });
      }

      const book = await prisma.book.findUnique({
        where: { id: item.bookId },
      });

      if (!book) {
        return res.status(404).json({ message: `Book with id ${item.bookId} not found` });
      }
      if (book.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for book: ${book.title} (Stock: ${book.stock})` });
      }

      totalAmount += book.price * item.quantity;
      processedBooks.push({
        id: item.bookId,
        price: book.price,
        newStock: book.stock - item.quantity,
        quantity: item.quantity,
      });
    }

    // 5. Jalankan dalam Prisma Transaction (Atomik)
    const newTransaction = await prisma.$transaction(async (tx) => {
      // a. Buat Transaction header
      const createdTransaction = await tx.transaction.create({
        data: {
          userId: userId,
          totalAmount: totalAmount,
        },
      });

      // b. Buat TransactionItems (detail)
      const transactionItemsData = processedBooks.map((book) => ({
        transactionId: createdTransaction.id,
        bookId: book.id,
        quantity: book.quantity,
        pricePerItem: book.price,
      }));
      await tx.transactionItem.createMany({ data: transactionItemsData });

      // c. Update stok buku
      for (const book of processedBooks) {
        await tx.book.update({
          where: { id: book.id },
          data: { stock: book.newStock },
        });
      }

      return createdTransaction;
    });

    // 6. Kirim response sukses
    res.status(201).json({ message: 'Transaction created successfully', transaction: newTransaction });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   GET /transactions
 * @desc    Melihat list semua pembelian yang tercatat 
 * @access  Public (atau Private tergantung kebutuhan)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: { select: { username: true } },
        items: {
          include: {
            book: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/statistics', async (req: Request, res: Response) => {
  try {
    // 1. Jumlah keseluruhan transaksi
    const totalTransactions = await prisma.transaction.count();

    // 2. Rata-rata nominal tiap transaksi
    const avgAmountResult = await prisma.transaction.aggregate({
      _avg: { totalAmount: true },
    });
    const averageTransactionAmount = avgAmountResult._avg.totalAmount || 0;

    // 3. Genre dengan transaksi paling banyak & sedikit
    // Ini agak kompleks: Hitung jumlah buku terjual per genre
    const genreSales = await prisma.transactionItem.groupBy({
      by: ['bookId'], // Group berdasarkan buku
      _sum: { quantity: true }, // Jumlahkan quantity per buku
    });

    // Ambil detail genre untuk setiap buku
    const bookIds = genreSales.map(item => item.bookId);
    const booksWithGenre = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, genreId: true, genre: { select: { name: true } } },
    });

    // Gabungkan hasil groupBy dengan info genre
    const salesByGenre: { [genreName: string]: number } = {};
    for (const sale of genreSales) {
      const book = booksWithGenre.find(b => b.id === sale.bookId);
      if (book && book.genre) {
        const genreName = book.genre.name;
        salesByGenre[genreName] = (salesByGenre[genreName] || 0) + (sale._sum.quantity || 0);
      }
    }

    // Cari genre min & max
 let mostSoldGenre: string | null = null;
            let leastSoldGenre: string | null = null;
            let maxSales = -1; // Initialize lower than any possible sale count
            let minSales = Infinity; // Initialize higher than any possible sale count
            let isFirstGenre = true; // Flag to handle the first iteration

            console.log("--- salesByGenre (before min/max loop):", salesByGenre);

            // Loop through the genres we found sales for
            for (const genreName in salesByGenre) {
                // Ensure the property belongs to the object itself
                if (Object.prototype.hasOwnProperty.call(salesByGenre, genreName)) {
                    const sales = salesByGenre[genreName]; // Get the sales count
                    console.log(`---> Checking genre: ${genreName}, Sales: ${sales}`);

                    // === START FIX ===
                    // Add a check to ensure sales is a valid number before proceeding
                    if (typeof sales === 'number' && isFinite(sales)) {
                        // Handle the very first genre found
                        if (isFirstGenre) {
                            mostSoldGenre = genreName;
                            leastSoldGenre = genreName;
                            maxSales = sales;
                            minSales = sales;
                            isFirstGenre = false; // Don't do this initialization again
                        } else {
                            // Compare with the current max
                            if (sales > maxSales) {
                                maxSales = sales;
                                mostSoldGenre = genreName;
                            }
                            // Compare with the current min
                            if (sales < minSales) {
                                minSales = sales;
                                leastSoldGenre = genreName;
                            }
                        }
                    } else {
                        // Log a warning if sales is not a valid number (shouldn't happen often)
                        console.warn(`---> Skipping genre '${genreName}' due to invalid sales count: ${sales}`);
                    }
                    // === END FIX ===
                }
            }
            console.log(`--- Min/Max Result: Most: ${mostSoldGenre} (${maxSales}), Least: ${leastSoldGenre} (${minSales})`);

            // 4. Kirim response
            res.status(200).json({
              totalTransactions,
              averageTransactionAmount,
              // Use nullish coalescing (??) for safer default values if minSales remains Infinity
              mostSoldGenre: mostSoldGenre ? { name: mostSoldGenre, totalItemsSold: maxSales } : null,
              leastSoldGenre: leastSoldGenre ? { name: leastSoldGenre, totalItemsSold: minSales === Infinity ? 0 : minSales } : null,
            });

  } catch (error) {
    console.error('Error fetching transaction statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   GET /transactions/:transaction_id
 * @desc    Melihat detail satu pembelian buku 
 * @access  Public (atau Private)
 */
router.get('/:transaction_id', async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.params;
    if (!transaction_id) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      include: {
        user: { select: { username: true } },
        items: {
          include: {
            book: { select: { title: true, author: true, price: true } },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.status(200).json(transaction);
  } catch (error) {
    console.error('Error fetching transaction detail:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   GET /transactions/statistics
 * @desc    Melihat statistik penjualan 
 * @access  Public (atau Private)
 */



// ==========================================================

export default router;
