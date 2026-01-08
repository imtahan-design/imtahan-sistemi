
const fs = require('fs');

console.log("Dövlət Qulluğu üzrə ƏLAVƏ (Extra) suallar hazırlanır (Mövzu: Satınalma, Büdcə, Məhkəmə, Əmək)...");

let questions = [];
let lastId = 0;

// Mövcud sualları oxu
try {
    const data = fs.readFileSync('questions.json', 'utf8');
    questions = JSON.parse(data);
    if (questions.length > 0) {
        lastId = Math.max(...questions.map(q => q.id));
    }
    console.log(`Mövcud sual sayı: ${questions.length}. Son ID: ${lastId}`);
} catch (e) {
    questions = [];
}

// ---------------------------------------------------------
// NEW TOPICS DATA
// ---------------------------------------------------------

const laborLaw = [
    { q: "Əmək müqaviləsi hansı formada bağlanmalıdır?", a: "Yazılı formada", w: ["Şifahi formada", "Notarial qaydada", "Elektron formada (məcburi deyil)"] },
    { q: "Sınaq müddəti ən çoxu nə qədər ola bilər?", a: "3 ay", w: ["1 ay", "6 ay", "1 il"] },
    { q: "İşçinin işdən azad olunması barədə əmr işçiyə nə vaxt təqdim olunmalıdır?", a: "İşdən azad olunduğu gün", w: ["3 gün ərzində", "1 həftə ərzində", "Növbəti ayın əvvəlində"] },
    { q: "Həftəlik normal iş vaxtı nə qədərdir?", a: "40 saat", w: ["36 saat", "42 saat", "48 saat"] },
    { q: "Gecə vaxtı görülən işə görə haqq necə ödənilir?", a: "Artırılmış məbləğdə", w: ["Adi qaydada", "Ödənilmir", "Yalnız istirahət günü verilir"] }
];

const procurementLaw = [
    { q: "Dövlət satınalmalarında 'kotirovka sorğusu' üsulu nə vaxt tətbiq edilir?", a: "Ehtimal olunan qiymət 50.000 manatdan az olduqda", w: ["Ehtimal olunan qiymət 100.000 manatdan çox olduqda", "Həmişə tətbiq edilə bilər", "Yalnız tikinti işlərində"] },
    { q: "Açıq tenderin keçirilməsi üçün elan ən azı neçə gün əvvəl verilməlidir?", a: "30 iş günü", w: ["10 iş günü", "20 iş günü", "60 iş günü"] },
    { q: "Tender təklifinin təminatı təklif qiymətinin neçə faizini təşkil etməlidir?", a: "1-5 faiz", w: ["5-10 faiz", "10-15 faiz", "Məbləğ sabitdir"] },
    { q: "Satınalma müqaviləsinin yerinə yetirilməsi təminatı müqavilə məbləğinin neçə faizi həcmində müəyyən edilir?", a: "2-5 faiz", w: ["10 faiz", "20 faiz", "50 faiz"] }
];

const budgetSystem = [
    { q: "Dövlət büdcəsinin layihəsini kim hazırlayır?", a: "Nazirlər Kabineti", w: ["Milli Məclis", "Prezident", "Maliyyə Nazirliyi"] },
    { q: "Dövlət büdcəsini kim təsdiq edir?", a: "Milli Məclis", w: ["Prezident", "Nazirlər Kabineti", "Hesablama Palatası"] },
    { q: "Büdcə ili nə vaxt başlayır?", a: "1 yanvar", w: ["1 aprel", "1 sentyabr", "Novruz bayramında"] },
    { q: "Büdcənin icrasına nəzarəti kim həyata keçirir?", a: "Milli Məclis və Hesablama Palatası", w: ["Yalnız Maliyyə Nazirliyi", "Mərkəzi Bank", "Vergilər Xidməti"] }
];

const courtsLaw = [
    { q: "Azərbaycan Respublikasında məhkəmə hakimiyyətini kimlər həyata keçirir?", a: "Yalnız məhkəmələr", w: ["Məhkəmələr və Prokurorluq", "Ədliyyə Nazirliyi", "Polis orqanları"] },
    { q: "Hakimlər işlərinə baxarkən kimə tabedirlər?", a: "Yalnız Konstitusiyaya və qanunlara", w: ["Prezidentə", "Ədliyyə Nazirinə", "Məhkəmə sədrinə"] },
    { q: "Məhkəmə icraatı hansı dildə aparılır?", a: "Azərbaycan dilində", w: ["Tərəflərin seçdiyi dildə", "Rus dilində", "İngilis dilində"] },
    { q: "Məhkəmə qərarları kimin adından çıxarılır?", a: "Dövlət adından", w: ["Hakim adından", "Məhkəmə sədri adından", "Xalq adından"] }
];

// ---------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function createQuestion(data, category) {
    let opts = [data.a, ...data.w];
    opts = shuffleArray(opts);
    let correctIdx = opts.indexOf(data.a);

    return {
        id: ++lastId,
        category: category,
        question: data.q,
        options: opts,
        correct_option_id: correctIdx,
        explanation: `Doğru cavab: ${data.a}`
    };
}

// ---------------------------------------------------------
// GENERATION LOOP (700 Questions)
// ---------------------------------------------------------
console.log("Generasiya başlayır...");

for (let i = 0; i < 700; i++) {
    const rnd = Math.random();
    
    if (rnd < 0.25) {
        let base = laborLaw[Math.floor(Math.random() * laborLaw.length)];
        questions.push(createQuestion(base, "Əmək Məcəlləsi"));
    } else if (rnd < 0.5) {
        let base = procurementLaw[Math.floor(Math.random() * procurementLaw.length)];
        questions.push(createQuestion(base, "Dövlət Satınalmaları"));
    } else if (rnd < 0.75) {
        let base = budgetSystem[Math.floor(Math.random() * budgetSystem.length)];
        questions.push(createQuestion(base, "Büdcə Sistemi"));
    } else {
        let base = courtsLaw[Math.floor(Math.random() * courtsLaw.length)];
        questions.push(createQuestion(base, "Məhkəmələr və Hakimlər"));
    }
}

console.log(`Yeni Cəmi: ${questions.length}`);

try {
    fs.writeFileSync('questions.json', JSON.stringify(questions, null, 2));
    console.log("✅ questions.json uğurla yeniləndi (Əlavə suallar əlavə edildi)!");
} catch (e) {
    console.error("Yazma xətası:", e);
}
