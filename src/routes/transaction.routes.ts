// src/routes/transaction.routes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma'; // Import Prisma Client dari prisma.ts

const router = Router();

// ==========================================================
// TUGAS ANDA
// ==========================================================

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
    // 1. Ambil ID dari parameter URL
    const { transaction_id } = req.params;

    // ==========================================================
    // TAMBAHAN KODE BARU DI SINI (SOLUSI)
    // ==========================================================
    // 2. Validasi Tipe (meyakinkan TypeScript)
    if (!transaction_id) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }
    // ==========================================================

    // 3. Cari satu transaksi berdasarkan ID
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transaction_id, // Sekarang TS yakin 'transaction_id' adalah string
      },
      // 4. Sertakan juga detail relasinya
      include: {
        user: {
          select: { username: true },
        },
        items: {
          include: {
            book: {
              select: { title: true, author: true, price: true }, // Lebih detail
            },
          },
        },
      },
    });

    // 5. (PENTING) Handle jika data tidak ditemukan
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // 6. Kirim data jika ditemukan
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
// router.post('/', ...); // (Ini langkah kita selanjutnya)


// ==========================================================

export default router;