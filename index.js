import express, { urlencoded } from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "booknotes",
    password: "336991",
    port: 5432,
  });
  db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", async (req, res) => {
    const date = new Date();

    let day = date.getDate();
    if (day < 10) {
        day = '0' + day;
    }
    let month = date.getMonth() + 1;
    if (month < 10) {
        month = '0' + month;
    }
    const year = date.getFullYear();
    const dateString = year + '-' + month + '-' + day;

    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.order || 'DESC';

    let orderClause;
    if (sortBy === 'rate') {
        orderClause = 'ORDER BY rate ' + sortOrder;
    } else if (sortBy === 'date') {
        orderClause = 'ORDER BY date ' + sortOrder;
    } else {
        orderClause = 'ORDER BY date DESC';
    }

    const query = `
        SELECT books.id, name, author, date, rate, note, img_url
        FROM authors
        JOIN books ON authors.id = books.author_id
        ${orderClause}
    `;

    try {
        const result = await db.query(query);
        const books = result.rows;
        res.render("index.ejs", { books: books, today: dateString});
    } catch (error) {
        console.error('Error executing query', error.stack);
        res.status(500).send('Server error');
    }
});


app.post("/add", async (req, res) => {
    console.log(req.body);
    const isbn = req.body.isbn;
    const name = req.body.name;
    const author = req.body.author;
    const date = req.body.date;
    const rate = req.body.rate;
    const note = req.body.notes;

    try {

        let imgUrl;
        try {
            const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}.json`);
            imgUrl = response.data.source_url;
        } catch (error) {
            imgUrl = "https://s3.amazonaws.com/theoatmeal-img/books/404_not_found.png";
        }

        await db.query(
            "INSERT INTO authors (author) VALUES ($1) ON CONFLICT (author) DO NOTHING;",
        [author]);

        const result = await db.query(
            "SELECT id FROM authors WHERE author = $1",
        [author]);
        const author_id = result.rows[0].id;

        await db.query(
            "INSERT INTO books (isbn, name, date, rate, note, author_id, img_url) VALUES ($1, $2, $3, $4, $5, $6, $7);",
        [isbn, name, date, rate, note, author_id, imgUrl]);
        res.redirect("/");
        console.log("Added!");
    } catch (err) {
        console.log(err);
    }
});

app.get("/book", async (req, res) => {
    const id = req.query.id;

    const query = `
        SELECT books.id, isbn, name, author, date, rate, note, img_url
        FROM authors
        JOIN books ON authors.id = books.author_id
        WHERE books.id=${id};
    `;

    try {
        const result = await db.query(query);
        const books = result.rows;
        const isbn = books[0].isbn;
        const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}.json`);
        const olid = response.data.olid;

        res.render("book.ejs", { book: books[0], olid: olid });
    } catch (error) {
        const result = await db.query(query);
        const books = result.rows;

        res.render("book.ejs", { book: books[0] });
    }
});

app.get("/edit", async (req, res) => {
    const id = req.query.id;

    const query = `
        SELECT books.id, isbn, name, author, date, rate, note
        FROM authors
        JOIN books ON authors.id = books.author_id
        WHERE books.id=${id};
    `;

    try {
        const result = await db.query(query);
        const books = result.rows;
        const book = books[0];
        const date = book.date;

        let day = date.getDate();
        if (day < 10) {
            day = '0' + day;
        }
        let month = date.getMonth() + 1;
        if (month < 10) {
            month = '0' + month;
        }
        const year = date.getFullYear();
        const dateString = year + '-' + month + '-' + day;

        res.render("edit.ejs", {book: book, date: dateString});
    } catch (error) {
        console.error('Error executing query', error.stack);
        res.status(500).send('Server error');
    }
});

app.get("/delete", async (req, res) => {
    const id = req.query.id;

    const query = `
        DELETE FROM books
        WHERE id=${id};
    `;

    try {
        const result = await db.query(query);
        res.redirect("/");
    } catch (error) {
        console.error('Error executing query', error.stack);
        res.status(500).send('Server error');
    }
});

app.post("/update", async (req, res) => {
    const id = req.body.id;
    const date = req.body.date;
    const rate = req.body.rate;
    const note = req.body.notes;

    const query = `
        UPDATE books
        SET date = $1, rate = $2, note = $3
        WHERE id = $4 RETURNING *;
    `;

    try {
        const result = await db.query(query, [date, rate, note, id]);
        const books = result.rows;
        const book = books[0];
        res.redirect("/");
    } catch (error) {
        console.error('Error executing query', error.stack);
        res.status(500).send('Server error');
    }
});

app.get("/back", (req, res) => {
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});