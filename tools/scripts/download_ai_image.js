const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadImage(url, filepath) {
    console.log(`📥 Şəkil yüklənir: ${url}`);
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filepath);
            response.data.pipe(writer);
            writer.on('finish', () => {
                console.log(`✅ Şəkil uğurla yadda saxlanıldı: ${filepath}`);
                resolve(filepath);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`❌ Yükləmə xətası: ${error.message}`);
    }
}

// Unsplash Image: Futuristic Robot / AI Concept
// Photo by Alex Knight on Unsplash
const imageUrl = "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop";
const outputPath = path.join(__dirname, 'news', 'ai_job_market.jpg');

downloadImage(imageUrl, outputPath);
