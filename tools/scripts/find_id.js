const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config(); // Load environment variables

const token = '8097805947:AAGh5MCPlj1Czx-aaJ24owBkS0dBzpqEI1M';

if (token === 'YOUR_TOKEN_HERE') {
    console.error("XƏTA: Token tapılmadı! Zəhmət olmasa .env faylı yaradın və TELEGRAM_BOT_TOKEN dəyişənini əlavə edin.");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log("🕵️ Bot qrupları dinləyir... Zəhmət olmasa qrupda bir mesaj yazın!");

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const title = msg.chat.title || msg.from.first_name;

    console.log(`----------------------------------------`);
    console.log(`📨 Yeni Mesaj!`);
    console.log(`🆔 Chat ID: ${chatId}`);
    console.log(`imkan: ${chatType}`);
    console.log(`📌 Ad: ${title}`);
    console.log(`📝 Mesaj: ${msg.text}`);
    console.log(`----------------------------------------`);
});
