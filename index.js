const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 8080;

// === PostgreSQL Setup ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required on Render
  },
});

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (id BIGINT PRIMARY KEY);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        city TEXT NOT NULL,
        region TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        city TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Database initialized");
  } catch (err) {
    console.error("❌ Failed to initialize DB:", err.message);
  }
})();

app.use(cors({
  origin: ['https://turancdl.com', 'http://turancdl.com'],
}));
app.use(express.json());

// === Telegram Bot Setup ===
const BOT_TOKEN = '7173239563:AAHx4fWZBBeEFJcxQCyKnAX1zprWRjIefN0'; // 🔁 Replace with your real token
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// === Secret Login Command ===
const LOGIN_SECRET = '/login Xp2s5v8y/B?E(H+KbPeShVmYq3t6w9z$C&F)J@NcQfTjWnZr4u7x!A%D*G-KaPdSgUkXp2s5v8y/B?E(H+MbQeThWmYq3t6w9z$C&F)J@NcRfUjXn2r4u7x!A%D*G-Ka';

// === Telegram Commands ===
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  if (text === '/start') {
    bot.sendMessage(chatId, '\nKnock knock... \n-Who the fuck are you? Get out.');
    return;
  }

  if (text === LOGIN_SECRET) {
    try {
      await pool.query(`INSERT INTO admins (id) VALUES ($1) ON CONFLICT DO NOTHING`, [chatId]);
      bot.sendMessage(chatId, '✅ You are now an admin!');
    } catch (err) {
      console.error(err.message);
      bot.sendMessage(chatId, '❌ Error adding admin.');
    }
    return;
  }
});

// === Express Routes ===
app.get('/', (req, res) => {
  res.send('Express + PostgreSQL + Telegram bot server is running.');
});

// === Visit Tracking ===
app.post('/interest/visit', async (req, res) => {
  const { ip, city, region } = req.body;
  if (!ip || !city || !region) {
    return res.status(400).json({ error: 'ip, city, and region are required' });
  }

  try {
    await pool.query(`INSERT INTO visits (ip, city, region) VALUES ($1, $2, $3)`, [ip, city, region]);
    const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) FROM visits`);

    const message = `
📈 Website visit: ${count}
📲 IP: ${ip}
🌎 Location: ${city} city, ${region} region
    `.trim();

    const { rows } = await pool.query(`SELECT id FROM admins`);
    rows.forEach(({ id }) => {
      bot.sendMessage(id, message).catch(console.error);
    });

    res.json({ success: true, sentTo: rows.length });
  } catch (err) {
    console.error('DB error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// === Contact Info Submission ===
app.post('/interest/contact', async (req, res) => {
  const { firstName, lastName, email, phone, city } = req.body;

  if (!firstName || !lastName || !email || !phone || !city) {
    return res.status(400).json({ error: 'All contact fields are required.' });
  }

  try {
    const { rows: contactRows } = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, phone, city)
      VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [firstName, lastName, email, phone, city]
    );


    const contactId = contactRows[0].id;

    const message = `
Contact Info #${contactId}

👨‍💼 Full name:  ${firstName} ${lastName}
🔎 Email: ${email}
📞 Phone: ${phone}
🌎 City: ${city}
    `.trim();

    const { rows: admins } = await pool.query(`SELECT id FROM admins`);
    admins.forEach(({ id }) => {
      bot.sendMessage(id, message).catch(console.error);
    });

    res.json({ success: true, id: contactId, sentTo: admins.length });
  } catch (err) {
    console.error('DB error:', err.message);
    res.status(500).json({ error: 'Failed to save contact.' });
  }
});

// === Start Server ===
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
