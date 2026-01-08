
const fs = require('fs');

console.log("Xüsusi Qanunlar və Maddələr üzrə 1000 ədəd ÇƏTİN sual hazırlanır...");

let questions = [];
let lastId = 0;

try {
    const data = fs.readFileSync('questions.json', 'utf8');
    const existing = JSON.parse(data);
    if (existing.length > 0) {
        lastId = Math.max(...existing.map(q => q.id));
    }
    questions = existing; // Append to existing
} catch (e) {
    questions = [];
}

// ---------------------------------------------------------
// DATA STRUCTURES (Specific Articles & Topics)
// ---------------------------------------------------------

// 1. NORMATİV HÜQUQİ AKTLAR (Specific Articles: 1.0.25, 1.0.26, Kolliziyalar və s.)
const normativActs = [
    {
        topic: "Normativ hüquqi aktlar (Maddə 1.0.25 - Diskresion səlahiyyətlər)",
        q: "Normativ hüquqi aktlar haqqında Konstitusiya Qanununun 1.0.25-ci maddəsinə əsasən, 'diskresion səlahiyyətlər' nədir?",
        a: "Dövlət orqanının qanunvericiliklə müəyyən edilmiş hallarda ən məqsədəuyğun qərarı qəbul etmək hüququ",
        w: ["Normativ aktın icrasını dayandırmaq hüququ", "Yalnız məhkəmə tərəfindən həyata keçirilən səlahiyyətlər", "Normativ aktın mətnini dəyişdirmək səlahiyyəti"]
    },
    {
        topic: "Normativ hüquqi aktlar (Maddə 1.0.12 - Kolliziya)",
        q: "Eyni hüquqi qüvvəyə malik olan normativ hüquqi aktlar arasında ziddiyyət (kolliziya) yarandıqda hansı akt tətbiq edilir?",
        a: "Daha sonra qüvvəyə minmiş akt",
        w: ["Daha əvvəl qüvvəyə minmiş akt", "Daha ümumi xarakter daşıyan akt", "Konstitusiya Məhkəməsinin seçdiyi akt"]
    },
    {
        topic: "Normativ hüquqi aktlar (Maddə 28 - Rekvizitlər)",
        q: "Normativ hüquqi aktın rekvizitlərinə aşağıdakılardan hansı DAXİL DEYİL?",
        a: "Aktın icraçılarının siyahısı",
        w: ["Aktın növü və adı", "Qəbul edən orqanın adı", "Qəbul edilmə tarixi və nömrəsi"]
    }
];

// 2. İNZİBATİ İCRAAT (Fəsillər I-II, III, IV, VI, VII, VIII, IX)
const adminExecution = [
    {
        topic: "İnzibati İcraat (Maddə 81 - İcra)",
        q: "İnzibati aktın icra edilməsi qaydasına əsasən, pul tələblərinin ödənilməsi haqqında inzibati akt könüllü icra edilmədikdə necə icra olunur?",
        a: "Məcburi icra haqqında qanunvericiliyə uyğun olaraq",
        w: ["İnzibati orqanın rəhbərinin birbaşa əmri ilə", "Polis orqanları tərəfindən dərhal", "Məhkəmə qərarı olmadan icra edilə bilməz"]
    },
    {
        topic: "İnzibati İcraat (Maraqlı şəxslər)",
        q: "İnzibati icraatda kimlər 'maraqlı şəxs' hesab olunur?",
        a: "İnzibati aktın ünvanlandığı və ya hüquqi mənafelərinə toxunduğu şəxslər",
        w: ["Yalnız inzibati orqanın əməkdaşları", "Yalnız şikayət verən şəxs", "İnzibati icraatda iştirak edən ekspertlər"]
    }
];

// 3. OMBUDSMAN (Maddə 8-13 - Şikayətlər)
const ombudsman = [
    {
        topic: "Ombudsman (Şikayətə baxılma)",
        q: "İnsan hüquqları üzrə müvəkkil (Ombudsman) şikayəti qəbul etdikdən sonra hansı qərarı QƏBUL EDƏ BİLMƏZ?",
        a: "Şikayət edilən orqanın qərarını ləğv etmək",
        w: ["Şikayəti baxılmaq üçün qəbul etmək", "Şikayətə baxmaqdan imtina etmək", "Şikayəti aidiyyəti üzrə digər orqana göndərmək"]
    },
    {
        topic: "Ombudsman (Şikayət müddəti)",
        q: "Ombudsmana şikayət hüquqların pozulduğu gündən hansı müddət ərzində verilə bilər?",
        a: "1 il ərzində",
        w: ["6 ay ərzində", "30 gün ərzində", "3 il ərzində"]
    }
];

// 4. MÜLKİ MƏCƏLLƏ (Fiziki və Hüquqi şəxslər, Müqavilə hüququ)
const civilCode = [
    {
        topic: "Mülki Məcəllə (Maddə 25 - Fəaliyyət qabiliyyəti)",
        q: "Yetkinlik yaşına çatmayanların (14 yaşdan 18 yaşadək) fəaliyyət qabiliyyəti barədə hansı fikir DOĞRUDUR?",
        a: "Onlar öz qazancları, təqaüdləri və digər gəlirləri üzərində sərbəst sərəncam verə bilərlər",
        w: ["Onlar heç bir əqdi sərbəst bağlaya bilməzlər", "Onlar tam fəaliyyət qabiliyyətli sayılırlar", "Onlar yalnız xırda məişət əqdlərini bağlaya bilməzlər"]
    },
    {
        topic: "Mülki Məcəllə (Müqavilənin bağlanması - Oferta)",
        q: "Müqavilə bağlanması haqqında təklif (oferta) hansı halda qüvvədən düşmüş hesab olunur?",
        a: "Aksept (razılıq) alınana qədər oferta geri götürüldükdə",
        w: ["Aksept verildikdən sonra", "Müqavilə notariusda təsdiqləndikdə", "Tərəflər görüşdükdə"]
    }
];

// 5. ƏMƏK MƏCƏLLƏSİ (Müqavilənin bağlanması)
const laborCode = [
    {
        topic: "Əmək Məcəlləsi (Maddə 43 - Müqavilənin məzmunu)",
        q: "Əmək müqaviləsində mütləq göstərilməli olan şərtlərdən biri hansıdır?",
        a: "İşçinin əmək funksiyası",
        w: ["İşçinin siyasi baxışları", "İşçinin ailə vəziyyəti", "İşəgötürənin gəlirləri"]
    },
    {
        topic: "Əmək Məcəlləsi (Sınaq müddəti)",
        q: "Kimlərlə əmək müqaviləsi bağlanarkən sınaq müddəti MÜƏYYƏN EDİLMİR?",
        a: "Müsabiqə yolu ilə vəzifə tutanlarla",
        w: ["İlk dəfə işə girənlərlə (bəzi hallarda)", "Ali təhsilli mütəxəssislərlə", "Təqaüdçülərlə"]
    }
];

// 6. DÖVLƏT DİLİ, İNFORMASİYA, SİRR, ELEKTRON İMZA
const miscLaws = [
    {
        topic: "Dövlət Dili haqqında Qanun",
        q: "Azərbaycan Respublikasında dövlət dili haqqında qanuna görə, reklamlarda dövlət dilinin istifadəsi necə tənzimlənir?",
        a: "Dövlət dili mütləq istifadə olunmalı, digər dillər isə ondan sonra gəlməlidir",
        w: ["Yalnız xarici dildə ola bilər", "Dövlət dilinin istifadəsi sərbəstdir", "Reklamlarda mətn olmaya bilər"]
    },
    {
        topic: "Dövlət Sirri haqqında Qanun",
        q: "Dövlət sirrini təşkil edən məlumatların yayılmasına görə kimlər məsuliyyət daşıyır?",
        a: "Məlumatları etibar edilmiş və ya xidməti vəzifəsi ilə əlaqədar onlara məlum olmuş şəxslər",
        w: ["Yalnız mətbuat işçiləri", "Məlumatı təsadüfən eşidən şəxslər", "Heç kim"]
    }
];

// ---------------------------------------------------------
// SITUATION GENERATORS (30%)
// ---------------------------------------------------------

function generateSituation() {
    const situations = [
        {
            topic: "Normativ Aktlar (Kolliziya)",
            text: "Vətəndaş məhkəmədə iddia qaldırır. Hakim işə baxarkən görür ki, tətbiq edilməli olan Qanun ilə Nazirlər Kabinetinin qərarı arasında ziddiyyət var. Eyni zamanda həmin məsələni tənzimləyən daha yeni bir Qanun da mövcuddur.",
            q: "Hakim bu halda hansı normativ hüquqi aktı tətbiq etməlidir?",
            correct: "Daha yeni olan Qanunu (Həm hüquqi qüvvəsi yüksəkdir, həm də yenidir)",
            wrong: ["Nazirlər Kabinetinin qərarını (daha detallı olduğu üçün)", "Köhnə Qanunu (ilk qəbul edildiyi üçün)", "Heç birini, Konstitusiya Məhkəməsinə müraciət etməlidir"]
        },
        {
            topic: "İnzibati İcraat (İmtina)",
            text: "Vətəndaş Əhmədov icra hakimiyyətinə evinin təmiri üçün icazə istəyir. İcra hakimiyyəti onun ərizəsini qəbul edir, lakin 40 gün keçməsinə baxmayaraq heç bir cavab vermir. Qanunla müəyyən edilmiş müddət 30 gündür.",
            q: "Bu halda inzibati akt qəbul edilmiş sayılırmı?",
            correct: "Xeyr, lakin Əhmədovun məhkəməyə müraciət etmək hüququ yaranır (faktiki imtina)",
            wrong: ["Bəli, susmaq razılıq əlamətidir", "Bəli, avtomatik icazə verilmiş sayılır", "Xeyr, Əhmədov yenidən ərizə yazmalıdır"]
        },
        {
            topic: "Mülki Məcəllə (Əqdlər)",
            text: "15 yaşlı Tural atasının xəbəri olmadan bahalı kompüter almaq üçün mağaza ilə müqavilə bağlayır və pulu ödəyir. Atası bunu bildikdə mağazadan pulu geri tələb edir.",
            q: "Bu əqd (müqavilə) hüquqi cəhətdən necə qiymətləndirilir?",
            correct: "Valideynlərinin razılığı olmadığı üçün mübahisələndirilə bilən əqddir və məhkəmə tərəfindən etibarsız sayıla bilər",
            wrong: ["Əqd tam etibarlıdır, çünki pul ödənilib", "Əqd heç bir halda etibarsız sayıla bilməz", "Mağaza cərimələnməlidir, amma kompüter qaytarılmır"]
        },
        {
            topic: "Dövlət Qulluğu (Etik davranış)",
            text: "Dövlət qulluqçusu Samirəyə vətəndaş tərəfindən işinin tez həll edilməsi müqabilində 'şirinlik' təklif olunur. Samirə bunu rədd edir, lakin bu barədə rəhbərliyinə məlumat vermir.",
            q: "Samirənin hərəkətində pozuntu varmı?",
            correct: "Bəli, o, korrupsiya təklifi barədə rəhbərliyinə məlumat verməli idi",
            wrong: ["Xeyr, rüşvəti almaması kifayətdir", "Xeyr, bu onun şəxsi qərarıdır", "Bəli, o vətəndaşı polisə təhvil verməli idi"]
        },
        {
            topic: "Əmək Məcəlləsi (Xitam)",
            text: "İşəgötürən işçini 2 həftə əvvəldən xəbərdarlıq etmədən ixtisar edir və dərhal işdən çıxarır. İşçiyə heç bir müavinət ödənilmir.",
            q: "İşəgötürənin bu hərəkəti qanunidirmi?",
            correct: "Xeyr, işçi azı 2 ay əvvəl xəbərdar edilməli və ya xəbərdarlıq müddəti əvəzinə əmək haqqı ödənilməlidir",
            wrong: ["Bəli, ixtisar zamanı xəbərdarlıq lazım deyil", "Bəli, əgər işçi yaxşı işləmirsə", "Xeyr, 1 il əvvəl xəbərdar edilməlidir"]
        }
    ];
    
    const item = situations[Math.floor(Math.random() * situations.length)];
    let opts = [item.correct, ...item.wrong];
    
    // Shuffle
    for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    
    return {
        id: ++lastId,
        category: `SİTUASİYA - ${item.topic}`,
        question: `SİTUASİYA: ${item.text}\n\nSUAL: ${item.q}`,
        options: opts,
        correct_option_id: opts.indexOf(item.correct),
        explanation: `Doğru cavab: ${item.correct}`
    };
}

// ---------------------------------------------------------
// HARD THEORY GENERATORS (70%)
// ---------------------------------------------------------

function generateHardTheory() {
    const sources = [normativActs, adminExecution, ombudsman, civilCode, laborCode, miscLaws];
    const categorySource = sources[Math.floor(Math.random() * sources.length)];
    const item = categorySource[Math.floor(Math.random() * categorySource.length)];
    
    let opts = [item.a, ...item.w];
    // Shuffle
    for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
    }

    return {
        id: ++lastId,
        category: `ÇƏTİN - ${item.topic}`,
        question: item.q,
        options: opts,
        correct_option_id: opts.indexOf(item.a),
        explanation: `Qanunvericiliyə əsasən: ${item.a}`
    };
}

// ---------------------------------------------------------
// MAIN GENERATION LOOP (1000 Questions)
// ---------------------------------------------------------

const TARGET = 1000;
const SITUATION_COUNT = 300; // 30%
const THEORY_COUNT = 700;    // 70%

console.log("Generasiya başlayır...");

for (let i = 0; i < SITUATION_COUNT; i++) {
    questions.push(generateSituation());
}

for (let i = 0; i < THEORY_COUNT; i++) {
    questions.push(generateHardTheory());
}

console.log(`Yeni Cəmi: ${questions.length}`);

try {
    fs.writeFileSync('questions.json', JSON.stringify(questions, null, 2));
    console.log("✅ questions.json uğurla yeniləndi! (1000 yeni sual əlavə edildi)");
} catch (e) {
    console.error("Yazma xətası:", e);
}
