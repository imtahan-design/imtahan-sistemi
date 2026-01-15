const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAak_eY0WNpY7cqAEuWEBG9wBDhg1NPw_0",
    authDomain: "imtahansistemi-17659.firebaseapp.com",
    projectId: "imtahansistemi-17659",
    storageBucket: "imtahansistemi-17659.firebasestorage.app",
    messagingSenderId: "715396853166",
    appId: "1:715396853166:web:9829b853e5e572de4d2c3f"
};

// Initialize Firebase
// Note: In Node.js environment with Client SDK, we might need to rely on default auth or anonymous if rules allow.
// Public read is usually allowed for news.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        if (dateStr && typeof dateStr.toDate === 'function') {
            dateStr = dateStr.toDate();
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; 
        const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
        return dateStr || '';
    }
}

function toISODate(value) {
    try {
        if (!value) return null;
        if (typeof value.toDate === 'function') {
            return value.toDate().toISOString();
        }
        const d = new Date(value);
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
    } catch {
        return null;
    }
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

function getNewsLink(item) {
    if (!item) return '#';
    const slug = item.slug || (item.title ? slugify(item.title) : null);
    if (slug) {
        return '/bloq/' + slug;
    }
    return '/bloq/view.html?id=' + item.id;
}

async function generateSitemap() {
    console.log("Fetching news from Firestore...");
    
    try {
        const q = query(collection(db, 'news'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        
        console.log(`Found ${snapshot.size} articles.`);

        // --- NEW: Generate bloq/index.html from template ---
        try {
            const templatePath = path.resolve(__dirname, '../bloq/index.template.html');
            if (fs.existsSync(templatePath)) {
                let indexHtml = fs.readFileSync(templatePath, 'utf8');
                const allNews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // 1. Featured Section
                let featured = allNews.find(n => n.isFeatured);
                if (!featured && allNews.length > 0) {
                    // Simple fallback to latest if no views data or isFeatured
                    featured = allNews[0]; 
                }

                let featuredHtml = '';
                if (featured) {
                    const sideItems = allNews.filter(n => n.id !== featured.id).slice(0, 2);
                    let sideHtml = '';
                    sideItems.forEach(item => {
                        sideHtml += `
                            <div class="side-card" onclick="window.location.href='${getNewsLink(item)}'" style="cursor: pointer;">
                                <img class="side-image" src="${item.imageUrl || 'https://via.placeholder.com/180x250?text=No+Image'}" alt="${item.title}">
                                <div class="side-content">
                                    <span class="mini-cat">${item.category || 'Bloq'}</span>
                                    <h3 class="side-title">${item.title}</h3>
                                    <span class="mini-date">${formatDate(item.date)}</span>
                                </div>
                            </div>
                        `;
                    });

                    featuredHtml = `
                        <div class="featured-grid">
                            <div class="featured-main" onclick="window.location.href='${getNewsLink(featured)}'" style="cursor: pointer;">
                                <img src="${featured.imageUrl || 'https://via.placeholder.com/800x500?text=No+Image'}" alt="${featured.title}">
                                <div class="featured-overlay">
                                    <span class="featured-badge">${featured.category || 'Bloq'}</span>
                                    <h2 class="featured-title">${featured.title}</h2>
                                    <div class="featured-meta">
                                        <span><i class="far fa-calendar"></i> ${formatDate(featured.date)}</span>
                                        <span><i class="far fa-clock"></i> ${featured.readTime || 3} dəq</span>
                                    </div>
                                </div>
                            </div>
                            <div class="featured-side">
                                ${sideHtml}
                            </div>
                        </div>
                    `;
                }

                // 2. Grid Section (Latest 20)
                let gridHtml = '';
                allNews.slice(0, 20).forEach(item => {
                    gridHtml += `
                        <div class="news-card">
                            <div class="card-image-wrapper bg-gradient-${Math.floor(Math.random()*4)+1}">
                                ${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%; height:100%; object-fit:cover;" alt="${item.title}">` : `<i class="fas fa-graduation-cap card-icon"></i>`}
                                <span class="card-badge">${item.category || 'Bloq'}</span>
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
                                </div>
                            </div>
                        </div>
                    `;
                });

                // Inject into template
                // Note: We use simple string replacement assuming standard ID attributes
                if (featuredHtml) {
                    indexHtml = indexHtml.replace('<div id="featuredContainer" style="margin-bottom: 60px;"></div>', `<div id="featuredContainer" style="margin-bottom: 60px;">${featuredHtml}</div>`);
                }
                if (gridHtml) {
                    indexHtml = indexHtml.replace('<div class="news-grid" id="newsGrid"></div>', `<div class="news-grid" id="newsGrid">${gridHtml}</div>`);
                }

                const indexPath = path.resolve(__dirname, '../bloq/index.html');
                fs.writeFileSync(indexPath, indexHtml);
                console.log("Generated bloq/index.html with static content.");
            } else {
                console.warn("Template bloq/index.template.html not found, skipping index generation.");
            }
        } catch (e) {
            console.error("Error generating bloq/index.html:", e);
        }
        // -----------------------------------------------------

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Static pages
        const staticPages = [
            { loc: 'https://imtahan.site/', priority: '1.0', changefreq: 'daily' },
            { loc: 'https://imtahan.site/bloq', priority: '0.9', changefreq: 'hourly' }
        ];

        staticPages.forEach(page => {
            xml += '  <url>\n';
            xml += `    <loc>${page.loc}</loc>\n`;
            xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
            xml += `    <priority>${page.priority}</priority>\n`;
            xml += '  </url>\n';
        });

        // News articles
        snapshot.forEach(doc => {
            const data = doc.data();
            let url = '';
            
            // Kanonik format: /bloq/slug
            // 404 xətası olmaması üçün aşağıda fiziki qovluq və index.html yaradılır.
            if (data.slug) {
                url = `https://imtahan.site/bloq/${data.slug}`;
                
                // --- STATİK SƏHİFƏ GENERASİYASI (SEO üçün) ---
                try {
                    // Köhnə qovluq strukturunu təmizləyirik (əgər varsa)
                    const oldSlugDir = path.resolve(__dirname, '../bloq', data.slug);
                    if (fs.existsSync(oldSlugDir) && fs.lstatSync(oldSlugDir).isDirectory()) {
                        fs.rmSync(oldSlugDir, { recursive: true, force: true });
                    }

                    // Yeni: bloq/slug.html faylı yaradırıq (bloq/slug/index.html əvəzinə)
                    // Bu, Firebase Hosting "cleanUrls" ilə daha yaxşı işləyir.
                    const slugFile = path.resolve(__dirname, '../bloq', `${data.slug}.html`);
                    
                    // view.html-i şablon kimi istifadə edirik
                    const templatePath = path.resolve(__dirname, '../bloq/view.html');
                    let htmlContent = fs.readFileSync(templatePath, 'utf8');
                    
                    // Meta teqləri və başlığı dinamik olaraq ilkin HTML-ə yerləşdiririk (Google üçün)
                    const title = `${data.title} – İmtahan Bloq`;
                    const description = (data.excerpt || data.content || '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .replace(/"/g, '&quot;')
                        .substring(0, 160);
                    const rawImageUrl = (typeof data.imageUrl === 'string') ? data.imageUrl : '';
                    let imageUrl = 'https://imtahan.site/assets/logo.png';
                    
                    // Base64 check: If image is Base64, do NOT use it for SEO/Social metadata (it breaks them)
                    // Use it only if it's a real URL
                    if (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')) {
                        imageUrl = rawImageUrl;
                    } else if (rawImageUrl.startsWith('assets/')) {
                        imageUrl = 'https://imtahan.site/' + rawImageUrl;
                    } else if (rawImageUrl.length > 500) {
                        // Likely Base64 or invalid, fallback to logo for metadata
                        console.warn(`Warning: Article "${data.title}" has a Base64 or invalid image URL. Using default logo for SEO metadata.`);
                        imageUrl = 'https://imtahan.site/assets/logo.png';
                    }
                    const canonical = `https://imtahan.site/bloq/${data.slug}`;

                    const publishedISO = toISODate(data.date) || new Date().toISOString();
                    const modifiedISO = toISODate(data.updatedAt) || publishedISO;
                    const section = data.category || 'Bloq';
                    const tags = Array.isArray(data.tags) ? data.tags : [];
                    const articleTagMeta = tags.map(t => `<meta property="article:tag" content="${String(t).trim().replace(/"/g, '&quot;')}">`).join('\n    ');
                    const seoTags = `<base href="/">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:alt" content="${title}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="İmtahan Bloq">
    <meta property="article:published_time" content="${publishedISO}">
    <meta property="article:modified_time" content="${modifiedISO}">
    <meta property="article:section" content="${section}">
    ${articleTagMeta}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    <script type="application/ld+json">
    [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": "${data.title.replace(/"/g, '\\"')}",
        "description": "${description.replace(/"/g, '\\"')}",
        "image": ["${imageUrl}"],
        "datePublished": "${publishedISO}",
        "dateModified": "${modifiedISO}",
        "author": {
          "@type": "Organization",
          "name": "İmtahan Bloq",
          "url": "https://imtahan.site"
        },
        "publisher": {
          "@type": "Organization",
          "name": "İmtahan Bloq",
          "logo": {
            "@type": "ImageObject",
            "url": "https://imtahan.site/assets/logo.png"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "${canonical}"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Ana Səhifə",
            "item": "https://imtahan.site/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Bloq",
            "item": "https://imtahan.site/bloq"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "${data.title.replace(/"/g, '\\"')}",
            "item": "${canonical}"
          }
        ]
      }
    ]
    </script>`;

                    htmlContent = htmlContent.replace(/<title>.*?<\/title>/, seoTags);
                    
                    // --- PRE-RENDERING CONTENT INJECTION ---
                    // 1. Hide loading spinner
                    htmlContent = htmlContent.replace('<div id="loading" style="text-align: center; padding: 60px;">', '<div id="loading" style="display: none;">');
                    
                    // 2. Show article body container
                    htmlContent = htmlContent.replace('<div id="articleBody" style="display: none;">', '<div id="articleBody" style="display: block;">');
                    
                    // 3. Inject Title
                    htmlContent = htmlContent.replace('<h1 class="article-title" id="newsTitle"></h1>', `<h1 class="article-title" id="newsTitle">${data.title}</h1>`);
                    
                    // 4. Inject Category
                    htmlContent = htmlContent.replace('<div class="article-category" id="newsCategory"></div>', `<div class="article-category" id="newsCategory">${data.category || 'Bloq'}</div>`);
                    
                    // 5. Inject Date & Meta
                    const dateStr = formatDate(data.date);
                    const readTime = data.readTime || 3;
                    const views = data.views || 0;
                    
                    htmlContent = htmlContent.replace('<div class="article-meta" id="newsMeta"></div>', 
                        `<div class="article-meta" id="newsMeta">
                            <span><i class="far fa-calendar"></i> ${dateStr}</span>
                            <span><i class="far fa-clock"></i> ${readTime} dəq</span>
                            <span><i class="far fa-eye"></i> ${views}</span>
                        </div>`
                    );
                    
                    // 6. Inject Image
                    if (imageUrl) {
                         htmlContent = htmlContent.replace('<img id="newsCover" class="article-image" style="display: none;">', `<img id="newsCover" class="article-image" src="${imageUrl}" alt="${data.title}">`);
                    }
                    
                    // 7. Inject Content
                    if (data.content) {
                        htmlContent = htmlContent.replace('<div class="article-content" id="newsContent"></div>', `<div class="article-content" id="newsContent">${data.content}</div>`);
                    }
                    
                    // 8. Inject Tags
                    if (tags.length > 0) {
                        const tagsHtml = tags.map(tag => `<a href="/bloq" class="tag">#${tag}</a>`).join('');
                        htmlContent = htmlContent.replace('<div class="article-tags" id="newsTags"></div>', `<div class="article-tags" id="newsTags">${tagsHtml}</div>`);
                    }

                    fs.writeFileSync(slugFile, htmlContent);
                    // console.log(`Generated static page for: ${data.slug}`);
                } catch (err) {
                    console.error(`Error generating static page for ${data.slug}:`, err.message);
                }
            } else {
                url = `https://imtahan.site/bloq/view.html?id=${doc.id}`;
            }

            let lastMod = new Date().toISOString();
            lastMod = toISODate(data.updatedAt) || toISODate(data.date) || lastMod;

            xml += '  <url>\n';
            xml += `    <loc>${url}</loc>\n`;
            xml += `    <lastmod>${lastMod}</lastmod>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.7</priority>\n`;
            xml += '  </url>\n';
        });

        xml += '</urlset>';

        const sitemapPath = path.resolve(__dirname, '../sitemap.xml');
        fs.writeFileSync(sitemapPath, xml);
        console.log(`Sitemap generated successfully at ${sitemapPath}`);
        
        process.exit(0);

    } catch (error) {
        console.error("Error generating sitemap:", error);
        process.exit(1);
    }
}

generateSitemap();
