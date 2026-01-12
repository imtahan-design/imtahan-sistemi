import textwrap
from PIL import Image, ImageDraw, ImageFont
import time

# QEYD: Real istifadə üçün 'instagrapi' kitabxanasını quraşdırmalısınız:
# pip install instagrapi pillow

class NewsToInstagram:
    def __init__(self, username, password):
        self.username = username
        self.password = password
        # Real login prosesi burada olacaq:
        # self.client = Client()
        # self.client.login(username, password)
        print(f"✅ Bot '{username}' hesabına qoşuldu (Simulyasiya)")

    def create_news_image(self, headline, author):
        """
        Xəbər başlığından avtomatik Instagram post şəkli yaradır.
        """
        # 1. Ağ fon yaradılır (1080x1080 - Instagram standartı)
        img = Image.new('RGB', (1080, 1080), color='#1a1a1a') # Tünd boz fon
        draw = ImageDraw.Draw(img)

        # 2. Şriftlərin yüklənməsi (Sistemdəki standart şriftlərdən istifadə edirik)
        try:
            # Windows üçün standart şrift
            font_title = ImageFont.truetype("arial.ttf", 60)
            font_footer = ImageFont.truetype("arial.ttf", 30)
        except:
            font_title = ImageFont.load_default()
            font_footer = ImageFont.load_default()

        # 3. Mətnin mərkəzə yerləşdirilməsi
        margin = 100
        offset = 300
        
        # Mətni sətirlərə bölmək (wrap)
        lines = textwrap.wrap(headline, width=25)
        
        for line in lines:
            # Mətni mərkəzləşdirmək üçün ölçüləri alırıq
            bbox = draw.textbbox((0, 0), line, font=font_title)
            text_width = bbox[2] - bbox[0]
            x_pos = (1080 - text_width) / 2
            
            draw.text((x_pos, offset), line, font=font_title, fill='white')
            offset += 80

        # 4. Alt hissə (Logo və ya müəllif)
        footer_text = f"Xəbər mənbəyi: {author} | imtahan.site"
        bbox_foot = draw.textbbox((0, 0), footer_text, font=font_footer)
        footer_width = bbox_foot[2] - bbox_foot[0]
        draw.text(((1080 - footer_width) / 2, 950), footer_text, font=font_footer, fill='#00e676')

        # 5. Şəkli yaddaşa yazırıq
        output_filename = "son_xeber_postu.jpg"
        img.save(output_filename)
        print(f"🖼️ Şəkil yaradıldı: {output_filename}")
        return output_filename

    def post_to_instagram(self, image_path, caption):
        """
        Şəkli Instagram-a yükləyir.
        """
        print(f"🚀 Instagram-a yüklənir...")
        print(f"📸 Fayl: {image_path}")
        print(f"📝 Açıqlama: {caption}")
        
        # Real kod belə olacaqdı:
        # media = self.client.photo_upload(
        #     image_path,
        #     caption=caption
        # )
        
        time.sleep(2) # Yüklənmə simulyasiyası
        print("✅ Uğurla paylaşıldı!")

# --- İSTİFADƏ NÜMUNƏSİ ---
if __name__ == "__main__":
    # 1. Botu işə salırıq
    bot = NewsToInstagram("sizin_sehife", "shifre123")

    # 2. Saytınızdan gələn yeni xəbər (Simulyasiya)
    yeni_xeber = {
        "basliq": "Təhsil Nazirliyi imtahan tarixlərini açıqladı: Yeniliklər var!",
        "mezmun": "Bu gün keçirilən brifinqdə nazirlik rəsmisi bildirdi ki...",
        "link": "https://imtahan.site/xeber/123"
    }

    # 3. Şəkli hazırlayırıq
    image_file = bot.create_news_image(yeni_xeber["basliq"], "Təhsil Şöbəsi")

    # 4. Postu hazırlayıb paylaşırıq
    post_description = f"{yeni_xeber['basliq']}\n\n👉 Ətraflı oxumaq üçün link bio-da!\n\n#təhsil #imtahan #yenilik"

    bot.post_to_instagram(image_file, post_description)
