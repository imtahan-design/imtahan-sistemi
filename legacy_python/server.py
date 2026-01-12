from flask import Flask, request, jsonify
from flask_cors import CORS
from auto_news_poster import NewsToInstagram
import os

app = Flask(__name__)
CORS(app)  # Brauzerdən gələn sorğulara icazə veririk

# Botu işə salırıq (Login prosesi bir dəfə olur)
bot = NewsToInstagram("sizin_sehife", "shifre123")

@app.route('/share-to-instagram', methods=['POST'])
def share_news():
    data = request.json
    
    title = data.get('title')
    
    if not title:
        return jsonify({"error": "Başlıq tələb olunur"}), 400

    print(f"\n📩 Yeni sorğu gəldi: '{title}'")
    
    try:
        # 1. Şəkil yaradılır
        print("1. Şəkil hazırlanır...")
        image_path = bot.create_news_image(title, "İmtahan.site")
        
        # 2. Instagram-a yüklənir
        print("2. Instagram-a göndərilir...")
        caption = f"{title}\n\nƏtraflı: imtahan.site\n#imtahan #təhsil"
        bot.post_to_instagram(image_path, caption)
        
        return jsonify({
            "status": "success",
            "message": "Uğurla paylaşıldı!",
            "image": image_path
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Server işə düşdü: http://localhost:5000")
    print("Gözlənilir...")
    app.run(port=5000)
