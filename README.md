# pweb-express-p12-2025
| Nama                         | NRP        |
| ---------------------------- | ---------- |
| Azaria Raissa Maulidinnisa   | 5027241043 |
| Muhammad Afrizan Rasya       | 5027241048 |
| Muhammad Khairul Yahya       | 5027241092 |

# Dokumentasi API - IT Literature Shop (Praktikum Modul 3)

Dokumentasi ini menjelaskan endpoint API untuk backend IT Literature Shop.

**Base URL:** `http://localhost:3000` (sesuai setting lokal Anda, ganti `8080` di Postman Variable menjadi `3000`).

## Ketentuan Umum API

- **Format Repsons Standar:** semua respons API **WAJIB** mengikuti struktur berikut:

```json
{
    "success": true | false, // boolean: true jika request berhasil, false jika gagal
    "message": "Pesan...",   // string: Deskripsi hasil request
    "data": {} | [] | null // object/array/null: Data hasil request (jika ada)
}
```

> **Catatan Penting:** Kode kita saat ini belum sepenuhnya mengikuti format ini. Perlu penyesuaian di semua endpoint.

- **Autentikasi:** Sebagian besar endpoint (Genres, Books, Transactions) memerlukan autentikasi menggunakan **Bearer Token JWT** yang didapatkan dari endpoint Login. Token dikirim melalui Header `Authorization: Bearer <TOKEN_ANDA>`. **Catatan Penting:** Middleware untuk memeriksa token ini belum diimplementasikan di rute Transactions.

- **Case Convention:** Postman Collection menggunakan `snake_case` (contoh: `user_id`, `created_at`) di beberapa contoh body dan response. Namun, `schema.prisma` kita menggunakan `camelCase` (contoh: `userId`, `createdAt`). **Disarankan untuk konsisten menggunakan** `camelCase` **di kode (request body, response data) agar sesuai dengan Prisma**, meskipun berbeda dengan contoh di Postman.

- **Soft Delete:** Deskripsi di Postman untuk `DELETE /genre/:id` dan `DELETE /books/:id` menyebutkan penggunaan soft delete (mengisi field `deleted_at`). Skema Prisma kita saat ini tidak memiliki field `deletedAt`. Jika soft delete wajib, skema dan logika delete perlu diupdate.

## Modul Health Check

- **Ketentuan:** Harus ada endpoint health check yang mengembalikan tanggal.
- **Status:** belum dibuat....

`GET /health-check`

- **Deskripsi:** Memeriksa status API.
- **Autentikasi:** Tidak perlu.
- **Respons Sukses (Contoh):**

1. Kode: `200 OK`
2. Body: 
```json
{
    "success": true,
    "message": "API is healthy!",
    "data": {
        "timestamp": "2025-10-22T17:30:00.123Z" // Contoh ISO String Date
    }
}
```

## Modul: Auth

- **Base Path:** `/auth`
- **Deskripsi:** Endpoint untuk registrasi, login, dan mendapatkan data user saat ini.
- **Status:** Belum dibuat
- **Endpoints:**

1. `POST /auth/register`
2. `POST /auth/login`
3. `GET /auth/me` (Membutuhkan Bearer Token)

## Modul: Genres

- **Base Path:** `/genre`
- **Deskripsi:** CRUD untuk data genre buku.
- **Autentikasi:** Membutuhkan Bearer Token untuk semua endpoint.
- **Status:** Belum dibuat
- **Endpoints:**

1. `POST /genre`
2. `GET /genre` (Dengan pagination, search, order)
3. `GET /genre/:id`
4. `PATCH /genre/:id`
5. `DELETE /genre/:id` (Soft Delete?)

## Modul: Books

- **Base Path:** `/books`

- **Deskripsi:** CRUD untuk data buku.

- **Autentikasi:** Membutuhkan Bearer Token untuk semua endpoint.

- **Status:** ⏳ GET /books/genre/:id Sudah Dibuat oleh Anda, sisanya dikerjakan anggota tim lain.

- **Endpoints:**

    `POST /books`

    `GET /books (Dengan pagination, search, order)`

    `GET /books/:id`

    `GET /books/genre/:id (Dengan pagination, search, order) - ✅ Sudah Dibuat (Perlu penyesuaian format respons & auth).`

   `PATCH /books/:id (Hanya field tertentu)`

    `DELETE /books/:id (Soft delete?)`

 ## Modul: Transactions

- **Base Path:** `/transactions`

- **Deskripsi:** Endpoint untuk membuat dan melihat transaksi pembelian.

- **Autentikasi:** Membutuhkan Bearer Token untuk semua endpoint (sesuai deskripsi modul di Postman). **Catatan:** Middleware auth belum ditambahkan di kode. Bearer Token untuk semua endpoint.

- **Status:** *Semua Endpoint Sudah Dibuat*. Perlu penyesuaian format respons & penambahan auth.

###  `POST /transactions`

1. **Deskripsi:** Membuat transaksi pembelian baru. Bisa untuk satu atau lebih item buku.
2. **Autentikasi:** Bearer Token Diperlukan.
3. **Request Body (JSON):** (Gunakan camelCase)
```json
{
  "userId": "string (UUID)", // ID User yang melakukan transaksi
  "items": [ // Array berisi buku yang dibeli
    {
      "bookId": "string (UUID)", // ID Buku
      "quantity": number // Jumlah buku (harus > 0)
    }
    // ... bisa tambahkan item lain
  ]
}
```

- **Respons Sukses:**

- Kode: `201 Created`

- **Body:** (Contoh format yang disesuaikan)
```json
{
    "success": true,
    "message": "Transaction created successfully",
    "data": {
        // Objek transaksi yang baru dibuat dari Prisma
        "id": "c3353007-...",
        "totalAmount": 999000,
        "createdAt": "2025-10-22T...",
        "userId": "7d25ce36-..."
        // Tidak ada total_quantity di model kita, tapi bisa ditambahkan jika perlu
    }
}
```

- **Respons Gagal (Contoh):**

`400 Bad Request` (Input tidak valid, stok tidak cukup)
```json
{
    "success": false,
    "message": "Not enough stock for book: Nama Buku (Stock: X)",
    "data": null
}
```

- `404 Not Found` (User ID atau Book ID tidak ditemukan)
```json
{
    "success": false,
    "message": "Book with id X not found",
    "data": null
}
```
- `401 Unauthorized` (Token tidak valid/tidak ada jika auth sudah ada)
- `500 Internal Server Error` (Kesalahan server)

### `GET /transactions`

- **Deskripsi:** Mendapatkan daftar semua transaksi yang tercatat.
- **Autentikasi:** Bearer Token Diperlukan.
- **Query Parameters (Sesuai Postman):**

1. `page`: number (opsional, default 1)

2. `limit`: number (opsional, default ?)

3. `search`: string (opsional, search berdasarkan ID transaksi)

4. `orderById`: `asc` |` desc` (opsional)

5. `orderByAmount`: `asc` | `desc` (opsional) Catatan: Fitur query parameter ini belum diimplementasikan di kode Anda.

- **Respons Sukses:**

Kode: `200 OK`

Body: (Contoh format yang disesuaikan)
```json
{
    "success": true,
    "message": "Get all transaction successfully",
    "data": [ // Array objek transaksi (sesuai model Prisma)
        {
            "id": "e4f8d1c9-...",
            "totalAmount": 45000,
            "createdAt": "...",
            "userId": "...",
            "user": { "username": "..." }, // Hasil include
            "items": [ // Hasil include
                { /* ... item detail ... */ }
            ]
        },
        // ... transaksi lainnya
    ]
    // "meta": { ... } // Jika pagination diimplementasikan
}
```

- **Respons Gagal (Contoh):**

`401 Unauthorized` (Token tidak valid/tidak ada jika auth sudah ada)

`500 Internal Server Error`

- **Status:** Implementasi dasar selesai. **Perlu:** penyesuaian format respons, penambahan middleware autentikasi, implementasi query parameters (pagination, search, order).

## `GET /transactions/:transaction_id`

- **Deskripsi:** Mendapatkan detail dari satu transaksi spesifik.
- **Autentikasi:** Bearer Token Diperlukan.
- **Path Parameters:**
`transaction_id:` string (UUID dari transaksi)

- **Respons Sukses:**

Kode: `200 OK`

Body: (contoh format yang disesuaikan)
```json
{
    "success": true,
    "message": "Get transaction detail successfully",
    "data": { // Objek detail transaksi (sesuai model Prisma + include)
        "id": "e4f8d1c9-...",
        "totalAmount": 45000,
        "createdAt": "...",
        "userId": "...",
        "user": { "username": "..." },
        "items": [
            {
                "id": "...",
                "quantity": 5,
                "pricePerItem": 15000,
                "transactionId": "e4f8d1c9-...",
                "bookId": "b3e0a5f6-...",
                "book": {
                    "title": "Dummy Book 7",
                    "author": "...",
                    "price": 15000 // Harga saat ini (bukan saat dibeli)
                }
            },
            // ... item lainnya
        ]
    }
}
```

- **Respons Gagal (Contoh):

`400 Bad Request` = Format ID salah
`404 Not Found` = ID Transaksi tidak ditemukan

```json {
    "success": false,
    "message": "Transaction not found",
    "data": null
}
```

`401 Unauthorized` (Token tidak valid/tidak ada jika auth sudah ada).

`500 Internal Server Error`

- **Status:** Implementasi Logika Selesai.

## `GET /transactions/statistics`

- **Deskripsi:** Mendapatkan data statistik penjualan.
- **Autentikasi:** Bearer Token Diperlukan.
- **Respons Sukses:**

Kode: `200 OK`

Body: (contoh format yang disesuaikan)
```json
{
    "success": true,
    "message": "Get transactions statistics successfully",
    "data": {
        "totalTransactions": 1000,
        "averageTransactionAmount": 50000,
        "mostSoldGenre": {
            "name": "Fantasy",
            "totalItemsSold": 150 // Jumlah item terjual, bukan jumlah transaksi
        },
        "leastSoldGenre": {
            "name": "Science Fiction",
            "totalItemsSold": 20 // Jumlah item terjual
        }
    }
}
```

> **Catatan: Struktur `most/leastSoldGenre` di kode kita (object) berbeda dari contoh postman (string). Disarankan tetap menggunakan struktur object karena lebih informatif.

- **Respons Gagal (Contoh):**

`401 Unauthorized` (Tokken tidak valid/tidak ada jika auth sudah ada)

- `500 Internal Server Error`

- **Status:** Implementasi Logika Selesai.  Perlu: Penyesuaian format respons, penambahan middleware autentikasi.

Dokumentasi ini merangkum endpoint yang ada, status pengerjaannya, dan penyesuaian yang diperlukan agar sesuai dengan Postman Collection. Fokus utama selanjutnya adalah menyesuaikan format respons dan menambahkan autentikasi.

## Dokumentasi Endpoint Transactions

![image alt](https://github.com/raissaazr/pweb-express-p12-2025/blob/1bfc9f35dd66844864d9987c2558e3de9347d0b9/assets/Screenshot%20(1484).png)

ini hasil untuk struktur data transaction

![image alt](https://github.com/raissaazr/pweb-express-p12-2025/blob/1bfc9f35dd66844864d9987c2558e3de9347d0b9/assets/Screenshot%20(1490).png)

ini hasil untuk statistik transaksi 

![image alt](https://github.com/raissaazr/pweb-express-p12-2025/blob/1bfc9f35dd66844864d9987c2558e3de9347d0b9/assets/Screenshot%20(1497).png)

ini untuk mendapatkan detail terkait transaksi tertentu dari userID dan bookID

![image alt](https://github.com/raissaazr/pweb-express-p12-2025/blob/1bfc9f35dd66844864d9987c2558e3de9347d0b9/assets/Screenshot%20(1500).png)

ini untuk mendapatkan detail keseluruhan transaksi menggunakan transaction(id)

![image alt](https://github.com/raissaazr/pweb-express-p12-2025/blob/1e20f7f8d3fe62d1abfaa5b26fbdd96613cfb046/assets/Screenshot%20(1484).png)

ini untuk membuat transaksi dari userId `yang beli siapa` dan bookId `beli buku apa` dengan quantity `jumlah buku nya berapa`.



