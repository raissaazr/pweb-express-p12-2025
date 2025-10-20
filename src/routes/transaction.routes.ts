// src/routes/transaction.routes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();
/*
 * @route   GET /transactions
 * @desc    Melihat list semua pembelian yang tercatat
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: { username: true },
        },
        items: {
          include: {
            book: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/*
 * @route   GET /transactions/:transaction_id
 * @desc    Melihat detail satu pembelian buku
 */
router.get('/:transaction_id', async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.params;

    if (!transaction_id) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transaction_id,
      },
      include: {
        user: {
          select: { username: true },
        },
        items: {
          include: {
            book: {
              select: { title: true, author: true, price: true },
            },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


/*
 * @route   POST /transactions
 * @desc    Membuat transaksi pembelian baru
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // 1. Ambil data dari body
    const { userId, items } = req.body; // items adalah array: [{ bookId: "...", quantity: 2 }, ...]

    // 2. Validasi input sederhana
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid input: userId and a non-empty items array are required.' });
    }

    // 3. Siapkan data
    let totalAmount = 0;
    const processedBooks: { id: string; price: number; newStock: number; quantity: number }[] = [];

    // 4. Looping untuk cek stok dan harga (Loop 1)
    for (const item of items) {
      const book = await prisma.book.findUnique({
        where: { id: item.bookId },
      });

      // Cek jika buku ada
      if (!book) {
        return res.status(404).json({ message: `Book with id ${item.bookId} not found` });
      }

      // Cek jika stok cukup
      if (book.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for book: ${book.title}` });
      }

      // Hitung total dan siapkan data
      totalAmount += book.price * item.quantity;
      processedBooks.push({
        id: item.bookId,
        price: book.price,
        newStock: book.stock - item.quantity,
        quantity: item.quantity,
      });
    }

    // 5. Jalankan semua operasi dalam satu transaksi (ATOMIK)
    const newTransaction = await prisma.$transaction(async (tx) => {
      // a. Buat Transaksi (header)
      const createdTransaction = await tx.transaction.create({
        data: {
          userId: userId,
          totalAmount: totalAmount,
        },
      });

      // b. Buat TransactionItems (detail)
      const transactionItemsData = processedBooks.map((book) => {
        return {
          transactionId: createdTransaction.id,
          bookId: book.id,
          quantity: book.quantity,
          pricePerItem: book.price, // Ambil harga yang sudah kita simpan
        };
      });

      await tx.transactionItem.createMany({
        data: transactionItemsData,
      });

      // c. Update stok buku
      for (const book of processedBooks) {
        await tx.book.update({
          where: { id: book.id },
          data: { stock: book.newStock },
        });
      }

      return createdTransaction; // Kembalikan data transaksi yang baru dibuat
    });

    // 6. Kirim response sukses
    res.status(201).json({ message: 'Transaction created successfully', transaction: newTransaction });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================================

export default router;
