require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const axios = require('axios');
const crypto = require('crypto');
const multer = require('multer');
const mammoth = require('mammoth');
const { IgApiClient } = require('instagram-private-api');
const telegramBot = require('./telegram_bot'); // Telegram Bot əlavə edildi
const { exec, spawn } = require('child_process');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc } = require('firebase/firestore');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '.')));

// Firebase Configuration (Matching telegram_bot.js)
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
    console.log("✅ Firebase initialized in server.js");
} catch (e) {
    console.warn("Firebase init warning:", e.message);
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 } // 12MB
});

const PORT = 5000;

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'online', instagram: isLoggedIn ? 'connected' : 'disconnected' });
});

app.get(['/news/:slug', '/bloq/:slug', '/blog/:slug'], (req, res, next) => {
    const slug = req.params.slug;
    
    // 1. Statik faylı yoxla (Prioritet 1)
    const staticHtmlPath = path.join(__dirname, 'bloq', slug, 'index.html');
    if (fs.existsSync(staticHtmlPath)) {
        return res.sendFile(staticHtmlPath);
    }

    // 2. Köhnə struktur (flat files) (Prioritet 2)
    const flatHtmlPath = path.join(__dirname, 'bloq', `${slug}.html`);
    if (fs.existsSync(flatHtmlPath)) {
        return res.sendFile(flatHtmlPath);
    }

    // 3. Fallback: Dynamic view.html (əgər statik fayl yoxdursa)
    res.sendFile(path.join(__dirname, 'bloq', 'view.html'));
});

// TELEGRAM BOT API ENDPOINTS
// SEO & Sitemap: Yenilə
app.post('/api/admin/update-seo', (req, res) => {
    console.log("🔍 SEO Yeniləmə sorğusu alındı...");
    const scriptPath = path.join(__dirname, 'tools', 'update_sitemap.js');
    
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`SEO Xətası: ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
        console.log(`SEO Çıxışı: ${stdout}`);
        if (stderr) console.error(`SEO Stderr: ${stderr}`);
        
        res.json({ 
            success: true, 
            message: 'SEO və Statik səhifələr uğurla yeniləndi',
            output: stdout 
        });
    });
});

// Admin: Serveri yenidən başlat
app.post('/api/admin/restart-server', (req, res) => {
    try {
        const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
            cwd: __dirname,
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        res.json({ success: true, message: 'Server yenidən başladılır' });
        setTimeout(() => {
            process.exit(0);
        }, 500);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 1. Quizi əl ilə başlat
app.post('/api/telegram/start-quiz', async (req, res) => {
    const { count } = req.body;
    const questionCount = count || 30; // Default 30
    
    console.log(`🕹️ Admin paneldən Quiz başladılır (${questionCount} sual)...`);
    
    // Guard edilmiş başlanğıc
    if (!telegramBot || typeof telegramBot.startQuizBatch !== 'function') {
        return res.status(503).json({ success: false, message: 'Bot aktiv deyil' });
    }
    const ok = await telegramBot.startQuizBatch(questionCount);
    if (!ok) {
        return res.status(429).json({ success: false, message: 'Batch artıq davam edir. Xahiş olunur bir qədər sonra yenidən.' });
    }
    
    res.json({ success: true, message: `Quiz sessiyasi başladıldı (${questionCount} sual)` });
});

// 1a. Quiz-i dayandır (GET/POST hər ikisi)
app.all('/api/telegram/stop-quiz', (req, res) => {
    try {
        console.log("🛑 Admin paneldən dayandırma sorğusu alındı:", req.method);
        if (!telegramBot || typeof telegramBot.stopQuizBatch !== 'function') {
            return res.status(503).json({ success: false, message: 'Bot aktiv deyil' });
        }
        const ok = telegramBot.stopQuizBatch();
        if (!ok) {
            return res.status(409).json({ success: false, message: 'Hazırda aktiv sessiya yoxdur' });
        }
        res.json({ success: true, message: 'Quiz sessiyasi dayandırılır' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
app.post('/api/admin/telegram-config', (req, res) => {
    try {
        const { token, channelId, quizCount } = req.body || {};
        const hasToken = typeof token === 'string' && token.trim().length > 0;
        const hasChannel = typeof channelId === 'string' && channelId.trim().length > 0;
        if (hasToken) process.env.TELEGRAM_BOT_TOKEN = token.trim();
        if (hasChannel) process.env.TELEGRAM_CHANNEL_ID = channelId.trim();
        if (quizCount != null) {
            process.env.TELEGRAM_QUIZ_COUNT = String(quizCount);
            if (telegramBot && typeof telegramBot.setQuizCount === 'function') {
                telegramBot.setQuizCount(quizCount);
            }
            try {
                const envPath = path.join(__dirname, '.env');
                let content = '';
                try { content = fs.readFileSync(envPath, 'utf8'); } catch (_) { content = ''; }
                const lines = content.split(/\r?\n/).filter(l => l.length > 0);
                let found = false;
                const updated = lines.map(l => {
                    if (/^\s*TELEGRAM_QUIZ_COUNT\s*=/.test(l)) {
                        found = true;
                        return `TELEGRAM_QUIZ_COUNT=${quizCount}`;
                    }
                    return l;
                });
                if (!found) updated.push(`TELEGRAM_QUIZ_COUNT=${quizCount}`);
                fs.writeFileSync(envPath, updated.join('\n') + '\n', 'utf8');
            } catch (_) {}
        }
        if (!hasToken && !hasChannel && quizCount == null) {
            return res.status(400).json({ success: false, message: 'Heç bir dəyişiklik göndərilmədi' });
        }
        res.json({ success: true, updated: { token: !!hasToken, channelId: !!hasChannel, quizCount: quizCount != null } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Yeni sual əlavə et
app.post('/api/telegram/add-question', (req, res) => {
    const newQuestion = req.body;
    
    // Validasiya
    const hasQuestion = typeof newQuestion.question === 'string' && newQuestion.question.trim().length > 0;
    const hasOptions = Array.isArray(newQuestion.options) && newQuestion.options.length >= 2;
    const idx = newQuestion.correct_option_id;
    const hasCorrect = typeof idx === 'number' && idx >= 0 && idx < (hasOptions ? newQuestion.options.length : 0);
    if (!hasQuestion || !hasOptions || !hasCorrect) {
        return res.status(400).json({ success: false, message: 'Çatışmayan məlumatlar var.' });
    }

    const result = telegramBot.addQuestion(newQuestion);
    
    if (result) {
        res.json({ success: true, message: 'Sual bazaya əlavə edildi!' });
    } else {
        res.status(500).json({ success: false, message: 'Sualı yadda saxlamaq mümkün olmadı.' });
    }
});

// Admin: Sualı Firestore-da yenilə
app.post('/api/admin/update-question', async (req, res) => {
    try {
        const { docId, index, questionData } = req.body;
        
        if (!docId || index == null || !questionData) {
            return res.status(400).json({ success: false, message: 'Çatışmayan məlumatlar.' });
        }

        if (!db) return res.status(503).json({ success: false, message: 'Database qoşulmayıb.' });

        const docRef = doc(db, 'categories', docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return res.status(404).json({ success: false, message: 'Kateqoriya tapılmadı.' });
        }

        const data = docSnap.data();
        const questions = data.questions || [];

        if (index < 0 || index >= questions.length) {
            return res.status(400).json({ success: false, message: 'Sual indeksi səhvdir.' });
        }

        // Sualı yenilə
        questions[index] = {
            ...questions[index],
            ...questionData,
            updatedAt: new Date().toISOString()
        };

        await updateDoc(docRef, { questions: questions });
        
        res.json({ success: true, message: 'Sual uğurla yeniləndi.' });
    } catch (error) {
        console.error("Update Question Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

function normalizeText(s) {
    if (!s) return '';
    return s.replace(/\s+/g, ' ').trim();
}

app.get('/admin/telegram', (req, res) => {
    const html = `
<!doctype html>
<html lang="az">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Telegram Quiz İdarəetmə</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; }
button { padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; }
.primary { background: #2563eb; color: #fff; }
.secondary { background: #e5e7eb; }
.status { margin-top: 8px; color: #475569; min-height: 20px; }
</style>
</head>
<body>
<h1>Telegram Quiz İdarəetmə</h1>
<div class="row">
  <div>
    <label>Bot Token</label>
    <input id="tg_token" placeholder="TELEGRAM_BOT_TOKEN">
  </div>
  <div>
    <label>Kanal ID</label>
    <input id="tg_channel" placeholder="@kanal_adi və ya ID">
  </div>
</div>
<button class="secondary" id="saveBtn">Konfiqurasiyanı saxla</button>
<div class="status" id="saveStatus"></div>
<hr style="margin: 20px 0;">
<div class="row">
  <div>
    <label>Quiz sual sayı</label>
    <input id="q_count" type="number" value="30">
  </div>
  <div style="display:flex; align-items:flex-end;">
    <button class="primary" id="startBtn">Quiz-i Başlat</button>
  </div>
</div>
<div class="status" id="startStatus"></div>
<script>
const saveBtn = document.getElementById('saveBtn');
const startBtn = document.getElementById('startBtn');
const saveStatus = document.getElementById('saveStatus');
const startStatus = document.getElementById('startStatus');
saveBtn.onclick = async () => {
  saveStatus.textContent = 'Yüklənir...';
  try {
    const token = document.getElementById('tg_token').value.trim();
    const channelId = document.getElementById('tg_channel').value.trim();
    const resp = await fetch('/api/admin/telegram-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, channelId })
    });
    const data = await resp.json();
    if (data && data.success) {
      saveStatus.textContent = 'Saxlandı.';
    } else {
      saveStatus.textContent = 'Xəta: ' + (data.message || 'Naməlum');
    }
  } catch (e) {
    saveStatus.textContent = 'Xəta: ' + e.message;
  }
};
startBtn.onclick = async () => {
  startStatus.textContent = 'Yüklənir...';
  try {
    const count = parseInt(document.getElementById('q_count').value || '30', 10);
    const resp = await fetch('/api/telegram/start-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count })
    });
    const data = await resp.json();
    if (data && data.success) {
      startStatus.textContent = data.message || 'Başladı.';
    } else {
      startStatus.textContent = 'Xəta: ' + (data.message || 'Naməlum');
    }
  } catch (e) {
    startStatus.textContent = 'Xəta: ' + e.message;
  }
};
</script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

function fingerprintQuestion(q) {
    const qText = toAsciiSimple(normalizeText(q.question).toLowerCase());
    const optsArr = (q.options || []).map(o => toAsciiSimple(normalizeText(o).toLowerCase())).sort();
    let correctText = '';
    if (typeof q.correct_option_id === 'number' && (q.options || [])[q.correct_option_id] != null) {
        correctText = toAsciiSimple(normalizeText(q.options[q.correct_option_id]).toLowerCase());
    }
    const base = `${qText}|${optsArr.join('|')}|${correctText}`;
    return crypto.createHash('sha1').update(base).digest('hex');
}
function toAsciiSimple(s) {
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
    const t = toAsciiSimple(normalizeText(q.question).toLowerCase());
    return t.replace(/^sual\s*\d+\s*[:\)\.]?\s*/i, '').replace(/^\d+\s*[\.\)]\s*/, '');
}

function parseQuestionsFromText(raw, defaultCategory) {
    const text = (raw || '').replace(/\r/g, '\n');
    let parts = text.split(/\n(?=\s*\d+\s*[\.\)]\s+)/);
    if (parts.length === 1) parts = text.split(/\n{2,}/);

    const toAsciiAz = (s) => {
        return (s || '')
            .replace(/ə/gi, 'e')
            .replace(/ö/gi, 'o')
            .replace(/ü/gi, 'u')
            .replace(/ğ/gi, 'g')
            .replace(/ç/gi, 'c')
            .replace(/ş/gi, 's')
            .replace(/ı/g, 'i')
            .toLowerCase();
    };
    const categorize = (blockText) => {
        const t = (blockText || '').toLowerCase();
        const ta = toAsciiAz(blockText);
        const dict = [
            { cats: 'Konstitusiya', keys: ['konstitusiya', 'əsas qanun', 'esas qanun', 'konstitusiya qanunu', 'normativ hüquqi aktlar', 'normativ huquqi aktlar'] },
            { cats: 'Əmək Məcəlləsi', keys: ['əmək məcəlləsi', 'emek mecellesi', 'əmək qanunu', 'emek qanunu', 'əmək münasibəti', 'emek munasibeti', 'əmək', 'emek'] },
            { cats: 'Vergi Məcəlləsi', keys: ['vergi məcəlləsi', 'vergi mecellesi', 'vergi qanunu', 'vergi organi', 'vergitutma', 'vergi'] },
            { cats: 'Seçki Məcəlləsi', keys: ['seçki məcəlləsi', 'secki mecellesi', 'seçki komissiyası', 'secki komissiyasi', 'səsvermə', 'sesverme', 'seçki', 'secki'] },
            { cats: 'Mülki Məcəllə', keys: ['mülki məcəllə', 'mulki mecelle', 'mülki hüquq', 'mulki huquq', 'müqavilə', 'muqavile', 'mülki', 'mulki'] },
            { cats: 'İnzibati Xətalar Məcəlləsi', keys: ['inzibati xətalar', 'inzibati xetalar', 'ixm', 'inzibati xəta', 'inzibati xeta', 'inzibati'] },
            { cats: 'İnzibati İcraat', keys: ['inzibati icraat', 'inzibati akt', 'inzibati orqan'] },
            { cats: 'Bələdiyyə', keys: ['bələdiyyə', 'belediyye', 'bələdiyyələrin', 'yerli özünüidarə', 'yerli ozunidarə', 'yerli ozunidare', 'bələdiyy', 'belediyy'] },
            { cats: 'Təhsil Qanunu', keys: ['təhsil qanunu', 'tehsil qanunu', 'təhsil müəssisəsi', 'tehsil muessisesi', 'şagird', 'sagird', 'müəllim', 'muellim', 'təhsil', 'tehsil'] },
            { cats: 'Dövlət Qulluğu haqqında Qanun', keys: ['dövlət qulluğu', 'dovlet qullugu', 'etik davranış', 'etik davranis', 'vəzifə təlimatı', 'vezife telimati', 'qulluq'] },
            { cats: 'Korrupsiya ilə mübarizə', keys: ['korrupsiya', 'rusvet', 'rüşvət', 'maraqlar toqquşması', 'maraqlar toqqusmasi'] },
            { cats: 'İnformasiya əldə edilməsi', keys: ['informasiya əldə edilməsi', 'informasiya elde edilmesi', 'məlumat', 'melumat', 'informasiya azadlığı', 'informasiya azadligi', 'informasiya'] },
            { cats: 'Torpaq Məcəlləsi', keys: ['torpaq məcəlləsi', 'torpaq mecellesi', 'torpaq sahəsi', 'torpaq sahesi', 'əmlak', 'emlak', 'torpaq'] },
            { cats: 'Məntiq', keys: ['məntiq', 'mentiq', 'ardıcıllıq', 'ardiciliq', 'sillogizm', 'silogizm', 'mantiq'] },
            { cats: 'Azərbaycan Dili', keys: ['azərbaycan dili', 'azerbaycan dili', 'yazılış', 'yazilis', 'qrammatika', 'qrammatika', 'imla', 'cümlə', 'cumle', 'morfologiya', 'sintaksis'] }
        ];
        for (const item of dict) {
            for (const k of item.keys) {
                const ka = toAsciiAz(k);
                if (t.includes(k) || ta.includes(ka)) return item.cats;
            }
        }
        return normalizeText(defaultCategory || 'Dövlət Qulluğu');
    };

    const out = [];
    const optRegex = /^\s*([A-E])[\)\.\-]\s*(.+)$/i;
    const ansRegex = /(cavab|doğru cavab|düzgün cavab|correct|answer)\s*[:\-]\s*(.+)$/i;
    const linesAll = text.split('\n').map(l => l.trim());
    let cur = null;
    const pushCur = () => {
        if (!cur) return;
        if (!cur.question || (cur.options || []).length < 2) { cur = null; return; }
        if (cur.correct_option_id == null || cur.correct_option_id < 0 || cur.correct_option_id >= cur.options.length) cur.correct_option_id = 0;
        out.push({
            category: categorize(cur.rawBlock.join('\n')),
            question: normalizeText(cur.question),
            options: cur.options.map(normalizeText),
            correct_option_id: cur.correct_option_id,
            explanation: normalizeText(cur.explanation || '')
        });
        cur = null;
    };
    const isQuestionStart = (l) => {
        if (!l) return false;
        if (/^\d+\s*[\.\)]\s+/.test(l)) return true;
        if (/^sual\s*\d+/i.test(l)) return true;
        if (/\?\s*$/.test(l) && !optRegex.test(l) && !ansRegex.test(l)) return true;
        return false;
    };
    for (let i = 0; i < linesAll.length; i++) {
        const l = linesAll[i];
        if (!l) { continue; }
        const mOpt = l.match(optRegex);
        const mAns = l.match(ansRegex);
        if (isQuestionStart(l)) {
            pushCur();
            const qm = l.match(/^\d+\s*[\.\)]\s*(.+)$/);
            const qText = qm ? qm[1] : l;
            cur = { question: qText, options: [], correct_option_id: -1, explanation: '', rawBlock: [l] };
            continue;
        }
        if (!cur) {
            const maybeQ = l.replace(/^\d+\s*[\.\)]\s*/, '');
            if (/\?\s*$/.test(maybeQ)) {
                cur = { question: maybeQ, options: [], correct_option_id: -1, explanation: '', rawBlock: [l] };
                continue;
            } else {
                continue;
            }
        }
        cur.rawBlock.push(l);
        if (mOpt) {
            cur.options.push(mOpt[2]);
            continue;
        }
        if (mAns) {
            const val = mAns[2].trim();
            const lm = val.match(/^([A-E])/i);
            if (lm) {
                cur.correct_option_id = lm[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
            } else {
                const idx = cur.options.findIndex(o => toAsciiAz(o).includes(toAsciiAz(val)) || toAsciiAz(val).includes(toAsciiAz(o)));
                if (idx >= 0) cur.correct_option_id = idx;
            }
            continue;
        }
        if (/^(izah|şərh|açıqlama|explanation)\s*[:\-]/i.test(l)) {
            const em = l.replace(/^(izah|şərh|açıqlama|explanation)\s*[:\-]\s*/i, '');
            cur.explanation = em;
            continue;
        }
        if (cur.options.length === 0 && !/\?\s*$/.test(cur.question)) {
            cur.question += ' ' + l;
        }
    }
    pushCur();
    if (out.length > 0) return out;
    const fallback = [];
    for (let block of parts) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length);
        if (!lines.length) continue;
        let qLine = lines[0];
        const qm = qLine.match(/^\s*\d+\s*[\.\)]\s*(.+)$/);
        if (qm) qLine = qm[1];
        const question = normalizeText(qLine);
        const options = [];
        for (const l of lines.slice(1)) {
            const m = l.match(optRegex);
            if (m) options.push(normalizeText(m[2]));
        }
        let correctIndex = -1;
        const ansLine = lines.find(l => /cavab|doğru cavab|düzgün cavab/i.test(l));
        if (ansLine) {
            const lm = ansLine.match(/([A-E])/i);
            if (lm) correctIndex = (lm[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0));
        }
        let explanation = '';
        const expLine = lines.find(l => /izah|şərh|açıqlama|explanation/i.test(l));
        if (expLine) {
            const em = expLine.match(/(?:izah|şərh|açıqlama|explanation)\s*[:\-]\s*(.+)$/i);
            explanation = em ? normalizeText(em[1]) : normalizeText(expLine);
        }
        if (!question || options.length < 2) continue;
        if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;
        fallback.push({
            category: categorize(block),
            question,
            options,
            correct_option_id: correctIndex,
            explanation
        });
    }
    return fallback;
}

// Simple upload UI
app.get('/upload-questions', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html>
<html lang="az"><head><meta charset="utf-8"><title>Sual yüklə</title>
<style>body{font-family:Arial,sans-serif;padding:30px} .box{border:1px solid #ddd;padding:20px;border-radius:10px;max-width:520px}</style>
</head><body>
<div class="box">
  <h2>Word/TXT faylından sual yüklə</h2>
  <form id="f" method="post" enctype="multipart/form-data" action="/api/telegram/ingest-docx">
    <input type="file" name="file" accept=".doc,.docx,.txt" required><br><br>
    <label>Kateqoriya (opsional): <input type="text" name="defaultCategory" placeholder="Məs: Tarix"></label><br><br>
    <button type="submit">Yüklə</button>
  </form>
  <div id="r" style="margin-top:15px;color:#333"></div>
</div>
<script>
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const resp = await fetch('/api/telegram/ingest-docx', { method: 'POST', body: fd });
  const json = await resp.json();
  document.getElementById('r').textContent = JSON.stringify(json, null, 2);
});
</script></body></html>`);
});

// DOCX/TXT ingestion
app.post('/api/telegram/ingest-docx', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Fayl yoxdur.' });
        let rawText = '';
        const mime = req.file.mimetype || '';
        const ext = (req.file.originalname || '').toLowerCase();
        if (mime.includes('text/plain') || ext.endsWith('.txt')) {
            rawText = req.file.buffer.toString('utf8');
        } else if (ext.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            rawText = result.value || '';
        } else if (ext.endsWith('.doc')) {
            return res.status(400).json({ success: false, message: '.doc dəstəklənmir. Zəhmət olmasa .docx və ya .txt göndərin.' });
        } else {
            return res.status(400).json({ success: false, message: 'Dəstəklənməyən format. .docx və ya .txt göndərin.' });
        }
        if (!rawText || rawText.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Faylda mətn tapılmadı.' });
        }
        const parsed = parseQuestionsFromText(rawText, req.body && req.body.defaultCategory);
        if (!parsed.length) return res.status(400).json({ success: false, message: 'Sual strukturu tapılmadı.' });
        const qPath = path.join(__dirname, 'questions.json');
        let existing = [];
        try {
            existing = JSON.parse(fs.readFileSync(qPath));
            if (!Array.isArray(existing)) existing = [];
        } catch (_) { existing = []; }
        const fpSet = new Set(existing.map(fingerprintQuestion));
        let maxId = existing.reduce((m, q) => Math.max(m, q.id || 0), 0);
        let inserted = 0, duplicates = 0; const added = [];
        for (const q of parsed) {
            const fp = fingerprintQuestion(q);
            if (fpSet.has(fp)) { duplicates++; continue; }
            maxId += 1; q.id = maxId; existing.push(q); fpSet.add(fp); added.push(q.id); inserted++;
        }
        fs.writeFileSync(qPath, JSON.stringify(existing, null, 2));
        res.json({ success: true, inserted, duplicates, total: existing.length, added });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
app.post('/api/telegram/ingest-text', express.text({ type: '*/*', limit: '10mb' }), (req, res) => {
    try {
        let text = null;
        let defaultCategory = null;
        if (typeof req.body === 'string') {
            let maybe = null;
            try { maybe = JSON.parse(req.body); } catch (_) {}
            if (maybe && typeof maybe === 'object') {
                text = typeof maybe.text === 'string' ? maybe.text : null;
                defaultCategory = maybe.defaultCategory;
            }
            if (!text) text = req.body;
        } else {
            const body = req.body || {};
            text = body.text;
            defaultCategory = body.defaultCategory;
        }
        if (!text || typeof text !== 'string' || text.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Mətn düzgün deyil.' });
        }
        const parsed = parseQuestionsFromText(text, defaultCategory);
        if (!parsed.length) {
            return res.status(400).json({ success: false, message: 'Heç bir sual tapılmadı.' });
        }
        const qPath = path.join(__dirname, 'questions.json');
        let existing = [];
        try {
            existing = JSON.parse(fs.readFileSync(qPath));
            if (!Array.isArray(existing)) existing = [];
        } catch (_) {
            existing = [];
        }
        const fpSet = new Set(existing.map(fingerprintQuestion));
        let maxId = existing.reduce((m, q) => Math.max(m, q.id || 0), 0);
        let inserted = 0;
        let duplicates = 0;
        const added = [];
        for (const q of parsed) {
            const fp = fingerprintQuestion(q);
            if (fpSet.has(fp)) {
                duplicates++;
                continue;
            }
            maxId += 1;
            q.id = maxId;
            existing.push(q);
            fpSet.add(fp);
            added.push(q.id);
            inserted++;
        }
        fs.writeFileSync(qPath, JSON.stringify(existing, null, 2));
        res.json({ success: true, inserted, duplicates, total: existing.length, added });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Cədvəl Məlumatı
app.get('/api/telegram/schedule', (req, res) => {
    if (telegramBot.getNextSchedule) {
        res.json(telegramBot.getNextSchedule());
    } else {
        res.status(503).json({ error: "Bot aktiv deyil" });
    }
});

// 4. Üzrxahlıq mesajı göndər
app.post('/api/telegram/apology', async (req, res) => {
    try {
        const { message } = req.body || {};
        if (!telegramBot.sendApologyMessage) {
            return res.status(503).json({ success: false, message: "Bot aktiv deyil" });
        }
        const ok = await telegramBot.sendApologyMessage(message);
        if (ok) {
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false, message: "Mesaj göndərilmədi" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 5. Xəbəri kanala paylaş
app.post('/api/telegram/post-news', async (req, res) => {
    try {
        if (!telegramBot.sendNews) {
            return res.status(503).json({ success: false, message: "Bot aktiv deyil" });
        }
        const payload = req.body || {};
        const ok = await telegramBot.sendNews(payload);
        if (ok) {
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false, message: "Xəbər göndərilmədi" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/rss/add', async (req, res) => {
    try {
        const payload = req.body || {};
        const storePath = path.join(__dirname, 'rss_store.json');
        let store = [];
        try {
            if (fs.existsSync(storePath)) {
                store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
            }
        } catch {}
        const item = {
            title: payload.title || '',
            link: payload.url || '',
            description: payload.excerpt || '',
            imageUrl: payload.imageUrl || '',
            category: payload.category || '',
            pubDate: new Date().toUTCString(),
            guid: crypto.createHash('md5').update((payload.url || '') + Date.now()).digest('hex')
        };
        store.unshift(item);
        store = store.slice(0, 50);
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
        const rssItems = store.map(x => {
            const enclosure = x.imageUrl ? `<enclosure url="${x.imageUrl}" type="image/jpeg"/>` : '';
            const cat = x.category ? `<category>${x.category}</category>` : '';
            return `<item><title><![CDATA[${x.title}]]></title><link>${x.link}</link><description><![CDATA[${x.description}]]></description>${cat}<pubDate>${x.pubDate}</pubDate><guid>${x.guid}</guid>${enclosure}</item>`;
        }).join('');
        const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>İmtahan.site Xəbər</title><link>https://imtahan.site/bloq</link><description>Son xəbərlər</description><language>az</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;
        fs.writeFileSync(path.join(__dirname, 'rss.xml'), rss + rssItems + '</channel></rss>', 'utf-8');

        // Build/refresh sitemap.xml dynamically from RSS store
        const baseUrls = [
            { loc: 'https://imtahan.site/', changefreq: 'daily', priority: '1.0' },
            { loc: 'https://imtahan.site/bloq', changefreq: 'hourly', priority: '0.9' },
            { loc: 'https://imtahan.site/index.html', changefreq: 'weekly', priority: '0.8' }
        ];
        const seen = new Set(baseUrls.map(b => b.loc));
        const newsUrls = store
            .map(x => {
                const loc = x.link || '';
                const lastmod = x.pubDate ? new Date(x.pubDate).toISOString() : new Date().toISOString();
                return { loc, lastmod, changefreq: 'hourly', priority: '0.7' };
            })
            .filter(u => u.loc && /^https?:\/\//.test(u.loc));
        const allUrls = [...baseUrls, ...newsUrls].filter(u => {
            if (seen.has(u.loc)) return false;
            seen.add(u.loc);
            return true;
        });
        const sitemapBody = allUrls.map(u => {
            const lastmodTag = u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '';
            return `<url><loc>${u.loc}</loc>${lastmodTag}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`;
        }).join('');
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapBody}</urlset>`;
        fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf-8');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/github/dispatch', async (req, res) => {
    try {
        const token = process.env.GITHUB_PAT;
        const owner = process.env.GITHUB_OWNER || 'imtahan-design';
        const repo = process.env.GITHUB_REPO || 'imtahan-sistemi';
        const workflow = process.env.GITHUB_WORKFLOW || 'deploy.yml';
        const ref = (req.body && req.body.ref) || 'main';
        
        if (!token) {
            return res.status(400).json({ success: false, message: 'GITHUB_PAT tapılmadı (.env faylında qurulmalıdır).' });
        }
        
        const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;
        await axios.post(url, { ref }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'imtahan-site-dispatch'
            }
        });
        res.json({ success: true, message: 'Workflow dispatch göndərildi.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Lokal statik səhifə və sitemap generasiyası (PAT tələb etmədən)
app.post('/api/build/static', async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, 'tools', 'update_sitemap.js');
        if (!fs.existsSync(scriptPath)) {
            return res.status(404).json({ success: false, message: 'update_sitemap.js tapılmadı.' });
        }
        exec(`node "${scriptPath}"`, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ success: false, message: error.message, stderr });
            }
            res.json({ success: true, message: 'Statik build tamamlandı.', stdout });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Instagram Setup
const ig = new IgApiClient();
let isLoggedIn = false;

async function loginToInstagram() {
    try {
        if (!process.env.IG_USERNAME || !process.env.IG_PASSWORD) {
            console.warn("⚠️ XƏBƏRDARLIQ: .env faylında istifadəçi adı və şifrə yoxdur!");
            return false;
        }
        
        // Bu sətirlər Instagram-a "mən real telefonom" deyir
        ig.state.generateDevice(process.env.IG_USERNAME);
        
        console.log(`Instagram-a daxil olunur: ${process.env.IG_USERNAME}...`);
        await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
        
        isLoggedIn = true;
        console.log("✅ Instagram-a uğurla daxil olundu!");
        return true;
    } catch (error) {
        console.error("❌ Instagram Giriş Xətası:", error.message);
        return false;
    }
}

// Start login process on boot (Optional, can be lazy)
loginToInstagram();

// THEME SYSTEM
const THEMES = {
    exam: {
        keywords: ['imtahan', 'sınaq', 'bal', 'nəticə', 'qəbul', 'blok'],
        gradient: ['#0f2027', '#203a43', '#2c5364'], // Deep Blue/Green
        icon: '📝',
        accent: '#00e676'
    },
    holiday: {
        keywords: ['tətil', 'bayram', 'novruz', 'yeni il', 'istirahət'],
        gradient: ['#ff512f', '#dd2476'], // Orange/Red
        icon: '🎉',
        accent: '#ffd700'
    },
    urgent: {
        keywords: ['xəbərdarlıq', 'diqqət', 'vacib', 'təcili', 'dəyişiklik'],
        gradient: ['#cb2d3e', '#ef473a'], // Red/Alert
        icon: '⚠️',
        accent: '#ffffff'
    },
    tech: {
        keywords: ['onlayn', 'texnologiya', 'sistem', 'portal', 'rəqəmsal'],
        gradient: ['#373b44', '#4286f4'], // Blue/Grey
        icon: '💻',
        accent: '#00d2ff'
    },
    default: {
        gradient: ['#141E30', '#243B55'], // Classic Dark Blue
        icon: '📢',
        accent: '#00e676'
    }
};

function getTheme(title) {
    const lowerTitle = title.toLowerCase();
    for (const [key, theme] of Object.entries(THEMES)) {
        if (theme.keywords && theme.keywords.some(k => lowerTitle.includes(k))) {
            return theme;
        }
    }
    return THEMES.default;
}

function generateSVG(title) {
    const theme = getTheme(title);
    
    // Word wrapping logic
    const words = title.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        if (currentLine.length + words[i].length < 18) { // Reduced char limit for bigger text
            currentLine += ' ' + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);

    const lineHeight = 100;
    const totalTextHeight = lines.length * lineHeight;
    const startY = (1080 - totalTextHeight) / 2 + 100; // Offset for icon
    
    const textElements = lines.map((line, i) => 
        `<text x="50%" y="${startY + (i * lineHeight)}" text-anchor="middle" fill="white" font-family="Arial" font-size="80" font-weight="bold" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">${line}</text>`
    ).join('');

    return `
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="gradTheme" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${theme.gradient[0]};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${theme.gradient[theme.gradient.length-1]};stop-opacity:1" />
            </linearGradient>
            
            <!-- Pattern Overlay -->
            <pattern id="pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" opacity="0.1"/>
            </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#gradTheme)"/>
        <rect width="100%" height="100%" fill="url(#pattern)"/>
        
        <!-- Central Icon/Emoji -->
        <text x="50%" y="300" text-anchor="middle" font-size="200">${theme.icon}</text>
        
        <!-- Decoration Box -->
        <rect x="100" y="${startY - 80}" width="880" height="${totalTextHeight + 60}" rx="20" fill="none" stroke="${theme.accent}" stroke-width="8" opacity="0.5" />
        
        <!-- Title Text -->
        ${textElements}
        
        <!-- Footer -->
        <rect x="0" y="980" width="1080" height="100" fill="rgba(0,0,0,0.3)"/>
        <text x="50%" y="1040" text-anchor="middle" fill="${theme.accent}" font-family="Arial" font-size="40" font-weight="bold" letter-spacing="2">IMTAHAN.SITE</text>
    </svg>
    `;
}



// AI HORDE (Distributed AI Generation - High Quality Backup)
async function generateHordeImage(prompt) {
    console.log(`🧠 AI Horde işə salınır... (Kənar Serverlərdə hazırlanır, sizin GPU istifadə edilmir)`);
    console.log(`📝 Prompt: "${prompt}"`);
    const apiKey = '0000000000'; // Anonymous key
    
    try {
        // 1. Submit Generation Request
        const generateRes = await axios.post('https://stablehorde.net/api/v2/generate/async', {
            prompt: prompt,
            params: {
                sampler_name: "k_euler",
                cfg_scale: 7,
                steps: 25,
                width: 768, // 768x768 is faster and standard for SDXL/SD2
                height: 768,
                n: 1
            },
            nsfw: false,
            censor_nsfw: true,
            models: ["ICBINP - I Can't Believe It's Not Photography", "stable_diffusion"]
        }, {
            headers: { 'apikey': apiKey }
        });

        const uuid = generateRes.data.id;
        console.log(`⏳ Horde növbəsinə alındı. ID: ${uuid}`);

        // 2. Poll for status
        let attempts = 0;
        while (attempts < 40) { // Max 80 seconds wait
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s
            
            const checkRes = await axios.get(`https://stablehorde.net/api/v2/generate/check/${uuid}`);
            const status = checkRes.data;
            
            if (status.done) {
                console.log("✅ Horde şəkli hazırdır!");
                break;
            }
            
            if (attempts % 5 === 0) console.log(`⏳ Gözlənilir... (Növbə: ${status.wait_time}s)`);
            attempts++;
        }

        // 3. Get Result
        const statusRes = await axios.get(`https://stablehorde.net/api/v2/generate/status/${uuid}`);
        
        if (statusRes.data.generations && statusRes.data.generations.length > 0) {
            const imageUrl = statusRes.data.generations[0].img;
            console.log(`🔗 Şəkil URL: ${imageUrl}`);
            
            const imgRes = await axios({
                url: imageUrl,
                responseType: 'arraybuffer',
                timeout: 15000
            });
            return imgRes.data;
        }
        
        throw new Error("Horde şəkil qaytarmadı (Timeout)");
        
    } catch (error) {
        console.warn(`⚠️ Horde Xətası: ${error.message}`);
        throw error;
    }
}

// LOREMFLICKR (Real Photos Backup)
async function getFlickrImage(keyword) {
    console.log(`🔍 Flickr-də axtarılır: "${keyword}"`);
    try {
        // Use ONLY the first keyword for better relevance (avoid "all" which might fail and return cat)
        const firstKeyword = keyword.split(',')[0];
        const url = `https://loremflickr.com/1080/1080/${encodeURIComponent(firstKeyword)}`;
        
        const response = await axios({
            url: url,
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            validateStatus: status => status === 200 // Only accept 200 OK
        });
        
        if (response.data && response.data.length > 10000) {
            console.log("✅ Flickr şəkli tapıldı!");
            return response.data;
        }
        throw new Error("Flickr şəkli çox kiçikdir");
    } catch (error) {
        console.warn(`⚠️ Flickr Xətası: ${error.message}`);
        throw error;
    }
}

// LEXICA.ART (Pre-generated AI Images)
async function getLexicaImage(query) {
    console.log(`🔍 Lexica.art-da axtarılır: "${query}"`);
    try {
        const response = await axios.get(`https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (response.data && response.data.images && response.data.images.length > 0) {
            const images = response.data.images.slice(0, 20); // First 20 images
            const randomImage = images[Math.floor(Math.random() * images.length)];
            
            console.log(`✅ Lexica şəkli tapıldı: ${randomImage.src}`);
            
            const imageResponse = await axios({
                url: randomImage.src,
                responseType: 'arraybuffer',
                timeout: 15000,
                 headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            
            return imageResponse.data;
        }
        throw new Error("Lexica-da uyğun şəkil tapılmadı");
    } catch (error) {
        console.warn(`⚠️ Lexica Xətası: ${error.message}`);
        throw error;
    }
}

// UNSPLASH (Real Professional Photos)
async function getUnsplashImage(keyword) {
    console.log(`🔍 Unsplash-da axtarılır: "${keyword}"`);
    try {
        // Source API redirects to a real image
        const url = `https://source.unsplash.com/1080x1080/?${encodeURIComponent(keyword)}`;
        
        const response = await axios({
            url: url,
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            validateStatus: status => status === 200
        });
        
        if (response.data && response.data.length > 20000) {
            console.log("✅ Unsplash şəkli tapıldı!");
            return response.data;
        }
        throw new Error("Unsplash şəkli yüklənmədi");
    } catch (error) {
         // Unsplash source is deprecated/redirects, trying direct search if needed or just fallback
         // Let's try Pexels approach if Unsplash fails, but for now just log
        console.warn(`⚠️ Unsplash Xətası: ${error.message}`);
        throw error;
    }
}

// AI IMAGE GENERATION
async function generateAIImage(title) {
    console.log(`🤖 AI GENERATE START. Title: "${title}" (Type: ${typeof title})`);
    
    try {
        // Mətni normallaşdırma (Azərbaycan hərflərini ingilis hərflərinə çevirir ki, axtarış dəqiq olsun)
        const normalizeText = (text) => {
            return text.toLowerCase()
                .replace(/ə/g, 'e')
                .replace(/ğ/g, 'g')
                .replace(/ı/g, 'i')
                .replace(/i̇/g, 'i') // Special case for İ -> i
                .replace(/ö/g, 'o')
                .replace(/ş/g, 's')
                .replace(/ü/g, 'u')
                .replace(/ç/g, 'c')
                .replace(/[^a-z0-9\s]/g, ''); // Simvolları təmizlə
        };

        const normalizedTitle = normalizeText(title);
        console.log(`DEBUG: Normalized Title: "${normalizedTitle}"`);

        // Simple Translation Map (Dictionary) - keys must be normalized (no az characters)
        const dictionary = {
            'polis': 'police officer, security guard',
            'tehlukesizlik': 'security guard, police patrol',
            'mekteb': 'modern school building exterior, students',
            'tehsil': 'education center, university hall',
            'sagird': 'students with backpacks',
            'muellim': 'teacher in classroom',
            'imtahan': 'exam paper, students writing test, classroom',
            'sinaq': 'exam paper, multiple choice test',
            'qayda': 'official document, law paper, signing contract',
            'deyisir': 'news reporter, breaking news screen',
            'deyisiklik': 'news reporter, breaking news screen',
            'baki': 'Baku city architecture',
            'nazirlik': 'official government building',
            'yeni': 'news reporter',
            'yangin': 'fire emergency, firefighters',
            'hava': 'weather forecast map',
            'yagis': 'rainy street',
            'qar': 'snowy city street',
            'universitet': 'university campus, students',
            'bank': 'bank building, money',
            'pul': 'money, currency',
            'maas': 'money, wallet',
            'pensiya': 'elderly people, money',
            'qeza': 'car crash accident',
            'futbol': 'football match, stadium',
            'idman': 'sport athlete',
            'telebe': 'university students',
            'professor': 'university professor, academic conference',
            'alim': 'scientist, research lab',
            'elm': 'science, books, library',
            'elmi': 'science, education',
            'ad': 'certificate, diploma'
        };

        console.log("DEBUG: Dictionary defined. Translating...");

        // Replace keywords
        let keywords = [];
        
        for (const [key, value] of Object.entries(dictionary)) {
            if (normalizedTitle.includes(key)) {
                keywords.push(value);
            }
        }
        
        // Default keyword if none found
        if (keywords.length === 0) keywords.push('azerbaijan breaking news');
        
        const keywordString = keywords.join(',');
        console.log(`🔑 Keywords: "${keywordString}"`);

        // Enhanced Prompt
        const prompt = `Realistic photo of ${keywordString}. High quality journalism photography, 8k resolution, detailed, cinematic lighting. Context: Azerbaijan news.`;
        console.log(`🎨 AI Prompt: "${prompt}"`);
        
        // 1. CƏHD: Pollinations.ai (Canlı Generasiya)
        try {
            const encodedPrompt = encodeURIComponent(prompt);
            // Use 'flux' as primary model (best quality)
            const model = 'flux'; 
            const seed = Math.floor(Math.random() * 1000000);
            
            console.log(`🔄 Pollinations yoxlanılır: ${model}...`);
            const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&model=${model}&seed=${seed}&nologo=true`;
            
            const response = await axios({
                url: url,
                responseType: 'arraybuffer',
                timeout: 25000,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
                }
            });
            
            // Check for Rate Limit / Warning Image based on size
            // The warning image is likely small or static size. 
            // Real 1080x1080 images are usually > 100KB.
            if (response.data.length > 50000) {
                 return response.data;
            }
            console.log("⚠️ Pollinations şəkli şübhəli dərəcədə kiçikdir, növbəti sistemə keçilir...");

        } catch (err) {
            console.log("⚠️ Pollinations xətası:", err.message);
        }

        // 2. CƏHD: LEXICA.ART (Əla Keyfiyyətli Alternativ)
        console.log("🔄 Pollinations alınmadı, Lexica.art (Alternativ) yoxlanılır...");
        try {
            // Lexica üçün təmiz prompt (realism sözünü çıxarırıq, çünki art style ola bilər)
            const lexicaQuery = keywordString.split(',')[0] + " journalism";
            const lexicaImage = await getLexicaImage(lexicaQuery);
            return lexicaImage;
        } catch (lexicaError) {
            console.log("❌ Lexica da alınmadı:", lexicaError.message);
        }

        // 3. CƏHD: UNSPLASH (Real Fotolar - Ən etibarlı)
        console.log("🔄 AI sistemləri alınmadı, Unsplash (Real Foto) yoxlanılır...");
        try {
            const unsplashImage = await getUnsplashImage(keywordString.split(',')[0]);
            return unsplashImage;
        } catch (unsplashError) {
             console.log("❌ Unsplash da alınmadı:", unsplashError.message);
        }

        // 4. CƏHD: AI HORDE (Yavaş amma güclü)
        console.log("🔄 Unsplash alınmadı, AI Horde yoxlanılır...");
        try {
            // Horde üçün qısa və dəqiq prompt
            const hordePrompt = `Realistic photo of ${keywordString}, journalism style, 4k`;
            const hordeImage = await generateHordeImage(hordePrompt);
            return hordeImage;
        } catch (hordeError) {
             console.log("⚠️ Horde alınmadı, növbəti...");
        }

        // 5. CƏHD: LOREMFLICKR (Son variant)
        console.log("🔄 Horde alınmadı, Flickr yoxlanılır...");
        try {
            // Use the first keyword
            const searchKeywords = keywords[0]; 
            const flickrImage = await getFlickrImage(searchKeywords);
            return flickrImage;
        } catch (flickrError) {
            console.error("❌ Flickr da alınmadı:", flickrError.message);
        }
        
        throw new Error("Bütün sistemlər (Pollinations, Lexica, Unsplash, Horde, Flickr) xəta verdi. SVG-yə keçilir.");

    } catch (criticalError) {
        console.error("❌ CRITICAL ERROR IN GENERATE_AI_IMAGE:", criticalError);
        throw criticalError;
    }
}

// AI TEXT SUMMARIZATION (Mətni qısaltmaq üçün)
async function summarizeText(text) {
    if (!text || text.length < 50) return text;

    console.log("📝 AI Mətni təhlil edir və qısaladır...");
    
    const cleanText = text.replace(/<[^>]+>/g, ' ').substring(0, 2000); 
    const prompt = `Act as a news editor. Extract the 3 most important sentences from the following Azerbaijani text. Combine them into a paragraph. Text: ${cleanText}`;
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Random User Agent for Text API too
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const url = `https://text.pollinations.ai/${encodedPrompt}?model=openai`;

    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': randomUserAgent }
        });
        
        let summary = response.data;
        
        // VALIDATION:
        // 1. Check if HTML (Rate limit page often returns HTML)
        if (summary && (summary.trim().startsWith('<') || summary.includes('<!DOCTYPE'))) {
             throw new Error("AI Text API returned HTML (Rate Limit)");
        }
        
        // 2. Check if empty
        if (!summary || summary.length < 10) {
            throw new Error("AI Text API returned empty result");
        }

        console.log("✅ AI Mətn qısaldıldı:", summary.substring(0, 50) + "...");
        return summary;

    } catch (error) {
        console.error("⚠️ AI Text Summary Failed:", error.message);
        // Fallback: Simple truncation
        return cleanText.substring(0, 500) + "...";
    }
}

app.post('/share-to-instagram', async (req, res) => {
    const { title, content } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Başlıq tələb olunur' });
    }

    console.log(`\n📩 Yeni sorğu: "${title}"`);

    try {
        let imageBuffer;
        let isAI = true; // Fixed: Defined isAI variable
        
        // 1. Try AI Generation First
        try {
            console.log("1. AI Şəkil yaradılır (Pollinations / Lexica)...");
            const aiBuffer = await generateAIImage(title);
            
            // 1.1 Resize AI image to ensure it is exactly 1080x1080 before compositing
            const resizedAiBuffer = await sharp(aiBuffer)
                .resize(1080, 1080, { fit: 'cover' })
                .toBuffer();

            // Add Overlay Text (Watermark/Title) to AI Image
            imageBuffer = await sharp(resizedAiBuffer)
                .composite([{
                    input: Buffer.from(`
                        <svg width="1080" height="1080">
                            <defs>
                                <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style="stop-color:rgb(0,0,0);stop-opacity:0" />
                                    <stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:0.9" />
                                </linearGradient>
                            </defs>
                            <rect x="0" y="600" width="1080" height="480" fill="url(#grad1)" />
                            <text x="50" y="980" fill="#00ff9d" font-family="Arial" font-size="50" font-weight="bold">imtahan.site</text>
                            <text x="50" y="1040" fill="white" font-family="Arial" font-size="35" font-weight="bold">${title.substring(0, 45)}...</text>
                        </svg>
                    `),
                    gravity: 'south'
                }])
                .jpeg({ quality: 95 })
                .toBuffer();
                
        } catch (aiError) {
            console.warn("⚠️ AI Alınmadı, SVG-yə keçilir:", aiError.message);
            isAI = false;
            // Fallback to SVG
            const svgContent = generateSVG(title);
            imageBuffer = await sharp(Buffer.from(svgContent))
                .jpeg({ quality: 90 })
                .toBuffer();
        }

        // Save local copy for preview
        const previewFileName = `post_${Date.now()}.jpg`;
        await sharp(imageBuffer).toFile(previewFileName);

        // 3. Post to Instagram
        if (isLoggedIn) {
            console.log("2. Instagram-a yüklənir...");
            
            // HTML təmizləyən funksiya (Ehtiyat üçün)
            const stripHtml = (html) => {
                if (!html) return "";
                return html.replace(/<[^>]+>/g, '').trim();
            };

            // Hazırlanan post mətni (caption)
            let captionText = `📢 ${title}\n\n`;
            
            // AI Mətn Xülasəsi
            let summaryAdded = false;
            if (content && content.length > 10) {
                try {
                    // AI ilə cəhd et
                    const summary = await summarizeText(content);
                    if (summary && summary.length > 10 && !summary.includes('<')) {
                        captionText += `${summary}\n\n`;
                        summaryAdded = true;
                    }
                } catch (e) {
                    console.warn("Caption AI Error:", e.message);
                }
                
                // Əgər AI alınmadısa, sadə kəsim et
                if (!summaryAdded) {
                    const cleanContent = stripHtml(content);
                    const shortContent = cleanContent.length > 400 ? cleanContent.substring(0, 400) + '...' : cleanContent;
                    captionText += `${shortContent}\n\n`;
                }
            }
            
            captionText += `👉 Ətraflı: imtahan.site\n\n#xeber #azerbaijan #təhsil #imtahan`;

            // Instagram limiti (2200) nəzərə alaraq mətni kəsək (təhlükəsizlik üçün 2000)
            if (captionText.length > 2000) {
                const cutLength = 2000 - `...\n\n👉 Ətraflı: imtahan.site\n\n#xeber #azerbaijan #təhsil #imtahan`.length;
                captionText = captionText.substring(0, cutLength) + `...\n\n👉 Ətraflı: imtahan.site\n\n#xeber #azerbaijan #təhsil #imtahan`;
            }

            // Anti-Spam: Add invisible char or random ID to ensure uniqueness
            captionText += `\n.\n🆔 Post ID: ${Date.now().toString().slice(-6)}`;

            console.log("📝 HAZIRLANAN CAPTION:\n", captionText);

            const publishResult = await ig.publish.photo({
                file: imageBuffer,
                caption: captionText
            });
            
            console.log("✅ Uğurla Paylaşıldı! Status:", publishResult.status);
            
            res.json({
                status: 'success',
                message: isAI ? 'AI Şəkli Paylaşıldı!' : 'SVG Şəkli Paylaşıldı (AI xətası)',
                image: previewFileName,
                insta_status: publishResult.status
            });
        } else {
            console.log("⚠️ Instagram-a giriş edilməyib.");
            res.json({
                status: 'success',
                message: 'Şəkil yaradıldı (Instagram oflayn)',
                image: previewFileName
            });
        }

    } catch (error) {
        console.error("❌ XƏTA:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 REAL Server işə düşdü: http://localhost:${PORT}`);
    console.log('------------------------------------------------');
    console.log('DİQQƏT: Real paylaşım etmək üçün .env faylına');
    console.log('Instagram istifadəçi adı və şifrənizi yazmalısınız.');
    console.log('------------------------------------------------');
});
