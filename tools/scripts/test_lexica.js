const axios = require('axios');

async function getLexicaImage(query) {
    console.log(`🔍 Lexica.art-da axtarılır: "${query}"`);
    try {
        const response = await axios.get(`https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (response.data && response.data.images && response.data.images.length > 0) {
            const images = response.data.images.slice(0, 10);
            const randomImage = images[Math.floor(Math.random() * images.length)];
            
            console.log(`✅ Lexica şəkli tapıldı: ${randomImage.src}`);
            return true;
        }
        console.log("❌ Lexica-da uyğun şəkil tapılmadı");
        return false;
    } catch (error) {
        console.log(`⚠️ Lexica Xətası: ${error.message}`);
        return false;
    }
}

getLexicaImage("exam paper students");
