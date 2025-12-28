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

// Global State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let categories = []; // Will be loaded from DB
let users = [];      // Will be loaded from DB
let privateQuizzes = []; // Private quizzes for teachers
let currentParentId = null; // Track current level in dashboard
let currentAdminParentId = null; // Track current level in admin dashboard

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
    }

    renderCategories();
    if (!document.getElementById('admin-dashboard-section').classList.contains('hidden')) {
        renderAdminCategories();
    }

    const hasEnglish = categories.some(c => c.name === 'İngilis' || String(c.id) === 'english_demo');
    if (!hasEnglish) {
        const baseId = Date.now();
        const englishCat = {
            id: 'english_demo',
            name: 'İngilis',
            time: 45,
            questions: [
                { id: baseId + 1, text: "Select the synonym of 'big'.", image: null, options: ["large", "small", "tiny", "narrow"], correctIndex: 0 },
                { id: baseId + 2, text: "I ____ to the gym every day.", image: null, options: ["go", "goes", "going", "gone"], correctIndex: 0 },
                { id: baseId + 3, text: "She has ____ her homework.", image: null, options: ["done", "did", "do", "doing"], correctIndex: 0 },
                { id: baseId + 4, text: "Which is an adjective?", image: null, options: ["happy", "run", "quickly", "swim"], correctIndex: 0 },
                { id: baseId + 5, text: "Which article fits: ___ apple?", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/itYV+8AAAAASUVORK5CYII=", options: ["an", "a", "the", "no article"], correctIndex: 0 }
            ],
            createdBy: users[0] ? users[0].id : 'system'
        };
        categories.push(englishCat);
        saveCategories();
        renderCategories();
        if (!document.getElementById('admin-dashboard-section').classList.contains('hidden')) {
            renderAdminCategories();
        }
    }
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
        if (currentUser.role === 'admin') {
            adminBtn.classList.remove('hidden');
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
    } else {
        alert('İstifadəçi adı və ya şifrə yanlışdır!');
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

// EmailJS Configuration
const EMAILJS_CONFIG = {
    SERVICE_ID: "service_rjwl984",
    TEMPLATE_ID: "template_y8eq8n8"
};

async function sendVerificationEmail(email, code) {
    try {
        // Real email göndərmə cəhdi
        await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            {
                to_email: email,
                verification_code: code,
                subject: "İmtahan Platforması - Təsdiq Kodu"
            }
        );
        return true;
    } catch (error) {
        console.error("Email göndərilmə xətası:", error);
        // Əgər EmailJS hələ sazlanmayıbsa, test üçün konsola yazırıq
        if (EMAILJS_CONFIG.SERVICE_ID === "YOUR_SERVICE_ID") {
            console.log("QEYD: EmailJS hələ sazlanmayıb. Test kodu:", code);
            return true; // Test rejimində davam etmək üçün
        }
        return false;
    }
}

window.register = async function() {
    const username = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const email = document.getElementById('reg-email').value;

    if (!username || !pass) return alert('Bütün sahələri doldurun!');
    if (pass.length < 8) return alert('Şifrə minimum 8 işarədən ibarət olmalıdır!');
    if (role === 'teacher' && (!email || !email.includes('@'))) return alert('Zəhmət olmasa düzgün email ünvanı daxil edin!');
    if (users.find(u => u.username === username)) return alert('Bu istifadəçi adı artıq mövcuddur!');

    if (role === 'teacher') {
        // Teacher verification flow
        pendingUser = { id: String(Date.now()), username, password: pass, role: role, email: email };
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        const success = await sendVerificationEmail(email, verificationCode);
        
        if (success) {
            alert(`${email} ünvanına təsdiq kodu göndərildi. Zəhmət olmasa emailinizi yoxlayın.`);
            document.getElementById('verification-modal').classList.remove('hidden');
        } else {
            alert('Email göndərilərkən xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.');
        }
    } else {
        // Normal student registration
        const newUser = { id: String(Date.now()), username, password: pass, role: role };
        users.push(newUser);
        saveUsers();
        alert('Qeydiyyat uğurludur! İndi daxil ola bilərsiniz.');
        showLogin();
    }
}

window.confirmVerification = function() {
    const codeInput = document.getElementById('v-code').value;
    if (codeInput === verificationCode) {
        users.push(pendingUser);
        saveUsers();
        alert('Email təsdiqləndi! Qeydiyyat uğurla tamamlandı.');
        closeVerification();
        showLogin();
    } else {
        alert('Yanlış təsdiq kodu!');
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
            alert('Baza uğurla yeniləndi! İndi suallar görünəcək.');
            renderCategories();
            renderAdminCategories();
        } catch (error) {
            console.error(error);
            alert('Fayl oxunarkən xəta baş verdi. Düzgün JSON faylı seçdiyinizə əmin olun.');
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
        'create-private-quiz-section', 'private-access-section'
    ];
    sections.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.classList.add('hidden');
    });
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
    if (!quiz) return alert('Test tapılmadı!');
    
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

    // Check file size (limit to 1MB for base64 storage)
    if (file.size > 1024 * 1024) {
        alert('Şəkil ölçüsü 1MB-dan çox olmamalıdır.');
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        document.getElementById(`data_${index}`).value = base64Data;
        const preview = document.getElementById(`preview_${index}`);
        preview.querySelector('img').src = base64Data;
        preview.classList.remove('hidden');
        document.getElementById(`label_${index}`).classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

window.addManualOption = function(uniqueId) {
    const grid = document.getElementById(`options_grid_${uniqueId}`);
    const optionCount = grid.querySelectorAll('.manual-option-input').length;
    if (optionCount >= 10) return alert('Maksimum 10 variant əlavə edə bilərsiniz.');

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
    if (!text.trim()) return alert('Zəhmət olmasa mətni daxil edin.');
    
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
        alert(`${questions.length} sual uğurla köçürüldü. İndi yoxlayıb yadda saxlaya bilərsiniz.`);
    } else {
        alert('Heç bir sual tapılmadı. Zəhmət olmasa formatı yoxlayın.');
    }
}

window.savePrivateQuizFinal = async function() {
    const editingId = document.getElementById('editing-quiz-id').value;
    const title = document.getElementById('private-quiz-title').value;
    const password = document.getElementById('private-quiz-password').value;
    const defaultTime = parseInt(document.getElementById('private-quiz-default-time').value) || 45;
    
    if (!title || !password) return alert('Zəhmət olmasa testin adını və şifrəsini daxil edin.');
    
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
    
    if (questions.length === 0) return alert('Zəhmət olmasa ən azı bir sual əlavə edin.');
    
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
            alert('Özəl test uğurla yeniləndi!');
        } else {
            // Create new
            if (db) {
                const docRef = await db.collection('private_quizzes').add(quizData);
                quizData.id = docRef.id;
            } else {
                quizData.id = 'priv_' + Date.now();
            }
            privateQuizzes.push(quizData);
            alert('Özəl test uğurla yaradıldı!');
        }
        
        localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
        showTeacherDashboard();
    } catch (e) {
        alert('Xəta: ' + e.message);
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
        
        const baseUrl = window.location.origin + window.location.pathname;
        const quizLink = `${baseUrl}?quiz=${quiz.id}`;
        
        card.innerHTML = `
            <div class="cat-card-header">
                <span></span>
                <div class="cat-card-tools">
                    <button onclick="editPrivateQuiz('${quiz.id}')" class="edit-cat-btn" title="Düzəliş et"><i class="fas fa-edit"></i></button>
                    <button onclick="deletePrivateQuiz('${quiz.id}')" class="delete-cat-btn" title="Sil"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="icon-box"><i class="fas fa-link"></i></div>
            <h3>${quiz.title}</h3>
            <p>${quiz.questions.length} sual</p>
            <div class="category-actions">
                <button onclick="copyQuizLink('${quizLink}')" class="btn-primary" style="width:100%"><i class="fas fa-copy"></i> Linki Kopyala</button>
                <button onclick="showStudentResults('${quiz.id}', '${quiz.title}')" class="btn-secondary" style="width:100%"><i class="fas fa-poll"></i> Nəticələr</button>
                <div style="font-size: 0.8rem; color: #666; margin-top: 5px;">Şifrə: <strong>${quiz.password}</strong></div>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.savePrivateQuiz = function() {
    const title = document.getElementById('private-quiz-title').value;
    const password = document.getElementById('private-quiz-password').value;
    const fileInput = document.getElementById('private-quiz-file');
    
    if (!title || !password || !fileInput.files[0]) {
        return alert('Zəhmət olmasa bütün xanaları doldurun və sual faylını seçin.');
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
                createdAt: new Date().toISOString()
            };
            
            if (db) {
                const docRef = await db.collection('private_quizzes').add(newQuiz);
                newQuiz.id = docRef.id;
            } else {
                newQuiz.id = 'priv_' + Date.now();
            }
            
            privateQuizzes.push(newQuiz);
            localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
            
            alert('Özəl test uğurla yaradıldı!');
            showTeacherDashboard();
            
            // Clear inputs
            document.getElementById('private-quiz-title').value = '';
            document.getElementById('private-quiz-password').value = '';
            document.getElementById('private-quiz-file').value = '';
            
        } catch (error) {
            alert('Xəta: ' + error.message);
        }
    };
    reader.readAsText(fileInput.files[0]);
}

window.copyQuizLink = function(link) {
    navigator.clipboard.writeText(link).then(() => {
        alert('Link kopyalandı! Tələbələrinizə göndərə bilərsiniz.');
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
            activePrivateQuiz = quiz;
            showPrivateAccess(quiz.title);
        } else {
            // If quiz not in memory, try to fetch from Firebase
            if (db) {
                db.collection('private_quizzes').doc(quizId).get().then(doc => {
                    if (doc.exists) {
                        activePrivateQuiz = { id: doc.id, ...doc.data() };
                        showPrivateAccess(activePrivateQuiz.title);
                    } else {
                        alert('Test tapılmadı.');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                });
            } else {
                alert('Test tapılmadı.');
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
        return alert('Zəhmət olmasa bütün xanaları (Ad, Soyad və Şifrə) doldurun.');
    }
    
    if (pass !== activePrivateQuiz.password) {
        return alert('Yanlış şifrə!');
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
    
    hideAllSections();
    document.getElementById('quiz-section').classList.remove('hidden');
    loadQuestion();
}

// --- Dashboard & Categories ---
window.showDashboard = function() {
    // Only clear and redirect if we are not on a private quiz page
    if (window.location.search.includes('quiz=')) {
        return;
    }
    
    activePrivateQuiz = null;
    studentName = '';
    
    currentParentId = null; // Reset to top level
    hideAllSections();
    document.getElementById('dashboard-section').classList.remove('hidden');
    renderCategories();
}

window.showAdminDashboard = function() {
    if (!currentUser || currentUser.role !== 'admin') return alert('Bu səhifə yalnız adminlər üçündür!');
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

        // Check if it has subcategories
        const hasSub = categories.some(c => c.parentId === cat.id);
        const hasQuestions = cat.questions && cat.questions.length > 0;

        div.innerHTML = `
            <i class="fas ${icon}"></i>
            <h3>${cat.name}</h3>
            <p>${cat.questions ? cat.questions.length : 0} sual</p>
            ${hasSub ? '<p class="sub-indicator"><i class="fas fa-folder-open"></i> Alt bölmələr var</p>' : ''}
            <div class="category-actions">
                ${hasSub ? `<button class="btn-secondary" onclick="enterCategory('${cat.id}')">Bölmələrə Bax</button>` : ''}
                ${hasQuestions ? `<button class="btn-primary" onclick="startQuizCheck('${cat.id}')">Testə Başla</button>` : ''}
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
        title.textContent = 'Admin Paneli - Kateqoriyalar';
        backBtn.classList.add('hidden');
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

        const hasSub = categories.some(c => c.parentId === cat.id);

        div.innerHTML = `
            <div class="cat-card-header">
                <i class="fas ${icon}"></i>
                <div class="cat-card-tools">
                    <button class="edit-cat-btn" onclick="showEditCategoryModal('${cat.id}', event)"><i class="fas fa-edit"></i></button>
                    <button class="delete-cat-btn" onclick="deleteCategory('${cat.id}', event)"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <h3>${cat.name}</h3>
            <p>${cat.questions ? cat.questions.length : 0} sual</p>
            ${hasSub ? '<p style="font-size: 0.8rem; color: var(--primary-color);"><i class="fas fa-folder"></i> Alt bölmələr var</p>' : ''}
            <div class="category-actions">
                <button class="btn-secondary" onclick="enterAdminCategory('${cat.id}')">Bölməyə Bax</button>
                <button class="btn-primary" onclick="openCategoryQuestions('${cat.id}')">Suallar (${cat.questions ? cat.questions.length : 0})</button>
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
    const id = document.getElementById('edit-cat-id').value;
    const name = document.getElementById('new-cat-name').value;
    const time = parseInt(document.getElementById('new-cat-time').value);

    if (!name) return alert('Ad daxil edin!');

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

function openCategory(id) {
    activeCategoryId = id;
    const cat = categories.find(c => c.id === id);
    hideAllSections();
    document.getElementById('category-admin-section').classList.remove('hidden');
    document.getElementById('current-category-title').textContent = cat.name;
    
    // Start button logic
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

window.showAddQuestionModal = function() {
    // Reset modal fields
    document.getElementById('q-text').value = '';
    document.getElementById('q-image').value = '';
    document.getElementById('options-inputs-container').innerHTML = '';
    
    // Add default 4 options
    for(let i=0; i<4; i++) addOptionInput();
    
    document.getElementById('question-modal').classList.remove('hidden');
}

window.addOptionInput = function() {
    const container = document.getElementById('options-inputs-container');
    const index = container.children.length;
    const div = document.createElement('div');
    div.className = 'option-input-group';
    div.innerHTML = `
        <input type="radio" name="correct-option" value="${index}">
        <input type="text" placeholder="Variant ${index + 1}" class="option-text">
        <button onclick="this.parentElement.remove()" class="btn-secondary" style="padding: 5px 10px;">X</button>
    `;
    container.appendChild(div);
}

window.saveQuestion = function() {
    const text = document.getElementById('q-text').value;
    const imageInput = document.getElementById('q-image');
    
    const options = [];
    let realCorrectIndex = -1;
    let tempIndex = 0;
    
    document.querySelectorAll('.option-input-group').forEach((group) => {
        const radio = group.querySelector('input[type="radio"]');
        const input = group.querySelector('input[type="text"]');
        if (input.value.trim()) {
            options.push(input.value);
            if (radio.checked) realCorrectIndex = tempIndex;
            tempIndex++;
        }
    });

    if (!text) return alert('Sual mətnini daxil edin!');
    if (options.length < 2) return alert('Ən azı 2 variant olmalıdır!');
    if (realCorrectIndex === -1) return alert('Düzgün variantı seçin!');

    const processSave = (base64Img = null) => {
        const cat = categories.find(c => c.id === activeCategoryId);
        const newQ = {
            id: Date.now(),
            text,
            image: base64Img,
            options,
            correctIndex: realCorrectIndex
        };
        cat.questions.push(newQ);
        saveCategories();
        closeModal('question-modal');
        openCategory(activeCategoryId); // Re-render
    };

    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => processSave(e.target.result);
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        processSave();
    }
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

    currentQuiz = {
        categoryId: cat.id,
        questions: [...cat.questions].sort(() => 0.5 - Math.random()), // Shuffle
        currentQuestionIndex: 0,
        score: 0,
        timer: null,
        timeLeft: cat.time
    };

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
    // If it was a private quiz, we should clear the URL and reload to fully reset
    if (activePrivateQuiz) {
        window.location.href = window.location.origin + window.location.pathname;
        return;
    }
    
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

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
}
