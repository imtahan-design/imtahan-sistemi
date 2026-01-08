const fs = require('fs');

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
console.log(`Cəmi sual sayı: ${questions.length}`);

let badQuestions = [];

questions.forEach((q, index) => {
    let issues = [];

    // 1. Variant sayı
    if (!q.options || q.options.length !== 4) {
        issues.push(`Variant sayı səhvdir: ${q.options ? q.options.length : 0}`);
    }

    // 2. Düzgün cavab indeksi
    if (q.correct_option_id < 0 || q.correct_option_id > 3) {
        issues.push(`Düzgün cavab indeksi səhvdir: ${q.correct_option_id}`);
    }

    // 3. Boş mətnlər
    if (!q.question || q.question.trim().length < 5) {
        issues.push("Sual mətni çox qısadır və ya yoxdur");
    }
    
    // 4. Məntiqsiz İzah (Sadə yoxlama)
    if (q.explanation && q.explanation.length < 5) {
        issues.push("İzah çox qısadır");
    }

    // 5. Variantların təkrarlanması
    const uniqueOptions = new Set(q.options);
    if (uniqueOptions.size !== q.options.length) {
        issues.push("Variantlar təkrarlanır");
    }

    if (issues.length > 0) {
        badQuestions.push({
            id: q.id || index,
            question: q.question,
            issues: issues
        });
    }
});

console.log(`\nProblemli sual sayı: ${badQuestions.length}`);

if (badQuestions.length > 0) {
    console.log(JSON.stringify(badQuestions.slice(0, 10), null, 2)); // İlk 10 dənəsini göstər
    
    // Fayla yaz
    fs.writeFileSync('bad_questions_report.json', JSON.stringify(badQuestions, null, 2));
    console.log("\nTam hesabat 'bad_questions_report.json' faylına yazıldı.");
}
