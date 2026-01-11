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
            { loc: 'https://imtahan.site/bloq', priority: '0.9', changefreq: 'hourly' },
            { loc: 'https://imtahan.site/index.html', priority: '0.8', changefreq: 'weekly' }
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
                    const slugDir = path.resolve(__dirname, '../bloq', data.slug);
                    if (!fs.existsSync(slugDir)) {
                        fs.mkdirSync(slugDir, { recursive: true });
                    }
                    
                    // view.html-i şablon kimi istifadə edirik
                    const templatePath = path.resolve(__dirname, '../news/view.html');
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
                    let imageUrl = data.imageUrl || 'https://imtahan.site/assets/logo.png';
                    if (imageUrl.startsWith('assets/')) {
                        imageUrl = 'https://imtahan.site/' + imageUrl;
                    } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                        imageUrl = 'https://imtahan.site/assets/logo.png';
                    }
                    const canonical = `https://imtahan.site/bloq/${data.slug}`;

                    const publishedISO = (data.date ? new Date(data.date).toISOString() : new Date().toISOString());
                    const modifiedISO = publishedISO;
                    const section = data.category || 'Bloq';
                    const tags = Array.isArray(data.tags) ? data.tags : [];
                    const articleTagMeta = tags.map(t => `<meta property="article:tag" content="${String(t).trim().replace(/"/g, '&quot;')}">`).join('\n    ');
                    const seoTags = `<base href="/">
    <title>${title}</title>
    <meta name="description" content="${description}">
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
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "${data.title.replace(/"/g, '\\"')}",
      "description": "${description.replace(/"/g, '\\"')}",
      "image": ["${imageUrl}"],
      "datePublished": "${publishedISO}",
      "author": {
        "@type": "Organization",
        "name": "İmtahan Bloq"
      }
    }
    </script>`;

                    htmlContent = htmlContent.replace(/<title>.*?<\/title>/, seoTags);
                    
                    fs.writeFileSync(path.join(slugDir, 'index.html'), htmlContent);
                    // console.log(`Generated static page for: ${data.slug}`);
                } catch (err) {
                    console.error(`Error generating static page for ${data.slug}:`, err.message);
                }
            } else {
                url = `https://imtahan.site/bloq/view.html?id=${doc.id}`;
            }

            let lastMod = new Date().toISOString();
            if (data.date) {
                try {
                    lastMod = new Date(data.date).toISOString();
                } catch(e) {}
            }

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
