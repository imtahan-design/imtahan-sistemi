require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

const bot = new TelegramBot(token, { polling: false });

const message = `📢 **DİQQƏT!**

Texniki yenilənmə ilə əlaqədar növbəti sual sessiyası saat **20:00-da** başlayacaq.

🕗 **Başlama vaxtı:** 20:00
🎯 **Sual sayı:** 30 ədəd (Çətin və Situasiya)

Bildirişləri açıq saxlayın! 🔔`;

bot.sendMessage(channelId, message, { parse_mode: 'Markdown' })
    .then(() => {
        console.log("✅ Mesaj kanala göndərildi!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Xəta:", error.message);
        process.exit(1);
    });
