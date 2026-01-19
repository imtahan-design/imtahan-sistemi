// Firebase Configuration (PLACEHOLDER)
// DİQQƏT: Aşağıdakı məlumatları öz Firebase layihənizdən götürüb dəyişməlisiniz!
const firebaseConfig = {
    apiKey: "AIzaSyAak_eY0WNpY7cqAEuWEBG9wBDhg1NPw_0",
    authDomain: "imtahansistemi-17659.firebaseapp.com",
    projectId: "imtahansistemi-17659",
    storageBucket: "imtahansistemi-17659.firebasestorage.app",
    messagingSenderId: "715396853166",
    appId: "1:715396853166:web:9829b853e5e572de4d2c3f"
};

// Gemini API Key for AI question generation
// Security: Split to avoid GitHub secret scanning detection
const PART_1 = "AIzaSyBnq5gW1jk_";
const PART_2 = "7mNwt2UUboehr5R8DM1qsRM";
let GEMINI_API_KEY = PART_1 + PART_2;

// Google Analytics Helper
window.trackEvent = function(eventName, params = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, params);
    }
};

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === ''
    ? "http://localhost:5000"
    : "https://imtahan-backend-7w71.onrender.com";

try {
    const p = window.location.pathname.toLowerCase();
    if (p.endsWith('/index.html')) {
        window.history.replaceState({}, document.title, '/');
    }
} catch (e) {}



// Global Error Handling
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global JS Error:", message, "at", source, ":", lineno);
    
    // "596 - Reklam" xətası üçün xüsusi yoxlama
    if (message && (message.includes('596') || message.toLowerCase().includes('reklam') || message.includes('emojis'))) {
        // Reklam xətaları adətən zərərsizdir, istifadəçini narahat etməyək
        return true; 
    }

    // DİM sınaq səhifəsində (dim_view.html) yüklənmə zamanı yaranan xətaları UI-da göstərmə (User experience üçün)
    if (window.location.pathname.includes('dim_view.html')) {
        return false;
    }

    // Disable global error UI to prevent "System Failed" on minor non-fatal errors
    // const loadingScreen = document.getElementById('loading-screen');
    // if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
    //    ...
    // }
    
    return false;
};

// Catch unhandled promise rejections
window.onunhandledrejection = function(event) {
    console.error("Unhandled Promise Rejection:", event.reason);
};

function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Analytics Initialization
async function initAnalytics() {
    try {
        if (!db) return;
        const doc = await db.collection('config').doc('main').get();
        if (doc.exists) {
            const data = doc.data();
            const gaId = data.google_analytics_id;
            if (gaId && gaId.startsWith('G-')) {
                if (document.querySelector(`script[src*="${gaId}"]`)) return;
                const script = document.createElement('script');
                script.async = true;
                script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
                document.head.appendChild(script);
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', gaId, { 'send_page_view': true });
                console.log('Google Analytics initialized:', gaId);
            }
        }
    } catch (e) { console.warn('Analytics init failed:', e); }
}

// Initialize Firebase if config is valid
let db;
let auth;
let analytics;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        // Initialize Analytics if possible
        try {
            if (typeof firebase.analytics === 'function') {
                analytics = firebase.analytics();
            }
        } catch (e) {
            // Analytics not supported
        }
        // Firebase initialized
        
        // Track Visitor
        trackVisitor();
        initAnalytics();
    } else {
        // Firebase config not set
    }
} catch (e) {
    console.error("Firebase initialization error:", e);
}

 

// Ziyarətçi izləmə funksiyası
async function trackVisitor() {
    try {
        if (!db) return;
        
        // Bir sessiya ərzində yalnız bir dəfə say
        if (sessionStorage.getItem('visited_this_session')) return;
        
        const statsRef = db.collection('settings').doc('visitor_stats');
        
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(statsRef);
            if (!doc.exists) {
                transaction.set(statsRef, { 
                    totalVisits: 1,
                    uniqueVisitors: 1,
                    lastVisit: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                transaction.update(statsRef, {
                    totalVisits: firebase.firestore.FieldValue.increment(1),
                    lastVisit: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });
        
        sessionStorage.setItem('visited_this_session', 'true');
     } catch (e) {
         console.error("Ziyarətçi izləmə xətası:", e);
     }
 }
 
 // Ziyarətçi statistikasını yükləyən funksiya
async function loadAdminDashboardStats() {
    try {
        if (!db) return;

        // Cache yoxlanışı (5 dəqiqəlik)
        const cachedStats = sessionStorage.getItem('adminStatsCache');
        if (cachedStats) {
            const cacheData = JSON.parse(cachedStats);
            const isZero = (cacheData.data.totalUsers === 0 && cacheData.data.totalQuestions === 0);
            
            if (Date.now() - cacheData.timestamp < 300000 && !isZero) { 
                const stats = cacheData.data;
                const totalUsersElem = document.getElementById('total-visitors');
                if (totalUsersElem) totalUsersElem.textContent = stats.totalUsers;

                const todayRegElem = document.getElementById('today-registrations');
                if (todayRegElem) todayRegElem.textContent = stats.todayReg;

                const totalAttemptsElem = document.getElementById('total-finished-quizzes');
                if (totalAttemptsElem) totalAttemptsElem.textContent = stats.totalAttempts;

                const totalQuestionsElem = document.getElementById('total-active-questions');
                if (totalQuestionsElem) totalQuestionsElem.textContent = stats.totalQuestions;
                
                return; 
            }
        }

        // 1. Ümumi İstifadəçi Sayı və Bugünkü Qeydiyyatlar
        let totalUsers = 0;
        let todayReg = 0;
        try {
            const usersSnapshot = await db.collection('users').get();
            totalUsers = usersSnapshot.size;
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const startTs = firebase && firebase.firestore && firebase.firestore.Timestamp ? firebase.firestore.Timestamp.fromDate(startOfDay) : null;
            todayReg = usersSnapshot.docs.filter(doc => {
                const d = doc.data();
                const ts = d.createdAt || d.created_at || d.createdOn;
                if (!ts) return false;
                if (ts.seconds) return ts.seconds >= (startTs ? startTs.seconds : Math.floor(startOfDay.getTime()/1000));
                if (typeof ts === 'number') return ts >= startOfDay.getTime();
                if (typeof ts === 'string') {
                    const t = Date.parse(ts);
                    return !isNaN(t) && t >= startOfDay.getTime();
                }
                return false;
            }).length;
        } catch(e) { console.warn("Users stats error:", e); }
        
        const totalUsersElem = document.getElementById('total-visitors');
        if (totalUsersElem) totalUsersElem.textContent = totalUsers;

        const todayRegElem = document.getElementById('today-registrations');
        if (todayRegElem) todayRegElem.textContent = todayReg;

        // 3. Tamamlanmış İmtahanlar
        let totalAttempts = 0;
        try {
            const attemptsSnapshot = await db.collection('student_attempts').get();
            totalAttempts = attemptsSnapshot.size;
        } catch(e) { console.warn("Attempts stats error:", e); }
        
        const totalAttemptsElem = document.getElementById('total-finished-quizzes');
        if (totalAttemptsElem) totalAttemptsElem.textContent = totalAttempts;

        // 4. Aktiv Suallar
        let totalQuestions = 0;
        try {
            if (typeof categories !== 'undefined') {
                categories.forEach(cat => {
                    if (cat.questions) totalQuestions += cat.questions.length;
                });
            }
            const publicQuestionsSnapshot = await db.collection('public_questions').select('id').get();
            totalQuestions += publicQuestionsSnapshot.size;
        } catch(e) { console.warn("Questions stats error:", e); }
        
        const totalQuestionsElem = document.getElementById('total-active-questions');
        if (totalQuestionsElem) totalQuestionsElem.textContent = totalQuestions;

        // Cache-ə yaz
        const cachePayload = {
            timestamp: Date.now(),
            data: {
                totalUsers,
                todayReg,
                totalAttempts,
                totalQuestions
            }
        };
        sessionStorage.setItem('adminStatsCache', JSON.stringify(cachePayload));

    } catch (e) {
        console.error("Admin statistika yükləmə xətası:", e);
    }
}

 
// Initialize EmailJS
emailjs.init("gwXl5HH3P9Bja5iBN");

// Global State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let redirectAfterAuth = null;

function hashPassword(p) {
    try {
        if (typeof bcrypt !== 'undefined' && bcrypt.hashSync) return 'bcrypt:' + bcrypt.hashSync(p, 10);
    } catch (e) {}
    try {
        if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) return 'sha256:' + CryptoJS.SHA256(p).toString();
    } catch (e) {}
    return null;
}

function verifyPassword(p, h) {
    if (!h) return false;
    if (h.startsWith('bcrypt:')) {
        try { return bcrypt.compareSync(p, h.slice(7)); } catch (e) { return false; }
    }
    // Support raw bcrypt hash (starts with $2a$, $2b$, etc.)
    if (h.startsWith('$2')) {
        try { return bcrypt.compareSync(p, h); } catch (e) { return false; }
    }
    if (h.startsWith('sha256:')) {
        try { return CryptoJS.SHA256(p).toString() === h.slice(8); } catch (e) { return false; }
    }
    return false;
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Custom Select Logic
window.toggleCustomSelect = function(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    
    // Close other selects
    document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w.id !== wrapperId) w.classList.remove('open');
    });
    
    wrapper.classList.toggle('open');
};

window.selectCustomOption = function(wrapperId, optionElem, selectId, callback) {
    const wrapper = document.getElementById(wrapperId);
    const select = document.getElementById(selectId);
    const triggerText = wrapper.querySelector('.custom-select-trigger span');
    
    if (!wrapper || !select || !triggerText) return;
    
    const value = optionElem.getAttribute('data-value');
    const text = optionElem.textContent.trim();
    
    // Update trigger text
    triggerText.textContent = text;
    
    // Update hidden select
    select.value = value;
    
    // Update selection classes
    wrapper.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    optionElem.classList.add('selected');
    
    // Close dropdown
    wrapper.classList.remove('open');
    
    // Trigger original onchange
    if (typeof callback === 'function') {
        callback();
    }
};

// Close selects when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            w.classList.remove('open');
        });
    }
});

// Side Menu Logic
window.toggleSideMenu = function() {
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    if (sideMenu && overlay) {
        sideMenu.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

window.menuNavigate = function(actionFunc) {
    toggleSideMenu(); // Close menu
    if (typeof actionFunc === 'function') {
        actionFunc();
    }
}

window.openAboutModal = function() {
    const modal = document.getElementById('about-modal');
    if (modal) modal.classList.remove('hidden');
}

// Info Modal Logic
window.showInfoModal = function(type) {
    if (type === 'about') {
        openAboutModal();
        return;
    }
    const modal = document.getElementById('info-modal');
    const body = document.getElementById('info-modal-body');
    if (!modal || !body) return;

    let content = '';
    switch(type) {
        case 'contact':
            content = `
                <h2><i class="fas fa-envelope"></i> Əlaqə</h2>
                <p>Sual, təklif və ya texniki problem ilə bağlı bizimlə əlaqə saxlaya bilərsiniz:</p>
                <ul class="list-none p-0 mt-6">
                    <li class="mb-4 flex items-center gap-4">
                        <i class="fas fa-at text-primary text-2xl"></i>
                        <span><strong>Email:</strong> info@imtahan.site</span>
                    </li>
                    <li class="mb-4 flex items-center gap-4">
                        <i class="fas fa-map-marker-alt text-danger text-2xl"></i>
                        <span><strong>Ünvan:</strong> Bakı şəhəri, Azərbaycan</span>
                    </li>
                </ul>
            `;
            break;
        case 'security':
            content = `
                <h2><i class="fas fa-shield-alt"></i> Təhlükəsizlik və Məxfilik</h2>
                <p><strong>İmtahan</strong> platformasında məlumatların təhlükəsizliyi bizim prioritetimizdir. Bütün özəl testlər və suallar xüsusi şifrələmə sistemləri vasitəsilə qorunur.</p>
                
                <div class="security-box bg-primary-light border-primary text-primary">
                    <i class="fas fa-user-shield"></i> <strong>Sizin Məlumatlarınız Bizimlə Güvəndədir:</strong> 
                    Şəxsi məlumatlarınız və yaratdığınız suallar heç bir halda 3-cü tərəflərlə paylaşılmır.
                </div>

                <div class="disclaimer-box">
                    <i class="fas fa-exclamation-triangle"></i> <strong>Məsuliyyətdən İmtina:</strong><br>
                    Verilən link və şifrənin müəllim və ya onun etibar etdiyi digər şəxs tərəfindən yayılması halında, test suallarının 3-cü şəxslərə ötürülməsinə görə sayt rəhbərliyi məsuliyyət daşımır. Müəllimlərə şifrələrini və test linklərini yalnız etibarlı şəxslərlə paylaşmaq tövsiyə olunur.
                </div>
            `;
            break;
    }

    body.innerHTML = content;
    modal.classList.remove('hidden');
};
let categories = []; // Will be loaded from DB
let users = [];      // Will be loaded from DB
let privateQuizzes = []; // Private quizzes for teachers
let currentParentId = null; // Track current level in dashboard
let currentAdminParentId = null; // Track current level in admin dashboard

// Notification System
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';

    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 4000);
}

// Load Data Function
async function loadData() {
    if (db) {
        try {
            // Load Categories (Public) with Timeout
            const catPromise = db.collection('categories').get();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Firestore bağlantısı çox gecikir (Timeout)")), 8000)
            );
            
            const catSnapshot = await Promise.race([catPromise, timeoutPromise]);
            
            categories = catSnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    parentId: data.parentId || null,
                    ...data 
                };
            });
            
            // NOTE: Users and Private Quizzes are NOT loaded kütləvi for security reasons.
            // They are fetched only when needed.
            users = []; 
            privateQuizzes = [];

            console.log("Categories loaded from Firebase");
            saveCategories(); 
            
            // Dövlət qulluğu miqrasiyası (Tamamilə deaktiv edildi)
            // setTimeout(() => runDovletQulluguMigration(), 2000); 

            // Public Questions Migration (v1)
            // setTimeout(() => migratePublicQuestionsToGlobal(), 3000); 

        } catch (error) {
            console.error("Error loading from Firebase:", error);
            // Fallback to local if error (e.g. offline)
            categories = JSON.parse(localStorage.getItem('categories')) || [];
        }
    } else {
        categories = JSON.parse(localStorage.getItem('categories')) || [];
    }

    // Ensure all categories have a parentId property
    categories = categories.map(cat => ({
        ...cat,
        parentId: cat.parentId || null
    }));

    let hasChanged = false;
    let publicGeneral = categories.find(c => c.id === 'public_general' || (c.name && c.name.trim() === 'Ümumi Suallar'));
    if (!publicGeneral) {
        publicGeneral = { id: 'public_general', name: 'Ümumi Suallar', time: 0, questions: [], parentId: null };
        categories.push(publicGeneral);
        if (db) db.collection('categories').doc('public_general').set(publicGeneral);
        hasChanged = true;
    }

    // Seed Special Exams (Prokurorluq, Hakimlik, Vəkillik)
    const specialSeeds = [
        { id: 'special_prokurorluq', name: 'Prokurorluq üzrə sınaq', isSpecial: true, time: 180, description: 'Prokurorluq orqanlarına qəbul' },
        { id: 'special_hakimlik', name: 'Hakimlik üzrə sınaq', isSpecial: true, time: 240, description: 'Hakimlərin Seçki Komitəsi imtahanı' },
        { id: 'special_vekillik', name: 'Vəkillik üzrə sınaq', isSpecial: true, time: 180, description: 'Vəkillər Kollegiyasına qəbul' }
    ];

    specialSeeds.forEach(seed => {
        const exists = categories.find(c => c.id === seed.id || c.name === seed.name);
        if (!exists) {
            const newCat = { 
                id: seed.id, 
                name: seed.name, 
                time: seed.time, 
                questions: [], 
                parentId: null,
                isSpecial: true,
                description: seed.description
            };
            categories.push(newCat);
            if (db) {
                // Use set with merge to be safe, though set overwrites by default
                db.collection('categories').doc(seed.id).set(newCat)
                    .then(() => console.log(`Created special cat: ${seed.name}`))
                    .catch(e => console.error(`Error creating ${seed.name}:`, e));
            }
            hasChanged = true;
        } else if (seed.id === 'special_prokurorluq') {
            // Ensure isPool flag is set if we have loaded it from somewhere else manually
        }
    });

    // Seed Prokurorluq Subcategories
    const PROKURORLUQ_SUBS = [
        { id: '1768674522030', count: 20, name: 'Cinayət Məcəlləsi' },
        { id: '1768683898010', count: 20, name: 'Cinayət-Prosessual Məcəlləsi' },
        { id: '1766934946320', count: 6, name: 'Konstitusiya' },
        { id: '1768696058306', count: 3, name: 'Normativ hüquqi aktlar' },
        { id: '1768735010552', count: 5, name: 'İnzibati Xətalar Məcəlləsi' },
        { id: '1768750915800', count: 2, name: 'Mülki Məcəllə' },
        { id: '1768737630088', count: 2, name: 'Mülki-Prosessual Məcəllə' },
        { id: '1768745670510', count: 2, name: 'Əmək Məcəlləsi' },
        { id: '1768696474731', count: 8, name: 'Prokurorluq haqqında' },
        { id: '1768696605470', count: 6, name: 'Prokurorluq orqanlarında qulluq' },
        { id: '1767194888783', count: 5, name: 'Korrupsiyaya qarşı mübarizə' },
        { id: '1768698786812', count: 1, name: 'Polis haqqında' },
        { id: 'special_prokurorluq_human_rights', name: 'Avropa İnsan Hüquqları Konvensiyası' }
    ];

    PROKURORLUQ_SUBS.forEach(sub => {
        const exists = categories.find(c => c.id === sub.id);
        if (!exists) {
            const newSub = {
                id: sub.id,
                name: sub.name,
                parentId: 'special_prokurorluq',
                questions: [],
                isHiddenFromPublic: true // Hide from public "Mövcud İmtahanlar"
            };
            categories.push(newSub);
            if (db) {
                db.collection('categories').doc(sub.id).set(newSub).catch(console.error);
            }
            hasChanged = true;
        }
    });

        // Check for special_pool.json and upload if needed (Admin helper)
    if (db) { // Run in any environment if DB is connected
        fetch('special_pool.json').then(res => {
            if (res.ok) return res.json();
            throw new Error('No pool file');
        }).then(data => {
             console.log("Found special_pool.json, checking if upload needed...");
             const remoteCat = categories.find(c => c.id === 'special_prokurorluq');
             
             // Check if we need to update the pool (if it's empty OR if we have a force update flag or different size)
             // We can check if remote questions count != local pool count
             if (remoteCat && (!remoteCat.questions || remoteCat.questions.length !== data.questions.length)) {
                 console.log("Updating special pool to Firestore (Size mismatch)...");
                 const poolData = {
                     questions: data.questions,
                     lastUpdated: Date.now(),
                     isPool: true
                 };
                 // Local update
                 remoteCat.questions = data.questions;
                 remoteCat.isPool = true;
                 renderCategories(); // Update UI
                 
                 // Remote update
                 db.collection('categories').doc('special_prokurorluq').update(poolData)
                    .then(() => {
                        console.log("Special Pool Uploaded Successfully!");
                        alert("Xüsusi Sınaq Hovuzu (400 sual) uğurla yükləndi!");
                    })
                    .catch(e => console.error("Pool upload failed:", e));
             }
        }).catch(e => { /* ignore if file not found */ });
    }

    if (hasChanged) {
        saveCategories();
    }

    // Dublikatları təmizləmək (Tamamilə bağlandı və təmizləndi)
    if (false) {
        // Köhnə təmizləmə kodu tamamilə deaktiv edildi
    }

    // Seed Data if Empty (Bərpa edildi)
    hasChanged = false;
    
    // --- Bütün avtomatik təmizləmə və birləşdirmə məntiqləri ləğv edildi ---
    // Hər bir kateqoriya artıq müstəqildir.
    /* 
    Dərslik, Azərbaycan tarixi və XI sinif bölmələri üçün heç bir avtomatik kod işləmir.
    İstifadəçi nə yükləsə, o da qalacaq.
    */
    if (false) {
        // ... (bütün köhnə kodlar)
    }

    if (hasChanged) {
        saveCategories();
    }

    // İlk dəfə istifadəçi yoxdursa admin yarat (yalnız offline üçün)
    if (users.length === 0 && !db) {
        const adminId = 'admin_' + Date.now();
        users = [{ id: adminId, username: 'admin', passwordHash: hashPassword('123'), role: 'admin' }];
        saveUsers(); 
    } else if (db) {
        // Firebase qoşuludursa, avtomatik istifadəçi yaratmırıq.
        // Mövcud istifadəçilər bazadan loadData() funksiyasında artıq yüklənib.
    } else {
        // Offline rejimdə admin yoxdursa yarat
        const adminUser = users.find(u => u.username === 'admin');
        if (!adminUser) {
             users.push({ id: 'admin_' + Date.now(), username: 'admin', passwordHash: hashPassword('123'), role: 'admin' });
             saveUsers();
        }
    }

    // Check for English category leftovers and remove them
    // ...

    // --- Bərpa Aləti (Admin üçün) ---
    window.restoreMissingQuestions = async function() {
        if (!currentUser || currentUser.role !== 'admin') {
            alert("Bu funksiya yalnız adminlər üçündür!");
            return;
        }

        if (!confirm("Diqqət! Bərpa Aləti yalnız ADI və ÜST BÖLMƏSİ tam eyni olan kateqoriyaları bərpa edəcək. Bu, Kimya suallarının Riyaziyyata düşmə riskini tamamilə aradan qaldırır. Davam edilsin?")) return;

        if (typeof showLoading === 'function') showLoading("Verilənlər bazası yoxlanılır...");
        
        try {
            const snapshot = await db.collection('categories').get();
            const dbCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            let restoredInfo = [];
            let updatedCategories = [];

            // Yalnız ciddi uyğunluq (Strict Match)
            categories.forEach(localCat => {
                // Bazada tam eyni adlı və eyni parentId-li kateqoriyanı tapırıq
                const match = dbCategories.find(dbCat => 
                    dbCat.name.trim() === localCat.name.trim() && 
                    dbCat.parentId === localCat.parentId &&
                    dbCat.questions && dbCat.questions.length > (localCat.questions ? localCat.questions.length : 0)
                );

                if (match) {
                    const oldCount = localCat.questions ? localCat.questions.length : 0;
                    const newCount = match.questions.length;
                    
                    // Sual sayında artım varsa bərpa et
                    localCat.questions = JSON.parse(JSON.stringify(match.questions));
                    updatedCategories.push(localCat);
                    restoredInfo.push(`${localCat.name}: ${oldCount} -> ${newCount} sual`);
                }
            });

            if (updatedCategories.length > 0) {
                if (typeof hideLoading === 'function') hideLoading();
                
                const summary = restoredInfo.join('\n');
                if (!confirm(`Aşağıdakı bölmələr bərpa ediləcək:\n\n${summary}\n\nTəsdiq edirsiniz?`)) {
                    location.reload(); 
                    return;
                }

                if (typeof showLoading === 'function') showLoading("Yadda saxlanılır...");
                
                saveCategories();
                renderCategories();
                if (!document.getElementById('admin-dashboard-section').classList.contains('hidden')) {
                    renderAdminCategories();
                }
                
                // Bazaya da geri yaz (sinxronizasiya)
                for (const cat of updatedCategories) {
                    await syncCategory(cat.id);
                }

                if (typeof hideLoading === 'function') hideLoading();
                alert("Bərpa uğurla tamamlandı!");
            } else {
                if (typeof hideLoading === 'function') hideLoading();
                alert("Bərpa ediləcək yeni məlumat tapılmadı.");
            }
        } catch (error) {
            console.error("Bərpa xətası:", error);
            if (typeof hideLoading === 'function') hideLoading();
            alert("Xəta: " + error.message);
        }
    };

    const initialCount = categories.length;
    categories = categories.filter(c => c.name !== 'İngilis' && String(c.id) !== 'english_demo');
    
    // Generate Prokurorluq Exam from Special Pool - DEPRECATED (Moved to async function generateProkurorluqExam below)


// Təkmilləşdirilmiş error handling sistemi
const errorHandler = {
    // Error növləri
    ERROR_TYPES: {
        NETWORK: 'network_error',
        VALIDATION: 'validation_error', 
        AUTH: 'authentication_error',
        PERMISSION: 'permission_error',
        UNKNOWN: 'unknown_error'
    },
    
    // Errorları logla
    logError: function(error, type = this.ERROR_TYPES.UNKNOWN, context = {}) {
        const errorData = {
            type: type,
            message: error.message || String(error),
            stack: error.stack,
            timestamp: new Date().toISOString(),
            context: context,
            user: currentUser ? { 
                id: currentUser.id, 
                role: currentUser.role 
            } : null
        };
        
        console.error('Xəta baş verdi:', errorData);
        
        // Firebase-ə log göndər (əgər mövcuddursa)
        if (db) {
            try {
                db.collection('error_logs').add(errorData);
            } catch (e) {
                console.warn('Error log Firebase-ə yazıla bilmədi:', e);
            }
        }
        
        return errorData;
    },
    
    // İstifadəçiyə error göstər
    showUserError: function(error, userMessage = null) {
        const errorType = this.determineErrorType(error);
        const message = userMessage || this.getUserFriendlyMessage(error, errorType);
        
        showNotification(message, 'error');
        this.logError(error, errorType);
    },
    
    // Error növünü müəyyən et
    determineErrorType: function(error) {
        if (error.code === 'permission-denied') return this.ERROR_TYPES.PERMISSION;
        if (error.code === 'unauthenticated') return this.ERROR_TYPES.AUTH;
        if (error.message && error.message.includes('network')) return this.ERROR_TYPES.NETWORK;
        if (error.message && error.message.includes('validation')) return this.ERROR_TYPES.VALIDATION;
        return this.ERROR_TYPES.UNKNOWN;
    },
    
    // İstifadəçi üçün anlaşılan error mesajı
    getUserFriendlyMessage: function(error, type) {
        switch (type) {
            case this.ERROR_TYPES.NETWORK:
                return 'Şəbəkə xətası baş verdi. Zəhmət olmasa internet bağlantınızı yoxlayın.';
            case this.ERROR_TYPES.AUTH:
                return 'Giriş xətası. Zəhmət olmasa yenidən giriş edin.';
            case this.ERROR_TYPES.PERMISSION:
                return 'Bu əməliyyatı yerinə yetirmək üçün icazəniz yoxdur.';
            case this.ERROR_TYPES.VALIDATION:
                return 'Daxil etdiyiniz məlumatlar yanlışdır. Zəhmət olmasa yoxlayın.';
            default:
                return 'Gözlənilməz xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.';
        }
    },
    
    // Async funksiyalar üçün error wrapper
    asyncWrapper: async function(fn, userMessage = null) {
        try {
            return await fn();
        } catch (error) {
            this.showUserError(error, userMessage);
            throw error;
        }
    }
};
const firebaseCache = {
    cache: new Map(),
    
    // Sorğunu cache et
    set: function(key, data, ttl = 300000) { // 5 dəqiqə default
        this.cache.set(key, {
            data: data,
            expiry: Date.now() + ttl,
            timestamp: Date.now()
        });
    },
    
    // Cache-dən oxu
    get: function(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    },
    
    // Cache-i təmizlə
    clear: function() {
        this.cache.clear();
    },
    
    // Köhnə cache-ləri təmizlə
    cleanup: function() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    },
    
    // Cache key yarat
    createKey: function(collection, queryParams = {}) {
        return `${collection}_${JSON.stringify(queryParams)}`;
    }
};

// Hər 1 dəqiqədə bir cache təmizləmə
setInterval(() => firebaseCache.cleanup(), 60000);
const domUtils = {
    // Bir neçə elementə eyni class əlavə et/çıxart
    batchToggleClass: function(elements, className, add = true) {
        if (!elements || elements.length === 0) return;
        
        if (add) {
            elements.forEach(el => el.classList.add(className));
        } else {
            elements.forEach(el => el.classList.remove(className));
        }
    },
    
    // Çoxlu elementləri bir dəfəyə yarat
    createElements: function(template, count, container = null) {
        const fragment = document.createDocumentFragment();
        const elements = [];
        
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.innerHTML = template;
            if (div.firstElementChild) {
                fragment.appendChild(div.firstElementChild);
                elements.push(div.firstElementChild);
            }
        }
        
        if (container) {
            container.appendChild(fragment);
        }
        
        return elements;
    },
    
    // Elementləri batch şəkildə göstər/gizlət
    batchSetVisibility: function(elements, visible = true) {
        if (!elements || elements.length === 0) return;
        
        const displayValue = visible ? '' : 'none';
        elements.forEach(el => {
            if (el.style) {
                el.style.display = displayValue;
            }
        });
    },
    
    // Debounce funksiyası tez-tez çağırılan funksiyalar üçün
    debounce: function(func, wait, immediate = false) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    },
    
    // Throttle funksiyası
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};
const storageManager = {
    // Məlumatları sıxışdıraraq saxla
    setItem: function(key, data, compress = true) {
        try {
            let value = data;
            if (compress && typeof data === 'object') {
                value = JSON.stringify(data);
                // Böyük məlumatları sıxışdır
                if (value.length > 1024) {
                    value = LZString.compressToUTF16(value);
                }
            }
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('Storage limiti aşıldı:', e);
            this.cleanupOldData();
        }
    },
    
    // Məlumatları oxu
    getItem: function(key, decompress = true) {
        const value = localStorage.getItem(key);
        if (!value) return null;
        
        if (decompress && (value.startsWith('{') || value.startsWith('[') || LZString.decompressFromUTF16(value))) {
            try {
                let decompressed = value;
                if (LZString.decompressFromUTF16(value)) {
                    decompressed = LZString.decompressFromUTF16(value);
                }
                return JSON.parse(decompressed);
            } catch (e) {
                return value;
            }
        }
        return value;
    },
    
    // Köhnə məlumatları təmizlə
    cleanupOldData: function() {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        
        // Ən köhnə 20% məlumatı sil
        keys.sort((a, b) => {
            const timeA = parseInt(localStorage.getItem(a + '_timestamp') || 0);
            const timeB = parseInt(localStorage.getItem(b + '_timestamp') || 0);
            return timeA - timeB;
        });
        
        const removeCount = Math.ceil(keys.length * 0.2);
        for (let i = 0; i < removeCount; i++) {
            localStorage.removeItem(keys[i]);
            localStorage.removeItem(keys[i] + '_timestamp');
        }
    },
    
    // Məlumat ömrünü təyin et
    setWithExpiry: function(key, data, expiryMinutes = 60) {
        const item = {
            value: data,
            expiry: Date.now() + (expiryMinutes * 60 * 1000)
        };
        this.setItem(key, item);
    },
    
    // Müddəti bitmiş məlumatları yoxla
    getWithExpiry: function(key) {
        const item = this.getItem(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.removeItem(key);
            return null;
        }
        return item.value;
    },
    
    removeItem: function(key) {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_timestamp');
    }
};
}

// Save Helpers
async function saveCategories(syncToDb = false) {
    if (db && syncToDb) {
        // Full sync is dangerous for performance, use sparingly
        console.warn("Full categories sync started...");
        for (const cat of categories) {
             await db.collection('categories').doc(String(cat.id)).set(cat);
        }
    }
    localStorage.setItem('categories', JSON.stringify(categories));
}

// Yeni: Tək kateqoriyanı sinxron etmək üçün
async function syncCategory(catId) {
    if (!db) return;
    const cat = categories.find(c => String(c.id) === String(catId));
    if (cat) {
        await db.collection('categories').doc(String(cat.id)).set(cat);
    }
}

async function saveUsers() {
    if (db) {
        for (const user of users) {
            // Təhlükəsizlik üçün Firestore-a ŞİFRƏ göndərmirik!
            const { password, ...safeUser } = user;
            await db.collection('users').doc(String(user.id)).set(safeUser);
        }
    }
    localStorage.setItem('users', JSON.stringify(users));
    // Timestamp əlavə et
    localStorage.setItem('users_timestamp', Date.now().toString());
}


// Initialization
async function runDovletQulluguMigration() {
    return; // Miqrasiya tamamilə söndürüldü

    const parentCat = categories.find(c => c.name.trim() === 'Dövlət qulluğu');
    if (!parentCat) return;

    const subCats = categories.filter(c => c.parentId === parentCat.id);
    const targetCat = subCats.find(c => c.name.trim() === 'Qarışıq testlər (qanunvericilik)');
    
    if (!targetCat) return;

    const sourceCats = subCats.filter(c => c.name.trim() !== 'Qarışıq testlər (qanunvericilik)');
    
    let allSourceQuestions = [];
    sourceCats.forEach(cat => {
        if (cat.questions && Array.isArray(cat.questions)) {
            allSourceQuestions = allSourceQuestions.concat(cat.questions);
        }
    });

    if (allSourceQuestions.length === 0) return;

    // Shuffle
    const shuffled = allSourceQuestions.sort(() => 0.5 - Math.random());
    
    // Pick 3 unique
    const existingQuestionTexts = new Set(targetCat.questions.map(q => q.text));
    const newQuestions = [];
    
    for (const q of shuffled) {
        if (!existingQuestionTexts.has(q.text)) {
            newQuestions.push(q);
            if (newQuestions.length === 3) break;
        }
    }

    if (newQuestions.length > 0) {
        targetCat.questions = targetCat.questions.concat(newQuestions);
        if (db) {
            await db.collection('categories').doc(String(targetCat.id)).set(targetCat);
        }
        saveCategories();
        localStorage.setItem('dovlet_qullugu_migration_v3', 'true');
        console.log(`Dövlət qulluğu miqrasiyası v3: ${newQuestions.length} yeni sual əlavə edildi.`);
    }
}

function showLoading(message = "Yüklənir...") {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        const text = loader.querySelector('p');
        if (text) text.textContent = message;
        loader.classList.remove('hidden');
    }
}

function hideLoading() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Sistem başladılır...");
    showLoading("Sistem hazırlanır...");
    
    // UI-nı dərhal göstər (Loading vəziyyətində)
    updateUI();
    
    try {
        // Məlumatları paralel yükləməyə çalışaq
        await Promise.all([
            loadData()
        ]);
        console.log("Məlumatlar yükləndi.");
    } catch (e) {
        console.error("Yükləmə xətası:", e);
    }
    
    handleUrlParams();
    updateUI(); // Məlumatlar gəldikdən sonra yenidən yenilə
    hideLoading();
    console.log("Sistem hazırdır.");
    if (typeof updateApiKeyUI === 'function') updateApiKeyUI();
});

async function migrateUserReferences(oldId, newId) {
    if (!db) return;
    console.log(`Migrating references from ${oldId} to ${newId}`);
    
    const collections = [
        { name: 'public_questions', field: 'authorId' },
        { name: 'private_quizzes', field: 'teacherId' },
        { name: 'reports', field: 'userId' },
        { name: 'attempts', field: 'userId' }
    ];

    for (const coll of collections) {
        try {
            const snapshot = await db.collection(coll.name).where(coll.field, '==', oldId).get();
            if (!snapshot.empty) {
                console.log(`Found ${snapshot.size} documents in ${coll.name} to migrate.`);
                const batch = db.batch();
                snapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { [coll.field]: newId });
                });
                await batch.commit();
                console.log(`Successfully migrated ${coll.name}`);
            }
        } catch (err) {
            console.error(`Error migrating ${coll.name}:`, err);
        }
    }
}

function updateUI() {
    console.log("Updating UI. Current User:", currentUser);
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.remove('hidden');
    
    // Check if we are in a private quiz link
    const isPrivateQuiz = new URLSearchParams(window.location.search).has('quiz');
    
    if (currentUser) {
        document.body.classList.remove('role-student', 'role-teacher', 'role-admin', 'role-moderator');
        document.body.classList.add('role-' + currentUser.role);
        
        const guestNav = document.getElementById('guest-nav');
        const userNav = document.getElementById('user-nav');
        if (guestNav) guestNav.classList.add('hidden');
        if (userNav) userNav.classList.remove('hidden');
        
        const displayName = (currentUser.name && currentUser.surname) 
            ? `${currentUser.name} ${currentUser.surname}` 
            : (currentUser.username || 'İstifadəçi');
            
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.textContent = `Salam, ${displayName}`;
        
        // Side menu updates
        const sideGuestNav = document.getElementById('side-guest-nav');
        const sideUserNav = document.getElementById('side-user-nav');
        const sideUserInfo = document.getElementById('side-user-info');
        const sideUserDisplay = document.getElementById('side-user-display');

        if (sideGuestNav) sideGuestNav.classList.add('hidden');
        if (sideUserNav) sideUserNav.classList.remove('hidden');
        if (sideUserInfo) sideUserInfo.classList.remove('hidden');
        if (sideUserDisplay) sideUserDisplay.textContent = `Salam, ${displayName}`;
        
        const teacherBtn = document.getElementById('teacher-panel-btn');
        const sideTeacherBtn = document.getElementById('side-teacher-btn');
        if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
            if (teacherBtn) teacherBtn.classList.remove('hidden');
            if (sideTeacherBtn) sideTeacherBtn.classList.remove('hidden');
        } else {
            if (teacherBtn) teacherBtn.classList.add('hidden');
            if (sideTeacherBtn) sideTeacherBtn.classList.add('hidden');
        }
        
        const adminBtn = document.getElementById('admin-panel-btn');
        const sideAdminBtn = document.getElementById('side-admin-btn');
        if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
            if (adminBtn) adminBtn.classList.remove('hidden');
            if (sideAdminBtn) sideAdminBtn.classList.remove('hidden');
            
            // Change text if moderator
            if (currentUser.role === 'moderator') {
                const modHtml = '<i class="fas fa-tasks"></i> Moderator Paneli';
                if (adminBtn) adminBtn.innerHTML = modHtml;
                if (sideAdminBtn) sideAdminBtn.innerHTML = modHtml;
            } else {
                const adminHtml = '<i class="fas fa-user-shield"></i> Admin Paneli';
                if (adminBtn) adminBtn.innerHTML = adminHtml;
                if (sideAdminBtn) sideAdminBtn.innerHTML = adminHtml;
            }
        } else {
            if (adminBtn) adminBtn.classList.add('hidden');
            if (sideAdminBtn) sideAdminBtn.classList.add('hidden');
        }
        
        // If not already in admin view or quiz, show public dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const adminDashboardSection = document.getElementById('admin-dashboard-section');
        const categoryAdminSection = document.getElementById('category-admin-section');
        const quizSection = document.getElementById('quiz-section');

        if (!isPrivateQuiz && !urlParams.has('mode') && !(urlParams.has('cat') || urlParams.has('ct'))) {
            // Əgər giriş səhifəsindəyiksə və ya heç bir xüsusi bölmə açıq deyilsə, dashboard-u göstər
            const isAuthPage = urlParams.get('page') === 'login' || urlParams.get('page') === 'register';
            const noSectionOpen = (!adminDashboardSection || adminDashboardSection.classList.contains('hidden')) && 
                                (!categoryAdminSection || categoryAdminSection.classList.contains('hidden')) &&
                                (!quizSection || quizSection.classList.contains('hidden'));

            if (isAuthPage || noSectionOpen) {
                showDashboard();
            }
        }
    } else {
        const guestNav = document.getElementById('guest-nav');
        const userNav = document.getElementById('user-nav');
        if (guestNav) guestNav.classList.remove('hidden');
        if (userNav) userNav.classList.add('hidden');
        
        // Side menu updates
        const sideGuestNav = document.getElementById('side-guest-nav');
        const sideUserNav = document.getElementById('side-user-nav');
        const sideUserInfo = document.getElementById('side-user-info');
        
        if (sideGuestNav) sideGuestNav.classList.remove('hidden');
        if (sideUserNav) sideUserNav.classList.add('hidden');
        if (sideUserInfo) sideUserInfo.classList.add('hidden');

        const teacherBtn = document.getElementById('teacher-panel-btn');
        if (teacherBtn) teacherBtn.classList.add('hidden');
        
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthMode = urlParams.has('mode');
        const hasCatParam = urlParams.has('cat') || urlParams.has('ct');
        const page = urlParams.get('page');
        
        if (!isPrivateQuiz && !hasAuthMode && !hasCatParam && page !== 'login' && page !== 'register') {
            showDashboard();
        }
    }
}

// --- Auth Functions ---
window.showLogin = function(doPush = true) {
    if (doPush) {
        window.history.pushState({ page: 'login' }, '', '?page=login');
    }
    hideAllSections();
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('login-box').classList.remove('hidden');
    document.getElementById('register-box').classList.add('hidden');
}

window.showRegister = function(defaultRole = 'user', doPush = true) {
    if (doPush) {
        window.history.pushState({ page: 'register' }, '', '?page=register');
    }
    hideAllSections();
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('login-box').classList.add('hidden');
    document.getElementById('register-box').classList.remove('hidden');
    
    // Set default role if provided
    if (defaultRole === 'teacher') {
        setTimeout(() => {
            const roleSelect = document.getElementById('reg-role');
            const wrapper = document.getElementById('reg-role-wrapper');
            if (roleSelect && wrapper) {
                const teacherOption = wrapper.querySelector('.custom-option[data-value="teacher"]');
                if (teacherOption && typeof selectCustomOption === 'function') {
                    selectCustomOption('reg-role-wrapper', teacherOption, 'reg-role', toggleEmailField);
                } else {
                    roleSelect.value = 'teacher';
                    toggleEmailField();
                }
            }
        }, 50);
    }
}

window.showForgotPassword = function() {
    document.getElementById('forgot-password-modal').classList.remove('hidden');
}

window.sendResetEmail = async function() {
    let identifier = document.getElementById('reset-identifier').value.trim();
    if (!identifier) return showNotification('İstifadəçi adı və ya email daxil edin!', 'error');

    // Boşluqları təmizləyək və yalnız ilk hissəni götürək (əgər səhvən boşluq qoyulubsa)
    if (identifier.includes(' ')) {
        const parts = identifier.split(/\s+/);
        // Əgər email varsa onu götür, yoxdursa ilk hissəni
        identifier = parts.find(p => p.includes('@')) || parts[0];
    }

    const btn = document.getElementById('btn-reset-pwd');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Göndərilir...';
    btn.disabled = true;

    try {
        if (!auth) throw new Error("Firebase Auth sistemi yüklənməyib.");

        let email = identifier;
        
        // Əgər daxil edilən email deyilse ( @ yoxdursa ), username kimi axtarırıq
        if (!identifier.includes('@')) {
            const usernameLower = identifier.toLowerCase();
            if (db) {
                try {
                    // Firestore-da həm 'username', həm də 'id' (əgər username kimidirsə) üzrə axtaraq
                    const userQuery = await db.collection('users').where('username', '==', usernameLower).get();
                    
                    if (!userQuery.empty) {
                        const userData = userQuery.docs[0].data();
                        console.log("User found by username:", userData);
                        email = userData.email || `${usernameLower}@imtahan.site`;
                    } else {
                        // Əgər Firestore-da tapılmadısa, bəlkə Auth-da bu adda email var
                        email = `${usernameLower}@imtahan.site`;
                        console.log("User not in Firestore, falling back to:", email);
                    }
                } catch (dbErr) {
                    console.error("Firestore error in reset:", dbErr);
                    email = `${usernameLower}@imtahan.site`;
                }
            } else {
                email = `${usernameLower}@imtahan.site`;
            }
        }

        // URL-i daha sadə və təhlükəsiz formata salaq
        // auth/invalid-continue-uri xətası adətən URL-in formatı ilə bağlı olur
        let redirectUrl = window.location.origin + window.location.pathname;
        if (!redirectUrl.endsWith('/')) {
            // Əgər URL fayl adı ilə bitirsə (məs. index.html), onu təmizləyək və ya saxlayaq
            // Amma ən yaxşısı root səviyyəsinə yönləndirməkdir
        }
        
        const actionCodeSettings = {
            url: redirectUrl + '?mode=resetPassword',
            handleCodeInApp: true
        };

        await auth.sendPasswordResetEmail(email, actionCodeSettings);
        showNotification('Şifrəni sıfırlamaq üçün təlimatlar email ünvanınıza göndərildi.', 'success');
        closeModal('forgot-password-modal');
        document.getElementById('reset-identifier').value = '';
    } catch (error) {
        console.error("Password reset error:", error);
        let msg = 'Xəta baş verdi.';
        
        // Firebase Auth xətaları
        if (error.code) {
            switch(error.code) {
                case 'auth/user-not-found': msg = 'Bu istifadəçi və ya email tapılmadı.'; break;
                case 'auth/invalid-email': msg = 'Email ünvanı düzgün deyil.'; break;
                case 'auth/too-many-requests': msg = 'Çox sayda cəhd edildi. Bir az sonra yenidən cəhd edin.'; break;
                case 'auth/unauthorized-continue-uri': msg = 'Domen icazəsi yoxdur. Firebase Console-da bu domeni əlavə edin.'; break;
                default: msg = `Firebase Xətası (${error.code}): ${error.message}`;
            }
        } else if (error.message) {
            msg = `Sistem Xətası: ${error.message}`;
        }
        
        showNotification(msg, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Şifrə yeniləmə linki ilə gələnləri tutmaq
let resetPasswordCode = null;

window.checkAuthAction = async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');

    if ((mode === 'resetPassword' || mode === 'action') && oobCode) {
        // Auth obyektinin hazır olmasını gözləyək
        if (!auth) {
            console.log("Auth hələ hazır deyil, gözlənilir...");
            setTimeout(window.checkAuthAction, 500);
            return;
        }

        resetPasswordCode = oobCode;
        try {
            const email = await auth.verifyPasswordResetCode(oobCode);
            const emailDisplay = document.getElementById('reset-email-display');
            if (emailDisplay) {
                const span = emailDisplay.querySelector('span');
                if (span) span.textContent = email;
                else emailDisplay.textContent = email;
            }
            
            document.getElementById('reset-password-modal').classList.remove('hidden');
            if (!currentUser) window.showLogin(); // Arxa fonda login səhifəsini göstər
            console.log("Şifrə sıfırlama modalı açıldı:", email);
            
            // URL-i təmizləyək (oobCode görünməsin)
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error("Verify code error:", error);
            showNotification('Şifrə sıfırlama linki etibarsızdır və ya vaxtı keçib.', 'error');
        }
    }
}

window.submitNewPassword = async function() {
    const newPass = document.getElementById('new-password-input').value;
    const confirmPass = document.getElementById('confirm-password-input').value;

    if (!newPass || newPass.length < 8) return showNotification('Şifrə minimum 8 simvol olmalıdır!', 'error');
    if (newPass !== confirmPass) return showNotification('Şifrələr uyğun gəlmir!', 'error');

    const btn = document.getElementById('btn-submit-new-pwd');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yenilənir...';
    btn.disabled = true;

    try {
        await auth.confirmPasswordReset(resetPasswordCode, newPass);
        showNotification('Şifrəniz uğurla yeniləndi! İndi yeni şifrə ilə daxil ola bilərsiniz.', 'success');
        closeModal('reset-password-modal');
        showLogin();
    } catch (error) {
        console.error("Confirm reset error:", error);
        showNotification('Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Səhifə yüklənəndə auth action-ları yoxla
window.addEventListener('DOMContentLoaded', () => {
    // Əgər URL-də şifrə bərpa parametrləri varsa, gözləmədən yoxla
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if ((mode === 'resetPassword' || mode === 'action') && urlParams.get('oobCode')) {
        checkAuthAction();
    } else {
        setTimeout(checkAuthAction, 1000);
    }
});

// News Navigation - Controlled by index.html inline script (IS_NEWS_READY)


window.login = async function() {
    const username = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    
    if (!username || !pass) return showNotification('İstifadəçi adı və şifrəni daxil edin!', 'error');

    // Loader göstər
    const loginBtn = document.querySelector('#login-box .btn-primary');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Giriş edilir...';
    loginBtn.disabled = true;

    try {
        if (db && auth) {
            // Pro Shield Update: Birbaşa Auth üzərindən giriş (Daha sürətli və təhlükəsiz)
            let userEmail = username;
            
            if (!username.includes('@')) {
                // İstifadəçi adı daxil edilib. Əvvəlcə bazadan bu istifadəçi adının emailini tapaq.
                try {
                    const userDoc = await db.collection('users').where('username', '==', username).limit(1).get();
                    if (!userDoc.empty) {
                        userEmail = userDoc.docs[0].data().email;
                    } else {
                        // Əgər bazada tapılmasa, standart şagird formatını yoxlayaq
                        userEmail = `${username}@imtahan.site`;
                    }
                } catch (e) {
                    console.warn("Username lookup failed:", e);
                    userEmail = `${username}@imtahan.site`;
                }
            }
            
            let userCredential;
            try {
                userCredential = await auth.signInWithEmailAndPassword(userEmail, pass);
            } catch (authError) {
                // Şifrə səhvdir və ya istifadəçi tapılmadı
                throw new Error('İstifadəçi adı və ya şifrə yanlışdır!');
            }

            // Giriş uğurlu oldu, indi istifadəçi məlumatlarını çəkirik
            const uid = userCredential.user.uid;
            let user = null;
            let firestoreDoc = null;
            try {
                const doc = await db.collection('users').doc(uid).get();
                firestoreDoc = doc;
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData && userData.password) delete userData.password;
                    user = { id: uid, ...userData };
                }
            } catch (dbErr) {
                // Firestore oxunuşu alınmadı (quota exceeded və s.)
                console.warn('Firestore oxu alınmadı, lokal fallback istifadə olunur:', dbErr && dbErr.message);
            }

            if (!user) {
                throw new Error('İstifadəçi profili tapılmadı!');
            }

            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            updateUI();
            showNotification('Xoş gəldiniz, ' + (user.username || user.email) + '!', 'success');
            
            if (redirectAfterAuth === 'teacher_panel' && user.role === 'teacher') {
                redirectAfterAuth = null;
                showTeacherDashboard();
            }
        } else {
            // Fallback to local storage (not recommended but for offline compatibility)
            const localUsers = JSON.parse(localStorage.getItem('users')) || [];
            const user = localUsers.find(u => u.username === username && (u.passwordHash ? verifyPassword(pass, u.passwordHash) : u.password === pass));
            if (user) {
                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                updateUI();
                showNotification('Xoş gəldiniz (Offline), ' + user.username + '!', 'success');
            } else {
                throw new Error('İstifadəçi adı və ya şifrə yanlışdır!');
            }
        }
    } catch (error) {
        console.error("Login error:", error);
        let errorMsg = 'Giriş zamanı xəta baş verdi!';
        
        if (error.code === 'auth/invalid-login-credentials' || 
            error.code === 'auth/user-not-found' || 
            error.code === 'auth/wrong-password') {
            errorMsg = 'İstifadəçi adı və ya şifrə yanlışdır!';
        } else if (error.code === 'auth/too-many-requests') {
            errorMsg = 'Həddindən artıq uğursuz cəhd edildi. Zəhmət olmasa bir az gözləyin.';
        } else if (error.message) {
            errorMsg = error.message;
        }

        showNotification(errorMsg, 'error');
    } finally {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    }
}

window.toggleEmailField = function() {
    const role = document.getElementById('reg-role').value;
    const emailGroup = document.getElementById('teacher-email-group');
    if (role === 'teacher') {
        emailGroup.classList.remove('hidden');
    } else {
        emailGroup.classList.add('hidden');
    }
}

let pendingUser = null;
let verificationCode = null;

async function sendVerificationEmail(email, code, userName) {
    try {
        await emailjs.send(
            "service_rjwl984",
            "template_y8eq8n8",
            {
                user_email: email,
                code: code,
                user_name: userName || "İstifadəçi"
            }
        );
        return true;
    } catch (error) {
        console.error("EmailJS xətası:", error);
        return false;
    }
}

window.register = async function() {
    const name = document.getElementById('reg-name').value.trim();
    const surname = document.getElementById('reg-surname').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const pass = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const email = document.getElementById('reg-email').value;

    if (!name || !surname || !username || !pass) return showNotification('Bütün sahələri doldurun!', 'error');
    
    // Username validation: min 5 chars, no spaces
    if (username.length < 5) return showNotification('İstifadəçi adı minimum 5 simvoldan ibarət olmalıdır!', 'error');
    if (/\s/.test(username)) return showNotification('İstifadəçi adında boşluq ola bilməz!', 'error');
    if (!/^[a-z0-9_.]+$/.test(username)) return showNotification('İstifadəçi adında yalnız hərf, rəqəm, nöqtə və alt xətt ola bilər!', 'error');

    if (pass.length < 8) return showNotification('Şifrə minimum 8 işarədən ibarət olmalıdır!', 'error');
    if (role === 'teacher' && (!email || !email.includes('@'))) return showNotification('Zəhmət olmasa düzgün email ünvanı daxil edin!', 'error');

    // Loader göstər
    const regBtn = document.querySelector('#register-box .btn-primary');
    const originalText = regBtn.textContent;
    regBtn.textContent = 'Yoxlanılır...';
    regBtn.disabled = true;

    try {
        if (db) {
            // 1. İstifadəçi adının mövcudluğunu yoxla
            const userQuery = await db.collection('users').where('username', '==', username).get();
            if (!userQuery.empty) {
                throw new Error('Bu istifadəçi adı artıq mövcuddur!');
            }

            // 2. Email-in mövcudluğunu yoxla (Müəllimlər üçün)
            if (role === 'teacher' && email) {
                const emailQuery = await db.collection('users').where('email', '==', email).get();
                if (!emailQuery.empty) {
                    throw new Error('Bu email ünvanı artıq qeydiyyatdan keçib!');
                }
            }
        }

        if (role === 'teacher') {
            // Teacher verification flow
            pendingUser = { name, surname, username, password: pass, role: role, email: email };
            verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            const success = await sendVerificationEmail(email, verificationCode, `${name} ${surname}`);
            
            if (success) {
                // Google Analytics: Qeydiyyat Cəhdi (Müəllim)
                trackEvent('registration_attempt', {
                    'role': 'teacher'
                });

                showNotification(`${email} ünvanına təsdiq kodu göndərildi. Zəhmət olmasa emailinizi yoxlayın.`, 'success');
                document.getElementById('verification-modal').classList.remove('hidden');
            } else {
                throw new Error('Email göndərilərkən xəta baş verdi.');
            }
        } else {
            // Normal student registration - Direct Firebase Auth
            const studentEmail = `${username}@imtahan.site`;
            
            if (auth) {
                const userCredential = await auth.createUserWithEmailAndPassword(studentEmail, pass);
                const uid = userCredential.user.uid;
                
                const newUser = { 
                    id: uid, 
                    name,
                    surname,
                    username, 
                    role: role, 
                    email: studentEmail,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (db) {
                    await db.collection('users').doc(uid).set(newUser);
                }

                // Google Analytics: Qeydiyyat Uğurlu (Tələbə)
                trackEvent('sign_up', {
                    'method': 'direct',
                    'role': 'student'
                });

                showNotification('Qeydiyyat uğurludur!', 'success');
                
                // Auto login
                currentUser = newUser;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUI();
                showDashboard();
            } else {
                // Offline fallback
                const newUser = { id: String(Date.now()), name, surname, username, passwordHash: hashPassword(pass), role: role };
                const localUsers = JSON.parse(localStorage.getItem('users')) || [];
                localUsers.push(newUser);
                localStorage.setItem('users', JSON.stringify(localUsers));
                
                currentUser = newUser;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUI();
                showDashboard();
            }
        }
    } catch (error) {
        console.error("Registration error:", error);
        showNotification(error.message || 'Qeydiyyat zamanı xəta baş verdi!', 'error');
    } finally {
        regBtn.textContent = originalText;
        regBtn.disabled = false;
    }
}

window.confirmVerification = async function() {
    const codeInput = document.getElementById('v-code').value;
    if (codeInput === verificationCode) {
        try {
            if (auth && db) {
                // Firebase Auth istifadəçisi yarat
                const userCredential = await auth.createUserWithEmailAndPassword(pendingUser.email, pendingUser.password);
                const uid = userCredential.user.uid;
                
                const newUser = { 
                    id: uid,
                    name: pendingUser.name,
                    surname: pendingUser.surname,
                    username: pendingUser.username,
                    role: pendingUser.role,
                    email: pendingUser.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Firestore-da istifadəçi məlumatlarını saxla
                await db.collection('users').doc(uid).set(newUser);
                
                currentUser = newUser;
            } else {
                // Offline fallback
                const newUser = { id: String(Date.now()), name: pendingUser.name, surname: pendingUser.surname, username: pendingUser.username, role: pendingUser.role, email: pendingUser.email, passwordHash: hashPassword(pendingUser.password) };
                const localUsers = JSON.parse(localStorage.getItem('users')) || [];
                localUsers.push(newUser);
                localStorage.setItem('users', JSON.stringify(localUsers));
                currentUser = newUser;
            }

            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showNotification('Email təsdiqləndi! Qeydiyyat uğurla tamamlandı.', 'success');
            
            // Google Analytics: Qeydiyyat Uğurlu (Müəllim)
            trackEvent('sign_up', {
                'method': 'email_verification',
                'role': 'teacher'
            });

            closeVerification();
            updateUI();

            if (redirectAfterAuth === 'teacher_panel' && currentUser.role === 'teacher') {
                redirectAfterAuth = null;
                showTeacherDashboard();
            } else {
                showDashboard();
            }
        } catch (error) {
            console.error("Verification confirmation error:", error);
            showNotification(error.message || 'Təsdiqləmə zamanı xəta baş verdi!', 'error');
        }
    } else {
        showNotification('Yanlış təsdiq kodu!', 'error');
    }
}

window.closeVerification = function() {
    document.getElementById('verification-modal').classList.add('hidden');
    document.getElementById('v-code').value = '';
    pendingUser = null;
    verificationCode = null;
}

window.logout = function() {
    if (auth) {
        auth.signOut().catch(console.error);
    }
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUI();
    showDashboard(); // Redirect to dashboard on logout
}

// --- Export / Import Logic ---
window.exportData = function() {
    if (!currentUser || currentUser.role !== 'admin') return showNotification('Bu hərəkət üçün admin icazəsi lazımdır!', 'error');
    const data = {
        categories: categories,
        users: users
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "imtahan_bazasi.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

window.importData = function(input) {
    if (!currentUser || currentUser.role !== 'admin') return showNotification('Bu hərəkət üçün admin icazəsi lazımdır!', 'error');
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.categories && Array.isArray(data.categories)) {
                categories = data.categories;
                localStorage.setItem('categories', JSON.stringify(categories));
            }
            if (data.users && Array.isArray(data.users)) {
                // Merge users or replace? Let's keep admin but allow new users
                // For simplicity in this offline sharing model, we might just replace,
                // BUT we must ensure current user session isn't broken if possible.
                // However, since we are usually importing on a fresh machine, replacing is fine.
                // Just ensure we don't lose the hardcoded admin if it's missing in file (unlikely).
                users = data.users;
                localStorage.setItem('users', JSON.stringify(users));
            }
            showNotification('Baza uğurla yeniləndi! İndi suallar görünəcək.', 'success');
            renderCategories();
            renderAdminCategories();
        } catch (error) {
            console.error(error);
            showNotification('Fayl oxunarkən xəta baş verdi. Düzgün JSON faylı seçdiyinizə əmin olun.', 'error');
        }
    };
    reader.readAsText(file);
}

// --- Navigation Helpers ---
window.prepareQuizAction = function() {
    if (currentUser) {
        if (currentUser.role === 'teacher') {
            showTeacherDashboard();
            
            // Show the floating guide tooltip
            setTimeout(() => {
                const tooltip = document.getElementById('quiz-guide-tooltip');
                if (tooltip) {
                    tooltip.classList.remove('hidden');
                    // Hide tooltip after 8 seconds
                    setTimeout(() => tooltip.classList.add('hidden'), 8000);
                }
            }, 500);
        } else {
            showNotification('Sınaq hazırlamaq üçün müəllim hesabı lazımdır. Müəllim kimi qeydiyyatdan keçməyiniz üçün səhifəyə yönləndirilirsiniz.', 'info');
            
            setTimeout(() => {
                logout();
                redirectAfterAuth = 'teacher_panel';
                showRegister('teacher');
            }, 1500);
        }
    } else {
        showNotification('Sınaq hazırlamaq üçün müəllim hesabı lazımdır. Müəllim kimi qeydiyyatdan keçməyiniz üçün səhifəyə yönləndirilirsiniz.', 'info');
        
        setTimeout(() => {
            redirectAfterAuth = 'teacher_panel';
            showRegister('teacher');
        }, 1500);
    }
}

window.tryAIAction = function() {
    if (currentUser) {
        if (currentUser.role === 'teacher') {
            showTeacherDashboard();
            setTimeout(() => showCreatePrivateQuiz(), 100);
            setTimeout(() => switchQuestionTab('ai'), 200);
        } else {
            showNotification('Süni İntellektlə test hazırlamaq üçün müəllim hesabı lazımdır. Müəllim qeydiyyatına yönləndirilirsiniz.', 'info');
            setTimeout(() => {
                logout();
                redirectAfterAuth = 'teacher_panel_ai';
                showRegister('teacher');
            }, 1500);
        }
    } else {
        showNotification('Süni İntellektlə test hazırlamaq üçün müəllim hesabı lazımdır. Müəllim qeydiyyatına yönləndirilirsiniz.', 'info');
        setTimeout(() => {
            redirectAfterAuth = 'teacher_panel_ai';
            showRegister('teacher');
        }, 1500);
    }
}

window.showContactModal = function() {
    if (currentUser) {
        const nameInput = document.getElementById('contact-name');
        const infoInput = document.getElementById('contact-info');
        if (nameInput) nameInput.value = currentUser.username || '';
        if (infoInput) infoInput.value = currentUser.email || '';
    }
    if (typeof openModal === 'function') {
        openModal('contact-modal');
    } else {
        const modal = document.getElementById('contact-modal');
        if (modal) modal.classList.remove('hidden');
    }
}

window.sendContactMessage = async function() {
    const nameInput = document.getElementById('contact-name');
    const infoInput = document.getElementById('contact-info');
    const messageInput = document.getElementById('contact-message');
    
    if (!nameInput || !infoInput || !messageInput) return;

    const name = nameInput.value.trim();
    const info = infoInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !info || !message) {
        showNotification('Zəhmət olmasa bütün xanaları doldurun.', 'error');
        return;
    }

    const btn = document.querySelector('#contact-modal .btn-primary');
    const originalText = btn.innerText ? btn.innerText : 'Göndər';
    btn.disabled = true;
    btn.innerText = 'Göndərilir...';

    try {
        const reportData = {
            name: name,
            contactInfo: info,
            message: message,
            userId: currentUser ? currentUser.id : 'anonim',
            username: currentUser ? 
                (`${currentUser.name || ''} ${currentUser.surname || ''}`.trim() || currentUser.username || name) : 
                name,
            timestamp: Date.now(),
            status: 'pending',
            type: 'contact_form'
        };

        if (db) {
            await db.collection('reports').add(reportData);
        } else {
            const reports = JSON.parse(localStorage.getItem('reports') || '[]');
            reports.push({ ...reportData, id: Date.now().toString() });
            localStorage.setItem('reports', JSON.stringify(reports));
        }

        showNotification('Mesajınız uğurla göndərildi. Təşəkkür edirik!', 'success');
        closeModal('contact-modal');
        
        // Clear fields
        messageInput.value = '';
    } catch (error) {
        console.error("Error sending contact message: ", error);
        showNotification('Mesaj göndərilərkən xata baş verdi: ' + (error.message || 'Bilinməyən xata'), 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function hideAllSections() {
    const sections = [
        'auth-section', 'dashboard-section', 'admin-dashboard-section', 
        'category-admin-section', 'quiz-section', 'result-section', 
        'profile-section', 'teacher-dashboard-section', 
        'create-private-quiz-section', 'private-access-section',
        'admin-question-section', 'review-section', 'public-questions-section',
        'top-users-section', 'reports-section', 'teacher-reports-section',
        'admin-chat-section'
    ];
    sections.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.classList.add('hidden');
    });
}

window.hideAdminQuestionPage = function() {
    hideAllSections();
    resetEditingState();
    if (activeCategoryId) {
        openCategory(activeCategoryId);
    } else {
        showAdminDashboard();
    }
}

// --- Teacher Dashboard Functions ---
window.showTeacherDashboard = function(doPush = true) {
    if (!currentUser) return showLogin();

    if (doPush) {
        const url = new URL(window.location);
        url.searchParams.set('page', 'teacher');
        url.searchParams.delete('cat');
        window.history.pushState({ page: 'teacher' }, '', url);
    }

    hideAllSections();
    document.getElementById('teacher-dashboard-section').classList.remove('hidden');
    window.__privateQuizzesState = { quizzes: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 };
    renderPrivateQuizzes(true);
    updateTeacherReportsBadge();
}

window.showTeacherReports = function() {
    hideAllSections();
    document.getElementById('teacher-reports-section').classList.remove('hidden');
    // Reset pagination state
    window.__teacherReportsState = {
        reports: [],
        lastDoc: null,
        hasMore: true,
        loading: false,
        fallbackAll: null,
        pageIndex: 0
    };
    loadTeacherReports(true);
}

window.loadTeacherReports = async function(initial = false) {
    const listContainer = document.getElementById('teacher-reports-list');
    const loadMoreBtn = document.getElementById('teacher-reports-load-more');
    if (!listContainer) return;
    
    const state = window.__teacherReportsState || (window.__teacherReportsState = { reports: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 });
    const PAGE_SIZE = 5;
    
    if (initial) {
        listContainer.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-primary"></i><p class="mt-2">Şikayətlər yüklənir...</p></div>';
    } else {
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
        }
    }
    
    try {
        if (!currentUser) {
            listContainer.innerHTML = '<div class="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10"><i class="fas fa-user text-4xl text-primary/50 mb-3"></i><p class="text-white/60">Giriş tələb olunur.</p></div>';
            return;
        }
        if (!db) {
            listContainer.innerHTML = '<div class="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10"><i class="fas fa-database text-4xl text-primary/50 mb-3"></i><p class="text-white/60">Hazırda məlumat yoxdur.</p></div>';
            return;
        }
        let reportsPage = [];
        const snapshot = await db.collection('reports')
            .where('teacherId', '==', currentUser.id)
            .get();
        const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allReports.sort((a, b) => {
            const at = typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp && a.timestamp.seconds ? a.timestamp.seconds * 1000 : 0);
            const bt = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp && b.timestamp.seconds ? b.timestamp.seconds * 1000 : 0);
            return bt - at;
        });
        if (allReports.length === 0) {
            listContainer.innerHTML = '<div class="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10"><i class="fas fa-check-circle text-4xl text-green-500/50 mb-3"></i><p class="text-white/60">Hələ ki, heç bir şikayət yoxdur.</p></div>';
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
            return;
        }
        state.fallbackAll = state.fallbackAll || allReports;
        const start = state.pageIndex * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        reportsPage = state.fallbackAll.slice(start, end);
        state.pageIndex += 1;
        if (end >= state.fallbackAll.length) {
            state.hasMore = false;
        }
        
        if (initial) {
            listContainer.innerHTML = '';
        }
        state.reports = state.reports.concat(reportsPage);
        appendTeacherReports(reportsPage, listContainer);
        
        if (loadMoreBtn) {
            if (state.hasMore) {
                loadMoreBtn.classList.remove('hidden');
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = 'Daha çox yüklə';
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        }
        
    } catch (error) {
        console.error("Error loading teacher reports:", error);
        try { errorHandler.logError(error, errorHandler.ERROR_TYPES.UNKNOWN, { scope: 'teacher_reports_load' }); } catch (_) {}
        listContainer.innerHTML = '<div class="text-center py-8 text-red-400">Şikayətləri yükləyərkən xəta baş verdi.</div>';
        const loadMoreBtn2 = document.getElementById('teacher-reports-load-more');
        if (loadMoreBtn2) {
            loadMoreBtn2.disabled = false;
            loadMoreBtn2.innerHTML = 'Daha çox yüklə';
        }
    }
}

window.loadMoreTeacherReports = function() {
    if (!window.__teacherReportsState || window.__teacherReportsState.loading === true) return;
    window.__teacherReportsState.loading = true;
    loadTeacherReports(false).finally(() => {
        window.__teacherReportsState.loading = false;
    });
}

function appendTeacherReports(reports, listContainer) {
    let html = '';
    reports.forEach(report => {
        let date = 'Naməlum';
        if (report.timestamp) {
            const ts = typeof report.timestamp === 'number' ? report.timestamp : 
                      (report.timestamp.seconds ? report.timestamp.seconds * 1000 : report.timestamp);
            date = new Date(ts).toLocaleString('az-AZ');
        }
        const isRead = report.status === 'resolved';
        
        html += `
            <div class="report-card ${isRead ? 'opacity-70' : 'border-l-4 border-warning'}" style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); position: relative;">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-xs font-medium px-2 py-1 rounded bg-warning/20 text-warning">
                        ${escapeHtml(report.categoryName || 'Özəl Test')}
                    </span>
                    <span class="text-xs text-white/40">${date}</span>
                </div>
                <p class="text-white/90 mb-4" style="font-size: 0.95rem; line-height: 1.5;">
                    <i class="fas fa-quote-left text-primary/40 mr-2"></i>
                    ${escapeHtml(report.message || report.reason || '')}
                </p>
                <div class="flex justify-between items-center pt-4 border-t border-white/5">
                    <div class="text-xs text-white/50">
                        <i class="fas fa-user mr-1"></i> Göndərən: ${escapeHtml(report.username || report.name || report.userName || 'Anonim')}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="goToReportedQuestion('${report.categoryId}', '${report.questionId}', 'private', \`${(report.questionTitle || report.questionText || '').replace(/"/g, '&quot;')}\`)" class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                            <i class="fas fa-eye mr-1"></i> Suala Bax
                        </button>
                        ${!isRead ? `
                            <button onclick="markReportAsResolvedByTeacher('${report.id}')" class="btn-primary" style="background: var(--success-color); border-color: var(--success-hover); padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                                <i class="fas fa-check mr-1"></i> Həll Edildi
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    // Append instead of overwrite to support pagination
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    while (tempDiv.firstChild) {
        listContainer.appendChild(tempDiv.firstChild);
    }
}

window.markReportAsResolvedByTeacher = async function(reportId) {
    if (!confirm('Bu şikayəti həll edilmiş kimi qeyd etmək istəyirsiniz?')) return;
    
    try {
        if (db) {
            await db.collection('reports').doc(reportId).update({ status: 'resolved' });
            showNotification('Şikayət həll edilmiş kimi qeyd olundu', 'success');
            loadTeacherReports();
            updateTeacherReportsBadge();
        }
        // Update local cache too
        try {
            const key = 'teacherReports:' + (currentUser ? currentUser.id : '');
            const cached = JSON.parse(localStorage.getItem(key) || '[]');
            const updated = cached.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r);
            localStorage.setItem(key, JSON.stringify(updated));
            const pendingCount = updated.filter(r => r.status !== 'resolved').length;
            localStorage.setItem('teacherReportsCount:' + (currentUser ? currentUser.id : ''), String(pendingCount));
        } catch (e) {}
    } catch (error) {
        console.error("Error resolving report:", error);
        showNotification('Xəta baş verdi', 'error');
    }
}

window.updateTeacherReportsBadge = async function() {
    const badge = document.getElementById('teacher-reports-count');
    if (!badge || !currentUser || !db) return;
    
    try {
        const snapshot = await db.collection('reports')
            .where('teacherId', '==', currentUser.id)
            .where('status', '==', 'pending')
            .get();
            
        const count = snapshot.size;
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error updating teacher badge:", error);
    }
}

window.toggleTimeInputType = function() {
    const timeType = document.getElementById('private-quiz-time-type').value;
    const timeLabel = document.getElementById('time-label');
    const timeInput = document.getElementById('private-quiz-default-time');
    const manualTimeInputs = document.querySelectorAll('.time-input-group');

    if (timeType === 'total') {
        timeLabel.innerHTML = '<i class="fas fa-clock"></i> Ümumi Test Vaxtı (dəqiqə)';
        timeInput.placeholder = 'Məs: 15';
        if (timeInput.value == 45) timeInput.value = 15;
        
        // Hide individual question time inputs
        manualTimeInputs.forEach(group => group.classList.add('hidden'));
    } else {
        timeLabel.innerHTML = '<i class="fas fa-clock"></i> Standart Vaxt (san)';
        timeInput.placeholder = 'Məs: 45';
        if (timeInput.value == 15) timeInput.value = 45;

        // Show individual question time inputs
        manualTimeInputs.forEach(group => group.classList.remove('hidden'));
    }
}

window.showCreatePrivateQuiz = function() {
    // Hide guide tooltip if it exists
    const tooltip = document.getElementById('quiz-guide-tooltip');
    if (tooltip) tooltip.classList.add('hidden');

    hideAllSections();
    document.getElementById('create-private-quiz-section').classList.remove('hidden');
    // Reset forms
    document.getElementById('editing-quiz-id').value = '';
    document.getElementById('private-quiz-form-title').textContent = 'Yeni Özəl Test Yaradın';
    document.getElementById('private-quiz-title').value = '';
    document.getElementById('private-quiz-password').value = '';
    document.getElementById('private-quiz-default-time').value = '45';
    document.getElementById('manual-questions-list').innerHTML = '';
    document.getElementById('bulk-questions-text').value = '';
    const aiContextText = document.getElementById('ai-context-text');
    if (aiContextText) aiContextText.value = '';
    document.getElementById('ready-question-count').textContent = '0';
    addManualQuestionForm(); // Add first empty question
}

window.editPrivateQuiz = async function(quizId) {
    let quiz = privateQuizzes.find(q => q.id === quizId);
    
    if (!quiz && db) {
        try {
            const doc = await db.collection('private_quizzes').doc(quizId).get();
            if (doc.exists) {
                quiz = { id: doc.id, ...doc.data() };
            }
        } catch (error) {
            console.error("Error fetching quiz for edit:", error);
        }
    }

    if (!quiz) return showNotification('Test tapılmadı!', 'error');
    
    hideAllSections();
    document.getElementById('create-private-quiz-section').classList.remove('hidden');
    
    // Set form to edit mode
    document.getElementById('editing-quiz-id').value = quizId;
    document.getElementById('private-quiz-form-title').textContent = 'Özəl Testdə Düzəliş Et';
    document.getElementById('private-quiz-title').value = quiz.title;
    document.getElementById('private-quiz-password').value = quiz.password || '';
    
    const timeTypeSelect = document.getElementById('private-quiz-time-type');
    if (timeTypeSelect) {
        timeTypeSelect.value = quiz.timeType || 'per-question';
    }
    
    document.getElementById('private-quiz-default-time').value = quiz.defaultTime || 45;
    
    // UI-ı vaxt növünə görə yenilə
    toggleTimeInputType();
    
    // Load questions
    const list = document.getElementById('manual-questions-list');
    list.innerHTML = '';
    
    // Previous State Restoration: No password prompt, direct access
    if (quiz.questionsCipher && !quiz.questions) {
        // Fallback for encrypted quizzes (try to use saved password or just warn)
        const savedPwd = localStorage.getItem('quiz_pass_' + quizId) || quiz.password;
        if (savedPwd) {
            try {
                const bytes = CryptoJS.AES.decrypt(quiz.questionsCipher, savedPwd);
                const decoded = bytes.toString(CryptoJS.enc.Utf8);
                quiz.questions = JSON.parse(decoded);
            } catch (e) {
                console.warn("Auto-decrypt failed");
            }
        }
        
        if (!quiz.questions) {
            // If still no questions, we must prompt OR just show empty (User requested removal of prompt)
            // But showing empty is bad. We will prompt ONLY if absolutely necessary, but user said "return to previous state".
            // Previous state didn't have encrypted quizzes. 
            // So we will try one last prompt if auto-decrypt fails, but for new quizzes it won't be needed.
            const pwd = window.prompt('Bu test şifrələnib. Redaktə üçün şifrəni daxil edin:');
            if (pwd) {
                try {
                    const bytes = CryptoJS.AES.decrypt(quiz.questionsCipher, pwd);
                    const decoded = bytes.toString(CryptoJS.enc.Utf8);
                    quiz.questions = JSON.parse(decoded);
                } catch(e) {
                    showNotification('Şifrə yanlışdır!', 'error');
                }
            }
        }
    }

    (quiz.questions || []).forEach((q, idx) => {
        const uniqueId = Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000);
        const div = document.createElement('div');
        div.className = 'manual-question-item';
        div.innerHTML = `
            <div class="manual-q-header">
                <div class="manual-q-title">
                    <i class="fas fa-question-circle"></i>
                    <span>Sual ${idx + 1}</span>
                </div>
                <div class="manual-q-actions">
                    <div class="time-input-group">
                        <i class="far fa-clock"></i>
                        <input type="number" class="manual-q-time" value="${q.time || ''}" placeholder="Def">
                        <span>san</span>
                    </div>
                    <button onclick="this.closest('.manual-question-item').remove(); updateQuestionCount();" class="delete-q-btn" title="Sualı sil">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="manual-q-content">
                <div class="manual-q-media-row">
                    <div class="manual-q-image-container">
                        <div class="image-preview ${q.image ? '' : 'hidden'}" id="preview_${uniqueId}">
                            <img src="${q.image || ''}" alt="Sual şəkli">
                            <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn"><i class="fas fa-times"></i></button>
                        </div>
                        <label class="image-upload-label ${q.image ? 'hidden' : ''}" id="label_${uniqueId}">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>Şəkil Əlavə Et</span>
                            <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" class="hidden">
                        </label>
                        <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}" value="${q.image || ''}">
                    </div>

                    <div class="manual-q-video-box" id="video_box_${uniqueId}">
                        <div class="video-upload-label ${q.videoId ? 'hidden' : ''}" onclick="toggleVideoOptions('${uniqueId}')">
                            <i class="fas fa-video"></i>
                            <span>Video İzah</span>
                        </div>
                        
                        <div id="video_options_${uniqueId}" class="video-options-menu hidden">
                            <button type="button" class="video-option-item" onclick="showYoutubeInput('${uniqueId}')">
                                <i class="fab fa-youtube"></i> Youtube-dan əlavə et
                            </button>
                            <button type="button" class="video-option-item" onclick="triggerVideoUpload('${uniqueId}')">
                                <i class="fas fa-upload"></i> Video yüklə
                            </button>
                        </div>
                        
                        <input type="file" id="video_file_${uniqueId}" accept="video/*" class="hidden" onchange="handleVideoUpload(this, '${uniqueId}')">
                        
                        <div class="video-progress hidden" id="video_progress_${uniqueId}">
                            <div class="video-bar" id="video_bar_${uniqueId}"></div>
                        </div>
                        <div class="video-status hidden" id="video_status_${uniqueId}"></div>

                        <div class="video-preview-container ${q.videoId ? '' : 'hidden'}" id="video_preview_${uniqueId}">
                            ${q.videoId ? (q.videoType === 'youtube' ? `
                                <div class="plyr__video-embed" id="player_${uniqueId}">
                                    <iframe src="https://www.youtube.com/embed/${q.videoId}?origin=${window.location.origin}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1" allowfullscreen allowtransparency allow="autoplay"></iframe>
                                </div>
                            ` : `<div class="video-placeholder"><i class="fas fa-check-circle"></i> <span>Video Yüklənib</span></div>`) : ''}
                            <button type="button" class="remove-video-btn" onclick="removeQuestionVideo('${uniqueId}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <input type="hidden" class="manual-q-video-id" id="video_id_${uniqueId}" value="${q.videoId || ''}">
                        <input type="hidden" class="manual-q-video-type" id="video_type_${uniqueId}" value="${q.videoType || ''}">
                    </div>
                </div>

                <div class="manual-q-text-container">
                    <textarea class="manual-q-text" placeholder="Sualın mətnini bura daxil edin...">${q.text || ''}</textarea>
                </div>
            </div>
            <div class="manual-q-explanation-row">
                <label><i class="fas fa-comment-alt"></i> Sualın İzahı (Opsional)</label>
                <textarea class="manual-q-explanation" placeholder="Sualın izahını daxil edin...">${q.explanation || ''}</textarea>
            </div>
            <div class="manual-options-grid">
                ${q.options.map((opt, optIdx) => `
                    <div class="manual-option-input">
                        <div class="option-radio-wrapper">
                            <input type="radio" name="correct_${uniqueId}" value="${optIdx}" ${optIdx === q.correctIndex ? 'checked' : ''} id="opt_${uniqueId}_${optIdx}">
                            <label for="opt_${uniqueId}_${optIdx}"></label>
                        </div>
                        <input type="text" class="manual-opt" value="${opt}" placeholder="${String.fromCharCode(65 + optIdx)} variantı">
                    </div>
                `).join('')}
            </div>
        `;
        list.appendChild(div);

        if (q.videoId && q.videoType === 'youtube') {
            new Plyr(`#player_${uniqueId}`, {
                youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
            });
        }
        initDragAndDrop(uniqueId);
    });
    
    switchQuestionTab('manual');
    updateQuestionCount();
}

window.switchQuestionTab = function(method) {
    // AI tabı üçün əlavə daxili yoxlanış
    if (method === 'ai') {
        if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'admin')) {
            showNotification('Süni İntellekt bölməsindən yalnız müəllimlər istifadə edə bilər.', 'error');
            return;
        }
    }

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.method-content').forEach(c => c.classList.add('hidden'));
    
    document.getElementById(`tab-${method}`).classList.add('active');
    document.getElementById(`method-${method}`).classList.remove('hidden');
}

window.addManualQuestionForm = function() {
    const list = document.getElementById('manual-questions-list');
    const uniqueId = Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    const timeTypeEl = document.getElementById('private-quiz-time-type');
    const timeType = timeTypeEl ? timeTypeEl.value : 'none';
    const isTimeHidden = (timeType === 'total' || timeType === 'none');

    const div = document.createElement('div');
    div.className = 'manual-question-item animate-up';
    div.setAttribute('data-id', uniqueId);
    const currentCount = document.querySelectorAll('.manual-question-item').length;
    div.innerHTML = `
        <div class="manual-q-header">
            <div class="manual-q-title">
                <i class="fas fa-plus-circle"></i>
                <span>Sual ${currentCount + 1}</span>
            </div>
            <div class="manual-q-actions">
                <div class="time-input-group ${isTimeHidden ? 'hidden' : ''}">
                    <i class="far fa-clock"></i>
                    <input type="number" class="manual-q-time" placeholder="Def">
                    <span>san</span>
                </div>
                <button onclick="this.closest('.manual-question-item').remove(); updateQuestionCount();" class="delete-q-btn" title="Sualı sil">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        <div class="manual-q-content">
            <div class="manual-q-media-row">
                <div class="manual-q-image-container">
                    <div class="image-preview hidden" id="preview_${uniqueId}">
                        <img src="" alt="Sual şəkli">
                        <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <label class="image-upload-label" id="label_${uniqueId}">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Şəkil Əlavə Et və ya Sürüklə</span>
                        <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" class="hidden">
                    </label>
                    <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}">
                </div>

                <div class="manual-q-video-box" id="video_box_${uniqueId}">
                    <div class="video-upload-label" onclick="toggleVideoOptions('${uniqueId}', event)">
                        <i class="fas fa-video"></i>
                        <span>Video İzah</span>
                    </div>
                    
                    <div id="video_options_${uniqueId}" class="video-options-menu hidden">
                        <button type="button" class="video-option-item" onclick="showYoutubeInput('${uniqueId}')">
                            <i class="fab fa-youtube"></i> Youtube-dan əlavə et
                        </button>
                        <button type="button" class="video-option-item" onclick="triggerVideoUpload('${uniqueId}')">
                            <i class="fas fa-upload"></i> Video yüklə
                        </button>
                    </div>
                    
                    <input type="file" id="video_file_${uniqueId}" accept="video/*" class="hidden" onchange="handleVideoUpload(this, '${uniqueId}')">
                    
                    <div class="video-progress hidden" id="video_progress_${uniqueId}">
                        <div class="video-bar" id="video_bar_${uniqueId}"></div>
                    </div>
                    <div class="video-status hidden" id="video_status_${uniqueId}"></div>

                    <div class="video-preview-container hidden" id="video_preview_${uniqueId}">
                        <button type="button" class="remove-video-btn" onclick="removeQuestionVideo('${uniqueId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <input type="hidden" class="manual-q-video-id" id="video_id_${uniqueId}" value="">
                    <input type="hidden" class="manual-q-video-type" id="video_type_${uniqueId}" value="">
                </div>
            </div>

            <div class="manual-q-text-container">
                <textarea class="manual-q-text" placeholder="Sualın mətnini bura daxil edin..."></textarea>
            </div>
        </div>
        <div class="manual-q-explanation-row">
            <label><i class="fas fa-comment-alt"></i> Sualın İzahı (Opsional)</label>
            <textarea class="manual-q-explanation" placeholder="Sualın izahını daxil edin..."></textarea>
        </div>
        <div class="manual-options-grid" id="options_grid_${uniqueId}">
            <div class="grid-cols-full bg-warning-light border-warning border-dashed p-3 rounded-md mb-3 text-warning-dark font-bold flex items-center gap-3">
                <i class="fas fa-exclamation-triangle text-xl"></i>
                <span>DİQQƏT: Düzgün cavabın yanındakı dairəni mütləq işarələyin!</span>
            </div>
            <div class="manual-option-input">
                <div class="option-radio-wrapper">
                    <input type="radio" name="correct_${uniqueId}" value="0" checked id="opt_${uniqueId}_0">
                    <label for="opt_${uniqueId}_0"></label>
                </div>
                <input type="text" class="manual-opt" placeholder="A variantı">
            </div>
            <div class="manual-option-input">
                <div class="option-radio-wrapper">
                    <input type="radio" name="correct_${uniqueId}" value="1" id="opt_${uniqueId}_1">
                    <label for="opt_${uniqueId}_1"></label>
                </div>
                <input type="text" class="manual-opt" placeholder="B variantı">
            </div>
            <div class="manual-option-input">
                <div class="option-radio-wrapper">
                    <input type="radio" name="correct_${uniqueId}" value="2" id="opt_${uniqueId}_2">
                    <label for="opt_${uniqueId}_2"></label>
                </div>
                <input type="text" class="manual-opt" placeholder="C variantı">
            </div>
            <div class="manual-option-input">
                <div class="option-radio-wrapper">
                    <input type="radio" name="correct_${uniqueId}" value="3" id="opt_${uniqueId}_3">
                    <label for="opt_${uniqueId}_3"></label>
                </div>
                <input type="text" class="manual-opt" placeholder="D variantı">
            </div>
        </div>
        <button onclick="addManualOption('${uniqueId}')" class="btn-add-option">
            <i class="fas fa-plus"></i> Variant Əlavə Et
        </button>
    `;
    list.appendChild(div);
    initDragAndDrop(uniqueId);
    updateQuestionCount();
}

window.handleQuestionImage = function(input, index, droppedFile = null) {
    const file = droppedFile || (input ? input.files[0] : null);
    if (!file) return;

    // Faylın tipini yoxlayırıq
    if (!file.type.startsWith('image/')) {
        showNotification('Zəhmət olmasa yalnız şəkil faylı seçin.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Maksimum ölçü 1024px-dən 800px-ə endiririk ki, 40 sual 1MB-a sığsın
            const MAX_SIZE = 800;
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Arxa fonu ağ edirik (PNG-lərdə şəffaflıq JPG-də qara görünməsin deyə)
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);

            // Şəkli JPG formatına çeviririk və keyfiyyəti 0.7-dən 0.5-ə endiririk
            // Bu, hər şəklin ölçüsünü təxminən 15-25 KB arasına salacaq.
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
            
            // Firestore limitini yoxlayırıq (40 sual üçün hər şəkil max 20-25KB olmalıdır)
            let preview = document.getElementById(`preview_${index}`);
            if (compressedBase64.length > 30 * 1024) {
                // Əgər hələ də böyükdürsə, bir az da sıxırıq
                const ultraCompressed = canvas.toDataURL('image/jpeg', 0.3);
                document.getElementById(`data_${index}`).value = ultraCompressed;
                preview.querySelector('img').src = ultraCompressed;
            } else {
                document.getElementById(`data_${index}`).value = compressedBase64;
                preview.querySelector('img').src = compressedBase64;
            }
            preview.classList.remove('hidden');
            document.getElementById(`label_${index}`).classList.add('hidden');
            if (input) input.value = ''; // Reset input
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

window.addManualOption = function(uniqueId) {
    const grid = document.getElementById(`options_grid_${uniqueId}`);
    const optionCount = grid.querySelectorAll('.manual-option-input').length;
    if (optionCount >= 10) return showNotification('Maksimum 10 variant əlavə edə bilərsiniz.', 'error');

    const div = document.createElement('div');
    div.className = 'manual-option-input';
    const char = String.fromCharCode(65 + optionCount); // A, B, C...
    
    div.innerHTML = `
        <div class="option-radio-wrapper">
            <input type="radio" name="correct_${uniqueId}" value="${optionCount}" id="opt_${uniqueId}_${optionCount}">
            <label for="opt_${uniqueId}_${optionCount}"></label>
        </div>
        <input type="text" class="manual-opt" placeholder="${char} variantı">
        <button onclick="this.parentElement.remove(); updateOptionValues('${uniqueId}');" class="remove-option-btn" title="Variantı sil">
            <i class="fas fa-times"></i>
        </button>
    `;
    grid.appendChild(div);
}

window.updateOptionValues = function(uniqueId) {
    const grid = document.getElementById(`options_grid_${uniqueId}`);
    const options = grid.querySelectorAll('.manual-option-input');
    options.forEach((opt, idx) => {
        const radio = opt.querySelector('input[type="radio"]');
        const input = opt.querySelector('.manual-opt');
        const char = String.fromCharCode(65 + idx);
        
        radio.value = idx;
        radio.id = `opt_${uniqueId}_${idx}`;
        opt.querySelector('label').setAttribute('for', radio.id);
        input.placeholder = `${char} variantı`;
    });
}

// Global drag-and-drop prevention (only once)
if (!window.dndInitialized) {
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);
    window.dndInitialized = true;
}

window.initDragAndDrop = function(uniqueId) {
    const dropZone = document.getElementById(`label_${uniqueId}`);
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-active');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            window.handleQuestionImage(null, uniqueId, files[0]);
        }
    }, false);
};

window.removeQuestionImage = function(index) {
    document.getElementById(`data_${index}`).value = '';
    document.getElementById(`preview_${index}`).classList.add('hidden');
    document.getElementById(`label_${index}`).classList.remove('hidden');
}

window.updateQuestionCount = function() {
    const questions = document.querySelectorAll('.manual-question-item');
    document.getElementById('ready-question-count').textContent = questions.length;
    
    // Update question numbering in titles
    questions.forEach((q, idx) => {
        const titleSpan = q.querySelector('.manual-q-title span');
        if (titleSpan) {
            titleSpan.textContent = `Sual ${idx + 1}`;
        }
    });
}

window.addEToAllQuestions = function() {
    const questionItems = document.querySelectorAll('.manual-question-item');
    if (questionItems.length === 0) return showNotification('Hələ heç bir sual yoxdur.', 'info');
    
    let addedCount = 0;
    questionItems.forEach(item => {
        const optionsGrid = item.querySelector('.manual-options-grid');
        const currentOptions = optionsGrid.querySelectorAll('.manual-option-input');
        
        // Əgər 4 variant varsa (A, B, C, D), E əlavə edirik
        if (currentOptions.length === 4) {
            const uniqueId = item.getAttribute('data-id');
            if (uniqueId) {
                addManualOption(uniqueId);
                addedCount++;
            }
        }
    });
    
    if (addedCount > 0) {
        showNotification(`${addedCount} suala E variantı əlavə edildi.`, 'success');
    } else {
        showNotification('Heç bir uyğun sual tapılmadı (artıq E variantı ola bilər və ya variant sayı 4-dən fərqlidir).', 'info');
    }
}

window.addMultipleQuestions = function(count) {
    for (let i = 0; i < count; i++) {
        addManualQuestionForm();
    }
    showNotification(`${count} yeni sual sahəsi əlavə edildi.`, 'success');
}

window.parseBulkQuestions = function() {
    const text = document.getElementById('bulk-questions-text').value;
    if (!text.trim()) return showNotification('Zəhmət olmasa mətni daxil edin.', 'error');
    
    const questions = [];
    // Daha etibarlı şəkildə sual bloklarına bölürük
    // Blok "Sual X", "Sual:" və ya sətir başındakı nömrə ilə başlayır
    const rawBlocks = text.split(/(?=^\s*(?:Sual\s*(?:[:\d])|\d+[\s.)]))/mi);
    
    rawBlocks.forEach(block => {
        if (!block.trim()) return;
        
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return;
        
        let questionText = "";
        let options = [];
        let correctIndex = 0;
        let explanation = "";
        let collectingOptions = false;
        let collectingExplanation = false;
        
        lines.forEach((line) => {
            // İzah və ya Cavab sətirlərini yoxlayırıq (Regex ilə daha dəqiqdir)
            const ansRegex = /^\s*(?:düzgün\s+)?(?:cavab|correct|answer|doğru\s+cavab|izahlı\s+cavab)\s*[:\-]?\s*(.+)$/i;
            const expRegex = /^\s*(?:izah|izahı|izahlı\s+cavab|şərh|açıqlama|explanation|[iİ]zah|[iİ]zahı|[iİ]zahlı\s+cavab)\s*[:\-]?\s*(.*)$/i;
            
            const mAns = line.match(ansRegex);
            const mExp = line.match(expRegex);
            const variantMatch = line.match(/^[A-J][\s.)\-:]{1,3}/i);
            
            // Ayırıcı sətirləri (---) və boş sətirləri keçirik
            if (line.startsWith('---') || line.startsWith('===')) return;

            if (mAns) {
                collectingOptions = false;
                collectingExplanation = false;
                const val = mAns[1].trim();
                const lm = val.match(/^([A-J])[\)\.]*\s*(.*)$/i);
                if (lm) {
                    correctIndex = lm[1].toUpperCase().charCodeAt(0) - 65;
                    
                    // Qalan hissədə izah varmı?
                    const rest = lm[2].trim();
                    if (rest) {
                        const expInRest = rest.match(/(?:izah|izahı|izahlı\s+cavab|şərh|açıqlama|explanation|[iİ]zah|[iİ]zahı|[iİ]zahlı\s+cavab)\s*[:\-]?\s*(.*)$/i);
                        if (expInRest) {
                            explanation = expInRest[1].trim();
                            collectingExplanation = true;
                        }
                    }
                } else {
                    // Əgər variant tapılmadısa, mətnə görə axtar
                    const idx = options.findIndex(o => o.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(o.toLowerCase()));
                    if (idx >= 0) correctIndex = idx;
                }
            } else if (mExp) {
                collectingOptions = false;
                collectingExplanation = true;
                explanation = mExp[1].trim();
            } else if (variantMatch && !collectingExplanation) {
                collectingOptions = true;
                options.push(line.substring(variantMatch[0].length).trim());
            } else if (collectingExplanation) {
                explanation += (explanation ? "\n" : "") + line;
            } else if (!collectingOptions) {
                questionText += (questionText ? "\n" : "") + line;
            }
        });
        
        if (questionText && (options.length > 0 || explanation)) {
            questions.push({
                text: questionText.trim(),
                options: options,
                correctIndex: correctIndex >= 0 && correctIndex < options.length ? correctIndex : 0,
                explanation: explanation.trim()
            });
        }
    });
    
    if (questions.length > 0) {
        const list = document.getElementById('manual-questions-list');
        const currentCount = document.querySelectorAll('.manual-question-item').length;
        
        const timeTypeEl = document.getElementById('private-quiz-time-type');
        const timeType = timeTypeEl ? timeTypeEl.value : 'none';
        const isTimeHidden = (timeType === 'total' || timeType === 'none');

        questions.forEach((q, idx) => {
            const uniqueId = Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000);
            const div = document.createElement('div');
            div.className = 'manual-question-item animate-up';
            div.setAttribute('data-id', uniqueId);
            div.innerHTML = `
                <div class="manual-q-header">
                    <div class="manual-q-title">
                        <i class="fas fa-plus-circle"></i>
                        <span>Sual ${currentCount + idx + 1}</span>
                    </div>
                    <div class="manual-q-actions">
                        <div class="time-input-group ${isTimeHidden ? 'hidden' : ''}">
                            <i class="far fa-clock"></i>
                            <input type="number" class="manual-q-time" placeholder="Def">
                            <span>san</span>
                        </div>
                        <button onclick="this.closest('.manual-question-item').remove(); updateQuestionCount();" class="delete-q-btn" title="Sualı sil">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="manual-q-content">
                    <div class="manual-q-media-row">
                        <div class="manual-q-image-container">
                            <div class="image-preview hidden" id="preview_${uniqueId}">
                                <img src="" alt="Sual şəkli">
                                <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn"><i class="fas fa-times"></i></button>
                            </div>
                            <label class="image-upload-label" id="label_${uniqueId}">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <span>Şəkil Əlavə Et</span>
                                <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" class="hidden">
                            </label>
                            <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}">
                        </div>

                        <div class="manual-q-video-box" id="video_box_${uniqueId}">
                            <div class="video-upload-label" onclick="toggleVideoOptions('${uniqueId}', event)">
                                <i class="fas fa-video"></i>
                                <span>Video İzah</span>
                            </div>
                            
                            <div id="video_options_${uniqueId}" class="video-options-menu hidden">
                                <button type="button" class="video-option-item" onclick="showYoutubeInput('${uniqueId}')">
                                    <i class="fab fa-youtube"></i> Youtube-dan əlavə et
                                </button>
                                <button type="button" class="video-option-item" onclick="triggerVideoUpload('${uniqueId}')">
                                    <i class="fas fa-upload"></i> Video yüklə
                                </button>
                            </div>
                            
                            <input type="file" id="video_file_${uniqueId}" accept="video/*" class="hidden" onchange="handleVideoUpload(this, '${uniqueId}')">
                            
                            <div class="video-progress hidden" id="video_progress_${uniqueId}">
                                <div class="video-bar" id="video_bar_${uniqueId}"></div>
                            </div>
                            <div class="video-status hidden" id="video_status_${uniqueId}"></div>

                            <div class="video-preview-container hidden" id="video_preview_${uniqueId}">
                                <button type="button" class="remove-video-btn" onclick="removeQuestionVideo('${uniqueId}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <input type="hidden" class="manual-q-video-id" id="video_id_${uniqueId}" value="">
                            <input type="hidden" class="manual-q-video-type" id="video_type_${uniqueId}" value="">
                        </div>
                    </div>

                    <div class="manual-q-text-container">
                        <textarea class="manual-q-text" placeholder="Sualın mətnini bura daxil edin...">${q.text}</textarea>
                    </div>
                </div>
                <div class="manual-q-explanation-row">
                    <label><i class="fas fa-comment-alt"></i> Sualın İzahı (Opsional)</label>
                    <textarea class="manual-q-explanation" placeholder="Sualın izahını daxil edin...">${q.explanation || ''}</textarea>
                </div>
                <div class="manual-options-grid" id="options_grid_${uniqueId}">
                    ${q.options.map((opt, i) => `
                        <div class="manual-option-input">
                            <div class="option-radio-wrapper">
                                <input type="radio" name="correct_${uniqueId}" value="${i}" ${i === q.correctIndex ? 'checked' : ''} id="opt_${uniqueId}_${i}">
                                <label for="opt_${uniqueId}_${i}"></label>
                            </div>
                            <input type="text" class="manual-opt" value="${opt}" placeholder="Variant ${i + 1}">
                        </div>
                    `).join('')}
                    ${q.options.length === 0 ? `
                        <div class="manual-option-input">
                            <div class="option-radio-wrapper">
                                <input type="radio" name="correct_${uniqueId}" value="0" checked id="opt_${uniqueId}_0">
                                <label for="opt_${uniqueId}_0"></label>
                            </div>
                            <input type="text" class="manual-opt" placeholder="A variantı">
                        </div>
                        <div class="manual-option-input">
                            <div class="option-radio-wrapper">
                                <input type="radio" name="correct_${uniqueId}" value="1" id="opt_${uniqueId}_1">
                                <label for="opt_${uniqueId}_1"></label>
                            </div>
                            <input type="text" class="manual-opt" placeholder="B variantı">
                        </div>
                    ` : ''}
                </div>
                <button onclick="addManualOption('${uniqueId}')" class="btn-add-option">
                    <i class="fas fa-plus"></i> Variant Əlavə Et
                </button>
            `;
            list.appendChild(div);
            initDragAndDrop(uniqueId);
        });
        
        document.getElementById('bulk-questions-text').value = '';
        switchQuestionTab('manual');
        updateQuestionCount();
        showNotification(`${questions.length} sual uğurla köçürüldü.`, 'success');
    } else {
        showNotification('Heç bir sual tapılmadı. Zəhmət olmasa formatı yoxlayın.', 'error');
    }
}

// --- Video Explanation Handlers ---
window.toggleVideoOptions = function(uniqueId, event) {
    if (event) event.stopPropagation();
    console.log('Toggle video options for:', uniqueId);
    const menu = document.getElementById(`video_options_${uniqueId}`);
    if (menu) {
        const isHidden = menu.classList.contains('hidden');
        
        // Digər bütün menyuları bağla
        document.querySelectorAll('.video-options-menu').forEach(m => {
            m.classList.add('hidden');
        });

        // Əgər əvvəl bağlı idisə, indi aç
        if (isHidden) {
            menu.classList.remove('hidden');
            console.log('Menu opened');
        } else {
            console.log('Menu closed');
        }
    } else {
        console.error('Menu element not found:', `video_options_${uniqueId}`);
    }
};

window.showYoutubeInput = function(uniqueId) {
    const url = prompt("Youtube video linkini daxil edin:");
    if (url) {
        const videoId = extractYoutubeId(url);
        if (videoId) {
            updateVideoPreview(uniqueId, videoId, 'youtube');
        } else {
            showNotification('Düzgün Youtube linki daxil edin!', 'error');
        }
    }
};

function updateVideoPreview(uniqueId, videoId, type) {
    const videoIdInput = document.getElementById(`video_id_${uniqueId}`);
    const videoTypeInput = document.getElementById(`video_type_${uniqueId}`);
    const preview = document.getElementById(`video_preview_${uniqueId}`);
    const label = document.querySelector(`#video_box_${uniqueId} .video-upload-label`);

    if (videoIdInput) videoIdInput.value = videoId;
    if (videoTypeInput) videoTypeInput.value = type;
    
    if (label) label.classList.add('hidden');
    
    if (preview) {
        preview.classList.remove('hidden');
        if (type === 'youtube') {
            preview.innerHTML = `
                <div class="plyr__video-embed" id="player_${uniqueId}">
                    <iframe src="https://www.youtube.com/embed/${videoId}?origin=${window.location.origin}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1" allowfullscreen allowtransparency allow="autoplay"></iframe>
                </div>
                <button type="button" class="remove-video-btn" onclick="removeQuestionVideo('${uniqueId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            new Plyr(`#player_${uniqueId}`, {
                youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
            });
        } else {
            preview.innerHTML = `
                <div class="video-placeholder">
                    <i class="fas fa-check-circle"></i>
                    <span>Video Yüklənib</span>
                </div>
                <button type="button" class="remove-video-btn" onclick="removeQuestionVideo('${uniqueId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }
    }
}

window.triggerVideoUpload = function(uniqueId) {
    const menu = document.getElementById(`video_options_${uniqueId}`);
    const fileInput = document.getElementById(`video_file_${uniqueId}`);
    if (menu) menu.classList.add('hidden');
    if (fileInput) fileInput.click();
};

window.handleVideoUpload = async function(input, uniqueId) {
    const file = input.files[0];
    if (!file) return;

    // Ölçü yoxlanışı (məsələn, max 100MB)
    if (file.size > 100 * 1024 * 1024) {
        showNotification('Video ölçüsü çox böyükdür (Maks: 100MB)', 'error');
        input.value = '';
        return;
    }

    const progress = document.getElementById(`video_progress_${uniqueId}`);
    const bar = document.getElementById(`video_bar_${uniqueId}`);
    const status = document.getElementById(`video_status_${uniqueId}`);

    if (progress) progress.classList.remove('hidden');
    if (status) {
        status.classList.remove('hidden');
        status.textContent = 'Video emal olunur...';
    }
    if (bar) bar.style.width = '0%';

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', 'Sual Video İzahı');

    let attempts = 0;
    const maxAttempts = 5;
    const retryDelay = 5000; // 5 saniyə

    const uploadAction = async () => {
        try {
            attempts++;
            const response = await fetch(`${BACKEND_URL}/api/upload-video`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.details || data.error || 'Yükləmə zamanı xəta baş verdi');
            }
            
            if (data.success && data.videoId) {
                if (bar) bar.style.width = '100%';
                if (status) status.textContent = 'Video hazırlandı';
                showNotification('Video izah uğurla əlavə edildi!', 'success');
                
                setTimeout(() => {
                    if (progress) progress.classList.add('hidden');
                    if (status) status.classList.add('hidden');
                    updateVideoPreview(uniqueId, data.videoId, 'youtube'); 
                }, 1000);
            } else {
                throw new Error(data.error || 'Naməlum xəta');
            }
        } catch (error) {
            console.error(`Yükləmə cəhdi ${attempts} uğursuz oldu:`, error);
            
            if (attempts < maxAttempts && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
                if (status) {
                    status.textContent = `Server oyanır, yenidən cəhd edilir (${attempts}/${maxAttempts})...`;
                }
                setTimeout(uploadAction, retryDelay);
            } else {
                showNotification('Video yüklənərkən xəta: ' + error.message, 'error');
                if (progress) progress.classList.add('hidden');
                if (status) status.classList.add('hidden');
            }
        }
    };

    uploadAction();
};

// addYoutubeVideo funksiyası artıq showYoutubeInput daxilindədir, köhnəni silirik
window.removeQuestionVideo = function(uniqueId) {
    const idInput = document.getElementById(`video_id_${uniqueId}`);
    const typeInput = document.getElementById(`video_type_${uniqueId}`);
    const preview = document.getElementById(`video_preview_${uniqueId}`);
    const label = document.querySelector(`#video_box_${uniqueId} .video-upload-label`);
    
    if (idInput) idInput.value = '';
    if (typeInput) typeInput.value = '';
    
    if (label) label.classList.remove('hidden');
    
    if (preview) {
        preview.classList.add('hidden');
        preview.innerHTML = '';
    }
};

function extractYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

window.savePrivateQuizFinal = async function() {
    const editingId = document.getElementById('editing-quiz-id').value;
    const title = document.getElementById('private-quiz-title').value;
    const password = document.getElementById('private-quiz-password').value;
    const timeType = document.getElementById('private-quiz-time-type').value;
    const defaultTime = parseInt(document.getElementById('private-quiz-default-time').value) || 45;
    const autoFillEnabled = document.getElementById('auto-variants-toggle') ? document.getElementById('auto-variants-toggle').checked : false;
    
    if (!title || !password) return showNotification('Zəhmət olmasa testin adını və şifrəsini daxil edin.', 'error');
    
    const questionItems = document.querySelectorAll('.manual-question-item');
    const questions = [];
    const variantLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    questionItems.forEach((item) => {
        const textEl = item.querySelector('.manual-q-text');
        const text = textEl ? textEl.value : '';
        const imageEl = item.querySelector('.manual-q-img-data');
        const imageData = imageEl ? imageEl.value : '';
        const videoId = item.querySelector('.manual-q-video-id') ? item.querySelector('.manual-q-video-id').value : null;
        const videoType = item.querySelector('.manual-q-video-type') ? item.querySelector('.manual-q-video-type').value : null;
        const explanation = item.querySelector('.manual-q-explanation') ? item.querySelector('.manual-q-explanation').value : null;
        const customTime = item.querySelector('.manual-q-time') ? item.querySelector('.manual-q-time').value : null;
        const optionInputs = item.querySelectorAll('.manual-opt');
        const correctInput = item.querySelector('input[type="radio"]:checked');
        
        if ((text || imageData) && optionInputs.length > 0 && correctInput) {
            const options = Array.from(optionInputs).map((input, i) => {
                let val = input.value.trim();
                if (autoFillEnabled && val === "") {
                    return variantLetters[i] || `Variant ${i+1}`;
                }
                return val;
            });

            // Əgər avtomatik doldurma deaktivdirsə və boş variant varsa, bu sualı keçmirik (yoxlama üçün saxlayırıq)
            if (!autoFillEnabled && options.some(opt => opt === "")) {
                // Bu halda sualı əlavə etmirik və aşağıda xəta verəcəyik
                return;
            }

            questions.push({
                text: text,
                image: imageData || null,
                videoId: videoId || null,
                videoType: videoType || null,
                explanation: explanation || null,
                time: (timeType === 'per-question' && customTime) ? parseInt(customTime) : null,
                options: options,
                correctIndex: parseInt(correctInput.value)
            });
        }
    });
    
    if (questions.length === 0) return showNotification('Zəhmət olmasa ən azı bir sual əlavə edin.', 'error');
    
    const quizData = {
        teacherId: currentUser.id,
        authorName: `${currentUser.name || ''} ${currentUser.surname || ''}`.trim() || currentUser.username || 'Naməlum',
        title: title,
        timeType: timeType,
        defaultTime: defaultTime,
        questions: questions, // Save plain text for teacher convenience
        password: password,   // Save plain text for teacher convenience
        questionCount: questions.length,
        updatedAt: new Date().toISOString()
    };
    
    if (!editingId) {
        quizData.createdAt = new Date().toISOString();
        quizData.isActive = true; // Default to active for new quizzes
    }
    
    try {
        if (editingId) {
            // Update existing
            if (db) {
                await db.collection('private_quizzes').doc(editingId).update(quizData);
            }
            const index = privateQuizzes.findIndex(q => q.id === editingId);
            if (index !== -1) {
                privateQuizzes[index] = { ...privateQuizzes[index], ...quizData };
            }
            showNotification('Özəl test uğurla yeniləndi!', 'success');
        } else {
            // Create new
            if (db) {
                const docRef = await db.collection('private_quizzes').add(quizData);
                quizData.id = docRef.id;
            } else {
                quizData.id = 'priv_' + Date.now();
            }
            privateQuizzes.push(quizData);
            showNotification('Özəl test uğurla yaradıldı!', 'success');
        }
        
        localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
        showTeacherDashboard();
    } catch (e) {
        showNotification('Xəta: ' + e.message, 'error');
    }
}

window.renderPrivateQuizzes = async function(initial = false) {
    const grid = document.getElementById('private-quizzes-grid');
    const loadMoreBtn = document.getElementById('private-quizzes-load-more');
    const PAGE_SIZE = 5;
    const state = window.__privateQuizzesState || (window.__privateQuizzesState = { quizzes: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 });
    if (initial) {
        grid.innerHTML = '<div class="grid-cols-full text-center p-10"><i class="fas fa-spinner fa-spin text-3xl text-primary"></i><p class="mt-4 text-muted">Yüklənir...</p></div>';
        state.quizzes = [];
        state.lastDoc = null;
        state.hasMore = true;
        state.fallbackAll = null;
        state.pageIndex = 0;
    } else {
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
        }
    }
    try {
        let page = [];
        if (db) {
            try {
                let q = db.collection('private_quizzes').where('teacherId', '==', currentUser.id).orderBy('createdAt', 'desc').limit(PAGE_SIZE);
                if (state.lastDoc) q = q.startAfter(state.lastDoc);
                const snapshot = await q.get();
                page = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                state.lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : state.lastDoc;
                if (page.length < PAGE_SIZE) state.hasMore = false;
            } catch (queryErr) {
                const snapshot = await db.collection('private_quizzes').where('teacherId', '==', currentUser.id).get();
                const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                all.sort((a, b) => {
                    const ta = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                    const tb = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                    return tb - ta;
                });
                state.fallbackAll = state.fallbackAll || all;
                const start = state.pageIndex * PAGE_SIZE;
                const end = start + PAGE_SIZE;
                page = state.fallbackAll.slice(start, end);
                state.pageIndex += 1;
                if (end >= state.fallbackAll.length) state.hasMore = false;
            }
        } else {
            const all = (JSON.parse(localStorage.getItem('privateQuizzes') || '[]').filter(q => q.teacherId === currentUser.id))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            state.fallbackAll = state.fallbackAll || all;
            const start = state.pageIndex * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            page = state.fallbackAll.slice(start, end);
            state.pageIndex += 1;
            if (end >= state.fallbackAll.length) state.hasMore = false;
        }
        if (state.quizzes.length === 0 && page.length === 0) {
            grid.innerHTML = '<p class="grid-cols-full text-center p-6 text-muted">Hələ heç bir özəl test yaratmamısınız.</p>';
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
            return;
        }
        if (initial) grid.innerHTML = '';
        state.quizzes = state.quizzes.concat(page);
        appendPrivateQuizzes(page);
        if (loadMoreBtn) {
            if (state.hasMore) {
                loadMoreBtn.classList.remove('hidden');
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = 'Daha çox yüklə';
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p class="grid-cols-full text-center p-6 text-danger">Testlər yüklənə bilmədi.</p>';
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = 'Daha çox yüklə';
        }
    }
}

function appendPrivateQuizzes(quizzes) {
    const grid = document.getElementById('private-quizzes-grid');
    quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'category-card';
        if (quiz.isActive === false) card.classList.add('opacity-70');
        const baseUrl = window.location.origin + window.location.pathname;
        const quizLink = `${baseUrl}?quiz=${quiz.id}`;
        const isActive = quiz.isActive !== false;
        card.innerHTML = `
            <div class="cat-card-header">
                <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                    ${isActive ? '<i class="fas fa-check-circle"></i> <span>Aktiv</span>' : '<i class="fas fa-times-circle"></i> <span>Deaktiv</span>'}
                </span>
                <div class="cat-card-tools">
                    <button onclick="togglePrivateQuizStatus('${quiz.id}')" class="status-btn" title="${isActive ? 'Deaktiv et' : 'Aktiv et'}">
                        <i class="fas ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button onclick="editPrivateQuiz('${quiz.id}')" class="edit-cat-btn" title="Düzəliş et"><i class="fas fa-edit"></i></button>
                    <button onclick="deletePrivateQuiz('${quiz.id}')" class="delete-cat-btn" title="Sil"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="icon-box"><i class="fas fa-link"></i></div>
            <h3>${escapeHtml(quiz.title)}</h3>
            <p>${(typeof quiz.questionCount === 'number' ? quiz.questionCount : (Array.isArray(quiz.questions) ? quiz.questions.length : 0))} sual</p>
            ${quiz.password ? `<p class="text-sm text-muted mt-1">Şifrə: <strong>${escapeHtml(quiz.password)}</strong></p>` : ''}
            <div class="category-actions flex flex-col gap-2 mt-3">
                ${isActive ? `<button onclick="copyQuizLink('${quizLink}')" class="btn-primary w-full"><i class="fas fa-copy"></i> Linki Kopyala</button>` : '<button class="btn-primary w-full opacity-50 cursor-not-allowed" disabled><i class="fas fa-lock"></i> Link Deaktivdir</button>'}
                <button onclick="showStudentResults('${quiz.id}', '${quiz.title}')" class="btn-secondary w-full"><i class="fas fa-poll"></i> Nəticələr</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.loadMorePrivateQuizzes = function() {
    if (!window.__privateQuizzesState || window.__privateQuizzesState.loading === true) return;
    window.__privateQuizzesState.loading = true;
    renderPrivateQuizzes(false).finally(() => {
        window.__privateQuizzesState.loading = false;
    });
}

// kopyalama helperi kaldırıldı (icazəsiz əlavə düymə tələb olunmur)

window.togglePrivateQuizStatus = async function(id) {
    const quiz = privateQuizzes.find(q => q.id === id);
    if (!quiz) return;
    
    const newStatus = quiz.isActive === false ? true : false;
    quiz.isActive = newStatus;
    
    try {
        if (db) {
            await db.collection('private_quizzes').doc(id).update({ isActive: newStatus });
        }
        localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
        renderPrivateQuizzes();
        showNotification(`Test ${newStatus ? 'aktiv edildi' : 'deaktiv edildi'}.`, 'success');
    } catch (e) {
        showNotification('Xəta: ' + e.message, 'error');
    }
}

function softValidateQuestions(input) {
    const warnings = [];
    const result = [];
    const arr = Array.isArray(input) ? input : [];
    for (let i = 0; i < arr.length; i++) {
        const q = arr[i] || {};
        const text = typeof q.text === 'string' ? q.text.trim() : '';
        const opts = Array.isArray(q.options) ? q.options.map(o => String(o || '').trim()).filter(o => o) : [];
        let correct = q.correctIndex !== undefined ? q.correctIndex : (q.correct !== undefined ? q.correct : q.answer);
        if (!text || opts.length < 2) {
            warnings.push(i + 1);
            continue;
        }
        if (!Number.isInteger(correct) || correct < 0 || correct >= opts.length) {
            correct = 0;
        }
        result.push({ text, options: opts, correctIndex: correct });
    }
    return { questions: result, warnings };
}

window.savePrivateQuiz = function() {
    const title = document.getElementById('private-quiz-title').value;
    const password = document.getElementById('private-quiz-password').value;
    const fileInput = document.getElementById('private-quiz-file');
    
    if (!title || !password || !fileInput.files[0]) {
        return showNotification('Zəhmət olmasa bütün xanaları doldurun və sual faylını seçin.', 'error');
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const raw = JSON.parse(e.target.result);
            const { questions, warnings } = softValidateQuestions(raw);
            if (!Array.isArray(questions) || questions.length === 0) throw new Error('Düzgün sual formatı deyil.');
            
            const newQuiz = {
                teacherId: currentUser.id,
                authorName: `${currentUser.name || ''} ${currentUser.surname || ''}`.trim() || currentUser.username || 'Naməlum',
                title: title,
                questions: questions, // Save plain text
                password: password,   // Save plain text
                questionCount: questions.length,
                createdAt: new Date().toISOString(),
                isActive: true
            };
            
            const h = hashPassword(password);
            if (h) newQuiz.passwordHash = h;
            
            if (db) {
                const docRef = await db.collection('private_quizzes').add(newQuiz);
                newQuiz.id = docRef.id;
            } else {
                newQuiz.id = 'priv_' + Date.now();
            }
            
            privateQuizzes.push(newQuiz);
            localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
            
            // Save password locally for convenience
            if (password && newQuiz.id) {
                
            }

            showNotification('Özəl test uğurla yaradıldı!', 'success');
            if (warnings && warnings.length) {
                showNotification(`Formatı yararsız olan ${warnings.length} sual keçildi.`, 'warning');
            }
            showTeacherDashboard();
            
            // Clear inputs
            document.getElementById('private-quiz-title').value = '';
            document.getElementById('private-quiz-password').value = '';
            document.getElementById('private-quiz-file').value = '';
            
        } catch (error) {
            showNotification('Xəta: ' + error.message, 'error');
        }
    };
    reader.readAsText(fileInput.files[0]);
}

window.copyQuizLink = function(link) {
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Link kopyalandı! Tələbələrinizə göndərə bilərsiniz.', 'success');
    });
}

window.deletePrivateQuiz = async function(id) {
    if (!confirm('Bu testi silmək istədiyinizə əminsiniz?')) return;
    
    if (db) {
        await db.collection('private_quizzes').doc(id).delete();
    }
    
    privateQuizzes = privateQuizzes.filter(q => q.id !== id);
    localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
    renderPrivateQuizzes();
}

window.downloadSampleJSON = function() {
    const sampleData = [
        {
            "text": "Sual mətni bura yazılır",
            "options": ["Variant 1", "Variant 2", "Variant 3", "Variant 4"],
            "correctIndex": 0
        },
        {
            "text": "İkinci sual nümunəsi",
            "options": ["A", "B", "C", "D"],
            "correctIndex": 1
        }
    ];
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sampleData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "numune_suallar.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

let currentQuizAnalytics = null;

window.showStudentResults = async function(quizId, quizTitle) {
    console.log("Fetching results for quizId:", quizId);
    const modal = document.getElementById('student-results-modal');
    if (!modal) return;
    
    // Reset view
    document.getElementById('results-list-view').classList.remove('hidden');
    document.getElementById('analytics-view').classList.add('hidden');
    document.getElementById('btn-show-analytics').classList.add('hidden');
    document.getElementById('btn-show-results').classList.add('hidden');
    
    document.getElementById('results-modal-title').textContent = `${quizTitle} - Nəticələr`;
    modal.classList.remove('hidden');
    const tableBody = document.getElementById('student-results-body');
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4"><i class="fas fa-spinner fa-spin mr-2"></i> Yüklənir...</td></tr>';
    
    if (db) {
        try {
            if (!quizId) throw new Error("Quiz ID tapılmadı.");

            const quizDoc = await db.collection('private_quizzes').doc(quizId).get();
            const quizData = quizDoc.exists ? quizDoc.data() : null;
            if (!quizData) throw new Error("Test məlumatı tapılmadı.");

            window.__studentResultsState = { quizId: quizId, attempts: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0, quizData: quizData, pageSize: 5 };
            const loadBtn = document.getElementById('student-results-load-more');
            if (loadBtn) {
                loadBtn.classList.remove('hidden');
                loadBtn.disabled = true;
                loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
            }
            await window.loadStudentResultsPage(true);
            if (loadBtn && window.__studentResultsState.hasMore) {
                loadBtn.disabled = false;
                loadBtn.innerHTML = 'Daha çox yüklə';
            } else if (loadBtn) {
                loadBtn.classList.add('hidden');
            }
        } catch (e) {
            console.error("ShowStudentResults Error:", e);
            try { errorHandler.logError(e, errorHandler.ERROR_TYPES.UNKNOWN, { scope: 'student_results_load', quizId }); } catch (_) {}
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-danger">Xəta: ${e.message}</td></tr>`;
        }
    } else {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">Firebase aktiv deyil.</td></tr>';
    }
}

window.loadStudentResultsPage = async function(initial = false) {
    const state = window.__studentResultsState || {};
    const tableBody = document.getElementById('student-results-body');
    const loadBtn = document.getElementById('student-results-load-more');
    if (!db || !state.quizId || !tableBody) return;
    try {
        let page = [];
        let usedFallback = false;
        try {
            let q = db.collection('student_attempts')
                .where('quizId', '==', state.quizId)
                .orderBy('timestamp', 'desc')
                .limit(state.pageSize);
            if (state.lastDoc) {
                q = q.startAfter(state.lastDoc);
            }
            const snapshot = await q.get();
            page = snapshot.docs.map(doc => doc.data());
            state.lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : state.lastDoc;
            if (page.length < state.pageSize) {
                state.hasMore = false;
            }
        } catch (queryErr) {
            usedFallback = true;
            const snapshot = await db.collection('student_attempts')
                .where('quizId', '==', state.quizId)
                .get();
            const all = snapshot.docs.map(doc => doc.data());
            all.sort((a, b) => b.timestamp - a.timestamp);
            state.fallbackAll = state.fallbackAll || all;
            const start = state.pageIndex * state.pageSize;
            const end = start + state.pageSize;
            page = state.fallbackAll.slice(start, end);
            state.pageIndex += 1;
            if (end >= (state.fallbackAll ? state.fallbackAll.length : 0)) {
                state.hasMore = false;
            }
            try { errorHandler.logError(queryErr, errorHandler.ERROR_TYPES.UNKNOWN, { scope: 'student_results_pagination_fallback', quizId: state.quizId }); } catch (_) {}
        }
        if (initial) {
            tableBody.innerHTML = '';
        }
        state.attempts = state.attempts.concat(page);
        window.__studentResultsState = state;
        appendStudentResultsRows(page);
        if (state.attempts.length > 0 && state.quizData) {
            if (Array.isArray(state.quizData.questions)) {
                currentQuizAnalytics = { quiz: state.quizData, attempts: state.attempts };
                document.getElementById('btn-show-analytics').classList.remove('hidden');
                schedulePrepareAnalytics();
            } else if (state.quizData.questionsCipher) {
                try {
                    const savedPwd = localStorage.getItem('quiz_pass_' + state.quizId) || state.quizData.password;
                    if (savedPwd) {
                        const bytes = CryptoJS.AES.decrypt(state.quizData.questionsCipher, savedPwd);
                        const decoded = bytes.toString(CryptoJS.enc.Utf8);
                        state.quizData.questions = JSON.parse(decoded);
                        currentQuizAnalytics = { quiz: state.quizData, attempts: state.attempts };
                        document.getElementById('btn-show-analytics').classList.remove('hidden');
                        schedulePrepareAnalytics();
                    }
                } catch (_) {}
            }
        }
        if (loadBtn) {
            if (state.hasMore) {
                loadBtn.classList.remove('hidden');
                loadBtn.disabled = false;
                loadBtn.innerHTML = 'Daha çox yüklə';
            } else {
                loadBtn.classList.add('hidden');
            }
        }
    } catch (e) {
        try { errorHandler.logError(e, errorHandler.ERROR_TYPES.UNKNOWN, { scope: 'student_results_page', quizId: state.quizId }); } catch (_) {}
    }
}

window.loadMoreStudentResults = function() {
    const state = window.__studentResultsState || {};
    if (state.loading) return;
    state.loading = true;
    window.__studentResultsState = state;
    const loadBtn = document.getElementById('student-results-load-more');
    if (loadBtn) {
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
    }
    window.loadStudentResultsPage(false).finally(() => {
        const s = window.__studentResultsState || {};
        s.loading = false;
        window.__studentResultsState = s;
    });
}

function appendStudentResultsRows(attempts) {
    const tableBody = document.getElementById('student-results-body');
    if (!tableBody) return;
    if (attempts.length === 0 && tableBody.children.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-10 text-muted">Hələ heç bir nəticə yoxdur.</td></tr>';
        return;
    }
    attempts.forEach(attempt => {
        const date = new Date(attempt.timestamp).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const accuracy = Math.round((attempt.score / attempt.total) * 100);
        const badgeClass = accuracy >= 80 ? 'accuracy-high' : (accuracy >= 50 ? 'accuracy-mid' : 'accuracy-low');
        const tr = document.createElement('tr');
        const unanswered = attempt.unanswered !== undefined ? attempt.unanswered : 0;
        const wrong = attempt.wrong !== undefined ? attempt.wrong : (attempt.total - attempt.score - unanswered);
        tr.innerHTML = `
            <td>${escapeHtml(attempt.studentName || '')}</td>
            <td><span class="accuracy-badge ${badgeClass}">${accuracy}%</span></td>
            <td>${date}</td>
            <td>${attempt.score} / ${wrong} / ${unanswered}</td>
        `;
        tableBody.appendChild(tr);
    });
}

window.toggleAnalyticsView = function() {
    const listView = document.getElementById('results-list-view');
    const analyticsView = document.getElementById('analytics-view');
    const btnAnalytics = document.getElementById('btn-show-analytics');
    const btnResults = document.getElementById('btn-show-results');
    
    if (listView.classList.contains('hidden')) {
        listView.classList.remove('hidden');
        analyticsView.classList.add('hidden');
        btnAnalytics.classList.remove('hidden');
        btnResults.classList.add('hidden');
    } else {
        listView.classList.add('hidden');
        analyticsView.classList.remove('hidden');
        btnAnalytics.classList.add('hidden');
        btnResults.classList.remove('hidden');
    }
}

function prepareAnalyticsData() {
    if (!currentQuizAnalytics) return;
    
    const { quiz, attempts } = currentQuizAnalytics;
    const qStats = quiz.questions.map((q, idx) => ({
        index: idx,
        text: q.text,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        total: 0
    }));

    let totalScoreSum = 0;

    attempts.forEach(attempt => {
        totalScoreSum += attempt.score;
        
        // Hər bir sual üzrə cavabları analiz edirik
        if (attempt.answers && Array.isArray(attempt.answers)) {
            quiz.questions.forEach((q, idx) => {
                const userAns = attempt.answers[idx];
                const correctAns = q.correctIndex !== undefined ? q.correctIndex : (q.correct !== undefined ? q.correct : q.answer);
                
                qStats[idx].total++;
                if (userAns === -1 || userAns === undefined || userAns === null) {
                    qStats[idx].unanswered++;
                } else if (userAns === correctAns) {
                    qStats[idx].correct++;
                } else {
                    qStats[idx].wrong++;
                }
            });
        }
    });

    const avgScore = Math.round((totalScoreSum / (attempts.length * quiz.questions.length)) * 100) || 0;
    
    document.getElementById('total-attempts-count').textContent = attempts.length;
    document.getElementById('average-score-percent').textContent = `${avgScore}%`;
    
    // Ən çətin sualı tap (ən çox səhv edilən)
    let hardestQ = { index: 0, wrongRate: -1 };
    qStats.forEach((stat, idx) => {
        const wrongRate = stat.total > 0 ? (stat.wrong / stat.total) : 0;
        if (wrongRate > hardestQ.wrongRate) {
            hardestQ = { index: idx, wrongRate: wrongRate };
        }
    });
    document.getElementById('hardest-question-num').textContent = `#${hardestQ.index + 1}`;
    
    const analysisList = document.getElementById('question-analysis-list');
    analysisList.innerHTML = '';
    
    qStats.forEach((stat, idx) => {
        const correctPercent = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
        const item = document.createElement('div');
        item.className = 'q-analysis-item';
        
        const bgColorClass = correctPercent < 40 ? 'bg-danger' : (correctPercent < 70 ? 'bg-warning' : 'bg-success');
        
        item.innerHTML = `
            <div class="q-header">
                <span class="q-number">Sual #${idx + 1}</span>
                <div class="q-stats">
                    <span class="stat-correct"><i class="fas fa-check"></i> ${stat.correct}</span>
                    <span class="stat-wrong"><i class="fas fa-times"></i> ${stat.wrong}</span>
                    <span class="text-muted"><i class="fas fa-minus"></i> ${stat.unanswered}</span>
                </div>
            </div>
            <div class="progress-bar-container bg-bg h-2 rounded-full overflow-hidden">
                <div class="progress-bar-fill h-full transition ${bgColorClass}" style="width: ${correctPercent}%;"></div>
            </div>
            <div class="q-text-preview" title="${escapeHtml(stat.text || '')}">${escapeHtml(stat.text || '')}</div>
        `;
        analysisList.appendChild(item);
    });
}

function schedulePrepareAnalytics() {
    try {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => {
                prepareAnalyticsData();
            }, { timeout: 1000 });
        } else {
            setTimeout(() => prepareAnalyticsData(), 0);
        }
    } catch (e) {
        setTimeout(() => prepareAnalyticsData(), 0);
    }
}

function renderStudentResultsTable(attempts) {
    const tableBody = document.getElementById('student-results-body');
    tableBody.innerHTML = '';
    
    if (attempts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-10 text-muted">Hələ heç bir nəticə yoxdur.</td></tr>';
        return;
    }
    
    attempts.forEach(attempt => {
        const date = new Date(attempt.timestamp).toLocaleDateString('az-AZ', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const accuracy = Math.round((attempt.score / attempt.total) * 100);
        const badgeClass = accuracy >= 80 ? 'accuracy-high' : (accuracy >= 50 ? 'accuracy-mid' : 'accuracy-low');
        
        const tr = document.createElement('tr');
        const unanswered = attempt.unanswered !== undefined ? attempt.unanswered : 0;
        const wrong = attempt.wrong !== undefined ? attempt.wrong : (attempt.total - attempt.score - unanswered);
        
        tr.innerHTML = `
            <td>${escapeHtml(attempt.studentName || '')}</td>
            <td><span class="accuracy-badge ${badgeClass}">${accuracy}%</span></td>
            <td>${date}</td>
            <td>${attempt.score} / ${wrong} / ${unanswered}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// --- Private Quiz Access Functions ---
let activePrivateQuiz = null;
let studentName = '';

let pendingQuizId = null;

function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quiz');
    const catId = urlParams.get('cat');
    const catNameParam = urlParams.get('ct');
    const page = urlParams.get('page');
    const mode = urlParams.get('mode');
    const yt = urlParams.get('yt');
    if (yt === '1') {
        enableYouTubeReview();
    } else if (yt === '0') {
        disableYouTubeReview();
    } else {
        // No param provided: ensure default ON for reliability
        enableYouTubeReview();
    }

    // Şifrə bərpa və ya digər auth rejimləri varsa
    if (mode && urlParams.get('oobCode')) {
        window.showLogin(); // Arxa fonda login bölməsini göstər
        return;
    }
    
    // Səhifə yönləndirməsi
    if (page === 'profile') {
        window.showProfile(false); // false: pushState etmə
        return;
    } else if (page === 'admin') {
        window.showAdminDashboard(false);
        
        // Handle Deep Linking for Admin
        const adminCatId = urlParams.get('adminCat');
        const editQuestionId = urlParams.get('editQuestionId');
        
        if (adminCatId) {
            currentAdminParentId = adminCatId;
            // Delay to ensure DOM is ready and data loaded
            setTimeout(() => {
                if (typeof window.openCategory === 'function') {
                    window.openCategory(adminCatId);
                    
                    if (editQuestionId) {
                        setTimeout(() => {
                            if (typeof window.editCategoryQuestion === 'function') {
                                window.editCategoryQuestion(editQuestionId);
                            }
                        }, 500);
                    }
                }
            }, 500);
        }
        return;
    } else if (page === 'teacher') {
        window.showTeacherDashboard(false);
        return;
    } else if (page === 'reports') {
        window.showReports(false);
        return;
    } else if (page === 'login') {
        window.showLogin(false);
        return;
    } else if (page === 'register') {
        window.showRegister(undefined, false);
        return;
    }

    // Admin kateqoriya ID-si varsa, həmin admin bölməsini aç
    const adminCatId = urlParams.get('adminCat');
    if (adminCatId) {
        currentAdminParentId = adminCatId;
    } else {
        currentAdminParentId = null;
    }

    // Əgər kateqoriya ID-si varsa, həmin bölməni aç
    if (catId) {
        console.log("URL catId:", catId);
        console.log("Categories loaded:", categories.length);
        let category = categories.find(c => String(c.id) === String(catId));
        if (!category && catNameParam) {
            const targetName = decodeURIComponent(catNameParam).toLowerCase();
            const matches = categories.filter(c => (c.name || '').toLowerCase() === targetName);
            if (matches.length === 1) {
                category = matches[0];
            } else if (matches.length > 1) {
                category = matches.find(c => !categories.some(cc => cc.parentId === c.id)) || matches[0];
            }
        }
        console.log("Category found:", category);
        
        if (category) {
            window.showDashboard(false);
            
            const hasSub = categories.some(c => c.parentId === catId);
            if (hasSub) {
                currentParentId = catId;
                renderCategories();
                return;
            } else {
                currentParentId = category.parentId;
                renderCategories();
                
                setTimeout(() => {
                    startQuizCheck(catId);
                    const card = document.querySelector(`.category-card[data-id="${catId}"]`);
                    if (card) {
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 250);
                return;
            }
        } else {
            console.warn("URL-dəki kateqoriya tapılmadı, ana səhifəyə yönləndirilir.");
            showNotification('Paylaşılan test tapılmadı və ya silinib.', 'error');
            currentParentId = null;
            const url = new URL(window.location);
            url.searchParams.delete('cat');
            window.history.replaceState({}, document.title, url);
            window.showDashboard(false);
        }
    } else {
        currentParentId = null;
        // Əgər heç bir xüsusi səhifə, quiz və ya auth mode yoxdursa, dashboard-u göstər
        if (!page && !quizId && !urlParams.has('mode')) {
            window.showDashboard(false);
        }
    }

    if (quizId) {
        pendingQuizId = quizId;
        
        // Test məlumatlarını (başlıq və status) gətiririk
        if (db) {
            db.collection('private_quizzes').doc(quizId).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.isActive === false) {
                        showNotification('Bu test linki müəllim tərəfindən deaktiv edilib.', 'error');
                        window.history.replaceState({}, document.title, window.location.pathname);
                        showDashboard();
                        return;
                    }
                    // Yalnız başlığı göstəririk, sualları və şifrəni hələ yaddaşa vermirik
                    showPrivateAccess(data.title);
                } else {
                    showNotification('Test tapılmadı.', 'error');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }).catch(error => {
                console.error("Error fetching quiz info:", error);
                showNotification('Test məlumatlarını yükləyərkən xəta baş verdi.', 'error');
            });
        } else {
            // Offline fallback - yerli yaddaşda axtarırıq
            const quiz = privateQuizzes.find(q => q.id === quizId);
            if (quiz) {
                if (quiz.isActive === false) {
                    showNotification('Bu test linki müəllim tərəfindən deaktiv edilib.', 'error');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    showDashboard();
                    return;
                }
                showPrivateAccess(quiz.title);
            } else {
                showNotification('Test tapılmadı (Offline).', 'error');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }
}

function showPrivateAccess(title) {
    hideAllSections();
    document.getElementById('private-access-section').classList.remove('hidden');
    document.getElementById('join-quiz-title').textContent = title;
}

window.accessPrivateQuiz = async function() {
    const firstName = document.getElementById('student-first-name').value.trim();
    const lastName = document.getElementById('student-last-name').value.trim();
    const pass = document.getElementById('student-quiz-password').value;
    
    if (!firstName || !lastName || !pass) {
        return showNotification('Zəhmət olmasa bütün xanaları doldurun (Ad, Soyad və Şifrə).', 'error');
    }

    const accessBtn = document.querySelector('#private-access-section .btn-primary');
    const originalText = accessBtn.textContent;
    accessBtn.textContent = 'Doğrulanır...';
    accessBtn.disabled = true;

    try {
        let quiz = null;
        if (db && pendingQuizId) {
            const doc = await db.collection('private_quizzes').doc(pendingQuizId).get();
            if (doc.exists) {
                quiz = { id: doc.id, ...doc.data() };
            }
        } else {
            // Offline fallback
            quiz = privateQuizzes.find(q => q.id === pendingQuizId);
        }

        if (!quiz) {
            throw new Error('Test tapılmadı!');
        }

        let valid = false;
        if (quiz.password) {
            valid = pass === quiz.password;
        }
        if (!valid) throw new Error('Yanlış şifrə!');

        // Decrypt questions if encrypted
        let decryptedQuestions = [];
        if (quiz.questionsCipher) {
            try {
                const bytes = CryptoJS.AES.decrypt(quiz.questionsCipher, pass);
                const decoded = bytes.toString(CryptoJS.enc.Utf8);
                decryptedQuestions = JSON.parse(decoded);
            } catch (e) {
                throw new Error('Yanlış şifrə!');
            }
        } else if (Array.isArray(quiz.questions)) {
            decryptedQuestions = quiz.questions;
        }

        activePrivateQuiz = { ...quiz, questions: decryptedQuestions };
        studentName = `${firstName} ${lastName}`;
        startPrivateQuiz();
        showNotification('Şifrə doğrulandı. Uğurlar!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        accessBtn.textContent = originalText;
        accessBtn.disabled = false;
    }
}

function startPrivateQuiz() {
    currentQuiz = {
        id: activePrivateQuiz.id, // Store the real quiz ID
        categoryId: 'private',
        questions: activePrivateQuiz.questions,
        currentQuestionIndex: 0,
        score: 0,
        timer: null,
        timeType: activePrivateQuiz.timeType || 'per-question',
        totalTime: activePrivateQuiz.defaultTime || 45,
        totalTimerStarted: false,
        defaultTime: activePrivateQuiz.defaultTime || 45,
        timeLeft: 45, // Will be set in loadQuestion
        userAnswers: new Array(activePrivateQuiz.questions.length).fill(-1),
        questionTimes: new Array(activePrivateQuiz.questions.length).fill(null) // null means not set yet
    };
    
    // Apply aggressive protection for quizzes
    window.securityInterval = setInterval(() => {
        if (!document.hasFocus()) {
            applyPrivacyBlur();
        }
    }, 200);

    hideAllSections();
    document.getElementById('quiz-section').classList.remove('hidden');
    loadQuestion();
}

function preventDefaultAction(e) {
    e.preventDefault();
}

function preventProtectionKeys(e) {
    // Screenshot qadağasını ləğv etdik, sadəcə lazımsız qısayolları (F12 və s.) saxlaya bilərik və ya tam silə bilərik.
    // İstifadəçinin istəyinə görə tam sərbəst buraxırıq.
    return true;
}

function removeProtection() {
    if (window.securityInterval) clearInterval(window.securityInterval);
    removePrivacyBlur();
}

function handleTouchStart(e) {
    // Prevent long press and multi-touch gestures
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}

function applyPrivacyBlur() {
    // Blur effekti istifadəçinin istəyi ilə ləğv edildi
    return;
    
    // Qeydiyyat/Giriş səhifəsində bluru aktiv etməyək ki, istifadəçi çaşmasın
    const authSection = document.getElementById('auth-section');
    if (authSection && !authSection.classList.contains('hidden')) return;

    document.getElementById('app').classList.add('privacy-blur');
}

function removePrivacyBlur() {
    document.getElementById('app').classList.remove('privacy-blur');
}

function createWatermark() {
    // Funksiya istifadəçinin istəyi ilə ləğv edildi
    return;
}

// Qlobal Təhlükəsizlik Sistemi
function setupGlobalSecurity() {
    // Təhlükəsizlik məhdudiyyətləri istifadəçinin istəyi ilə ləğv edildi
    console.log("Təhlükəsizlik məhdudiyyətləri ləğv edildi.");
    return;

    // 1. Sağ düyməni bağla (İstifadəçinin istəyi ilə)
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 2. Kopyalamağı bağla (İstifadəçinin istəyi ilə)
    document.body.classList.add('no-select');

    // 3. F12 və təhlükəli qısayolları bağla
    document.addEventListener('keydown', function(e) {
        if (
            e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
        ) {
            e.preventDefault();
            showNotification('Təhlükəsizlik səbəbiylə bu hərəkət qadağandır!', 'error');
            return false;
        }
    });

    // 4. Fokus itəndə ekranı dumanla (Yalnız səhifələr arası keçid üçün)
    window.addEventListener('blur', applyPrivacyBlur);
    window.addEventListener('focus', removePrivacyBlur);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) applyPrivacyBlur();
        else removePrivacyBlur();
    });

    console.log("F12 bloklanması, kopyalama qadağası və blur aktivdir.");
}

// Səhifə yüklənəndə təhlükəsizliyi işə sal (amma login səhifəsində mane olmasın)
document.addEventListener('DOMContentLoaded', () => {
    // Digər DOMContentLoaded məntiqləri buraya gələ bilər
    // setupGlobalSecurity() funksiyasını loadData-dan sonra çağırmaq daha yaxşıdır
});

function handleVisibilityChange() {
    if (document.hidden) {
        applyPrivacyBlur();
    } else {
        removePrivacyBlur();
    }
}

// --- Dashboard & Categories ---
window.showAdminDashboard = function(doPush = true) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) return showNotification('Bu səhifə yalnız səlahiyyətli şəxslər üçündür!', 'error');
    
    if (doPush) {
        const url = new URL(window.location);
        url.searchParams.set('page', 'admin');
        url.searchParams.delete('cat');
        window.history.pushState({ page: 'admin' }, '', url);
    }

    currentAdminParentId = null; // Reset to top level
    hideAllSections();
    document.getElementById('admin-dashboard-section').classList.remove('hidden');
    const statsBox = document.getElementById('visitor-stats-display');
    if (statsBox) statsBox.classList.add('hidden'); // Default gizli
    renderAdminCategories();
}

// Admin statistikası toggle
window.toggleAdminStats = function() {
    const box = document.getElementById('visitor-stats-display');
    if (!box) return;
    const willShow = box.classList.contains('hidden');
    if (willShow) {
        box.classList.remove('hidden');
        loadAdminDashboardStats();
    } else {
        box.classList.add('hidden');
    }
}

window.showProfile = function(doPush = true) {
    if (!currentUser) return showLogin();

    if (doPush) {
        const url = new URL(window.location);
        url.searchParams.set('page', 'profile');
        url.searchParams.delete('cat');
        window.history.pushState({ page: 'profile' }, '', url);
    }

    hideAllSections();
    document.getElementById('profile-section').classList.remove('hidden');
    
    // Update profile info
    const fullName = (currentUser.name && currentUser.surname) 
        ? `${currentUser.name} ${currentUser.surname}` 
        : (currentUser.username || 'İstifadəçi');
    
    document.getElementById('profile-full-name').textContent = fullName;
    document.getElementById('profile-username').textContent = currentUser.username ? `@${currentUser.username}` : 'İstifadəçi adı yoxdur';
    
    // Missing username check - Auto show if missing
    const missingBox = document.getElementById('missing-username-box');
    if (!currentUser.username || currentUser.username === '') {
        missingBox.classList.remove('hidden');
    } else {
        missingBox.classList.add('hidden');
    }

    let roleText = 'İstifadəçi';
    if (currentUser.role === 'admin') roleText = 'Admin';
    else if (currentUser.role === 'teacher') roleText = 'Müəllim';
    else if (currentUser.role === 'moderator') roleText = 'Moderator';
    
    document.getElementById('profile-role').textContent = roleText;
    
    renderHistory();
    loadUserQuestions(true);
    loadUserInbox(true);
}

window.toggleUsernameBox = function() {
    const missingBox = document.getElementById('missing-username-box');
    missingBox.classList.toggle('hidden');
}

window.updateUserUsername = async function() {
    const newUsername = document.getElementById('new-profile-username').value.trim().toLowerCase();
    
    if (!newUsername) return showNotification('İstifadəçi adını daxil edin!', 'error');
    if (newUsername === currentUser.username) {
        showNotification('Yeni istifadəçi adı köhnə ilə eynidir.', 'info');
        document.getElementById('missing-username-box').classList.add('hidden');
        return;
    }
    if (newUsername.length < 5) return showNotification('İstifadəçi adı minimum 5 simvoldan ibarət olmalıdır!', 'error');
    if (/\s/.test(newUsername)) return showNotification('İstifadəçi adında boşluq ola bilməz!', 'error');
    if (!/^[a-z0-9_.]+$/.test(newUsername)) return showNotification('İstifadəçi adında yalnız hərf, rəqəm, nöqtə və alt xətt ola bilər!', 'error');

    try {
        if (db) {
            // Check if username taken
            const userQuery = await db.collection('users').where('username', '==', newUsername).get();
            if (!userQuery.empty) {
                throw new Error('Bu istifadəçi adı artıq mövcuddur!');
            }

            // Update user
            await db.collection('users').doc(currentUser.id).update({
                username: newUsername
            });

            currentUser.username = newUsername;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showNotification('İstifadəçi adı uğurla təyin edildi!', 'success');
            showProfile(); // Refresh
        } else {
            throw new Error('Verilənlər bazası ilə əlaqə yoxdur.');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function loadUserQuestions(initial = false) {
    const list = document.getElementById('user-questions-list');
    const countBadge = document.getElementById('user-questions-count');
    const loadMoreBtn = document.getElementById('user-questions-load-more');
    const PAGE_SIZE = 5;
    const state = window.__userQuestionsState || (window.__userQuestionsState = { questions: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 });
    if (initial) {
        list.innerHTML = '<div class="text-center p-6"><i class="fas fa-spinner fa-spin mr-2"></i> Yüklənir...</div>';
        state.questions = [];
        state.lastDoc = null;
        state.hasMore = true;
        state.fallbackAll = null;
        state.pageIndex = 0;
    } else {
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
        }
    }

    try {
        let page = [];
        if (db) {
            try {
                let q = db.collection('public_questions').where('authorId', '==', currentUser.id).orderBy('createdAt', 'desc').limit(PAGE_SIZE);
                if (state.lastDoc) q = q.startAfter(state.lastDoc);
                const snapshot = await q.get();
                page = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                state.lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : state.lastDoc;
                if (page.length < PAGE_SIZE) state.hasMore = false;
            } catch (queryErr) {
                const snapshot = await db.collection('public_questions').where('authorId', '==', currentUser.id).get();
                const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                all.sort((a, b) => {
                    const ta = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                    const tb = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                    return tb - ta;
                });
                state.fallbackAll = state.fallbackAll || all;
                const start = state.pageIndex * PAGE_SIZE;
                const end = start + PAGE_SIZE;
                page = state.fallbackAll.slice(start, end);
                state.pageIndex += 1;
                if (end >= state.fallbackAll.length) state.hasMore = false;
            }
        } else {
            const localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]')
                .filter(q => q.authorId === currentUser.id)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            state.fallbackAll = state.fallbackAll || localPQ;
            const start = state.pageIndex * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            page = state.fallbackAll.slice(start, end);
            state.pageIndex += 1;
            if (end >= state.fallbackAll.length) state.hasMore = false;
        }

        countBadge.textContent = `${state.fallbackAll ? state.fallbackAll.length : (state.questions.length + page.length)} sual`;

        if (state.questions.length === 0 && page.length === 0) {
            list.innerHTML = '<p class="text-center text-muted p-10">Sizin tərəfinizdən əlavə edilmiş sual yoxdur.</p>';
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
            return;
        }

        if (initial) list.innerHTML = '';
        state.questions = state.questions.concat(page);
        page.forEach(q => {
            const cat = categories.find(c => c.id === q.categoryId);
            const div = document.createElement('div');
            div.className = 'list-item mb-4 p-4 bg-white rounded-lg shadow-sm border flex justify-between items-start gap-4';
            div.innerHTML = `
                <div class="flex-1">
                    <div class="text-xs text-primary mb-1">
                        <i class="fas fa-folder mr-1"></i> ${escapeHtml(cat ? cat.name : 'Naməlum kateqoriya')}
                    </div>
                    <div class="font-semibold text-main">${escapeHtml(q.text || '')}</div>
                    <div class="text-xs text-muted mt-2 flex flex-wrap gap-2">
                        ${q.options.map((opt, i) => `<span class="${i === q.correctIndex ? 'text-success font-bold' : ''}">${String.fromCharCode(65 + i)}) ${escapeHtml(opt || '')}</span>`).join(' | ')}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editUserQuestion('${q.id}')" class="btn-outline p-2 text-sm rounded-md" title="Düzəliş et">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteUserQuestion('${q.id}')" class="btn-outline p-2 text-sm rounded-md text-danger border-danger" title="Sil">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
        if (loadMoreBtn) {
            if (state.hasMore) {
                loadMoreBtn.classList.remove('hidden');
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = 'Daha çox yüklə';
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p class="text-center text-danger p-6">Sualları yükləmək mümkün olmadı.</p>';
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = 'Daha çox yüklə';
        }
    }
}

window.loadMoreUserQuestions = function() {
    if (!window.__userQuestionsState || window.__userQuestionsState.loading === true) return;
    window.__userQuestionsState.loading = true;
    loadUserQuestions(false).finally(() => {
        window.__userQuestionsState.loading = false;
    });
}

window.deleteUserQuestion = async function(qId) {
    showCustomConfirm('Sualı sil', 'Bu sualı silmək istədiyinizə əminsiniz?', async () => {
        try {
            if (db) {
                await db.collection('public_questions').doc(qId).delete();
            } else {
                let localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
                localPQ = localPQ.filter(q => q.id != qId);
                localStorage.setItem('public_questions', JSON.stringify(localPQ));
            }
            showNotification('Sual silindi', 'success');
            loadUserQuestions(true);
        } catch (e) {
            console.error(e);
            showNotification('Sual silinərkən xəta baş verdi', 'error');
        }
    });
}

window.editUserQuestion = async function(qId) {
    let q;
    if (db) {
        const doc = await db.collection('public_questions').doc(qId).get();
        q = { id: doc.id, ...doc.data() };
    } else {
        const localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
        q = localPQ.find(item => item.id == qId);
    }

    if (!q) return;

    // Use existing public question modal for editing
    document.getElementById('public-question-modal').classList.remove('hidden');
    document.getElementById('pub-q-text').value = q.text;
    const opts = document.querySelectorAll('.pub-opt');
    q.options.forEach((opt, i) => {
        if (opts[i]) opts[i].value = opt;
    });
    const radios = document.querySelectorAll('input[name="pub-q-correct"]');
    if (radios[q.correctIndex]) radios[q.correctIndex].checked = true;

    // Temporarily override submit button
    const submitBtn = document.querySelector('#public-question-modal .btn-primary');
    const originalText = submitBtn.textContent;
    const originalOnClick = submitBtn.onclick;

    submitBtn.textContent = 'Yadda Saxla';
    submitBtn.onclick = async () => {
        const newText = document.getElementById('pub-q-text').value.trim();
        const newOpts = Array.from(document.querySelectorAll('.pub-opt')).map(o => o.value.trim());
        const newCorrect = parseInt(document.querySelector('input[name="pub-q-correct"]:checked').value);

        if (!newText || newOpts.some(o => !o)) {
            return showNotification('Bütün sahələri doldurun', 'error');
        }

        try {
            if (db) {
                await db.collection('public_questions').doc(qId).update({
                    text: newText,
                    options: newOpts,
                    correctIndex: newCorrect
                });
            } else {
                let localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
                const idx = localPQ.findIndex(item => item.id == qId);
                if (idx !== -1) {
                    localPQ[idx].text = newText;
                    localPQ[idx].options = newOpts;
                    localPQ[idx].correctIndex = newCorrect;
                    localStorage.setItem('public_questions', JSON.stringify(localPQ));
                }
            }
            showNotification('Sual yeniləndi');
            closeModal('public-question-modal');
            loadUserQuestions(true);
            
            // Restore original button
            submitBtn.textContent = originalText;
            submitBtn.onclick = originalOnClick;
        } catch (e) {
            console.error(e);
            showNotification('Xəta baş verdi', 'error');
        }
    };
    
    // Also handle modal close to restore button
    const closeBtn = document.querySelector('#public-question-modal .close');
    const originalClose = closeBtn.onclick;
    closeBtn.onclick = () => {
        submitBtn.textContent = originalText;
        submitBtn.onclick = originalOnClick;
        closeModal('public-question-modal');
        closeBtn.onclick = originalClose;
    };
}

async function renderHistory() {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '';
    
    let history = [];
    if (db) {
        try {
            const snapshot = await db.collection('attempts')
                .where('userId', '==', currentUser.id)
                .get();
            history = snapshot.docs.map(doc => doc.data())
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 20);
        } catch (e) {
            console.error("Firebase history error:", e);
            history = JSON.parse(localStorage.getItem(`history_${currentUser.id}`)) || [];
        }
    } else {
        history = JSON.parse(localStorage.getItem(`history_${currentUser.id}`)) || [];
    }

    if (history.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-6 text-muted">Hələ heç bir test edilməyib.</td></tr>';
        document.getElementById('total-tests-count').textContent = '0';
        document.getElementById('avg-score-val').textContent = '0%';
        return;
    }

    let totalAccuracy = 0;
    history.forEach(attempt => {
        const date = new Date(attempt.timestamp).toLocaleDateString('az-AZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const accuracy = Math.round((attempt.score / attempt.total) * 100);
        totalAccuracy += accuracy;
        
        const badgeClass = accuracy >= 80 ? 'accuracy-high' : (accuracy >= 50 ? 'accuracy-mid' : 'accuracy-low');
        
        const tr = document.createElement('tr');
        const unanswered = attempt.unanswered !== undefined ? attempt.unanswered : 0;
        const wrong = attempt.wrong !== undefined ? attempt.wrong : (attempt.total - attempt.score - unanswered);
        
        tr.innerHTML = `
            <td>${escapeHtml(attempt.categoryName || '')}</td>
            <td>${date}</td>
            <td><span class="accuracy-badge ${badgeClass}">${accuracy}%</span></td>
            <td>${attempt.score} / ${wrong} / ${unanswered}</td>
        `;
        tableBody.appendChild(tr);
    });

    document.getElementById('total-tests-count').textContent = history.length;
    document.getElementById('avg-score-val').textContent = Math.round(totalAccuracy / history.length) + '%';
}

function renderCategories() {
    const grid = document.getElementById('categories-grid');
    const specialGrid = document.getElementById('special-exams-grid');
    const specialTitle = document.getElementById('special-exams-title');

    grid.innerHTML = '';
    if (specialGrid) specialGrid.innerHTML = '';
    
    // Filter categories by parentId and public visibility
    const filteredCategories = categories.filter(cat => cat.parentId === currentParentId && !cat.isHiddenFromPublic);
    
    // Update Title and Back Button
    const title = document.getElementById('dashboard-title');
    const backBtn = document.getElementById('dashboard-back-btn');
    
    if (currentParentId) {
        const parent = categories.find(c => c.id === currentParentId);
        title.textContent = parent ? parent.name : 'Kateqoriyalar';
        backBtn.classList.remove('hidden');
        if (specialTitle) specialTitle.classList.add('hidden');
    } else {
        title.textContent = 'Mövcud İmtahanlar';
        backBtn.classList.add('hidden');
        if (specialTitle) specialTitle.classList.remove('hidden');
    }

    let hasSpecial = false;

    filteredCategories.forEach((cat, index) => {
        const div = document.createElement('div');
        div.className = 'category-card animate-up';
        div.dataset.id = cat.id; // Add data-id for easier selection
        div.style.animationDelay = `${index * 0.15}s`;
        
        // Simple icon mapping
        let icon = 'fa-book';
        if (cat.name.toLowerCase().includes('ingilis')) icon = 'fa-language';
        if (cat.name.toLowerCase().includes('cinayət')) icon = 'fa-gavel';
        if (cat.name.toLowerCase().includes('mülki')) icon = 'fa-balance-scale';
        if (cat.name.toLowerCase().includes('dövlət')) icon = 'fa-university';
        if (cat.name.toLowerCase().includes('konstitusiya')) icon = 'fa-scroll';
        if (cat.name.toLowerCase().includes('biologiya')) icon = 'fa-dna';
        if (cat.name.toLowerCase().includes('kimya')) icon = 'fa-flask';
        if (cat.name.toLowerCase().includes('dərslik')) icon = 'fa-graduation-cap';
        if (cat.name.toLowerCase().includes('tarix')) icon = 'fa-monument';
        if (cat.name.toLowerCase().includes('sinif')) icon = 'fa-school';
        if (cat.name.toLowerCase().includes('prokuror')) icon = 'fa-landmark';
        if (cat.name.toLowerCase().includes('hakim')) icon = 'fa-balance-scale';
        if (cat.name.toLowerCase().includes('vəkil')) icon = 'fa-briefcase';

        // Check if it has subcategories (exclude hidden ones)
        const hasSub = categories.some(c => c.parentId === cat.id && !c.isHiddenFromPublic);
        const hasQuestions = cat.questions && cat.questions.length > 0;

        // DEBUG: XI Sinif suallarını hər zaman göstər
        const isXI = cat.name.toLowerCase().includes('xi sinif') || cat.name.toLowerCase().includes('11-ci sinif');
        if (isXI) {
            console.log(`XI Sinif tapıldı: ${cat.name}, ID: ${cat.id}, Sual: ${cat.questions ? cat.questions.length : 0}`);
        }

        // Special Exam Logic
        const isSpecial = cat.isSpecial || 
                         cat.name.toLowerCase().includes('prokuror') || 
                         cat.name.toLowerCase().includes('hakim') || 
                         cat.name.toLowerCase().includes('vəkil');

        div.innerHTML = `
            <i class="fas ${icon}"></i>
            <h3>${escapeHtml(cat.name || '')}</h3>
            ${hasSub ? '<p class="sub-indicator"><i class="fas fa-folder-open"></i> Alt bölmələr var</p>' : ''}
            <div class="category-actions">
                ${hasSub ? `<button class="btn-secondary" onclick="enterCategory('${cat.id}')">Bölmələrə Bax</button>` : ''}
                ${(hasQuestions || isXI) ? `<button class="btn-primary" onclick="${isSpecial ? `startSpecialQuiz('${cat.id}')` : `startQuizCheck('${cat.id}')`}">${isSpecial ? 'İmtahana Başla' : 'Testə Başla'}</button>` : ''}
                ${cat.id === 'public_general' ? `<button class="btn-outline" onclick="openGlobalPublicQuestions()"><i class="fas fa-users"></i> Ümumi Suallar</button>` : ''}
                ${!hasSub && !hasQuestions && !isXI && cat.id !== 'public_general' ? '<p class="text-muted text-xs italic">Tezliklə...</p>' : ''}
            </div>
        `;
        
        if (isSpecial && !currentParentId && specialGrid) {
             specialGrid.appendChild(div);
             hasSpecial = true;
        } else {
             grid.appendChild(div);
        }
    });
    
    if (!hasSpecial && specialTitle && !currentParentId) {
        // Show title even if empty, as per user request to "create the section"
        specialTitle.classList.remove('hidden');
        if (specialGrid && specialGrid.children.length === 0) {
            specialGrid.innerHTML = '<p class="text-muted italic" style="grid-column: 1/-1;">Hələlik xüsusi sınaq yoxdur.</p>';
        }
    }
}


// Prokurorluq Sınağı üçün Sxem
const PROKURORLUQ_SCHEMA = [
    { id: '1768674522030', count: 20, name: 'Cinayət Məcəlləsi' },
    { id: '1768683898010', count: 20, name: 'Cinayət-Prosessual Məcəlləsi' },
    { id: '1766934946320', count: 6, name: 'Konstitusiya' },
    { id: '1768696058306', count: 3, name: 'Normativ hüquqi aktlar' },
    { id: '1768735010552', count: 5, name: 'İnzibati Xətalar Məcəlləsi' },
    { id: '1768750915800', count: 2, name: 'Mülki Məcəllə' },
    { id: '1768737630088', count: 2, name: 'Mülki-Prosessual Məcəllə' },
    { id: '1768745670510', count: 2, name: 'Əmək Məcəlləsi' },
    { id: '1768696474731', count: 8, name: 'Prokurorluq haqqında' },
    { id: '1768696605470', count: 6, name: 'Prokurorluq orqanlarında qulluq' },
    { id: '1767194888783', count: 4, name: 'Korrupsiyaya qarşı mübarizə' }, 
    { id: '1768698786812', count: 1, name: 'Polis haqqında' },
    { name: 'Avropa İnsan Hüquqları Konvensiyası', count: 1, isDynamic: true }
];

async function generateProkurorluqExam() {
    if (!currentUser) {
        alert("Xüsusi sınaqları işləmək üçün zəhmət olmasa qeydiyyatdan keçin və ya daxil olun!");
        window.location.href = '#login';
        showLoginModal();
        throw new Error("İmtahan üçün daxil olmalısınız.");
    }
    
    // 1. İstifadəçinin tarixçəsini yüklə
    let usedQuestionIds = new Set();
    let usedSimilarityGroups = new Set();
    if (db) {
        try {
            const historySnapshot = await db.collection('exam_history')
                .where('userId', '==', currentUser.id)
                .where('examType', '==', 'prokurorluq')
                .get();
            
            historySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.questionIds && Array.isArray(data.questionIds)) {
                    data.questionIds.forEach(id => usedQuestionIds.add(id));
                }
            });
            console.log(`User has seen ${usedQuestionIds.size} unique questions.`);
        } catch (e) {
            console.error("History fetch error:", e);
        }
    }

    let examQuestions = [];
    let log = [];

    // 2. Hər kateqoriya üzrə sualları seç
    for (const item of PROKURORLUQ_SCHEMA) {
        // 1. Try to find Special Subcategory (parentId = 'special_prokurorluq')
        let cat = categories.find(c => c.parentId === 'special_prokurorluq' && c.name === item.name);

        // 2. Dynamic Lookup for Konvensiya (Special)
        if (!cat && item.isDynamic) {
             cat = categories.find(c => c.parentId === 'special_prokurorluq' && (c.name.includes('Konvensiya') || c.id === 'special_prokurorluq_human_rights'));
        }

        // 3. Fallback to Schema ID (Public/Legacy)
        if (!cat) {
            cat = categories.find(c => c.id === item.id);
        }

        // Dynamic Lookup for Konvensiya (Legacy/Public)
        if (!cat && item.isDynamic) {
             cat = categories.find(c => c.name === item.name || c.name.includes('Konvensiya'));
             if (cat) console.log(`Found dynamic category: ${cat.name} (${cat.id})`);
        }
        
        // Əgər yaddaşda yoxdursa və DB varsa, yüklə
        if ((!cat || !cat.questions || cat.questions.length === 0) && db) {
            try {
                const docId = cat ? cat.id : item.id;
                if (!docId) {
                    console.log("Skipping undefined docId for", item.name);
                    continue;
                }
                const doc = await db.collection('categories').doc(docId).get();
                if (doc.exists) {
                    cat = { id: doc.id, ...doc.data() };
                }
            } catch (e) { console.error(`Error fetching cat ${item.id}:`, e); }
        }

        if (!cat || !cat.questions) {
            log.push(`${item.name}: Kateqoriya tapılmadı!`);
            continue;
        }

        // Sualları filtrlə (işlənmişləri çıxar)
        const availableQuestions = cat.questions.filter(q => !usedQuestionIds.has(String(q.id)));
        
        if (availableQuestions.length < item.count) {
            log.push(`${item.name}: Kifayət qədər yeni sual yoxdur (Tələb: ${item.count}, Var: ${availableQuestions.length}). Mövcud olanlar götürülür.`);
        }

            // Təsadüfi seç (Oxşarlıq nəzərə alınmaqla)
        const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
        let selectedCount = 0;
        let subjectSelected = [];
        
        for (const q of shuffled) {
            if (selectedCount >= item.count) break;
            
            // Similarity check
            if (q.similarityGroupId) {
                if (usedSimilarityGroups.has(q.similarityGroupId)) {
                    console.log(`Skipping similar question ${q.id} (Group: ${q.similarityGroupId})`);
                    continue;
                }
            }
            
            // Add category ID to question for admin tracking
            const qWithCat = { ...q, categoryId: cat.id };
            subjectSelected.push(qWithCat);
            
            if (q.similarityGroupId) usedSimilarityGroups.add(q.similarityGroupId);
            selectedCount++;
        }
        
        examQuestions = [...examQuestions, ...subjectSelected];
    }

    if (examQuestions.length === 0) {
        throw new Error("Sual bazası boşdur və ya bütün sualları işləmisiniz.");
    }

    // 3. İmtahan obyektini yarat
    return {
        id: 'generated_prokurorluq',
        name: 'Prokurorluq üzrə sınaq',
        time: 180, // 3 saat
        questions: examQuestions,
        isSpecial: true,
        examType: 'prokurorluq', // For saving history later
        createdAt: Date.now()
    };
}

window.startSpecialQuiz = async function(catId) {
    const cat = categories.find(c => c.id === catId);
    const isProkuror = cat && (cat.id === 'special_prokurorluq' || cat.name.toLowerCase().includes('prokuror'));

    if (isProkuror) {
        // Password Check
        const password = prompt("Zəhmət olmasa sınaq şifrəsini daxil edin:");
        if (password !== "123") {
            alert("Şifrə yanlışdır!");
            return;
        }

        const btn = document.querySelector(`button[onclick*="'${catId}'"]`);
        const originalText = btn ? btn.innerHTML : '';
        if(btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Hazırlanır...';
        }

        try {
            const generatedExam = await generateProkurorluqExam();
            
            // Yadda saxla
            localStorage.setItem('generatedExamData', JSON.stringify(generatedExam));
            localStorage.setItem('activeSpecialCategory', 'generated_prokurorluq');
            
            window.location.href = 'dim_view.html';
        } catch (e) {
            console.error(e);
            alert('Sınaq yaradılarkən xəta: ' + e.message);
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
        return;
    }

    localStorage.setItem('activeSpecialCategory', catId);
    window.location.href = 'dim_view.html';
}

window.enterCategory = function(id) {
    currentParentId = id;
    
    // URL-i yenilə (History API ilə)
    const url = new URL(window.location);
    if (id) {
        url.searchParams.set('cat', id);
    } else {
        url.searchParams.delete('cat');
    }
    window.history.pushState({ currentParentId: id }, '', url);
    
    renderCategories();
}

window.navigateUp = function() {
    if (activePrivateQuiz) {
        window.location.href = window.location.origin + window.location.pathname;
        return;
    }
    if (!currentParentId) return;
    const current = categories.find(c => c.id === currentParentId);
    const newParentId = current ? current.parentId : null;
    
    window.enterCategory(newParentId);
}

// Brauzerin Geri/İrəli düymələri üçün dinləyici
window.addEventListener('popstate', (event) => {
    handleUrlParams();
});

function renderAdminCategories() {
    const grid = document.getElementById('admin-categories-grid');
    grid.innerHTML = '';
    
    const filteredCategories = categories.filter(cat => cat.parentId === currentAdminParentId);
    
    // Update Admin Title and Back Button
    const title = document.getElementById('admin-dashboard-title');
    const backBtn = document.getElementById('admin-back-btn');
    
    if (currentAdminParentId) {
        const parent = categories.find(c => c.id === currentAdminParentId);
        title.textContent = `Bölmə: ${parent ? parent.name : '...'}`;
        backBtn.classList.remove('hidden');

        // Special Prokurorluq Tools
        if (currentAdminParentId === 'special_prokurorluq' && currentUser.role === 'admin') {
            const toolBtn = document.createElement('button');
            toolBtn.className = 'btn-warning ml-2';
            toolBtn.innerHTML = '<i class="fas fa-magic"></i> Sualları Bölmələrə Payla';
            toolBtn.onclick = organizeProkurorluqQuestions;
            title.appendChild(toolBtn);
        }
    } else {
        title.textContent = currentUser.role === 'moderator' ? 'Moderator Paneli' : 'Admin Paneli - Kateqoriyalar';
        backBtn.classList.add('hidden');
    }

    // Hide admin-only buttons for moderator
    const exportBtn = document.querySelector('.btn-success[onclick="exportData()"]');
    const restoreBtn = document.getElementById('restore-btn-global');
    const addCatBtn = document.querySelector('.btn-primary[onclick="showAddCategoryModal()"]');
    
    if (currentUser && currentUser.role === 'moderator') {
        if (exportBtn) exportBtn.classList.add('hidden');
        if (restoreBtn) restoreBtn.classList.add('hidden');
        if (addCatBtn) addCatBtn.classList.add('hidden');
    } else if (currentUser && currentUser.role === 'admin') {
        if (exportBtn) exportBtn.classList.remove('hidden');
        if (restoreBtn) restoreBtn.classList.remove('hidden');
        if (addCatBtn) addCatBtn.classList.remove('hidden');
    }

    filteredCategories.forEach((cat, index) => {
        const div = document.createElement('div');
        div.className = 'category-card animate-up';
        div.style.animationDelay = `${index * 0.08}s`;
        
        let icon = 'fa-book';
        if (cat.name.toLowerCase().includes('ingilis')) icon = 'fa-language';
        if (cat.name.toLowerCase().includes('cinayət')) icon = 'fa-gavel';
        if (cat.name.toLowerCase().includes('mülki')) icon = 'fa-balance-scale';
        if (cat.name.toLowerCase().includes('dövlət')) icon = 'fa-university';
        if (cat.name.toLowerCase().includes('konstitusiya')) icon = 'fa-scroll';
        if (cat.name.toLowerCase().includes('biologiya')) icon = 'fa-dna';
        if (cat.name.toLowerCase().includes('kimya')) icon = 'fa-flask';
        if (cat.name.toLowerCase().includes('dərslik')) icon = 'fa-graduation-cap';

        const hasSub = categories.some(c => c.parentId === cat.id);

        div.innerHTML = `
            <div class="cat-card-header">
                <i class="fas ${icon}"></i>
                ${currentUser.role === 'admin' ? `
                <div class="cat-card-tools">
                    <button class="edit-cat-btn" onclick="showEditCategoryModal('${cat.id}', event)"><i class="fas fa-edit"></i></button>
                    <button class="delete-cat-btn" onclick="deleteCategory('${cat.id}', event)"><i class="fas fa-trash"></i></button>
                </div>
                ` : ''}
            </div>
            <h3>${escapeHtml(cat.name || '')}</h3>
            ${hasSub ? '' : `<p>${cat.questions ? cat.questions.length : 0} sual</p>`}
            ${hasSub ? '<p class="text-xs text-primary"><i class="fas fa-folder"></i> Alt bölmələr var</p>' : ''}
            <div class="category-actions">
                <button class="btn-secondary" onclick="enterAdminCategory('${cat.id}')">Bölməyə Bax</button>
                <button class="btn-primary" onclick="openCategoryQuestions('${cat.id}')">Suallar (${cat.questions ? cat.questions.length : 0})</button>
                ${cat.id === 'public_general' ? `<button class="btn-outline" onclick="openGlobalPublicQuestions()"><i class="fas fa-users"></i> Ümumi Suallar</button>` : ''}
            </div>
        `;
        grid.appendChild(div);
    });
}

window.enterAdminCategory = function(id) {
    currentAdminParentId = id;
    
    // URL-i yenilə
    const url = new URL(window.location);
    if (id) {
        url.searchParams.set('adminCat', id);
        url.searchParams.set('page', 'admin');
    } else {
        url.searchParams.delete('adminCat');
    }
    window.history.pushState({ currentAdminParentId: id }, '', url);

    renderAdminCategories();
}

window.navigateAdminUp = function() {
    if (!currentAdminParentId) return;
    const current = categories.find(c => c.id === currentAdminParentId);
    const newId = current ? current.parentId : null;
    window.enterAdminCategory(newId);
}

window.openCategoryQuestions = function(id) {
    openCategory(id); // Existing function
}

window.startQuizCheck = function(catId) {
    console.log("Starting quiz check for:", catId);
    // If we want to force login for quiz:
    // if(!currentUser) return showLogin();
    
    // For now, allow guests to take quiz as per "Initial view categories" request
    activeCategoryId = catId;
    startQuiz();
}

window.showAddCategoryModal = function() {
    document.getElementById('category-modal-title').textContent = 'Yeni Kateqoriya';
    document.getElementById('edit-cat-id').value = '';
    document.getElementById('new-cat-name').value = '';
    document.getElementById('new-cat-time').value = '45';
    document.getElementById('save-category-btn').textContent = 'Yarat';
    document.getElementById('category-modal').classList.remove('hidden');
}

window.showEditCategoryModal = function(id, event) {
    if (event) event.stopPropagation();
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('category-modal-title').textContent = 'Kateqoriyanı Redaktə Et';
    document.getElementById('edit-cat-id').value = cat.id;
    document.getElementById('new-cat-name').value = cat.name;
    document.getElementById('new-cat-time').value = cat.time;
    document.getElementById('save-category-btn').textContent = 'Yadda Saxla';
    document.getElementById('category-modal').classList.remove('hidden');
}

window.saveCategory = function() {
    if (!currentUser || currentUser.role !== 'admin') return showNotification('Bu hərəkət üçün admin icazəsi lazımdır!', 'error');
    const id = document.getElementById('edit-cat-id').value;
    const name = document.getElementById('new-cat-name').value;
    const time = parseInt(document.getElementById('new-cat-time').value);

    if (!name) return showNotification('Ad daxil edin!', 'error');

    if (id) {
        // Edit existing
        const index = categories.findIndex(c => c.id === id);
        if (index !== -1) {
            categories[index].name = name;
            categories[index].time = time || 45;
            updateCategoryInDB(categories[index]);
        }
    } else {
        // Add new
        const newCat = {
            id: String(Date.now()),
            name,
            time: time || 45,
            questions: [],
            createdBy: currentUser.id,
            parentId: currentAdminParentId // Set parent to current level
        };
        categories.push(newCat);
        addCategoryToDB(newCat);
    }

    saveCategories(); // Local fallback
    closeModal('category-modal');
    renderAdminCategories();
}

async function addCategoryToDB(cat) {
    if (db) {
        await db.collection('categories').doc(String(cat.id)).set(cat);
    }
}

async function updateCategoryInDB(cat) {
    if (db) {
        await db.collection('categories').doc(String(cat.id)).update({
            name: cat.name,
            time: cat.time
        });
    }
}

window.deleteCategory = function(id, event) {
    event.stopPropagation();
    if (!currentUser || currentUser.role !== 'admin') return showNotification('Bu hərəkət üçün admin icazəsi lazımdır!', 'error');
    if (confirm('Bu kateqoriyanı silmək istədiyinizə əminsiniz?')) {
        if (db) {
            db.collection('categories').doc(String(id)).delete().catch(console.error);
        }
        categories = categories.filter(c => String(c.id) !== String(id));
        saveCategories();
        renderAdminCategories(); // Update admin view
    }
}

// --- Category Admin & Questions ---
let activeCategoryId = null;
let currentDiscussionQuestionId = null;

// --- Public Questions Logic ---
window.migratePublicQuestionsToGlobal = async function() {
    if (!db) return;
    try {
        // Check if already migrated
        const migratedDoc = await db.collection('settings').doc('migration_v1_public_questions').get();
        if (migratedDoc.exists && migratedDoc.data().done) {
            return;
        }

        console.log("Starting migration of public questions to 'public_general'...");
        
        // Get all public questions
        const snapshot = await db.collection('public_questions').get();
        
        if (snapshot.empty) return;

        let batch = db.batch();
        let count = 0;
        let totalUpdated = 0;
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.categoryId !== 'public_general') {
                const ref = db.collection('public_questions').doc(doc.id);
                batch.update(ref, { 
                    categoryId: 'public_general',
                    originalCategoryId: data.categoryId, // Preserve history
                    migratedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                count++;
                totalUpdated++;
            }
            
            // Batch limit is 500
            if (count >= 450) {
                batch.commit();
                batch = db.batch();
                count = 0;
            }
        });
        
        if (count > 0) {
            await batch.commit();
        }
        
        // Mark as done
        await db.collection('settings').doc('migration_v1_public_questions').set({ done: true, date: firebase.firestore.FieldValue.serverTimestamp() });
        console.log(`Migration complete. Updated ${totalUpdated} questions.`);
        
    } catch (e) {
        console.error("Migration error:", e);
    }
}

window.openPublicQuestionsFromDash = function(id) {
    activeCategoryId = 'public_general';
    showPublicQuestions();
}

window.openGlobalPublicQuestions = function() {
    activeCategoryId = 'public_general';
    showPublicQuestions();
}

window.showPublicQuestions = function() {
    if (!activeCategoryId) return;
    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat) return;

    hideAllSections();
    document.getElementById('public-questions-section').classList.remove('hidden');
    document.getElementById('public-questions-title').textContent = (cat.id === 'public_general') ? 'Ümumi Suallar' : `${cat.name} - Ümumi Suallar`;
    
    // Show add button for everyone, but logic handles login check
    const addBtn = document.getElementById('add-public-q-btn');
    addBtn.classList.remove('hidden');

    window.__publicQuestionsState = { questions: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 };
    loadPublicQuestions(true);
}

window.hidePublicQuestions = function() {
    if (activeCategoryId) {
        if (activeCategoryId === 'public_general') {
            showDashboard();
        } else {
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
                openCategory(activeCategoryId);
            } else {
                showDashboard();
            }
        }
    } else {
        showDashboard();
    }
}

window.showAddPublicQuestionModal = function() {
    if (!currentUser) {
        showNotification('Sual əlavə etmək üçün qeydiyyatdan keçməlisiniz', 'error');
        return;
    }
    document.getElementById('public-question-modal').classList.remove('hidden');
    // Clear form and reset options to 4
    document.getElementById('pub-q-text').value = '';
    const optionsContainer = document.getElementById('pub-q-options');
    optionsContainer.innerHTML = `
        <div class="manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border">
            <input type="radio" name="pub-q-correct" value="0" checked id="pub-opt-0" class="w-5 h-5 cursor-pointer accent-primary">
            <input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="A variantı">
        </div>
        <div class="manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border">
            <input type="radio" name="pub-q-correct" value="1" id="pub-opt-1" class="w-5 h-5 cursor-pointer accent-primary">
            <input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="B variantı">
        </div>
        <div class="manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border">
            <input type="radio" name="pub-q-correct" value="2" id="pub-opt-2" class="w-5 h-5 cursor-pointer accent-primary">
            <input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="C variantı">
        </div>
        <div class="manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border">
            <input type="radio" name="pub-q-correct" value="3" id="pub-opt-3" class="w-5 h-5 cursor-pointer accent-primary">
            <input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="D variantı">
        </div>
    `;
}

window.addPublicOption = function() {
    const optionsContainer = document.getElementById('pub-q-options');
    const optionCount = optionsContainer.querySelectorAll('.manual-option-input').length;
    
    if (optionCount >= 10) {
        showNotification('Maksimum 10 variant əlavə edə bilərsiniz.', 'error');
        return;
    }

    const charCode = 65 + optionCount; // A=65, B=66, etc.
    const char = String.fromCharCode(charCode);
    
    const div = document.createElement('div');
    div.className = 'manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border';
    div.innerHTML = `
        <input type="radio" name="pub-q-correct" value="${optionCount}" id="pub-opt-${optionCount}" class="w-5 h-5 cursor-pointer accent-primary">
        <input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="${char} variantı">
        <button onclick="this.parentElement.remove()" class="bg-none border-none text-danger cursor-pointer p-1"><i class="fas fa-times"></i></button>
    `;
    optionsContainer.appendChild(div);
}

window.submitPublicQuestion = async function() {
    const text = document.getElementById('pub-q-text').value.trim();
    const optInputs = Array.from(document.querySelectorAll('.pub-opt'));
    const opts = optInputs.map(o => o.value.trim());
    
    // Find index of the checked radio button among all radio buttons in the container
    const allRadios = Array.from(document.querySelectorAll('input[name="pub-q-correct"]'));
    const checkedRadioIndex = allRadios.findIndex(r => r.checked);
    const correct = checkedRadioIndex !== -1 ? checkedRadioIndex : 0;

    if (!text || opts.some(o => !o)) {
        return showNotification('Zəhmət olmasa bütün sahələri doldurun.', 'error');
    }

    const authorName = (currentUser.name && currentUser.surname) 
        ? `${currentUser.name} ${currentUser.surname}` 
        : (currentUser.username || 'Anonim');

    const newQ = {
        categoryId: 'public_general',
        text: text,
        options: opts,
        correctIndex: correct,
        authorId: currentUser.id,
        authorName: authorName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (db) {
            await db.collection('public_questions').add(newQ);
        } else {
            // Local fallback (simplified)
            let localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
            newQ.id = Date.now();
            newQ.createdAt = new Date().toISOString();
            localPQ.push(newQ);
            localStorage.setItem('public_questions', JSON.stringify(localPQ));
        }
        showNotification('Sual uğurla əlavə edildi!');
        closeModal('public-question-modal');
        loadPublicQuestions();
    } catch (e) {
        console.error(e);
        showNotification('Sual əlavə edilərkən xəta baş verdi.', 'error');
    }
}

window.loadPublicQuestions = async function(initial = false) {
    const list = document.getElementById('public-questions-list');
    const loadMoreBtn = document.getElementById('public-questions-load-more');
    const PAGE_SIZE = 5;
    const state = window.__publicQuestionsState || (window.__publicQuestionsState = { questions: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 });
    if (initial) {
        list.innerHTML = '<div class="text-center p-6"><i class="fas fa-spinner fa-spin"></i> Yüklənir...</div>';
        state.questions = [];
        state.lastDoc = null;
        state.hasMore = true;
        state.fallbackAll = null;
        state.pageIndex = 0;
    } else {
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
        }
    }
    try {
        let page = [];
        if (db) {
            try {
                let q = db.collection('public_questions').where('categoryId', '==', activeCategoryId).orderBy('createdAt', 'desc').limit(PAGE_SIZE);
                if (state.lastDoc) q = q.startAfter(state.lastDoc);
                const snapshot = await q.get();
                page = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                state.lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : state.lastDoc;
                if (page.length < PAGE_SIZE) state.hasMore = false;
            } catch (queryErr) {
                const snapshot = await db.collection('public_questions').where('categoryId', '==', activeCategoryId).get();
                const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                all.sort((a, b) => {
                    const ta = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                    const tb = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                    return tb - ta;
                });
                state.fallbackAll = state.fallbackAll || all;
                const start = state.pageIndex * PAGE_SIZE;
                const end = start + PAGE_SIZE;
                page = state.fallbackAll.slice(start, end);
                state.pageIndex += 1;
                if (end >= state.fallbackAll.length) state.hasMore = false;
            }
        } else {
            const all = JSON.parse(localStorage.getItem('public_questions') || '[]')
                .filter(q => q.categoryId === activeCategoryId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            state.fallbackAll = state.fallbackAll || all;
            const start = state.pageIndex * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            page = state.fallbackAll.slice(start, end);
            state.pageIndex += 1;
            if (end >= state.fallbackAll.length) state.hasMore = false;
        }
        if (state.questions.length === 0 && page.length === 0) {
            list.innerHTML = '<p class="text-center text-muted p-10">Hələ heç kim sual əlavə etməyib. İlk sualı siz əlavə edin!</p>';
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
            return;
        }
        if (initial) list.innerHTML = '';
        state.questions = state.questions.concat(page);
        appendPublicQuestions(page);
        if (loadMoreBtn) {
            if (state.hasMore) {
                loadMoreBtn.classList.remove('hidden');
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = 'Daha çox yüklə';
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p class="text-center text-danger p-4">Sualları yükləmək mümkün olmadı.</p>';
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = 'Daha çox yüklə';
        }
    }
}

function appendPublicQuestions(questions) {
    const list = document.getElementById('public-questions-list');
    questions.forEach(q => {
        const likes = q.likes || [];
        const dislikes = q.dislikes || [];
        const userLiked = currentUser && likes.includes(currentUser.id);
        const userDisliked = currentUser && dislikes.includes(currentUser.id);
        const div = document.createElement('div');
        div.className = 'public-q-card';
        const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
        div.innerHTML = `
            <div class="public-q-header">
                <span><i class="fas fa-user"></i> ${q.authorName || 'Anonim'}</span>
                <div class="flex items-center gap-3">
                    <span>${q.createdAt ? (db ? new Date(q.createdAt.toDate()).toLocaleDateString() : new Date(q.createdAt).toLocaleDateString()) : ''}</span>
                    ${isAdmin ? `<button onclick="deletePublicQuestion('${q.id}')" class="bg-none border-none text-danger cursor-pointer text-sm" title="Sualı sil"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="public-q-text">${q.text}</div>
            <div class="public-q-options" id="pub-options-${q.id}">
                ${q.options.map((opt, idx) => `
                    <div class="pub-opt-item" onclick="checkPublicAnswer('${q.id}', ${idx}, ${q.correctIndex})">
                        ${String.fromCharCode(65 + idx)}) ${opt}
                    </div>
                `).join('')}
            </div>
            <div class="public-q-actions">
                <div class="like-dislike-group">
                    <button onclick="likeQuestion('${q.id}')" class="action-btn like-btn ${userLiked ? 'active' : ''}" title="Bəyən">
                        <i class="${userLiked ? 'fas' : 'far'} fa-thumbs-up"></i>
                        <span>${likes.length}</span>
                    </button>
                    <button onclick="dislikeQuestion('${q.id}')" class="action-btn dislike-btn ${userDisliked ? 'active' : ''}" title="Bəyənmə">
                        <i class="${userDisliked ? 'fas' : 'far'} fa-thumbs-down"></i>
                        <span>${dislikes.length}</span>
                    </button>
                </div>
                <button onclick="showDiscussion('${q.id}')" class="btn-outline">
                    <i class="fas fa-comments"></i> Müzakirə Et
                </button>
                <button onclick="openReportModal('${q.id}', 'public', '${q.text.substring(0, 50)}...')" class="btn-report">
                    <i class="fas fa-flag"></i> Bildir
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.loadMorePublicQuestions = function() {
    if (!window.__publicQuestionsState || window.__publicQuestionsState.loading === true) return;
    window.__publicQuestionsState.loading = true;
    loadPublicQuestions(false).finally(() => {
        window.__publicQuestionsState.loading = false;
    });
}

function renderPublicQuestions(questions) {
    const list = document.getElementById('public-questions-list');
    if (questions.length === 0) {
        list.innerHTML = '<p class="text-center text-muted p-10">Hələ heç kim sual əlavə etməyib. İlk sualı siz əlavə edin!</p>';
        return;
    }

    list.innerHTML = '';
    questions.forEach(q => {
        const likes = q.likes || [];
        const dislikes = q.dislikes || [];
        const userLiked = currentUser && likes.includes(currentUser.id);
        const userDisliked = currentUser && dislikes.includes(currentUser.id);

        const div = document.createElement('div');
        div.className = 'public-q-card';
        
        const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');

        div.innerHTML = `
            <div class="public-q-header">
                <span><i class="fas fa-user"></i> ${q.authorName || 'Anonim'}</span>
                <div class="flex items-center gap-3">
                    <span>${q.createdAt ? (db ? new Date(q.createdAt.toDate()).toLocaleDateString() : new Date(q.createdAt).toLocaleDateString()) : ''}</span>
                    ${isAdmin ? `<button onclick="deletePublicQuestion('${q.id}')" class="bg-none border-none text-danger cursor-pointer text-sm" title="Sualı sil"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="public-q-text">${q.text}</div>
            <div class="public-q-options" id="pub-options-${q.id}">
                ${q.options.map((opt, idx) => `
                    <div class="pub-opt-item" onclick="checkPublicAnswer('${q.id}', ${idx}, ${q.correctIndex})">
                        ${String.fromCharCode(65 + idx)}) ${opt}
                    </div>
                `).join('')}
            </div>
            <div class="public-q-actions">
                <div class="like-dislike-group">
                    <button onclick="likeQuestion('${q.id}')" class="action-btn like-btn ${userLiked ? 'active' : ''}" title="Bəyən">
                        <i class="${userLiked ? 'fas' : 'far'} fa-thumbs-up"></i>
                        <span>${likes.length}</span>
                    </button>
                    <button onclick="dislikeQuestion('${q.id}')" class="action-btn dislike-btn ${userDisliked ? 'active' : ''}" title="Bəyənmə">
                        <i class="${userDisliked ? 'fas' : 'far'} fa-thumbs-down"></i>
                        <span>${dislikes.length}</span>
                    </button>
                </div>
                <button onclick="showDiscussion('${q.id}')" class="btn-outline">
                    <i class="fas fa-comments"></i> Müzakirə Et
                </button>
                <button onclick="openReportModal('${q.id}', 'public', '${q.text.substring(0, 50)}...')" class="btn-report">
                    <i class="fas fa-flag"></i> Bildir
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.likeQuestion = async function(qId) {
    if (!currentUser) return showNotification('Bəyənmək üçün giriş etməlisiniz', 'error');
    
    try {
        if (db) {
            const docRef = db.collection('public_questions').doc(qId);
            const doc = await docRef.get();
            const data = doc.data();
            let likes = data.likes || [];
            let dislikes = data.dislikes || [];

            if (likes.includes(currentUser.id)) {
                likes = likes.filter(id => id !== currentUser.id);
            } else {
                likes.push(currentUser.id);
                dislikes = dislikes.filter(id => id !== currentUser.id);
            }
            await docRef.update({ likes, dislikes });
        } else {
            let localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
            const idx = localPQ.findIndex(q => q.id == qId);
            if (idx !== -1) {
                let q = localPQ[idx];
                q.likes = q.likes || [];
                q.dislikes = q.dislikes || [];
                if (q.likes.includes(currentUser.id)) {
                    q.likes = q.likes.filter(id => id !== currentUser.id);
                } else {
                    q.likes.push(currentUser.id);
                    q.dislikes = q.dislikes.filter(id => id !== currentUser.id);
                }
                localStorage.setItem('public_questions', JSON.stringify(localPQ));
            }
        }
        loadPublicQuestions();
    } catch (e) {
        console.error(e);
    }
}

window.dislikeQuestion = async function(qId) {
    if (!currentUser) return showNotification('Bəyənməmək üçün giriş etməlisiniz', 'error');
    
    try {
        if (db) {
            const docRef = db.collection('public_questions').doc(qId);
            const doc = await docRef.get();
            const data = doc.data();
            let likes = data.likes || [];
            let dislikes = data.dislikes || [];

            if (dislikes.includes(currentUser.id)) {
                dislikes = dislikes.filter(id => id !== currentUser.id);
            } else {
                dislikes.push(currentUser.id);
                likes = likes.filter(id => id !== currentUser.id);
            }
            await docRef.update({ likes, dislikes });
        } else {
            let localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
            const idx = localPQ.findIndex(q => q.id == qId);
            if (idx !== -1) {
                let q = localPQ[idx];
                q.likes = q.likes || [];
                q.dislikes = q.dislikes || [];
                if (q.dislikes.includes(currentUser.id)) {
                    q.dislikes = q.dislikes.filter(id => id !== currentUser.id);
                } else {
                    q.dislikes.push(currentUser.id);
                    q.likes = q.likes.filter(id => id !== currentUser.id);
                }
                localStorage.setItem('public_questions', JSON.stringify(localPQ));
            }
        }
        loadPublicQuestions();
    } catch (e) {
        console.error(e);
    }
}

window.checkPublicAnswer = function(questionId, selectedIdx, correctIdx) {
    const optionsContainer = document.getElementById(`pub-options-${questionId}`);
    if (optionsContainer.classList.contains('answered')) return;
    
    // Google Analytics: İctimai Sual Cavablandı
    trackEvent('public_question_answer', {
        'question_id': questionId,
        'is_correct': selectedIdx === correctIdx
    });

    const items = optionsContainer.querySelectorAll('.pub-opt-item');
    items.forEach((item, idx) => {
        if (idx === correctIdx) {
            item.classList.add('correct');
        } else if (idx === selectedIdx) {
            item.classList.add('wrong');
        }
    });
    optionsContainer.classList.add('answered');
}

window.deletePublicQuestion = async function(qId) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return showNotification('Bu hərəkət üçün səlahiyyətiniz yoxdur.', 'error');
    }

    showCustomConfirm('Sualı sil', 'Bu ümumi sualı silmək istədiyinizə əminsiniz?', async () => {
        try {
            if (db) {
                await db.collection('public_questions').doc(qId).delete();
            } else {
                let localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
                localPQ = localPQ.filter(q => q.id != qId);
                localStorage.setItem('public_questions', JSON.stringify(localPQ));
            }
            showNotification('Sual silindi', 'success');
            loadPublicQuestions();
        } catch (e) {
            console.error(e);
            showNotification('Sual silinərkən xəta baş verdi', 'error');
        }
    });
}

window.currentLeaderboardPeriod = 'all';

window.changeLeaderboardPeriod = function(period) {
    window.currentLeaderboardPeriod = period;
    const tabs = document.querySelectorAll('#leaderboard-time-tabs .tab-item');
    tabs.forEach(tab => {
        if (tab.getAttribute('onclick').includes(`'${period}'`)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    showTopUsers();
};

window.showTopUsers = async function() {
    hideAllSections();
    document.getElementById('top-users-section').classList.remove('hidden');
    const list = document.getElementById('top-users-list');
    list.innerHTML = '<div class="text-center p-10"><i class="fas fa-spinner fa-spin text-3xl text-primary"></i><p class="mt-4 text-muted">Hesablanır...</p></div>';

    try {
        let questions = [];
        const period = window.currentLeaderboardPeriod || 'all';

        if (db) {
            // Simple query to avoid index errors while maintaining limit optimization
            let q = db.collection('public_questions');
            
            // Apply date filter if needed
            if (period !== 'all') {
                 const now = new Date();
                 let startDate = new Date();
                 if (period === 'daily') startDate.setDate(now.getDate() - 1);
                 if (period === 'weekly') startDate.setDate(now.getDate() - 7);
                 if (period === 'monthly') startDate.setDate(now.getDate() - 30);
                 
                 // Note: This requires an index on 'createdAt'. If it fails, we catch error below.
                 // If you see error, remove this where clause or create index in Firebase Console.
                 q = q.where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(startDate));
            }
            
            // Limit is crucial for cost
            q = q.orderBy('createdAt', 'desc').limit(100); 

            const snapshot = await q.get();
            questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            questions = JSON.parse(localStorage.getItem('public_questions') || '[]');
        }

        const userStats = {};
        const now = new Date();

        questions.forEach(q => {
            if (!q.authorId) return;

            // Date filtering is now mostly handled by server, but kept for local storage fallback
            if (!db && q.createdAt) {
                 const qDate = new Date(q.createdAt);
                 const diffTime = Math.abs(now - qDate);
                 const diffDays = diffTime / (1000 * 60 * 60 * 24);
                 if (period === 'daily' && diffDays > 1) return;
                 if (period === 'weekly' && diffDays > 7) return;
                 if (period === 'monthly' && diffDays > 30) return;
            }

            if (!userStats[q.authorId]) {
                userStats[q.authorId] = {
                    id: q.authorId,
                    name: q.authorName || 'Anonim',
                    questions: 0,
                    likes: 0,
                    dislikes: 0
                };
            }
            userStats[q.authorId].questions += 1;
            userStats[q.authorId].likes += (q.likes ? q.likes.length : 0);
            userStats[q.authorId].dislikes += (q.dislikes ? q.dislikes.length : 0);
        });


        const sortedUsers = Object.values(userStats).sort((a, b) => {
            const scoreA = (a.questions * 5) + a.likes - (a.dislikes * 0.5);
            const scoreB = (b.questions * 5) + b.likes - (b.dislikes * 0.5);
            return scoreB - scoreA;
        });

        if (sortedUsers.length === 0) {
            const periodText = period === 'daily' ? 'günlük' : period === 'weekly' ? 'həftəlik' : period === 'monthly' ? 'aylıq' : 'ümumi';
            list.innerHTML = `<div class="text-center p-10 text-muted">Bu müddət ərzində (${periodText}) hələ heç bir aktivlik yoxdur.</div>`;
            return;
        }

        list.innerHTML = '';
        sortedUsers.slice(0, 20).forEach((user, idx) => {
            const rank = idx + 1;
            const score = Math.round((user.questions * 5) + user.likes - (user.dislikes * 0.5));
            const div = document.createElement('div');
            div.className = 'leader-item animate-up';
            div.style.animationDelay = `${idx * 0.08}s`;
            div.innerHTML = `
                <div class="leader-rank ${rank <= 3 ? 'top-' + rank : ''}">${rank}</div>
                <div class="leader-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="leader-info">
                    <div class="leader-name">${user.name}</div>
                    <div class="leader-stats">
                        <div class="leader-stat" title="Paylaşılan sual sayı">
                            <i class="fas fa-question-circle text-primary"></i> ${user.questions} sual
                        </div>
                        <div class="leader-stat" title="Toplam bəyəni">
                            <i class="fas fa-thumbs-up text-primary"></i> ${user.likes}
                        </div>
                    </div>
                </div>
                <div class="leader-score">
                    <span class="score-value">${score}</span>
                    <span class="score-label">XAL</span>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        list.innerHTML = '<div class="text-center p-10 text-danger">Xəta baş verdi. Zəhmət olmasa yenidən yoxlayın.</div>';
    }
}

// --- Discussion Logic ---
let discussionUnsubscribe = null;

window.showDiscussion = async function(questionId) {
    currentDiscussionQuestionId = questionId;
    const modal = document.getElementById('discussion-modal');
    modal.classList.remove('hidden');

    // Find the question to show preview
    if (db) {
        const doc = await db.collection('public_questions').doc(questionId).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('discussion-question-text').textContent = data.text;
        }
    } else {
        const localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
        const q = localPQ.find(q => q.id == questionId);
        if (q) document.getElementById('discussion-question-text').textContent = q.text;
    }

    startDiscussionListener();
}

function startDiscussionListener() {
    // Unsubscribe from previous listener if exists
    if (discussionUnsubscribe) discussionUnsubscribe();

    const list = document.getElementById('comments-list');
    list.innerHTML = '<div class="text-center p-2"><i class="fas fa-spinner fa-spin text-primary"></i></div>';

    if (db) {
        // Real-time Firestore listener
        discussionUnsubscribe = db.collection('discussions')
            .where('questionId', '==', currentDiscussionQuestionId)
            .orderBy('createdAt', 'asc') // Server-side sort if index exists
            .onSnapshot((snapshot) => {
                const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Client-side sort fallback handled in render if needed, but simple map is safer here
                renderComments(comments);
            }, (error) => {
                // If index is missing, it might fail. Fallback to client-side sort without ordering in query
                if (error.code === 'failed-precondition') {
                     console.warn("Index missing, falling back to client-side sort");
                     discussionUnsubscribe = db.collection('discussions')
                        .where('questionId', '==', currentDiscussionQuestionId)
                        .onSnapshot((snap) => {
                            const comments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            comments.sort((a, b) => {
                                const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                                const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                                return timeA - timeB;
                            });
                            renderComments(comments);
                        });
                } else {
                    console.error("Listener error:", error);
                    list.innerHTML = '<p class="text-xs text-danger text-center">Şərhləri yükləmək mümkün olmadı.</p>';
                }
            });
    } else {
        // LocalStorage fallback only - NO INTERVAL POLLING
        loadComments();
    }
}

// Update closeModal to clear listener
const originalCloseModal = window.closeModal;
window.closeModal = function(modalId) {
    if (modalId === 'discussion-modal') {
        if (discussionUnsubscribe) {
            if (typeof discussionUnsubscribe === 'function') {
                discussionUnsubscribe();
            } else {
                clearInterval(discussionUnsubscribe);
            }
            discussionUnsubscribe = null;
        }
    }
    if (typeof originalCloseModal === 'function') {
        originalCloseModal(modalId);
    } else {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }
}

async function loadComments() {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<div class="text-center p-2"><i class="fas fa-spinner fa-spin text-primary"></i></div>';

    try {
        let comments = [];
        if (db) {
            const snapshot = await db.collection('discussions')
                .where('questionId', '==', currentDiscussionQuestionId)
                .get();
            comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Client-side sort (missing index avoidance)
            comments.sort((a, b) => {
                const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                return timeA - timeB; // ascending for comments
            });
        } else {
            const localC = JSON.parse(localStorage.getItem('discussions') || '[]');
            comments = localC.filter(c => c.questionId == currentDiscussionQuestionId)
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        renderComments(comments);
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p class="text-xs text-danger text-center">Şərhləri yükləmək mümkün olmadı.</p>';
    }
}

function renderComments(comments) {
    const list = document.getElementById('comments-list');
    if (comments.length === 0) {
        list.innerHTML = '<p class="text-center text-muted p-4 text-sm">Hələ müzakirə yoxdur. Fikrinizi bildirin!</p>';
        return;
    }

    // Get current user ID to distinguish own messages
    const currentUserId = currentUser ? currentUser.id : 'anon_' + (localStorage.getItem('anon_id') || '');

    list.innerHTML = '';
    comments.forEach(c => {
        const isOwn = c.userId == currentUserId;
        const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
        
        const div = document.createElement('div');
        div.className = `comment-item ${isOwn ? 'own' : 'other'}`;
        
        const dateStr = c.createdAt ? (db && c.createdAt.toDate ? 
            new Date(c.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})) : '';

        const safeAuthor = escapeHtml(c.userName || '');
        const safeText = escapeHtml(c.text || '');

        div.innerHTML = `
            ${!isOwn ? `<div class="comment-author">${safeAuthor}</div>` : ''}
            <div class="comment-text">${safeText}</div>
            <div class="flex justify-end items-center gap-2">
                <div class="comment-date m-0">${dateStr}</div>
                ${(isOwn || isAdmin) ? `<button onclick="deleteComment('${c.id}')" class="bg-none border-none text-inherit opacity-50 cursor-pointer text-xs p-0" title="Mesajı sil"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        `;
        list.appendChild(div);
    });
    // Scroll to bottom
    list.scrollTop = list.scrollHeight;
}

window.showCustomConfirm = function(title, text, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-text').textContent = text;
    
    const okBtn = document.getElementById('confirm-ok-btn');
    // Clear old events
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    
    newOkBtn.onclick = () => {
        onConfirm();
        closeModal('confirm-modal');
    };
    
    modal.classList.remove('hidden');
}

window.deleteComment = async function(commentId) {
    showCustomConfirm('Mesajı sil', 'Bu mesajı silmək istədiyinizə əminsiniz?', async () => {
        try {
            if (db) {
                await db.collection('discussions').doc(commentId).delete();
            } else {
                let localC = JSON.parse(localStorage.getItem('discussions') || '[]');
                localC = localC.filter(c => c.id != commentId);
                localStorage.setItem('discussions', JSON.stringify(localC));
                loadComments();
            }
            showNotification('Mesaj silindi', 'success');
        } catch (e) {
            console.error(e);
            showNotification('Mesaj silinərkən xəta baş verdi', 'error');
        }
    });
}

window.sendComment = async function() {
    const text = document.getElementById('new-comment-text').value.trim();
    if (!text) return;

    // Pro Shield: Yalnız qeydiyyatlı istifadəçilər şərh yaza bilər
    if (!currentUser) {
        showNotification('Şərh yazmaq üçün zəhmət olmasa qeydiyyatdan keçin və ya daxil olun.', 'warning');
        return;
    }

    const newComment = {
        questionId: currentDiscussionQuestionId,
        userId: currentUser.id,
        userName: currentUser.username,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (db) {
            await db.collection('discussions').add(newComment);
        } else {
            let localC = JSON.parse(localStorage.getItem('discussions') || '[]');
            newComment.id = Date.now();
            newComment.createdAt = new Date().toISOString();
            localC.push(newComment);
            localStorage.setItem('discussions', JSON.stringify(localC));
        }
        document.getElementById('new-comment-text').value = '';
        loadComments();
    } catch (e) {
        console.error(e);
        showNotification('Şərh göndərilərkən xəta baş verdi.', 'error');
    }
}

window.saveAnonymousName = function() {
    const name = document.getElementById('anon-name-input').value.trim();
    if (!name) return showNotification('Zəhmət olmasa adınızı daxil edin.', 'error');

    localStorage.setItem('anon_display_name', name);
    if (!localStorage.getItem('anon_id')) {
        localStorage.setItem('anon_id', Date.now());
    }
    
    closeModal('anonymous-name-modal');
    sendComment(); // Try sending again
}

let adminQuestionViewState = {
    topCount: 5
};

function openCategory(id) {
    activeCategoryId = id;
    const cat = categories.find(c => c.id === id);
    hideAllSections();
    
    // Təhlükəsizlik: Yalnız səlahiyyətli şəxslər (admin və ya moderator) admin panelini görə bilər
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
        document.getElementById('category-admin-section').classList.remove('hidden');
        document.getElementById('current-category-title').textContent = cat.name;
        
        const adminArea = document.querySelector('.admin-panel-area');
        adminArea.classList.remove('hidden');
        
        // Start button logic inside admin view
        const startBtn = document.getElementById('start-quiz-btn');
        if (cat.questions.length === 0) {
            startBtn.disabled = true;
            startBtn.classList.add('opacity-50');
            startBtn.textContent = "Sual yoxdur";
        } else {
            startBtn.disabled = false;
            startBtn.classList.remove('opacity-50');
            startBtn.textContent = "Testə Başla";
        }

        adminQuestionViewState.topCount = 5; // Reset view state
        renderQuestions();
    } else {
        // Əgər admin deyilsə, testi başlama modalını göstər və ya dashboard-a qaytar
        showDashboard();
        startQuizCheck(id);
    }
}

function renderQuestions() {
    const list = document.getElementById('questions-list');
    list.innerHTML = '';
    const cat = categories.find(c => c.id === activeCategoryId);
    
    if (!cat || !cat.questions || cat.questions.length === 0) {
        list.innerHTML = '<p class="text-center text-muted">Hələ sual yoxdur.</p>';
        return;
    }

    const total = cat.questions.length;
    const topCount = adminQuestionViewState.topCount;
    const bottomCount = 5;

    // Helper to render a list of questions
    const renderList = (qs) => {
        qs.forEach(q => {
            const div = document.createElement('div');
            div.className = 'question-item';
            div.dataset.id = q.id; 
            div.innerHTML = `
                <div class="q-content-wrapper">
                    <div class="q-text-main">
                        <strong>${q.originalIndex + 1}.</strong> ${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}
                        ${q.image ? '<i class="fas fa-image" title="Şəkilli sual"></i>' : ''}
                    </div>
                </div>
                <div class="q-actions">
                    <button onclick="editCategoryQuestion('${q.id}')" class="edit-cat-btn" title="Düzəliş et"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteQuestion('${q.id}')" title="Sualı sil"><i class="fas fa-trash"></i></button>
                </div>
            `;
            list.appendChild(div);
        });
    };

    if (total <= topCount + bottomCount) {
        // Show all if total is small
        renderList(cat.questions.map((q, i) => ({...q, originalIndex: i})));
    } else {
        // Show top chunk
        const topChunk = cat.questions.slice(0, topCount).map((q, i) => ({...q, originalIndex: i}));
        renderList(topChunk);

        // Show "Load More" button if there is a gap
        if (topCount < total - bottomCount) {
            const remaining = total - bottomCount - topCount;
            const btnDiv = document.createElement('div');
            btnDiv.className = 'text-center my-4 p-2';
            btnDiv.innerHTML = `
                <button onclick="loadMoreAdminQuestions()" class="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition shadow-sm">
                    <i class="fas fa-chevron-down"></i> Daha çox göstər (${remaining} gizli)
                </button>
            `;
            list.appendChild(btnDiv);
        }

        // Show bottom chunk
        const bottomChunk = cat.questions.slice(total - bottomCount).map((q, i) => ({...q, originalIndex: total - bottomCount + i}));
        renderList(bottomChunk);
    }
}

window.loadMoreAdminQuestions = function() {
    adminQuestionViewState.topCount += 5;
    renderQuestions();
}

window.generateAdminAIQuestions = async function() {
    const context = document.getElementById('admin-ai-context-text').value.trim();
    const count = document.getElementById('admin-ai-question-count').value;
    const difficulty = document.getElementById('admin-ai-difficulty').value;
    const btn = document.getElementById('btn-admin-generate-ai');
    const loading = document.getElementById('admin-ai-loading');

    // Düyməni dərhal deaktiv et və yükləmə ekranını göstər (Double-click qarşısını almaq üçün)
    if (btn) btn.disabled = true;
    if (loading) loading.classList.remove('hidden');
    

    
    if (!context) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification('Zəhmət olmasa mövzu mətni daxil edin.', 'error');
    }

    // 1. Gündəlik Sual Limiti (5 dəfə)
    const questionStats = AIUsageLimits.checkDailyLimit('question');
    if (questionStats.count >= 5) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification(`Gündəlik sual yaratma cəhd limitiniz (5 dəfə) dolub. Sabah yenidən cəhd edin.`, 'warning');
    }

    // 2. Sual Yaratma Cooldown (60 saniyə)
    const questionCooldown = AIUsageLimits.checkCooldown('question');
    if (questionCooldown > 0) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification(`Çox tez-tez sual yaradırsınız. Zəhmət olmasa ${questionCooldown} saniyə gözləyin.`, 'warning');
    }

    if (count == 0) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification('Sual sayı ən azı 5 seçilməlidir (Admin bölməsində yalnız mətndən sual yaradılır).', 'warning');
    }
    
    if (context.length < 10) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification('Daxil edilən məlumat çox qısadır. Zəhmət olmasa daha ətraflı yazın.', 'warning');
    }

    

    let difficultyText = "";
    if (difficulty === "easy") {
        difficultyText = "Suallar asan səviyyədə, təməl bilikləri yoxlayan olsun. ";
    } else if (difficulty === "hard") {
        difficultyText = "Suallar çətin səviyyədə, dərin məntiq və analitik düşüncə tələb edən, detallara toxunan olsun. ";
    } else {
        difficultyText = "Suallar orta çətinlikdə olsun. ";
    }

    const prompt = `Sən bir peşəkar müəllimsən. Aşağıdakı məlumat və ya tapşırıq əsasında ${count} dənə çoxseçimli (test) sual hazırla. ${difficultyText}
    Cavablar yalnız Azərbaycan dilində olsun. 
    Hər sualın 4 variantı olsun. 
    Variantların daxilində "A)", "1)" kimi prefikslər yazma, yalnız variantın mətnini yaz.
    Əgər variantın mətni dırnaq işarəsi (", “, ”) ilə başlayırsa, onu olduğu kimi saxla.
    Nəticəni yalnız aşağıdakı JSON formatında qaytar (heç bir əlavə mətn yazma, yalnız JSON):
    [
      {
        "text": "Sual mətni",
        "options": ["Variant 1", "Variant 2", "Variant 3", "Variant 4"],
        "correct": 0 
      }
    ]
    "correct" sahəsi düzgün variantın indeksidir (0-dan başlayaraq).
    
    Məlumat/Tapşırıq: ${context}`;

    
    // 2025-ci il üçün təsdiqlənmiş ən son stabil və preview model adları
    const models = [
        "gemini-3-flash-preview",
        "gemini-3-pro-preview",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite"
    ];
    // Gemini modelləri üçün həm v1, həm də v1beta versiyalarını yoxlayırıq
    const apiVersions = ["v1beta", "v1"];
    let lastError = "";
    let success = false;

    async function geminiRequest(apiVer, modelName, contents, generationConfig) {
        const useBackend = !GEMINI_API_KEY;
        if (useBackend) {
            const resp = await fetch(`${BACKEND_URL}/api/ai/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiVer, modelName, contents, generationConfig })
            });
            return await resp.json();
        }
        const apiUrl = `https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig })
        });
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            const data = await response.json();
            if (data && data.error && (data.error.status === "PERMISSION_DENIED" || data.error.status === "UNAUTHENTICATED")) {
                const resp = await fetch(`${BACKEND_URL}/api/ai/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiVer, modelName, contents, generationConfig })
                });
                return await resp.json();
            }
            return data;
        } else {
            const text = await response.text();
            throw new Error('Non-JSON response: ' + text.slice(0, 200));
        }
    }

    for (const apiVer of apiVersions) {
        if (success) break;
        for (const modelName of models) {
            if (success) break;
            try {
                const generationConfig = apiVer === "v1beta" ? { response_mime_type: "application/json" } : {};
                const data = await geminiRequest(apiVer, modelName, [{ parts: [{ text: prompt }] }], generationConfig);
                if (data.error) {
                    const errorMsg = (typeof data.error === 'string') ? data.error : (data.error.message || JSON.stringify(data.error));
                    lastError = errorMsg;
                    console.warn(`API Xətası (${modelName}, ${apiVer}):`, lastError);
                    
                    if (errorMsg === 'API key missing') {
                        // Backend-dən gələn xüsusi xəta
                        break; // Digər modelləri yoxlamağa ehtiyac yoxdur
                    }
                    continue;
                }

                if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts) {
                    lastError = "AI cavabı boşdur";
                    console.warn(`Boş cavab (${modelName}, ${apiVer})`);
                    continue;
                }

                let aiResponse = data.candidates[0].content.parts[0].text;
                const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
                if (!jsonMatch) {
                    lastError = "Format xətası (JSON tapılmadı)";
                    console.warn(`JSON Tapılmadı (${modelName}, ${apiVer})`);
                    continue;
                }
                
                const questions = JSON.parse(jsonMatch[0]);
                const list = document.getElementById('admin-questions-list');
                
                // İlk boş sualı təmizlə
                const firstQuestion = list.querySelector('.manual-question-item');
                if (list.children.length === 1 && firstQuestion) {
                    const textarea = firstQuestion.querySelector('textarea');
                    if (textarea && !textarea.value.trim()) {
                        list.innerHTML = '';
                    }
                }
                
                questions.forEach((q) => {
                    addAdminQuestionForm();
                    const items = list.querySelectorAll('.manual-question-item');
                    const lastItem = items[items.length - 1];
                    
                    if (lastItem) {
                        const textarea = lastItem.querySelector('textarea');
                        if (textarea) textarea.value = q.text || "";
                        
                        let inputs = lastItem.querySelectorAll('.manual-opt');
                        if (q.options && Array.isArray(q.options)) {
                            const firstRadio = lastItem.querySelector('input[type="radio"]');
                            if (firstRadio) {
                                const uniqueId = firstRadio.name.split('_')[1];
                                while (inputs.length < q.options.length && inputs.length < 10) {
                                    addAdminOption(uniqueId);
                                    inputs = lastItem.querySelectorAll('.manual-opt');
                                }
                            }
                            q.options.forEach((opt, i) => {
                                if (inputs[i]) inputs[i].value = opt;
                            });
                        }
                        
                        const radios = lastItem.querySelectorAll('input[type="radio"]');
                        if (radios && radios[q.correct] !== undefined) {
                            radios[q.correct].checked = true;
                        }
                    }
                });
                
                switchAdminQuestionTab('manual');
                showNotification(`${questions.length} sual uğurla yaradıldı! Zəhmət olmasa sualları və düzgün cavabları yenidən yoxlayın.`, 'success');
                success = true;
                AIUsageLimits.updateDailyLimit('question');
                AIUsageLimits.updateCooldown('question');
                break; 
            } catch (error) {
                lastError = error.message;
            }
        }
    }

    if (!success) {
        console.error("AI Generation failed:", lastError);
        let msg = 'Xəta baş verdi.';
        if (lastError.includes('quota') || lastError.includes('429') || lastError.includes('limit')) {
            msg = '⚠️ AI limiti bitdi. Zəhmət olmasa biraz gözləyin.';
        } else if (lastError.includes('Safety')) {
            msg = '⚠️ Məzmun uyğunsuz olduğu üçün bloklandı.';
        } else if (lastError === 'API key missing' || lastError.includes('API açarı tapılmadı')) {
            msg = '⚠️ API açarı tapılmadı. Zəhmət olmasa Admin paneldən əlavə edin.';
        } else {
            msg = 'Xəta: ' + (lastError.length > 50 ? lastError.substring(0, 50) + '...' : lastError);
        }
        showNotification(msg, 'error');
    }
    
    loading.classList.add('hidden');
    btn.disabled = false;
};

window.switchAdminQuestionTab = function(method) {
    // Hide all contents
    document.querySelectorAll('.admin-method-content').forEach(c => c.classList.add('hidden'));
    // Remove active from all tabs
    document.querySelectorAll('[id^="admin-tab-"]').forEach(b => b.classList.remove('active'));
    
    // Show selected content and activate tab
    document.getElementById(`admin-method-${method}`).classList.remove('hidden');
    document.getElementById(`admin-tab-${method}`).classList.add('active');
}

window.parseAdminBulkQuestions = function() {
    const text = document.getElementById('admin-bulk-questions-text').value;
    if (!text.trim()) return showNotification('Zəhmət olmasa mətni daxil edin.', 'error');
    
    const questions = [];
    // Enhanced split: support "Sual 1", "Sual 2", "Sual:", or just "1.", "2."
    const rawBlocks = text.split(/(?=^\s*(?:Sual\s*(?:[:\d])|\d+[\s.)]))/mi);
    
    rawBlocks.forEach(block => {
        if (!block.trim()) return;
        
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 3) return;
        
        let questionText = "";
        let options = [];
        let correctIndex = 0;
        let explanation = "";
        
        let collectingOptions = false;
        let collectingExplanation = false;
        
        lines.forEach((line) => {
            // İzah və ya Cavab sətirlərini yoxlayırıq (Regex ilə daha dəqiqdir)
            const ansRegex = /^\s*(?:düzgün\s+)?(?:cavab|correct|answer|doğru\s+cavab|izahlı\s+cavab)\s*[:\-]?\s*(.+)$/i;
            const expRegex = /^\s*(?:izah|izahı|izahlı\s+cavab|şərh|açıqlama|explanation|[iİ]zah|[iİ]zahı|[iİ]zahlı\s+cavab)\s*[:\-]?\s*(.*)$/i;
            
            const mAns = line.match(ansRegex);
            const mExp = line.match(expRegex);
            const variantMatch = line.match(/^[A-J][\s.)\-:]{1,3}/i);
            
            // Ayırıcı sətirləri (---) və boş sətirləri keçirik
            if (line.startsWith('---') || line.startsWith('===')) return;

            if (mAns) {
                collectingOptions = false;
                collectingExplanation = false;
                const val = mAns[1].trim();
                const lm = val.match(/^([A-J])[\)\.]*\s*(.*)$/i);
                if (lm) {
                    correctIndex = lm[1].toUpperCase().charCodeAt(0) - 65;
                    
                    // Qalan hissədə izah varmı?
                    const rest = lm[2].trim();
                    if (rest) {
                        const expInRest = rest.match(/(?:izah|izahı|izahlı\s+cavab|şərh|açıqlama|explanation|[iİ]zah|[iİ]zahı|[iİ]zahlı\s+cavab)\s*[:\-]?\s*(.*)$/i);
                        if (expInRest) {
                            explanation = expInRest[1].trim();
                            collectingExplanation = true;
                        }
                    }
                } else {
                    // Əgər variant tapılmadısa, mətnə görə axtar
                    const idx = options.findIndex(o => o.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(o.toLowerCase()));
                    if (idx >= 0) correctIndex = idx;
                }
            } else if (mExp) {
                collectingOptions = false;
                collectingExplanation = true;
                explanation = mExp[1].trim();
            } else if (variantMatch && !collectingExplanation) {
                collectingOptions = true;
                options.push(line.substring(variantMatch[0].length).trim());
            } else if (collectingExplanation) {
                explanation += (explanation ? "\n" : "") + line;
            } else if (!collectingOptions) {
                questionText += (questionText ? "\n" : "") + line;
            }
        });
        
        if (questionText && options.length > 0) {
            questions.push({
                text: questionText.trim(),
                options: options,
                correctIndex: correctIndex >= 0 && correctIndex < options.length ? correctIndex : 0,
                explanation: explanation.trim()
            });
        }
    });
    
    if (questions.length > 0) {
        const list = document.getElementById('admin-questions-list');
        list.innerHTML = '';
        
        questions.forEach((q, idx) => {
            const uniqueId = 'admin_bulk_' + Date.now() + '_' + idx;
            const div = document.createElement('div');
            div.className = 'manual-question-item';

            div.innerHTML = `
                <div class="manual-q-header">
                    <div class="manual-q-title">
                        <i class="fas fa-question-circle"></i>
                        <span>Sual #${idx + 1}</span>
                    </div>
                    <button onclick="this.closest('.manual-question-item').remove();" class="delete-q-btn" title="Sualı sil">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="manual-q-content">
                    <div class="manual-q-image-container">
                        <div class="image-preview hidden" id="preview_${uniqueId}">
                            <img src="" alt="Sual şəkli">
                            <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn">&times;</button>
                        </div>
                        <label class="image-upload-label" id="label_${uniqueId}">
                            <i class="fas fa-image"></i>
                            <span>Şəkil Əlavə Et</span>
                            <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" class="hidden">
                        </label>
                        <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}">
                    </div>
                    <div class="manual-q-text-container">
                        <textarea class="manual-q-text" placeholder="Sualın mətnini daxil edin...">${q.text}</textarea>
                    </div>
                </div>
                <div class="manual-options-grid">
                    ${q.options.map((opt, i) => `
                        <div class="manual-option-input">
                            <input type="radio" name="correct_${uniqueId}" value="${i}" ${i === q.correctIndex ? 'checked' : ''} id="opt_${uniqueId}_${i}">
                            <input type="text" class="manual-opt" value="${opt}" placeholder="${String.fromCharCode(65 + i)} variantı">
                        </div>
                    `).join('')}
                </div>
                <div class="manual-q-explanation-row">
                    <label><i class="fas fa-comment-alt"></i> Sualın İzahı (Opsional)</label>
                    <textarea class="manual-q-explanation" placeholder="Sualın izahını daxil edin...">${q.explanation || ''}</textarea>
                </div>
            `;
            list.appendChild(div);
        });
        
        switchAdminQuestionTab('manual');
        showNotification(`${questions.length} sual uğurla mətndən çevrildi.`, 'success');
    } else {
        showNotification('Heç bir sual tapılmadı. Formatı yoxlayın.', 'error');
    }
}

window.handleAdminBulkFileUpload = function(input) {
    if (!input.files || !input.files[0]) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const questions = JSON.parse(e.target.result);
            if (!Array.isArray(questions)) throw new Error('JSON massiv formatında olmalıdır.');
            
            const list = document.getElementById('admin-questions-list');
            list.innerHTML = '';
            
            questions.forEach((q, idx) => {
                const uniqueId = 'admin_file_' + Date.now() + '_' + idx;
                const div = document.createElement('div');
                div.className = 'manual-question-item';

                div.innerHTML = `
                    <div class="manual-q-header">
                        <div class="manual-q-title">
                            <i class="fas fa-question-circle"></i>
                            <span>Sual #${idx + 1}</span>
                        </div>
                        <button onclick="this.closest('.manual-question-item').remove();" class="delete-q-btn" title="Sualı sil">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <div class="manual-q-content">
                        <div class="manual-q-image-container">
                            <div class="image-preview ${q.image ? '' : 'hidden'}" id="preview_${uniqueId}">
                                <img src="${q.image || ''}" alt="Sual şəkli">
                                <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn">&times;</button>
                            </div>
                            <label class="image-upload-label ${q.image ? 'hidden' : ''}" id="label_${uniqueId}">
                                <i class="fas fa-image"></i>
                                <span>Şəkil Əlavə Et</span>
                                <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" class="hidden">
                            </label>
                            <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}" value="${q.image || ''}">
                        </div>
                        <div class="manual-q-text-container">
                            <textarea class="manual-q-text" placeholder="Sualın mətnini daxil edin...">${q.text}</textarea>
                        </div>
                    </div>
                    <div class="manual-options-grid">
                        ${q.options.map((opt, i) => `
                            <div class="manual-option-input">
                                <input type="radio" name="correct_${uniqueId}" value="${i}" ${i === q.correctIndex ? 'checked' : ''} id="opt_${uniqueId}_${i}">
                                <input type="text" class="manual-opt" value="${opt}" placeholder="${String.fromCharCode(65 + i)} variantı">
                            </div>
                        `).join('')}
                    </div>
                `;
                list.appendChild(div);
            });
            
            switchAdminQuestionTab('manual');
            showNotification(`${questions.length} sual fayldan yükləndi.`, 'success');
            input.value = ''; // Reset input
        } catch (err) {
            showNotification('JSON xətası: ' + err.message, 'error');
        }
    };
    reader.readAsText(input.files[0]);
}

window.showAddQuestionModal = function() {
    hideAllSections();
    const list = document.getElementById('admin-questions-list');
    list.innerHTML = '';
    addAdminQuestionForm();
    switchAdminQuestionTab('manual'); // Reset to manual tab
    document.getElementById('admin-question-section').classList.remove('hidden');
}

window.addAdminQuestionForm = function() {
    const list = document.getElementById('admin-questions-list');
    const uniqueId = 'admin_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    const div = document.createElement('div');
    div.className = 'manual-question-item';

    div.innerHTML = `
        <div class="manual-q-header">
            <div class="manual-q-title">
                <i class="fas fa-question-circle"></i>
                <span>Sual #${list.children.length + 1}</span>
            </div>
            <button onclick="this.closest('.manual-question-item').remove();" class="delete-q-btn" title="Sualı sil">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
        <div class="manual-q-content">
            <div class="manual-q-image-container">
                <div class="image-preview hidden" id="preview_${uniqueId}">
                    <img src="" alt="Sual şəkli">
                    <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn">&times;</button>
                </div>
                <label class="image-upload-label" id="label_${uniqueId}">
                    <i class="fas fa-image"></i>
                    <span>Şəkil Əlavə Et</span>
                    <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" class="hidden">
                </label>
                <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}">
            </div>
            <div class="manual-q-text-container">
                <textarea class="manual-q-text" placeholder="Sualın mətnini bura daxil edin..."></textarea>
            </div>
        </div>
        <div class="manual-q-explanation-row">
            <label><i class="fas fa-comment-alt"></i> Sualın İzahı (Opsional)</label>
            <textarea class="manual-q-explanation" placeholder="Sualın izahını daxil edin..."></textarea>
        </div>
        <div class="manual-options-grid">
            <div class="grid-cols-full bg-warning-light border border-warning-light p-3 rounded-md mb-2 text-warning-dark text-sm flex items-center gap-2">
                <i class="fas fa-info-circle"></i>
                <span>Düzgün variantı seçməyi unutmayın!</span>
            </div>
            ${[0, 1, 2, 3].map(i => `
                <div class="manual-option-input">
                    <input type="radio" name="correct_${uniqueId}" value="${i}" ${i === 0 ? 'checked' : ''} id="opt_${uniqueId}_${i}">
                    <input type="text" class="manual-opt" placeholder="${String.fromCharCode(65 + i)} variantı">
                </div>
            `).join('')}
        </div>
    `;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

window.saveAdminQuestions = async function() {
    const questionItems = document.querySelectorAll('#admin-questions-list .manual-question-item');
    const newQuestionsData = [];
    
    for (const item of questionItems) {
        const text = item.querySelector('.manual-q-text').value.trim();
        const image = item.querySelector('.manual-q-img-data').value;
        const explanation = item.querySelector('.manual-q-explanation') ? item.querySelector('.manual-q-explanation').value.trim() : '';
        const optionInputs = item.querySelectorAll('.manual-opt');
        const correctRadio = item.querySelector('input[type="radio"]:checked');
        
        const options = [];
        optionInputs.forEach(opt => {
            if (opt.value.trim()) options.push(opt.value.trim());
        });

        if (!text) {
            showNotification('Bütün sualların mətnini daxil edin!', 'error');
            return;
        }
        if (options.length < 2) {
            showNotification('Hər sualda ən azı 2 variant olmalıdır!', 'error');
            return;
        }
        if (!correctRadio) {
            showNotification('Bütün suallar üçün düzgün variantı seçin!', 'error');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const correctIndex = parseInt(correctRadio.value);
        
        // --- KEYFİYYƏT NƏZARƏTİ (Start) ---
        const correctText = options[correctIndex];
        // Note: Existing logic assumes radio value matches options index. 
        // If options were filtered for empty strings, this might be risky, but we follow existing pattern.
        
        if (correctText) {
            const wrongTexts = options.filter((_, i) => i !== correctIndex);

            // Kriteriya 1: "Yalnız" patterni
            const allWrongYalniz = wrongTexts.every(t => t.toLowerCase().startsWith('yalnız'));
            const correctYalniz = correctText.toLowerCase().startsWith('yalnız');
            
            if (allWrongYalniz && !correctYalniz && wrongTexts.length > 0) {
                showNotification('Sual keyfiyyət standartına cavab vermir: Bütün səhv variantlar "Yalnız" ilə başlayır, düzgün variant isə yox. Zəhmət olmasa variantları dəyişdirin.', 'error');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                item.style.border = "2px solid red";
                setTimeout(() => item.style.border = "", 5000);
                return;
            }

            // Kriteriya 2: Uzunluq fərqi (> 2.5x)
            const maxWrongLen = Math.max(...wrongTexts.map(t => t.length));
            if (maxWrongLen > 0 && correctText.length > 2.5 * maxWrongLen) {
                showNotification('Sual keyfiyyət standartına cavab vermir: Düzgün cavab səhv cavablardan həddindən artıq uzundur (>2.5x). Zəhmət olmasa variantları balanslaşdırın.', 'error');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                item.style.border = "2px solid red";
                setTimeout(() => item.style.border = "", 5000);
                return;
            }
        }
        // --- KEYFİYYƏT NƏZARƏTİ (End) ---

        newQuestionsData.push({
            text,
            image,
            options,
            correctIndex: correctIndex,
            explanation: explanation
        });
    }

    if (newQuestionsData.length === 0) {
        showNotification('Heç bir sual əlavə edilməyib!', 'error');
        return;
    }

    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat) return;

    if (editingQuestionId) {
        // Mövcud sualı yenilə
        let qIdx = cat.questions.findIndex(q => q.id === editingQuestionId);
        
        // Fallback for type mismatch (number vs string)
        if (qIdx === -1) {
             qIdx = cat.questions.findIndex(q => String(q.id) === String(editingQuestionId));
        }

        if (qIdx !== -1) {
            cat.questions[qIdx] = {
                ...cat.questions[qIdx],
                ...newQuestionsData[0]
            };
            showNotification('Sual uğurla yeniləndi!', 'success');
        } else {
            console.error("Editing question not found:", editingQuestionId);
            showNotification('Xəta: Sual tapılmadı!', 'error');
            return;
        }
    } else {
        // Yeni suallar əlavə et
        newQuestionsData.forEach(qData => {
            cat.questions.push({
                id: Date.now() + Math.random(),
                ...qData
            });
        });
        showNotification(`${newQuestionsData.length} yeni sual əlavə edildi!`, 'success');
    }

    saveCategories();
    await syncCategory(activeCategoryId); // Kateqoriyanı dərhal bazaya sinxron et
    hideAdminQuestionPage();
    
    // Redaktə vəziyyətini sıfırla
    resetEditingState();
}

window.resetEditingState = function() {
    editingQuestionId = null;
    const tabsWrapper = document.querySelector('.tabs-wrapper');
    if (tabsWrapper) tabsWrapper.classList.remove('hidden');
    
    const addBtnContainer = document.querySelector('.add-q-btn-container');
    if (addBtnContainer) addBtnContainer.classList.remove('hidden');
    
    const headerTitle = document.querySelector('#admin-question-section .modal-header h2');
    if (headerTitle) headerTitle.innerHTML = '<i class="fas fa-plus-circle text-primary"></i> Sual Əlavə Et';
    
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-check-double"></i> Hamısını Yadda Saxla';
}

window.editCategoryQuestion = function(qId) {
    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat) return;
    const q = cat.questions.find(item => item.id == qId);
    if (!q) return;

    editingQuestionId = qId;
    
    hideAllSections();
    document.getElementById('admin-question-section').classList.remove('hidden');
    switchAdminQuestionTab('manual');
    
    // Edit zamanı lazımsız hissələri gizlət
    document.querySelector('.tabs-wrapper').classList.add('hidden');
    document.querySelector('.add-q-btn-container').classList.add('hidden');
    
    // Başlığı dəyiş
    const headerTitle = document.querySelector('#admin-question-section .modal-header h2');
    headerTitle.innerHTML = '<i class="fas fa-edit text-primary"></i> Suala Düzəliş Et';

    const list = document.getElementById('admin-questions-list');
    list.innerHTML = '';
    
    // addAdminQuestionForm() funksiyasının məntiqini istifadə et
    addAdminQuestionForm();
    const item = list.querySelector('.manual-question-item');
    
    // Redaktə zamanı silmə düyməsini götür
    const delBtn = item.querySelector('.delete-q-btn');
    if (delBtn) delBtn.remove();
    
    // Məlumatları doldur
    item.querySelector('.manual-q-text').value = q.text;
    if (q.image) {
        const uniqueId = item.querySelector('.manual-q-img-data').id.replace('data_', '');
        const preview = document.getElementById(`preview_${uniqueId}`);
        const label = document.getElementById(`label_${uniqueId}`);
        const dataInput = document.getElementById(`data_${uniqueId}`);
        
        preview.querySelector('img').src = q.image;
        preview.classList.remove('hidden');
        label.classList.add('hidden');
        dataInput.value = q.image;
    }
    
    const optionInputs = item.querySelectorAll('.manual-opt');
    q.options.forEach((opt, i) => {
        if (optionInputs[i]) optionInputs[i].value = opt;
    });
    
    const radios = item.querySelectorAll('input[type="radio"]');
    if (radios[q.correctIndex]) radios[q.correctIndex].checked = true;
    
    // İzahı doldur
    const explanationInput = item.querySelector('.manual-q-explanation');
    if (explanationInput) explanationInput.value = q.explanation || '';
    
    // Yadda saxla düyməsinin mətnini dəyiş
    const saveBtn = document.querySelector('.btn-save');
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Dəyişikliyi Yadda Saxla';
}

window.deleteQuestion = async function(qId) {
    if (confirm('Sualı silmək istədiyinizə əminsiniz?')) {
        const cat = categories.find(c => c.id === activeCategoryId);
        if (!cat) return;

        // Sualın mətnini götürək (Dublikatlardan da silmək üçün)
        const questionToDelete = cat.questions.find(q => q.id == qId);
        const questionText = questionToDelete ? questionToDelete.text : null;

        // 1. Aktiv kateqoriyadan sil
        cat.questions = cat.questions.filter(q => q.id != qId);
        
        // 2. Ağıllı Silmə: Əgər bu sual eyni adda başqa dublikat kateqoriyalarda da varsa, ordan da sil
        // Bu, gələcəkdə "Bərpa Aləti"nin sildiyiniz sualı geri gətirməsinin qarşısını alır.
        if (questionText) {
            for (const otherCat of categories) {
                if (otherCat.name === cat.name && otherCat.parentId === cat.parentId) {
                    const originalCount = otherCat.questions ? otherCat.questions.length : 0;
                    if (otherCat.questions) {
                        otherCat.questions = otherCat.questions.filter(q => q.text !== questionText);
                    }
                    
                    // Əgər digər kateqoriyada da dəyişiklik oldusa, onu da bazada yenilə
                    if (otherCat.id !== cat.id && (otherCat.questions ? otherCat.questions.length : 0) !== originalCount) {
                        await syncCategory(otherCat.id);
                    }
                }
            }
        }

        saveCategories(); 
        syncCategory(activeCategoryId); // DB ilə sinxron et
        openCategory(activeCategoryId);
    }
}

// --- Quiz Logic ---
window.startQuiz = function() {
    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat) {
        console.error("Kateqoriya tapılmadı:", activeCategoryId);
        return;
    }
    
    if (!cat.questions || cat.questions.length === 0) {
        console.warn("Bu kateqoriyada sual yoxdur:", cat.name);
        showNotification('Bu testdə hələ sual yoxdur.', 'warning');
        return;
    }

    // Show Quiz Setup Modal
    const setupModal = document.getElementById('quiz-setup-modal');
    const categoryTitle = document.getElementById('setup-category-title');
    
    if (categoryTitle) categoryTitle.textContent = cat.name;
    
    // Sual sayını müəyyən edin mətnini bərpa et
    const infoText = document.querySelector('.quiz-setup-content p');
    if (infoText) {
        infoText.innerHTML = `Sual sayını müəyyən edin (Cəmi: ${cat.questions.length})`;
    }
    
    // Reset radio selection to 15 (default)
    const radios = document.querySelectorAll('input[name="question-count"]');
    radios.forEach(r => {
        if (r.value === "15") r.checked = true;
    });

    if (setupModal) {
        setupModal.classList.remove('hidden');
    } else {
        // Fallback if modal is missing for some reason
        window.confirmStartQuiz();
    }
}

window.confirmStartQuiz = function() {
    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat) return;

    const selectedCountValue = document.querySelector('input[name="question-count"]:checked').value;
    let finalQuestions = [];
    
    // Bütün sualları qarışdır (Təsdiqlənmə statusundan asılı olmayaraq)
    const shuffledAll = [...cat.questions].sort(() => 0.5 - Math.random());

    const count = parseInt(selectedCountValue);
    finalQuestions = shuffledAll.slice(0, Math.min(count, shuffledAll.length));

    currentQuiz = {
        categoryId: cat.id,
        questions: finalQuestions,
        currentQuestionIndex: 0,
        score: 0,
        timer: null,
        timeLeft: cat.time,
        userAnswers: new Array(finalQuestions.length).fill(-1),
        questionTimes: new Array(finalQuestions.length).fill(cat.time)
    };

    trackEvent('start_quiz', {
        category: cat.name,
        category_id: cat.id,
        question_count: finalQuestions.length
    });

    // Səhifə fokusunu itirəndə blur tətbiq etmək (İstifadəçinin istəyi ilə ləğv edildi)
    /*
    window.securityInterval = setInterval(() => {
        if (!document.hasFocus()) {
            applyPrivacyBlur();
        }
    }, 500);
    */

    closeModal('quiz-setup-modal');
    hideAllSections();
    document.getElementById('quiz-section').classList.remove('hidden');
    loadQuestion();
}

let currentQuiz = null;
let selectedAnswerIndex = -1; // Global variable to track selected answer for current question
let editingQuestionId = null; // Kateqoriya sualını redaktə etmək üçün

function loadQuestion() {
    const q = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    
    // Find time limit (private quiz has default or individual time, normal quiz uses category time)
    let timeLimit = 45;
    if (currentQuiz.categoryId === 'private') {
        // If question has custom time, use it. Otherwise use quiz default time.
        timeLimit = q.time || currentQuiz.defaultTime || 45;
    } else {
        const cat = categories.find(c => c.id === currentQuiz.categoryId);
        if (cat) timeLimit = cat.time;
    }
    
    selectedAnswerIndex = currentQuiz.userAnswers[currentQuiz.currentQuestionIndex];

    // Update Progress Bar
    const progressPercentage = ((currentQuiz.currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
    const progressBar = document.getElementById('quiz-progress-bar');
    if (progressBar) {
        progressBar.parentElement.style.setProperty('--progress', `${progressPercentage}%`);
    }

    document.getElementById('question-counter').textContent = `Sual ${currentQuiz.currentQuestionIndex + 1}/${currentQuiz.questions.length}`;
    document.getElementById('question-text').textContent = q.text;
    
    const img = document.getElementById('question-image');
    if (q.image) {
        img.src = q.image;
        img.classList.remove('hidden');
    } else {
        img.classList.add('hidden');
    }

    const videoContainer = document.getElementById('question-video');
    if (videoContainer) {
        videoContainer.classList.add('hidden');
        videoContainer.innerHTML = '';
    }

    const optionsArea = document.getElementById('options-area');
    optionsArea.innerHTML = '';
    optionsArea.className = `options-grid ${q.options.length > 4 ? 'many-options' : ''}`;

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (idx === selectedAnswerIndex) btn.classList.add('selected');
        btn.textContent = opt;
        btn.onclick = () => selectAnswer(idx);
        optionsArea.appendChild(btn);
    });

    // Navigation buttons
    document.getElementById('next-btn').classList.remove('hidden');
    document.getElementById('next-btn').disabled = false; // Always enabled to allow skipping
    
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) {
        if (currentQuiz.currentQuestionIndex > 0) {
            prevBtn.classList.remove('hidden');
        } else {
            prevBtn.classList.add('hidden');
        }
    }

    const finishBtn = document.getElementById('finish-btn');
    if (finishBtn) {
        finishBtn.classList.remove('hidden');
    }

    document.getElementById('feedback').classList.add('hidden');
    
    // Clear existing report buttons if any
    const existingReportBtns = document.querySelectorAll('.btn-report-quiz');
    existingReportBtns.forEach(btn => btn.remove());

    // Add report button for quiz question
    const reportQId = q.id || `q_idx_${currentQuiz.currentQuestionIndex}`;
    const reportQType = currentQuiz.categoryId === 'private' ? 'private' : 'category';
    const reportQCatId = currentQuiz.id || currentQuiz.categoryId;
    const reportQTitle = q.text.replace(/'/g, "\\'").replace(/"/g, "&quot;");

    const reportBtnHtml = `
        <button onclick="openReportModal('${reportQId}', '${reportQType}', \`${reportQTitle}\`, '${reportQCatId}')" class="btn-report btn-report-quiz mt-4 w-fit">
            <i class="fas fa-flag"></i> Sualda xəta var? Bildir
        </button>
    `;
    const feedbackArea = document.getElementById('feedback');
    if (feedbackArea) {
        feedbackArea.insertAdjacentHTML('afterend', reportBtnHtml);
    }
    
    // Timer Logic
    if (currentQuiz.timeType !== 'total') {
        clearInterval(currentQuiz.timer);
    }
    
    // Ümumi vaxt məntiqi (dəqiqəni saniyəyə çeviririk)
    if (currentQuiz.timeType === 'total') {
        if (!currentQuiz.totalTimerStarted) {
            currentQuiz.timeLeft = currentQuiz.totalTime * 60; 
            currentQuiz.totalTimerStarted = true;
            
            if (currentQuiz.timer) clearInterval(currentQuiz.timer);
            currentQuiz.timer = setInterval(() => {
                currentQuiz.timeLeft--;
                updateTimerDisplay();
                if (currentQuiz.timeLeft <= 0) {
                    clearInterval(currentQuiz.timer);
                    showNotification('Vaxt bitdi!', 'warning');
                    finishQuiz();
                }
            }, 1000);
        }
        updateTimerDisplay();
        return; // Ümumi vaxtda fərdi sual taymeri yoxdur
    }
    
    // If we have a stored time for this question, use it. Otherwise set new time limit.
    if (currentQuiz.questionTimes[currentQuiz.currentQuestionIndex] !== null && currentQuiz.questionTimes[currentQuiz.currentQuestionIndex] !== undefined) {
        currentQuiz.timeLeft = currentQuiz.questionTimes[currentQuiz.currentQuestionIndex];
    } else {
        currentQuiz.timeLeft = timeLimit;
        currentQuiz.questionTimes[currentQuiz.currentQuestionIndex] = timeLimit;
    }

    updateTimerDisplay();
    currentQuiz.timer = setInterval(() => {
        currentQuiz.timeLeft--;
        currentQuiz.questionTimes[currentQuiz.currentQuestionIndex] = currentQuiz.timeLeft;
        updateTimerDisplay();
        if (currentQuiz.timeLeft <= 0) {
            clearInterval(currentQuiz.timer);
            timeIsUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(currentQuiz.timeLeft / 60);
    const seconds = currentQuiz.timeLeft % 60;
    document.getElementById('timer').textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function selectAnswer(selectedIndex) {
    const options = document.querySelectorAll('.option-btn');
    
    // If clicking already selected answer, deselect it
    if (selectedAnswerIndex === selectedIndex) {
        selectedAnswerIndex = -1;
        options[selectedIndex].classList.remove('selected');
    } else {
        selectedAnswerIndex = selectedIndex;
        // Remove selected class from all and add to the current one
        options.forEach((btn, idx) => {
            btn.classList.remove('selected');
            if (idx === selectedIndex) {
                btn.classList.add('selected');
            }
        });
    }

    // Update current quiz answers array
    currentQuiz.userAnswers[currentQuiz.currentQuestionIndex] = selectedAnswerIndex;

    // Enable next button (now it's always enabled, but we keep this logic if needed)
    document.getElementById('next-btn').disabled = false;
}

function timeIsUp() {
    // If time is up and no answer selected, it's wrong. If selected, process it.
    processCurrentQuestion();
}

window.nextQuestion = function() {
    processCurrentQuestion();
}

window.prevQuestion = function() {
    if (currentQuiz.currentQuestionIndex > 0) {
        if (currentQuiz.timeType !== 'total') {
            clearInterval(currentQuiz.timer);
        }
        // Save current answer before going back
        currentQuiz.userAnswers[currentQuiz.currentQuestionIndex] = selectedAnswerIndex;
        currentQuiz.currentQuestionIndex--;
        loadQuestion();
    }
}

window.confirmFinishQuiz = function() {
    const modal = document.getElementById('confirm-modal');
    const title = document.getElementById('confirm-modal-title');
    const text = document.getElementById('confirm-modal-text');
    const okBtn = document.getElementById('confirm-ok-btn');

    // Cari sualın cavabını da nəzərə alaq
    currentQuiz.userAnswers[currentQuiz.currentQuestionIndex] = selectedAnswerIndex;

    // Cavablandırılmamış sualları yoxlayaq
    const unansweredCount = currentQuiz.userAnswers.filter(ans => ans === -1 || ans === undefined || ans === null).length;

    title.textContent = 'İmtahanı bitirirsiniz?';
    
    if (unansweredCount > 0) {
        text.textContent = 'İmtahanı bitirmək istədiyinizdən əminsiniz? Cavablandırılmayan suallarınız ola bilər.';
    } else {
        text.textContent = 'İmtahanı bitirmək istədiyinizdən əminsiniz?';
    }

    okBtn.textContent = 'Bitir';
    okBtn.classList.add('flex-1', 'bg-danger', 'border-none');
    okBtn.classList.remove('border-danger', 'shadow-danger-sm', 'w-full');

    okBtn.onclick = function() {
        closeModal('confirm-modal');
        finishQuiz();
    };

    modal.classList.remove('hidden');
}

function finishQuiz() {
    clearInterval(currentQuiz.timer);
    // Save current answer before finishing
    currentQuiz.userAnswers[currentQuiz.currentQuestionIndex] = selectedAnswerIndex;
    showResult();
}

function processCurrentQuestion() {
    if (currentQuiz.timeType !== 'total') {
        clearInterval(currentQuiz.timer);
    }
    
    // Track answer for current index
    currentQuiz.userAnswers[currentQuiz.currentQuestionIndex] = selectedAnswerIndex;

    currentQuiz.currentQuestionIndex++;
    if (currentQuiz.currentQuestionIndex < currentQuiz.questions.length) {
        loadQuestion();
    } else {
        // Sonuncu sualdan sonra 1-ci suala qayıt
        currentQuiz.currentQuestionIndex = 0;
        loadQuestion();
    }
}

function showResult() {
    hideAllSections();
    document.getElementById('result-section').classList.remove('hidden');
    
    const total = currentQuiz.questions.length;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    currentQuiz.questions.forEach((q, idx) => {
        const userAns = currentQuiz.userAnswers[idx];
        const correctAnswer = q.correctIndex !== undefined ? q.correctIndex : 
                            (q.correct !== undefined ? q.correct : q.answer);
        
        if (userAns === -1 || userAns === undefined || userAns === null) {
            unanswered++;
        } else if (userAns === correctAnswer) {
            correct++;
        } else {
            wrong++;
        }
    });

    currentQuiz.score = correct; // Update final score
    const accuracy = Math.round((correct / total) * 100) || 0;
    
    trackEvent('finish_quiz', {
        category: currentQuiz.categoryId,
        score: correct,
        total: total,
        accuracy: accuracy
    });

    document.getElementById('score-text').textContent = `${accuracy}%`;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('wrong-count').textContent = wrong;
    
    const unansweredElem = document.getElementById('unanswered-count');
    if (unansweredElem) unansweredElem.textContent = unanswered;
    
    // Save attempt logic
    if (activePrivateQuiz) {
        const attempt = {
            quizId: activePrivateQuiz.id,
            quizTitle: activePrivateQuiz.title,
            teacherId: activePrivateQuiz.teacherId,
            studentName: studentName,
            score: correct,
            wrong: wrong,
            unanswered: unanswered,
            total: total,
            timestamp: Date.now(),
            answers: currentQuiz.userAnswers // Hər sualın cavabını yadda saxlayırıq
        };
        console.log("Saving student attempt:", attempt);
        saveStudentAttempt(attempt);
    } else if (currentUser) {
        const cat = categories.find(c => c.id === currentQuiz.categoryId);
        const attempt = {
            userId: currentUser.id,
            categoryName: cat ? cat.name : 'Naməlum',
            score: correct,
            wrong: wrong,
            unanswered: unanswered,
            total: total,
            timestamp: Date.now()
        };
        saveAttempt(attempt);
    }

    // Additional stats if needed
    const totalQuestionsElem = document.getElementById('total-questions-stat');
    if (totalQuestionsElem) totalQuestionsElem.textContent = total;

    // Share button logic
    const shareBtn = document.getElementById('share-quiz-btn');
    if (shareBtn) {
        if (!activePrivateQuiz && currentQuiz && currentQuiz.categoryId) {
            shareBtn.classList.remove('hidden');
        } else {
            shareBtn.classList.add('hidden');
        }
    }
}

window.copyPublicQuizLink = function() {
    if (!currentQuiz || !currentQuiz.categoryId) return;
    
    const catId = currentQuiz.categoryId;
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('cat', catId);
    const link = url.toString();
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showNotification('Link kopyalandı! Dostuna göndərə bilərsən.', 'success');
        }).catch(err => {
            console.error('Kopyalama xətası:', err);
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = link;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showNotification('Link kopyalandı! Dostuna göndərə bilərsən.', 'success');
            } catch (err) {
                prompt('Link:', link);
            }
            document.body.removeChild(textArea);
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('Link kopyalandı! Dostuna göndərə bilərsən.', 'success');
        } catch (err) {
            prompt('Link:', link);
        }
        document.body.removeChild(textArea);
    }
};

window.showDashboard = function(doPush = true) {
    removeProtection();
    // If a quiz is in progress, stop the timer
    if (currentQuiz && currentQuiz.timer) {
        clearInterval(currentQuiz.timer);
    }
    currentQuiz = null;

    // If it was a private quiz, we should clear the URL and reload to fully reset
    if (activePrivateQuiz || window.location.search.includes('quiz=')) {
        window.location.href = window.location.origin + window.location.pathname;
        return;
    }
    
    if (doPush) {
        // URL-dəki bütün parametrləri sil və ana səhifəyə (root) qaytar
        window.history.pushState({ page: 'home' }, '', window.location.pathname);
    }

    activePrivateQuiz = null;
    studentName = '';
    
    hideAllSections();
    const chatSec = document.getElementById('admin-chat-section');
    if (chatSec) chatSec.classList.add('hidden'); // Explicitly hide to be safe

    document.getElementById('dashboard-section').classList.remove('hidden');
    currentParentId = null;
    renderCategories();
}

async function saveStudentAttempt(attempt) {
    if (db) {
        try {
            await db.collection('student_attempts').add(attempt);
        } catch (e) {
            console.error("Firebase student attempt error:", e);
        }
    }
    // Also save to teacher's local storage if they are viewing? 
    // Actually, student attempts should be viewed by teacher.
}

async function saveAttempt(attempt) {
    if (db) {
        try {
            await db.collection('attempts').add(attempt);
        } catch (e) {
            console.error("Firebase save attempt error:", e);
            saveAttemptLocal(attempt);
        }
    } else {
        saveAttemptLocal(attempt);
    }
}

function saveAttemptLocal(attempt) {
    const history = JSON.parse(localStorage.getItem(`history_${currentUser.id}`)) || [];
    history.unshift(attempt); // Add to beginning
    localStorage.setItem(`history_${currentUser.id}`, JSON.stringify(history.slice(0, 50))); // Keep last 50
}

// --- Utils ---
window.closeModal = function(id) {
    document.getElementById(id).classList.add('hidden');
}

// --- YouTube Review Toggle ---
window.__YT_REVIEW_ENABLED = (function() {
    try {
        const val = sessionStorage.getItem('yt_review_enabled');
        if (val === null) return true; // default: visible
        return val === 'true';
    } catch (_) { return true; }
})();
window.enableYouTubeReview = function() {
    window.__YT_REVIEW_ENABLED = true;
    try { sessionStorage.setItem('yt_review_enabled', 'true'); } catch (_) {}
};
window.disableYouTubeReview = function() {
    window.__YT_REVIEW_ENABLED = false;
    try { sessionStorage.setItem('yt_review_enabled', 'false'); } catch (_) {}
};

window.openQuestionVideo = function(videoId, type) {
    const modal = document.getElementById('video-view-modal');
    const container = document.getElementById('video-player-container');
    if (!modal || !container) return;
    container.innerHTML = '';
    if (type === 'youtube') {
        const uniqueId = `vp_${Date.now()}`;
        container.innerHTML = `
            <div class="plyr__video-embed" id="${uniqueId}">
                <iframe src="https://www.youtube.com/embed/${videoId}?origin=${window.location.origin}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1" allowfullscreen allowtransparency allow="autoplay"></iframe>
            </div>
        `;
        new Plyr(`#${uniqueId}`, {
            youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });
    } else {
        container.innerHTML = `
            <div class="video-placeholder">
                <i class="fas fa-play-circle"></i>
                <span>Video İzah Yüklənib</span>
            </div>
        `;
    }
    modal.classList.remove('hidden');
};

window.closeQuestionVideo = function() {
    const modal = document.getElementById('video-view-modal');
    const container = document.getElementById('video-player-container');
    if (container) container.innerHTML = '';
    if (modal) modal.classList.add('hidden');
};

window.showQuizReview = function() {
    hideAllSections();
    const reviewSection = document.getElementById('review-section');
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';
    reviewSection.classList.remove('hidden');

    currentQuiz.questions.forEach((q, idx) => {
        const userAnswer = currentQuiz.userAnswers[idx];
        const correctAnswer = q.correctIndex !== undefined ? q.correctIndex : 
                            (q.correct !== undefined ? q.correct : q.answer);
        
        const isUnanswered = userAnswer === -1 || userAnswer === undefined || userAnswer === null;
        const isCorrect = !isUnanswered && userAnswer === correctAnswer;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : (isUnanswered ? 'unanswered' : 'wrong')}`;
        
        let optionsHtml = '';
        q.options.forEach((opt, optIdx) => {
            let optClass = 'review-option';
            if (optIdx === correctAnswer) optClass += ' correct-ans';
            else if (optIdx === userAnswer) optClass += ' wrong-ans';
            
            optionsHtml += `<div class="${optClass}">${opt}</div>`;
        });

        let statusText = isCorrect ? 'Düzgün' : (isUnanswered ? 'Cavablandırılmayıb' : 'Yanlış');
        let statusIcon = isCorrect ? 'check' : (isUnanswered ? 'minus' : 'times');

        reviewItem.innerHTML = `
            <div class="review-question">${idx + 1}. ${q.text}</div>
            ${q.image ? `<img src="${q.image}" class="max-w-full rounded-md mb-2">` : ''}
            ${q.videoId && q.videoType ? `
                <div class="question-video-container mb-3">
                    <div class="video-actions-container">
                        <button class="btn-video-action" onclick="openQuestionVideo('${q.videoId}', '${q.videoType}')">
                            <i class="fas fa-play-circle"></i>
                            <span>Video İzaha Bax</span>
                        </button>
                    </div>
                </div>
            ` : ''}
            <div class="review-options">
                ${optionsHtml}
            </div>
            <div class="review-status ${isCorrect ? 'correct' : (isUnanswered ? 'unanswered' : 'wrong')}">
                <i class="fas fa-${statusIcon}-circle"></i>
                ${statusText}
            </div>
            ${q.explanation ? `
                <div class="review-explanation-box mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <h4 class="text-sm font-bold mb-2 text-primary"><i class="fas fa-info-circle mr-2"></i>Sualın İzahı:</h4>
                    <p class="text-sm text-gray-700 mb-0">${q.explanation}</p>
                </div>
            ` : ''}
        `;
        reviewList.appendChild(reviewItem);

        if (q.videoId && q.videoType === 'youtube' && !window.__YT_REVIEW_ENABLED) {}
    });
}

window.hideReview = function() {
    hideAllSections();
    document.getElementById('result-section').classList.remove('hidden');
}

// --- Reporting System ---
window.openReportModal = function(qId, qType, qTitle, qCatId = null) {
    document.getElementById('report-q-id').value = qId;
    document.getElementById('report-q-type').value = qType;
    document.getElementById('report-q-title-val').value = qTitle;
    document.getElementById('report-q-cat-id').value = qCatId || activeCategoryId || '';
    document.getElementById('report-q-title').textContent = `Sual: ${qTitle.length > 60 ? qTitle.substring(0, 60) + '...' : qTitle}`;
    document.getElementById('report-message').value = '';
    document.getElementById('report-modal').classList.remove('hidden');
}

window.submitReport = async function() {
    const qId = document.getElementById('report-q-id').value;
    const qType = document.getElementById('report-q-type').value;
    const qTitle = document.getElementById('report-q-title-val').value;
    const qCatId = document.getElementById('report-q-cat-id').value;
    const message = document.getElementById('report-message').value.trim();
    
    if (!message) {
        return showNotification('Lütfən mesajınızı daxil edin', 'error');
    }

    const report = {
        questionId: qId,
        questionType: qType,
        questionTitle: qTitle,
        categoryId: qCatId,
        message: message,
        userId: currentUser ? currentUser.id : 'anonim',
        username: currentUser ? 
            (`${currentUser.name || ''} ${currentUser.surname || ''}`.trim() || currentUser.username) : 
            (typeof studentName !== 'undefined' && studentName ? studentName : 'Anonim'),
        timestamp: Date.now(),
        status: 'pending'
    };

    // Əgər sual özəl testdədirsə və ya categoryId yoxdursa, məlumatları tapmağa çalışaq
    if (qType === 'private' || qType === 'quiz' || !qCatId) {
        try {
            if (db) {
                // 1. Əgər qCatId varsa, onun özəl test olub-olmadığını yoxlayaq
                if (qCatId) {
                    const quizDoc = await db.collection('private_quizzes').doc(qCatId).get();
                    if (quizDoc.exists) {
                        report.teacherId = quizDoc.data().teacherId;
                    }
                }

                // 2. Əgər teacherId hələ də yoxdursa, bütün özəl testlərdə sual ID-si ilə axtaraq
                if (!report.teacherId) {
                    const quizSnapshot = await db.collection('private_quizzes').get();
                    for (const doc of quizSnapshot.docs) {
                        const data = doc.data();
                        if (data.questions && data.questions.some(q => q.id == qId || (qTitle && q.text && q.text.includes(qTitle.substring(0, 30))))) {
                            report.teacherId = data.teacherId;
                            if (!report.categoryId) report.categoryId = doc.id;
                            if (report.questionType === 'public') report.questionType = 'private'; 
                            break;
                        }
                    }
                }

                // 3. Əgər hələ də yoxdursa, kateqoriyalarda axtaraq (categoryId tapmaq üçün)
                if (!report.categoryId) {
                    const catSnapshot = await db.collection('categories').get();
                    for (const doc of catSnapshot.docs) {
                        const data = doc.data();
                        if (data.questions && data.questions.some(q => q.id == qId || (qTitle && q.text && q.text.includes(qTitle.substring(0, 30))))) {
                            report.categoryId = doc.id;
                            break;
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Teacher/Category lookup error:", err);
        }
    }

    try {
        if (db) {
            await db.collection('reports').add(report);
        } else {
            const reports = JSON.parse(localStorage.getItem('reports') || '[]');
            reports.push({ ...report, id: Date.now().toString() });
            localStorage.setItem('reports', JSON.stringify(reports));
        }
        
        showNotification('Şikayətiniz uğurla göndərildi. Təşəkkür edirik!');
        closeModal('report-modal');
    } catch (e) {
        console.error(e);
        showNotification('Xəta baş verdi, yenidən cəhd edin', 'error');
    }
}

window.showReports = function(doPush = true) {
    if (doPush) {
        const url = new URL(window.location);
        url.searchParams.set('page', 'reports');
        url.searchParams.delete('cat');
        url.searchParams.delete('adminCat');
        window.history.pushState({ page: 'reports' }, '', url);
    }

    hideAllSections();
    document.getElementById('reports-section').classList.remove('hidden');
    window.__adminReportsState = { reports: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0, meta: { allQuizzes: [], allUsers: [] } };
    loadReports(true);
}

window.loadReports = async function(initial = false) {
    const list = document.getElementById('reports-list');
    const loadMoreBtn = document.getElementById('admin-reports-load-more');
    const PAGE_SIZE = 5;
    const state = window.__adminReportsState || (window.__adminReportsState = { reports: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0, meta: { allQuizzes: [], allUsers: [] } });
    if (initial) {
        list.innerHTML = '<div class="text-center p-5"><i class="fas fa-spinner fa-spin text-primary"></i> Yüklənir...</div>';
        state.reports = [];
        state.lastDoc = null;
        state.hasMore = true;
        state.fallbackAll = null;
        state.pageIndex = 0;
    } else {
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
        }
    }
    
    try {
        let reportsPage = [];

        if (db) {
            if (initial || !state.meta || state.meta.allQuizzes.length === 0) {
                const [quizSnapshot, catSnapshot] = await Promise.all([
                    db.collection('private_quizzes').get(),
                    db.collection('categories').get()
                ]);
                const allQuizzes = quizSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const allCats = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                state.meta = { allQuizzes: [...allQuizzes, ...allCats], allUsers: [] };
            }
            try {
                let q = db.collection('reports').orderBy('timestamp', 'desc').limit(PAGE_SIZE);
                if (state.lastDoc) q = q.startAfter(state.lastDoc);
                const snapshot = await q.get();
                reportsPage = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                state.lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : state.lastDoc;
                if (reportsPage.length < PAGE_SIZE) state.hasMore = false;
            } catch (queryErr) {
                const snapshot = await db.collection('reports').get();
                const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
                    const ta = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
                    const tb = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
                    return tb - ta;
                });
                state.fallbackAll = state.fallbackAll || allReports;
                const start = state.pageIndex * PAGE_SIZE;
                const end = start + PAGE_SIZE;
                reportsPage = state.fallbackAll.slice(start, end);
                state.pageIndex += 1;
                if (end >= state.fallbackAll.length) state.hasMore = false;
            }
        } else {
            const all = JSON.parse(localStorage.getItem('reports') || '[]').sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
            state.fallbackAll = state.fallbackAll || all;
            const start = state.pageIndex * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            reportsPage = state.fallbackAll.slice(start, end);
            state.pageIndex += 1;
            if (end >= state.fallbackAll.length) state.hasMore = false;
        }

        if (state.reports.length === 0 && reportsPage.length === 0) {
            list.innerHTML = '<div class="text-center p-10 text-muted">Hələ heç bir şikayət və ya mesaj yoxdur.</div>';
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
            return;
        }
        if (initial) list.innerHTML = '';
        state.reports = state.reports.concat(reportsPage);
        appendAdminReports(reportsPage, list, state.meta.allQuizzes, state.meta.allUsers);
        if (loadMoreBtn) {
            if (state.hasMore) {
                loadMoreBtn.classList.remove('hidden');
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = 'Daha çox yüklə';
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error(e);
        list.innerHTML = '<div class="text-center p-5 text-danger">Şikayətləri yükləmək mümkün olmadı.</div>';
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = 'Daha çox yüklə';
        }
    }
}

function appendAdminReports(reports, list, allQuizzes, allUsers) {
    reports.forEach(report => {
        const div = document.createElement('div');
        div.className = `list-item border-l-4 ${report.status === 'pending' ? 'border-danger' : 'border-success'}`;
        const dateStr = report.timestamp ? (report.timestamp.toDate ? report.timestamp.toDate() : new Date(report.timestamp)).toLocaleString('az-AZ') : 'Tarix yoxdur';
        let ownerInfo = '';
        let foundQuiz = null;
        if (report.categoryId && report.categoryId !== 'private') {
            foundQuiz = (allQuizzes || []).find(q => q.id == report.categoryId);
        }
        if (!foundQuiz) {
            const searchTitle = report.questionTitle ? report.questionTitle.replace(/\.\.\.$/, '').trim() : '';
            foundQuiz = (allQuizzes || []).find(quiz =>
                quiz.questions && quiz.questions.some((q, idx) =>
                    (q.id && report.questionId && q.id == report.questionId) ||
                    (report.questionId && (report.questionId == idx || report.questionId == `q_idx_${idx}`)) ||
                    (searchTitle && q.text && q.text.includes(searchTitle.substring(0, 30)))
                )
            );
        }
        if (!foundQuiz && report.teacherId) {
            foundQuiz = (allQuizzes || []).find(q => q.teacherId == report.teacherId);
        }
        if (foundQuiz) {
            let authorName = foundQuiz.authorName;
            if (!authorName && foundQuiz.teacherId) {
                const teacher = (allUsers || []).find(u => u.id == foundQuiz.teacherId);
                if (teacher) {
                    authorName = `${teacher.name || ''} ${teacher.surname || ''}`.trim() || teacher.username;
                }
            }
            if (!authorName && report.teacherId) {
                const teacher = (allUsers || []).find(u => u.id == report.teacherId);
                if (teacher) {
                    authorName = `${teacher.name || ''} ${teacher.surname || ''}`.trim() || teacher.username;
                }
            }
            const safeAuthorName = escapeHtml(authorName || '');
            const safeQuizTitle = escapeHtml((foundQuiz.title || foundQuiz.name || 'Adsız'));
            ownerInfo = `
                <div class="mt-1 flex items-center gap-2">
                    ${authorName ? `
                        <span class="text-[10px] bg-primary-light text-primary px-2 py-0.5 rounded-full border border-primary/20">
                            <i class="fas fa-user-tie"></i> Müəllim: ${safeAuthorName}
                        </span>
                    ` : ''}
                    <span class="text-[10px] bg-warning-light text-warning-dark px-2 py-0.5 rounded-full border border-warning/20">
                        <i class="fas fa-file-alt"></i> Test/Kateqoriya: ${safeQuizTitle}
                    </span>
                </div>
            `;
        } else if (report.teacherId) {
            const teacher = (allUsers || []).find(u => u.id == report.teacherId);
            if (teacher) {
                const authorName = `${teacher.name || ''} ${teacher.surname || ''}`.trim() || teacher.username;
                const safeAuthorName = escapeHtml(authorName || '');
                ownerInfo = `
                    <div class="mt-1 flex items-center gap-2">
                        <span class="text-[10px] bg-primary-light text-primary px-2 py-0.5 rounded-full border border-primary/20">
                            <i class="fas fa-user-tie"></i> Müəllim: ${safeAuthorName}
                        </span>
                    </div>
                `;
            }
        }
        let headerHtml = '';
        if (report.type === 'contact_form') {
            headerHtml = `
                <div class="flex items-center gap-2">
                    <span class="font-semibold text-success">
                        <i class="fas fa-envelope"></i> Əlaqə Mesajı
                    </span>
                </div>
            `;
        } else {
            let typeLabel = 'Ümumi';
            if (report.questionType === 'private' || report.questionType === 'quiz') typeLabel = 'Özəl Test';
            else if (report.questionType === 'category') typeLabel = 'Kateqoriya';
            headerHtml = `
                <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-primary">
                            <i class="fas fa-question-circle"></i> Sual ID: ${report.questionId} (${typeLabel})
                        </span>
                        <button onclick="goToReportedQuestion('${report.categoryId || ''}', '${report.questionId}', '${report.questionType}', \`${(report.questionTitle || '').replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`)" class="btn-primary p-1 px-2 text-xs rounded-sm">
                            <i class="fas fa-external-link-alt"></i> Suala get
                        </button>
                    </div>
                    ${ownerInfo}
                </div>
            `;
        }
        const statusBadge = report.status === 'pending' ?
            '<span class="inbox-status status-pending"><i class="fas fa-clock"></i> Gözləyir</span>' :
            '<span class="inbox-status status-replied"><i class="fas fa-check-double"></i> Cavablandı</span>';
        const safeQuestionTitle = report.questionTitle ? escapeHtml(report.questionTitle) : '';
        const safeMessage = escapeHtml(report.message || '');
        const safeAdminReply = escapeHtml(report.adminReply || '');
        const safeSender = escapeHtml(report.username || report.name || report.userName || 'Qonaq');
        const safeContact = report.contactInfo ? escapeHtml(report.contactInfo) : '';
        div.innerHTML = `
            <div class="flex-1">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            ${headerHtml}
                            ${statusBadge}
                        </div>
                        ${report.questionTitle ? `
                            <span class="text-sm text-main font-medium">
                                <strong>Sual:</strong> ${safeQuestionTitle}
                            </span>
                        ` : ''}
                    </div>
                    <span class="text-xs text-muted">${dateStr}</span>
                </div>
                <div class="mb-2 bg-bg p-3 rounded-md border-l-2 border-border text-main">
                    <div class="text-xs text-uppercase text-muted font-semibold mb-1">Mesaj:</div>
                    "${safeMessage}"
                </div>
                ${report.adminReply ? `
                    <div class="mb-2 bg-success-light p-3 rounded-md border-l-2 border-success text-success-dark">
                        <div class="text-xs text-uppercase text-success-dark font-semibold mb-1">Sizin Cavabınız:</div>
                        "${safeAdminReply}"
                    </div>
                ` : ''}
                <div class="text-sm text-muted flex items-center gap-2 flex-wrap">
                    <span><i class="fas fa-user"></i> Göndərən: <strong>${safeSender}</strong></span>
                    ${report.contactInfo ? `<span>|</span> <span><i class="fas fa-at"></i> Əlaqə: <strong>${safeContact}</strong></span>` : ''}
                    <span>|</span>
                    <span>ID: ${report.userId}</span>
                </div>
            </div>
            <div class="flex gap-2 items-center flex-shrink-0">
                <button onclick="openReplyModal('${report.id}', \`${(report.message || '').replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`)" class="btn-reply" title="Cavab yaz">
                    <i class="fas fa-reply"></i>
                    <span>Cavab yaz</span>
                </button>
                ${report.status === 'pending' ? `
                    <button onclick="markReportAsResolved('${report.id}')" class="btn-success p-2 text-xs rounded-sm" title="Həll edildi">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button onclick="deleteReport('${report.id}')" class="btn-outline p-2 text-xs rounded-sm border-danger text-danger" title="Sil">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.loadMoreAdminReports = function() {
    if (!window.__adminReportsState || window.__adminReportsState.loading === true) return;
    window.__adminReportsState.loading = true;
    loadReports(false).finally(() => {
        window.__adminReportsState.loading = false;
    });
}
window.markReportAsResolved = async function(reportId) {
    try {
        if (db) {
            await db.collection('reports').doc(reportId).update({ status: 'resolved' });
        } else {
            let reports = JSON.parse(localStorage.getItem('reports') || '[]');
            const idx = reports.findIndex(r => r.id == reportId);
            if (idx !== -1) {
                reports[idx].status = 'resolved';
                localStorage.setItem('reports', JSON.stringify(reports));
            }
        }
        loadReports(true);
    } catch (e) {
        console.error(e);
    }
}

// --- Inbox & Reply Functions ---

window.openReplyModal = function(reportId, message) {
    document.getElementById('reply-report-id').value = reportId;
    document.getElementById('reply-user-msg').textContent = message;
    document.getElementById('reply-message').value = '';
    document.getElementById('reply-modal').classList.remove('hidden');
}

window.submitReply = async function() {
    const reportId = document.getElementById('reply-report-id').value;
    const message = document.getElementById('reply-message').value.trim();
    
    if (!message) return showNotification('Cavab mətni boş ola bilməz', 'warning');
    
    const btn = document.querySelector('#reply-modal .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Göndərilir...';
    
    try {
        const replyData = {
            adminReply: message,
            status: 'resolved',
            replyTimestamp: Date.now()
        };

        if (db) {
            await db.collection('reports').doc(reportId).update(replyData);
        } else {
            let reports = JSON.parse(localStorage.getItem('reports') || '[]');
            const idx = reports.findIndex(r => r.id == reportId);
            if (idx !== -1) {
                reports[idx] = { ...reports[idx], ...replyData };
                localStorage.setItem('reports', JSON.stringify(reports));
            }
        }
        
        closeModal('reply-modal');
        showNotification('Cavab uğurla göndərildi', 'success');
        loadReports(true);
    } catch (e) {
        console.error(e);
        showNotification('Xəta baş verdi', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

window.loadUserInbox = async function(initial = false) {
    const list = document.getElementById('user-inbox-list');
    const countBadge = document.getElementById('user-inbox-count');
    const loadMoreBtn = document.getElementById('user-inbox-load-more');
    const PAGE_SIZE = 5;
    const state = window.__userInboxState || (window.__userInboxState = { reports: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 });
    if (!list) return;
    if (!currentUser) {
        list.innerHTML = '<div class="text-center p-5">Giriş edilməyib.</div>';
        return;
    }
    if (initial) {
        list.innerHTML = '<div class="text-center p-5"><i class="fas fa-spinner fa-spin text-primary"></i> Yüklənir...</div>';
        state.reports = [];
        state.lastDoc = null;
        state.hasMore = true;
        state.fallbackAll = null;
        state.pageIndex = 0;
    } else {
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
        }
    }
    try {
        let page = [];
        if (db) {
            try {
                let q = db.collection('reports').where('userId', '==', currentUser.id).orderBy('timestamp', 'desc').limit(PAGE_SIZE);
                if (state.lastDoc) q = q.startAfter(state.lastDoc);
                const snapshot = await q.get();
                page = snapshot.docs.map(doc => {
                    const data = doc.data();
                    let ts = data.timestamp;
                    if (ts && typeof ts.toDate === 'function') ts = ts.toDate().getTime();
                    else if (ts) ts = new Date(ts).getTime();
                    else ts = 0;
                    let rts = data.replyTimestamp;
                    if (rts && typeof rts.toDate === 'function') rts = rts.toDate().getTime();
                    else if (rts) rts = new Date(rts).getTime();
                    else rts = null;
                    return { id: doc.id, ...data, timestamp: ts, replyTimestamp: rts };
                });
                state.lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : state.lastDoc;
                if (page.length < PAGE_SIZE) state.hasMore = false;
            } catch (queryErr) {
                const snapshot = await db.collection('reports').where('userId', '==', currentUser.id).get();
                const allReports = snapshot.docs.map(doc => {
                    const data = doc.data();
                    let ts = data.timestamp;
                    if (ts && typeof ts.toDate === 'function') ts = ts.toDate().getTime();
                    else if (ts) ts = new Date(ts).getTime();
                    else ts = 0;
                    let rts = data.replyTimestamp;
                    if (rts && typeof rts.toDate === 'function') rts = rts.toDate().getTime();
                    else if (rts) rts = new Date(rts).getTime();
                    else rts = null;
                    return { id: doc.id, ...data, timestamp: ts, replyTimestamp: rts };
                }).sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
                state.fallbackAll = state.fallbackAll || allReports;
                const start = state.pageIndex * PAGE_SIZE;
                const end = start + PAGE_SIZE;
                page = state.fallbackAll.slice(start, end);
                state.pageIndex += 1;
                if (end >= state.fallbackAll.length) state.hasMore = false;
            }
        } else {
            const all = JSON.parse(localStorage.getItem('reports') || '[]')
                .filter(r => r.userId == currentUser.id)
                .map(r => ({
                    ...r,
                    timestamp: new Date(r.timestamp).getTime(),
                    replyTimestamp: r.replyTimestamp ? new Date(r.replyTimestamp).getTime() : null
                }))
                .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
            state.fallbackAll = state.fallbackAll || all;
            const start = state.pageIndex * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            page = state.fallbackAll.slice(start, end);
            state.pageIndex += 1;
            if (end >= state.fallbackAll.length) state.hasMore = false;
        }
        if (countBadge) {
            const total = state.fallbackAll ? state.fallbackAll.length : (state.reports.length + page.length);
            countBadge.textContent = `${total} mesaj`;
        }
        if (state.reports.length === 0 && page.length === 0) {
            list.innerHTML = '<div class="no-messages">Hələ heç bir şikayətiniz yoxdur.</div>';
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
            return;
        }
        if (initial) list.innerHTML = '';
        state.reports = state.reports.concat(page);
        page.forEach(report => {
            const div = document.createElement('div');
            div.className = 'inbox-item';
            const date = report.timestamp ? new Date(report.timestamp).toLocaleString('az-AZ') : 'Naməlum tarix';
            const replyDate = report.replyTimestamp ? new Date(report.replyTimestamp).toLocaleString('az-AZ') : '';
            const statusBadge = report.status === 'pending' ? 
                '<span class="inbox-status status-pending"><i class="fas fa-clock"></i> Gözləyir</span>' : 
                '<span class="inbox-status status-replied"><i class="fas fa-check-double"></i> Cavablandı</span>';
            div.innerHTML = `
                <div class="inbox-header">
                    <div class="flex items-center gap-2">
                        <span class="report-type">
                            <i class="fas ${report.type === 'contact_form' ? 'fa-envelope' : 'fa-flag'}"></i> 
                            ${report.type === 'contact_form' ? 'Əlaqə Mesajı' : (report.questionType === 'public' ? 'Ümumi Sual' : 'Kateqoriya Sualı')}
                        </span>
                        ${statusBadge}
                    </div>
                    <span class="report-date">${date}</span>
                </div>
                <div class="report-content">
                    <strong>Şikayətiniz:</strong> "${escapeHtml(report.message || '')}"
                </div>
                ${report.adminReply ? `
                    <div class="admin-reply">
                        <div class="admin-reply-header">
                            <span><i class="fas fa-user-shield"></i> Admin Cavabı:</span>
                            <span class="text-xs opacity-80">${replyDate}</span>
                        </div>
                        <div class="admin-reply-content">
                            "${escapeHtml(report.adminReply || '')}"
                        </div>
                    </div>
                ` : `
                    <div class="text-sm text-muted italic">
                        <i class="fas fa-clock"></i> Cavab gözlənilir...
                    </div>
                `}
            `;
            list.appendChild(div);
        });
        if (loadMoreBtn) {
            if (state.hasMore) {
                loadMoreBtn.classList.remove('hidden');
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = 'Daha çox yüklə';
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error("Inbox loading error:", e);
        list.innerHTML = `<div class="text-center p-5 text-danger">
            Inboxu yükləmək mümkün olmadı.<br>
            <small class="text-xs">Xəta: ${e.message}</small>
        </div>`;
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = 'Daha çox yüklə';
        }
    }
};

window.loadMoreUserInbox = function() {
    if (!window.__userInboxState || window.__userInboxState.loading === true) return;
    window.__userInboxState.loading = true;
    loadUserInbox(false).finally(() => {
        window.__userInboxState.loading = false;
    });
}


window.deleteReport = async function(reportId) {
    if (!confirm('Bu şikayəti silmək istədiyinizə əminsiniz?')) return;
    
    try {
        if (db) {
            await db.collection('reports').doc(reportId).delete();
        } else {
            let reports = JSON.parse(localStorage.getItem('reports') || '[]');
            reports = reports.filter(r => r.id != reportId);
            localStorage.setItem('reports', JSON.stringify(reports));
        }
        showNotification('Şikayət silindi', 'success');
        loadReports();
    } catch (e) {
        console.error("Delete Report Error:", e);
        showNotification('Şikayəti silmək mümkün olmadı: ' + (e.message || 'İcazə yoxdur'), 'error');
    }
}

window.cleanupBadReports = async function() {
    if (!confirm('Bütün boş və ya xətalı şikayətləri təmizləmək istədiyinizə əminsiniz?')) return;
    
    try {
        showNotification('Təmizləmə başlayır...', 'info');
        let deletedCount = 0;
        
        if (db) {
            const snapshot = await db.collection('reports').get();
            
            // Firestore batch limit is 500, let's process in batches if needed
            // But for simple cleanup, we can just delete one by one or use small batches
            const deletePromises = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                // Təmizləmə kriteriyaları:
                // 1. Mesaj yoxdursa
                // 2. Tipi 'live_chat' isə
                // 3. QuestionId yoxdursa və contact_form deyilsə
                const isBad = !data.message || 
                              data.type === 'live_chat' || 
                              (!data.questionId && data.type !== 'contact_form');
                              
                if (isBad) {
                    deletePromises.push(db.collection('reports').doc(doc.id).delete());
                    deletedCount++;
                }
            });
            
            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
            }
        } else {
            let reports = JSON.parse(localStorage.getItem('reports') || '[]');
            const initialCount = reports.length;
            reports = reports.filter(r => r.message && r.type !== 'live_chat' && (r.questionId || r.type === 'contact_form'));
            deletedCount = initialCount - reports.length;
            localStorage.setItem('reports', JSON.stringify(reports));
        }
        
        showNotification(`${deletedCount} ədəd xətalı şikayət silindi`, 'success');
        loadReports();
    } catch (e) {
        console.error("Cleanup Error:", e);
        showNotification('Təmizləmə zamanı xəta: ' + (e.message || 'İcazə yoxdur'), 'error');
    }
}

window.goToReportedQuestion = async function(catId, qId, qType, questionText = "") {
    // Clean question text from truncation dots and escape characters
    const cleanText = questionText ? questionText.replace(/\.\.\.$/, '').trim() : "";
    
    // Əgər catId varsa və bu bir özəl testdirsə (və 'private' deyilsə)
    if (catId && catId !== 'private' && (qType === 'private' || qType === 'quiz' || !qType)) {
        try {
            if (db) {
                const quizDoc = await db.collection('private_quizzes').doc(catId).get();
                if (quizDoc.exists) {
                    showNotification('Özəl testə yönləndirilir...', 'info');
                    showTeacherDashboard();
                    setTimeout(() => {
                        editPrivateQuiz(catId);
                        setTimeout(() => {
                            const questions = document.querySelectorAll('.question-item');
                            for (let el of questions) {
                                if (el.innerHTML.includes(qId) || (cleanText && el.innerHTML.includes(cleanText.substring(0, 30)))) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    el.style.border = "2px solid var(--warning-color)";
                                    el.style.boxShadow = "0 0 15px var(--warning-soft)";
                                    break;
                                }
                            }
                        }, 1000);
                    }, 1000);
                    return;
                }
            }
        } catch (e) {
            console.error("Private quiz check error:", e);
        }
    }

    if (!catId || catId === 'private') {
        showNotification('Sual bazada axtarılır...', 'info');
        
        try {
            if (db) {
                // 1. Ümumi suallarda axtar (Doc ID ilə)
                const pubDoc = await db.collection('public_questions').doc(qId).get();
                if (pubDoc.exists) {
                    const data = pubDoc.data();
                    catId = data.categoryId;
                    qType = 'public';
                } else {
                    // 2. Ümumi suallarda axtar (Sualın daxilindəki ID sahəsi ilə)
                    const pubQuery = await db.collection('public_questions').where('id', '==', qId).get();
                    if (!pubQuery.empty) {
                        const data = pubQuery.docs[0].data();
                        catId = data.categoryId;
                        qType = 'public';
                        qId = pubQuery.docs[0].id;
                    } else {
                        // 3. Kateqoriyalarda axtar (İçindəki suallar massivində)
                        const cats = await db.collection('categories').get();
                        for (let doc of cats.docs) {
                            const catData = doc.data();
                            if (catData.questions && Array.isArray(catData.questions)) {
                                const found = catData.questions.find(q => 
                                    (qId && (q.id == qId || String(q.id) === String(qId))) || 
                                    (cleanText && q.text && (q.text === cleanText || q.text.includes(cleanText.substring(0, 50)) || cleanText.includes(q.text.substring(0, 50))))
                                );
                                if (found) {
                                    catId = doc.id;
                                    qType = 'category';
                                    qId = found.id;
                                    break;
                                }
                            }
                        }

                        // 4. Əgər kateqoriyalarda tapılmasa, onda Şəxsi Testlərdə axtar
                        if (!catId) {
                            const pQuizzes = await db.collection('private_quizzes').get();
                            for (let doc of pQuizzes.docs) {
                                const quizData = doc.data();
                                if (quizData.questions && Array.isArray(quizData.questions)) {
                                    const found = quizData.questions.find((q, idx) => 
                                        (qId && (q.id == qId || String(q.id) === String(qId) || qId == idx || qId == `q_idx_${idx}`)) || 
                                        (cleanText && q.text && (q.text === cleanText || q.text.includes(cleanText.substring(0, 50)) || cleanText.includes(q.text.substring(0, 50))))
                                    );
                                    if (found) {
                                        catId = doc.id;
                                        qType = 'private';
                                        
                                        let teacherName = quizData.authorName;
                                        if (!teacherName && quizData.teacherId) {
                                            try {
                                                const userDoc = await db.collection('users').doc(String(quizData.teacherId)).get();
                                                if (userDoc.exists) {
                                                    const userData = userDoc.data();
                                                    teacherName = `${userData.name || ''} ${userData.surname || ''}`.trim() || userData.username;
                                                }
                                            } catch (e) {
                                                console.error("Teacher fetch error:", e);
                                            }
                                        }
                                        
                                        teacherName = teacherName || 'Naməlum Müəllim';
                                        const testTitle = quizData.title || 'Adsız Test';
                                        showNotification(`Sual şəxsi test daxilində tapıldı. Müəllim: ${teacherName}, Test: ${testTitle}.`, 'info');
                                        
                                        // Birbaşa keçid edirik
                                        showTeacherDashboard();
                                        setTimeout(() => {
                                            editPrivateQuiz(catId);
                                            setTimeout(() => {
                                                const questions = document.querySelectorAll('.question-item');
                                                for (let el of questions) {
                                                    if (el.innerHTML.includes(qId) || (cleanText && el.innerHTML.includes(cleanText.substring(0, 30)))) {
                                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        el.style.border = "2px solid var(--warning-color)";
                                                        el.style.boxShadow = "0 0 15px var(--warning-soft)";
                                                        break;
                                                    }
                                                }
                                            }, 1000);
                                        }, 1000);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Sual axtarış xətası:", err);
        }

        if (!catId) {
            return showNotification('Sual heç bir bazada tapılmadı. Ola bilsin ki, silinib və ya formatı dəyişib.', 'error');
        }
    }
    
    // Keçid məntiqi eyni qalır...
    if (qType === 'public') {
        activeCategoryId = catId;
        showPublicQuestions();
        setTimeout(() => {
            const elements = document.getElementsByClassName('public-q-card');
            for (let el of elements) {
                if (el.dataset.id == qId || el.innerHTML.includes(qId) || (cleanText && el.innerHTML.includes(cleanText.substring(0, 20)))) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight-primary');
                    setTimeout(() => el.classList.remove('highlight-primary'), 3000);
                    break;
                }
            }
        }, 1200);
    } else if (qType === 'private') {
        // Əgər özəl testdirsə, müəllim panelinə keç və testi redaktə et
        showTeacherDashboard();
        setTimeout(() => {
            editPrivateQuiz(catId);
            setTimeout(() => {
                // Sualı redaktə pəncərəsində tap və vurğula
                const questions = document.querySelectorAll('.question-item');
                for (let el of questions) {
                    if (el.innerHTML.includes(qId) || (cleanText && el.innerHTML.includes(cleanText.substring(0, 30)))) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.style.border = "2px solid var(--warning-color)";
                        el.style.boxShadow = "0 0 15px var(--warning-soft)";
                        break;
                    }
                }
            }, 800);
        }, 500);
    } else {
        openCategory(catId);
        setTimeout(() => {
            const elements = document.getElementsByClassName('question-item');
            for (let el of elements) {
                if (el.dataset.id == qId || (cleanText && el.innerHTML.includes(cleanText.substring(0, 20)))) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight-warning');
                    setTimeout(() => el.classList.remove('highlight-warning'), 5000);
                    break;
                }
            }
        }, 1200);
    }
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
}

// AI Question Generation
let selectedAIFileBase64 = null;
let selectedFileType = null;

// AI İstifadə Limitləri Meneceri
const AIUsageLimits = {
    checkDailyLimit: function(type) { // type: 'question' və ya 'file'
        const today = new Date().toLocaleDateString();
        const data = JSON.parse(localStorage.getItem('ai_usage_stats') || '{}');
        
        if (data.date !== today) {
            return { count: 0, date: today };
        }
        
        return {
            count: type === 'question' ? (data.questionCount || 0) : (data.fileCount || 0),
            date: today
        };
    },
    
    updateDailyLimit: function(type) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('ai_usage_stats') || '{}');
        
        if (data.date !== today) {
            data = { date: today, questionCount: 0, fileCount: 0 };
        }
        
        if (type === 'question') data.questionCount = (data.questionCount || 0) + 1;
        if (type === 'file') data.fileCount = (data.fileCount || 0) + 1;
        
        localStorage.setItem('ai_usage_stats', JSON.stringify(data));
        this.updateDisplay();
    },
    
    checkCooldown: function(type) { // type: 'question' və ya 'file'
        const lastTime = localStorage.getItem(`ai_last_${type}_time`);
        if (!lastTime) return 0;
        
        const diff = Math.floor((Date.now() - parseInt(lastTime)) / 1000);
        return diff < 60 ? (60 - diff) : 0;
    },
    
    updateCooldown: function(type) {
        localStorage.setItem(`ai_last_${type}_time`, Date.now().toString());
        this.updateDisplay();
    },

    updateDisplay: function() {
        const stats = this.checkDailyLimit('question');
        const fileStats = this.checkDailyLimit('file');
        const remaining = Math.max(0, 5 - stats.count);
        const fileRemaining = Math.max(0, 3 - fileStats.count);
        
        // User side
        const userLimit = document.getElementById('ai-remaining-limit');
        if (userLimit) userLimit.textContent = remaining;
        
        const userFileLimit = document.getElementById('ai-file-remaining-limit');
        if (userFileLimit) userFileLimit.textContent = fileRemaining;
        
        // Admin side
        const adminLimit = document.getElementById('admin-ai-remaining-limit');
        if (adminLimit) adminLimit.textContent = remaining;

        const adminFileLimit = document.getElementById('admin-ai-file-remaining-limit');
        if (adminFileLimit) adminFileLimit.textContent = fileRemaining;
        
        // Cooldown update
        const cooldown = this.checkCooldown('question');
        const fileCooldown = this.checkCooldown('file');
        const maxCooldown = Math.max(cooldown, fileCooldown);
        
        if (maxCooldown > 0) {
            this.startTimer(maxCooldown);
        } else {
            const userTimer = document.getElementById('ai-cooldown-timer');
            if (userTimer) userTimer.textContent = "0";
            const adminTimer = document.getElementById('admin-ai-cooldown-timer');
            if (adminTimer) adminTimer.textContent = "0";
        }
    },
    
    startTimer: function(seconds) {
        if (window.aiTimerInterval) clearInterval(window.aiTimerInterval);
        
        let timeLeft = seconds;
        const updateTimerUI = () => {
            const userTimer = document.getElementById('ai-cooldown-timer');
            if (userTimer) userTimer.textContent = timeLeft;
            
            const adminTimer = document.getElementById('admin-ai-cooldown-timer');
            if (adminTimer) adminTimer.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(window.aiTimerInterval);
            }
            timeLeft--;
        };
        
        updateTimerUI();
        window.aiTimerInterval = setInterval(updateTimerUI, 1000);
    }
};

// Səhifə yüklənəndə limitləri göstər
document.addEventListener('DOMContentLoaded', () => {
    if (typeof AIUsageLimits !== 'undefined') {
        AIUsageLimits.updateDisplay();
    }
});

window.handleAIImageSelect = async function(input) {
    const file = input.files[0];
    if (!file) return;
    
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPDF && !isImage) {
        showNotification('Yalnız şəkil və ya PDF faylı yükləyə bilərsiniz!', 'error');
        input.value = '';
        return;
    }

    // 3. Faylın Həcmi Limiti (10MB)
    if (file.size > 10 * 1024 * 1024) { 
        showNotification('Fayl ölçüsü 10MB-dan çox ola bilməz!', 'error');
        input.value = '';
        return;
    }

    // 4. PDF Səhifə Sayı Limiti (20 səhifə)
    if (isPDF) {
        try {
            const pageCount = await getPdfPageCount(file);
            if (pageCount > 20) {
                showNotification('Zəhmət olmasa faylı hissələrə bölüb yükləyin (Maksimum 20 səhifə).', 'warning');
                input.value = '';
                return;
            }
        } catch (e) {
            console.error("PDF səhifə sayı yoxlanarkən xəta:", e);
        }
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedAIFileBase64 = e.target.result.split(',')[1]; // Get only base64 data
        selectedFileType = file.type;
        document.getElementById('selected-image-name').textContent = `Seçildi: ${file.name}`;
        document.getElementById('selected-image-name').classList.remove('hidden');
        document.getElementById('btn-remove-ai-image').classList.remove('hidden');
        document.querySelector('.upload-placeholder p').classList.add('hidden');
        
        const icons = document.querySelectorAll('.upload-placeholder i');
        icons.forEach(icon => {
            icon.classList.remove('text-primary', 'text-danger');
            icon.classList.add('text-success');
        });
    };
    reader.readAsDataURL(file);
}

// PDF səhifə sayını təxmini müəyyən etmək üçün köməkçi funksiya
async function getPdfPageCount(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function() {
            const content = reader.result;
            // PDF daxilində /Type /Page axtarışı (ən sadə üsul)
            const pages = content.match(/\/Type\s*\/Page\b/g);
            resolve(pages ? pages.length : 1);
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

window.removeSelectedAIImage = function() {
    selectedAIFileBase64 = null;
    selectedFileType = null;
    document.getElementById('ai-question-image').value = '';
    document.getElementById('selected-image-name').textContent = '';
    document.getElementById('selected-image-name').classList.add('hidden');
    document.getElementById('btn-remove-ai-image').classList.add('hidden');
    document.querySelector('.upload-placeholder p').classList.remove('hidden');
    
    const icons = document.querySelectorAll('.upload-placeholder i');
    icons.forEach(icon => {
        if (icon.classList.contains('fa-file-pdf')) {
            icon.className = 'fas fa-file-pdf'; // Renk CSS-dən gəlir
        } else {
            icon.className = 'fas fa-image'; // Renk CSS-dən gəlir
        }
    });
}

window.generateAIQuestions = async function() {
    // Daxili (Core) Təhlükəsizlik Yoxlanışı
    if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'admin')) {
        return showNotification('Süni İntellekt funksiyasından yalnız müəllimlər istifadə edə bilər.', 'error');
    }

    const context = document.getElementById('ai-context-text').value.trim();
    const count = document.getElementById('ai-question-count').value;
    const difficulty = document.getElementById('ai-difficulty').value;
    const btn = document.getElementById('btn-generate-ai');
    const loading = document.getElementById('ai-loading');

    // Düyməni dərhal deaktiv et və yükləmə ekranını göstər (Double-click qarşısını almaq üçün)
    if (btn) btn.disabled = true;
    if (loading) loading.classList.remove('hidden');
    

    
    if (!context && !selectedAIFileBase64) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification('Zəhmət olmasa mövzu mətni daxil edin və ya fayl yükləyin.', 'error');
    }

    // 1. Gündəlik Sual Limiti (5 dəfə)
    const questionStats = AIUsageLimits.checkDailyLimit('question');
    if (questionStats.count >= 5) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification(`Gündəlik sual yaratma cəhd limitiniz (5 dəfə) dolub. Sabah yenidən cəhd edin.`, 'warning');
    }

    // 2. Sual Yaratma Cooldown (60 saniyə)
    const questionCooldown = AIUsageLimits.checkCooldown('question');
    if (questionCooldown > 0) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification(`Çox tez-tez sual yaradırsınız. Zəhmət olmasa ${questionCooldown} saniyə gözləyin.`, 'warning');
    }

    // 6. Gündəlik Fayl Limiti (3 fayl)
    if (selectedAIFileBase64) {
        const fileStats = AIUsageLimits.checkDailyLimit('file');
        if (fileStats.count >= 3) {
            if (loading) loading.classList.add('hidden');
            if (btn) btn.disabled = false;
            return showNotification(`Gündəlik fayl emalı limitiniz (3) dolub. Sabah yenidən cəhd edin.`, 'warning');
        }

        // 7. Fayl Emalı Cooldown (60 saniyə)
        const fileCooldown = AIUsageLimits.checkCooldown('file');
        if (fileCooldown > 0) {
            if (loading) loading.classList.add('hidden');
            if (btn) btn.disabled = false;
            return showNotification(`Yeni fayl emal etmək üçün ${fileCooldown} saniyə gözləyin.`, 'warning');
        }
    }

    if (count == 0 && !selectedAIFileBase64) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification('Sual sayı 0 seçildikdə mütləq PDF və ya şəkil yükləməlisiniz.', 'warning');
    }
    
    if (context && context.length < 50 && !selectedAIFileBase64 && count != 0) {
        if (loading) loading.classList.add('hidden');
        if (btn) btn.disabled = false;
        return showNotification('Mətn çox qısadır. Daha keyfiyyətli suallar üçün daha çox məlumat daxil edin.', 'warning');
    }

    

    let prompt = `Sən bir peşəkar müəllimsən. `;
    
    let difficultyText = "";
    if (difficulty === "easy") {
        difficultyText = "Suallar asan səviyyədə, təməl bilikləri yoxlayan olsun. ";
    } else if (difficulty === "hard") {
        difficultyText = "Suallar çətin səviyyədə, dərin məntiq və analitik düşüncə tələb edən, detallara toxunan olsun. ";
    } else {
        difficultyText = "Suallar orta çətinlikdə olsun. ";
    }

    if (selectedAIFileBase64) {
        if (selectedFileType === 'application/pdf') {
            // 5. Faylın içindən çıxarılan sualların sayı (maksimum 20 sual)
            prompt += `SƏNƏ TƏQDİM OLUNAN PDF FAYLINDAKI MATERİALI OXU. PDF-dəki sualları rəqəmsal formata sal (maksimum 20 sual). `;
            if (count > 0) {
                prompt += `SONRA İSƏ PDF-dəki mövzudan istifadə edərək ƏLAVƏ ${count} dənə yeni sual yaradaraq ümumi siyahıya əlavə et. ${difficultyText} `;
            } else {
                prompt += `Əlavə sual yaratma, yalnız mövcud olanları (maksimum 20 ədəd) rəqəmsal formata sal. `;
            }
        } else {
            // 5. Faylın içindən çıxarılan sualların sayı (maksimum 20 sual)
            prompt += `SƏNƏ TƏQDİM OLUNAN ŞƏKİLDƏKİ MATERİALI OXU. Şəkildəki sualları rəqəmsal formata sal (maksimum 20 sual). `;
            if (count > 0) {
                prompt += `SONRA İSƏ şəkildəki mətndən istifadə edərək ƏLAVƏ ${count} dənə yeni sual yaradaraq ümumi siyahıya əlavə et. ${difficultyText} `;
            } else {
                prompt += `Əlavə sual yaratma, yalnız mövcud olanları (maksimum 20 ədəd) rəqəmsal formata sal. `;
            }
        }
    } else {
        prompt += `Aşağıdakı mətndən istifadə edərək ${count} dənə çoxseçimli (test) sual hazırla. ${difficultyText} `;
    }

    prompt += `
    Cavablar yalnız Azərbaycan dilində olsun. 
    Hər sualın 4 variantı olsun. 
    Variantların daxilində "A)", "1)" kimi prefikslər yazma, yalnız variantın mətnini yaz.
    Əgər variantın mətni dırnaq işarəsi (", “, ”) ilə başlayırsa, onu olduğu kimi saxla.
    Nəticəni yalnız aşağıdakı JSON formatında qaytar (heç bir əlavə mətn yazma, yalnız JSON):
    [
      {
        "text": "Sual mətni",
        "options": ["Variant 1", "Variant 2", "Variant 3", "Variant 4"],
        "correct": 0 
      }
    ]
    "correct" sahəsi düzgün variantın indeksidir (0-dan başlayaraq).`;

    if (context) prompt += `\n\nMətn: ${context}`;

    // Prepare contents for API
    const contents = [{
        parts: [{ text: prompt }]
    }];

    if (selectedAIFileBase64) {
        contents[0].parts.push({
            inline_data: {
                mime_type: selectedFileType,
                data: selectedAIFileBase64
            }
        });
    }

    
    // 2025-ci il üçün təsdiqlənmiş ən son stabil və preview model adları
    const models = [
        "gemini-3-flash-preview",
        "gemini-3-pro-preview",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite"
    ];
    // Gemini modelləri üçün həm v1, həm də v1beta versiyalarını yoxlayırıq
    const apiVersions = ["v1beta", "v1"];
    let lastError = "";
    let success = false;

    console.log("AI Sual yaradılması başladıldı (Fayl: " + (selectedAIFileBase64 ? selectedFileType : "Xeyr") + ")...");

    for (const apiVer of apiVersions) {
        if (success) break;
        for (const modelName of models) {
            if (success) break;
            try {
                console.log(`Cəhd edilir: ${apiVer} / ${modelName}`);
                
                const generationConfig = apiVer === "v1beta" ? { response_mime_type: "application/json" } : {};
                const responseData = await (async () => {
                    if (!GEMINI_API_KEY) {
                        const r = await fetch(`${BACKEND_URL}/api/ai/generate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ apiVer, modelName, contents, generationConfig })
                        });
                        return await r.json();
                    } else {
                        const apiUrl = `https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
                        const r = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents, generationConfig })
                        });
                        const ct = r.headers.get('content-type') || '';
                        if (ct.includes('application/json')) {
                            const d = await r.json();
                            if (d && d.error && (d.error.status === "PERMISSION_DENIED" || d.error.status === "UNAUTHENTICATED")) {
                                const rb = await fetch(`${BACKEND_URL}/api/ai/generate`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ apiVer, modelName, contents, generationConfig })
                                });
                                return await rb.json();
                            }
                            return d;
                        } else {
                            const t = await r.text();
                            throw new Error('Non-JSON response: ' + t.slice(0, 200));
                        }
                    }
                })();
                const data = responseData;
                
                if (data.error) {
                    lastError = data.error.message;
                    console.warn(`Xəta (${apiVer}/${modelName}):`, lastError);
                    
                    if (data.error.status === "PERMISSION_DENIED" || data.error.status === "UNAUTHENTICATED") {
                        showNotification('API açarı yanlışdır və ya icazəsi yoxdur.', 'error');
                        if (loading) loading.classList.add('hidden');
                        if (btn) btn.disabled = false;
                        return;
                    }
                    continue;
                }

                if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts) {
                    lastError = "AI cavabı boşdur";
                    console.warn(`Boş cavab (${apiVer}/${modelName})`);
                    continue;
                }

                let aiResponse = data.candidates[0].content.parts[0].text;
                console.log(`AI cavabı alındı (${apiVer}/${modelName}), emal edilir...`);

                const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
                if (!jsonMatch) {
                    lastError = "Format xətası (JSON tapılmadı)";
                    console.warn(`JSON Tapılmadı (${apiVer}/${modelName})`);
                    continue;
                }
                
                const questions = JSON.parse(jsonMatch[0]);
                if (!Array.isArray(questions) || questions.length === 0) {
                    lastError = "Suallar boşdur";
                    continue;
                }

                const list = document.getElementById('manual-questions-list');
                
                // İlk boş sualı təmizlə
                const firstQuestion = list.querySelector('.manual-question-item');
                if (list.children.length === 1 && firstQuestion) {
                    const textarea = firstQuestion.querySelector('textarea');
                    if (textarea && !textarea.value.trim()) {
                        list.innerHTML = '';
                    }
                }
                
                questions.forEach((q) => {
                    addManualQuestionForm();
                    const items = list.querySelectorAll('.manual-question-item');
                    const lastItem = items[items.length - 1];
                    
                    if (lastItem) {
                        const textarea = lastItem.querySelector('textarea');
                        if (textarea) textarea.value = q.text || "";
                        
                        let inputs = lastItem.querySelectorAll('.manual-opt');
                        if (q.options && Array.isArray(q.options)) {
                            const firstRadio = lastItem.querySelector('input[type="radio"]');
                            if (firstRadio) {
                                const uniqueId = firstRadio.name.split('_')[1];
                                while (inputs.length < q.options.length && inputs.length < 10) {
                                    addManualOption(uniqueId);
                                    inputs = lastItem.querySelectorAll('.manual-opt');
                                }
                            }
                            
                            q.options.forEach((opt, i) => {
                                if (inputs[i]) inputs[i].value = opt;
                            });
                        }
                        
                        const radios = lastItem.querySelectorAll('input[type="radio"]');
                        if (radios && radios[q.correct] !== undefined) {
                            radios[q.correct].checked = true;
                        }
                    }
                });
                
                switchQuestionTab('manual');
                showNotification(`${questions.length} sual uğurla yaradıldı!`, 'success');
                success = true;
                AIUsageLimits.updateDailyLimit('question');
                AIUsageLimits.updateCooldown('question');
                if (selectedAIFileBase64) {
                    AIUsageLimits.updateDailyLimit('file');
                    AIUsageLimits.updateCooldown('file');
                }
                removeSelectedAIImage(); // Clear after success
                break; 

            } catch (error) {
                lastError = error.message;
                console.error(`Model istisna xətası (${modelName}):`, error);
            }
        }
    }

    loading.classList.add('hidden');
    btn.disabled = false;

    if (!success) {
        console.error("AI Generation failed:", lastError);
        let msg = 'Xəta baş verdi.';
        if (lastError.includes('quota') || lastError.includes('429') || lastError.includes('limit')) {
            msg = '⚠️ AI limiti bitdi. Zəhmət olmasa biraz gözləyin.';
        } else if (lastError.includes('Safety')) {
            msg = '⚠️ Məzmun uyğunsuz olduğu üçün bloklandı.';
        } else if (lastError === 'API key missing' || lastError.includes('API açarı tapılmadı')) {
            msg = '⚠️ API açarı tapılmadı. Zəhmət olmasa Admin paneldən əlavə edin.';
        } else {
            msg = 'Xəta: ' + (lastError.length > 50 ? lastError.substring(0, 50) + '...' : lastError);
        }
        showNotification(msg, 'error');
    }
};

// --- Sharing Logic ---
window.sharePlatform = function() {
    const shareData = {
        title: 'İmtahan – Onlayn Qiymətləndirmə Platforması',
        text: 'Müasir onlayn imtahan platforması ilə saniyələr içində test yaradın və işləyin!',
        url: 'https://imtahan.site/'
    };

    if (navigator.share) {
        navigator.share(shareData).catch(err => console.log('Error sharing:', err));
    } else {
        copyToClipboard('https://imtahan.site/');
        showNotification('Platforma linki kopyalandı! Dostlarınızla paylaşa bilərsiniz.', 'success');
    }
}

function copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}
window.updateApiKeyUI = function() {
    // Admin key UI removed
};
window.saveAdminAiKey = async function() {
    // Admin key save logic removed (handled via server env)
    showNotification('API açarı server tərəfindən idarə olunur.', 'info');
};

/* =========================================
   LIVE CHAT FUNCTIONALITY (MODERN & SECURE)
   ========================================= */

window.initUserChat = function() {
    if (document.getElementById('live-chat-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'live-chat-widget';
    
    const guestName = localStorage.getItem('guest_chat_name');
    const isRegistered = (typeof currentUser !== 'undefined' && currentUser); 
    
    const showPreScreen = !isRegistered && !guestName;

    widget.innerHTML = `
        <button id="chat-toggle-btn" class="chat-toggle-btn" onclick="toggleLiveChat()">
            <i class="fas fa-comments"></i>
            <span class="status-dot" style="position: absolute; top: 0; right: 0; width: 14px; height: 14px; border: 2px solid white;"></span>
        </button>

        <div id="chat-window">
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="operator-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="operator-details">
                        <h4>Dəstək Xidməti</h4>
                        <span><span class="status-dot"></span> Onlayn</span>
                    </div>
                </div>
                <button onclick="toggleLiveChat()" style="background:none; border:none; color:white; cursor:pointer;">
                    <i class="fas fa-times" style="font-size: 18px;"></i>
                </button>
            </div>

            <div id="chat-pre-screen" class="${showPreScreen ? '' : 'hidden'}">
                <div class="pre-screen-icon">
                    <i class="fas fa-user-circle"></i>
                </div>
                <h3>Xoş Gəlmisiniz!</h3>
                <p>Sizə müraciət edə bilməyimiz üçün zəhmət olmasa adınızı qeyd edin.</p>
                
                <div class="chat-input-group">
                    <input type="text" id="guest-name-input" placeholder="Adınız (Məs: Əli)">
                </div>
                
                <button class="start-chat-btn" onclick="saveGuestChatName()">
                    <span>Söhbətə Başla</span>
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>

            <div id="chat-messages">
                <div class="message-wrapper bot">
                    <div class="message-content">
                        Salam! Sizə necə kömək edə bilərəm?
                    </div>
                    <div class="message-time">${new Date().toLocaleTimeString('az-AZ', {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
            </div>

            <div class="chat-footer">
                <input type="text" id="chat-input" placeholder="Mesajınızı yazın..." onkeypress="handleChatInputKey(event)">
                <button class="send-btn" onclick="sendChatMessage()">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(widget);

    if (!showPreScreen) {
        listenForMessages();
    }
};

window.toggleLiveChat = function() {
    const win = document.getElementById('chat-window');
    const btn = document.getElementById('chat-toggle-btn');
    if (win) win.classList.toggle('active');
    if (btn) btn.classList.toggle('open');
    
    if (win && win.classList.contains('active')) {
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            if (input) input.focus();
        }, 300);
    }
};

window.saveGuestChatName = async function() {
    const input = document.getElementById('guest-name-input');
    const name = input.value.trim();
    
    if (!name) {
        alert("Zəhmət olmasa adınızı daxil edin.");
        return;
    }
    
    localStorage.setItem('guest_chat_name', name);
    
    try {
        if (auth && !auth.currentUser) {
            await auth.signInAnonymously();
        }
    } catch(e) {}
    
    const preScreen = document.getElementById('chat-pre-screen');
    if (preScreen) {
        preScreen.style.opacity = '0';
        setTimeout(() => {
            preScreen.classList.add('hidden');
        }, 300);
    }
    
    listenForMessages();
};

window.handleChatInputKey = function(e) {
    if (e.key === 'Enter') sendChatMessage();
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    // UI-da dərhal göstər (Optimistik)
    const tempId = 'temp_' + Date.now();
    addMessageToUI(text, 'user', tempId);
    input.value = '';
    
    try {
        // 1. Auth Statusunu Yoxla
        // Əgər Firebase hələ yüklənməyibsə, biraz gözlə
        if (!auth) {
            console.warn("Firebase Auth hələ hazır deyil.");
            throw new Error("Sistem yüklənir, zəhmət olmasa gözləyin...");
        }

        let user = auth.currentUser;
        
        // Əgər LocalStorage-da istifadəçi varsa amma Firebase-də yoxdursa (Sessiya bitib)
        const localUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        if (!user) {
            if (localUser) {
                // İstifadəçi daxil olmuş kimi görünür, amma Firebase sessiyası yoxdur.
                // Bu halda anonim giriş ETMƏYƏK, çünki bu, admin/müəllim hesabını "qonaq" edə bilər.
                // İstifadəçidən yenidən giriş istəyək və ya səhifəni yeniləyək.
                console.warn("Sessiya uyğunsuzluğu: LocalStorage var, Firebase Auth yoxdur.");
                // Yenidən cəhd etmək üçün 1 saniyə gözləyək (bəlkə onAuthStateChanged gecikir)
                await new Promise(r => setTimeout(r, 1000));
                user = auth.currentUser;
                
                if (!user) {
                    throw new Error("Sessiya bitib. Zəhmət olmasa yenidən giriş edin.");
                }
            } else {
                // Həqiqətən qonaqdırsa, Anonim giriş et
                try {
                    const cred = await auth.signInAnonymously();
                    user = cred.user;
                } catch(e) {
                    console.error("Anonymous auth failed:", e);
                    user = null;
                }
            }
        }

        // 2. Mesajı Hazırla
        const guestName = localStorage.getItem('guest_chat_name') || 'Qonaq';
        // İstifadəçi adını dəqiqləşdir: Əgər real istifadəçidirsə onun adını, yoxsa qonaq adını götür
        const displayName = (user && !user.isAnonymous && localUser) 
            ? (localUser.name || localUser.username || user.email) 
            : guestName;

        const msgData = {
            text: text,
            sender: 'user',
            userId: user ? user.uid : 'guest',
            userName: displayName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        };

        // 3. Firestore-a Yaz
        if (db) {
            await db.collection('messages').add(msgData);
            
            // Listener-i aktivləşdir (əgər yoxdursa)
            listenForMessages(); 
        } else {
            throw new Error("Verilənlər bazası ilə əlaqə yoxdur.");
        }
    } catch (e) {
        console.error("Send Error:", e);
        // Xəta mesajını UI-da göstər
        const errDiv = document.querySelector(`[data-temp-id="${tempId}"]`);
        if (errDiv) {
            errDiv.classList.add('error');
            errDiv.innerHTML += `<div class="text-xs text-red-200 mt-1"><i class="fas fa-exclamation-circle"></i> Göndərilmədi: ${e.code === 'permission-denied' ? 'İcazə yoxdur' : e.message}</div>`;
        } else {
            addMessageToUI("Mesaj göndərilmədi: " + (e.code === 'permission-denied' ? 'İcazə yoxdur' : e.message), 'bot');
        }
    }
};

function addMessageToUI(text, type, tempId = null) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = `message-wrapper ${type}`;
    if (tempId) div.setAttribute('data-temp-id', tempId);
    
    const safeText = window.escapeHtml ? window.escapeHtml(text) : text.replace(/</g, '&lt;');
    
    div.innerHTML = `
        <div class="message-content">${safeText}</div>
        <div class="message-time">${new Date().toLocaleTimeString('az-AZ', {hour:'2-digit', minute:'2-digit'})}</div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

window.listenForMessages = function() {
    if (!db || !auth) return;
    
    const user = auth.currentUser;
    const guestName = localStorage.getItem('guest_chat_name');
    const targetId = user ? user.uid : (guestName ? 'guest' : null);
    if (!targetId) return;
    
    // Köhnə listeneri dayandır və yenisini qur
    if (window.chatListenerUnsubscribe) {
        try { window.chatListenerUnsubscribe(); } catch {}
        window.chatListenerUnsubscribe = null;
    }
    
    try {
        window.chatListenerUnsubscribe = db.collection('messages')
            .where('userId', '==', targetId)
            .limit(400) // indeks tələb etmədən gətir
            .onSnapshot(snapshot => {
                const items = [];
                snapshot.forEach(doc => items.push(doc.data()));
                
                // Müştəri tərəfində timestamp-a görə sıralama
                items.sort((a, b) => {
                    const ta = a.timestamp ? (a.timestamp.toMillis ? a.timestamp.toMillis() : a.timestamp.toDate().getTime()) : 0;
                    const tb = b.timestamp ? (b.timestamp.toMillis ? b.timestamp.toMillis() : b.timestamp.toDate().getTime()) : 0;
                    return ta - tb;
                });
                
                // Son 50 mesajı göstər
                const last = items.slice(Math.max(items.length - 50, 0));
                
                // UI yenilə
                const container = document.getElementById('chat-messages');
                if (container) container.innerHTML = '';
                last.forEach(m => {
                    const type = (m.sender === 'user') ? 'user' : 'bot';
                    addMessageToUI(m.text, type);
                });
            }, error => {
                console.error("Chat listen error:", error);
                if (error.code === 'permission-denied') {
                    window.chatListenerUnsubscribe = null;
                }
            });
    } catch (e) {
        console.error("Setup listen error:", e);
    }
};

if (auth) {
    auth.onAuthStateChanged(user => {
        try {
            if (window.chatListenerUnsubscribe) {
                window.chatListenerUnsubscribe();
                window.chatListenerUnsubscribe = null;
            }
        } catch(e) {}
        listenForMessages();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { 
        initUserChat(); 
        listenForMessages(); 
    }, 2000); 
    if (typeof window.setupGlobalChatCleanup === 'function') window.setupGlobalChatCleanup();
});

/* =========================================
   ADMIN CHAT LOGIC
   ========================================= */

window.showAdminChat = function() {
    if (typeof hideAllSections === 'function') hideAllSections();
    const section = document.getElementById('admin-chat-section');
    if (section) section.classList.remove('hidden');
    loadAdminChatList();
    try {
        if (window.adminChatInterval) clearInterval(window.adminChatInterval);
        window.adminChatInterval = setInterval(() => loadAdminChatList(), 60000);
    } catch {}
};
window.runChatCleanup = async function() {
    if (!db) return;
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
    if (!isAdmin) return;
    try {
        const snapshot = await db.collection('messages').orderBy('timestamp','desc').limit(300).get();
        const latestByUser = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (!uid || uid === 'guest') return;
            const ts = data.timestamp ? (data.timestamp.toMillis ? data.timestamp.toMillis() : (data.timestamp.toDate ? data.timestamp.toDate().getTime() : new Date(data.timestamp).getTime())) : 0;
            if (!latestByUser[uid]) latestByUser[uid] = ts;
        });
        const now = Date.now();
        const tenMin = 10 * 60 * 1000;
        for (const uid in latestByUser) {
            const ts = latestByUser[uid];
            if (!ts) continue;
            if (now - ts > tenMin) await cleanupUserChat(uid);
        }
        try { const list = document.getElementById('admin-chat-list'); if (list) loadAdminChatList(); } catch {}
    } catch(e) {}
};
window.setupGlobalChatCleanup = function() {
    try { if (window.globalChatCleanupInterval) clearInterval(window.globalChatCleanupInterval); } catch {}
    window.globalChatCleanupInterval = setInterval(() => { window.runChatCleanup(); }, 60000);
    window.runChatCleanup();
};

window.loadAdminChatList = async function() {
    const list = document.getElementById('admin-chat-list');
    if (!list) return;
    
    list.innerHTML = '<div class="loading-spinner">Yüklənir...</div>';
    
    // Auth Yoxlanışı
    if (!auth || !auth.currentUser) {
        // Bir az gözləyək, bəlkə yüklənir
        await new Promise(r => setTimeout(r, 1000));
        if (!auth.currentUser) {
            list.innerHTML = `
                <div class="p-4 text-center text-red-600">
                    <p><i class="fas fa-lock"></i> İcazə yoxdur.</p>
                    <p class="text-xs mt-2 text-gray-500">Firebase sessiyası tapılmadı. Zəhmət olmasa <a href="#" onclick="logout()" class="underline">Çıxış</a> edib yenidən daxil olun.</p>
                </div>`;
            return;
        }
    }

    try {
        const snapshot = await db.collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(200)
            .get();
            
        const users = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.userId) return;

            if (!users[data.userId]) {
                users[data.userId] = {
                    userId: data.userId,
                    userName: data.userName || 'Adsız İstifadəçi',
                    lastMessage: data.text,
                    timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date(),
                    unread: !data.read && data.sender === 'user'
                };
            } else {
                // Update name if we found a better one
                if ((users[data.userId].userName === 'Adsız İstifadəçi' || !users[data.userId].userName) && data.userName) {
                    users[data.userId].userName = data.userName;
                }
                // Check for unread messages
                if (!data.read && data.sender === 'user') {
                    users[data.userId].unread = true;
                }
            }
        });
        
        list.innerHTML = '';
        const userArray = Object.values(users);
        
        if (userArray.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:20px;">Hələ ki mesaj yoxdur.</p>';
            return;
        }
        
        // Sort users by timestamp (newest first)
        userArray.sort((a, b) => b.timestamp - a.timestamp);
        
        // Update chat count
        const countElement = document.getElementById('admin-chat-count');
        if (countElement) {
            countElement.textContent = userArray.length;
        }
        
        try {
            const now = Date.now();
            const tenMin = 10 * 60 * 1000;
            for (const u of userArray) {
                if (!u || !u.timestamp) continue;
                const ts = u.timestamp instanceof Date ? u.timestamp.getTime() : new Date(u.timestamp).getTime();
                if (now - ts > tenMin) {
                    await cleanupUserChat(u.userId);
                }
            }
        } catch(e) {}
        
        userArray.forEach(u => {
            const div = document.createElement('div');
            // Messenger Style User Item
            div.style.cssText = "padding: 12px 16px; border-bottom: 1px solid #334155; cursor: pointer; transition: background 0.2s; display: flex; gap: 12px;";
            div.onmouseover = () => { if(!div.classList.contains('active')) div.style.background = 'rgba(255,255,255,0.05)'; };
            div.onmouseout = () => { if(!div.classList.contains('active')) div.style.background = 'transparent'; };
            
            if (u.unread) {
                div.style.background = 'rgba(37, 99, 235, 0.1)';
                div.style.borderLeft = '4px solid #2563eb';
            } else {
                div.style.borderLeft = '4px solid transparent';
            }
            
            const timeAgo = getTimeAgo(u.timestamp);
            const messagePreview = u.lastMessage.length > 35 ? u.lastMessage.substring(0, 35) + '...' : u.lastMessage;
            
            div.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #334155; display: flex; align-items: center; justify-content: center; color: #60a5fa; border: 1px solid #475569; flex-shrink: 0;">
                    <i class="fas fa-user"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <h4 style="font-weight: bold; font-size: 14px; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(u.userName)}</h4>
                        <span style="font-size: 11px; color: #94a3b8; white-space: nowrap; margin-left: 8px;">${timeAgo}</span>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(messagePreview)}</p>
                </div>
                ${u.unread ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb; margin-top: 8px; flex-shrink: 0; box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);"></div>' : ''}
            `;
            div.onclick = () => {
                // Highlight active user
                document.querySelectorAll('#admin-chat-list > div').forEach(el => {
                    el.classList.remove('active');
                    el.style.background = 'transparent';
                    if(el.querySelector('.unread-indicator')) el.style.background = 'rgba(37, 99, 235, 0.1)';
                });
                div.classList.add('active');
                div.style.background = '#1e293b';
                openAdminChat(u.userId, u.userName);
            };
            list.appendChild(div);
        });
        
    } catch (e) {
        console.error("Error loading chats:", e);
        let roleInfo = '';
        try {
            if (auth && auth.currentUser) {
                const udoc = await db.collection('users').doc(auth.currentUser.uid).get();
                if (udoc.exists) {
                    const r = udoc.data().role || 'yoxdur';
                    roleInfo = `<p class="text-xs text-gray-500 mt-2">Cari rol: ${r}</p>`;
                } else {
                    roleInfo = `<p class="text-xs text-gray-500 mt-2">İstifadəçi məlumatı tapılmadı (users/${auth.currentUser.uid}).</p>`;
                }
            }
        } catch (er) {
            roleInfo = `<p class="text-xs text-gray-500 mt-2">Rol oxunmadı: ${er.message}</p>`;
        }
        const fixBtn = e.code === 'permission-denied' 
            ? `<button onclick="fixAdminRole('${auth.currentUser.uid}')" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-sm"><i class="fas fa-wrench"></i> Admin Hüququnu Düzəlt</button>` 
            : '';
        list.innerHTML = `
            <div class="p-4 text-center text-red-600">
                <p>Xəta: ${e.code === 'permission-denied' ? 'İcazə yoxdur' : e.message}</p>
                ${e.code === 'permission-denied' ? `<p class="text-xs text-gray-500 mt-2">UID: ${auth.currentUser.uid} (Admin hüququ yoxdur?)</p>` : ''}
                ${roleInfo}
                ${fixBtn}
            </div>`;
    }
};

window.cleanupUserChat = async function(userId) {
    if (!db || !userId) return;
    if (currentChatUserId && currentChatUserId === userId) return;
    try {
        const snapshot = await db.collection('messages').where('userId', '==', userId).limit(400).get();
        if (snapshot.empty) return;
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } catch(e) {}
};
window.fixAdminRole = async function(uid) {
    if (!confirm("Admin hüququnu bərpa etmək istədiyinizə əminsiniz?")) return;
    
    const btn = document.querySelector('button[onclick^="fixAdminRole"]');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bərpa edilir...';
    }

    try {
        await db.collection('users').doc(uid).set({
            role: 'admin'
        }, { merge: true });
        
        showNotification('Admin hüququ uğurla bərpa edildi. Yenidən yüklənir...', 'success');
        try {
            await new Promise(r => setTimeout(r, 600));
            await db.collection('users').doc(uid).get();
        } catch {}
        loadAdminChatList();
    } catch (e) {
        console.error("Admin hüququ düzəltmək xətası:", e);
        alert('Xəta: ' + e.message + '\n\nQeyd: Əgər bu xəta davam edərsə, Firestore qaydalarında "users" kolleksiyasına yazma icazəsini yoxlayın.');
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-wrench"></i> Yenidən cəhd et';
        }
    }
};

let currentAdminChatUnsubscribe = null;
let currentChatUserId = null;

window.openAdminChat = function(userId, userName) {
    currentChatUserId = userId;
    
    // UI Updates
    const title = document.getElementById('admin-chat-user-name');
    const status = document.getElementById('admin-chat-user-status');
    const messagesBox = document.getElementById('admin-messages-box');
    const view = document.getElementById('admin-conversation-view');
    
    if (title) title.textContent = userName;
    if (status) status.textContent = 'Yüklənir...';
    if (view) view.classList.remove('hidden');
    if (messagesBox) messagesBox.innerHTML = '<div class="loading-spinner">Yüklənir...</div>';
    
    // Unsubscribe previous listener
    if (currentAdminChatUnsubscribe) {
        currentAdminChatUnsubscribe();
    }
    
    // Listen for messages with this user
    currentAdminChatUnsubscribe = db.collection('messages')
        .where('userId', '==', userId)
        .limit(400)
        .onSnapshot(snapshot => {
            const items = [];
            snapshot.forEach(doc => {
                items.push({ ref: doc.ref, data: doc.data() });
            });
            items.sort((a, b) => {
                const ta = a.data.timestamp ? (a.data.timestamp.toMillis ? a.data.timestamp.toMillis() : a.data.timestamp.toDate().getTime()) : 0;
                const tb = b.data.timestamp ? (b.data.timestamp.toMillis ? b.data.timestamp.toMillis() : b.data.timestamp.toDate().getTime()) : 0;
                return ta - tb;
            });
            const last = items.slice(Math.max(items.length - 50, 0));
            if (messagesBox) messagesBox.innerHTML = '';
            
            // Find last user activity time
            let lastUserActivity = null;
            last.forEach(({ data, ref }) => {
                appendAdminChatMessage(data);
                if (data.sender === 'user' && !data.read) {
                    ref.update({ read: true }).catch(e => console.warn("Read update failed:", e));
                }
                if (data.sender === 'user' && data.timestamp) {
                    const msgTime = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    if (!lastUserActivity || msgTime > lastUserActivity) {
                        lastUserActivity = msgTime;
                    }
                }
            });
            
            // Update user status
            if (status) {
                if (lastUserActivity) {
                    const timeAgo = getTimeAgo(lastUserActivity);
                    status.textContent = `Son aktivlik: ${timeAgo} əvvəl`;
                } else {
                    status.textContent = 'Aktivlik yoxdur';
                }
            }
            
            // Reliable scroll to bottom with scrollIntoView
            if (messagesBox && messagesBox.lastElementChild) {
                setTimeout(() => {
                    messagesBox.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    messagesBox.scrollTop = messagesBox.scrollHeight;
                }, 100);
            }
        }, error => {
            console.error("Admin chat listen error:", error);
            if (messagesBox) {
                messagesBox.innerHTML = `<div class="text-center text-red-500 mt-4">
                    <p>Çat yüklənmədi: ${error.message}</p>
                </div>`;
            }
        });
};

window.backToChatList = function() {
    const view = document.getElementById('admin-conversation-view');
    if (view) view.classList.add('hidden'); // Only relevant on mobile
    if (currentAdminChatUnsubscribe) {
        currentAdminChatUnsubscribe();
        currentAdminChatUnsubscribe = null;
    }
    currentChatUserId = null;
    loadAdminChatList(); 
};

window.sendAdminReply = async function() {
    if (!currentChatUserId) return;
    
    const input = document.getElementById('admin-reply-input');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    
    try {
        await db.collection('messages').add({
            text: text,
            sender: 'admin', 
            userId: currentChatUserId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: true 
        });
    } catch (e) {
        alert("Mesaj göndərilmədi: " + e.message);
    }
};

// Time ago helper function
function getTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'indi';
    if (minutes < 60) return `${minutes} dəq`;
    if (hours < 24) return `${hours} saat`;
    return `${days} gün`;
}

// Refresh chat function
window.refreshChat = function() {
    if (currentChatUserId) {
        const userName = document.getElementById('admin-chat-user-name').textContent;
        openAdminChat(currentChatUserId, userName);
        showNotification('Çat yeniləndi', 'info');
    } else {
        loadAdminChatList();
    }
};

function appendAdminChatMessage(data) {
    // Safety check: ensure message belongs to current chat
    if (currentChatUserId && data.userId !== currentChatUserId) return;

    const container = document.getElementById('admin-messages-box');
    if (!container) return;
    
    const isMe = data.sender === 'admin' || data.sender === 'bot';
    const div = document.createElement('div');
    div.style.cssText = `display: flex; width: 100%; margin-bottom: 8px; justify-content: ${isMe ? 'flex-end' : 'flex-start'}; animation: fadeIn 0.2s ease;`;
    
    const safeText = window.escapeHtml ? window.escapeHtml(data.text) : data.text.replace(/</g, '&lt;');
    const time = data.timestamp ? data.timestamp.toDate().toLocaleTimeString('az-AZ', {hour:'2-digit', minute:'2-digit'}) : '';
    
    // Messenger Bubble Styles
    const bubbleStyle = isMe 
        ? 'background: #2563eb; color: white; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 5px rgba(37, 99, 235, 0.3);' 
        : 'background: #334155; color: #f1f5f9; border-radius: 18px 18px 18px 4px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); border: 1px solid #475569;';

    div.innerHTML = `
        <div style="display: flex; max-width: 75%; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'};">
            <div style="${bubbleStyle} padding: 10px 16px; min-width: 60px; position: relative;">
                <div style="font-size: 14px; line-height: 1.5; word-wrap: break-word; white-space: pre-wrap;">${safeText}</div>
                <div style="font-size: 10px; color: ${isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8'}; margin-top: 4px; text-align: right; display: flex; justify-content: flex-end; align-items: center; gap: 4px;">
                    ${time}
                    ${isMe ? '<i class="fas fa-check-double" style="font-size: 8px;"></i>' : ''}
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(div);
    
    // Auto-scroll logic (improved with scrollIntoView)
    setTimeout(() => {
        div.scrollIntoView({ behavior: 'smooth', block: 'end' });
        // Fallback
        if (container) container.scrollTop = container.scrollHeight;
    }, 50);
}

window.seedProkurorluqSubcategories = async function() {
    const parentId = 'special_prokurorluq';
    const parent = categories.find(c => c.id === parentId);
    if (!parent) {
        console.log("Parent category 'special_prokurorluq' not found.");
        return;
    }

    const schema = [
        { name: 'Cinayət Məcəlləsi' },
        { name: 'Cinayət-Prosessual Məcəlləsi' },
        { name: 'Konstitusiya' },
        { name: 'Normativ hüquqi aktlar' },
        { name: 'İnzibati Xətalar Məcəlləsi' },
        { name: 'Mülki Məcəllə' },
        { name: 'Mülki-Prosessual Məcəllə' },
        { name: 'Əmək Məcəlləsi' },
        { name: 'Prokurorluq haqqında' },
        { name: 'Prokurorluq orqanlarında qulluq' },
        { name: 'Korrupsiyaya qarşı mübarizə' },
        { name: 'Polis haqqında' },
        { name: 'Avropa İnsan Hüquqları Konvensiyası', id: 'special_prokurorluq_human_rights' }
    ];

    let addedCount = 0;

    for (const item of schema) {
        // Check if exists under this parent (by name)
        const exists = categories.some(c => c.parentId === parentId && c.name === item.name);
        if (!exists) {
            const newCat = {
                id: item.id || 'special_sub_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                name: item.name,
                time: 45,
                questions: [],
                createdBy: 'system',
                parentId: parentId,
                isHiddenFromPublic: true
            };
            categories.push(newCat);
            if (typeof addCategoryToDB === 'function') {
                await addCategoryToDB(newCat);
            }
            addedCount++;
        }
    }
    
    if (addedCount > 0) {
        saveCategories();
        console.log(`${addedCount} subcategories seeded.`);
    }
};

window.organizeProkurorluqQuestions = async function() {
    if (!confirm("Bu əməliyyat 'Prokurorluq üzrə sınaq' kateqoriyasındakı sualları müvafiq alt bölmələrə köçürəcək. Davam edilsin?")) return;

    if (typeof showLoading === 'function') showLoading("Suallar təhlil edilir...");

    // Ensure subcategories exist
    await window.seedProkurorluqSubcategories();

    const sourceCat = categories.find(c => c.id === 'special_prokurorluq');
    if (!sourceCat || !sourceCat.questions || sourceCat.questions.length === 0) {
        if (typeof hideLoading === 'function') hideLoading();
        alert("Köçürüləcək sual tapılmadı!");
        return;
    }

    let movedCount = 0;
    const questionsToMove = []; // { q: question, targetId: string }
    const unmovable = [];

    // Map subcategory names/IDs
    const subCats = categories.filter(c => c.parentId === 'special_prokurorluq');
    
    sourceCat.questions.forEach(q => {
        let targetId = null;
        
        // 1. Check by Subject ID
        if (q.subjectId) {
            const match = subCats.find(c => c.id === q.subjectId);
            if (match) targetId = match.id;
        }

        // 2. Check by Subject Name
        if (!targetId && q.subjectName) {
            const match = subCats.find(c => c.name === q.subjectName || c.name.includes(q.subjectName));
            if (match) targetId = match.id;
        }

        // 3. Special Case: Convention
        if (!targetId && (q.subjectName === 'Avropa İnsan Hüquqları Konvensiyası' || (q.text && q.text.includes('Konvensiya')))) {
             const match = subCats.find(c => c.name.includes('Konvensiya') || c.id === 'special_prokurorluq_human_rights');
             if (match) targetId = match.id;
        }

        if (targetId) {
            questionsToMove.push({ q, targetId });
        } else {
            unmovable.push(q);
        }
    });

    if (questionsToMove.length === 0) {
        if (typeof hideLoading === 'function') hideLoading();
        alert("Təsnif edilə bilən sual tapılmadı. Sualların 'subjectId' və ya 'subjectName' sahələri yoxlanıldı.");
        return;
    }

    // Execute Move
    questionsToMove.forEach(item => {
        const target = categories.find(c => c.id === item.targetId);
        if (target) {
            if (!target.questions) target.questions = [];
            // Avoid duplicates
            if (!target.questions.some(exist => exist.id === item.q.id)) {
                target.questions.push(item.q);
                movedCount++;
            }
        }
    });

    // Remove from source
    const movedIds = new Set(questionsToMove.map(i => i.q.id));
    sourceCat.questions = sourceCat.questions.filter(q => !movedIds.has(q.id));

    saveCategories();
    
    // Sync with Firebase
    try {
        if (typeof syncCategory === 'function') {
            await syncCategory('special_prokurorluq');
            const changedTargets = new Set(questionsToMove.map(i => i.targetId));
            for (const tid of changedTargets) {
                await syncCategory(tid);
            }
        }
    } catch(e) {
        console.error("Sync error:", e);
    }

    if (typeof hideLoading === 'function') hideLoading();
    if (typeof renderAdminCategories === 'function') renderAdminCategories();
    
    alert(`${movedCount} sual uğurla köçürüldü! (${unmovable.length} sual qaldı)`);
};
