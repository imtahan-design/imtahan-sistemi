
const fs = require('fs');

try {
    const data = fs.readFileSync('questions.json', 'utf8');
    const questions = JSON.parse(data);
    
    // Son 50 sualı götür
    const last50 = questions.slice(-50);
    
    let output = "=== DÖVLƏT QULLUĞU İMTAHANI ÜÇÜN NÜMUNƏ SUALLAR (SON 50 ƏDƏD) ===\n\n";
    
    last50.forEach((q, index) => {
        output += `SUAL ${index + 1}: [${q.category}]\n`;
        output += `${q.question}\n\n`;
        
        q.options.forEach((opt, i) => {
            const letter = String.fromCharCode(65 + i); // A, B, C, D
            output += `${letter}) ${opt}\n`;
        });
        
        output += `\nDÜZGÜN CAVAB: ${q.options[q.correct_option_id]}\n`;
        output += `İZAH: ${q.explanation}\n`;
        output += "--------------------------------------------------------\n\n";
    });

    fs.writeFileSync('suallar_numune.txt', output);
    console.log("Fayl hazırdır: suallar_numune.txt");
    
} catch (e) {
    console.error("Xəta:", e.message);
}
