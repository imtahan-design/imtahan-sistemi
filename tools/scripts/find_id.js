const TelegramBot = require('node-telegram-bot-api');

const token = '8097805947:AAHGJwE6ZnGz9eMkT55a3kp1wew7iVO_11E';
const bot = new TelegramBot(token, { polling: true });

console.log("🕵️ Bot qrupları dinləyir... Zəhmət olmasa qrupda bir mesaj yazın!");

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const chatTitle = msg.chat.title;

    console.log(`\n✅ MESAJ TUTULDU!`);
    console.log(`📂 Qrup Adı: ${chatTitle}`);
    console.log(`🆔 Chat ID: ${chatId}  <-- BU BİZƏ LAZIMDIR`);
    console.log(`👤 Yazan: ${msg.from.first_name}`);
    
    process.exit(0);
});
