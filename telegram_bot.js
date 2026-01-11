require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Bot Token və Kanal ID
const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;
const DEDUP_WINDOW_DAYS = parseInt(process.env.DEDUP_WINDOW_DAYS || '1', 10);
const DEDUP_WINDOW_MS = Math.max(1, DEDUP_WINDOW_DAYS) * 24 * 60 * 60 * 1000;
const TELEGRAM_CRON_ENABLED = process.env.TELEGRAM_CRON_ENABLED !== 'false';
const TELEGRAM_QUIZ_COUNT = parseInt(process.env.TELEGRAM_QUIZ_COUNT || '30', 10);

// Firebase Configuration (public client config)
const firebaseConfig = {
    apiKey: "AIzaSyAak_eY0WNpY7cqAEuWEBG9wBDhg1NPw_0",
    authDomain: "imtahansistemi-17659.firebaseapp.com",
    projectId: "imtahansistemi-17659",
    storageBucket: "imtahansistemi-17659.firebasestorage.app",
    messagingSenderId: "715396853166",
    appId: "1:715396853166:web:9829b853e5e572de4d2c3f"
};
let fbApp, db;
try {
    fbApp = initializeApp(firebaseConfig);
    db = getFirestore(fbApp);
} catch (e) {
    console.warn("Firebase init warning:", e.message);
}

if (!token || !channelId) {
    console.error("❌ Telegram Token və ya Kanal ID yoxdur! .env faylını yoxlayın.");
} else {
    // Polling true edilir ki, bot mesajları oxuya bilsin
    const bot = new TelegramBot(token, { polling: true });

    // START əmri üçün cavab
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const welcomeMessage = `👋 **Salam, ${msg.from.first_name}!**\n\n` +
            `📚 **Dövlət Qulluğu İmtahan Botuna xoş gəldiniz.**\n` +
            `Burada hər gün ən çətin və situasiya tipli sualları işləyə bilərsiniz.\n\n` +
            `🚀 **Öz testlərini yaratmaq istəyirsən?**\n` +
            `Saytımıza daxil olaraq süni intellekt vasitəsilə saniyələr içində testlər hazırlaya bilərsən:\n` +
            `👉 [imtahan.site](http://imtahan.site)\n\n` +
            `Uğurlar! 🇦🇿`;
            
        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Firestore-dan Dövlət Qulluğu suallarını yüklə
    let civilCache = { items: [], ts: 0 };
    async function loadCivilServiceQuestions() {
        try {
            if (!db) return [];
            const now = Date.now();
            if (civilCache.items.length > 0 && (now - civilCache.ts) < 10 * 60 * 1000) {
                return civilCache.items;
            }

            const snapshot = await getDocs(collection(db, 'categories'));
            const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const parent = cats.find(c => (c.name || '').trim().toLowerCase() === 'dövlət qulluğu');
            if (!parent) {
                console.warn("Dövlət qulluğu kateqoriyası tapılmadı.");
                return [];
            }
            const children = cats.filter(c => c.parentId === parent.id);
            let questions = [];
            for (const child of children) {
                const qs = Array.isArray(child.questions) ? child.questions : [];
                const mapped = qs.map((q, idx) => ({
                    id: `${child.id}_${idx}`,
                    question: String(q.text || '').trim(),
                    options: (Array.isArray(q.options) ? q.options : []).map(o => String(o || '').trim()).filter(Boolean),
                    correct_option_id: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
                    explanation: '' // izah optional
                })).filter(x => x.question && x.options.length >= 2 && x.correct_option_id >= 0 && x.correct_option_id < x.options.length);
                questions = questions.concat(mapped);
            }
            // Fallback: əgər alt bölmələr boşdursa, parent-in özündən götür
            if (questions.length === 0 && Array.isArray(parent.questions)) {
                const mapped = parent.questions.map((q, idx) => ({
                    id: `${parent.id}_${idx}`,
                    question: String(q.text || '').trim(),
                    options: (Array.isArray(q.options) ? q.options : []).map(o => String(o || '').trim()).filter(Boolean),
                    correct_option_id: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
                    explanation: ''
                })).filter(x => x.question && x.options.length >= 2 && x.correct_option_id >= 0 && x.correct_option_id < x.options.length);
                questions = questions.concat(mapped);
            }
            civilCache = { items: questions, ts: now };
            return questions;
        } catch (error) {
            console.error("❌ Firestore-dan sual yükləmə xətası:", error.message);
            return [];
        }
    }

    // Yaxın zamanda göndərilən sualların izini saxla
    const recentPath = path.join(__dirname, 'recently_sent.json');
    function loadRecent() {
        try {
            if (!fs.existsSync(recentPath)) return [];
            const raw = fs.readFileSync(recentPath);
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }
    function saveRecent(items) {
        const pruned = items.slice(-2000);
        fs.writeFileSync(recentPath, JSON.stringify(pruned, null, 2));
    }
    function normalizeText(t) {
        return (t || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }
    function toAscii(s) {
        return (s || '')
            .replace(/ə/gi, 'e')
            .replace(/ö/gi, 'o')
            .replace(/ü/gi, 'u')
            .replace(/ğ/gi, 'g')
            .replace(/ç/gi, 'c')
            .replace(/ş/gi, 's')
            .replace(/ı/gi, 'i');
    }
    function questionKeyFromQ(q) {
        const t = toAscii(normalizeText(q.question));
        return t.replace(/^sual\s*\d+\s*[:\)\.]?\s*/i, '').replace(/^\d+\s*[\.\)]\s*/, '');
    }
    function fingerprint(q) {
        const text = toAscii(normalizeText(q.question));
        const optsArr = (q.options || []).map(o => toAscii(normalizeText(o))).sort();
        let correctText = '';
        if (typeof q.correct_option_id === 'number' && (q.options || [])[q.correct_option_id] != null) {
            correctText = toAscii(normalizeText(q.options[q.correct_option_id]));
        }
        const base = text + '::' + optsArr.join('|') + '::' + correctText;
        return crypto.createHash('sha1').update(base).digest('hex');
    }
    function sanitizeExplanation(s) {
        let x = (s || '').replace(/\s+/g, ' ').trim();
        if (x.length > 200) x = x.slice(0, 197) + '...';
        return x;
    }
    function validateQuestion(q) {
        if (!q || typeof q.question !== 'string') return false;
        const question = q.question.trim();
        if (!Array.isArray(q.options) || q.options.length < 2) return false;
        if (q.options.some(o => typeof o !== 'string' || !o.trim())) return false;
        const idx = q.correct_option_id;
        if (typeof idx !== 'number' || idx < 0 || idx >= q.options.length) return false;
        if (question.length > 300) q.question = question.slice(0, 297) + '...';
        q.explanation = sanitizeExplanation(q.explanation);
        return true;
    }

    // Təsadüfi suallar seçən funksiya (Dövlət Qulluğu mənbəsi üzrə)
    function getRandomQuestions(count) {
        // Firestore mənbəsindən oxunsun
        // Qeyd: Bu funksiya async olmaması üçün cache-dən oxuyur; cache boşdursa, 0 qaytaracaq.
        // startQuizBatch içində async yükləmə ediləcək.
        const questions = civilCache.items || [];
        if (questions.length === 0) return [];
        const idToQk = new Map(questions.map(q => [q.id, questionKeyFromQ({ question: q.question, options: q.options, correct_option_id: q.correct_option_id })]));
        
        // Məntiq: Mənbədə kateqoriya yoxdur; mətnə görə heuristika
        const veryHardQuestions = questions.filter(q => 
            q.question && (q.question.toLowerCase().includes('situasiya') || q.question.length > 250)
        );
        const hardQuestions = questions.filter(q =>
            !veryHardQuestions.includes(q) &&
            (q.question && (q.question.toLowerCase().includes('qanun') || q.question.toLowerCase().includes('konstitusiya') || q.question.toLowerCase().includes('inzibati')))
        );
        const otherQuestions = questions.filter(q => !veryHardQuestions.includes(q) && !hardQuestions.includes(q));

        let selected = [];

        // QUOTALAR (30 sual üçün):
        // 7 ədəd "Ən Çətin"
        // 17 ədəd "Çətin"
        // 6 ədəd "Digər"
        
        const veryHardTarget = 7;
        const hardTarget = count - veryHardTarget - Math.floor(count * 0.2); // Qalanın çoxu
        
        // A. Ən Çətinlərdən seç (7 ədəd)
        if (veryHardQuestions.length > 0) {
            const shuffled = veryHardQuestions.sort(() => 0.5 - Math.random());
            selected = selected.concat(shuffled.slice(0, veryHardTarget));
        }

        // B. Digər Çətinlərdən seç (~17 ədəd)
        if (hardQuestions.length > 0) {
            const remainingSpace = count - selected.length;
            const target = Math.min(hardTarget, remainingSpace);
            const shuffled = hardQuestions.sort(() => 0.5 - Math.random());
            selected = selected.concat(shuffled.slice(0, target));
        }

        // C. Qalan yeri doldur (Digərlərdən)
        if (selected.length < count) {
            const remainingNeeded = count - selected.length;
            const shuffledOthers = otherQuestions.sort(() => 0.5 - Math.random());
            selected = selected.concat(shuffledOthers.slice(0, remainingNeeded));
        }

        // DEDUP: Eyni sualı batch daxilində təkrarlama və yaxın tarixçədən çıxart
        const recent = loadRecent();
        const cutoff = Date.now() - DEDUP_WINDOW_MS;
        const windowFpSet = new Set(recent.filter(r => r.at >= cutoff && r.fp).map(r => r.fp));
        const windowQkSet = new Set(recent.filter(r => r.at >= cutoff).map(r => r.qk || idToQk.get(r.id)));
        const seen = new Set();
        const seenQuestions = new Set();
        const unique = [];
        const shuffledFinal = selected.sort(() => 0.5 - Math.random());
        for (const q of shuffledFinal) {
            const fp = fingerprint({ question: q.question, options: q.options, correct_option_id: q.correct_option_id });
            const qk = questionKeyFromQ({ question: q.question });
            if (seen.has(fp)) continue;
            if (windowFpSet.has(fp)) continue;
            if (windowQkSet.has(qk)) continue;
            if (seenQuestions.has(qk)) continue;
            seen.add(fp);
            seenQuestions.add(qk);
            unique.push(q);
            if (unique.length >= count) break;
        }
        // Əgər unikal kifayət etmirsə, qalanını datasetdən əlavə et
        if (unique.length < count) {
            const allShuffled = questions.sort(() => 0.5 - Math.random());
            for (const q of allShuffled) {
                const fp = fingerprint({ question: q.question, options: q.options, correct_option_id: q.correct_option_id });
                const qk = questionKeyFromQ({ question: q.question });
                if (seen.has(fp) || windowFpSet.has(fp) || windowQkSet.has(qk) || seenQuestions.has(qk)) continue;
                seen.add(fp);
                seenQuestions.add(qk);
                unique.push(q);
                if (unique.length >= count) break;
            }
        }
        return unique;
    }

    // Gözləmə funksiyası
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // DeepSeek API-dən sualları generas etmək
    async function generateQuestionsFromAI(count = 30) {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
            console.error("❌ DEEPSEEK_API_KEY .env faylında yoxdur və ya defaultdur!");
            return [];
        }
    
        try {
            const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "Sən Azərbaycan dilində 4 variantlı suallar hazırlayan botasan. Hər sual üçün düzgün cavabın indeksini (0-3) və izahını ver. Suaları Dövlət Qulluğu, Tarix, Məntiq, Coğrafiya kateqoriyalarında paylaş. Cavabı yalnız JSON array formatında qaytar."
                    },
                    {
                        role: "user",
                        content: `${count} ədəd 4 variantlı sual hazırla. Hər sual üçün düzgün cavabın indeksini və izahını ver. Cavabı təmiz JSON formatında qaytar: [{"question":"...","options":["...","...","...","..."],"correct_option_id":0,"explanation":"...","category":"..."}]`
                    }
                ],
                temperature: 0.7
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });
    
            let content = response.data.choices[0].message.content;
            
            // Markdown təmizləmə
            if (content.startsWith('```json')) {
                content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (content.startsWith('```')) {
                content = content.replace(/^```\n/, '').replace(/\n```$/, '');
            }
    
            const questions = JSON.parse(content);
            return questions;
        } catch (error) {
            console.error("❌ DeepSeekdən suallar alınmadı:", error.response ? error.response.data : error.message);
            return [];
        }
    }

    // Spesifik sualları göndərmək
    async function sendSpecificQuestions(questions) {
        const recent = loadRecent();
        const cutoff = Date.now() - DEDUP_WINDOW_MS;
        const allQuestions = civilCache.items || [];
        const idToQk = new Map(allQuestions.map(q => [q.id, questionKeyFromQ({ question: q.question })]));
        const windowFpSet = new Set(recent.filter(r => r.at >= cutoff && r.fp).map(r => r.fp));
        const windowQkSet = new Set(recent.filter(r => r.at >= cutoff).map(r => r.qk || idToQk.get(r.id)));
        const batchSeen = new Set();
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            try {
                if (!validateQuestion(q)) {
                    continue;
                }
                const fp = fingerprint({ question: q.question, options: q.options, correct_option_id: q.correct_option_id });
                const qk = questionKeyFromQ({ question: q.question });
                if (windowFpSet.has(fp) || windowQkSet.has(qk)) {
                    console.warn(`⏭️ Bu gün artıq göndərilmiş sual atlandı (ID: ${q.id})`);
                    continue;
                }
                if (batchSeen.has(qk)) {
                    console.warn(`⏭️ Eyni quiz daxilində təkrar sual atlandı (ID: ${q.id})`);
                    continue;
                }
                const pollOpts = {
                    type: 'quiz',
                    correct_option_id: q.correct_option_id,
                    is_anonymous: false
                };
                if (q.explanation) {
                    pollOpts.explanation = q.explanation;
                }
                const pollMsg = await bot.sendPoll(channelId, q.question, q.options, pollOpts);
                console.log(`✅ Sual ${i+1}/${questions.length} göndərildi. Növbəti sual üçün gözlənilir...`);
                // İz əlavə et
                windowFpSet.add(fp);
                windowQkSet.add(qk);
                batchSeen.add(qk);
                recent.push({ fp, qk, id: q.id, at: Date.now() });
                saveRecent(recent);
                await wait(47000);
                await wait(2000);
            } catch (error) {
                console.error(`❌ Sual göndərilmədi (ID: ${q.id}):`, error.message);
            }
        }
        console.log("🏁 Bu saatlıq quiz bitdi.");

        // Motivasiya mesajı və Növbəti Vaxt
        const motivationalQuotes = [
            "Uğur, əzmkarlıqla təslim olmamaq arasındakı fərqdir. 🚀",
            "Bu gün etdiyin kiçik addımlar, sabahkı böyük uğurların təməlidir. 🌱",
            "Çətinliklər səni dayandırmaq üçün deyil, gücləndirmək üçündür. 💪",
            "Hədəfə çatmaq üçün dayanmadan irəliləmək lazımdır. 🌟",
            "Bilik ən böyük gücdür. Öyrənməyə davam et! 📚",
            "İmtahan nəticən sənin potensialının yalnız bir hissəsidir. Daha yaxşısını bacararsan! ✨",
            "Hər səhv yeni bir öyrənmə fürsətidir. 💡",
            "Uğur təsadüf deyil, zəhmətin nəticəsidir. 🔥",
            "İnanmaq bacarmağın yarısıdır. Özünə inan! 🤝",
            "Zamanını idarə edən, gələcəyini idarə edər. ⏳"
        ];

        const now = new Date();
        // Cədvəl: 0, 12, 14, 16, 18, 20, 22
        const hours = [0, 12, 14, 16, 18, 20, 22].sort((a, b) => a - b);
        const currentHour = now.getHours();
        
        // Növbəti saatı tap
        let nextHour = hours.find(h => h > currentHour);
        
        // Əgər tapılmadısa (məsələn 23:00), deməli sabahkı ilk saat (00:00)
        if (nextHour === undefined) {
            nextHour = hours[0]; // 0
        }

        const nextTimeStr = `${nextHour.toString().padStart(2, '0')}:00`;
        const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        
        const endMessage = `🏁 **Bu sessiya bitdi!**\n\n` +
            `Növbəti testlər saat **${nextTimeStr}**-da paylaşılacaq. ⏰\n\n` +
            `✨ *${randomQuote}*`;

        try {
            await bot.sendMessage(channelId, endMessage, { parse_mode: 'Markdown' });
            console.log("✅ Bitmə və Motivasiya mesajı göndərildi.");
        } catch (error) {
            console.error("❌ Bitmə mesajı göndərilmədi:", error.message);
        }
    }

    // Batch göndərmə funksiyası (Random)
    async function sendQuizBatch(count = 30) {
        console.log(`⏰ Quiz vaxtıdır! ${count} sual hazırlanır...`);
        // Firestore-dan yüklə
        if ((!civilCache.items || civilCache.items.length === 0) && db) {
            await loadCivilServiceQuestions();
        }
        const quizList = getRandomQuestions(count);
        await sendSpecificQuestions(quizList);
    }

    // Üzrxahlıq mesajı göndər
    async function sendApologyMessage(customText) {
        const text = customText || (
            "📢 Hörmətli üzvlər,\n\n" +
            "Bu gün texniki səbəbdən bəzi suallar təkrar paylaşıldı. Problem tam aradan qaldırıldı və artıq eyni gün ərzində sual təkrarı mümkün deyil.\n\n" +
            "Narahatlığa görə üzr istəyirik. Növbəti paylaşımlar təkrarsız olacaq.\n\n" +
            "Təşəkkürlər anlayışınız üçün. 🙏"
        );
        try {
            await bot.sendMessage(channelId, text, { parse_mode: 'Markdown' });
            console.log("✅ Üzrxahlıq mesajı kanala göndərildi.");
            return true;
        } catch (error) {
            console.error("❌ Üzrxahlıq mesajı göndərilmədi:", error.message);
            return false;
        }
    }

    // Yeni sual əlavə etmək funksiyası
    function addQuestion(newQuestion) {
        const questions = loadQuestions();
        
        // ID verilməyibsə, avtomatik təyin et
        if (!newQuestion.id) {
            const maxId = questions.reduce((max, q) => (q.id > max ? q.id : max), 0);
            newQuestion.id = maxId + 1;
        }

        // Eyni sual artıq bazada varsa, əlavə etmə
        const newFp = fingerprint(newQuestion);
        const exists = questions.some(q => fingerprint(q) === newFp);
        if (exists) {
            console.warn("⚠️ Eyni məzmunlu sual bazada var, əlavə edilmədi.");
            return false;
        }

        questions.push(newQuestion);
        
        try {
            fs.writeFileSync(path.join(__dirname, 'questions.json'), JSON.stringify(questions, null, 2));
            console.log("✅ Yeni sual bazaya əlavə edildi:", newQuestion.id);
            return true;
        } catch (error) {
            console.error("❌ Sualı yadda saxlamaq mümkün olmadı:", error);
            return false;
        }
    }

    // Scheduler: 12:00, 14:00, 16:00, 18:00, 20:00, 22:00, 00:00
    let isBatchRunning = false;
    async function startQuizBatch(count = 30) {
        if (isBatchRunning) return false;
        isBatchRunning = true;
        try {
            console.log("⏰ Cədvəl üzrə Quiz vaxtıdır! Bazadan suallar seçilir...");
            await sendQuizBatch(count);
            return true;
        } finally {
            isBatchRunning = false;
        }
    }
    if (TELEGRAM_CRON_ENABLED) {
        cron.schedule('0 0,12,14,16,18,20,22 * * *', async () => {
            const ok = await startQuizBatch(TELEGRAM_QUIZ_COUNT);
            if (!ok) console.warn("⏭️ Önceki batch hələ davam edir, cədvəl çağırışı atlandı.");
        });
    }

    // Növbəti paylaşım vaxtını hesabla (Təxmini)
    function getNextSchedule() {
        const now = new Date();
        const hours = [0, 12, 14, 16, 18, 20, 22];
        let nextHour = hours.find(h => h > now.getHours());
        
        // Əgər bu gün üçün vaxt bitibsə (məsələn 23:00-dırsa), növbəti günün 00:00 və ya 12:00-nı götür
        if (nextHour === undefined) {
             nextHour = 0; // Sabah 00:00 (əslində bu günün gecəsidir, amma məntiqlə növbəti run)
        }
        
        // Sadəlik üçün sadəcə description qaytarırıq
        return {
            cronExpression: '0 0,12,14,16,18,20,22 * * *',
            description: '12:00, 14:00, 16:00, 18:00, 20:00, 22:00, 00:00'
        };
    }

    console.log("🤖 Telegram Quiz Bot aktivdir! Cədvəl: 12, 14, 16, 18, 20, 22, 00.");

    // Avtomatik test ləğv edildi - API vasitəsilə idarə olunacaq
    
    async function sendNews({ title, url, imageUrl, excerpt, tags, category }) {
        try {
            const hashTags = Array.isArray(tags) ? tags.slice(0, 5).map(t => `#${t}`).join(' ') : '';
            const cat = category ? `[${category}] ` : '';
            const summary = excerpt ? `\n\n${excerpt}` : '';
            const text = `📰 ${cat}${title}\n${summary}\n\n🔗 ${url}\n${hashTags}`;
            
            if (imageUrl) {
                let photo = imageUrl;
                // Base64 şəkli Buffer-ə çeviririk
                if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image')) {
                    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
                    photo = Buffer.from(base64Data, 'base64');
                }
                await bot.sendPhoto(channelId, photo, { caption: text });
            } else {
                await bot.sendMessage(channelId, text);
            }
            return true;
        } catch (e) {
            console.error('Telegram xəbər paylaşım xətası:', e.message);
            return false;
        }
    }
    
    module.exports = { sendQuizBatch, addQuestion, getNextSchedule, sendApologyMessage, startQuizBatch, sendNews, get isBatchRunning() { return isBatchRunning; } };
}
