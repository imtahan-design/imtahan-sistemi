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

async function generateSitemap() {
    console.log("Fetching news from Firestore...");
    
    try {
        const q = query(collection(db, 'news'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        
        console.log(`Found ${snapshot.size} articles.`);

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
                    if (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')) {
                        imageUrl = rawImageUrl;
                    } else if (rawImageUrl.startsWith('assets/')) {
                        imageUrl = 'https://imtahan.site/' + rawImageUrl;
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
                    
                    // 5. Inject Date
                    const dateStr = formatDate(data.date);
                    htmlContent = htmlContent.replace('<div class="article-meta" id="newsMeta"></div>', `<div class="article-meta" id="newsMeta"><i class="fas fa-calendar-alt" style="margin-right:8px"></i> ${dateStr}</div>`);
                    
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
