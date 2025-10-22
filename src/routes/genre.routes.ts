import { Router, Request, Response } from 'express';
import { prisma } from '../prisma'; 

const router = Router();

// ==========================================================
// =============== GENRE ENDPOINTS ===========================
// ==========================================================

// CREATE GENRE - POST /genre
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Nama genre wajib diisi' });

    const existing = await prisma.genre.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ message: 'Genre sudah ada' });

    const genre = await prisma.genre.create({ data: { name } });
    res.status(201).json({ message: 'Genre berhasil dibuat', genre });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// GET ALL GENRE - GET /genre
router.get('/', async (_req: Request, res: Response) => {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(genres);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// GET GENRE DETAIL - GET /genre/:genre_id
router.get('/:genre_id', async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const id = parseInt(genre_id as string, 10);
 
    if (isNaN(id)) return res.status(400).json({ message: 'Format genre_id tidak valid' });

    const genre = await prisma.genre.findUnique({
      where: { id },
      include: { books: true },
    });

    if (!genre) return res.status(404).json({ message: 'Genre tidak ditemukan' });

    res.status(200).json(genre);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// UPDATE GENRE - PATCH /genre/:genre_id
router.patch('/:genre_id', async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: 'Nama genre wajib diisi' });

    const id = parseInt(genre_id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Format genre_id tidak valid' });

    const updated = await prisma.genre.update({
      where: { id },
      data: { name },
    });

    res.status(200).json({ message: 'Genre berhasil diperbarui', genre: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// DELETE GENRE - DELETE /genre/:genre_id
router.delete('/:genre_id', async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const id = parseInt(genre_id as string, 10);

    if (isNaN(id)) return res.status(400).json({ message: 'Format genre_id tidak valid' });

    const relatedBooks = await prisma.book.count({ where: { genreId: id } });
    if (relatedBooks > 0) {
      return res.status(400).json({
        message: 'Genre tidak bisa dihapus karena masih ada buku terkait',
      });
    }

    await prisma.genre.delete({ where: { id } });
    res.status(200).json({ message: 'Genre berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

export default router;
