
const fs = require('fs');

async function parseToJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error("Fayl tapılmadı: " + filePath);
            return;
        }

        console.log("Fayl oxunur və analiz edilir: " + filePath);
        const rawText = fs.readFileSync(filePath, 'utf8');
        
        // Mətni sətirlərə bölürük
        let lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
        
        const questions = [];
        let currentCategory = "Ümumi"; 
        let currentQ = null;
        
        // Regex Patterns
        // Pattern 1: "1. Sual" və ya "1) Sual"
        const patternNumStart = /^(\d+)[\.)]\s*(.*)/; 
        // Pattern 2: "Sual 1:" və ya "Sual 1 (Situasiya):"
        const patternSualNum = /^Sual\s+(\d+)(?:\s*\(.*?\))?[:\s]\s*(.*)/i;
        // Pattern 3: "Sual: ..." (Müstəqil və ya header-dən sonra)
        const patternSualOnly = /^Sual:\s*(.*)/i;
        
        const optionPattern = /^([A-E])[\)\.]\s*(.*)/i; 
        const correctPattern = /^(Düzgün cavab|Cavab|Correct):\s*([A-E])/i;
        const explanationPattern = /^(İzah|Şərh|Explanation):\s*(.*)/i;
        
        function splitInlineOptions(text) {
            return text.replace(/([A-E])[\)\.]/g, '\n$1)').split('\n').map(l => l.trim()).filter(l => l);
        }

        function saveCurrentQ() {
            if (currentQ && currentQ.options.length >= 2) {
                // Əgər cavab tapılmayıbsa, variantların içində axtar (bəzən variantın yanında qeyd olunur)
                if (!currentQ.correctVariantId) {
                    // Bu hissəni gələcəkdə təkmilləşdirmək olar
                }
                questions.push(currentQ);
            }
            currentQ = null;
        }

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // 1. Yeni Sual Təsbiti (Müxtəlif formatlar)
            const matchNum = line.match(patternNumStart);
            const matchSualNum = line.match(patternSualNum);
            const matchSualOnly = line.match(patternSualOnly);

            if (matchNum || matchSualNum) {
                saveCurrentQ();
                
                const num = matchNum ? matchNum[1] : matchSualNum[1];
                const text = matchNum ? matchNum[2] : matchSualNum[2];
                
                currentQ = {
                    number: num,
                    text: text,
                    options: [],
                    correctVariantId: null,
                    explanation: null,
                    tags: ["Dövlət Qulluğu", currentCategory],
                    type: "text",
                    createdAt: new Date().toISOString()
                };
                
                // Əgər başlıq "Situasiya" sözünü saxlayırsa, tag əlavə et
                if (line.toLowerCase().includes("situasiya")) {
                    if (!currentQ.tags.includes("Situasiya")) currentQ.tags.push("Situasiya");
                }
                continue;
            }

            // "Sual: ..." formatı - Əgər hal-hazırda sual yoxdursa və ya mövcud sualın mətni boşdursa
            if (matchSualOnly) {
                if (!currentQ || (currentQ.options.length === 0 && currentQ.text.length < 5)) {
                    if (!currentQ) {
                        currentQ = {
                            number: "auto",
                            text: matchSualOnly[1],
                            options: [],
                            correctVariantId: null,
                            explanation: null,
                            tags: ["Dövlət Qulluğu", currentCategory],
                            type: "text",
                            createdAt: new Date().toISOString()
                        };
                    } else {
                        currentQ.text = matchSualOnly[1];
                    }
                } else {
                    // Mövcud sualın mətni kimi davam etsin (nadir hal)
                    currentQ.text += " " + matchSualOnly[1];
                }
                continue;
            }

            // 2. Kateqoriya/Başlıq (Əgər sual deyil, variant deyil və s.)
            if (!currentQ && line.length < 150 && !line.match(optionPattern)) {
                // Çox qısa və ya hamısı böyük hərflə olan sətirlər adətən başlıqdır
                if (line.length < 50 || line === line.toUpperCase()) {
                    currentCategory = line.replace(/^-+\s*/, "").replace(/\s*-+$/, "").trim();
                    continue;
                }
            }

            if (!currentQ) continue;

            // 3. Variantlar
            const optMatch = line.match(optionPattern);
            if (optMatch) {
                currentQ.options.push({
                    id: optMatch[1].toLowerCase(),
                    text: optMatch[2]
                });
                continue;
            }
            
            if (line.includes("A)") && line.includes("B)")) {
                 const parts = splitInlineOptions(line);
                 parts.forEach(p => {
                     const m = p.match(optionPattern);
                     if (m) {
                         currentQ.options.push({
                             id: m[1].toLowerCase(),
                             text: m[2]
                         });
                     }
                 });
                 continue;
            }

            // 4. Düzgün Cavab
            const corrMatch = line.match(correctPattern);
            if (corrMatch) {
                currentQ.correctVariantId = corrMatch[2].toLowerCase();
                continue;
            }

            // 5. İzah
            const explMatch = line.match(explanationPattern);
            if (explMatch) {
                currentQ.explanation = explMatch[2];
                continue;
            }

            // 6. Mətnin davamı
            // Əgər variantlar hələ başlamayıbsa və cavab yoxdursa, bu sualın davamıdır
            if (currentQ.options.length === 0 && !currentQ.correctVariantId) {
                // "Sual 1:" və s. kimi açar sözləri təmizləyək ki, təkrarlanmasın
                if (!line.match(/^(Sual|Düzgün|Cavab|İzah)/i)) {
                    currentQ.text += " " + line;
                }
            } else if (currentQ.explanation) {
                currentQ.explanation += " " + line;
            } else if (currentQ.options.length > 0 && !currentQ.correctVariantId && !line.match(optionPattern)) {
                // Variantın davamı ola bilər (nadir hal, amma ehtimal var)
                const lastOpt = currentQ.options[currentQ.options.length - 1];
                lastOpt.text += " " + line;
            }
        }

        saveCurrentQ();

        console.log(`------------------------------------------------`);
        console.log(`YENİLƏNMİŞ ANALİZ NƏTİCƏSİ:`);
        console.log(`Ümumi tapılan potensial bloklar: ${questions.length}`);
        
        const validQuestions = questions.filter(q => q.correctVariantId);
        const missingAnswer = questions.filter(q => !q.correctVariantId);
        
        console.log(`Tam hazır suallar (Cavabı var): ${validQuestions.length}`);
        console.log(`Cavabı tapılmayan suallar: ${missingAnswer.length}`);
        
        // JSON faylına yazaq
        const outputPath = 'parsed_questions_full.json';
        fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
        console.log(`Məlumatlar '${outputPath}' faylına yazıldı.`);
        
        return questions;

    } catch (error) {
        console.error("Xəta:", error);
    }
}

if (require.main === module) {
    const filePath = process.argv[2] || 'quiz_full.txt.txt';
    parseToJSON(filePath);
}

module.exports = { parseToJSON };
