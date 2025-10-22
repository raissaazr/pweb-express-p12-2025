import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===============================================
// 1. Create Book (POST /books)
// ===============================================
export const createBook = async (req: Request, res: Response) => {
    // Hanya ambil field sesuai skema: title, author, price, stock, genreId
    const { title, author, price, stock, genreId } = req.body;

    // 1. Validasi Keberadaan Field Wajib
    // Menggunakan price !== undefined dan stock !== undefined agar nilai 0 tidak dianggap false
    if (!title || !author || price === undefined || stock === undefined || genreId === undefined) {
        return res.status(400).json({ status: 'fail', message: 'All required fields (title, author, price, stock, genreId) must be provided.' });
    }
    
    // 2. Validasi Tipe Data
    if (typeof price !== 'number' || typeof stock !== 'number' || typeof genreId !== 'number') {
        return res.status(400).json({ status: 'fail', message: 'Invalid data type for price, stock, or genreId (must be number).' });
    }

    try {
        // Cek duplikasi judul (409 Conflict)
        const existingBook = await prisma.book.findUnique({ where: { title } });
        if (existingBook) {
            return res.status(409).json({ status: 'fail', message: `A book with the title '${title}' already exists.` });
        }

        // Cek Genre (404 Not Found)
        const genreExists = await prisma.genre.findUnique({ where: { id: genreId } });
        if (!genreExists) {
            return res.status(404).json({ status: 'fail', message: `Genre with ID ${genreId} not found.` });
        }

        const newBook = await prisma.book.create({
            data: { title, author, price, stock, genreId },
        });

        return res.status(201).json({ status: 'success', message: 'Book created successfully.', data: { book: newBook } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Server error occurred while creating the book.' });
    }
};

// ===============================================
// Fungsi Reusable untuk GET All dan GET By Genre
// ===============================================
const getBooksHandler = async (req: Request, res: Response, genreId?: number) => {
    // Pagination & Sorting Logic (Tidak Berubah)
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filterBy = req.query.filterBy as string; 
    const filterValue = req.query.filterValue as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';

    const where: any = {};
    if (genreId) where.genreId = genreId;

    if (filterBy && filterValue) {
        if (['title', 'author'].includes(filterBy)) {
            where[filterBy] = { contains: filterValue, mode: 'insensitive' };
        } else {
            return res.status(400).json({ status: 'fail', message: `Filter by '${filterBy}' is not supported.` });
        }
    }

    try {
        if (genreId) { // Cek Genre hanya jika menggunakan endpoint genre
            const genreExists = await prisma.genre.findUnique({ where: { id: genreId } });
            if (!genreExists) {
                return res.status(404).json({ status: 'fail', message: `Genre with ID ${genreId} not found.` });
            }
        }
        
        const totalItems = await prisma.book.count({ where });
        const books = await prisma.book.findMany({
            where, skip, take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: { genre: true }
        });

        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
            status: 'success',
            data: {
                books,
                pagination: { totalItems, totalPages, currentPage: page, limit },
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Server error occurred while fetching books.' });
    }
};

// ===============================================
// 2. Get All Book Controller
// ===============================================
export const getAllBooks = (req: Request, res: Response) => getBooksHandler(req, res);

// ===============================================
// 4. Get Book By Genre Controller
// ===============================================
export const getBooksByGenre = (req: Request, res: Response) => {
    const genreId = parseInt(req.params.genre_id as string);
    if (isNaN(genreId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid genre ID.' });
    }
    return getBooksHandler(req, res, genreId);
};

// ===============================================
// 3. Get Book Detail (GET /books/:book_id)
// ===============================================
export const getBookDetail = async (req: Request, res: Response) => {
    const bookId = req.params.book_id as string; // Book ID adalah String (UUID)

    if (!bookId || typeof bookId !== 'string') {
        return res.status(400).json({ status: 'fail', message: 'Invalid book ID format.' });
    }

    try {
        const book = await prisma.book.findUnique({
            where: { id: bookId },
            include: { genre: true }
        });

        if (!book) {
            return res.status(404).json({ status: 'fail', message: `Book with ID ${bookId} not found.` });
        }

        return res.status(200).json({ status: 'success', data: { book } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Server error occurred while fetching book details.' });
    }
};

// ===============================================
// 5. Update Book (PATCH /books/:book_id)
// ===============================================
export const updateBook = async (req: Request, res: Response) => {
    const bookId = req.params.book_id as string;
    const updates = req.body;

    const allowedUpdates = ['title', 'author', 'price', 'stock', 'genreId'];
    const dataToUpdate: any = {};
    
    for (const key of allowedUpdates) {
        if (updates.hasOwnProperty(key)) {
            dataToUpdate[key] = updates[key];
        }
    }

    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ status: 'fail', message: 'No valid data provided for update.' });
    }

    try {
        const existingBook = await prisma.book.findUnique({ where: { id: bookId } });
        if (!existingBook) {
            return res.status(404).json({ status: 'fail', message: `Book with ID ${bookId} not found.` });
        }

        // Cek duplikasi judul (409 Conflict)
        if (dataToUpdate.title && dataToUpdate.title !== existingBook.title) {
            const titleConflict = await prisma.book.findFirst({ where: { title: dataToUpdate.title } });
            if (titleConflict) {
                return res.status(409).json({ status: 'fail', message: `The title '${dataToUpdate.title}' is already used by another book.` });
            }
        }

        // Cek Genre (404 Not Found)
        if (dataToUpdate.genreId) {
            const genreExists = await prisma.genre.findUnique({ where: { id: dataToUpdate.genreId } });
            if (!genreExists) {
                return res.status(404).json({ status: 'fail', message: `Genre with ID ${dataToUpdate.genreId} not found.` });
            }
        }

        const updatedBook = await prisma.book.update({
            where: { id: bookId },
            data: dataToUpdate,
        });

        return res.status(200).json({ status: 'success', message: 'Book updated successfully.', data: { book: updatedBook } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Server error occurred while updating the book.' });
    }
};

// ===============================================
// 6. Delete Book (DELETE /books/:book_id)
// ===============================================
export const deleteBook = async (req: Request, res: Response) => {
    const bookId = req.params.book_id as string;

    if (!bookId || typeof bookId !== 'string') {
        return res.status(400).json({ status: 'fail', message: 'Invalid book ID format.' });
    }

    try {
        const existingBook = await prisma.book.findUnique({ where: { id: bookId } });
        if (!existingBook) {
            return res.status(404).json({ status: 'fail', message: `Book with ID ${bookId} not found.` });
        }

        // Lakukan penghapusan. Data TransactionItem terkait tetap ada di DB karena onDelete: SetNull.
        await prisma.book.delete({
            where: { id: bookId },
        });

        return res.status(200).json({ status: 'success', message: `Book with ID ${bookId} has been deleted. Related transaction history remains preserved.` });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Server error occurred while deleting the book.' });
    }
};
