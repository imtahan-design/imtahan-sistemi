const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

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
            { loc: 'https://imtahan.site/news/index.html', priority: '0.9', changefreq: 'hourly' },
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
            
            // Use slug if available (supported by firebase rewrites), otherwise fallback to ID
            if (data.slug) {
                // Ensure no leading slash in stored slug to avoid double slash if configured that way, 
                // but usually stored slugs are clean. Let's assume clean.
                // Firebase rewrite maps /news/** -> /news/view.html
                url = `https://imtahan.site/news/${data.slug}`;
            } else {
                url = `https://imtahan.site/news/view.html?id=${doc.id}`;
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
