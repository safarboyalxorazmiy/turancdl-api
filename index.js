const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// === Database Setup ===
const dbPath = path.join(__dirname, 'data', 'database.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY)`);
});

// === Telegram Bot Setup ===
const BOT_TOKEN = '7173239563:AAHx4fWZBBeEFJcxQCyKnAX1zprWRjIefN0'; // <-- Replace this with your bot token
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// === Secret for login ===
const LOGIN_SECRET = '/login Xp2s5v8y/B?E(H+KbPeShVmYq3t6w9z$C&F)J@NcQfTjWnZr4u7x!A%D*G-KaPdSgUkXp2s5v8y/B?E(H+MbQeThWmYq3t6w9z$C&F)J@NcRfUjXn2r4u7x!A%D*G-Ka';

// === Telegram message handler ===
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  // Login command
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

  // You can add more Telegram commands here if needed
});

// === Helper to check if chatId is admin ===
function isAdmin(chatId) {
  return new Promise((resolve) => {
    db.get(`SELECT 1 FROM admins WHERE id = ?`, [chatId], (err, row) => {
      resolve(!!row);
    });
  });
}

// === Express Routes ===
app.get('/', (req, res) => {
  res.send('Express + SQLite + Telegram bot server is running.');
});

// POST /visit route - sends message to all admins
app.post('/visit', (req, res) => {
  const { ip, city, region } = req.body;
  if (!ip || !city || !region) {
    return res.status(400).json({ error: 'ip, city, and region are required' });
  }

  const message = `
📈 Website visit: 481
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
