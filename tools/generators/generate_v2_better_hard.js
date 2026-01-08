const fs = require('fs');

// ------------------------------------------------------------------
// UTILITIES
// ------------------------------------------------------------------
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ------------------------------------------------------------------
// DATA POOLS (Dynamic Elements)
// ------------------------------------------------------------------
const names = ["Əli", "Vəli", "Samir", "Aysel", "Nərgiz", "Leyla", "Murad", "Tural", "Günel", "Fərid"];
const positions = ["baş məsləhətçi", "böyük məsləhətçi", "aparıcı məsləhətçi", "şöbə müdiri", "sektor müdiri"];
const organs = ["Nazirlikdə", "Agentlikdə", "Komitədə", "İcra Hakimiyyətində", "Xidmətdə"];

// ------------------------------------------------------------------
// GENERATOR MODULES
// ------------------------------------------------------------------

// MODULE 1: DISCIPLINARY ACTIONS (İntizam Tənbehləri)
// Logic: Generates a scenario where a civil servant commits a violation.
// Options: Always distinct disciplinary penalties.
function generateDisciplinaryQuestion() {
    const person = getRandomItem(names);
    const position = getRandomItem(positions);
    const organ = getRandomItem(organs);

    const scenarios = [
        {
            violation: "üzrlü səbəb olmadan işə gəlməyib (bir iş günü)",
            correct: "Töhmət",
            explanation: "Dövlət qulluqçusu üzrlü səbəb olmadan işə gəlmədikdə ona 'Töhmət' intizam tənbehi tətbiq edilə bilər.",
            severity: "low"
        },
        {
            violation: "xidməti vəzifələrini kobud şəkildə pozub",
            correct: "Dövlət qulluğundan azad edilmə",
            explanation: "Vəzifə funksiyalarının kobud şəkildə pozulması dövlət qulluğundan azad edilməyə əsas verir.",
            severity: "high"
        },
        {
            violation: "rəhbərin qanuni göstərişini yerinə yetirməyib",
            correct: "Vəzifə maaşının 5 faizindən 30 faizinədək azaldılması",
            explanation: "Rəhbərin qanuni göstərişini yerinə yetirməmək vəzifə maaşının azaldılması ilə cəzalandırıla bilər.",
            severity: "medium"
        },
        {
            violation: "etik davranış qaydalarını pozub",
            correct: "Töhmət",
            explanation: "Etik davranış qaydalarının pozulması intizam məsuliyyəti yaradır və adətən töhmət tətbiq edilir.",
            severity: "low"
        }
    ];

    const scenarioData = getRandomItem(scenarios);

    const questionText = `${organ} ${position} vəzifəsində çalışan ${person} ${scenarioData.violation}. \n\nBu halda ona hansı intizam tənbehi tətbiq edilə bilər?`;

    // Context-aware options (All are penalties)
    const allPenalties = [
        "Töhmət",
        "Dövlət qulluğundan azad edilmə",
        "Vəzifə maaşının 5 faizindən 30 faizinədək azaldılması",
        "Daha aşağı təsnifatdan olan vəzifəyə keçirilmə"
    ];

    // Ensure correct answer is in options
    let options = [...allPenalties];
    // If correct answer is not in standard list (unlikely here but good practice), add it
    if (!options.includes(scenarioData.correct)) {
        options[0] = scenarioData.correct;
    }

    // Shuffle options
    options = shuffleArray(options);
    const correctIdx = options.indexOf(scenarioData.correct);

    return {
        category: "ÇƏTİN - Dövlət Qulluğu (Situasiya)",
        question: questionText,
        options: options,
        correct_option_id: correctIdx,
        explanation: scenarioData.explanation
    };
}

// MODULE 2: CORRUPTION & GIFTS (Korrupsiya)
// Logic: Checks gift value limits and reporting obligations.
function generateCorruptionQuestion() {
    const person = getRandomItem(names);
    const value = getRandomInt(40, 70); // 40-70 AZN range
    const limit = 55;
    
    const isAboveLimit = value > limit;
    
    const questionText = `${person} xidməti vəzifələrini icra edərkən ona təqdim olunan ${value} manat dəyərində hədiyyəni qəbul edir. \n\nQanunvericiliyə əsasən onun bu hərəkəti necə qiymətləndirilir?`;

    let correct, explanation;
    if (isAboveLimit) {
        correct = "Qanunsuzdur, hədiyyə dövlətə təhvil verilməlidir";
        explanation = `Hədiyyənin dəyəri ${limit} manatdan yuxarı olduğu üçün (${value} AZN) o, dövlətə məxsus hesab edilir və təhvil verilməlidir.`;
    } else {
        correct = "Qanunidir, heç bir tədbir görülməsinə ehtiyac yoxdur";
        explanation = `Hədiyyənin dəyəri ${limit} manatdan aşağı olduğu üçün (${value} AZN) onu qəbul etmək korrupsiya hüquqpozması sayılmır.`;
    }

    // Context-aware options (Legal assessments)
    const wrongOptions = [
        "Qanunsuzdur, dərhal imtina etməli idi",
        "Yalnız rəhbərin icazəsi ilə qəbul edə bilər",
        "Hədiyyənin dəyərini ödəməklə özündə saxlaya bilər"
    ];

    if (isAboveLimit) {
        // If above limit, "Qanunidir" is a wrong option
        wrongOptions.push("Qanunidir, heç bir tədbir görülməsinə ehtiyac yoxdur");
    } else {
        // If below limit, "Qanunsuzdur..." is a wrong option
        wrongOptions.push("Qanunsuzdur, hədiyyə dövlətə təhvil verilməlidir");
    }

    let options = [correct, ...wrongOptions.slice(0, 3)]; // Pick 3 wrongs
    options = shuffleArray(options);
    const correctIdx = options.indexOf(correct);

    return {
        category: "ÇƏTİN - Korrupsiya (Situasiya)",
        question: questionText,
        options: options,
        correct_option_id: correctIdx,
        explanation: explanation
    };
}

// MODULE 3: ADMINISTRATIVE EXECUTION (İnzibati İcraat - Müddətlər)
// Logic: Focuses on deadlines (days).
function generateAdminTimeQuestion() {
    const topics = [
        {
            event: "İnzibati şikayətə baxılması",
            time: "1 ay",
            wrongs: ["15 gün", "10 gün", "3 ay", "7 gün"]
        },
        {
            event: "Müraciətin aidiyyəti üzrə göndərilməsi",
            time: "3 iş günü",
            wrongs: ["5 iş günü", "1 iş günü", "7 gün", "Dərhal"]
        },
        {
            event: "İnzibati aktın qüvvəyə minməsi (rəsmi elan olunduğu gündən)",
            time: "Rəsmi elan olunduğu gündən",
            wrongs: ["İmzalandığı gündən", "Qəbul edildiyi gündən", "3 gün sonra", "10 gün sonra"]
        }
    ];

    const t = getRandomItem(topics);
    const questionText = `İnzibati İcraat haqqında Qanuna əsasən, ${t.event.toLowerCase()} hansı müddətdə həyata keçirilməlidir?`;

    let options = [t.time, ...t.wrongs.slice(0, 3)];
    options = shuffleArray(options);
    const correctIdx = options.indexOf(t.time);

    return {
        category: "ÇƏTİN - İnzibati İcraat (Müddətlər)",
        question: questionText,
        options: options,
        correct_option_id: correctIdx,
        explanation: `Qanunvericiliyə əsasən düzgün müddət: ${t.time}.`
    };
}

// MODULE 4: CONFLICT OF INTEREST (Maraqlar Toqquşması)
function generateConflictQuestion() {
    const person = getRandomItem(names);
    
    const scenarios = [
        {
            situation: "dövlət qulluqçusunun yaxın qohumu onun nəzarət etdiyi şirkətdə işləyir",
            action: "Bu barədə rəhbərliyə məlumat verməlidir",
            explanation: "Dövlət qulluqçusu xidməti vəzifələrini yerinə yetirərkən maraqlar toqquşmasına səbəb ola biləcək hallarda (məsələn, yaxın qohumu ilə əlaqəli məsələlərdə) rəhbərliyə məlumat verməlidir."
        },
        {
            situation: "başqa bir ödənişli vəzifə tutmaq təklifi alır",
            action: "Dövlət qulluqçusu başqa ödənişli vəzifə tuta bilməz (elmi, pedaqoji və yaradıcılıq istisna olmaqla)",
            explanation: "Qanunvericiliyə əsasən dövlət qulluqçusu elmi, pedaqoji və yaradıcılıq fəaliyyəti istisna olmaqla, başqa ödənişli fəaliyyətlə məşğul ola bilməz."
        },
        {
            situation: "əvvəl işlədiyi şirkətlə bağlı qərar qəbul etməlidir",
            action: "Maraqlar toqquşması barədə məlumat verib qərar qəbul etməkdən imtina etməlidir",
            explanation: "Qərəzsizliyi şübhə altına alan hallarda dövlət qulluqçusu özünü kənarlaşdırmalıdır."
        }
    ];

    const s = getRandomItem(scenarios);
    const questionText = `${person} ${s.situation}. Bu halda o necə davranmalıdır?`;

    const options = [
        s.action,
        "Heç bir tədbir görməyə ehtiyac yoxdur",
        "Yalnız işdən sonra bu məsələ ilə məşğul ola bilər",
        "Rəhbərliyin icazəsi olmadan qərar qəbul edə bilər"
    ];

    const shuffled = shuffleArray(options);
    const correctIdx = shuffled.indexOf(s.action);

    return {
        category: "ÇƏTİN - Maraqlar Toqquşması (Situasiya)",
        question: questionText,
        options: shuffled,
        correct_option_id: correctIdx,
        explanation: s.explanation
    };
}

// ------------------------------------------------------------------
// MAIN GENERATION LOGIC
// ------------------------------------------------------------------

function generateBatch(count) {
    let newQuestions = [];
    
    // Load existing to get last ID
    let lastId = 0;
    try {
        const raw = fs.readFileSync('questions.json', 'utf8');
        const existing = JSON.parse(raw);
        if (existing.length > 0) lastId = Math.max(...existing.map(q => q.id));
    } catch(e) {
        console.log("No existing DB found, starting fresh.");
    }

    for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let q;
        
        if (rand < 0.3) q = generateDisciplinaryQuestion();
        else if (rand < 0.55) q = generateCorruptionQuestion();
        else if (rand < 0.8) q = generateAdminTimeQuestion();
        else q = generateConflictQuestion(); // Yeni modul

        q.id = ++lastId;
        newQuestions.push(q);
    }

    return newQuestions;
}

// Execute
const COUNT = 500;
console.log(`${COUNT} ədəd keyfiyyətli sual hazırlanır (YENİ MODULLARLA)...`);
const generated = generateBatch(COUNT);

// Append to file
try {
    let finalDB = [];
    if (fs.existsSync('questions.json')) {
        finalDB = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
    }
    
    // Add new questions
    finalDB = finalDB.concat(generated);
    
    fs.writeFileSync('questions.json', JSON.stringify(finalDB, null, 2));
    console.log(`✅ Uğurla tamamlandı. Ümumi sual sayı: ${finalDB.length}`);
} catch (e) {
    console.error("Xəta:", e);
}
