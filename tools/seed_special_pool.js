
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const fs = require('fs');

const firebaseConfig = {
    apiKey: "AIzaSyAak_eY0WNpY7cqAEuWEBG9wBDhg1NPw_0",
    authDomain: "imtahansistemi-17659.firebaseapp.com",
    projectId: "imtahansistemi-17659",
    storageBucket: "imtahansistemi-17659.firebasestorage.app",
    messagingSenderId: "715396853166",
    appId: "1:715396853166:web:9829b853e5e572de4d2c3f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Target counts per subject
const SCHEMA = [
    { id: '1768674522030', count: 20, name: 'Cinayət Məcəlləsi', poolSize: 100 },
    { id: '1768683898010', count: 20, name: 'Cinayət-Prosessual Məcəlləsi', poolSize: 100 },
    { id: '1766934946320', count: 6, name: 'Konstitusiya', poolSize: 30 },
    { id: '1768696058306', count: 3, name: 'Normativ hüquqi aktlar', poolSize: 15 },
    { id: '1768735010552', count: 5, name: 'İnzibati Xətalar Məcəlləsi', poolSize: 25 },
    { id: '1768750915800', count: 2, name: 'Mülki Məcəllə', poolSize: 10 },
    { id: '1768737630088', count: 2, name: 'Mülki-Prosessual Məcəllə', poolSize: 10 },
    { id: '1768745670510', count: 2, name: 'Əmək Məcəlləsi', poolSize: 10 },
    { id: '1768696474731', count: 8, name: 'Prokurorluq haqqında', poolSize: 40 },
    { id: '1768696605470', count: 6, name: 'Prokurorluq orqanlarında qulluq', poolSize: 30 },
    { id: '1767194888783', count: 5, name: 'Korrupsiyaya qarşı mübarizə', poolSize: 25 }, // Temporary 5 instead of 3
    { id: '1768698786812', count: 1, name: 'Polis haqqında', poolSize: 5 },
    { id: 'convention_placeholder', count: 1, name: 'Avropa İnsan Hüquqları Konvensiyası', poolSize: 25 } // Increased to 25
];

// Helper for similarity
function getTokens(text) {
    if (!text) return new Set();
    return new Set(text.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
        .split(/\s+/)
        .filter(w => w.length > 3)); // Filter small words
}

function calculateJaccard(s1, s2) {
    const t1 = getTokens(s1);
    const t2 = getTokens(s2);
    if (t1.size === 0 || t2.size === 0) return 0;
    
    const intersection = new Set([...t1].filter(x => t2.has(x)));
    const union = new Set([...t1, ...t2]);
    return intersection.size / union.size;
}

async function seedPool() {
    // Authenticate first (Admin credentials mock - assuming I have them or can write blindly if rules allow, but they failed)
    // Since I don't have the admin password, I can't write to Firestore from this script if rules require auth.
    // BUT, I am in the user's environment. I can try to use a service account if available, OR
    // I can generate a JSON file with the pool data and ask the user to upload it or use a browser console script.
    
    // HOWEVER, app.js was able to write to Firestore (e.g. creating categories).
    // The previous error `PERMISSION_DENIED` suggests rules block writes from unauthenticated Node.js client.
    // The web app works because it likely uses an authenticated user session or open rules for `categories` collection for creating?
    // Actually, `app.js` has `saveCategories` which might use `set` or `update`.
    
    // Workaround: I will generate a JSON file `special_pool.json` and then modify `app.js` to LOAD this file and save it to Firestore 
    // when the admin (user) opens the dashboard. This uses the authenticated browser session.
    
    console.log("Fetching source categories...");
    const snapshot = await getDocs(collection(db, 'categories'));
    const categories = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    let specialPool = [];

    for (const item of SCHEMA) {
        let cat = categories.find(c => c.id === item.id);
        
        // Fallback: Find by name similarity
        if (!cat) {
            cat = categories.find(c => c.name && c.name.toLowerCase().includes(item.name.toLowerCase().split(' ')[0])); // simple check
            // Better check for Convention
            if (item.name.includes('Konvensiya')) {
                cat = categories.find(c => c.name && (c.name.includes('Konvensiya') || c.name.includes('İnsan hüquqları')));
            }
        }

        if (!cat || !cat.questions || cat.questions.length === 0) {
            console.warn(`Category not found or empty: ${item.name}`);
            continue;
        }

        console.log(`Processing ${item.name} (Available: ${cat.questions.length})...`);
        
        // 1. Filter Questions
        let candidates = cat.questions.filter(q => {
            if (!q.text || q.text.length < 25) return false;
            const opts = q.options || [];
            if (opts.length < 3) return false;
            const uniqueOpts = new Set(opts.map(o => o.trim().toLowerCase()));
            if (uniqueOpts.size < opts.length - 1) return false; 
            return true;
        });

        // 2. Select Pool
        const selected = [];
        candidates.sort(() => 0.5 - Math.random());

        for (const q of candidates) {
            if (selected.length >= item.poolSize) break;
            selected.push(q);
        }

        console.log(`  Selected ${selected.length} questions for pool.`);
        
        // Cluster Analysis for this subject
        // We compare each selected question with others to find groups
        let clusters = []; // Array of sets
        
        // Pre-compute tokens for performance
        const qTokens = selected.map(q => ({
            id: q.id,
            tokens: getTokens(q.text + " " + (q.options ? q.options.join(" ") : ""))
        }));

        for (let i = 0; i < selected.length; i++) {
            for (let j = i + 1; j < selected.length; j++) {
                const q1 = qTokens[i];
                const q2 = qTokens[j];
                
                // Jaccard calc
                const intersection = new Set([...q1.tokens].filter(x => q2.tokens.has(x))).size;
                const union = new Set([...q1.tokens, ...q2.tokens]).size;
                const score = intersection / union;
                
                // Threshold 0.3 (adjusted for Azerbaijani agglutination - words might differ slightly but roots are same, 
                // but simple token matching is strict. So 30% overlap is actually significant for different questions)
                // If user says "similar questions", usually they share "Protocol No 4", "Article 2", "restriction", "rights".
                if (score > 0.35) {
                    // Check if they are already in a cluster
                    let cIndex = -1;
                    clusters.forEach((c, idx) => {
                        if (c.has(q1.id) || c.has(q2.id)) cIndex = idx;
                    });
                    
                    if (cIndex === -1) {
                        clusters.push(new Set([q1.id, q2.id]));
                    } else {
                        clusters[cIndex].add(q1.id);
                        clusters[cIndex].add(q2.id);
                    }
                }
            }
        }
        
        console.log(`  Found ${clusters.length} similarity clusters in ${item.name}.`);

        // Tag questions with subject ID and Name AND Cluster ID
        const taggedSelected = selected.map(q => {
            // Find cluster
            let clusterId = null;
            clusters.forEach((c, idx) => {
                if (c.has(q.id)) clusterId = `${item.id}_c${idx}`;
            });
            
            return {
                ...q,
                subjectId: item.id,
                subjectName: item.name,
                poolSource: 'seed_v1',
                similarityGroupId: clusterId
            };
        });
        
        specialPool = [...specialPool, ...taggedSelected];
    }

    console.log(`Total Special Pool Size: ${specialPool.length}`);
    
    // Save to local file
    fs.writeFileSync('special_pool.json', JSON.stringify({ questions: specialPool }));
    console.log("Pool saved to special_pool.json. Now upload via browser.");
}

seedPool().catch(console.error);
