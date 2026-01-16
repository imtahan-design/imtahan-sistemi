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

// Helper to generate safe links - Defined at top level
function getNewsLink(item) {
    if (!item) return '#';
    // Artıq tam "Pretty URL" istifadə edirik: /bloq/slug
    // GitHub Pages-də 404 xətası olmaması üçün update_sitemap.js tərəfindən fiziki qovluqlar yaradılacaq.
    const slug = item.slug || (item.title ? slugify(item.title) : null);
    if (slug) {
        return '/bloq/' + slug;
    }
    return '/bloq/view.html?id=' + item.id;
}

// State
let currentUser = null;
let allNews = [];
let lastVisibleDoc = null; // For pagination
let isAllNewsPage = false;
let categories = ['İmtahana Hazırlıq', 'Fənn İzahları', 'Motivasiya', 'Məsləhətlər', 'Təhsil Siyasəti'];
let currentEditingId = null;
let savedSelectionRange = null;
let slugManuallyEdited = false;

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

let currentTags = [];

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadNews();
    loadCategories();
    setupNewsletterForm();
    
    // Search Filter
    const newsSearch = document.getElementById('newsSearch');
    if (newsSearch) {
        newsSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allNews.filter(n => 
                n.title.toLowerCase().includes(term) || 
                (n.excerpt && n.excerpt.toLowerCase().includes(term)) ||
                (n.tags && n.tags.some(tag => tag.toLowerCase().includes(term)))
            );
            renderNews(filtered);
        });
    }
    
    const titleEl = document.getElementById('newsTitle');
    const slugEl = document.getElementById('newsSlug');
    if (titleEl && slugEl) {
        titleEl.addEventListener('input', (e) => {
            if (!slugManuallyEdited) {
                slugEl.value = slugify(e.target.value);
            }
        });
        slugEl.addEventListener('input', (e) => {
            slugManuallyEdited = true;
            e.target.value = slugify(e.target.value);
        });
    }
    
    // Tag Input Handler (supports bulk add via comma/semicolon/newline or Enter)
    const tagInput = document.getElementById('tagInput');
    if (tagInput) {
        tagInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
                e.preventDefault();
                const raw = this.value || '';
                const parts = raw.split(/[,\n;]+/).map(t => t.trim()).filter(Boolean);
                if (parts.length > 0) {
                    parts.forEach(t => {
                        if (!currentTags.includes(t)) {
                            currentTags.push(t);
                        }
                    });
                    renderTags();
                    this.value = '';
                }
            }
        });
        tagInput.addEventListener('paste', function() {
            setTimeout(() => {
                const raw = (this.value || '').trim();
                if (/[,\n;]+/.test(raw)) {
                    const parts = raw.split(/[,\n;]+/).map(t => t.trim()).filter(Boolean);
                    if (parts.length > 0) {
                        parts.forEach(t => {
                            if (!currentTags.includes(t)) {
                                currentTags.push(t);
                            }
                        });
                        renderTags();
                        this.value = '';
                    }
                }
            }, 0);
        });
    }
    
    // Category Filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            const cat = e.target.value;
            if (cat === 'all') {
                renderNews(allNews);
            } else {
                renderNews(allNews.filter(n => n.category === cat));
            }
        });
    }
    
    // Sort Filter
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            const sort = e.target.value;
            const sorted = [...allNews].sort((a, b) => {
                return sort === 'newest' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date);
            });
            renderNews(sorted);
        });
    }
});

function updateUIForUser() {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const adminControls = document.getElementById('adminControls');

    if (currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.textContent = currentUser.name || currentUser.email;
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
                console.log("Məqalələr cache-dən yükləndi");
                allNews = parsed.data;
                renderNews(allNews);
                updateTicker(allNews);
                return; // Serverə sorğu göndərmə
            }
        }

        // OPTIMIZATION: Limit to latest 50 items to save Firestore reads
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
        const grid = document.getElementById('newsGrid');
        if (grid && error.code === 'permission-denied') {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-database fa-2x" style="color: var(--text-muted);"></i>
                    <p style="margin-top: 10px; color: var(--text-muted);">Məqalələri yükləmək mümkün olmadı. (Database Permission Error)</p>
                    <p style="font-size: 0.9em; color: #666; margin-top:5px;">Firebase Qaydaları (Firestore Rules) oxumağa icazə vermir.</p>
                </div>
            `;
            const featuredContainer = document.getElementById('featuredContainer');
            if (featuredContainer) featuredContainer.innerHTML = ''; // Clear featured
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

function renderNews(list, featured = null) {
    const grid = document.getElementById('newsGrid');
    const featuredContainer = document.getElementById('featuredContainer');
    
    if (!grid) return;
    grid.innerHTML = '';

    // If no featured news, pick the one with most views (or fallback to latest)
    if (!featured && list.length > 0) {
        featured = list.find(n => n.isFeatured);
        if (!featured) {
            // Find max views
            featured = list.reduce((prev, current) => ((prev.views || 0) > (current.views || 0)) ? prev : current);
        }
    }

    if (featured && featuredContainer) {
        // Render Featured Hero
        featuredContainer.innerHTML = `
            <div class="featured-grid">
                <div class="featured-main" onclick="window.location.href='${getNewsLink(featured)}'" style="cursor: pointer;">
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
        if (sideContainer) {
            sideItems.forEach(item => {
                sideContainer.innerHTML += `
                    <div class="side-card" onclick="window.location.href='${getNewsLink(item)}'" style="cursor: pointer;">
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
                    <a href="${getNewsLink(item)}" class="read-more">Ətraflı oxu <i class="fas fa-arrow-right"></i></a>
                    <div class="share-inline" style="display:flex; gap:8px; margin-left:8px;">
                        <button title="WhatsApp" onclick="shareArticle('whatsapp','${location.origin}${getNewsLink(item)}','${item.title.replace(/'/g, "\\'")}')" style="background:#25D366; color:white; border:none; border-radius:8px; padding:6px 8px; cursor:pointer;"><i class="fab fa-whatsapp"></i></button>
                        <button title="Telegram" onclick="shareArticle('telegram','${location.origin}${getNewsLink(item)}','${item.title.replace(/'/g, "\\'")}')" style="background:#229ED9; color:white; border:none; border-radius:8px; padding:6px 8px; cursor:pointer;"><i class="fab fa-telegram"></i></button>
                        <button title="Linki kopyala" onclick="shareArticle('copy','${location.origin}${getNewsLink(item)}','${item.title.replace(/'/g, "\\'")}')" style="background:#6b7280; color:white; border:none; border-radius:8px; padding:6px 8px; cursor:pointer;"><i class="fas fa-link"></i></button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    setIndexSeo(list);
}

function updateTicker(list) {
    const container = document.getElementById('newsTickerContent');
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = '<span style="padding:0 20px;">Məqalə yoxdur.</span>';
        return;
    }

    // 1. Prepare items HTML
    const itemsHtml = list.slice(0, 10).map(n => `
        <a href="${getNewsLink(n)}" class="ticker-item">
            ${n.category ? `<span style="color:var(--secondary); font-weight:bold; margin-right:5px; font-size:0.85em;">[${n.category.toUpperCase()}]</span>` : ''}
            ${n.title}
        </a>
    `).join('');
    
    // 2. Double the content for seamless looping
    container.innerHTML = itemsHtml + itemsHtml; 
    
    // 3. Reset Styles for CSS Animation
    container.style.display = 'flex';
    container.style.width = 'max-content';
    
    // Optimize reflow: Use double requestAnimationFrame to avoid forced reflow (offsetHeight)
    container.style.animation = 'none'; 
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            container.style.animation = 'ticker-scroll 40s linear infinite';
        });
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
function slugify(str) {
    return (str || '')
        .toLowerCase()
        .replace(/ğ/g,'g').replace(/ə/g,'e').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/ş/g,'s').replace(/ü/g,'u')
        .replace(/[^a-z0-9\s-]/g,'')
        .trim()
        .replace(/\s+/g,'-')
        .replace(/-+/g,'-')
        .slice(0, 120);
}

function setMetaName(name, content) {
    var m = document.querySelector('meta[name="' + name + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); }
    m.setAttribute('content', content || '');
}
function setMetaProp(prop, content) {
    var m = document.querySelector('meta[property="' + prop + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('property', prop); document.head.appendChild(m); }
    m.setAttribute('content', content || '');
}
function setLinkRel(rel, href) {
    var l = document.querySelector('link[rel="' + rel + '"]');
    if (!l) { l = document.createElement('link'); l.setAttribute('rel', rel); document.head.appendChild(l); }
    l.setAttribute('href', href || '');
}
function setJsonLd(data) {
    var s = document.querySelector('script[type="application/ld+json"]');
    if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; document.head.appendChild(s); }
    s.textContent = JSON.stringify(data);
}
function buildIndexDescription(list) {
    var titles = (list || []).slice(0, 5).map(n => n.title).filter(Boolean);
    var s = titles.join(' • ');
    if (s.length > 200) s = s.slice(0, 200);
    return s || 'Təhsilə dair faydalı məqalələr və izahlar.';
}
function setIndexSeo(list) {
    var url = location.origin + '/bloq';
    var title = 'Bloq və Məqalələr – İmtahan Platforması';
    var desc = buildIndexDescription(list || []);
    var image = 'https://imtahan.site/assets/logo.png';
    document.title = title;
    setMetaName('robots', 'index,follow');
    setMetaName('description', desc);
    setMetaProp('og:type', 'website');
    setMetaProp('og:url', url);
    setMetaProp('og:title', title);
    setMetaProp('og:description', desc);
    setMetaProp('og:image', image);
    setMetaProp('og:image:alt', title);
    setMetaProp('og:site_name', 'İmtahan Bloq');
    setMetaProp('og:locale', 'az_AZ');
    setMetaName('twitter:card', 'summary_large_image');
    setMetaName('twitter:url', url);
    setMetaName('twitter:title', title);
    setMetaName('twitter:description', desc);
    setMetaName('twitter:image', image);
    setMetaName('twitter:image:alt', title);
    setLinkRel('canonical', url);
    var org = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "İmtahan Bloq",
        "url": location.origin,
        "logo": image
    };
    var website = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": location.origin + "/bloq",
        "name": "İmtahan Bloq",
        "potentialAction": {
            "@type": "SearchAction",
            "target": location.origin + "/bloq?q={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    };
    var itemList = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": (list || []).slice(0, 10).map((n, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": location.origin + getNewsLink(n),
            "name": n.title
        }))
    };
    var blog = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "url": location.origin + "/bloq",
        "name": "İmtahan Bloq",
        "blogPost": (list || []).slice(0, 10).map(n => ({
            "@type": "BlogPosting",
            "headline": n.title,
            "url": location.origin + getNewsLink(n)
        }))
    };
    setJsonLd([org, website, itemList, blog]);
}

function shareArticle(platform, url, title) {
    var shareUrl = '';
    var encodedUrl = encodeURIComponent(url);
    var encodedTitle = encodeURIComponent(title || document.title);
    if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    if (platform === 'linkedin') shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`;
    if (platform === 'whatsapp') shareUrl = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
    if (platform === 'telegram') shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
    if (platform === 'copy') {
        navigator.clipboard.writeText(url);
        alert('Link kopyalandı!');
        return;
    }
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function setupNewsletterForm() {
    var form = document.querySelector('.newsletter-form');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        var emailInput = form.querySelector('input[type="email"]');
        var email = (emailInput && emailInput.value || '').trim();
        if (!email) return;
        try {
            await db.collection('newsletter_subscribers').add({
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (emailInput) emailInput.value = '';
            alert('Abunə olduğunuz üçün təşəkkürlər!');
        } catch (err) {
            alert('Xəta: ' + err.message);
        }
    });
}
// Modal Functions
window.openAddNewsModal = function() {
    currentEditingId = null;
    document.getElementById('modalTitle').textContent = 'Yeni Məqalə';
    document.getElementById('newsForm').reset();
    document.getElementById('richEditor').innerHTML = '';
    document.getElementById('htmlEditor').value = '';
    
    // Reset HTML mode if active
    if (isHtmlMode) toggleHtmlMode();
    
    document.getElementById('newsId').value = '';
    const slugEl = document.getElementById('newsSlug');
    if (slugEl) slugEl.value = '';
    slugManuallyEdited = false;
    currentTags = [];
    renderTags();
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
    document.getElementById('modalTitle').textContent = 'Məqaləni Redaktə Et';
    document.getElementById('newsId').value = id;
    document.getElementById('newsTitle').value = item.title;
    document.getElementById('richEditor').innerHTML = item.content || '';
    document.getElementById('htmlEditor').value = item.content || '';
    
    // Ensure we start in visual mode
    if (isHtmlMode) toggleHtmlMode();
    
    document.getElementById('newsExcerpt').value = item.excerpt || '';
    document.getElementById('newsCategory').value = item.category;
    document.getElementById('newsReadTime').value = item.readTime || 3;
    document.getElementById('newsImage').value = item.imageUrl || '';
    const slugEl = document.getElementById('newsSlug');
    if (slugEl) slugEl.value = item.slug || slugify(item.title || '');
    slugManuallyEdited = true;
    
    // Tags
    currentTags = item.tags || [];
    renderTags();
    
    updateImagePreview();
    document.getElementById('newsModal').classList.add('active');
}

function renderTags() {
    const container = document.getElementById('tagList');
    if (!container) return;
    container.innerHTML = '';
    currentTags.forEach((tag, index) => {
        container.innerHTML += `
            <span class="tag-chip">
                ${tag}
                <span class="tag-remove" onclick="removeTag(${index})">&times;</span>
            </span>
        `;
    });
}

window.removeTag = function(index) {
    currentTags.splice(index, 1);
    renderTags();
}

window.deleteNews = async function(id) {
    if (!confirm('Bu məqaləni silmək istədiyinizə əminsiniz?')) return;
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
        
        clearAllNewsCaches();
        loadNews();
    } catch (error) {
        alert('Xəta: ' + error.message);
    }
}

// Editor Functions
window.execCmd = function(command, value = null) {
    saveSelection(); // Selection-ı yadda saxla
    if (command === 'createLink') {
        const url = prompt('Linkin URL-ni daxil edin:', 'https://');
        if (url) {
            document.execCommand(command, false, url);
        }
    } else {
        document.execCommand(command, false, value);
    }
    document.getElementById('richEditor').focus();
}

window.removeCoverImage = function() {
    document.getElementById('newsImage').value = '';
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = ''; 
    updateImagePreview();
}

window.updateImagePreview = function() {
    const url = document.getElementById('newsImage').value;
    const preview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    
    if (!preview) return;

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
        const placeholder = preview.querySelector('.image-preview-placeholder');
        if (placeholder) placeholder.style.opacity = '0';
        
        if (removeBtn) removeBtn.style.display = 'flex';
    } else {
        const placeholder = preview.querySelector('.image-preview-placeholder');
        if (placeholder) placeholder.style.opacity = '1';
        if (removeBtn) removeBtn.style.display = 'none';
    }
}

window.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (file) {
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
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                document.getElementById('newsImage').value = dataUrl;
                updateImagePreview();
                uploadCoverToStorage(dataUrl);
            };
        };
        reader.readAsDataURL(file);
    }
}

async function uploadCoverToStorage(dataUrl) {
    try {
        if (dataUrl.length > 3_000_000) {
            alert("Şəkil çox böyükdür. Zəhmət olmasa daha kiçik fayl seçin.");
            return;
        }
        const unique = Date.now() + '-' + Math.random().toString(36).slice(2);
        const ref = storage.ref(`covers/${unique}.jpg`);
        const metadata = { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000' };
        const snapshot = await ref.putString(dataUrl, 'data_url', metadata);
        const url = await snapshot.ref.getDownloadURL();
        document.getElementById('newsImage').value = url;
        updateImagePreview();
    } catch (err) {
        alert("Şəkili yükləmək mümkün olmadı: " + err.message);
        try {
            document.getElementById('newsImage').value = dataUrl;
            updateImagePreview();
        } catch {}
    }
}

window.handleEditorImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const editor = document.getElementById('richEditor');
    if (!editor) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            // 1. Şəkli dərhal müvəqqəti (base64) olaraq yerləşdiririk
            restoreSelection();
            const loadingId = 'img-loading-' + Date.now();
            const tempImgHtml = `<img id="${loadingId}" src="${dataUrl}" style="max-width:100%; height:auto; display:block; margin:15px auto; border-radius:12px; opacity:0.7;">`;
            document.execCommand('insertHTML', false, tempImgHtml + '<p><br></p>');
            saveSelection();

            try {
                // 2. Arxa fonda Firebase-ə yükləyirik
                const unique = Date.now() + '-' + Math.random().toString(36).slice(2);
                const ref = storage.ref(`editor/${unique}.jpg`);
                const metadata = { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000' };
                
                const snapshot = await ref.putString(dataUrl, 'data_url', metadata);
                const url = await snapshot.ref.getDownloadURL();
                
                // 3. Yükləmə uğurlu olsa, müvəqqəti şəkli real URL ilə əvəz edirik
                const finalImg = document.getElementById(loadingId);
                if (finalImg) {
                    finalImg.src = url;
                    finalImg.removeAttribute('id');
                    finalImg.style.opacity = '1';
                    finalImg.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }
            } catch (err) {
                console.error("Firebase Upload Error (using Base64 fallback):", err);
                // Xəta olsa, şəkli base64 olaraq saxla (artıq yerləşdirilib)
                const finalImg = document.getElementById(loadingId);
                if (finalImg) {
                    finalImg.removeAttribute('id');
                    finalImg.style.opacity = '1';
                }
                // İstifadəçiyə sakitcə bildiriş (konsolda)
            }
        };
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

window.saveSelection = function() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        savedSelectionRange = sel.getRangeAt(0);
    }
}

window.restoreSelection = function() {
    const editor = document.getElementById('richEditor');
    if (!editor) return;
    editor.focus();
    if (savedSelectionRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelectionRange);
    } else {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

let isHtmlMode = false;
window.toggleHtmlMode = function() {
    const richEditor = document.getElementById('richEditor');
    const htmlEditor = document.getElementById('htmlEditor');
    const btn = document.getElementById('htmlModeBtn');
    
    if (!richEditor || !htmlEditor || !btn) return;

    isHtmlMode = !isHtmlMode;
    
    if (isHtmlMode) {
        htmlEditor.value = richEditor.innerHTML;
        richEditor.style.display = 'none';
        htmlEditor.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-eye"></i> Visual';
        btn.style.color = '#10b981'; 
        document.querySelectorAll('.toolbar-btn:not(#htmlModeBtn), .editor-select, .editor-color').forEach(el => {
            el.style.opacity = '0.5';
            el.style.pointerEvents = 'none';
        });
    } else {
        richEditor.innerHTML = htmlEditor.value;
        htmlEditor.style.display = 'none';
        richEditor.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-code"></i> HTML';
        btn.style.color = 'var(--primary)';
        document.querySelectorAll('.toolbar-btn, .editor-select, .editor-color').forEach(el => {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        });
    }
}

window.showToast = function(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        transition: all 0.3s ease;
        transform: translateY(100px);
        opacity: 0;
        font-weight: 500;
    `;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.handleNewsSubmit = async function(event) {
    event.preventDefault();
    
    const title = document.getElementById('newsTitle').value;
    
    let content;
    if (isHtmlMode) {
        content = document.getElementById('htmlEditor').value;
    } else {
        content = document.getElementById('richEditor').innerHTML;
    }
    
    const excerpt = document.getElementById('newsExcerpt').value;
    const category = document.getElementById('newsCategory').value;
    const readTime = document.getElementById('newsReadTime').value;
    const imageUrl = document.getElementById('newsImage').value;
    const slugInput = document.getElementById('newsSlug') ? document.getElementById('newsSlug').value : '';
    let slug = slugify(slugInput || title);
    
    try {
        const q = await db.collection('news').where('slug', '==', slug).get();
        if (!q.empty) {
            const conflict = q.docs.find(d => d.id !== currentEditingId);
            if (conflict) {
                slug = slug + '-2';
            }
        }
    } catch (e) {}
    
    const newsData = {
        title,
        content,
        excerpt: excerpt || (content ? content.replace(/<[^>]+>/g, '').substring(0, 150) + '...' : title),
        category,
        readTime: parseInt(readTime) || Math.ceil((content || '').split(' ').length / 200) || 3,
        imageUrl,
        tags: currentTags,
        date: new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'published', 
        views: 0,
        isFeatured: false,
        slug
    };
    
    try {
        if (currentEditingId) {
            delete newsData.date; 
            delete newsData.views;
            delete newsData.isFeatured;
            await db.collection('news').doc(currentEditingId).update(newsData);
        } else {
            await db.collection('news').add(newsData);
        }
        
        sessionStorage.removeItem('news_list_cache');
        sessionStorage.removeItem('trend_news_cache');

        closeNewsModal();
        loadNews();
        showToast('Məqalə uğurla yadda saxlanıldı');

        const isAdminOrMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
        if (isAdminOrMod) {
            try {
                const seoResponse = await fetch('/api/admin/update-seo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const seoData = await seoResponse.json();
                if (seoData.success) {
                    showToast('SEO və Sitemap uğurla yeniləndi');
                }
            } catch (err) {}
        }
    } catch (e) {
        showToast('Xəta: ' + e.message, 'error');
    }
}

window.fixAllSlugs = async function() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        alert('Bu əməliyyat üçün admin olmalısınız.');
        return;
    }
    
    if (!confirm('Bütün məqalələrin slug-larını yoxlayıb düzəltmək istəyirsiniz?')) return;
    
    const btn = document.getElementById('fixSlugsBtn');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşlənir...';
    btn.disabled = true;

    try {
        const snapshot = await db.collection('news').get();
        let fixCount = 0;
        const batch = db.batch();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.slug) {
                const newSlug = slugify(data.title);
                batch.update(db.collection('news').doc(doc.id), { slug: newSlug });
                fixCount++;
            }
        });
        
        if (fixCount > 0) {
            await batch.commit();
            alert(`${fixCount} məqalənin slug-ı bərpa edildi.`);
            sessionStorage.removeItem('news_list_cache');
            loadNews();
        } else {
            alert('Bütün məqalələrin slug-ı qaydasındadır.');
        }
    } catch (err) {
        alert('Xəta: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.openCategoryModal = function() {
    renderCategoryList();
    const modal = document.getElementById('categoryManagerModal');
    if (modal) modal.classList.add('active');
}
window.closeCategoryModal = function() {
    const modal = document.getElementById('categoryManagerModal');
    if (modal) modal.classList.remove('active');
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
    if (!input) return;
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
        loadCategories(); 
    } catch (e) {
        console.error(e);
    }
}

window.openLoginModal = () => {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('active');
};
window.closeLoginModal = () => {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('active');
};
window.logout = () => auth.signOut().then(() => window.location.reload());
window.handleLogin = async (e) => {
    e.preventDefault();
    const loginInput = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    
    let email = loginInput;
    if (!loginInput.includes('@')) {
        try {
            const userSnapshot = await db.collection('users').where('username', '==', loginInput).limit(1).get();
            if (!userSnapshot.empty) {
                email = userSnapshot.docs[0].data().email;
            }
        } catch (error) {
            if (error.code === 'permission-denied') {
                alert("İstifadəçi adı ilə giriş üçün sistem icazəsi yoxdur. Zəhmət olmasa email ünvanınızla daxil olun.");
                return;
            }
        }
    }

    auth.signInWithEmailAndPassword(email, pass).then(() => {
        closeLoginModal();
    }).catch(err => alert(err.message));
}

window.toggleColorPalette = function() {
    const palette = document.getElementById('colorPalette');
    if (!palette) return;
    palette.classList.toggle('active');
}

document.addEventListener('click', function(e) {
    const palette = document.getElementById('colorPalette');
    const btn = e.target.closest('button[onclick="toggleColorPalette()"]');
    if (palette && palette.classList.contains('active')) {
        if (!palette.contains(e.target) && !btn) {
            palette.classList.remove('active');
        }
    }
});

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
                btn.textContent = 'Başqa məqalə yoxdur';
                btn.disabled = true;
                if (!lastVisibleDoc) {
                     const grid = document.getElementById('all-news-grid');
                     if (grid) grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Hələ ki məqalə yoxdur.</p>';
                }
            }
            return;
        }

        lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllNewsGrid(newItems);

        if (btn) {
            if (snapshot.docs.length < 12) {
                btn.textContent = 'Son';
                btn.disabled = true;
            } else {
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
                    <a href="${getNewsLink(item)}" class="read-more" style="color:var(--primary); text-decoration:none; font-weight:600;">Ətraflı oxu <i class="fas fa-arrow-right"></i></a>
                    <div class="share-inline" style="display:flex; gap:8px; margin-left:8px;">
                        <button title="WhatsApp" onclick="shareArticle('whatsapp','${location.origin}${getNewsLink(item)}','${item.title.replace(/'/g, "\\'")}')" style="background:#25D366; color:white; border:none; border-radius:8px; padding:6px 8px; cursor:pointer;"><i class="fab fa-whatsapp"></i></button>
                        <button title="Telegram" onclick="shareArticle('telegram','${location.origin}${getNewsLink(item)}','${item.title.replace(/'/g, "\\'")}')" style="background:#229ED9; color:white; border:none; border-radius:8px; padding:6px 8px; cursor:pointer;"><i class="fab fa-telegram"></i></button>
                        <button title="Linki kopyala" onclick="shareArticle('copy','${location.origin}${getNewsLink(item)}','${item.title.replace(/'/g, "\\'")}')" style="background:#6b7280; color:white; border:none; border-radius:8px; padding:6px 8px; cursor:pointer;"><i class="fas fa-link"></i></button>
                    </div>
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
