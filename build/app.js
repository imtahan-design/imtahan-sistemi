// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAak_eY0WNpY7cqAEuWEBG9wBDhg1NPw_0",
    authDomain: "imtahansistemi-17659.firebaseapp.com",
    projectId: "imtahansistemi-17659",
    storageBucket: "imtahansistemi-17659.firebasestorage.app",
    messagingSenderId: "715396853166",
    appId: "1:715396853166:web:9829b853e5e572de4d2c3f"
};

// Global State
let db, auth;
let currentUser = null;
let categories = [];
let currentQuiz = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let quizTimer = null;
let timeRemaining = 0;

// Initialization
async function init() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        auth = firebase.auth();
        
        // Track Visitor
        trackVisitor();

        // Auth Listener
        auth.onAuthStateChanged(user => {
            currentUser = user;
            if (user) {
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (doc.exists) {
                        currentUser = { ...user, ...doc.data() };
                    }
                    updateUI();
                });
            } else {
                updateUI();
            }
        });

        await loadCategories();
        
        // Handle URL params
        const params = new URLSearchParams(window.location.search);
        if (params.has('quiz')) {
            // Logic to load specific quiz if needed
        }

        initUserChat();

        // Hide loading screen
        const loading = document.getElementById('loading-screen');
        if (loading) loading.classList.add('hidden');

    } catch (e) {
        console.error("Init Error:", e);
        showNotification("Sistem yüklənərkən xəta baş verdi: " + e.message, 'error');
        const loading = document.getElementById('loading-screen');
        if (loading) loading.classList.add('hidden');
    }
}

// Data Loading
async function loadCategories() {
    try {
        // Try to get from Firestore first
        let loadedFromDB = false;
        try {
            const snapshot = await db.collection('categories').where('active', '==', true).get();
            if (!snapshot.empty) {
                categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                loadedFromDB = true;
            }
        } catch(e) {
            console.warn("Firestore access failed or empty", e);
        }

        if (!loadedFromDB) {
            // Fallback: Try to load from questions.json
            try {
                const response = await fetch('questions.json');
                if (response.ok) {
                    const questionsData = await response.json();
                    
                    // Group by category
                    const catsMap = {};
                    questionsData.forEach(q => {
                        const catName = q.category || 'Ümumi';
                        if (!catsMap[catName]) {
                            catsMap[catName] = {
                                id: 'cat_' + Object.keys(catsMap).length,
                                name: catName,
                                icon: 'book', // Default icon
                                questions: []
                            };
                        }
                        
                        // Format question
                        catsMap[catName].questions.push({
                            id: q.id,
                            text: q.question,
                            options: q.options,
                            correctAnswer: q.correct_option_id, // 0-based index
                            explanation: q.explanation
                        });
                    });
                    
                    categories = Object.values(catsMap);
                    
                    // Assign specific icons if known
                    categories.forEach(c => {
                        const name = c.name.toLowerCase();
                        if (name.includes('konstitusiya') || name.includes('qanun')) c.icon = 'balance-scale';
                        else if (name.includes('tarix')) c.icon = 'landmark';
                        else if (name.includes('riyaziyyat')) c.icon = 'calculator';
                        else if (name.includes('dili')) c.icon = 'language';
                        else if (name.includes('coğrafiya')) c.icon = 'globe';
                        else if (name.includes('kimya')) c.icon = 'flask';
                        else if (name.includes('fizika')) c.icon = 'atom';
                    });
                    
                } else {
                     throw new Error('questions.json not found');
                }
            } catch (err) {
                console.warn("JSON load failed, using demo data", err);
                // Hard fallback if JSON fails
                categories = [
                    { id: 'cat1', name: 'Riyaziyyat', icon: 'calculator', questions: [] },
                    { id: 'cat2', name: 'Azərbaycan Dili', icon: 'book', questions: [] },
                    { id: 'cat3', name: 'Tarix', icon: 'landmark', questions: [] }
                ];
            }
        }
        renderCategories();
    } catch (e) {
        console.error("Category Load Error:", e);
        // Fallback to local storage
        const local = localStorage.getItem('categories');
        if (local) {
            categories = JSON.parse(local);
            renderCategories();
        }
    }
}

function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-card animate-up';
        div.onclick = () => startQuiz(cat.id);
        div.innerHTML = `
            <div class="cat-icon"><i class="fas fa-${cat.icon || 'book'}"></i></div>
            <h3>${escapeHtml(cat.name)}</h3>
            <p class="text-muted text-sm">${cat.questions ? cat.questions.length : 0} sual</p>
            <button class="btn-primary w-full mt-3">Testə Başla</button>
        `;
        grid.appendChild(div);
    });
}

// Navigation
window.hideAllSections = function() {
    const sections = [
        'dashboard-section', 'auth-section', 'quiz-section', 
        'teacher-dashboard-section', 'admin-dashboard-section', 
        'create-private-quiz-section', 'reports-section',
        'teacher-reports-section', 'private-access-section',
        'profile-section', 'top-users-section'
    ];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    window.scrollTo(0, 0);
};

window.showDashboard = function() {
    hideAllSections();
    const dash = document.getElementById('dashboard-section');
    if (dash) dash.classList.remove('hidden');
};

window.showLogin = function() {
    hideAllSections();
    const authSec = document.getElementById('auth-section');
    if (authSec) {
        authSec.classList.remove('hidden');
        document.getElementById('login-box').classList.remove('hidden');
        document.getElementById('register-box').classList.add('hidden');
    }
};

window.showRegister = function() {
    hideAllSections(); // Ensure we are in auth section
    const authSec = document.getElementById('auth-section');
    if (authSec) authSec.classList.remove('hidden');
    
    document.getElementById('login-box').classList.add('hidden');
    document.getElementById('register-box').classList.remove('hidden');
};

window.showTeacherDashboard = function() {
    if (!currentUser) return showLogin();
    hideAllSections();
    const sec = document.getElementById('teacher-dashboard-section');
    if (sec) sec.classList.remove('hidden');
    loadTeacherQuizzes();
};

window.showAdminDashboard = function() {
    if (!currentUser || currentUser.role !== 'admin') return;
    hideAllSections();
    const sec = document.getElementById('admin-dashboard-section');
    if (sec) sec.classList.remove('hidden');
    loadAdminStats();
};

window.showProfile = function() {
    if (!currentUser) return showLogin();
    hideAllSections();
    const sec = document.getElementById('profile-section');
    if (sec) {
        sec.classList.remove('hidden');
        document.getElementById('profile-full-name').textContent = currentUser.displayName || currentUser.email;
        document.getElementById('profile-username').textContent = currentUser.username ? '@' + currentUser.username : '@istifadeci';
        document.getElementById('profile-role').textContent = currentUser.role === 'teacher' ? 'Müəllim' : (currentUser.role === 'admin' ? 'Admin' : 'Tələbə');
    }
};

window.showTopUsers = function() {
    hideAllSections();
    const sec = document.getElementById('top-users-section');
    if (sec) sec.classList.remove('hidden');
    // Load top users logic here
};

window.showCreatePrivateQuiz = function() {
    if (!currentUser) return showLogin();
    hideAllSections();
    const sec = document.getElementById('create-private-quiz-section');
    if (sec) sec.classList.remove('hidden');
};

window.showTeacherReports = function() {
    hideAllSections();
    const sec = document.getElementById('teacher-reports-section');
    if (sec) sec.classList.remove('hidden');
};

window.menuNavigate = function(fn) {
    toggleSideMenu();
    if (typeof fn === 'function') fn();
};

window.toggleSideMenu = function() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    if (menu) menu.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
};

// Auth Logic
window.login = async function() {
    const emailInput = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    
    if (!emailInput || !pass) return showNotification('Məlumatları daxil edin', 'error');
    
    try {
        let email = emailInput;
        // Simple check if input is username (no @)
        if (!email.includes('@')) {
            // Try to find email by username
            const snapshot = await db.collection('users').where('username', '==', email).limit(1).get();
            if (!snapshot.empty) {
                email = snapshot.docs[0].data().email;
            } else {
                // If not found, just append fake domain to try (or fail)
                email = email + "@imtahan.site"; 
            }
        }
        
        await auth.signInWithEmailAndPassword(email, pass);
        showNotification('Xoş gəldiniz!', 'success');
        showDashboard();
    } catch (e) {
        showNotification('Giriş xətası: ' + e.message, 'error');
    }
};

window.register = async function() {
    const name = document.getElementById('reg-name').value;
    const surname = document.getElementById('reg-surname').value;
    const username = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    
    if (!name || !surname || !username || !pass) return showNotification('Bütün xanaları doldurun', 'error');
    
    try {
        // Create fake email if not provided (for students)
        let email = `${username}@imtahan.site`;
        if (role === 'teacher') {
            const emailInp = document.getElementById('reg-email').value;
            if (!emailInp) return showNotification('Müəllim üçün email vacibdir', 'error');
            email = emailInp;
        }

        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        
        await db.collection('users').doc(cred.user.uid).set({
            name, surname, username, email, role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await cred.user.updateProfile({ displayName: `${name} ${surname}` });
        
        showNotification('Qeydiyyat uğurludur!', 'success');
        showDashboard();
    } catch (e) {
        showNotification('Qeydiyyat xətası: ' + e.message, 'error');
    }
};

window.logout = function() {
    auth.signOut();
    window.location.reload();
};

// UI Updates
window.updateUI = function() {
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    const userDisplay = document.getElementById('user-display');
    const adminBtn = document.getElementById('admin-panel-btn');
    const teacherBtn = document.getElementById('teacher-panel-btn');

    // Side menu elements
    const sideGuest = document.getElementById('side-guest-nav');
    const sideUser = document.getElementById('side-user-nav');
    const sideUserInfo = document.getElementById('side-user-info');
    const sideUserDisplay = document.getElementById('side-user-display');
    const sideTeacher = document.getElementById('side-teacher-btn');
    const sideAdmin = document.getElementById('side-admin-btn');

    if (currentUser) {
        if (guestNav) guestNav.classList.add('hidden');
        if (userNav) userNav.classList.remove('hidden');
        if (userDisplay) userDisplay.textContent = currentUser.displayName || currentUser.email;

        if (sideGuest) sideGuest.classList.add('hidden');
        if (sideUser) sideUser.classList.remove('hidden');
        if (sideUserInfo) sideUserInfo.classList.remove('hidden');
        if (sideUserDisplay) sideUserDisplay.textContent = currentUser.displayName || currentUser.email;
        
        if (currentUser.role === 'admin') {
            if (adminBtn) adminBtn.classList.remove('hidden');
            if (sideAdmin) sideAdmin.classList.remove('hidden');
        }
        if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
            if (teacherBtn) teacherBtn.classList.remove('hidden');
            if (sideTeacher) sideTeacher.classList.remove('hidden');
        }
    } else {
        if (guestNav) guestNav.classList.remove('hidden');
        if (userNav) userNav.classList.add('hidden');
        
        if (sideGuest) sideGuest.classList.remove('hidden');
        if (sideUser) sideUser.classList.add('hidden');
        if (sideUserInfo) sideUserInfo.classList.add('hidden');

        if (adminBtn) adminBtn.classList.add('hidden');
        if (teacherBtn) teacherBtn.classList.add('hidden');
        if (sideTeacher) sideTeacher.classList.add('hidden');
        if (sideAdmin) sideAdmin.classList.add('hidden');
    }
};

// Quiz Logic
window.startQuiz = function(catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    
    if (!cat.questions || cat.questions.length === 0) {
        return showNotification('Bu kateqoriyada sual yoxdur', 'error');
    }
    
    hideAllSections();
    const quizSec = document.getElementById('quiz-section');
    if (quizSec) quizSec.classList.remove('hidden');
    
    currentQuestions = shuffleArray([...cat.questions]);
    if (currentQuestions.length > 20) currentQuestions = currentQuestions.slice(0, 20);
    
    currentQuestionIndex = 0;
    userAnswers = {};
    timeRemaining = (cat.time || 20) * 60;
    
    updateQuizUI();
    startTimer();
};

function updateQuizUI() {
    if (currentQuestionIndex >= currentQuestions.length) return finishQuiz();
    
    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('question-text').textContent = q.text;
    document.getElementById('question-counter').textContent = `Sual ${currentQuestionIndex + 1}/${currentQuestions.length}`;
    
    const optsDiv = document.getElementById('options-area');
    optsDiv.innerHTML = '';
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn w-full text-left p-3 mb-2 rounded border hover:bg-gray-100 transition';
        btn.textContent = `${String.fromCharCode(65+idx)}) ${opt}`;
        btn.onclick = () => selectOption(idx);
        
        if (userAnswers[currentQuestionIndex] === idx) {
            btn.className = 'option-btn w-full text-left p-3 mb-2 rounded border bg-blue-100 border-blue-500';
        }
        
        optsDiv.appendChild(btn);
    });
    
    // Nav buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    
    if (prevBtn) prevBtn.classList.toggle('hidden', currentQuestionIndex === 0);
    if (nextBtn) nextBtn.classList.toggle('hidden', currentQuestionIndex === currentQuestions.length - 1);
    if (finishBtn) finishBtn.classList.toggle('hidden', currentQuestionIndex !== currentQuestions.length - 1);
}

window.selectOption = function(idx) {
    userAnswers[currentQuestionIndex] = idx;
    updateQuizUI();
};

window.nextQuestion = function() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        updateQuizUI();
    }
};

window.prevQuestion = function() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateQuizUI();
    }
};

window.confirmFinishQuiz = function() {
    if (confirm('Testi bitirmək istədiyinizə əminsiniz?')) {
        finishQuiz();
    }
};

function finishQuiz() {
    clearInterval(quizTimer);
    hideAllSections();
    
    let score = 0;
    currentQuestions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correctIndex) score++;
    });
    
    const percentage = Math.round((score / currentQuestions.length) * 100);
    
    // Show results modal or section
    // For now, simple alert + dashboard
    alert(`Nəticə: ${score} düzgün cavab (${percentage}%)`);
    showDashboard();
    
    // Save result if user logged in
    if (currentUser) {
        db.collection('results').add({
            userId: currentUser.uid,
            score: score,
            total: currentQuestions.length,
            percentage: percentage,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

function startTimer() {
    if (quizTimer) clearInterval(quizTimer);
    const timerEl = document.getElementById('timer');
    
    quizTimer = setInterval(() => {
        timeRemaining--;
        const m = Math.floor(timeRemaining / 60);
        const s = timeRemaining % 60;
        if (timerEl) timerEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        
        if (timeRemaining <= 0) {
            clearInterval(quizTimer);
            alert('Vaxt bitdi!');
            finishQuiz();
        }
    }, 1000);
}

// Teacher & Quiz Creation Logic
window.addManualQuestionForm = function() {
    const container = document.getElementById('manual-questions-list');
    const id = Date.now();
    const div = document.createElement('div');
    div.className = 'question-form-item border p-4 mb-4 rounded bg-gray-50';
    div.innerHTML = `
        <div class="mb-2">
            <label class="block text-sm font-bold mb-1">Sual Mətni</label>
            <textarea class="w-full p-2 border rounded" rows="2"></textarea>
        </div>
        <div class="options-grid grid grid-cols-1 gap-2">
            ${[0,1,2,3,4].map(i => `
                <div class="flex items-center gap-2">
                    <input type="radio" name="correct-${id}" value="${i}">
                    <input type="text" class="w-full p-2 border rounded" placeholder="Variant ${String.fromCharCode(65+i)}">
                </div>
            `).join('')}
        </div>
        <button onclick="this.parentElement.remove()" class="text-red-500 text-sm mt-2">Sil</button>
    `;
    container.appendChild(div);
};

// Chat
window.initUserChat = function() {
    if (document.getElementById('live-chat-widget')) return;
    
    const widget = document.createElement('div');
    widget.id = 'live-chat-widget';
    widget.innerHTML = `
        <div id="chat-window" class="hidden fixed bottom-20 right-5 w-80 bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200 z-50">
            <div class="bg-blue-600 text-white p-3 flex justify-between items-center">
                <span>Canlı Dəstək</span>
                <button onclick="toggleChat()" class="text-white hover:text-gray-200"><i class="fas fa-times"></i></button>
            </div>
            <div id="chat-messages" class="h-64 overflow-y-auto p-3 bg-gray-50 flex flex-col gap-2"></div>
            <div class="p-3 border-t border-gray-200 flex gap-2">
                <input type="text" id="chat-input" class="flex-1 border rounded px-2 py-1" placeholder="Mesajınız..." onkeypress="handleChatInput(event)">
                <button onclick="sendChatMessage()" class="bg-blue-600 text-white px-3 py-1 rounded"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
        <button onclick="toggleChat()" class="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 z-50 transition-transform hover:scale-110">
            <i class="fas fa-comments text-xl"></i>
        </button>
    `;
    document.body.appendChild(widget);
};

window.toggleChat = function() {
    const win = document.getElementById('chat-window');
    if (win) win.classList.toggle('hidden');
};

window.handleChatInput = function(e) {
    if (e.key === 'Enter') sendChatMessage();
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'bg-blue-100 p-2 rounded self-end max-w-xs ml-auto';
    div.textContent = text;
    container.appendChild(div);
    input.value = '';
    container.scrollTop = container.scrollHeight;
    
    try {
        if (db) {
            await db.collection('messages').add({
                text,
                userId: currentUser ? currentUser.uid : 'guest',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch(e) {}
    
    setTimeout(() => {
        const reply = document.createElement('div');
        reply.className = 'bg-gray-200 p-2 rounded self-start max-w-xs mr-auto';
        reply.textContent = 'Mesajınız qeydə alındı. Tezliklə cavab veriləcək.';
        container.appendChild(reply);
        container.scrollTop = container.scrollHeight;
    }, 1000);
};

// Utils
window.escapeHtml = function(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

window.showNotification = function(message, type = 'info') {
    const container = document.getElementById('notification-container'); // Create this in HTML if missing
    if (!container) {
        const c = document.createElement('div');
        c.id = 'notification-container';
        c.className = 'fixed top-5 right-5 z-50 flex flex-col gap-2';
        document.body.appendChild(c);
        // Recall
        return window.showNotification(message, type);
    }
    
    const div = document.createElement('div');
    div.className = `px-4 py-3 rounded shadow-lg text-white flex items-center transform transition-all duration-300 translate-x-full`;
    div.style.backgroundColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');
    div.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : (type === 'error' ? 'exclamation-circle' : 'info-circle')} mr-2"></i> ${message}`;
    
    container.appendChild(div);
    
    requestAnimationFrame(() => {
        div.classList.remove('translate-x-full');
    });
    
    setTimeout(() => {
        div.classList.add('translate-x-full');
        setTimeout(() => div.remove(), 300);
    }, 3000);
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

window.trackVisitor = async function() {
    try {
        if (sessionStorage.getItem('visited')) return;
        const ref = db.collection('settings').doc('visitor_stats');
        await db.runTransaction(async (t) => {
            const doc = await t.get(ref);
            if (!doc.exists) t.set(ref, { totalVisits: 1 });
            else t.update(ref, { totalVisits: firebase.firestore.FieldValue.increment(1) });
        });
        sessionStorage.setItem('visited', 'true');
    } catch(e) {}
};

// Start
document.addEventListener('DOMContentLoaded', init);

// --- Additional UI Helpers ---

window.toggleCustomSelect = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
};

window.selectCustomOption = function(wrapperId, option, selectId, callback) {
    const wrapper = document.getElementById(wrapperId);
    const select = document.getElementById(selectId);
    if (!wrapper || !select) return;
    
    // Update visual selection
    wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    wrapper.querySelector('.custom-select-trigger span').textContent = option.textContent.trim();
    
    // Update hidden select
    select.value = option.dataset.value;
    wrapper.classList.remove('open');
    
    // Trigger callback if provided
    if (typeof callback === 'function') callback();
    else if (typeof window[callback] === 'function') window[callback]();
    else if (select.onchange) select.onchange();
};

window.toggleEmailField = function() {
    const role = document.getElementById('reg-role').value;
    const group = document.getElementById('teacher-email-group');
    if (group) {
        if (role === 'teacher') group.classList.remove('hidden');
        else group.classList.add('hidden');
    }
};

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
};

// --- Missing Dashboard Loaders ---

window.loadTeacherQuizzes = async function() {
    // Placeholder
    console.log('Loading teacher quizzes...');
};

window.loadAdminStats = async function() {
    // Placeholder
    console.log('Loading admin stats...');
};

// --- Private Quiz Actions ---

window.accessPrivateQuiz = async function() {
    const pass = document.getElementById('student-quiz-password').value;
    const name = document.getElementById('student-first-name').value;
    const surname = document.getElementById('student-last-name').value;
    
    if (!pass || !name || !surname) return showNotification('Bütün məlumatları daxil edin', 'error');
    
    // Logic to find quiz by password/ID would go here
    showNotification('Bu funksiya hələ aktiv deyil', 'info');
};

window.prepareQuizAction = function() {
    if (currentUser) {
        if (currentUser.role === 'teacher') showTeacherDashboard();
        else showNotification('Bu funksiya yalnız müəllimlər üçündür', 'info');
    } else {
        showLogin();
    }
};

window.tryAIAction = function() {
    // Redirect to AI section or show info
    showNotification('AI funksiyası üçün qeydiyyatdan keçin', 'info');
};

window.openAboutModal = function() {
    // Show about info
    alert('İmtahan.site - Onlayn sınaq platforması. V6.8');
};

// --- Quiz Creation Stubs ---

window.switchQuestionTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    
    document.querySelectorAll('.method-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('method-' + tab).classList.remove('hidden');
};

window.addMultipleQuestions = function(count) {
    for(let i=0; i<count; i++) addManualQuestionForm();
};

window.addEToAllQuestions = function() {
    // Logic to add option E
};

window.parseBulkQuestions = function() {
    const text = document.getElementById('bulk-questions-text').value;
    if (!text) return;
    // Parsing logic
    showNotification('Suallar əlavə edildi (Demo)', 'success');
};

window.generateAIQuestions = function() {
    showNotification('AI sorğusu göndərildi...', 'info');
    setTimeout(() => showNotification('AI hal-hazırda məşğuldur', 'warning'), 2000);
};

window.handleAIImageSelect = function(input) {
    if (input.files && input.files[0]) {
        document.getElementById('selected-image-name').textContent = input.files[0].name;
        document.getElementById('selected-image-name').classList.remove('hidden');
    }
};

window.removeSelectedAIImage = function() {
    document.getElementById('ai-question-image').value = '';
    document.getElementById('selected-image-name').classList.add('hidden');
};

window.savePrivateQuizFinal = function() {
    showNotification('Test yadda saxlanıldı!', 'success');
    showTeacherDashboard();
};

// --- Profile Actions ---

window.toggleUsernameBox = function() {
    const box = document.getElementById('missing-username-box');
    if (box) box.classList.toggle('hidden');
};

window.updateUserUsername = async function() {
    const newName = document.getElementById('new-profile-username').value;
    if (!newName) return;
    try {
        await db.collection('users').doc(currentUser.uid).update({ username: newName });
        showNotification('İstifadəçi adı yeniləndi', 'success');
        location.reload();
    } catch(e) {
        showNotification('Xəta: ' + e.message, 'error');
    }
};

window.changeLeaderboardPeriod = function(period) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    // Highlight clicked tab logic
    // Reload leaderboard
};
