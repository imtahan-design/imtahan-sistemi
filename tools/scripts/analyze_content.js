const fs = require('fs');

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
let suspiciousCount = 0;
let suspiciousIDs = [];

questions.forEach(q => {
    let isSuspicious = false;
    let reason = "";

    // 1. İzahda variant hərfinə istinad var, amma uyğun gəlmir?
    // Məsələn: "Düzgün cavab C bəndidir" yazıb, amma correct_option_id 0 (A) dır.
    const expl = q.explanation.toLowerCase();
    
    if (expl.includes("cavab a") || expl.includes("variant a") || expl.includes("bəndi a")) {
        if (q.correct_option_id !== 0) { isSuspicious = true; reason = "İzahda A deyilir, amma cavab başqadır"; }
    }
    if (expl.includes("cavab b") || expl.includes("variant b") || expl.includes("bəndi b")) {
        if (q.correct_option_id !== 1) { isSuspicious = true; reason = "İzahda B deyilir, amma cavab başqadır"; }
    }
    if (expl.includes("cavab c") || expl.includes("variant c") || expl.includes("bəndi c")) {
        if (q.correct_option_id !== 2) { isSuspicious = true; reason = "İzahda C deyilir, amma cavab başqadır"; }
    }
    if (expl.includes("cavab d") || expl.includes("variant d") || expl.includes("bəndi d")) {
        if (q.correct_option_id !== 3) { isSuspicious = true; reason = "İzahda D deyilir, amma cavab başqadır"; }
    }

    // 2. İzah sualın təkrarıdırsa
    if (q.explanation === q.question) {
        isSuspicious = true;
        reason = "İzah sualın eynisidir";
    }

    // 3. Variantlar bir-birinin eynisidirsə (artıq yoxlamışdıq, amma yenə də)
    const unique = new Set(q.options);
    if (unique.size < 4) {
        isSuspicious = true;
        reason = "Variantlar təkrarlanır";
    }

    if (isSuspicious) {
        console.log(`\nID: ${q.id}`);
        console.log(`Sual: ${q.question.substring(0, 50)}...`);
        console.log(`Səbəb: ${reason}`);
        console.log(`Cavab ID: ${q.correct_option_id}`);
        console.log(`İzah: ${q.explanation}`);
        suspiciousIDs.push(q.id);
        suspiciousCount++;
    }
});

console.log(`\nCəmi şübhəli sual: ${suspiciousCount}`);

// Silmək istəyirsinizsə bu hissəni aktivləşdirin
/*
if (suspiciousCount > 0) {
    const cleanQuestions = questions.filter(q => !suspiciousIDs.includes(q.id));
    fs.writeFileSync('questions.json', JSON.stringify(cleanQuestions, null, 2));
    console.log("Şübhəli suallar silindi!");
}
*/
