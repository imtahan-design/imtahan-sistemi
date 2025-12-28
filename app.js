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

// Load Data Function
async function loadData() {
    if (db) {
        try {
            // Load Categories
            const catSnapshot = await db.collection('categories').get();
            categories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Load Users
            const userSnapshot = await db.collection('users').get();
            users = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log("Data loaded from Firebase");
        } catch (error) {
            console.error("Error loading from Firebase:", error);
            // Fallback to local if error (e.g. offline)
            categories = JSON.parse(localStorage.getItem('categories')) || [];
            users = JSON.parse(localStorage.getItem('users')) || [];
        }
    } else {
        categories = JSON.parse(localStorage.getItem('categories')) || [];
        users = JSON.parse(localStorage.getItem('users')) || [];
    }

    // Seed Data if Empty
    if (categories.length === 0) {
        categories = [
            { id: '1', name: 'Dövlət qulluğu', time: 45, questions: [] },
            { id: '2', name: 'Cinayət Məcəlləsi', time: 45, questions: [] },
            { id: '3', name: 'Mülki Məcəllə', time: 45, questions: [] }
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
    updateUI();
});

function updateUI() {
    navbar.classList.remove('hidden');
    
    if (currentUser) {
        document.getElementById('guest-nav').classList.add('hidden');
        document.getElementById('user-nav').classList.remove('hidden');
        document.getElementById('user-display').textContent = `Salam, ${currentUser.username}`;
        
        const adminBtn = document.getElementById('admin-panel-btn');
        if (currentUser.role === 'admin') {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }
        
        // If not already in admin view or quiz, show public dashboard
        if (document.getElementById('admin-dashboard-section').classList.contains('hidden') && 
            document.getElementById('category-admin-section').classList.contains('hidden') &&
            document.getElementById('quiz-section').classList.contains('hidden')) {
            showDashboard();
        }
    } else {
        document.getElementById('guest-nav').classList.remove('hidden');
        document.getElementById('user-nav').classList.add('hidden');
        showDashboard();
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

window.register = function() {
    const username = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;

    if (!username || !pass) return alert('Bütün sahələri doldurun!');
    if (users.find(u => u.username === username)) return alert('Bu istifadəçi adı artıq mövcuddur!');

    const newUser = { id: String(Date.now()), username, password: pass, role: 'user' };
    users.push(newUser);
    saveUsers(); // Save to DB
    alert('Qeydiyyat uğurludur! İndi daxil ola bilərsiniz.');
    showLogin();
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
    const sections = ['auth-section', 'dashboard-section', 'admin-dashboard-section', 'category-admin-section', 'quiz-section', 'result-section'];
    sections.forEach(id => document.getElementById(id).classList.add('hidden'));
}

// --- Dashboard & Categories ---
window.showDashboard = function() {
    hideAllSections();
    document.getElementById('dashboard-section').classList.remove('hidden');
    renderCategories();
}

window.showAdminDashboard = function() {
    if (!currentUser || currentUser.role !== 'admin') return alert('Bu səhifə yalnız adminlər üçündür!');
    hideAllSections();
    document.getElementById('admin-dashboard-section').classList.remove('hidden');
    renderAdminCategories();
}

function renderCategories() {
    const grid = document.getElementById('categories-grid');
    grid.innerHTML = '';
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-card';
        div.innerHTML = `
            <h3>${cat.name}</h3>
            <p>${cat.questions.length} sual</p>
            <p>Müddət: ${cat.time} san</p>
            <button class="btn-primary" onclick="startQuizCheck('${cat.id}')">Testə Başla</button>
        `;
        grid.appendChild(div);
    });
}

function renderAdminCategories() {
    const grid = document.getElementById('admin-categories-grid');
    grid.innerHTML = '';
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-card';
        div.innerHTML = `
            <h3>${cat.name}</h3>
            <p>${cat.questions.length} sual</p>
            <p>Müddət: ${cat.time} san</p>
            <button class="delete-cat-btn" onclick="deleteCategory('${cat.id}', event)"><i class="fas fa-trash"></i></button>
        `;
        div.onclick = (e) => {
            if(!e.target.closest('.delete-cat-btn')) openCategory(cat.id);
        };
        grid.appendChild(div);
    });
}

window.startQuizCheck = function(catId) {
    // If we want to force login for quiz:
    // if(!currentUser) return showLogin();
    
    // For now, allow guests to take quiz as per "Initial view categories" request
    activeCategoryId = catId;
    startQuiz();
}

window.showAddCategoryModal = function() {
    document.getElementById('category-modal').classList.remove('hidden');
}

window.addCategory = function() {
    const name = document.getElementById('new-cat-name').value;
    const time = parseInt(document.getElementById('new-cat-time').value);

    if (!name) return alert('Ad daxil edin!');

    const newCat = {
        id: String(Date.now()),
        name,
        time: time || 45,
        questions: [],
        createdBy: currentUser.id
    };

    categories.push(newCat);
    saveCategories();
    closeModal('category-modal');
    renderAdminCategories(); // Update admin view
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

function loadQuestion() {
    const q = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    const cat = categories.find(c => c.id === currentQuiz.categoryId);
    
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

    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('feedback').classList.add('hidden');
    
    // Timer Reset
    clearInterval(currentQuiz.timer);
    currentQuiz.timeLeft = cat.time;
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
    clearInterval(currentQuiz.timer);
    const q = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    const options = document.querySelectorAll('.option-btn');
    
    // Disable all buttons
    options.forEach(btn => btn.classList.add('disabled'));

    if (selectedIndex === q.correctIndex) {
        if(selectedIndex !== -1) options[selectedIndex].classList.add('correct');
        currentQuiz.score++;
    } else {
        if (selectedIndex !== -1) options[selectedIndex].classList.add('wrong');
        options[q.correctIndex].classList.add('correct');
    }

    document.getElementById('next-btn').classList.remove('hidden');
}

function timeIsUp() {
    selectAnswer(-1); // -1 indicates no answer selected (wrong)
}

window.nextQuestion = function() {
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
    
    document.getElementById('score-text').textContent = `${correct}/${total}`;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('wrong-count').textContent = wrong;
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
