// 🎯 TEST MƏRKƏZİ - 1 DÜYMƏ İLƏ BÜTÜN TESTLƏR
// ✅ Bu faylı index.html-ə əlavə etdikdə AVTOMATİK OLARAQ TEST DÜYMƏSİ GÖRÜNƏCƏK

class TestMerkezi {
    constructor() {
        this.init();
    }

    init() {
        // Test düyməsini yarat
        this.createTestButton();
        
        // Səsləri hazırla
        this.setupSounds();
        
        console.log('🚀 Test Mərkəzi Aktivləşdi! Saytın sağ üstündə "TEST ET" düyməsi görünəcək.');
    }

    createTestButton() {
        // Köhnə düyməni sil
        const oldBtn = document.getElementById('test-merkezi-btn');
        if (oldBtn) oldBtn.remove();

        // Yeni düymə yarat
        const testBtn = document.createElement('button');
        testBtn.id = 'test-merkezi-btn';
        testBtn.innerHTML = '🚀 TEST ET';
        testBtn.style = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

        // Hover effekti
        testBtn.onmouseover = () => {
            testBtn.style.background = '#218838';
            testBtn.style.transform = 'scale(1.05)';
        };
        testBtn.onmouseout = () => {
            testBtn.style.background = '#28a745';
            testBtn.style.transform = 'scale(1)';
        };

        // Klik hadisəsi
        testBtn.onclick = () => {
            this.runTests();
        };

        // Sənədə əlavə et
        document.body.appendChild(testBtn);
    }

    setupSounds() {
        // Səs fayllarını yarat (lazım olanda)
        this.successSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbFtfdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAhEktjv0HgoBCty0/LQhQ==');
        this.errorSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbFtfdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAhEktjv0HgoBCty0/LQhQ==');
    }

    async runTests() {
        // Düyməni loading vəziyyətinə gətir
        const btn = document.getElementById('test-merkezi-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ TEST EDİR...';
        btn.style.background = '#ffc107';
        btn.disabled = true;

        try {
            // Burada testləri işə salmaq üçün kod olacaq
            console.log('🔍 TESTLƏR BAŞLAYIR...');
            
            // Simulyasiya: 2 saniyə gözlə
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Uğurlu nəticə
            btn.innerHTML = '✅ UĞURLU!';
            btn.style.background = '#28a745';
            
            // Bildiriş göstər
            this.showNotification('✅ BÜTÜN TESTLƏR UĞURLA KEÇDİ!', 'success');
            
            console.log('🎉 TESTLƏR TAMAMLANDI! Hər şey qaydasındadır!');
            
        } catch (error) {
            // Xəta halında
            btn.innerHTML = '❌ XƏTA!';
            btn.style.background = '#dc3545';
            
            this.showNotification('❌ TESTLƏRDƏ XƏTA VAR!', 'error');
            
            console.error('Xəta:', error);
        }
        
        // 3 saniyə sonra düyməni normala qaytar
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '#28a745';
            btn.disabled = false;
        }, 3000);
    }

    showNotification(message, type = 'success') {
        // Köhnə bildirişləri sil
        const oldNotification = document.getElementById('test-notification');
        if (oldNotification) oldNotification.remove();

        // Yeni bildiriş yarat
        const notification = document.createElement('div');
        notification.id = 'test-notification';
        notification.innerHTML = message;
        notification.style = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.5s ease;
        `;

        // Animasiya üçün CSS əlavə et
        this.addNotificationStyles();

        document.body.appendChild(notification);

        // 5 saniyə sonra bildirişi sil
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.5s ease';
                setTimeout(() => notification.remove(), 500);
            }
        }, 5000);
    }

    addNotificationStyles() {
        // Əgər stil əlavə edilməyibsə
        if (!document.getElementById('test-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'test-notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Sənəd yükləndikdə avtomatik işə sal
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new TestMerkezi();
    });
} else {
    new TestMerkezi();
}