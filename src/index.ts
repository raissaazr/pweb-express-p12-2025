// src/index.ts

import express, { Express, Request, Response } from 'express';
import transactionRoutes from './routes/transaction.routes';
import authRoutes from './routes/auth.routes';
import genreRoutes from './routes/genre.routes';

// Inisialisasi Express app
const app: Express = express();
const port = process.env.PORT || 3000;

// Inisialisasi Prisma Client

// Middleware untuk membaca JSON dari request body
app.use(express.json());

// Rute tes sederhana
app.get('/', (req: Request, res: Response) => {
  res.send('Selamat Datang di API IT Literature Shop!');
});

// Rute-Rute
app.use('/transactions', transactionRoutes);
app.use('/auth', authRoutes);
app.use('/genre', genreRoutes);
// app.use('/auth', authRoutes);     // ini nanti ditambahin....
// app.use('/genre', genreRoutes);   // ini nanti ditambahin....


// Mulai server
app.listen(port, () => {
  console.log(`[server]: Server berjalan di http://localhost:${port} 🚀`);
});
