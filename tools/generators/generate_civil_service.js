
const fs = require('fs');

console.log("Dövlət Qulluğu üzrə xüsusi baza yaradılır (700 sual)...");

// Mövzular və Mənbələr (Sizin siyahı əsasında)
const topics = [
    { name: "Azərbaycan Respublikasının Konstitusiyası", type: "Constitution" },
    { name: "Dövlət qulluğu haqqında Qanun", type: "CivilService" },
    { name: "Dövlət qulluqçularının etik davranış qaydaları", type: "Ethics" },
    { name: "Korrupsiyaya qarşı mübarizə haqqında Qanun", type: "Corruption" },
    { name: "Məlumat azadlığı haqqında Qanun", type: "Information" },
    { name: "Vətəndaşların müraciətləri haqqında Qanun", type: "Appeals" },
    { name: "İnzibati İcraat haqqında Qanun", type: "AdminExecution" },
    { name: "Dövlət satınalmaları haqqında Qanun", type: "Procurement" },
    { name: "Məhkəmələr və hakimlər haqqında Qanun", type: "Courts" }
];

let questions = [];
let idCounter = 0;

// ---------------------------------------------------------
// 1. DATA BANK (Məlumat Bazası)
// ---------------------------------------------------------

const deadlines = [
    { law: "Vətəndaşların müraciətləri", action: "müraciətə baxılma müddəti", time: "15 iş günü", extra: "əlavə öyrənilmə tələb olunarsa 30 iş gününədək uzadıla bilər" },
    { law: "Vətəndaşların müraciətləri", action: "hərbi qulluqçuların müraciətlərinə baxılma", time: "15 gün", extra: "dərhal baxılmalıdır" },
    { law: "İnzibati İcraat", action: "inzibati icraatın müddəti", time: "30 gün", extra: "mürəkkəb hallarda daha 30 gün uzadıla bilər" },
    { law: "Dövlət qulluğu", action: "sınaq müddəti", time: "6 ay", extra: "3 ay sınaq, 3 ay mentorluq" },
    { law: "Dövlət qulluğu", action: "fəaliyyətin qiymətləndirilməsi", time: "iln sonunda", extra: "təqvim ili başa çatdıqdan sonra" },
    { law: "Korrupsiya", action: "maliyyə xarakterli məlumatların təqdim edilməsi", time: "hər il", extra: "" },
    { law: "Normativ hüquqi aktlar", action: "Prezidentin fərmanlarının qüvvəyə minməsi", time: "dərc edildiyi gün", extra: "əgər aktda başqa müddət göstərilməyibsə" },
    { law: "Məlumat azadlığı", action: "informasiya sorğusuna cavab", time: "7 iş günü", extra: "" }
];

const ethicsPrinciples = [
    "Qanunçuluq", "Vicdanlı davranış", "Peşəkarlıq və fərdi məsuliyyət", "Sadiqlik", 
    "İctimai etimad", "İnsanların hüquq, azadlıq və qanuni maraqlarına hörmət", 
    "Mədəni davranış", "Əmr, sərəncam və ya tapşırıqların yerinə yetirilməsi", 
    "Qərəzsizlik", "Maddi və qeyri-maddi nemətlərin, imtiyazların və güzəştlərin əldə edilməsinə yol verilməməsi",
    "Korrupsiyanın qarşısının alınması", "Hədiyyə almaqla əlaqədar məhdudiyyətlər", 
    "Konfliktlərin qarşısının alınması", "Məlumatdan istifadə", "Dövlət əmlakından istifadə"
];

const corruptionOffenses = [
    "Vəzifəli şəxsin qanunsuz olaraq maddi nemətlər qəbul etməsi",
    "Yaxın qohumların birbaşa tabeçilikdə işləməsi",
    "Vəzifə səlahiyyətlərindən sui-istifadə etmə",
    "Hədiyyə qəbul etmə (55 manatdan yuxarı)",
    "Maliyyə bəyannaməsini vaxtında təqdim etməmə"
];

const classifications = [
    { type: "İnzibati", group: "Ali", tasks: "Dövlət orqanının rəhbəri" },
    { type: "İnzibati", group: "1-ci təsnifat", tasks: "Rəhbər müavini, Aparat rəhbəri" },
    { type: "İnzibati", group: "2-ci təsnifat", tasks: "Şöbə müdiri" },
    { type: "İnzibati", group: "3-cü təsnifat", tasks: "Sektor müdiri" },
    { type: "Yardımçı", group: "Texniki", tasks: "Kargüzar, Sürücü" }
];

// ---------------------------------------------------------
// 2. HELPER FUNCTIONS (Köməkçi Funksiyalar)
// ---------------------------------------------------------

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateOptions(correct, pool) {
    let opts = [correct];
    while (opts.length < 4) {
        let wrong = getRandomItem(pool);
        if (wrong !== correct && !opts.includes(wrong)) {
            opts.push(wrong);
        }
    }
    // Shuffle
    let correctIndex = Math.floor(Math.random() * 4);
    [opts[0], opts[correctIndex]] = [opts[correctIndex], opts[0]];
    return { options: opts, index: correctIndex };
}

// ---------------------------------------------------------
// 3. GENERATORS (Generatorlar)
// ---------------------------------------------------------

// --- GENERATOR A: Müddətlər və Rəqəmlər (Theory) ---
function generateDeadlineQuestion() {
    const item = getRandomItem(deadlines);
    const pool = ["3 gün", "7 gün", "10 gün", "15 gün", "30 gün", "1 ay", "6 ay", "1 il", "Dərhal", "Növbəti iş günü"];
    
    const qData = generateOptions(item.time, pool);
    
    return {
        id: ++idCounter,
        category: "Qanunvericilik (Müddətlər)",
        question: `"${item.law}" qanunvericiliyinə əsasən, ${item.action} müddəti nə qədərdir?`,
        options: qData.options,
        correct_option_id: qData.index,
        explanation: `Qanuna əsasən, ${item.action} üçün müddət: ${item.time}. ${item.extra}`
    };
}

// --- GENERATOR B: Etik Davranış (Situasiya) ---
function generateEthicsSituation() {
    const principle = getRandomItem(ethicsPrinciples);
    const names = ["Əli", "Vəli", "Aysel", "Günel", "Rəşad", "Nigar"];
    const name = getRandomItem(names);
    
    let scenario = "";
    let answer = "";
    let explanation = "";
    
    if (principle === "Vicdanlı davranış") {
        scenario = `Dövlət qulluqçusu ${name}, vətəndaşa xidmət göstərərkən kobudluq edir və işini keyfiyyətsiz yerinə yetirir.`;
        answer = "Vicdanlı davranış";
        explanation = "Dövlət qulluqçusu öz vəzifələrini səmərəli və vicdanla yerinə yetirməlidir.";
    } else if (principle === "Korrupsiyanın qarşısının alınması") {
        scenario = `${name} vətəndaşdan işini tez həll etmək üçün əlavə ödəniş tələb edir.`;
        answer = "Korrupsiyanın qarşısının alınması";
        explanation = "Dövlət qulluqçusu qanunsuz maddi və qeyri-maddi nemətlər tələb etməməlidir.";
    } else if (principle === "Hədiyyə almaqla əlaqədar məhdudiyyətlər") {
        scenario = `${name} bayramda vətəndaşdan 100 manat dəyərində bahalı saat hədiyyə qəbul edir.`;
        answer = "Hədiyyə almaqla əlaqədar məhdudiyyətlər";
        explanation = "Dövlət qulluqçusu xidməti vəzifələri ilə əlaqədar heç bir hədiyyə qəbul etməməlidir (qonaqpərvərlik istisna olmaqla).";
    } else if (principle === "Mədəni davranış") {
        scenario = `${name} iş yoldaşları ilə yüksək tonla danışır və etik olmayan ifadələr işlədir.`;
        answer = "Mədəni davranış";
        explanation = "Dövlət qulluqçusu bütün şəxslərlə münasibətdə nəzakətli və təmkinli olmalıdır.";
    } else if (principle === "Sadiqlik") {
        scenario = `${name} dövlət orqanının nüfuzuna xələl gətirə biləcək məlumatları sosial şəbəkədə paylaşır.`;
        answer = "Sadiqlik";
        explanation = "Dövlət qulluqçusu dövlət orqanının nüfuzunu qorumalıdır.";
    } else {
        scenario = `${name} rəhbərliyin qanuni göstərişini yerinə yetirməkdən imtina edir.`;
        answer = "Əmr, sərəncam və ya tapşırıqların yerinə yetirilməsi";
        explanation = "Dövlət qulluqçusu rəhbərin qanuni əmrlərini yerinə yetirməyə borcludur.";
    }

    const qData = generateOptions(answer, ethicsPrinciples);

    return {
        id: ++idCounter,
        category: "Etik Davranış (Situasiya)",
        question: `Situasiya: ${scenario} \nBu halda dövlət qulluqçusu hansı etik davranış prinsipini pozmuşdur?`,
        options: qData.options,
        correct_option_id: qData.index,
        explanation: explanation
    };
}

// --- GENERATOR C: Konstitusiya (Theory) ---
function generateConstitutionQuestion() {
    const subjects = [
        { role: "Azərbaycan Respublikasının Prezidenti", power: "Silahlı Qüvvələrin Ali Baş Komandanıdır", wrong: ["Milli Məclis", "Nazirlər Kabineti", "Konstitusiya Məhkəməsi"] },
        { role: "Milli Məclis", power: "Qanunları qəbul edir", wrong: ["Prezident", "Nazirlər Kabineti", "Ali Məhkəmə"] },
        { role: "Nazirlər Kabineti", power: "Dövlət büdcəsinin layihəsini hazırlayır", wrong: ["Milli Məclis", "Prezident", "Mərkəzi Bank"] },
        { role: "Konstitusiya Məhkəməsi", power: "Qanunların Konstitusiyaya uyğunluğunu yoxlayır", wrong: ["Ali Məhkəmə", "Prokurorluq", "Ədliyyə Nazirliyi"] },
        { role: "Azərbaycan xalqı", power: "Dövlət hakimiyyətinin yeganə mənbəyidir", wrong: ["Prezident", "Milli Məclis", "Dövlət"] }
    ];

    const subj = getRandomItem(subjects);
    const qData = generateOptions(subj.role, subj.wrong.concat(["Ombudsman", "Mərkəzi Seçki Komissiyası"]));

    return {
        id: ++idCounter,
        category: "Konstitusiya",
        question: `${subj.power} - bu səlahiyyət kimə aiddir?`,
        options: qData.options,
        correct_option_id: qData.index,
        explanation: `Konstitusiyaya əsasən, bu səlahiyyət ${subj.role}nə aiddir.`
    };
}

// --- GENERATOR D: Dövlət Qulluğu (Təsnifatlar) ---
function generateClassificationQuestion() {
    const item = getRandomItem(classifications);
    const pool = ["Ali", "1-ci təsnifat", "2-ci təsnifat", "3-cü təsnifat", "4-cü təsnifat", "5-ci təsnifat", "6-cı təsnifat", "7-ci təsnifat"];
    
    const qData = generateOptions(item.group, pool);

    return {
        id: ++idCounter,
        category: "Dövlət Qulluğu (Təsnifat)",
        question: `"${item.tasks}" vəzifəsi inzibati vəzifələrin hansı təsnifatına aiddir? (Nümunəvi)`,
        options: qData.options,
        correct_option_id: qData.index,
        explanation: `${item.tasks} vəzifəsi adətən ${item.group} üzrə təsnif edilir.`
    };
}

// --- GENERATOR E: Korrupsiya (Situasiya) ---
function generateCorruptionSituation() {
    const scenarios = [
        { q: "Vəzifəli şəxs öz yaxın qohumunu birbaşa tabeçiliyinə işə qəbul edə bilərmi?", a: "Xeyr, bu qadağandır", exp: "Korrupsiyaya qarşı mübarizə haqqında qanuna görə, yaxın qohumlar birbaşa tabeçilikdə işləyə bilməzlər (istisnalar xaric)." },
        { q: "Vəzifəli şəxs ilin sonunda hansı sənədi təqdim etməlidir?", a: "Maliyyə xarakterli məlumatlar barədə bəyannamə", exp: "Vəzifəli şəxslər hər il maliyyə bəyannaməsi təqdim etməlidirlər." },
        { q: "Dövlət qulluqçusu dəyəri 55 manatdan yuxarı olan hədiyyəni qəbul edərsə nə etməlidir?", a: "Hədiyyəni dövlət orqanına təhvil verməlidir", exp: "55 manatdan yuxarı hədiyyələr dövlət mülkiyyətinə keçir." }
    ];
    
    const item = getRandomItem(scenarios);
    const wrongAnswers = ["Bəli, olar", "Rəhbərin icazəsi ilə olar", "Yalnız müqavilə əsasında olar", "Xeyr, amma başqa şöbədə olmaz", "Ərizə yazmalıdır", "Heç nə etməməlidir", "Özündə saxlaya bilər"];
    
    const qData = generateOptions(item.a, wrongAnswers);

    return {
        id: ++idCounter,
        category: "Korrupsiya (Situasiya)",
        question: item.q,
        options: qData.options,
        correct_option_id: qData.index,
        explanation: item.exp
    };
}

// ---------------------------------------------------------
// 4. MAIN GENERATION LOOP (Əsas Dövr)
// ---------------------------------------------------------

// Hədəf: 700 sual
// Paylanma: 
// 100 Konstitusiya
// 150 Dövlət Qulluğu (Nəzəri + Təsnifat)
// 150 Etik Davranış (Situasiya ağırlıqlı)
// 100 Korrupsiya
// 100 Müddətlər (Qarışıq qanunlar)
// 100 Ümumi (Digər qanunlar)

console.log("Generating Constitution questions...");
for(let i=0; i<100; i++) questions.push(generateConstitutionQuestion());

console.log("Generating Civil Service questions...");
for(let i=0; i<150; i++) {
    if(i % 2 === 0) questions.push(generateClassificationQuestion());
    else questions.push(generateDeadlineQuestion()); // Mix with deadlines related to civil service
}

console.log("Generating Ethics situations...");
for(let i=0; i<150; i++) questions.push(generateEthicsSituation());

console.log("Generating Corruption situations...");
for(let i=0; i<100; i++) questions.push(generateCorruptionSituation());

console.log("Generating Mixed Deadline questions...");
for(let i=0; i<100; i++) questions.push(generateDeadlineQuestion());

console.log("Generating General Law questions...");
// Fill the rest up to 700 (approx 100 more)
while(questions.length < 700) {
    const rnd = Math.random();
    if(rnd < 0.3) questions.push(generateConstitutionQuestion());
    else if(rnd < 0.6) questions.push(generateEthicsSituation());
    else questions.push(generateCorruptionSituation());
}

console.log(`Total Generated: ${questions.length}`);

// Save to file
try {
    fs.writeFileSync('questions.json', JSON.stringify(questions, null, 2));
    console.log("✅ questions.json faylı uğurla yeniləndi! (700 sual)");
} catch (e) {
    console.error("Yadda saxlama xətası:", e);
}
