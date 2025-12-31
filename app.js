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
// Təhlükəsizlik üçün: API açarını birbaşa koda yazmırıq, DB-dən çəkirik.
let GEMINI_API_KEY = "";

// Firebase-dən API açarını yükləyən funksiya
async function loadAiApiKey() {
    try {
        if (db) {
            const doc = await db.collection('settings').doc('ai_config').get();
            if (doc.exists) {
                const data = doc.data();
                if (data && data.apiKey) {
                    GEMINI_API_KEY = data.apiKey;
                    console.log("AI API açarı Firestore-dan yükləndi.");
                } else {
                    console.warn("Firestore-da açar tapılmadı, localStorage yoxlanılır.");
                    GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || "";
                }
            } else {
                console.warn("Firestore-da ai_config sənədi yoxdur, localStorage yoxlanılır.");
                GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || "";
            }
        } else {
            GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || "";
        }
    } catch (e) {
        console.error("API açarı yüklənərkən xəta:", e);
        GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || "";
    }
}

// API açarını proqramatik təyin etmək və DB-yə yazmaq üçün funksiya (Yalnız Adminlər üçün)
window.setAiKey = async function(key) {
    if (!key) return;
    
    try {
        // Admin yoxlaması
        const isAdmin = currentUser && currentUser.role === 'admin';
        
        if (db && isAdmin) {
            await db.collection('settings').doc('ai_config').set({ 
                apiKey: key,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.email
            });
            GEMINI_API_KEY = key;
            localStorage.setItem('GEMINI_API_KEY', key);
            alert("MÜKƏMMƏL! API açarı Firebase bazasına yazıldı. Artıq bütün müəllimlər və bütün cihazlar (mobil daxil olmaqla) bu açardan istifadə edə biləcək.");
        } else {
            // Admin deyilsə və ya DB yoxdursa
            localStorage.setItem('GEMINI_API_KEY', key);
            GEMINI_API_KEY = key;
            
            if (!isAdmin) {
                alert("DİQQƏT: Siz Admin olaraq giriş etmədiyiniz üçün açar BAZAYA YAZILMADI, yalnız bu brauzerdə yadda qaldı. Digər cihazlarda işləməsi üçün zəhmət olmasa Admin hesabı ilə giriş edib əmri yenidən yazın.");
            } else {
                alert("AI API açarı yalnız lokalda yadda saxlanıldı (Verilənlər bazası bağlantısı yoxdur).");
            }
        }
    } catch (e) {
        console.error("Xəta:", e);
        localStorage.setItem('GEMINI_API_KEY', key);
        GEMINI_API_KEY = key;
        alert("Xəta baş verdi, lakin açar lokal yaddaşa yazıldı. Xəta: " + e.message);
    }
};

// Initialize Firebase if config is valid
let db;
let auth;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        console.log("Firebase initialized");
    } else {
        console.log("Firebase config not set. Using LocalStorage fallback.");
    }
} catch (e) {
    console.error("Firebase initialization error:", e);
}

// Initialize EmailJS
emailjs.init("gwXl5HH3P9Bja5iBN");

// Global State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let redirectAfterAuth = null;

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
    sideMenu.classList.toggle('active');
    overlay.classList.toggle('active');
}

window.menuNavigate = function(actionFunc) {
    toggleSideMenu(); // Close menu
    if (typeof actionFunc === 'function') {
        actionFunc();
    }
}

// Info Modal Logic
window.toggleSideMenu = function() {
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    sideMenu.classList.toggle('active');
    overlay.classList.toggle('active');
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
                <ul style="list-style: none; padding: 0; margin-top: 20px;">
                    <li style="margin-bottom: 15px; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-at" style="color: var(--primary-color); font-size: 1.5rem;"></i>
                        <span><strong>Email:</strong> info@imtahan.site</span>
                    </li>
                    <li style="margin-bottom: 15px; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-map-marker-alt" style="color: #EF4444; font-size: 1.5rem;"></i>
                        <span><strong>Ünvan:</strong> Bakı şəhəri, Azərbaycan</span>
                    </li>
                </ul>
            `;
            break;
        case 'security':
            content = `
                <h2><i class="fas fa-shield-alt"></i> Təhlükəsizlik və Məxfilik</h2>
                <p><strong>İmtahan</strong> platformasında məlumatların təhlükəsizliyi bizim prioritetimizdir. Bütün özəl testlər və suallar xüsusi şifrələmə sistemləri vasitəsilə qorunur.</p>
                
                <div class="security-box" style="background: #e0f2fe; border-color: #7dd3fc; color: #0369a1;">
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
            // Load Categories (Public)
            const catSnapshot = await db.collection('categories').get();
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

    // Dublikatları təmizləmək (Tamamilə bağlandı və təmizləndi)
    if (false) {
        // Köhnə təmizləmə kodu tamamilə deaktiv edildi
    }

    // Seed Data if Empty (Bərpa edildi)
    let hasChanged = false;
    
    // "Dövlət qulluğu" bərpası - SUPER SMART BƏRPA
    let dq = categories.find(c => c.name.trim() === 'Dövlət qulluğu');
    
    // BÜTÜN yetim kateqoriyaları analiz edirik (parentId-si olan amma özü olmayan)
    const existingIds = new Set(categories.map(c => String(c.id)));
    const orphans = categories.filter(c => c.parentId && !existingIds.has(String(c.parentId)));
    
    if (dq) {
        // Əgər Dövlət qulluğu varsa amma alt bölmələr görünmürsə, ID-sini dəyişirik
        if (orphans.length > 0) {
            const realId = String(orphans[0].parentId);
            if (dq.id !== realId) {
                console.log("Dövlət qulluğu ID-si alt bölmələrə uyğunlaşdırılır:", dq.id, "->", realId);
                // Köhnə ID-li sənədi silib yenisini yaradırıq
                if (db) db.collection('categories').doc(String(dq.id)).delete();
                dq.id = realId;
                if (db) db.collection('categories').doc(realId).set(dq);
                hasChanged = true;
            }
        }
    } else {
        // Əgər ümumiyyətlə yoxdursa
        if (orphans.length > 0) {
            const realId = String(orphans[0].parentId);
            dq = { id: realId, name: 'Dövlət qulluğu', time: 45, questions: [], parentId: null };
            categories.push(dq);
            if (db) db.collection('categories').doc(realId).set(dq);
            hasChanged = true;
            console.log("Yetim bölmələr əsasında 'Dövlət qulluğu' yaradıldı. ID:", realId);
        } else {
            dq = { id: '1', name: 'Dövlət qulluğu', time: 45, questions: [], parentId: null };
            categories.push(dq);
            if (db) db.collection('categories').doc('1').set(dq);
            hasChanged = true;
        }
    }

    // "Dərslik" bərpası - MƏCBURİ BƏRPA
    let derslik = categories.find(c => c.name.trim() === 'Dərslik');
    if (!derslik) {
        derslik = { id: 'derslik_default', name: 'Dərslik', time: 45, questions: [], parentId: null };
        categories.push(derslik);
        if (db) db.collection('categories').doc('derslik_default').set(derslik);
        hasChanged = true;
    }

    if (hasChanged) {
        saveCategories();
    }

    // İlk dəfə istifadəçi yoxdursa admin yarat (yalnız offline üçün)
    if (users.length === 0 && !db) {
        const adminId = 'admin_' + Date.now();
        users = [{ id: adminId, username: 'admin', password: '123', role: 'admin' }];
        saveUsers(); 
    } else if (db) {
        // Firebase qoşuludursa, avtomatik istifadəçi yaratmırıq.
        // Mövcud istifadəçilər bazadan loadData() funksiyasında artıq yüklənib.
    } else {
        // Offline rejimdə admin yoxdursa yarat
        const adminUser = users.find(u => u.username === 'admin');
        if (!adminUser) {
             users.push({ id: 'admin_' + Date.now(), username: 'admin', password: '123', role: 'admin' });
             saveUsers();
        }
    }

    // Check for English category leftovers and remove them
    const initialCount = categories.length;
    categories = categories.filter(c => c.name !== 'İngilis' && String(c.id) !== 'english_demo');
    
    /* Dərslik avtomatik yaranma bağlandı
    // Ensure "Dərslik" category and its subcategories exist
    let derslik = categories.find(c => c.name === 'Dərslik');
    if (!derslik) {
        derslik = { id: 'derslik_' + Date.now(), name: 'Dərslik', time: 45, questions: [], parentId: null };
        categories.push(derslik);
    }
    
    let biologiya = categories.find(c => c.name === 'Biologiya' && c.parentId === derslik.id);
    if (!biologiya) {
        biologiya = { id: 'bio_' + Date.now(), name: 'Biologiya', time: 45, questions: [], parentId: derslik.id };
        categories.push(biologiya);
    }
    
    let kimya = categories.find(c => c.name === 'Kimya' && c.parentId === derslik.id);
    if (!kimya) {
        kimya = { id: 'kimya_' + Date.now(), name: 'Kimya', time: 45, questions: [], parentId: derslik.id };
        categories.push(kimya);
    }

    if (categories.length !== initialCount || !derslik || !biologiya || !kimya) {
        saveCategories();
    }
    */

    renderCategories();
    if (!document.getElementById('admin-dashboard-section').classList.contains('hidden')) {
        renderAdminCategories();
    }
    
    // Qlobal təhlükəsizlik sistemini aktivləşdir
    setupGlobalSecurity();
}

// Save Helpers
async function saveCategories() {
    if (db) {
        // For simplicity in this structure, we might overwrite specific docs or sync all
        // To keep it simple for now, we will update the specific changed category in the calling function usually
        // But here is a bulk sync for initial setup or fallback
        // Better: Update individual docs in the logic functions.
        // Let's implement a 'sync all' for now to match old logic style
        for (const cat of categories) {
             await db.collection('categories').doc(String(cat.id)).set(cat);
        }
    }
    localStorage.setItem('categories', JSON.stringify(categories));
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
}


// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    await loadAiApiKey(); // AI açarını DB-dən çək
    handleUrlParams();
    updateUI();
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
    navbar.classList.remove('hidden');
    
    // Check if we are in a private quiz link
    const isPrivateQuiz = new URLSearchParams(window.location.search).has('quiz');
    
    if (currentUser) {
        document.body.classList.remove('role-student', 'role-teacher', 'role-admin', 'role-moderator');
        document.body.classList.add('role-' + currentUser.role);
        document.getElementById('guest-nav').classList.add('hidden');
        document.getElementById('user-nav').classList.remove('hidden');
        
        const displayName = (currentUser.name && currentUser.surname) 
            ? `${currentUser.name} ${currentUser.surname}` 
            : (currentUser.username || 'İstifadəçi');
            
        document.getElementById('user-display').textContent = `Salam, ${displayName}`;
        
        // Side menu updates
        document.getElementById('side-guest-nav').classList.add('hidden');
        document.getElementById('side-user-nav').classList.remove('hidden');
        document.getElementById('side-user-info').classList.remove('hidden');
        document.getElementById('side-user-display').textContent = `Salam, ${displayName}`;
        
        const teacherBtn = document.getElementById('teacher-panel-btn');
        const sideTeacherBtn = document.getElementById('side-teacher-btn');
        if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
            teacherBtn.classList.remove('hidden');
            if (sideTeacherBtn) sideTeacherBtn.classList.remove('hidden');
        } else {
            teacherBtn.classList.add('hidden');
            if (sideTeacherBtn) sideTeacherBtn.classList.add('hidden');
        }
        
        const adminBtn = document.getElementById('admin-panel-btn');
        const sideAdminBtn = document.getElementById('side-admin-btn');
        if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
            adminBtn.classList.remove('hidden');
            if (sideAdminBtn) sideAdminBtn.classList.remove('hidden');
            
            // Change text if moderator
            if (currentUser.role === 'moderator') {
                const modHtml = '<i class="fas fa-tasks"></i> Moderator Paneli';
                adminBtn.innerHTML = modHtml;
                if (sideAdminBtn) sideAdminBtn.innerHTML = modHtml;
            } else {
                const adminHtml = '<i class="fas fa-user-shield"></i> Admin Paneli';
                adminBtn.innerHTML = adminHtml;
                if (sideAdminBtn) sideAdminBtn.innerHTML = adminHtml;
            }
        } else {
            adminBtn.classList.add('hidden');
            if (sideAdminBtn) sideAdminBtn.classList.add('hidden');
        }
        
        // If not already in admin view or quiz, show public dashboard
        if (!isPrivateQuiz &&
            document.getElementById('admin-dashboard-section').classList.contains('hidden') && 
            document.getElementById('category-admin-section').classList.contains('hidden') &&
            document.getElementById('quiz-section').classList.contains('hidden')) {
            showDashboard();
        }
    } else {
        document.getElementById('guest-nav').classList.remove('hidden');
        document.getElementById('user-nav').classList.add('hidden');
        
        // Side menu updates
        document.getElementById('side-guest-nav').classList.remove('hidden');
        document.getElementById('side-user-nav').classList.add('hidden');
        document.getElementById('side-user-info').classList.add('hidden');

        const teacherBtn = document.getElementById('teacher-panel-btn');
        if (teacherBtn) teacherBtn.classList.add('hidden');
        
        if (!isPrivateQuiz) {
            showDashboard();
        }
    }
}

// --- Auth Functions ---
window.showLogin = function() {
    hideAllSections();
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('login-box').classList.remove('hidden');
    document.getElementById('register-box').classList.add('hidden');
}

window.showRegister = function() {
    hideAllSections();
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('login-box').classList.add('hidden');
    document.getElementById('register-box').classList.remove('hidden');
}

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
            // 1. Firestore-dan istifadəçi adını və ya emaili axtarırıq
            let userQuery;
            if (username.includes('@')) {
                userQuery = await db.collection('users').where('email', '==', username).get();
            } else {
                userQuery = await db.collection('users').where('username', '==', username).get();
            }
            
            if (userQuery.empty) {
                // Əgər tapılmadısa, bəlkə köhnə tələbədir (email-siz qeydiyyat)
                // Onlar üçün email formatı: username@imtahan.site
                if (!username.includes('@')) {
                    const fallbackEmail = `${username}@imtahan.site`;
                    userQuery = await db.collection('users').where('email', '==', fallbackEmail).get();
                }
            }

            if (userQuery.empty) {
                throw new Error('İstifadəçi adı və ya şifrə yanlışdır!');
            }

            const userData = userQuery.docs[0].data();
            const userEmail = userData.email || `${username}@imtahan.site`; // Fallback email

            // 2. Firebase Auth ilə giriş edirik
            let userCredential;
            try {
                userCredential = await auth.signInWithEmailAndPassword(userEmail, pass);

                // Sənəd ID-si Auth UID ilə eyni deyilse, miqrasiya edək (Köhnə hesablar üçün)
                if (userQuery.docs[0].id !== userCredential.user.uid) {
                    const { password, ...safeData } = userData;
                    const oldDocId = userQuery.docs[0].id;
                    const newUid = userCredential.user.uid;
                    
                    try {
                        await db.collection('users').doc(oldDocId).delete();
                        await db.collection('users').doc(newUid).set({
                            ...safeData,
                            id: newUid
                        });
                        console.log("User document migrated to Auth UID");
                        
                        // Digər kolleksiyalardakı ID-ləri də yeniləyək
                        await migrateUserReferences(oldDocId, newUid);
                    } catch (migErr) {
                        console.error("Migration error:", migErr);
                    }
                }
            } catch (authError) {
                // Əgər istifadəçi Auth-da tapılmadısa, amma Firestore-da varsa (Köhnə hesablar üçün miqrasiya)
                if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-login-credentials') {
                    if (userData.password && userData.password === pass) {
                        // Köhnə şifrə düzdür! İndi onu Auth-da yaradaq
                        try {
                            const newAuthUser = await auth.createUserWithEmailAndPassword(userEmail, pass);
                            
                            // Firestore-dan açıq şifrəni silək və sənəd ID-sini Auth UID-si ilə dəyişək (Təhlükəsizlik və qaydalar üçün)
                            const { password, ...safeData } = userData;
                            const oldDocId = userQuery.docs[0].id;
                            const newUid = newAuthUser.user.uid;

                            if (oldDocId !== newUid) {
                                await db.collection('users').doc(oldDocId).delete();
                            }
                            
                            await db.collection('users').doc(newUid).set({
                                ...safeData,
                                id: newUid
                            });
                            
                            // Digər kolleksiyalardakı ID-ləri də yeniləyək
                            await migrateUserReferences(oldDocId, newUid);
                            
                            userCredential = newAuthUser;
                        } catch (createError) {
                            if (createError.code === 'auth/weak-password') {
                                throw new Error('Firebase təhlükəsizlik qaydalarına görə şifrə ən azı 6 simvol olmalıdır. Zəhmət olmasa bazada şifrənizi yeniləyin (məs: 123456) və yenidən cəhd edin.');
                            }
                            throw createError;
                        }
                    } else {
                        throw authError; // Şifrə səhvdirsə, normal xətanı göstər
                    }
                } else {
                    throw authError;
                }
            }
            const user = { id: userCredential.user.uid, ...userData };
            delete user.password; // Obyektdən şifrəni silirik

            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            updateUI();
            showNotification('Xoş gəldiniz, ' + user.username + '!', 'success');
            
            if (redirectAfterAuth === 'teacher_panel' && user.role === 'teacher') {
                redirectAfterAuth = null;
                showTeacherDashboard();
            }
        } else {
            // Fallback to local storage (not recommended but for offline compatibility)
            const localUsers = JSON.parse(localStorage.getItem('users')) || [];
            const user = localUsers.find(u => u.username === username && u.password === pass);
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

async function sendVerificationEmail(email, code) {
    try {
        await emailjs.send(
            "service_rjwl984",
            "template_y8eq8n8",
            {
                user_email: email,
                code: code
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
        }

        if (role === 'teacher') {
            // Teacher verification flow
            pendingUser = { name, surname, username, password: pass, role: role, email: email };
            verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            const success = await sendVerificationEmail(email, verificationCode);
            
            if (success) {
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

                showNotification('Qeydiyyat uğurludur!', 'success');
                
                // Auto login
                currentUser = newUser;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUI();
                showDashboard();
            } else {
                // Offline fallback
                const newUser = { id: String(Date.now()), name, surname, username, password: pass, role: role };
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
                const newUser = { id: String(Date.now()), ...pendingUser };
                const localUsers = JSON.parse(localStorage.getItem('users')) || [];
                localUsers.push(newUser);
                localStorage.setItem('users', JSON.stringify(localUsers));
                currentUser = newUser;
            }

            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showNotification('Email təsdiqləndi! Qeydiyyat uğurla tamamlandı.', 'success');
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
                showRegister();
                setTimeout(() => {
                    const roleSelect = document.getElementById('reg-role');
                    if (roleSelect) {
                        roleSelect.value = 'teacher';
                        toggleEmailField();
                    }
                }, 100);
            }, 1500);
        }
    } else {
        showNotification('Sınaq hazırlamaq üçün müəllim hesabı lazımdır. Müəllim kimi qeydiyyatdan keçməyiniz üçün səhifəyə yönləndirilirsiniz.', 'info');
        
        setTimeout(() => {
            redirectAfterAuth = 'teacher_panel';
            showRegister();
            setTimeout(() => {
                const roleSelect = document.getElementById('reg-role');
                if (roleSelect) {
                    roleSelect.value = 'teacher';
                    toggleEmailField();
                }
            }, 100);
        }, 1500);
    }
}

function hideAllSections() {
    const sections = [
        'auth-section', 'dashboard-section', 'admin-dashboard-section', 
        'category-admin-section', 'quiz-section', 'result-section', 
        'profile-section', 'teacher-dashboard-section', 
        'create-private-quiz-section', 'private-access-section',
        'admin-question-section', 'review-section', 'public-questions-section',
        'top-users-section', 'reports-section'
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
window.showTeacherDashboard = function() {
    if (!currentUser) return showLogin();
    hideAllSections();
    document.getElementById('teacher-dashboard-section').classList.remove('hidden');
    renderPrivateQuizzes();
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
    document.getElementById('private-quiz-password').value = quiz.password;
    
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
    
    quiz.questions.forEach((q, idx) => {
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
                <div class="manual-q-image-container">
                    <div class="image-preview ${q.image ? '' : 'hidden'}" id="preview_${uniqueId}">
                        <img src="${q.image || ''}" alt="Sual şəkli">
                        <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <label class="image-upload-label ${q.image ? 'hidden' : ''}" id="label_${uniqueId}">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Şəkil Əlavə Et</span>
                        <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" style="display:none;">
                    </label>
                    <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}" value="${q.image || ''}">
                </div>
                <div class="manual-q-text-container">
                    <textarea class="manual-q-text" placeholder="Sualın mətnini bura daxil edin...">${q.text || ''}</textarea>
                </div>
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
    });
    
    switchQuestionTab('manual');
    updateQuestionCount();
}

window.switchQuestionTab = function(method) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.method-content').forEach(c => c.classList.add('hidden'));
    
    document.getElementById(`tab-${method}`).classList.add('active');
    document.getElementById(`method-${method}`).classList.remove('hidden');
}

window.addManualQuestionForm = function() {
    const list = document.getElementById('manual-questions-list');
    const uniqueId = Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    const timeType = document.getElementById('private-quiz-time-type').value;
    const timeInputDisplay = timeType === 'total' ? 'display:none;' : '';

    const div = document.createElement('div');
    div.className = 'manual-question-item';
    div.innerHTML = `
        <div class="manual-q-header">
            <div class="manual-q-title">
                <i class="fas fa-plus-circle"></i>
                <span>Yeni Sual</span>
            </div>
            <div class="manual-q-actions">
                <div class="time-input-group" style="${timeInputDisplay}">
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
            <div class="manual-q-image-container">
                <div class="image-preview hidden" id="preview_${uniqueId}">
                    <img src="" alt="Sual şəkli">
                    <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn"><i class="fas fa-times"></i></button>
                </div>
                <label class="image-upload-label" id="label_${uniqueId}">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Şəkil Əlavə Et</span>
                    <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" style="display:none;">
                </label>
                <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}">
            </div>
            <div class="manual-q-text-container">
                <textarea class="manual-q-text" placeholder="Sualın mətnini bura daxil edin..."></textarea>
            </div>
        </div>
        <div class="manual-options-grid" id="options_grid_${uniqueId}">
            <div style="grid-column: 1 / -1; background: #fffbeb; border: 2px dashed #f59e0b; padding: 12px; border-radius: 8px; margin-bottom: 10px; color: #92400e; font-weight: bold; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 1.2rem;"></i>
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
    updateQuestionCount();
}

window.handleQuestionImage = function(input, index) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Maksimum ölçü 1024px (həm en, həm hündürlük)
            const MAX_SIZE = 1024;
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
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);

            // Şəkli JPG formatına çeviririk və 0.7 keyfiyyətlə sıxırıq
            // Bu həm PNG xətasını aradan qaldırır, həm də yaddaşa qənaət edir
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            // Firestore limitini yoxlayırıq (təxminən 800KB limit qoyuruq ki, digər datalarla 1MB-ı keçməsin)
            if (compressedBase64.length > 800 * 1024) {
                showNotification('Şəkil sıxıldıqdan sonra hələ də çox böyükdür. Zəhmət olmasa daha kiçik şəkil seçin.', 'error');
                input.value = '';
                return;
            }

            document.getElementById(`data_${index}`).value = compressedBase64;
            const preview = document.getElementById(`preview_${index}`);
            preview.querySelector('img').src = compressedBase64;
            preview.classList.remove('hidden');
            document.getElementById(`label_${index}`).classList.add('hidden');
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

window.removeQuestionImage = function(index) {
    document.getElementById(`data_${index}`).value = '';
    document.getElementById(`preview_${index}`).classList.add('hidden');
    document.getElementById(`label_${index}`).classList.remove('hidden');
}

window.updateQuestionCount = function() {
    const manualCount = document.querySelectorAll('.manual-question-item').length;
    document.getElementById('ready-question-count').textContent = manualCount;
}

window.parseBulkQuestions = function() {
    const text = document.getElementById('bulk-questions-text').value;
    if (!text.trim()) return showNotification('Zəhmət olmasa mətni daxil edin.', 'error');
    
    // Simple parser for:
    // 1. Question?
    // A) Opt 1
    // B) Opt 2
    // C) Opt 3
    // D) Opt 4
    
    const questions = [];
    const blocks = text.split(/\n\s*\n/); // Split by empty lines
    
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 3) return;
        
        const questionText = lines[0].replace(/^\d+[\s.)]*/, ''); // Remove leading numbers
        const options = [];
        let correctIndex = 0;
        
        lines.slice(1).forEach(line => {
            if (line.match(/^[A-J][\s.)]/i)) {
                options.push(line.replace(/^[A-J][\s.)]*/i, ''));
            } else if (line.toLowerCase().includes('doğru:') || line.toLowerCase().includes('cavab:')) {
                const parts = line.split(':');
                if (parts.length > 1) {
                    const ansChar = parts[1].trim().toUpperCase();
                    correctIndex = ansChar.charCodeAt(0) - 65; 
                }
            }
        });
        
        if (questionText && options.length > 0) {
            questions.push({
                text: questionText,
                options: options,
                correctIndex: correctIndex >= 0 && correctIndex < options.length ? correctIndex : 0
            });
        }
    });
    
    if (questions.length > 0) {
        // Convert bulk to manual forms for review
        const list = document.getElementById('manual-questions-list');
        const currentCount = document.querySelectorAll('.manual-question-item').length;
        
        const timeType = document.getElementById('private-quiz-time-type').value;
    const isTotalTime = timeType === 'total';
    
    // Hide individual question time inputs if total time is selected
    const timeInputDisplay = isTotalTime ? 'display:none;' : '';

    questions.forEach((q, idx) => {
        const uniqueId = Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000);
        const div = document.createElement('div');
        div.className = 'manual-question-item';
        div.innerHTML = `
            <div class="manual-q-header">
                <div class="manual-q-title">
                    <i class="fas fa-plus-circle"></i>
                    <span>Sual ${currentCount + idx + 1}</span>
                </div>
                <div class="manual-q-actions">
                    <div class="time-input-group" style="${timeInputDisplay}">
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
                    <div class="manual-q-image-container">
                        <div class="image-preview hidden" id="preview_${uniqueId}">
                            <img src="" alt="Sual şəkli">
                            <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn"><i class="fas fa-times"></i></button>
                        </div>
                        <label class="image-upload-label" id="label_${uniqueId}">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>Şəkil Əlavə Et</span>
                            <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" style="display:none;">
                        </label>
                        <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}">
                    </div>
                    <div class="manual-q-text-container">
                        <textarea class="manual-q-text" placeholder="Sualın mətnini bura daxil edin...">${q.text}</textarea>
                    </div>
                </div>
                <div class="manual-options-grid">
                    ${q.options.map((opt, i) => `
                        <div class="manual-option-input">
                            <div class="option-radio-wrapper">
                                <input type="radio" name="correct_${uniqueId}" value="${i}" ${i === q.correctIndex ? 'checked' : ''} id="opt_${uniqueId}_${i}">
                                <label for="opt_${uniqueId}_${i}"></label>
                            </div>
                            <input type="text" class="manual-opt" value="${opt}" placeholder="Variant ${i + 1}">
                        </div>
                    `).join('')}
                </div>
            `;
            list.appendChild(div);
        });
        
        // Clear textarea after success
        document.getElementById('bulk-questions-text').value = '';
        
        switchQuestionTab('manual');
        updateQuestionCount();
        showNotification(`${questions.length} sual uğurla köçürüldü. İndi yoxlayıb yadda saxlaya bilərsiniz.`, 'success');
    } else {
        showNotification('Heç bir sual tapılmadı. Zəhmət olmasa formatı yoxlayın.', 'error');
    }
}

window.savePrivateQuizFinal = async function() {
    const editingId = document.getElementById('editing-quiz-id').value;
    const title = document.getElementById('private-quiz-title').value;
    const password = document.getElementById('private-quiz-password').value;
    const timeType = document.getElementById('private-quiz-time-type').value;
    const defaultTime = parseInt(document.getElementById('private-quiz-default-time').value) || 45;
    
    if (!title || !password) return showNotification('Zəhmət olmasa testin adını və şifrəsini daxil edin.', 'error');
    
    const questionItems = document.querySelectorAll('.manual-question-item');
    const questions = [];
    
    questionItems.forEach((item) => {
        const text = item.querySelector('.manual-q-text').value;
        const imageData = item.querySelector('.manual-q-img-data').value;
        const customTime = item.querySelector('.manual-q-time').value;
        const optionInputs = item.querySelectorAll('.manual-opt');
        const correctInput = item.querySelector('input[type="radio"]:checked');
        
        if ((text || imageData) && optionInputs.length > 0 && correctInput) {
            questions.push({
                text: text,
                image: imageData || null,
                time: (timeType === 'per-question' && customTime) ? parseInt(customTime) : null,
                options: Array.from(optionInputs).map(i => i.value),
                correctIndex: parseInt(correctInput.value)
            });
        }
    });
    
    if (questions.length === 0) return showNotification('Zəhmət olmasa ən azı bir sual əlavə edin.', 'error');
    
    const quizData = {
        teacherId: currentUser.id,
        title: title,
        password: password,
        timeType: timeType,
        defaultTime: defaultTime,
        questions: questions,
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

window.renderPrivateQuizzes = async function() {
    const grid = document.getElementById('private-quizzes-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Yüklənir...</p></div>';
    
    let myQuizzes = [];
    if (db) {
        try {
            const snapshot = await db.collection('private_quizzes').where('teacherId', '==', currentUser.id).get();
            myQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Cache locally for faster access during session if needed
            privateQuizzes = myQuizzes;
        } catch (error) {
            console.error("Error fetching my quizzes:", error);
            showNotification('Testlərinizi yükləyərkən xəta baş verdi.', 'error');
        }
    } else {
        myQuizzes = privateQuizzes.filter(q => q.teacherId === currentUser.id);
    }
    
    grid.innerHTML = '';
    
    if (myQuizzes.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">Hələ heç bir özəl test yaratmamısınız.</p>';
        return;
    }
    
    myQuizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'category-card';
        if (quiz.isActive === false) card.style.opacity = '0.7';
        
        const baseUrl = window.location.origin + window.location.pathname;
        const quizLink = `${baseUrl}?quiz=${quiz.id}`;
        
        const isActive = quiz.isActive !== false; // Default to true if undefined
        
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
            <h3>${quiz.title}</h3>
            <p>${quiz.questions.length} sual</p>
            <div class="category-actions">
                ${isActive ? `<button onclick="copyQuizLink('${quizLink}')" class="btn-primary" style="width:100%"><i class="fas fa-copy"></i> Linki Kopyala</button>` : '<button class="btn-primary" style="width:100%; opacity: 0.5; cursor: not-allowed;" disabled><i class="fas fa-lock"></i> Link Deaktivdir</button>'}
                <button onclick="showStudentResults('${quiz.id}', '${quiz.title}')" class="btn-secondary" style="width:100%"><i class="fas fa-poll"></i> Nəticələr</button>
                <div style="font-size: 0.8rem; color: #666; margin-top: 5px;">Şifrə: <strong>${quiz.password}</strong></div>
            </div>
        `;
        grid.appendChild(card);
    });
}

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
            const questions = JSON.parse(e.target.result);
            if (!Array.isArray(questions)) throw new Error('Düzgün sual formatı deyil.');
            
            const newQuiz = {
                teacherId: currentUser.id,
                title: title,
                password: password,
                questions: questions,
                createdAt: new Date().toISOString(),
                isActive: true
            };
            
            if (db) {
                const docRef = await db.collection('private_quizzes').add(newQuiz);
                newQuiz.id = docRef.id;
            } else {
                newQuiz.id = 'priv_' + Date.now();
            }
            
            privateQuizzes.push(newQuiz);
            localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
            
            showNotification('Özəl test uğurla yaradıldı!', 'success');
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
    document.getElementById('btn-show-analytics').style.display = 'none';
    document.getElementById('btn-show-results').style.display = 'none';
    
    document.getElementById('results-modal-title').textContent = `${quizTitle} - Nəticələr`;
    modal.classList.remove('hidden');
    const tableBody = document.getElementById('student-results-body');
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Yüklənir...</td></tr>';
    
    if (db) {
        try {
            if (!quizId) throw new Error("Quiz ID tapılmadı.");

            // Get quiz data for analytics
            const quizDoc = await db.collection('private_quizzes').doc(quizId).get();
            const quizData = quizDoc.exists ? quizDoc.data() : null;

            const snapshot = await db.collection('student_attempts')
                .where('quizId', '==', quizId)
                .get();
            
            let attempts = snapshot.docs.map(doc => doc.data());
            attempts.sort((a, b) => b.timestamp - a.timestamp);
            
            renderStudentResultsTable(attempts);

            if (attempts.length > 0 && quizData) {
                currentQuizAnalytics = { quiz: quizData, attempts: attempts };
                document.getElementById('btn-show-analytics').style.display = 'block';
                prepareAnalyticsData();
            }
        } catch (e) {
            console.error("ShowStudentResults Error:", e);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: red;">Xəta: ${e.message}</td></tr>`;
        }
    } else {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Firebase aktiv deyil.</td></tr>';
    }
}

window.toggleAnalyticsView = function() {
    const listView = document.getElementById('results-list-view');
    const analyticsView = document.getElementById('analytics-view');
    const btnAnalytics = document.getElementById('btn-show-analytics');
    const btnResults = document.getElementById('btn-show-results');
    
    if (listView.classList.contains('hidden')) {
        listView.classList.remove('hidden');
        analyticsView.classList.add('hidden');
        btnAnalytics.style.display = 'block';
        btnResults.style.display = 'none';
    } else {
        listView.classList.add('hidden');
        analyticsView.classList.remove('hidden');
        btnAnalytics.style.display = 'none';
        btnResults.style.display = 'block';
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
        
        item.innerHTML = `
            <div class="q-header">
                <span class="q-number">Sual #${idx + 1}</span>
                <div class="q-stats">
                    <span class="stat-correct"><i class="fas fa-check"></i> ${stat.correct}</span>
                    <span class="stat-wrong"><i class="fas fa-times"></i> ${stat.wrong}</span>
                    <span style="color: #64748b;"><i class="fas fa-minus"></i> ${stat.unanswered}</span>
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${correctPercent}%; background: ${correctPercent < 40 ? '#ef4444' : (correctPercent < 70 ? '#f59e0b' : '#10b981')}"></div>
            </div>
            <div class="q-text-preview" title="${stat.text}">${stat.text}</div>
        `;
        analysisList.appendChild(item);
    });
}

function renderStudentResultsTable(attempts) {
    const tableBody = document.getElementById('student-results-body');
    tableBody.innerHTML = '';
    
    if (attempts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Hələ heç bir nəticə yoxdur.</td></tr>';
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
            <td>${attempt.studentName}</td>
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
        return showNotification('Zəhmət olmasa bütün xanaları (Ad, Soyad və Şifrə) doldurun.', 'error');
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

        if (pass !== quiz.password) {
            throw new Error('Yanlış şifrə!');
        }

        activePrivateQuiz = quiz;
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
window.showAdminDashboard = function() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) return showNotification('Bu səhifə yalnız səlahiyyətli şəxslər üçündür!', 'error');
    currentAdminParentId = null; // Reset to top level
    hideAllSections();
    document.getElementById('admin-dashboard-section').classList.remove('hidden');
    renderAdminCategories();
}

window.showProfile = function() {
    if (!currentUser) return showLogin();
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
    loadUserQuestions();
    loadUserInbox();
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

async function loadUserQuestions() {
    const list = document.getElementById('user-questions-list');
    const countBadge = document.getElementById('user-questions-count');
    list.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Yüklənir...</div>';

    try {
        let questions = [];
        if (db) {
            const snapshot = await db.collection('public_questions')
                .where('authorId', '==', currentUser.id)
                .get();
            questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            questions.sort((a, b) => {
                const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                return timeB - timeA;
            });
        } else {
            const localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
            questions = localPQ.filter(q => q.authorId === currentUser.id)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        countBadge.textContent = `${questions.length} sual`;

        if (questions.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#888; padding: 20px;">Sizin tərəfinizdən əlavə edilmiş sual yoxdur.</p>';
            return;
        }

        list.innerHTML = '';
        questions.forEach(q => {
            const cat = categories.find(c => c.id === q.categoryId);
            const div = document.createElement('div');
            div.className = 'list-item';
            div.style.marginBottom = '15px';
            div.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-size: 0.8rem; color: var(--primary-color); margin-bottom: 5px;">
                        <i class="fas fa-folder"></i> ${cat ? cat.name : 'Naməlum kateqoriya'}
                    </div>
                    <div style="font-weight: 500;">${q.text}</div>
                    <div style="font-size: 0.8rem; color: #888; margin-top: 5px;">
                        ${q.options.map((opt, i) => `<span style="${i === q.correctIndex ? 'color: var(--success-color); font-weight: bold;' : ''}">${String.fromCharCode(65 + i)}) ${opt}</span>`).join(' | ')}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="editUserQuestion('${q.id}')" class="btn-outline" style="padding: 5px 10px; margin: 0; font-size: 0.8rem;" title="Düzəliş et">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteUserQuestion('${q.id}')" class="btn-outline" style="padding: 5px 10px; margin: 0; font-size: 0.8rem; color: var(--danger-color); border-color: var(--danger-color);" title="Sil">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p style="text-align:center; color:red;">Sualları yükləmək mümkün olmadı.</p>';
    }
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
            loadUserQuestions();
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
            loadUserQuestions();
            
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
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Hələ heç bir test edilməyib.</td></tr>';
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
            <td>${attempt.categoryName}</td>
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
    grid.innerHTML = '';
    
    // Filter categories by parentId
    const filteredCategories = categories.filter(cat => cat.parentId === currentParentId);
    
    // Update Title and Back Button
    const title = document.getElementById('dashboard-title');
    const backBtn = document.getElementById('dashboard-back-btn');
    
    if (currentParentId) {
        const parent = categories.find(c => c.id === currentParentId);
        title.textContent = parent ? parent.name : 'Kateqoriyalar';
        backBtn.classList.remove('hidden');
    } else {
        title.textContent = 'Mövcud İmtahanlar';
        backBtn.classList.add('hidden');
    }

    filteredCategories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-card';
        
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
        if (cat.name.toLowerCase().includes('biologiya')) icon = 'fa-dna';
        if (cat.name.toLowerCase().includes('kimya')) icon = 'fa-flask';
        if (cat.name.toLowerCase().includes('dərslik')) icon = 'fa-graduation-cap';

        // Check if it has subcategories
        const hasSub = categories.some(c => c.parentId === cat.id);
        const hasQuestions = cat.questions && cat.questions.length > 0;

        div.innerHTML = `
            <i class="fas ${icon}"></i>
            <h3>${cat.name}</h3>
            ${hasSub ? '<p class="sub-indicator"><i class="fas fa-folder-open"></i> Alt bölmələr var</p>' : ''}
            <div class="category-actions">
                ${hasSub ? `<button class="btn-secondary" onclick="enterCategory('${cat.id}')">Bölmələrə Bax</button>` : ''}
                ${hasQuestions ? `<button class="btn-primary" onclick="startQuizCheck('${cat.id}')">Testə Başla</button>` : ''}
                ${!hasSub ? `<button class="btn-outline" onclick="openPublicQuestionsFromDash('${cat.id}')"><i class="fas fa-users"></i> Ümumi Suallar</button>` : ''}
                ${!hasSub && !hasQuestions ? '<p style="color: #888; font-size: 0.8rem;">Tezliklə...</p>' : ''}
            </div>
        `;
        grid.appendChild(div);
    });
}

window.enterCategory = function(id) {
    currentParentId = id;
    renderCategories();
}

window.navigateUp = function() {
    if (activePrivateQuiz) {
        window.location.href = window.location.origin + window.location.pathname;
        return;
    }
    if (!currentParentId) return;
    const current = categories.find(c => c.id === currentParentId);
    currentParentId = current ? current.parentId : null;
    renderCategories();
}

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
    } else {
        title.textContent = currentUser.role === 'moderator' ? 'Moderator Paneli' : 'Admin Paneli - Kateqoriyalar';
        backBtn.classList.add('hidden');
    }

    // Hide admin-only buttons for moderator
    const exportBtn = document.querySelector('.btn-success[onclick="exportData()"]');
    const addCatBtn = document.querySelector('.btn-primary[onclick="showAddCategoryModal()"]');
    if (currentUser.role === 'moderator') {
        if (exportBtn) exportBtn.classList.add('hidden');
        if (addCatBtn) addCatBtn.classList.add('hidden');
    } else {
        if (exportBtn) exportBtn.classList.remove('hidden');
        if (addCatBtn) addCatBtn.classList.remove('hidden');
    }

    filteredCategories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-card';
        
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
            <h3>${cat.name}</h3>
            ${hasSub ? '' : `<p>${cat.questions ? cat.questions.length : 0} sual</p>`}
            ${hasSub ? '<p style="font-size: 0.8rem; color: var(--primary-color);"><i class="fas fa-folder"></i> Alt bölmələr var</p>' : ''}
            <div class="category-actions">
                <button class="btn-secondary" onclick="enterAdminCategory('${cat.id}')">Bölməyə Bax</button>
                <button class="btn-primary" onclick="openCategoryQuestions('${cat.id}')">Suallar (${cat.questions ? cat.questions.length : 0})</button>
                ${!hasSub ? `<button class="btn-outline" onclick="openPublicQuestionsFromDash('${cat.id}')"><i class="fas fa-users"></i> Ümumi Suallar</button>` : ''}
            </div>
        `;
        grid.appendChild(div);
    });
}

window.enterAdminCategory = function(id) {
    currentAdminParentId = id;
    renderAdminCategories();
}

window.navigateAdminUp = function() {
    if (!currentAdminParentId) return;
    const current = categories.find(c => c.id === currentAdminParentId);
    currentAdminParentId = current ? current.parentId : null;
    renderAdminCategories();
}

window.openCategoryQuestions = function(id) {
    openCategory(id); // Existing function
}

window.startQuizCheck = function(catId) {
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
window.openPublicQuestionsFromDash = function(id) {
    activeCategoryId = id;
    showPublicQuestions();
}

window.showPublicQuestions = function() {
    if (!activeCategoryId) return;
    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat) return;

    hideAllSections();
    document.getElementById('public-questions-section').classList.remove('hidden');
    document.getElementById('public-questions-title').textContent = `${cat.name} - Ümumi Suallar`;
    
    // Show add button for everyone, but logic handles login check
    const addBtn = document.getElementById('add-public-q-btn');
    addBtn.classList.remove('hidden');

    loadPublicQuestions();
}

window.hidePublicQuestions = function() {
    if (activeCategoryId) {
        // Əgər istifadəçi admin və ya moderatordursa admin panelinə, deyilsə dashboard-a qaytar
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
            openCategory(activeCategoryId);
        } else {
            showDashboard();
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
        <div class="manual-option-input" style="display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <input type="radio" name="pub-q-correct" value="0" checked id="pub-opt-0" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary-color);">
            <input type="text" class="pub-opt" placeholder="A variantı" style="flex: 1; border: none; background: transparent; padding: 5px; font-size: 0.95rem; outline: none;">
        </div>
        <div class="manual-option-input" style="display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <input type="radio" name="pub-q-correct" value="1" id="pub-opt-1" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary-color);">
            <input type="text" class="pub-opt" placeholder="B variantı" style="flex: 1; border: none; background: transparent; padding: 5px; font-size: 0.95rem; outline: none;">
        </div>
        <div class="manual-option-input" style="display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <input type="radio" name="pub-q-correct" value="2" id="pub-opt-2" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary-color);">
            <input type="text" class="pub-opt" placeholder="C variantı" style="flex: 1; border: none; background: transparent; padding: 5px; font-size: 0.95rem; outline: none;">
        </div>
        <div class="manual-option-input" style="display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <input type="radio" name="pub-q-correct" value="3" id="pub-opt-3" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary-color);">
            <input type="text" class="pub-opt" placeholder="D variantı" style="flex: 1; border: none; background: transparent; padding: 5px; font-size: 0.95rem; outline: none;">
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
    div.className = 'manual-option-input';
    div.style.cssText = 'display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0;';
    div.innerHTML = `
        <input type="radio" name="pub-q-correct" value="${optionCount}" id="pub-opt-${optionCount}" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary-color);">
        <input type="text" class="pub-opt" placeholder="${char} variantı" style="flex: 1; border: none; background: transparent; padding: 5px; font-size: 0.95rem; outline: none;">
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer; padding: 5px;"><i class="fas fa-times"></i></button>
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
        categoryId: activeCategoryId,
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

window.loadPublicQuestions = async function() {
    const list = document.getElementById('public-questions-list');
    list.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Yüklənir...</div>';

    try {
        let questions = [];
        if (db) {
            const snapshot = await db.collection('public_questions')
                .where('categoryId', '==', activeCategoryId)
                .get();
            questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Client-side sort (missing index avoidance)
            questions.sort((a, b) => {
                const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                return timeB - timeA;
            });
        } else {
            const localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
            questions = localPQ.filter(q => q.categoryId === activeCategoryId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        renderPublicQuestions(questions);
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p style="text-align:center; color:red;">Sualları yükləmək mümkün olmadı.</p>';
    }
}

function renderPublicQuestions(questions) {
    const list = document.getElementById('public-questions-list');
    if (questions.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#888; padding: 40px;">Hələ heç kim sual əlavə etməyib. İlk sualı siz əlavə edin!</p>';
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
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span>${q.createdAt ? (db ? new Date(q.createdAt.toDate()).toLocaleDateString() : new Date(q.createdAt).toLocaleDateString()) : ''}</span>
                    ${isAdmin ? `<button onclick="deletePublicQuestion('${q.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size: 0.9rem;" title="Sualı sil"><i class="fas fa-trash"></i></button>` : ''}
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
    list.innerHTML = '<div style="text-align:center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top: 10px;">Hesablanır...</p></div>';

    try {
        let questions = [];
        if (db) {
            const snapshot = await db.collection('public_questions').get();
            questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            questions = JSON.parse(localStorage.getItem('public_questions') || '[]');
        }

        const userStats = {};
        const now = new Date();
        const period = window.currentLeaderboardPeriod || 'all';

        questions.forEach(q => {
            if (!q.authorId) return;

            // Time filter
            if (q.createdAt) {
                const qDate = db ? q.createdAt.toDate() : new Date(q.createdAt);
                const diffTime = Math.abs(now - qDate);
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                if (period === 'daily' && diffDays > 1) return;
                if (period === 'weekly' && diffDays > 7) return;
                if (period === 'monthly' && diffDays > 30) return;
            } else if (period !== 'all') {
                return; // No date, skip if period is specific
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
            list.innerHTML = `<div style="text-align:center; padding: 40px; color: #888;">Bu müddət ərzində (${periodText}) hələ heç bir aktivlik yoxdur.</div>`;
            return;
        }

        list.innerHTML = '';
        sortedUsers.slice(0, 20).forEach((user, idx) => {
            const rank = idx + 1;
            const score = Math.round((user.questions * 5) + user.likes - (user.dislikes * 0.5));
            const div = document.createElement('div');
            div.className = 'leader-item';
            div.innerHTML = `
                <div class="leader-rank ${rank <= 3 ? 'top-' + rank : ''}">${rank}</div>
                <div class="leader-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="leader-info">
                    <div class="leader-name">${user.name}</div>
                    <div class="leader-stats">
                        <div class="leader-stat" title="Paylaşılan sual sayı">
                            <i class="fas fa-question-circle" style="color: var(--primary-color);"></i> ${user.questions} sual
                        </div>
                        <div class="leader-stat" title="Toplam bəyəni">
                            <i class="fas fa-thumbs-up" style="color: #3b82f6;"></i> ${user.likes}
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
        list.innerHTML = '<div style="text-align:center; padding: 40px; color: #ef4444;">Xəta baş verdi. Zəhmət olmasa yenidən yoxlayın.</div>';
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
    list.innerHTML = '<div style="text-align:center; padding: 10px;"><i class="fas fa-spinner fa-spin"></i></div>';

    if (db) {
        // Real-time Firestore listener
        discussionUnsubscribe = db.collection('discussions')
            .where('questionId', '==', currentDiscussionQuestionId)
            .onSnapshot((snapshot) => {
                let comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Client-side sort
                comments.sort((a, b) => {
                    const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                    const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                    return timeA - timeB;
                });
                renderComments(comments);
            }, (error) => {
                console.error("Listener error:", error);
                list.innerHTML = '<p style="font-size:0.8rem; color:red;">Şərhləri yükləmək mümkün olmadı.</p>';
            });
    } else {
        // Fallback for LocalStorage (polling or manual reload)
        loadComments();
        // Set a small interval as fallback for local testing without Firebase
        discussionUnsubscribe = setInterval(loadComments, 3000);
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
    originalCloseModal(modalId);
}

async function loadComments() {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<div style="text-align:center; padding: 10px;"><i class="fas fa-spinner fa-spin"></i></div>';

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
        list.innerHTML = '<p style="font-size:0.8rem; color:red;">Şərhləri yükləmək mümkün olmadı.</p>';
    }
}

function renderComments(comments) {
    const list = document.getElementById('comments-list');
    if (comments.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#888; padding: 20px; font-size:0.9rem;">Hələ müzakirə yoxdur. Fikrinizi bildirin!</p>';
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

        div.innerHTML = `
            ${!isOwn ? `<div class="comment-author">${c.userName}</div>` : ''}
            <div class="comment-text">${c.text}</div>
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
                <div class="comment-date" style="margin: 0;">${dateStr}</div>
                ${(isOwn || isAdmin) ? `<button onclick="deleteComment('${c.id}')" style="background:none; border:none; color:inherit; opacity:0.5; cursor:pointer; font-size:0.7rem; padding:0;" title="Mesajı sil"><i class="fas fa-trash"></i></button>` : ''}
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

    // Check if user is logged in or has a stored anonymous name
    let displayName = currentUser ? currentUser.username : localStorage.getItem('anon_display_name');
    let userId = currentUser ? currentUser.id : 'anon_' + (localStorage.getItem('anon_id') || Date.now());

    if (!displayName) {
        // Show anonymous name modal
        document.getElementById('anonymous-name-modal').classList.remove('hidden');
        return;
    }

    const newComment = {
        questionId: currentDiscussionQuestionId,
        userId: userId,
        userName: displayName,
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
            startBtn.style.opacity = 0.5;
            startBtn.textContent = "Sual yoxdur";
        } else {
            startBtn.disabled = false;
            startBtn.style.opacity = 1;
            startBtn.textContent = "Testə Başla";
        }

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
    
    if (cat.questions.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#888;">Hələ sual yoxdur.</p>';
        return;
    }

    cat.questions.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.dataset.id = q.id; // Add data-id for searching
        div.innerHTML = `
            <div>
                <strong>${index + 1}.</strong> ${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}
                ${q.image ? '<i class="fas fa-image" title="Şəkilli sual"></i>' : ''}
            </div>
            <div class="q-actions">
                <button onclick="editCategoryQuestion(${q.id})" class="edit-cat-btn" title="Düzəliş et"><i class="fas fa-edit"></i></button>
                <button onclick="deleteQuestion(${q.id})" title="Sualı sil"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.generateAdminAIQuestions = async function() {
    const context = document.getElementById('admin-ai-context-text').value.trim();
    const count = document.getElementById('admin-ai-question-count').value;
    const btn = document.getElementById('btn-admin-generate-ai');
    const loading = document.getElementById('admin-ai-loading');
    
    // DB-dən açarı yenidən yoxla (əgər hələ yüklənməyibsə)
    if (!GEMINI_API_KEY) await loadAiApiKey();
    
    if (!context) {
        return showNotification('Zəhmət olmasa mövzu mətni daxil edin.', 'error');
    }
    
    if (context.length < 50) {
        return showNotification('Mətn çox qısadır. Daha keyfiyyətli suallar üçün daha çox məlumat daxil edin.', 'warning');
    }

    btn.disabled = true;
    loading.classList.remove('hidden');
    
    if (!GEMINI_API_KEY) {
        loading.classList.add('hidden');
        btn.disabled = false;
        return showNotification('Süni İntellekt funksiyası üçün API açarı təyin edilməyib. Zəhmət olmasa adminlə əlaqə saxlayın.', 'error');
    }

    const prompt = `Sən bir peşəkar müəllimsən. Aşağıdakı mətndən istifadə edərək ${count} dənə çoxseçimli (test) sual hazırla. 
    Cavablar yalnız Azərbaycan dilində olsun. 
    Hər sualın 4 variantı olsun. 
    Variantların daxilində "A)", "1)" kimi prefikslər yazma, yalnız variantın mətnini yaz.
    Nəticəni yalnız aşağıdakı JSON formatında qaytar (heç bir əlavə mətn yazma, yalnız JSON):
    [
      {
        "text": "Sual mətni",
        "options": ["Variant 1", "Variant 2", "Variant 3", "Variant 4"],
        "correct": 0 
      }
    ]
    "correct" sahəsi düzgün variantın indeksidir (0-dan başlayaraq).
    
    Mətn: ${context}`;

    const models = ["gemini-3-flash-preview", "gemini-3-pro-preview", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"];
    const apiVersions = ["v1beta", "v1"];
    let lastError = "";
    let success = false;

    for (const apiVer of apiVersions) {
        if (success) break;
        for (const modelName of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const data = await response.json();
                if (data.error) {
                    lastError = data.error.message;
                    continue;
                }

                if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts) {
                    lastError = "AI cavabı boşdur";
                    continue;
                }

                let aiResponse = data.candidates[0].content.parts[0].text;
                const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
                if (!jsonMatch) {
                    lastError = "Format xətası (JSON tapılmadı)";
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
                break; 
            } catch (error) {
                lastError = error.message;
            }
        }
    }

    if (!success) {
        alert("Xəta: " + lastError);
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
    const blocks = text.split(/\n\s*\n/);
    
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 3) return;
        
        const questionText = lines[0].replace(/^\d+[\s.)]*/, '');
        const options = [];
        let correctIndex = 0;
        
        lines.slice(1).forEach(line => {
            if (line.match(/^[A-J][\s.)]/i)) {
                options.push(line.replace(/^[A-J][\s.)]*/i, ''));
            } else if (line.toLowerCase().includes('doğru:') || line.toLowerCase().includes('cavab:')) {
                const parts = line.split(':');
                if (parts.length > 1) {
                    const ansChar = parts[1].trim().toUpperCase();
                    correctIndex = ansChar.charCodeAt(0) - 65;
                }
            }
        });
        
        if (questionText && options.length > 0) {
            questions.push({
                text: questionText,
                options: options,
                correctIndex: correctIndex >= 0 && correctIndex < options.length ? correctIndex : 0
            });
        }
    });
    
    if (questions.length > 0) {
        const list = document.getElementById('admin-questions-list');
        // Clear or append? Usually, bulk import into a list is meant to populate the manual review.
        // Let's clear and switch to manual tab for review.
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
                            <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" style="display:none;">
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
                                <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" style="display:none;">
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
                    <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" style="display:none;">
                </label>
                <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}">
            </div>
            <div class="manual-q-text-container">
                <textarea class="manual-q-text" placeholder="Sualın mətnini daxil edin..."></textarea>
            </div>
        </div>
        <div class="manual-options-grid">
            <div style="grid-column: 1 / -1; background: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 10px; color: #92400e; font-size: 0.9rem; display: flex; align-items: center; gap: 10px;">
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

window.saveAdminQuestions = function() {
    const questionItems = document.querySelectorAll('#admin-questions-list .manual-question-item');
    const newQuestionsData = [];
    
    for (const item of questionItems) {
        const text = item.querySelector('.manual-q-text').value.trim();
        const image = item.querySelector('.manual-q-img-data').value;
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
            return;
        }

        newQuestionsData.push({
            text,
            image,
            options,
            correctIndex: parseInt(correctRadio.value)
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
        const qIdx = cat.questions.findIndex(q => q.id === editingQuestionId);
        if (qIdx !== -1) {
            cat.questions[qIdx] = {
                ...cat.questions[qIdx],
                ...newQuestionsData[0]
            };
            showNotification('Sual uğurla yeniləndi!', 'success');
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
    if (headerTitle) headerTitle.innerHTML = '<i class="fas fa-plus-circle" style="color: var(--primary-color);"></i> Sual Əlavə Et';
    
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-check-double"></i> Hamısını Yadda Saxla';
}

window.editCategoryQuestion = function(qId) {
    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat) return;
    const q = cat.questions.find(item => item.id === qId);
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
    headerTitle.innerHTML = '<i class="fas fa-edit" style="color: var(--primary-color);"></i> Suala Düzəliş Et';

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
    
    // Yadda saxla düyməsinin mətnini dəyiş
    const saveBtn = document.querySelector('.btn-save');
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Dəyişikliyi Yadda Saxla';
}

window.deleteQuestion = function(qId) {
    if (confirm('Sualı silmək istədiyinizə əminsiniz?')) {
        const cat = categories.find(c => c.id === activeCategoryId);
        cat.questions = cat.questions.filter(q => q.id !== qId);
        saveCategories(); // Save to DB
        openCategory(activeCategoryId);
    }
}

// --- Quiz Logic ---
window.startQuiz = function() {
    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat || cat.questions.length === 0) return;

    // Show Quiz Setup Modal
    const setupModal = document.getElementById('quiz-setup-modal');
    const categoryTitle = document.getElementById('setup-category-title');
    
    if (categoryTitle) categoryTitle.textContent = cat.name;
    
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
    
    // Shuffle all questions
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
        progressBar.style.width = `${progressPercentage}%`;
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
    const reportBtnHtml = `
        <button onclick="openReportModal('${q.id || currentQuiz.currentQuestionIndex}', 'quiz', '${q.text.substring(0, 50).replace(/'/g, "\\'")}...')" class="btn-report btn-report-quiz" style="margin-top: 15px; width: fit-content;">
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
    okBtn.style.background = 'var(--danger-color)';
    okBtn.style.borderColor = 'var(--danger-color)';

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
}

window.showDashboard = function() {
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
    
    activePrivateQuiz = null;
    studentName = '';
    
    hideAllSections();
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
            ${q.image ? `<img src="${q.image}" style="max-width: 100%; border-radius: 8px; margin-bottom: 10px;">` : ''}
            <div class="review-options">
                ${optionsHtml}
            </div>
            <div class="review-status ${isCorrect ? 'correct' : (isUnanswered ? 'unanswered' : 'wrong')}">
                <i class="fas fa-${statusIcon}-circle"></i>
                ${statusText}
            </div>
        `;
        reviewList.appendChild(reviewItem);
    });
}

window.hideReview = function() {
    hideAllSections();
    document.getElementById('result-section').classList.remove('hidden');
}

// --- Reporting System ---
window.openReportModal = function(qId, qType, qTitle) {
    document.getElementById('report-q-id').value = qId;
    document.getElementById('report-q-type').value = qType;
    document.getElementById('report-q-title-val').value = qTitle;
    document.getElementById('report-q-cat-id').value = activeCategoryId || '';
    document.getElementById('report-q-title').textContent = `Sual: ${qTitle}`;
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
        username: currentUser ? currentUser.username : 'Anonim',
        timestamp: Date.now(),
        status: 'pending'
    };

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

window.showReports = function() {
    hideAllSections();
    document.getElementById('reports-section').classList.remove('hidden');
    loadReports();
}

window.loadReports = async function() {
    const list = document.getElementById('reports-list');
    list.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Yüklənir...</div>';
    
    try {
        let reports = [];
        if (db) {
            const snapshot = await db.collection('reports').orderBy('timestamp', 'desc').get();
            reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            reports = JSON.parse(localStorage.getItem('reports') || '[]').sort((a, b) => b.timestamp - a.timestamp);
        }

        if (reports.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding: 40px; color: #64748b;">Hələ heç bir şikayət yoxdur.</div>';
            return;
        }

        list.innerHTML = '';
        reports.forEach(report => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.style.borderLeft = report.status === 'pending' ? '4px solid #ef4444' : '4px solid #10b981';
            
            const date = new Date(report.timestamp).toLocaleString('az-AZ');
            
            div.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 600; color: var(--primary-color);">
                                    <i class="fas fa-question-circle"></i> Sual ID: ${report.questionId} (${report.questionType === 'public' ? 'Ümumi' : 'Kateqoriya'})
                                </span>
                                <button onclick="goToReportedQuestion('${report.categoryId || ''}', '${report.questionId}', '${report.questionType}')" class="btn-primary" style="padding: 4px 8px; font-size: 0.7rem; border-radius: 4px;">
                                    <i class="fas fa-external-link-alt"></i> Suala get
                                </button>
                            </div>
                            ${report.questionTitle ? `
                                <span style="font-size: 0.9rem; color: #1e293b; font-weight: 500;">
                                    <strong>Sual:</strong> ${report.questionTitle}
                                </span>
                            ` : ''}
                        </div>
                        <span style="font-size: 0.8rem; color: #64748b;">${date}</span>
                    </div>
                    <div style="margin-bottom: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 3px solid #cbd5e1; color: #1e293b;">
                        <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; margin-bottom: 4px; font-weight: 600;">Şikayət:</div>
                        "${report.message}"
                    </div>
                    <div style="font-size: 0.85rem; color: #64748b; display: flex; align-items: center; gap: 10px;">
                        <span><i class="fas fa-user"></i> Göndərən: <strong>${report.username}</strong></span>
                        <span>|</span>
                        <span>ID: ${report.userId}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="openReplyModal('${report.id}', '${report.message.replace(/'/g, "\\'")}')" class="btn-reply" title="Cavab ver">
                        <i class="fas fa-reply"></i>
                    </button>
                    ${report.status === 'pending' ? `
                        <button onclick="markReportAsResolved('${report.id}')" class="btn-success" style="padding: 8px 12px; font-size: 0.8rem;" title="Həll edildi">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button onclick="deleteReport('${report.id}')" class="btn-outline" style="padding: 8px 12px; font-size: 0.8rem; border-color: #ef4444; color: #ef4444;" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        list.innerHTML = '<div style="text-align:center; padding: 20px; color: #ef4444;">Şikayətləri yükləmək mümkün olmadı.</div>';
    }
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
        loadReports();
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
        loadReports();
    } catch (e) {
        console.error(e);
        showNotification('Xəta baş verdi', 'error');
    }
}

window.loadUserInbox = async function() {
    const list = document.getElementById('user-inbox-list');
    const countBadge = document.getElementById('user-inbox-count');
    
    if (!list) return;
    if (!currentUser) {
        list.innerHTML = '<div style="text-align:center; padding: 20px;">Giriş edilməyib.</div>';
        return;
    }
    
    list.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Yüklənir...</div>';
    
    try {
        let reports = [];
        if (db) {
            const snapshot = await db.collection('reports')
                .where('userId', '==', currentUser.id)
                .get();
            
            reports = snapshot.docs.map(doc => {
                const data = doc.data();
                // Firestore timestamp-i Date obyektinə çeviririk
                let ts = data.timestamp;
                if (ts && typeof ts.toDate === 'function') ts = ts.toDate().getTime();
                else if (ts) ts = new Date(ts).getTime();
                else ts = 0;

                let rts = data.replyTimestamp;
                if (rts && typeof rts.toDate === 'function') rts = rts.toDate().getTime();
                else if (rts) rts = new Date(rts).getTime();
                else rts = null;

                return { 
                    id: doc.id, 
                    ...data, 
                    timestamp: ts,
                    replyTimestamp: rts
                };
            }).sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
        } else {
            reports = JSON.parse(localStorage.getItem('reports') || '[]')
                .filter(r => r.userId == currentUser.id)
                .map(r => ({
                    ...r,
                    timestamp: new Date(r.timestamp).getTime(),
                    replyTimestamp: r.replyTimestamp ? new Date(r.replyTimestamp).getTime() : null
                }))
                .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
        }

        if (countBadge) {
            countBadge.textContent = `${reports.length} mesaj`;
        }

        if (reports.length === 0) {
            list.innerHTML = '<div class="no-messages">Hələ heç bir şikayətiniz yoxdur.</div>';
            return;
        }

        list.innerHTML = '';
        reports.forEach(report => {
            const div = document.createElement('div');
            div.className = 'inbox-item';
            
            const date = report.timestamp ? new Date(report.timestamp).toLocaleString('az-AZ') : 'Naməlum tarix';
            const replyDate = report.replyTimestamp ? new Date(report.replyTimestamp).toLocaleString('az-AZ') : '';
            
            div.innerHTML = `
                <div class="inbox-header">
                    <span class="report-type">
                        <i class="fas fa-flag"></i> ${report.questionType === 'public' ? 'Ümumi Sual' : 'Kateqoriya Sualı'}
                    </span>
                    <span class="report-date">${date}</span>
                </div>
                <div class="report-content">
                    <strong>Şikayətiniz:</strong> "${report.message}"
                </div>
                ${report.adminReply ? `
                    <div class="admin-reply">
                        <div class="admin-reply-header">
                            <span><i class="fas fa-user-shield"></i> Admin Cavabı:</span>
                            <span style="font-size: 0.75rem; opacity: 0.8;">${replyDate}</span>
                        </div>
                        <div class="admin-reply-content">
                            "${report.adminReply}"
                        </div>
                    </div>
                ` : `
                    <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
                        <i class="fas fa-clock"></i> Cavab gözlənilir...
                    </div>
                `}
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error("Inbox loading error:", e);
        list.innerHTML = `<div style="text-align:center; padding: 20px; color: #ef4444;">
            Inboxu yükləmək mümkün olmadı.<br>
            <small style="font-size: 0.7rem;">Xəta: ${e.message}</small>
        </div>`;
    }
};


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
        loadReports();
    } catch (e) {
        console.error(e);
    }
}

window.goToReportedQuestion = function(catId, qId, qType) {
    if (!catId) {
        return showNotification('Bu şikayətdə kateqoriya məlumatı yoxdur (köhnə şikayət).', 'error');
    }
    
    if (qType === 'public') {
        activeCategoryId = catId;
        showPublicQuestions();
        // Suala qədər sürüşdür (scrolling)
        setTimeout(() => {
            const elements = document.getElementsByClassName('public-q-card');
            for (let el of elements) {
                if (el.innerHTML.includes(qId)) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.boxShadow = '0 0 15px var(--primary-color)';
                    el.style.border = '2px solid var(--primary-color)';
                    setTimeout(() => {
                        el.style.boxShadow = '';
                        el.style.border = '';
                    }, 3000);
                    break;
                }
            }
        }, 1000);
    } else {
        // Kateqoriya sualı üçün (admin panelində)
        openCategory(catId);
        // Sualı siyahıda tap və işarələ
        setTimeout(() => {
            const elements = document.getElementsByClassName('question-item');
            for (let el of elements) {
                if (el.dataset.id == qId) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.background = '#fef3c7'; // Sarılı rənglə işarələ
                    el.style.borderLeft = '4px solid #f59e0b';
                    setTimeout(() => {
                        el.style.background = '';
                        el.style.borderLeft = '';
                    }, 5000);
                    break;
                }
            }
        }, 800);
    }
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
}

// AI Question Generation
let selectedAIImageBase64 = null;

window.handleAIImageSelect = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Şəkil ölçüsü 5MB-dan çox ola bilməz!', 'error');
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedAIImageBase64 = e.target.result.split(',')[1]; // Get only base64 data
        document.getElementById('selected-image-name').textContent = `Seçildi: ${file.name}`;
        document.getElementById('selected-image-name').classList.remove('hidden');
        document.getElementById('btn-remove-ai-image').classList.remove('hidden');
        document.querySelector('.upload-placeholder p').classList.add('hidden');
        document.querySelector('.upload-placeholder i').style.color = 'var(--success-color)';
    };
    reader.readAsDataURL(file);
}

window.removeSelectedAIImage = function() {
    selectedAIImageBase64 = null;
    document.getElementById('ai-question-image').value = '';
    document.getElementById('selected-image-name').textContent = '';
    document.getElementById('selected-image-name').classList.add('hidden');
    document.getElementById('btn-remove-ai-image').classList.add('hidden');
    document.querySelector('.upload-placeholder p').classList.remove('hidden');
    document.querySelector('.upload-placeholder i').style.color = 'var(--primary-color)';
}

window.generateAIQuestions = async function() {
    const context = document.getElementById('ai-context-text').value.trim();
    const count = document.getElementById('ai-question-count').value;
    const btn = document.getElementById('btn-generate-ai');
    const loading = document.getElementById('ai-loading');
    
    // DB-dən açarı yenidən yoxla (əgər hələ yüklənməyibsə)
    if (!GEMINI_API_KEY) await loadAiApiKey();
    
    if (!context && !selectedAIImageBase64) {
        return showNotification('Zəhmət olmasa mövzu mətni daxil edin və ya şəkil yükləyin.', 'error');
    }
    
    if (context && context.length < 50 && !selectedAIImageBase64) {
        return showNotification('Mətn çox qısadır. Daha keyfiyyətli suallar üçün daha çox məlumat daxil edin.', 'warning');
    }

    btn.disabled = true;
    loading.classList.remove('hidden');
    
    if (!GEMINI_API_KEY) {
        loading.classList.add('hidden');
        btn.disabled = false;
        return showNotification('Süni İntellekt funksiyası üçün API açarı təyin edilməyib. Zəhmət olmasa adminlə əlaqə saxlayın.', 'error');
    }

    let prompt = `Sən bir peşəkar müəllimsən. `;
    if (selectedAIImageBase64) {
        prompt += `Sənə təqdim olunan şəkildəki sualları oxu və onları rəqəmsal formata sal. Əgər şəkildə suallar azdırsa, mətndən istifadə edərək ümumi sayı ${count} çatdır. `;
    } else {
        prompt += `Aşağıdakı mətndən istifadə edərək ${count} dənə çoxseçimli (test) sual hazırla. `;
    }

    prompt += `
    Cavablar yalnız Azərbaycan dilində olsun. 
    Hər sualın 4 variantı olsun. 
    Variantların daxilində "A)", "1)" kimi prefikslər yazma, yalnız variantın mətnini yaz.
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

    if (selectedAIImageBase64) {
        contents[0].parts.push({
            inline_data: {
                mime_type: "image/jpeg",
                data: selectedAIImageBase64
            }
        });
    }

    // Modellərin siyahısı - Vision dəstəyi olan və v1beta ilə işləyən modellər
    const models = [
        "gemini-3-flash-preview",
        "gemini-3-pro-preview",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp"
    ];
    // Gemini 2.0 və bəzi yeni modellər v1beta versiyasında daha stabil işləyir
    const apiVersions = ["v1beta", "v1"];
    let lastError = "";
    let success = false;

    console.log("AI Sual yaradılması başladıldı (Vision: " + (selectedAIImageBase64 ? "Bəli" : "Xeyr") + ")...");

    for (const apiVer of apiVersions) {
        if (success) break;
        for (const modelName of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
                console.log(`Cəhd edilir: ${apiVer} / ${modelName}`);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: contents
                    })
                });

                const data = await response.json();
                
                if (data.error) {
                    lastError = data.error.message;
                    console.warn(`Xəta (${apiVer}/${modelName}):`, lastError);
                    
                    // Əgər xəta API key ilə bağlıdırsa, digər modelləri yoxlamağa ehtiyac yoxdur
                    if (data.error.status === "PERMISSION_DENIED" || data.error.status === "UNAUTHENTICATED") {
                        showNotification('API açarı yanlışdır və ya icazəsi yoxdur.', 'error');
                        loading.classList.add('hidden');
                        btn.disabled = false;
                        return;
                    }
                    continue;
                }

                if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts) {
                    lastError = "AI cavabı boşdur";
                    continue;
                }

                let aiResponse = data.candidates[0].content.parts[0].text;
                console.log("AI cavabı alındı, emal edilir...");

                const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
                if (!jsonMatch) {
                    lastError = "Format xətası (JSON tapılmadı)";
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
                            // Variantlar sayını AI-dan gələn saya uyğunlaşdır
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
                showNotification(`${questions.length} sual uğurla yaradıldı! Zəhmət olmasa sualları və düzgün cavabları yenidən yoxlayın.`, 'success');
                updateQuestionCount();
                success = true;
                removeSelectedAIImage(); // Clear image after success
                break; 

            } catch (error) {
                lastError = error.message;
                console.error(`Model istisna xətası (${modelName}):`, error);
            }
        }
    }

    if (!success) {
        console.error("Bütün modellər uğursuz oldu. Son xəta:", lastError);
        showNotification('Suallar yaradılarkən xəta baş verdi. Zəhmət olmasa API açarınızı və internet bağlantınızı yoxlayın.', 'error');
        // Detallı xətanı konsolda göstəririk, istifadəçiyə daha sadə mesaj veririk
        alert("Xəta təfərrüatı: " + lastError);
    }

    loading.classList.add('hidden');
    btn.disabled = false;
};
