import { Router } from 'express';
import { 
    createBook, 
    getAllBooks, 
    getBookDetail, 
    getBooksByGenre, 
    updateBook, 
    deleteBook 
} from '../controllers/bookController';

const router = Router();

// 1. Create Book
router.post('/books', createBook); // POST /books

// 2. Get All Book
router.get('/books', getAllBooks); // GET /books

// 3. Get Book Detail
router.get('/books/:book_id', getBookDetail); // GET /books/:book_id

// 4. Get Book By Genre
router.get('/books/genre/:genre_id', getBooksByGenre); // GET /books/genre/:genre_id

// 5. Update Book
router.patch('/books/:book_id', updateBook); // PATCH /books/:book_id

// 6. Delete Book
router.delete('/books/:book_id', deleteBook); // DELETE /books/:book_id

export default router;
