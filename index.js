const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
  origin: ['https://turancdl.com', 'http://turancdl.com'],
}));
app.use(express.json());

// === Database Setup ===
const dbPath = path.join(__dirname, 'data', 'database.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY)`);
  db.run(`CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    email TEXT,
    phone TEXT,
    city TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

// === Telegram Bot Setup ===
const BOT_TOKEN = '7173239563:AAHx4fWZBBeEFJcxQCyKnAX1zprWRjIefN0'; // 🔁 Replace with your real bot token
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// === Secret Login Command ===
const LOGIN_SECRET = '/login Xp2s5v8y/B?E(H+KbPeShVmYq3t6w9z$C&F)J@NcQfTjWnZr4u7x!A%D*G-KaPdSgUkXp2s5v8y/B?E(H+MbQeThWmYq3t6w9z$C&F)J@NcRfUjXn2r4u7x!A%D*G-Ka';

// === Telegram Commands ===
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  if (text === '/start') {
    bot.sendMessage(chatId, '\nKnock knock... \n-Who the fuck are you? Get out.');
    return;
  }

  if (text === LOGIN_SECRET) {
    db.run(`INSERT OR IGNORE INTO admins (id) VALUES (?)`, [chatId], (err) => {
      if (err) {
        bot.sendMessage(chatId, '❌ Error adding admin.');
      } else {
        bot.sendMessage(chatId, '✅ You are now an admin!');
      }
    });
    return;
  }
});

// === Express Routes ===
app.get('/', (req, res) => {
  res.send('Express + SQLite + Telegram bot server is running.');
});

// === Visit Tracking ===
app.post('/interest/visit', (req, res) => {
  const { ip, city, region } = req.body;
  if (!ip || !city || !region) {
    return res.status(400).json({ error: 'ip, city, and region are required' });
  }

  db.run(
    `INSERT INTO visits (ip, city, region) VALUES (?, ?, ?)`,
    [ip, city, region],
    function (err) {
      if (err) {
        console.error('DB insert error:', err.message);
        return res.status(500).json({ error: 'Failed to save visit' });
      }

      db.get(`SELECT COUNT(*) AS count FROM visits`, [], (err, row) => {
        if (err) {
          console.error('DB count error:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }

        const totalVisits = row.count;

        const message = `
📈 Website visit: ${totalVisits}
📲 IP: ${ip}
🌎 Location: ${city} city, ${region} region
        `.trim();

        db.all(`SELECT id FROM admins`, [], (err, rows) => {
          if (err) {
            console.error('DB error:', err.message);
            return res.status(500).json({ error: 'Database error' });
          }

          rows.forEach(({ id }) => {
            bot.sendMessage(id, message).catch(console.error);
          });

          res.json({ success: true, sentTo: rows.length });
        });
      });
    }
  );
});

// === Contact Info Submission ===
app.post('/interest/contact', (req, res) => {
  const { firstName, lastName, email, phone, city } = req.body;

  if (!firstName || !lastName || !email || !phone || !city) {
    return res.status(400).json({ error: 'All contact fields are required.' });
  }

  const insertQuery = `INSERT INTO contacts (firstName, lastName, email, phone, city) VALUES (?, ?, ?, ?, ?)`;
  db.run(insertQuery, [firstName, lastName, email, phone, city], function (err) {
    if (err) {
      console.error('DB insert error:', err.message);
      return res.status(500).json({ error: 'Failed to save contact.' });
    }

    const contactId = this.lastID;

    const message = `
Contact Info #${contactId}

👨‍💼 Full name:  ${firstName} ${lastName},
🔎 Email: ${email},
📞 Phone: ${phone},
🌎 City:  ${city}
    `.trim();

    db.all(`SELECT id FROM admins`, [], (err, rows) => {
      if (err) {
        console.error('DB error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      rows.forEach(({ id }) => {
        bot.sendMessage(id, message).catch(console.error);
      });

      res.json({ success: true, id: contactId, sentTo: rows.length });
    });
  });
});

// === Start Server ===
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
