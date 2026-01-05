// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAak_eY0WNpY7cqAEuWEBG9wBDhg1NPw_0",
    authDomain: "imtahansistemi-17659.firebaseapp.com",
    projectId: "imtahansistemi-17659",
    storageBucket: "imtahansistemi-17659.appspot.com",
    messagingSenderId: "715396853166",
    appId: "1:715396853166:web:9829b853e5e572de4d2c3f"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// State
let currentUser = null;
let allNews = [];
let lastVisibleDoc = null; // For pagination
let isAllNewsPage = false;
let categories = ['Rəsmi Xəbərlər', 'Təlimlər', 'Müsabiqələr', 'Texnoloji Yeniliklər'];
let currentEditingId = null;

// Auth Listener
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                currentUser = { uid: user.uid, ...doc.data() };
            } else {
                currentUser = { uid: user.uid, email: user.email, role: 'user' };
            }
            updateUIForUser();
        }).catch(err => {
            console.error(err);
            currentUser = { uid: user.uid, email: user.email, role: 'user' };
            updateUIForUser();
        });
    } else {
        currentUser = null;
        updateUIForUser();
    }
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadNews();
    loadCategories();
    
    // Search Filter
    document.getElementById('newsSearch').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allNews.filter(n => n.title.toLowerCase().includes(term) || n.excerpt.toLowerCase().includes(term));
        renderNews(filtered);
    });
    
    // Category Filter
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        const cat = e.target.value;
        if (cat === 'all') {
            renderNews(allNews);
        } else {
            renderNews(allNews.filter(n => n.category === cat));
        }
    });
    
    // Sort Filter
    document.getElementById('sortFilter').addEventListener('change', (e) => {
        const sort = e.target.value;
        const sorted = [...allNews].sort((a, b) => {
            return sort === 'newest' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date);
        });
        renderNews(sorted);
    });
});

function updateUIForUser() {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const adminControls = document.getElementById('adminControls');

    if (currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            document.getElementById('user-name').textContent = currentUser.name || currentUser.email;
        }

        const isAdminOrMod = currentUser.role === 'admin' || currentUser.role === 'moderator';
        if (isAdminOrMod) {
            if (adminControls) adminControls.style.display = 'block';
        } else {
            if (adminControls) adminControls.style.display = 'none';
        }
    } else {
        if (authButtons) authButtons.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (adminControls) adminControls.style.display = 'none';
    }
    
    // Re-render to update edit/delete buttons
    if (allNews.length > 0) renderNews(allNews);
}

// Data Loading
async function loadNews() {
    try {
        // CACHE: 5 dəqiqəlik yaddaş (Read sayını azaltmaq üçün)
        const CACHE_KEY = 'news_list_cache';
        const cached = sessionStorage.getItem(CACHE_KEY);
        
        // Əgər cache varsa və 5 dəqiqə keçməyibsə, onu istifadə et
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
                console.log("Xəbərlər cache-dən yükləndi");
                allNews = parsed.data;
                renderNews(allNews);
                updateTicker(allNews);
                return; // Serverə sorğu göndərmə
            }
        }

        // OPTIMIZATION: Limit to latest 50 items to save Firestore reads
        // Previously it was loading ALL news (e.g. 1000 items = 1000 reads per page load)
        const snapshot = await db.collection('news').orderBy('date', 'desc').limit(50).get();
        allNews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Cache-ə yaz
        if (allNews.length > 0) {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: allNews
            }));
        }

        renderNews(allNews);
        updateTicker(allNews);
    } catch (error) {
        console.error("Error loading news:", error);
        if (error.code === 'permission-denied') {
            document.getElementById('newsGrid').innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-database fa-2x" style="color: var(--text-muted);"></i>
                    <p style="margin-top: 10px; color: var(--text-muted);">Xəbərləri yükləmək mümkün olmadı. (Database Permission Error)</p>
                    <p style="font-size: 0.9em; color: #666; margin-top:5px;">Firebase Qaydaları (Firestore Rules) oxumağa icazə vermir.</p>
                </div>
            `;
            document.getElementById('featuredContainer').innerHTML = ''; // Clear featured
        }
    }
}

async function loadCategories() {
    try {
        const doc = await db.collection('settings').doc('news_categories').get();
        if (doc.exists && doc.data().list) {
            categories = doc.data().list;
            renderCategoryOptions();
            renderCategoryList();
        }
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

function renderCategoryOptions() {
    const filter = document.getElementById('categoryFilter');
    const formSelect = document.getElementById('newsCategory');
    
    if (filter) {
        filter.innerHTML = '<option value="all">Bütün kateqoriyalar</option>';
        categories.forEach(cat => {
            filter.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }
    
    if (formSelect) {
        formSelect.innerHTML = '';
        categories.forEach(cat => {
            formSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }
}

// Rendering
function renderNews(list) {
    const grid = document.getElementById('newsGrid');
    const featuredContainer = document.getElementById('featuredContainer');
    
    if (!grid) return;
    grid.innerHTML = '';

    // If no featured news, pick the one with most views (or fallback to latest)
    let featured = list.find(n => n.isFeatured);
    if (!featured && list.length > 0) {
        // Find max views
        featured = list.reduce((prev, current) => ((prev.views || 0) > (current.views || 0)) ? prev : current);
    }

    if (featured && featuredContainer) {
        // Render Featured Hero
        featuredContainer.innerHTML = `
            <div class="featured-grid">
                <div class="featured-main" onclick="window.location.href='view.html?id=${featured.id}'" style="cursor: pointer;">
                    <img src="${featured.imageUrl || 'https://via.placeholder.com/800x500?text=No+Image'}" alt="${featured.title}">
                    <div class="featured-overlay">
                        <span class="featured-badge">${featured.category}</span>
                        <h2 class="featured-title">${featured.title}</h2>
                        <div class="featured-meta">
                            <span><i class="far fa-calendar"></i> ${formatDate(featured.date)}</span>
                            <span><i class="far fa-clock"></i> ${featured.readTime || 3} dəq</span>
                        </div>
                    </div>
                </div>
                <div class="featured-side">
                    <!-- Side cards will be populated from next 2 items -->
                </div>
            </div>
        `;
        
        // Add side items
        const sideItems = list.filter(n => n.id !== featured.id).slice(0, 2);
        const sideContainer = featuredContainer.querySelector('.featured-side');
        sideItems.forEach(item => {
            sideContainer.innerHTML += `
                <div class="side-card" onclick="window.location.href='view.html?id=${item.id}'" style="cursor: pointer;">
                    <img class="side-image" src="${item.imageUrl || 'https://via.placeholder.com/180x250?text=No+Image'}" alt="${item.title}">
                    <div class="side-content">
                        <span class="mini-cat">${item.category}</span>
                        <h3 class="side-title">${item.title}</h3>
                        <span class="mini-date">${formatDate(item.date)}</span>
                    </div>
                </div>
            `;
        });
    }

    // Render Grid (All items)
    list.forEach(item => {
        const isAdminOrMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="card-image-wrapper bg-gradient-${Math.floor(Math.random()*4)+1}">
                ${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fas fa-graduation-cap card-icon"></i>`}
                <span class="card-badge">${item.category}</span>
                ${isAdminOrMod ? `
                    <div style="position: absolute; top: 10px; right: 10px; z-index: 10; display: flex; gap: 5px;">
                        <button onclick="editNews('${item.id}')" style="background: white; border: none; padding: 6px; border-radius: 50%; cursor: pointer;"><i class="fas fa-edit text-primary"></i></button>
                        <button onclick="deleteNews('${item.id}')" style="background: white; border: none; padding: 6px; border-radius: 50%; cursor: pointer;"><i class="fas fa-trash text-red-500" style="color:red;"></i></button>
                        <button onclick="toggleFeatured('${item.id}', ${item.isFeatured || false})" style="background: white; border: none; padding: 6px; border-radius: 50%; cursor: pointer; color: ${item.isFeatured ? '#f59e0b' : '#ccc'};"><i class="fas fa-star"></i></button>
                    </div>
                ` : ''}
            </div>
            <div class="card-content">
                <div class="card-meta">
                    <div class="meta-item"><i class="far fa-calendar"></i> ${formatDate(item.date)}</div>
                    <div class="meta-item"><i class="far fa-clock"></i> ${item.readTime || 3} dəq</div>
                </div>
                <h3 class="card-title">${item.title}</h3>
                <p class="card-excerpt">${item.excerpt || ''}</p>
                <div class="card-footer">
                    <a href="view.html?id=${item.id}" class="read-more">Ətraflı oxu <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateTicker(list) {
    const container = document.getElementById('newsTickerContent');
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = '<span style="padding:0 20px;">Xəbər yoxdur.</span>';
        return;
    }

    // 1. Prepare items HTML
    const itemsHtml = list.slice(0, 10).map(n => `
        <a href="view.html?id=${n.id}" class="ticker-item">
            ${n.category ? `<span style="color:#f87171; font-weight:bold; margin-right:5px; font-size:0.85em;">[${n.category.toUpperCase()}]</span>` : ''}
            ${n.title}
        </a>
    `).join('');
    
    // 2. Double the content for seamless looping
    container.innerHTML = itemsHtml + itemsHtml; 
    
    // 3. Reset Styles for CSS Animation
    container.style.display = 'flex';
    container.style.width = 'max-content';
    container.style.animation = 'none'; // Reset trigger
    container.offsetHeight; // Trigger reflow
    container.style.animation = 'ticker-scroll 40s linear infinite';
    
    // 4. Remove any JS fallback logic if it exists (Clean slate)
    // No JS animation loop needed. CSS keyframes handle it.
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Modal Functions
window.openAddNewsModal = function() {
    currentEditingId = null;
    document.getElementById('modalTitle').textContent = 'Yeni Xəbər';
    document.getElementById('newsForm').reset();
    document.getElementById('richEditor').innerHTML = '';
    document.getElementById('newsId').value = '';
    updateImagePreview(); // Clear preview
    document.getElementById('newsModal').classList.add('active');
}

window.closeNewsModal = function() {
    document.getElementById('newsModal').classList.remove('active');
}

window.editNews = function(id) {
    const item = allNews.find(n => n.id === id);
    if (!item) return;
    
    currentEditingId = id;
    document.getElementById('modalTitle').textContent = 'Xəbəri Redaktə Et';
    document.getElementById('newsId').value = id;
    document.getElementById('newsTitle').value = item.title;
    document.getElementById('richEditor').innerHTML = item.content || '';
    document.getElementById('newsExcerpt').value = item.excerpt || '';
    document.getElementById('newsCategory').value = item.category;
    document.getElementById('newsReadTime').value = item.readTime || 3;
    document.getElementById('newsImage').value = item.imageUrl || '';
    document.getElementById('tagInput').value = ''; // Clear input
    
    // Tags
    // Not implemented fully in this reconstruction but structure is there
    
    updateImagePreview();
    document.getElementById('newsModal').classList.add('active');
}

window.deleteNews = async function(id) {
    if (!confirm('Bu xəbəri silmək istədiyinizə əminsiniz?')) return;
    try {
        await db.collection('news').doc(id).delete();
        // Cache təmizlə
        sessionStorage.removeItem('news_list_cache');
        sessionStorage.removeItem('trend_news_cache');
        loadNews(); // Reload
    } catch (e) {
        alert('Xəta: ' + e.message);
    }
}

window.toggleFeatured = async function(id, currentStatus) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        alert('Bu əməliyyat üçün admin və ya moderator olmalısınız.');
        return;
    }
    
    try {
        // Unfeature all others if we want single featured? 
        // For now just toggle this one.
        // Actually, let's reset others if we are setting to true, to have only one main featured
        if (!currentStatus) {
            const batch = db.batch();
            allNews.forEach(n => {
                if (n.isFeatured) {
                    batch.update(db.collection('news').doc(n.id), { isFeatured: false });
                }
            });
            await batch.commit();
        }
        
        await db.collection('news').doc(id).update({
            isFeatured: !currentStatus
        });
        
        // Cache təmizlə
        clearAllNewsCaches();
        
        loadNews();
    } catch (error) {
        alert('Xəta: ' + error.message);
    }
}

// Editor Functions
window.execCmd = function(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('richEditor').focus();
}

window.removeCoverImage = function() {
    document.getElementById('newsImage').value = '';
    document.getElementById('fileInput').value = ''; 
    updateImagePreview();
}

window.updateImagePreview = function() {
    const url = document.getElementById('newsImage').value;
    const preview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    
    // Clear previous img
    const existingImg = preview.querySelector('img');
    if (existingImg) existingImg.remove();
    
    if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.borderRadius = '12px';
        
        preview.appendChild(img);
        preview.querySelector('.image-preview-placeholder').style.opacity = '0';
        
        if (removeBtn) removeBtn.style.display = 'flex';
    } else {
        preview.querySelector('.image-preview-placeholder').style.opacity = '1';
        if (removeBtn) removeBtn.style.display = 'none';
    }
}

window.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (file) {
        // Şəkil sıxılma funksiyası (Max 800px, 0.7 keyfiyyət)
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Keyfiyyəti 0.7-yə salaraq base64 alırıq
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                
                // Firestore limiti yoxlanışı (təxminən 1MB)
                if (dataUrl.length > 1000000) {
                     alert("Şəkil sıxıldıqdan sonra da çox böyükdür. Daha kiçik şəkil seçin.");
                     return;
                }

                document.getElementById('newsImage').value = dataUrl;
                updateImagePreview();
            };
        };
        reader.readAsDataURL(file);
    }
}

window.handleEditorImageUpload = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.execCommand('insertImage', false, e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

// Form Submit
window.handleNewsSubmit = async function(event) {
    event.preventDefault();
    
    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('richEditor').innerHTML;
    const excerpt = document.getElementById('newsExcerpt').value;
    const category = document.getElementById('newsCategory').value;
    const readTime = document.getElementById('newsReadTime').value;
    const imageUrl = document.getElementById('newsImage').value;
    
    const newsData = {
        title,
        content,
        excerpt,
        category,
        readTime,
        imageUrl,
        date: new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'published', // default
        views: 0,
        isFeatured: false
    };
    
    try {
        if (currentEditingId) {
            delete newsData.date; // Don't overwrite create date
            delete newsData.views;
            delete newsData.isFeatured;
            await db.collection('news').doc(currentEditingId).update(newsData);
        } else {
            await db.collection('news').add(newsData);
        }
        
        // Cache təmizlə ki, yeni məlumat yüklənsin
        sessionStorage.removeItem('news_list_cache');
        sessionStorage.removeItem('trend_news_cache');

        closeNewsModal();
        loadNews();
    } catch (e) {
        alert('Xəta: ' + e.message);
    }
}

// Category Management
window.openCategoryModal = function() {
    renderCategoryList();
    document.getElementById('categoryManagerModal').classList.add('active');
}
window.closeCategoryModal = function() {
    document.getElementById('categoryManagerModal').classList.remove('active');
}

function renderCategoryList() {
    const list = document.getElementById('categoryList');
    if (!list) return;
    list.innerHTML = '';
    categories.forEach((cat, index) => {
        list.innerHTML += `
            <div class="cat-item">
                <span>${cat}</span>
                <div class="cat-actions">
                    <button class="delete" onclick="deleteCategory(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

window.addCategory = async function() {
    const input = document.getElementById('newCategoryInput');
    const val = input.value.trim();
    if (val && !categories.includes(val)) {
        categories.push(val);
        input.value = '';
        renderCategoryList();
        await saveCategories();
    }
}

window.deleteCategory = async function(index) {
    if (confirm('Silmək istədiyinizə əminsiniz?')) {
        categories.splice(index, 1);
        renderCategoryList();
        await saveCategories();
    }
}

async function saveCategories() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) return;
    try {
        await db.collection('settings').doc('news_categories').set({ list: categories });
        loadCategories(); // Reload to update selects
    } catch (e) {
        console.error(e);
    }
}

// Login (Simplified)
window.openLoginModal = () => document.getElementById('loginModal').classList.add('active');
window.closeLoginModal = () => document.getElementById('loginModal').classList.remove('active');
window.logout = () => auth.signOut().then(() => window.location.reload());
window.handleLogin = async (e) => {
    e.preventDefault();
    const loginInput = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    
    // Check if input is username or email
    let email = loginInput;
    if (!loginInput.includes('@')) {
        // Assume username, fetch email from Firestore users collection
        try {
            const userSnapshot = await db.collection('users').where('username', '==', loginInput).limit(1).get();
            if (!userSnapshot.empty) {
                email = userSnapshot.docs[0].data().email;
            }
        } catch (error) {
            console.error("Error fetching user by username:", error);
            // If permission denied, we can't lookup username. Warn user.
            if (error.code === 'permission-denied') {
                alert("İstifadəçi adı ilə giriş üçün sistem icazəsi yoxdur. Zəhmət olmasa email ünvanınızla daxil olun.");
                return;
            }
        }
    }

    auth.signInWithEmailAndPassword(email, pass).then(() => {
        closeLoginModal();
        // UI updates automatically via auth listener
    }).catch(err => alert(err.message));
}

// Color Palette Logic
window.toggleColorPalette = function() {
    const palette = document.getElementById('colorPalette');
    if (!palette) return;
    
    if (palette.classList.contains('active')) {
        palette.classList.remove('active');
    } else {
        palette.classList.add('active');
    }
}

// Close palette when clicking outside
document.addEventListener('click', function(e) {
    const palette = document.getElementById('colorPalette');
    const btn = e.target.closest('button[onclick="toggleColorPalette()"]');
    
    // Check if palette exists and is active
    if (palette && palette.classList.contains('active')) {
        // If click is not inside palette and not on the toggle button
        if (!palette.contains(e.target) && !btn) {
            palette.classList.remove('active');
        }
    }
});

// All News Page Logic
window.initializeAllNewsPage = function() {
    isAllNewsPage = true;
    lastVisibleDoc = null;
    const grid = document.getElementById('all-news-grid');
    if (grid) grid.innerHTML = '';
    loadMoreNews();
}

window.loadMoreNews = async function() {
    const btn = document.getElementById('load-more-btn');
    if (btn) {
        btn.textContent = 'Yüklənir...';
        btn.disabled = true;
    }

    try {
        let query = db.collection('news').orderBy('date', 'desc').limit(12);

        if (lastVisibleDoc) {
            query = query.startAfter(lastVisibleDoc);
        }

        const snapshot = await query.get();
        
        if (snapshot.empty) {
            if (btn) {
                btn.textContent = 'Başqa xəbər yoxdur';
                btn.disabled = true;
                // If it's the first load and empty
                if (!lastVisibleDoc) {
                     document.getElementById('all-news-grid').innerHTML = '<p style="text-align:center; grid-column:1/-1;">Hələ ki xəbər yoxdur.</p>';
                }
            }
            return;
        }

        lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderAllNewsGrid(newItems);

        if (snapshot.docs.length < 12) {
            if (btn) {
                btn.textContent = 'Son';
                btn.disabled = true;
            }
        } else {
            if (btn) {
                btn.textContent = 'Daha çox göstər';
                btn.disabled = false;
            }
        }

    } catch (error) {
        console.error("Error loading more news:", error);
        if (btn) btn.textContent = 'Xəta baş verdi';
    }
}

function renderAllNewsGrid(list) {
    const grid = document.getElementById('all-news-grid');
    if (!grid) return;

    list.forEach(item => {
        const isAdminOrMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="card-image-wrapper bg-gradient-${Math.floor(Math.random()*4)+1}">
                ${item.imageUrl ? `<img src="${item.imageUrl}" class="news-image">` : `<div style="height:200px; display:flex; align-items:center; justify-content:center; background:#eee;"><i class="fas fa-newspaper fa-3x" style="color:#ccc;"></i></div>`}
                <span class="card-badge" style="position:absolute; top:10px; left:10px; background:var(--primary); color:white; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600;">${item.category}</span>
            </div>
            <div class="news-content">
                <div class="news-meta">
                    <span><i class="far fa-calendar"></i> ${formatDate(item.date)}</span>
                    <span><i class="far fa-clock"></i> ${item.readTime || 3} dəq</span>
                </div>
                <h3 class="news-title">${item.title}</h3>
                <p class="news-excerpt">${item.excerpt || ''}</p>
                <div class="news-footer">
                    <a href="view.html?id=${item.id}" class="read-more" style="color:var(--primary); text-decoration:none; font-weight:600;">Ətraflı oxu <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function clearAllNewsCaches() {
    sessionStorage.removeItem('news_list_cache');
    sessionStorage.removeItem('trend_news_cache');
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('related_news_')) {
            sessionStorage.removeItem(key);
        }
    });
}
