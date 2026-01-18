const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, Timestamp } = require('firebase/firestore');

// Firebase Configuration
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

const DRY_RUN = true; // Set to false to actually delete

async function cleanupTodayQuestions() {
    console.log(`Starting cleanup script (DRY_RUN: ${DRY_RUN})...`);
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTimestamp = Timestamp.fromDate(startOfDay);

    console.log(`Checking for questions added after: ${startOfDay.toISOString()}`);

    let totalFound = 0;

    // 1. Check public_questions collection
    try {
        console.log("\n--- Checking 'public_questions' collection ---");
        // Note: We need an index for createdAt to query efficiently, but for a cleanup script we can fetch recent/all and filter if needed, 
        // or try the query. If it fails due to index, we'll fetch all.
        // Let's try fetching all for simplicity if dataset isn't huge, or use a query if we suspect it works.
        // Usually 'createdAt' exists.
        
        const q = query(collection(db, 'public_questions'), where('createdAt', '>=', startTimestamp));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.log("No public questions found from today.");
        } else {
            console.log(`Found ${snapshot.size} public questions.`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`[${doc.id}] ${data.text ? data.text.substring(0, 50) + '...' : 'No text'}`);
                totalFound++;
                
                if (!DRY_RUN) {
                    // await deleteDoc(doc.ref);
                    // console.log("Deleted.");
                }
            });
        }
    } catch (e) {
        console.error("Error querying public_questions:", e.message);
    }

    // 2. Check categories for question IDs that look like timestamps from today
    try {
        console.log("\n--- Checking 'categories' collection for embedded questions ---");
        const catSnapshot = await getDocs(collection(db, 'categories'));
        
        catSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.questions && Array.isArray(data.questions)) {
                const newQuestions = data.questions.filter(q => {
                    // Check if ID contains a timestamp from today
                    // Pattern often: something_TIMESTAMP_random
                    // Or just look at the ID if it IS a timestamp
                    if (!q.id) return false;
                    
                    let ts = null;
                    // Try to extract timestamp from ID
                    // Case 1: "1737292800000" (raw timestamp)
                    // Case 2: "q_1737292800000"
                    const idStr = String(q.id);
                    const matches = idStr.match(/(\d{13})/);
                    if (matches) {
                        ts = parseInt(matches[1]);
                    }
                    
                    if (ts && ts >= startOfDay.getTime() && ts <= now.getTime()) {
                        return true;
                    }
                    return false;
                });

                if (newQuestions.length > 0) {
                    console.log(`Category: ${data.name} (${doc.id}) - Found ${newQuestions.length} new questions.`);
                    newQuestions.forEach(q => {
                        console.log(`  - [${q.id}] ${q.text ? q.text.substring(0, 50) + '...' : 'No text'}`);
                    });
                    totalFound += newQuestions.length;
                    
                    if (!DRY_RUN) {
                        // Logic to remove from array and update doc
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error scanning categories:", e.message);
    }

    console.log(`\nTotal potential items to clean: ${totalFound}`);
    if (DRY_RUN) {
        console.log("This was a DRY RUN. No changes made.");
    } else {
        console.log("Cleanup completed.");
    }
    
    // Exit node process
    process.exit(0);
}

cleanupTodayQuestions();
