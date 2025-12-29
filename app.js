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

// Initialize Firebase if config is valid
let db;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
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

// Info Modal Logic
window.showInfoModal = function(type) {
    const modal = document.getElementById('info-modal');
    const body = document.getElementById('info-modal-body');
    if (!modal || !body) return;

    let content = '';
    switch(type) {
        case 'about':
            content = `
                <h2><i class="fas fa-info-circle"></i> Haqqımızda</h2>
                <p><strong>İmtahan</strong> - Təhsil sahəsində innovativ həllər təqdim edən, müəllim və tələbələr üçün nəzərdə tutulmuş müasir imtahan platformasıdır.</p>
                <p>Missiyamız biliklərin yoxlanılması prosesini daha asan, şəffaf və əlçatan etməkdir. Platformamız vasitəsilə müəllimlər saniyələr içində özəl testlər yarada, tələbələr isə biliklərini istənilən yerdən yoxlaya bilərlər.</p>
                <div class="security-box">
                    <i class="fas fa-check-circle"></i> Bizim üçün ən önəmli dəyər istifadəçi məmnuniyyəti və məlumatların təhlükəsizliyidir.
                </div>
            `;
            break;
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
            // Load Categories
            const catSnapshot = await db.collection('categories').get();
            categories = catSnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    parentId: data.parentId || null, // Ensure parentId exists
                    ...data 
                };
            });
            
            // Load Users
            const userSnapshot = await db.collection('users').get();
            users = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Load Private Quizzes
            const privateSnapshot = await db.collection('private_quizzes').get();
            privateQuizzes = privateSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log("Data loaded from Firebase");
        } catch (error) {
            console.error("Error loading from Firebase:", error);
            // Fallback to local if error (e.g. offline)
            categories = JSON.parse(localStorage.getItem('categories')) || [];
            users = JSON.parse(localStorage.getItem('users')) || [];
            privateQuizzes = JSON.parse(localStorage.getItem('privateQuizzes')) || [];
        }
    } else {
        categories = JSON.parse(localStorage.getItem('categories')) || [];
        users = JSON.parse(localStorage.getItem('users')) || [];
        privateQuizzes = JSON.parse(localStorage.getItem('privateQuizzes')) || [];
    }

    // Ensure all categories have a parentId property
    categories = categories.map(cat => ({
        ...cat,
        parentId: cat.parentId || null
    }));

    // Seed Data if Empty
    if (categories.length === 0) {
        categories = [
            { id: '1', name: 'Dövlət qulluğu', time: 45, questions: [], parentId: null },
            { id: '2', name: 'Cinayət Məcəlləsi', time: 45, questions: [], parentId: null },
            { id: '3', name: 'Mülki Məcəllə', time: 45, questions: [], parentId: null }
        ];
        saveCategories(); // Save to DB/Local
    }

    if (users.length === 0) {
        const adminId = 'admin_' + Date.now();
        users = [{ id: adminId, username: 'admin', password: '123', role: 'admin' }];
        saveUsers(); // Save to DB/Local
    } else {
        // Admin fix logic
        const adminUser = users.find(u => u.username === 'admin');
        if (!adminUser) {
             users.push({ id: 'admin_' + Date.now(), username: 'admin', password: '123', role: 'admin' });
             saveUsers();
        } else if (adminUser.role !== 'admin') {
             adminUser.role = 'admin';
             saveUsers();
        }

        // Moderator seed logic
        const moderatorUser = users.find(u => u.username === 'moderator');
        if (!moderatorUser) {
            users.push({ id: 'mod_' + Date.now(), username: 'moderator', password: 'mod', role: 'moderator' });
            saveUsers();
        }
    }

    // Check for English category leftovers and remove them
    const initialCount = categories.length;
    categories = categories.filter(c => c.name !== 'İngilis' && String(c.id) !== 'english_demo');
    
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
            await db.collection('users').doc(String(user.id)).set(user);
        }
    }
    localStorage.setItem('users', JSON.stringify(users));
}


// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    handleUrlParams();
    updateUI();
});

function updateUI() {
    navbar.classList.remove('hidden');
    
    // Check if we are in a private quiz link
    const isPrivateQuiz = new URLSearchParams(window.location.search).has('quiz');
    
    if (currentUser) {
        document.body.classList.remove('role-student', 'role-teacher', 'role-admin', 'role-moderator');
        document.body.classList.add('role-' + currentUser.role);
        document.getElementById('guest-nav').classList.add('hidden');
        document.getElementById('user-nav').classList.remove('hidden');
        document.getElementById('user-display').textContent = `Salam, ${currentUser.username}`;
        
        const teacherBtn = document.getElementById('teacher-panel-btn');
        if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
            teacherBtn.classList.remove('hidden');
        } else {
            teacherBtn.classList.add('hidden');
        }
        
        const adminBtn = document.getElementById('admin-panel-btn');
        if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
            adminBtn.classList.remove('hidden');
            // Change text if moderator
            if (currentUser.role === 'moderator') {
                adminBtn.innerHTML = '<i class="fas fa-tasks"></i> Moderator Paneli';
            } else {
                adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin Paneli';
            }
        } else {
            adminBtn.classList.add('hidden');
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

window.login = function() {
    const username = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    
    const user = users.find(u => u.username === username && u.password === pass);
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        updateUI();
        showNotification('Xoş gəldiniz, ' + user.username + '!', 'success');
    } else {
        showNotification('İstifadəçi adı və ya şifrə yanlışdır!', 'error');
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
    const username = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const email = document.getElementById('reg-email').value;

    if (!username || !pass) return showNotification('Bütün sahələri doldurun!', 'error');
    if (pass.length < 8) return showNotification('Şifrə minimum 8 işarədən ibarət olmalıdır!', 'error');
    if (role === 'teacher' && (!email || !email.includes('@'))) return showNotification('Zəhmət olmasa düzgün email ünvanı daxil edin!', 'error');
    if (users.find(u => u.username === username)) return showNotification('Bu istifadəçi adı artıq mövcuddur!', 'error');

    if (role === 'teacher') {
        // Teacher verification flow
        pendingUser = { id: String(Date.now()), username, password: pass, role: role, email: email };
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        const success = await sendVerificationEmail(email, verificationCode);
        
        if (success) {
            showNotification(`${email} ünvanına təsdiq kodu göndərildi. Zəhmət olmasa emailinizi yoxlayın.`, 'success');
            document.getElementById('verification-modal').classList.remove('hidden');
        } else {
            showNotification('Email göndərilərkən xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.', 'error');
        }
    } else {
        // Normal student registration
        const newUser = { id: String(Date.now()), username, password: pass, role: role };
        users.push(newUser);
        saveUsers();
        showNotification('Qeydiyyat uğurludur! İndi daxil ola bilərsiniz.', 'success');
        showLogin();
    }
}

window.confirmVerification = function() {
    const codeInput = document.getElementById('v-code').value;
    if (codeInput === verificationCode) {
        users.push(pendingUser);
        saveUsers();
        showNotification('Email təsdiqləndi! Qeydiyyat uğurla tamamlandı.', 'success');
        closeVerification();
        showLogin();
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
function hideAllSections() {
    const sections = [
        'auth-section', 'dashboard-section', 'admin-dashboard-section', 
        'category-admin-section', 'quiz-section', 'result-section', 
        'profile-section', 'teacher-dashboard-section', 
        'create-private-quiz-section', 'private-access-section',
        'admin-question-section', 'review-section', 'public-questions-section'
    ];
    sections.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.classList.add('hidden');
    });
}

window.hideAdminQuestionPage = function() {
    hideAllSections();
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

window.showCreatePrivateQuiz = function() {
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
    document.getElementById('ready-question-count').textContent = '0';
    addManualQuestionForm(); // Add first empty question
}

window.editPrivateQuiz = function(quizId) {
    const quiz = privateQuizzes.find(q => q.id === quizId);
    if (!quiz) return showNotification('Test tapılmadı!', 'error');
    
    hideAllSections();
    document.getElementById('create-private-quiz-section').classList.remove('hidden');
    
    // Set form to edit mode
    document.getElementById('editing-quiz-id').value = quizId;
    document.getElementById('private-quiz-form-title').textContent = 'Özəl Testdə Düzəliş Et';
    document.getElementById('private-quiz-title').value = quiz.title;
    document.getElementById('private-quiz-password').value = quiz.password;
    document.getElementById('private-quiz-default-time').value = quiz.defaultTime || 45;
    
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
    
    const div = document.createElement('div');
    div.className = 'manual-question-item';
    div.innerHTML = `
        <div class="manual-q-header">
            <div class="manual-q-title">
                <i class="fas fa-plus-circle"></i>
                <span>Yeni Sual</span>
            </div>
            <div class="manual-q-actions">
                <div class="time-input-group">
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
                time: customTime ? parseInt(customTime) : null,
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

function renderPrivateQuizzes() {
    const grid = document.getElementById('private-quizzes-grid');
    grid.innerHTML = '';
    
    const myQuizzes = privateQuizzes.filter(q => q.teacherId === currentUser.id);
    
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
                    ${isActive ? '<i class="fas fa-check-circle"></i> Aktiv' : '<i class="fas fa-times-circle"></i> Deaktiv'}
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

window.showStudentResults = async function(quizId, quizTitle) {
    console.log("Fetching results for quizId:", quizId);
    const modal = document.getElementById('student-results-modal');
    if (!modal) return;
    document.getElementById('results-modal-title').textContent = `${quizTitle} - Nəticələr`;
    modal.classList.remove('hidden');
    const tableBody = document.getElementById('student-results-body');
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Yüklənir...</td></tr>';
    
    if (db) {
        try {
            if (!quizId) throw new Error("Quiz ID tapılmadı.");

            // Firestore-da orderBy və where fərqli sahələrdə olduqda indeks tələb edir.
            // İndeks xətasının qarşısını almaq üçün sadəcə where ilə gətirib, JS tərəfində sıralayırıq.
            const snapshot = await db.collection('student_attempts')
                .where('quizId', '==', quizId)
                .get();
            
            console.log("Results found:", snapshot.size);
            let attempts = snapshot.docs.map(doc => doc.data());
            
            // Tarixə görə azalan sıra ilə (ən yeni birinci) sıralama
            attempts.sort((a, b) => b.timestamp - a.timestamp);
            
            renderStudentResultsTable(attempts);
        } catch (e) {
            console.error("ShowStudentResults Error:", e);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: red;">Xəta: ${e.message}</td></tr>`;
        }
    } else {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Firebase aktiv deyil.</td></tr>';
    }
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
        tr.innerHTML = `
            <td>${attempt.studentName}</td>
            <td><span class="accuracy-badge ${badgeClass}">${accuracy}%</span></td>
            <td>${date}</td>
            <td>${attempt.score} / ${attempt.total}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// --- Private Quiz Access Functions ---
let activePrivateQuiz = null;
let studentName = '';

function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quiz');
    
    if (quizId) {
        const quiz = privateQuizzes.find(q => q.id === quizId);
        if (quiz) {
            if (quiz.isActive === false) {
                showNotification('Bu test linki müəllim tərəfindən deaktiv edilib.', 'error');
                window.history.replaceState({}, document.title, window.location.pathname);
                showDashboard();
                return;
            }
            activePrivateQuiz = quiz;
            showPrivateAccess(quiz.title);
        } else {
            // If quiz not in memory, try to fetch from Firebase
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
                        activePrivateQuiz = { id: doc.id, ...data };
                        showPrivateAccess(activePrivateQuiz.title);
                    } else {
                        showNotification('Test tapılmadı.', 'error');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                });
            } else {
                showNotification('Test tapılmadı.', 'error');
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

window.accessPrivateQuiz = function() {
    const firstName = document.getElementById('student-first-name').value.trim();
    const lastName = document.getElementById('student-last-name').value.trim();
    const pass = document.getElementById('student-quiz-password').value;
    
    if (!firstName || !lastName || !pass) {
        return showNotification('Zəhmət olmasa bütün xanaları (Ad, Soyad və Şifrə) doldurun.', 'error');
    }
    
    if (pass !== activePrivateQuiz.password) {
        return showNotification('Yanlış şifrə!', 'error');
    }
    
    studentName = `${firstName} ${lastName}`;
    startPrivateQuiz();
}

function startPrivateQuiz() {
    currentQuiz = {
        categoryId: 'private',
        questions: activePrivateQuiz.questions,
        currentQuestionIndex: 0,
        score: 0,
        timer: null,
        defaultTime: activePrivateQuiz.defaultTime || 45,
        timeLeft: 45 // Will be set in loadQuestion
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
    document.getElementById('profile-username').textContent = currentUser.username;
    document.getElementById('profile-role').textContent = currentUser.role === 'admin' ? 'Admin' : 'İstifadəçi';
    
    renderHistory();
}

async function renderHistory() {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '';
    
    let history = [];
    if (db) {
        try {
            const snapshot = await db.collection('attempts')
                .where('userId', '==', currentUser.id)
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
            history = snapshot.docs.map(doc => doc.data());
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
        tr.innerHTML = `
            <td>${attempt.categoryName}</td>
            <td>${date}</td>
            <td><span class="accuracy-badge ${badgeClass}">${accuracy}%</span></td>
            <td>${attempt.score} / ${attempt.total}</td>
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
    
    // Check if user can add questions (logged in)
    const addBtn = document.getElementById('add-public-q-btn');
    if (currentUser) {
        addBtn.classList.remove('hidden');
    } else {
        addBtn.classList.add('hidden');
    }

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
    if (!currentUser) return showLogin();
    document.getElementById('public-question-modal').classList.remove('hidden');
    // Clear form
    document.getElementById('pub-q-text').value = '';
    const opts = document.querySelectorAll('.pub-opt');
    opts.forEach(o => o.value = '');
}

window.submitPublicQuestion = async function() {
    const text = document.getElementById('pub-q-text').value.trim();
    const opts = Array.from(document.querySelectorAll('.pub-opt')).map(o => o.value.trim());
    const correct = parseInt(document.getElementById('pub-q-correct').value);

    if (!text || opts.some(o => !o)) {
        return showNotification('Zəhmət olmasa bütün sahələri doldurun.', 'error');
    }

    const newQ = {
        categoryId: activeCategoryId,
        text: text,
        options: opts,
        correctIndex: correct,
        authorId: currentUser.id,
        authorName: currentUser.username,
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
        const div = document.createElement('div');
        div.className = 'public-q-card';
        div.innerHTML = `
            <div class="public-q-header">
                <span><i class="fas fa-user"></i> ${q.authorName || 'Anonim'}</span>
                <span>${q.createdAt ? (db ? new Date(q.createdAt.toDate()).toLocaleDateString() : new Date(q.createdAt).toLocaleDateString()) : ''}</span>
            </div>
            <div class="public-q-text">${q.text}</div>
            <div class="public-q-options">
                ${q.options.map((opt, idx) => `
                    <div class="pub-opt-item ${idx === q.correctIndex ? 'correct' : ''}">
                        ${String.fromCharCode(65 + idx)}) ${opt}
                    </div>
                `).join('')}
            </div>
            <div class="public-q-actions">
                <button onclick="showDiscussion('${q.id}')" class="btn-outline">
                    <i class="fas fa-comments"></i> Müzakirə Et
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

// --- Discussion Logic ---
window.showDiscussion = async function(questionId) {
    currentDiscussionQuestionId = questionId;
    const modal = document.getElementById('discussion-modal');
    modal.classList.remove('hidden');

    // Find the question to show preview
    let questions = [];
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

    loadComments();
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

    list.innerHTML = '';
    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
            <div class="comment-author">
                ${c.userName}
                <span class="comment-date">${c.createdAt ? (db ? new Date(c.createdAt.toDate()).toLocaleString() : new Date(c.createdAt).toLocaleString()) : ''}</span>
            </div>
            <div class="comment-text">${c.text}</div>
        `;
        list.appendChild(div);
    });
    // Scroll to bottom
    list.scrollTop = list.scrollHeight;
}

window.sendComment = async function() {
    if (!currentUser) return showLogin();
    const text = document.getElementById('new-comment-text').value.trim();
    if (!text) return;

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
        div.innerHTML = `
            <div>
                <strong>${index + 1}.</strong> ${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}
                ${q.image ? '<i class="fas fa-image" title="Şəkilli sual"></i>' : ''}
            </div>
            <div class="q-actions">
                <button onclick="deleteQuestion(${q.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

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
    const newQuestions = [];
    
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

        newQuestions.push({
            id: Date.now() + Math.random(),
            text,
            image,
            options,
            correctIndex: parseInt(correctRadio.value)
        });
    }

    if (newQuestions.length === 0) {
        showNotification('Heç bir sual əlavə edilməyib!', 'error');
        return;
    }

    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat) return;

    cat.questions.push(...newQuestions);
    saveCategories();
    hideAdminQuestionPage();
    showNotification(`${newQuestions.length} yeni sual əlavə edildi!`, 'success');
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
        timeLeft: cat.time
    };

    // Səhifə fokusunu itirəndə blur tətbiq etmək üçün interval
    window.securityInterval = setInterval(() => {
        if (!document.hasFocus()) {
            applyPrivacyBlur();
        }
    }, 500);

    closeModal('quiz-setup-modal');
    hideAllSections();
    document.getElementById('quiz-section').classList.remove('hidden');
    loadQuestion();
}

let currentQuiz = null;
let selectedAnswerIndex = -1; // Global variable to track selected answer for current question

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
    
    selectedAnswerIndex = -1; // Reset for new question

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
        btn.textContent = opt;
        btn.onclick = () => selectAnswer(idx);
        optionsArea.appendChild(btn);
    });

    document.getElementById('next-btn').classList.remove('hidden'); // Show Next button by default
    document.getElementById('next-btn').disabled = true; // Disable until an answer is selected
    document.getElementById('feedback').classList.add('hidden');
    
    // Timer Reset
    clearInterval(currentQuiz.timer);
    currentQuiz.timeLeft = timeLimit;
    updateTimerDisplay();
    currentQuiz.timer = setInterval(() => {
        currentQuiz.timeLeft--;
        updateTimerDisplay();
        if (currentQuiz.timeLeft <= 0) {
            clearInterval(currentQuiz.timer);
            timeIsUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent = `00:${currentQuiz.timeLeft < 10 ? '0' : ''}${currentQuiz.timeLeft}`;
}

function selectAnswer(selectedIndex) {
    selectedAnswerIndex = selectedIndex;
    const options = document.querySelectorAll('.option-btn');
    
    // Remove selected class from all and add to the current one
    options.forEach((btn, idx) => {
        btn.classList.remove('selected');
        if (idx === selectedIndex) {
            btn.classList.add('selected');
        }
    });

    // Enable next button
    document.getElementById('next-btn').disabled = false;
}

function timeIsUp() {
    // If time is up and no answer selected, it's wrong. If selected, process it.
    processCurrentQuestion();
}

window.nextQuestion = function() {
    processCurrentQuestion();
}

function processCurrentQuestion() {
    clearInterval(currentQuiz.timer);
    const q = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    
    // Track answer for review
    if (!currentQuiz.userAnswers) currentQuiz.userAnswers = [];
    currentQuiz.userAnswers.push(selectedAnswerIndex);

    if (selectedAnswerIndex === q.correctIndex) {
        currentQuiz.score++;
    }

    currentQuiz.currentQuestionIndex++;
    if (currentQuiz.currentQuestionIndex < currentQuiz.questions.length) {
        loadQuestion();
    } else {
        showResult();
    }
}

function showResult() {
    hideAllSections();
    document.getElementById('result-section').classList.remove('hidden');
    
    const total = currentQuiz.questions.length;
    const correct = currentQuiz.score;
    const wrong = total - correct;
    const accuracy = Math.round((correct / total) * 100) || 0;
    
    document.getElementById('score-text').textContent = `${accuracy}%`;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('wrong-count').textContent = wrong;
    
    // Save attempt logic
    if (activePrivateQuiz) {
        const attempt = {
            quizId: activePrivateQuiz.id,
            quizTitle: activePrivateQuiz.title,
            studentName: studentName,
            score: correct,
            total: total,
            timestamp: Date.now()
        };
        console.log("Saving student attempt:", attempt);
        saveStudentAttempt(attempt);
    } else if (currentUser) {
        const cat = categories.find(c => c.id === currentQuiz.categoryId);
        const attempt = {
            userId: currentUser.id,
            categoryName: cat ? cat.name : 'Naməlum',
            score: correct,
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
        const isCorrect = userAnswer === q.correctIndex;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : 'wrong'}`;
        
        let optionsHtml = '';
        q.options.forEach((opt, optIdx) => {
            let optClass = 'review-option';
            if (optIdx === q.correctIndex) optClass += ' correct-ans';
            else if (optIdx === userAnswer) optClass += ' wrong-ans';
            
            optionsHtml += `<div class="${optClass}">${opt}</div>`;
        });

        reviewItem.innerHTML = `
            <div class="review-question">${idx + 1}. ${q.text}</div>
            ${q.image ? `<img src="${q.image}" style="max-width: 100%; border-radius: 8px; margin-bottom: 10px;">` : ''}
            <div class="review-options">
                ${optionsHtml}
            </div>
            <div class="review-status ${isCorrect ? 'correct' : 'wrong'}">
                <i class="fas fa-${isCorrect ? 'check' : 'times'}-circle"></i>
                ${isCorrect ? 'Düzgün' : 'Yanlış'}
            </div>
        `;
        reviewList.appendChild(reviewItem);
    });
}

window.hideReview = function() {
    hideAllSections();
    document.getElementById('result-section').classList.remove('hidden');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
}
