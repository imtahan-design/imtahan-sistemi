// Utility funksiyalar modulu
export const domUtils = {
    batchToggleClass: function(elements, className, add = true) {
        if (!elements || elements.length === 0) return;
        
        if (add) {
            elements.forEach(el => el.classList.add(className));
        } else {
            elements.forEach(el => el.classList.remove(className));
        }
    },
    
    createElements: function(template, count, container = null) {
        const fragment = document.createDocumentFragment();
        const elements = [];
        
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.innerHTML = template;
            if (div.firstElementChild) {
                fragment.appendChild(div.firstElementChild);
                elements.push(div.firstElementChild);
            }
        }
        
        if (container) {
            container.appendChild(fragment);
        }
        
        return elements;
    }
};

export const storageManager = {
    setItem: function(key, data, compress = true) {
        try {
            let value = data;
            if (compress && typeof data === 'object') {
                value = JSON.stringify(data);
                if (value.length > 1024) {
                    value = LZString.compressToUTF16(value);
                }
            }
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('Storage limiti aşıldı:', e);
            this.cleanupOldData();
        }
    },
    
    getItem: function(key, decompress = true) {
        const value = localStorage.getItem(key);
        if (!value) return null;
        
        if (decompress && (value.startsWith('{') || value.startsWith('[') || LZString.decompressFromUTF16(value))) {
            try {
                let decompressed = value;
                if (LZString.decompressFromUTF16(value)) {
                    decompressed = LZString.decompressFromUTF16(value);
                }
                return JSON.parse(decompressed);
            } catch (e) {
                return value;
            }
        }
        return value;
    }
};

export const apiUtils = {
    debounce: function(func, wait, immediate = false) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    },
    
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};