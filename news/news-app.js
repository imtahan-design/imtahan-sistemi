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
let categories = []; // Dynamic categories
let selectedFile = null;

// DOM Elements
const newsGrid = document.getElementById('newsGrid');
const featuredContainer = document.getElementById('featuredContainer'); // New container
const adminControls = document.getElementById('adminControls');
const newsModal = document.getElementById('newsModal');
const categoryManagerModal = document.getElementById('categoryManagerModal');
const newsForm = document.getElementById('newsForm');
const searchInput = document.getElementById('newsSearch');
const categoryFilter = document.getElementById('categoryFilter');
const sortFilter = document.getElementById('sortFilter');
const readModal = document.getElementById('readModal');
const loginModal = document.getElementById('loginModal');
const authButtons = document.getElementById('auth-buttons');
const userInfo = document.getElementById('user-info');
const userNameDisplay = document.getElementById('user-name');
let currentTags = [];

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
    loadCategories(); // Load categories first
    loadNews();
    setupEventListeners();
    addStyles();
    gateNewsAccess();
});

// Category Management
async function loadCategories() {
    try {
        const doc = await db.collection('settings').doc('news_categories').get();
        if (doc.exists && doc.data().list) {
            categories = doc.data().list;
        } else {
            // Default categories
            categories = ['rəsmi', 'təlim', 'müsabiqə', 'yenilik'];
        }
        renderCategoryOptions();
    } catch (e) {
        console.warn("Categories load error, using defaults", e);
        categories = ['rəsmi', 'təlim', 'müsabiqə', 'yenilik'];
        renderCategoryOptions();
    }
}

async function saveCategories() {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
        await db.collection('settings').doc('news_categories').set({ list: categories });
        renderCategoryOptions();
        alert('Kateqoriyalar yeniləndi!');
    } catch (e) {
        console.error("Save categories error", e);
        alert('Xəta: ' + e.message);
    }
}

function renderCategoryOptions() {
    // 1. Filter Dropdown
    const filterSelect = document.getElementById('categoryFilter');
    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">Bütün kateqoriyalar</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = capitalize(cat);
        filterSelect.appendChild(opt);
    });
    filterSelect.value = currentFilter;

    // 2. Add/Edit News Dropdown
    const formSelect = document.getElementById('newsCategory');
    if (formSelect) {
        const currentVal = formSelect.value;
        formSelect.innerHTML = '';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = capitalize(cat);
            formSelect.appendChild(opt);
        });
        if (currentVal && categories.includes(currentVal)) {
            formSelect.value = currentVal;
        }
    }
}

window.openCategoryModal = function() {
    categoryManagerModal.classList.add('active');
    renderCategoryList();
}

window.closeCategoryModal = function() {
    categoryManagerModal.classList.remove('active');
}

function renderCategoryList() {
    const list = document.getElementById('categoryList');
    list.innerHTML = '';
    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'cat-item';
        item.innerHTML = `
            <span>${capitalize(cat)}</span>
            <div class="cat-actions">
                <button class="delete" onclick="deleteCategory('${cat}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.addCategory = async function() {
    const input = document.getElementById('newCategoryInput');
    const val = input.value.trim().toLowerCase();
    if (!val) return;
    
    if (categories.includes(val)) {
        alert('Bu kateqoriya artıq mövcuddur!');
        return;
    }
    
    categories.push(val);
    input.value = '';
    renderCategoryList();
    await saveCategories();
}

window.deleteCategory = async function(cat) {
    if (!confirm(`"${capitalize(cat)}" kateqoriyasını silmək istədiyinizə əminsiniz?`)) return;
    categories = categories.filter(c => c !== cat);
    renderCategoryList();
    await saveCategories();
}

// CMS Logic
window.execCmd = function(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('richEditor').focus();
}

window.setStatus = function(status) {
    document.getElementById('newsStatus').value = status;
    const btnPub = document.getElementById('btnPublish');
    const btnDraft = document.getElementById('btnDraft');
    
    if (status === 'published') {
        btnPub.classList.add('active-published');
        btnDraft.classList.remove('active-draft');
    } else {
        btnPub.classList.remove('active-published');
        btnDraft.classList.add('active-draft');
    }
}

window.updateImagePreview = function() {
    const url = document.getElementById('newsImage').value;
    const preview = document.getElementById('imagePreview');
    
    // If a file is selected, show local preview
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="object-fit: cover;">`;
        }
        reader.readAsDataURL(selectedFile);
        return;
    }

    if (url) {
        preview.innerHTML = `<img src="${url}" onerror="this.src='https://via.placeholder.com/300?text=Xəta'">`;
    } else {
        preview.innerHTML = `
            <div class="image-preview-placeholder">
                <i class="fas fa-image" style="font-size: 2rem;"></i>
                <span>Şəkil yoxdur</span>
            </div>
        `;
    }
}

window.handleFileSelect = function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Fayl ölçüsü çox böyükdür (Max 5MB)');
            e.target.value = '';
            return;
        }
        selectedFile = file;
        // Clear URL input when file is selected
        document.getElementById('newsImage').value = ''; 
        updateImagePreview();
    }
}

window.handleEditorImageUpload = async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('Fayl ölçüsü çox böyükdür (Max 5MB)');
        e.target.value = '';
        return;
    }

    // Show loading state in editor
    const editor = document.getElementById('richEditor');
    const loadingId = 'loading-' + Date.now();
    const loadingHtml = `<div id="${loadingId}" style="display:inline-block; padding:10px; background:#f3f4f6; border-radius:8px;">
        <i class="fas fa-spinner fa-spin"></i> Şəkil yüklənir...
    </div>`;
    
    // Insert loading placeholder at cursor position
    editor.focus();
    document.execCommand('insertHTML', false, loadingHtml);

    try {
        const storageRef = storage.ref();
        const fileName = `news_content/${Date.now()}_${file.name}`;
        const fileRef = storageRef.child(fileName);
        await fileRef.put(file);
        const url = await fileRef.getDownloadURL();

        // Replace loading placeholder with image
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.outerHTML = `<img src="${url}" style="max-width:100%; border-radius:8px; margin: 10px 0;">`;
        } else {
            // Fallback if placeholder lost
            document.execCommand('insertImage', false, url);
        }
    } catch (error) {
        console.error("Editor image upload error:", error);
        alert('Şəkil yüklənərkən xəta baş verdi');
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
    } finally {
        e.target.value = ''; // Reset input
    }
}

window.handleTagInput = function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = e.target.value.trim();
        if (val && !currentTags.includes(val)) {
            currentTags.push(val);
            renderTags();
            e.target.value = '';
        }
    }
}

window.removeTag = function(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    renderTags();
}

function renderTags() {
    const container = document.getElementById('tagContainer');
    // Clear chips but keep input
    const input = document.getElementById('tagInput');
    container.innerHTML = '';
    
    currentTags.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `${tag} <i class="fas fa-times" onclick="removeTag('${tag}')"></i>`;
        container.appendChild(chip);
    });
    container.appendChild(input);
    input.focus();
}

// Auth Setup
function setupAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Get user role from Firestore
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    currentUser = { id: user.uid, ...doc.data() };
                    updateNavUI(true);
                    checkAdmin();
                    gateNewsAccess();
                } else {
                    // Fallback if user exists in Auth but not in DB (shouldn't happen often)
                    currentUser = { id: user.uid, email: user.email, role: 'student' };
                    updateNavUI(true);
                    checkAdmin();
                    gateNewsAccess();
                }
            }).catch(e => {
                console.error("User fetch error", e);
                currentUser = { id: user.uid, email: user.email, role: 'student' };
                updateNavUI(true);
                gateNewsAccess();
            });
        } else {
            currentUser = null;
            updateNavUI(false);
            checkAdmin();
            gateNewsAccess();
        }
    });
}

function updateNavUI(isLoggedIn) {
    if (isLoggedIn && currentUser) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        userNameDisplay.textContent = currentUser.username || currentUser.email.split('@')[0];
    } else {
        authButtons.style.display = 'block';
        userInfo.style.display = 'none';
        userNameDisplay.textContent = '';
    }
}

function checkAdmin() {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
        adminControls.style.display = 'block';
    } else {
        adminControls.style.display = 'none';
    }
    // Re-render to show/hide edit/delete buttons
    renderNews(allNews);
}

function gateNewsAccess() {
    const overlay = document.getElementById('newsAccessOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
}

// Load News
async function loadNews() {
    // Show initial data immediately (Optimistic UI)
    allNews = getInitialData();
    allNews = mergeLocalNewsIntoAll(allNews);
    renderNews(allNews);

    try {
        const isPrivileged = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
        let query = db.collection('news');
        if (!isPrivileged) {
            query = query.where('status', '==', 'published');
        }
        let snapshot;
        try {
            snapshot = await query.orderBy('date', 'desc').get();
        } catch (e) {
            console.warn("Index missing for query; falling back without orderBy:", e);
            snapshot = await query.get();
        }
        
        if (snapshot.empty) {
            console.log("Database empty, using initial data...");
            // Auto-seed database so it's not empty next time
            seedDatabase(allNews);
        } else {
            const dbNews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Client-side sort just in case the db sort failed
            dbNews.sort((a, b) => new Date(b.date) - new Date(a.date));
            allNews = mergeLocalNewsIntoAll(dbNews);
            renderNews(allNews);
        }
    } catch (error) {
        console.warn("Error loading news:", error);
    }
}

async function seedDatabase(data) {
    try {
        const batch = db.batch();
        data.forEach(item => {
            // Remove ID as it will be auto-generated or we use the specific ID
            // Here we use the ID from initial data to avoid duplicates if run multiple times
            const docRef = db.collection('news').doc(item.id);
            const { id, ...itemData } = item; // exclude ID from data
            itemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            itemData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            batch.set(docRef, itemData);
        });
        await batch.commit();
        console.log("Database seeded successfully");
    } catch (e) {
        console.error("Error seeding database:", e);
    }
}

function getInitialData() {
    return [
        {
            id: '1',
            title: 'Yeni Tədris Proqramı Təsdiqləndi',
            excerpt: 'Təhsil Nazirliyi tərəfindən təsdiqlənmiş yeni kurikulum standartları və rəqəmsal qiymətləndirmə metodları haqqında ətraflı məlumat.',
            content: 'Tam mətn buradadır...',
            category: 'rəsmi',
            date: '2026-01-05',
            readTime: 3,
            status: 'published',
            gradient: 'bg-gradient-1',
            icon: 'fa-file-signature'
        },
        {
            id: '2',
            title: 'Müəllimlər üçün Rəqəmsal Təlimlər',
            excerpt: 'Onlayn platformalardan istifadə və AI alətlərinin tədrisdə tətbiqi mövzusunda ödənişsiz vebinarlar silsiləsi başlayır.',
            content: 'Tam mətn...',
            category: 'təlim',
            date: '2026-01-03',
            readTime: 5,
            status: 'published',
            gradient: 'bg-gradient-2',
            icon: 'fa-chalkboard-teacher'
        },
        {
            id: '3',
            title: '"Gələcəyin Alimləri" Müsabiqəsi',
            excerpt: 'Şagirdlər arasında keçirilən respublika fənn olimpiadasının qeydiyyat mərhələsi başladı. Qaliblərə xüsusi mükafatlar var.',
            content: 'Tam mətn...',
            category: 'müsabiqə',
            date: '2025-12-29',
            readTime: 4,
            status: 'published',
            gradient: 'bg-gradient-3',
            icon: 'fa-trophy'
        },
        {
            id: '4',
            title: 'Süni İntellektlə Sual Hazırlanması',
            excerpt: 'Artıq müəllimlər bir kliklə test sualları hazırlaya biləcəklər. Yeni AI modulunun tədrisə tətbiqi.',
            content: 'Tam mətn...',
            category: 'yenilik',
            date: '2026-01-01',
            readTime: 6,
            status: 'published',
            gradient: 'bg-gradient-4',
            icon: 'fa-robot'
        }
    ];
}

// Render News
function renderNews(news) {
    const isFiltered = searchInput.value.trim() !== '' || categoryFilter.value !== 'all';
    const canSeeDrafts = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
    
    // Filter visible items
    const visibleNews = news.filter(item => item.status !== 'draft' || canSeeDrafts);

    if (visibleNews.length === 0) {
        featuredContainer.innerHTML = '';
        featuredContainer.style.display = 'none';
        newsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">
              <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
              <h3>Nəticə tapılmadı</h3>
              <p>Axtarış sorğunuza uyğun xəbər yoxdur.</p>
            </div>
        `;
        return;
    }

    // Logic for Featured vs Grid
    let gridItems = visibleNews;
    
    // Only show Featured section if not filtering and we have enough items
    if (!isFiltered && visibleNews.length > 0) {
        featuredContainer.style.display = 'block';
        
        // Take top 3 for featured (1 main + 2 side)
        const featuredCount = window.innerWidth > 900 ? 3 : 1;
        const featuredItems = visibleNews.slice(0, featuredCount);
        gridItems = visibleNews.slice(featuredCount);

        renderFeaturedSection(featuredItems);
    } else {
        featuredContainer.style.display = 'none';
        featuredContainer.innerHTML = '';
    }

    // Render Grid
    newsGrid.innerHTML = '';
    gridItems.forEach((item, index) => {
        const card = createNewsCard(item, index);
        newsGrid.appendChild(card);
    });
    
    // Render Ticker
    renderTicker(visibleNews);
}

function renderTicker(news) {
    const tickerContent = document.getElementById('newsTickerContent');
    if (!tickerContent) return;

    if (news.length === 0) {
        tickerContent.innerHTML = '';
        return;
    }

    // Duplicate items to ensure smooth infinite scrolling if few items
    let itemsToRender = news.slice(0, 10); // Take top 10
    if (itemsToRender.length < 5) {
        itemsToRender = [...itemsToRender, ...itemsToRender, ...itemsToRender];
    }

    tickerContent.innerHTML = itemsToRender.map(item => `
        <a href="view.html?id=${item.id}" class="ticker-item">
            ${item.category ? `<span style="color:var(--secondary); font-weight:bold; margin-right:5px;">[${item.category.toUpperCase()}]</span>` : ''}
            ${escapeHtml(item.title)}
        </a>
    `).join('');
}

function renderFeaturedSection(items) {
    if (items.length === 0) return;

    const main = items[0];
    const sides = items.slice(1);
    
    let sideHtml = '';
    sides.forEach(item => {
        sideHtml += `
            <div class="side-card" style="cursor: pointer;" onclick="window.location.href='view.html?id=${item.id}'">
                <img src="${item.imageUrl || 'https://via.placeholder.com/150'}" class="side-image" onerror="this.src='https://via.placeholder.com/150'">
                <div class="side-content">
                    <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600; text-transform: uppercase;">${item.category}</span>
                    <h4 class="side-title">${escapeHtml(item.title)}</h4>
                    <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="far fa-clock"></i> ${item.readTime} dəq</span>
                </div>
            </div>
        `;
    });

    const mainImage = main.imageUrl || 'https://via.placeholder.com/800x500';
    
    featuredContainer.innerHTML = `
        <div class="featured-grid">
            <div class="featured-main" style="cursor: pointer;" onclick="window.location.href='view.html?id=${main.id}'">
                <img src="${mainImage}" onerror="this.parentElement.style.background = 'var(--gradient-1)'">
                <div class="featured-overlay">
                    <span class="featured-badge">${capitalize(main.category)}</span>
                    <h2 class="featured-title">${escapeHtml(main.title)}</h2>
                    <div class="featured-meta">
                        <span><i class="far fa-calendar"></i> ${formatDate(main.date)}</span>
                        <span><i class="far fa-clock"></i> ${main.readTime} dəq oxuma</span>
                    </div>
                </div>
            </div>
            ${sides.length > 0 ? `<div class="featured-side">${sideHtml}</div>` : ''}
        </div>
    `;
}

function createNewsCard(item, index) {
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
    let gradient = item.gradient || 'bg-gradient-1';
    let icon = item.icon || 'fa-newspaper';
    let badgeColor = 'var(--primary)';

    // Use custom image if available
    let imageHtml = '';
    if (item.imageUrl) {
        imageHtml = `<img src="${item.imageUrl}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.classList.add('${gradient}')">`;
    } else {
        if (!item.gradient) {
            switch(item.category) {
                case 'təlim': gradient = 'bg-gradient-2'; icon = 'fa-chalkboard-teacher'; badgeColor = '#0ea5e9'; break;
                case 'müsabiqə': gradient = 'bg-gradient-3'; icon = 'fa-trophy'; badgeColor = '#f59e0b'; break;
                case 'yenilik': gradient = 'bg-gradient-4'; icon = 'fa-robot'; badgeColor = '#ec4899'; break;
            }
        }
        imageHtml = `<i class="fas ${icon} card-icon"></i>`;
    }
    
    let tagsHtml = '';
    if (item.tags && item.tags.length > 0) {
        tagsHtml = `<div style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap;">
            ${item.tags.map(t => `<span style="background:#f3f4f6; padding:2px 8px; border-radius:100px; font-size:0.75rem; color:#6b7280;">#${t}</span>`).join('')}
        </div>`;
    }

    const card = document.createElement('article');
    card.className = 'news-card';
    if (item.status === 'draft') card.style.border = '2px dashed #9ca3af';
    card.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.1}s`;
    
    card.innerHTML = `
        <div class="card-image-wrapper ${!item.imageUrl ? gradient : ''}" style="position:relative; cursor: pointer;" onclick="window.location.href='view.html?id=${item.id}'">
            ${item.imageUrl ? imageHtml : `<span class="card-badge" style="color: ${badgeColor}">${capitalize(item.category)}</span>${imageHtml}`}
            ${item.status === 'draft' ? '<span style="position:absolute; bottom:10px; right:10px; background:#374151; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem; z-index:10;">QARALAMA</span>' : ''}
            ${!item.imageUrl ? `<span class="card-badge" style="color: ${badgeColor}">${capitalize(item.category)}</span>` : `<span class="card-badge" style="color: ${badgeColor}; background:rgba(255,255,255,0.9);">${capitalize(item.category)}</span>`}
            
            ${isAdmin ? `
                <div style="position: absolute; top: 10px; right: 10px; z-index: 10;" onclick="event.stopPropagation()">
                    <button onclick="editNews('${item.id}')" style="background: white; border: none; padding: 8px; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-right: 5px;">
                        <i class="fas fa-edit" style="color: var(--primary);"></i>
                    </button>
                    <button onclick="deleteNews('${item.id}')" style="background: white; border: none; padding: 8px; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <i class="fas fa-trash" style="color: #ef4444;"></i>
                    </button>
                </div>
            ` : ''}
        </div>
        <div class="card-content" style="cursor: pointer;" onclick="window.location.href='view.html?id=${item.id}'">
            <div class="card-meta">
                <div class="meta-item"><i class="far fa-calendar"></i> ${formatDate(item.date)}</div>
                <div class="meta-item"><i class="far fa-clock"></i> ${item.readTime} dəq</div>
            </div>
            <h3 class="card-title">${escapeHtml(item.title)}</h3>
            <p class="card-excerpt">${escapeHtml(item.excerpt)}</p>
            ${tagsHtml}
            <div class="card-footer" onclick="event.stopPropagation()">
                <a href="view.html?id=${item.id}" class="read-more">Davamını oxu <i class="fas fa-arrow-right"></i></a>
                <div class="card-actions">
                    <button title="Bəyən" onclick="toggleLike(this)"><i class="far fa-heart"></i></button>
                    <button title="Paylaş" onclick="shareNews(this, '${escapeHtml(item.title)}', '${escapeHtml(item.excerpt)}')"><i class="far fa-share-square"></i></button>
                </div>
            </div>
        </div>
    `;
    return card;
}

    // CRUD Operations
function openAddNewsModal() {
    document.getElementById('modalTitle').textContent = 'Yeni Xəbər';
    document.getElementById('newsId').value = '';
    newsForm.reset();
    document.getElementById('richEditor').innerHTML = '';
    currentTags = [];
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    renderTags();
    setStatus('published');
    updateImagePreview();
    newsModal.classList.add('active');
}

function closeNewsModal() {
    newsModal.classList.remove('active');
}

async function handleNewsSubmit(e) {
    e.preventDefault();
    
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        alert('Bu əməliyyat üçün admin və ya moderator olmalısınız.');
        return;
    }

    const id = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value;
    const category = document.getElementById('newsCategory').value;
    const excerpt = document.getElementById('newsExcerpt').value;
    const content = document.getElementById('richEditor').innerHTML;
    const readTime = document.getElementById('newsReadTime').value;
    const status = document.getElementById('newsStatus').value;
    let imageUrl = document.getElementById('newsImage').value;

    const submitBtn = newsForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saxlanılır...';
    submitBtn.disabled = true;

    try {
        if (selectedFile) {
            submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Şəkil yüklənir... 0%';
            const storageRef = storage.ref();
            const fileName = `news_images/${Date.now()}_${selectedFile.name}`;
            const fileRef = storageRef.child(fileName);
            const uploadTask = fileRef.put(selectedFile);
            
            // Progress listener
            uploadTask.on('state_changed', (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                submitBtn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> Şəkil yüklənir... ${Math.round(progress)}%`;
            });

            // Create a timeout promise that resolves with fallback data
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(async () => {
                    console.log("Upload timed out, switching to offline mode");
                    // Compress image for offline storage (Firestore limit 1MB)
                    try {
                        const dataUrl = await resizeImage(selectedFile, 800, 0.6);
                        resolve({ fallback: true, url: dataUrl });
                    } catch (e) {
                        const dataUrl = await fileToDataUrl(selectedFile);
                        resolve({ fallback: true, url: dataUrl });
                    }
                }, 45000); // Increased to 45 seconds
            });

            // Wrap upload task in a promise that resolves with snapshot
            const uploadPromise = new Promise((resolve, reject) => {
                uploadTask.then(resolve).catch(reject);
            });

            try {
                // Race them
                const result = await Promise.race([uploadPromise, timeoutPromise]);

                if (result.fallback) {
                    // Timeout won
                    imageUrl = result.url;
                    try {
                        uploadTask.cancel(); // Cancel the background upload
                    } catch(e) { console.log("Upload cancel ignored"); }
                    
                    submitBtn.innerHTML = '<i class="fas fa-wifi"></i> Oflayn rejim...';
                } else {
                    // Upload won
                    imageUrl = await result.ref.getDownloadURL();
                }
            } catch (err) {
                console.warn("Upload failed, using fallback:", err);
                try {
                    const dataUrl = await resizeImage(selectedFile, 800, 0.6);
                    imageUrl = dataUrl;
                } catch (e) {
                    imageUrl = await fileToDataUrl(selectedFile);
                }
            }
        }

        const newsData = {
            title,
            category,
            excerpt,
            content,
            readTime: parseInt(readTime),
            status,
            imageUrl,
            tags: currentTags,
            date: new Date().toISOString().split('T')[0],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ownerId: currentUser.id,
            ownerEmail: currentUser.email || ''
        };

        const tempId = id || ('local-' + Date.now());
        const localItem = { id: tempId, synced: false, ...newsData };
        allNews = [localItem, ...allNews.filter(n => n.id !== tempId)];
        renderNews(allNews);
        closeNewsModal();
        addLocalNewsItem(localItem);

        try {
            if (id) {
                await db.collection('news').doc(id).update(newsData);
            } else {
                newsData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const docRef = await db.collection('news').add(newsData);
                const idx = allNews.findIndex(n => n.id === tempId);
                if (idx !== -1) {
                    allNews[idx].id = docRef.id;
                    updateLocalNewsId(tempId, docRef.id);
                    renderNews(allNews);
                }
            }
        } catch (err) {
            alert('Ofllayn rejim: Xəbər yerli olaraq əlavə olundu');
        }
    } catch (error) {
        console.error("Error saving news:", error);
        alert('Xəta baş verdi: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

window.editNews = function(id) {
    const item = allNews.find(n => n.id === id);
    if (!item) return;

    document.getElementById('modalTitle').textContent = 'Xəbəri Redaktə Et';
    document.getElementById('newsId').value = item.id;
    document.getElementById('newsTitle').value = item.title;
    document.getElementById('newsCategory').value = item.category;
    document.getElementById('newsExcerpt').value = item.excerpt;
    document.getElementById('richEditor').innerHTML = item.content || item.excerpt;
    document.getElementById('newsReadTime').value = item.readTime;
    document.getElementById('newsImage').value = item.imageUrl || '';
    
    currentTags = item.tags || [];
    renderTags();
    setStatus(item.status || 'published');
    updateImagePreview();
    
    newsModal.classList.add('active');
}

window.deleteNews = async function(id) {
    if (!confirm('Bu xəbəri silmək istədiyinizə əminsiniz?')) return;
    
    try {
        await db.collection('news').doc(id).delete();
        loadNews();
    } catch (error) {
        console.error("Error deleting news:", error);
        alert('Xəta baş verdi');
    }
}

// Interaction
window.readNews = function(id) {
    const item = allNews.find(n => n.id === id);
    if (!item) return;
    
    document.getElementById('readTitle').textContent = item.title;
    document.getElementById('readMeta').innerHTML = `
        <i class="far fa-calendar"></i> ${formatDate(item.date)} &nbsp;|&nbsp; 
        <i class="far fa-clock"></i> ${item.readTime} dəq &nbsp;|&nbsp; 
        <span style="text-transform: capitalize; color: var(--primary); font-weight: 600;">${item.category}</span>
    `;
    
    // Convert newlines to paragraphs
    const contentHtml = (item.content || item.excerpt).split('\n').map(p => `<p style="margin-bottom: 1em;">${escapeHtml(p)}</p>`).join('');
    document.getElementById('readContent').innerHTML = contentHtml;
    
    readModal.classList.add('active');
}

window.closeReadModal = function() {
    readModal.classList.remove('active');
}

// Login Logic
window.openLoginModal = function() {
    loginModal.classList.add('active');
}

window.closeLoginModal = function() {
    loginModal.classList.remove('active');
}

window.handleLogin = async function(e) {
    e.preventDefault();
    const inputVal = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    
    // Auto-detect email vs username
    const email = inputVal.includes('@') ? inputVal : `${inputVal}@imtahan.site`;
    
    btn.textContent = 'Giriş edilir...';
    btn.disabled = true;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        closeLoginModal();
        // UI updates automatically via onAuthStateChanged
    } catch (error) {
        console.error("Login error:", error);
        if (error.code === 'auth/network-request-failed' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            currentUser = { id: 'local-admin', email, role: 'admin', username: inputVal };
            updateNavUI(true);
            checkAdmin();
            gateNewsAccess();
            closeLoginModal();
        } else {
            let errorMsg = error.message;
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                errorMsg = 'İstifadəçi adı və ya şifrə yanlışdır';
            }
            alert('Giriş xətası: ' + errorMsg);
        }
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

window.logout = function() {
    auth.signOut().then(() => {
        // UI updates automatically
    }).catch(e => console.error(e));
}

window.toggleLike = function(btn) {
    const icon = btn.querySelector('i');
    if (icon.classList.contains('far')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        icon.style.color = '#ef4444';
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => btn.style.transform = 'scale(1)', 200);
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        icon.style.color = '';
    }
}

window.shareNews = async function(btn, title, text) {
    const url = window.location.href;
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
        } catch (err) { console.log('Share canceled'); }
    } else {
        try {
            await navigator.clipboard.writeText(`${title} - ${url}`);
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check" style="color: #10b981"></i>';
            setTimeout(() => btn.innerHTML = originalIcon, 2000);
        } catch (err) { console.error('Copy failed'); }
    }
}

// Filtering
function setupEventListeners() {
    function filterNews() {
        const searchText = searchInput.value.toLowerCase().trim();
        const selectedCategory = categoryFilter.value;
        const sortOrder = sortFilter.value;

        let filtered = allNews.filter(item => {
            const title = (item.title || '').toLowerCase();
            const excerpt = (item.excerpt || '').toLowerCase();
            const content = (item.content || '').replace(/<[^>]*>/g, ' ').toLowerCase(); // Strip HTML
            const tags = (item.tags || []).map(t => t.toLowerCase());
            
            const matchesSearch = !searchText || 
                title.includes(searchText) || 
                excerpt.includes(searchText) || 
                content.includes(searchText) ||
                tags.some(tag => tag.includes(searchText));

            const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
            
            return matchesSearch && matchesCategory;
        });

        if (sortOrder === 'newest') {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else {
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        renderNews(filtered);
    }

    searchInput.addEventListener('input', filterNews);
    categoryFilter.addEventListener('change', filterNews);
    sortFilter.addEventListener('change', filterNews);
}

// Helpers
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function addStyles() {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        .news-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .news-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .ticker-item:hover { text-decoration: underline; }
        .cat-item { display: flex; justify-content: space-between; padding: 10px; background: #f9fafb; margin-bottom: 5px; border-radius: 6px; }
        .active-published { background-color: #10b981 !important; color: white !important; }
        .active-draft { background-color: #6b7280 !important; color: white !important; }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(styleSheet);
}

function resizeImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL(file.type, quality));
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

const LOCAL_NEWS_KEY = 'imtahan_news_local';
function readLocalNews() {
    try { return JSON.parse(localStorage.getItem(LOCAL_NEWS_KEY) || '[]'); } catch { return []; }
}
function writeLocalNews(items) {
    try { localStorage.setItem(LOCAL_NEWS_KEY, JSON.stringify(items)); } catch {}
}
function addLocalNewsItem(item) {
    const items = readLocalNews().filter(n => n.id !== item.id);
    writeLocalNews([item, ...items]);
}
function updateLocalNewsId(tempId, newId) {
    const items = readLocalNews();
    const idx = items.findIndex(n => n.id === tempId);
    if (idx !== -1) {
        items[idx].id = newId;
        items[idx].synced = true;
        writeLocalNews(items);
    }
}
function getLocalNewsForCurrentUser() {
    if (!currentUser || !currentUser.id) return [];
    return readLocalNews().filter(n => n.ownerId === currentUser.id);
}
function mergeLocalNewsIntoAll(list) {
    const local = getLocalNewsForCurrentUser();
    if (!local.length) return list;
    const existingIds = new Set(list.map(n => n.id));
    const mergedLocal = local.filter(n => !existingIds.has(n.id));
    return [...mergedLocal, ...list];
}
