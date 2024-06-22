CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    author VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE books (
	id SERIAL PRIMARY KEY,
    isbn BIGINT,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    rate INTEGER NOT NULL,
    note TEXT NOT NULL,
    author_id INTEGER REFERENCES authors(id) NOT NULL,
    img_url VARCHAR(250)
);