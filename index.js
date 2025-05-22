const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Create data directory if not exists
const dbPath = path.join(__dirname, 'data', 'database.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Initialize DB
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)`);
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Express + SQLite on Fly.io!');
});

app.get('/users', (req, res) => {
  db.all(`SELECT * FROM users`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/users', (req, res) => {
  const { name } = req.body;
  db.run(`INSERT INTO users(name) VALUES(?)`, [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
