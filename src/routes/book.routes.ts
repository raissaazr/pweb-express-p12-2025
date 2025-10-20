// src/routes/book.routes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma'; // Import Prisma Client

const router = Router();

/*
 * @route   GET /books/genre/:genre_id
 * @desc    Melihat daftar buku dalam sebuah genre dengan filter dan pagination
 * @access  Public
 * @query   page (optional, default 1), limit (optional, default 10), title (optional), author (optional)
 */
router.get('/genre/:genre_id', async (req: Request, res: Response) => {
  try {
    // 1. Ambil genre_id dari params
    const { genre_id } = req.params;

    // 2. Validasi ID dari params (meyakinkan TypeScript)
    if (!genre_id) {
        return res.status(400).json({ message: 'Genre ID is required' });
    }
    // ==========================================================

    const genreIdNumber = parseInt(genre_id, 10); // ID Genre adalah integer

    // Validasi format genre_id setelah parseInt
    if (isNaN(genreIdNumber)) {
      return res.status(400).json({ message: 'Invalid Genre ID format' });
    }

    // 3. Ambil parameter query untuk pagination dan filter
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const title = req.query.title as string || undefined;
    const author = req.query.author as string || undefined;

    // 4. Hitung offset untuk pagination
    const offset = (page - 1) * limit;

    // 5. Siapkan kondisi filter (Prisma Where Clause)
    const whereCondition: any = {
      genreId: genreIdNumber, // Filter utama berdasarkan genre
    };

    if (title) {
      whereCondition.title = {
        contains: title,
        mode: 'insensitive',
      };
    }

    if (author) {
      whereCondition.author = {
        contains: author,
        mode: 'insensitive',
      };
    }

    // 6. Query ke database dengan filter dan pagination
    const books = await prisma.book.findMany({
      where: whereCondition,
      skip: offset,
      take: limit,
      include: {
        genre: {
          select: { name: true },
        },
      },
      orderBy: {
        title: 'asc',
      },
    });

    // 7. Hitung total data untuk info pagination
    const totalBooks = await prisma.book.count({
      where: whereCondition,
    });

    // 8. Kirim response
    res.status(200).json({
      data: books,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalBooks / limit),
        totalItems: totalBooks,
        itemsPerPage: limit,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================================
// Endpoint lainnya...
// ==========================================================

export default router;
