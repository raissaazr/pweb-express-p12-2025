import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../prisma';

const router = Router();

// SECRET JWT 
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ==========================================================
// REGISTER
// ==========================================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, password: hashedPassword },
      select: { id: true, username: true, createdAt: true },
    });

    res.status(201).json({
      message: 'Registrasi berhasil',
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ==========================================================
// LOGIN
// ==========================================================
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({
      message: 'Login berhasil',
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ==========================================================
// GET ME (Profil Pengguna)
// ==========================================================
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Format Authorization tidak valid' });
    }

    // Verifikasi token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === 'object' && 'id' in decoded && 'username' in decoded) {
      const { id } = decoded as { id: string; username: string };

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, createdAt: true },
      });

      if (!user) {
        return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
      }

      return res.status(200).json({ user });
    }

    return res.status(403).json({ message: 'Payload token tidak valid' });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa' });
  }
});

export default router;
