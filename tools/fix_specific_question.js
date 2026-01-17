
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Firebase Config
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

async function findAndFix() {
    console.log("🔍 Searching for the question...");
    const targetQuestionPart = "Yerli özünüidarəni hansı qurum həyata keçirir";
    const targetCorrectAnswer = "Bələdiyyələr";

    try {
        console.log("📡 Connecting to Firestore...");
        const querySnapshot = await getDocs(collection(db, "categories"));
        console.log(`📊 Found ${querySnapshot.size} categories.`);
        let found = false;

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            console.log(`🔎 Checking category: ${data.name || docSnap.id}`);
            if (!data.questions || !Array.isArray(data.questions)) continue;

            const questions = data.questions;
            let modified = false;

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (q.text && q.text.includes(targetQuestionPart)) {
                    console.log(`\n✅ FOUND in document ID: ${docSnap.id}`);
                    console.log(`📂 Category Name: ${data.name}`);
                    console.log(`❓ Question: ${q.text}`);
                    console.log(`🔢 Current correctIndex: ${q.correctIndex}`);
                    console.log(`📋 Options:`, q.options);

                    // Find the correct index for "Bələdiyyələr"
                    const correctIndex = q.options.findIndex(opt => opt.trim() === targetCorrectAnswer);
                    
                    if (correctIndex === -1) {
                        console.error(`❌ Target answer '${targetCorrectAnswer}' not found in options!`);
                        console.log("Options are:", q.options);
                        continue;
                    }

                    if (q.correctIndex === correctIndex) {
                        console.log(`⚠️ Correct index is already ${correctIndex}. No change needed.`);
                    } else {
                        console.log(`🛠 FIXING: Changing correctIndex from ${q.correctIndex} to ${correctIndex} (${targetCorrectAnswer})`);
                        questions[i].correctIndex = correctIndex;
                        modified = true;
                    }
                    found = true;
                }
            }

            if (modified) {
                console.log(`💾 Saving changes to document ${docSnap.id}...`);
                await updateDoc(doc(db, "categories", docSnap.id), {
                    questions: questions
                });
                console.log("✅ Document updated successfully!");
            }
        }

        if (!found) {
            console.log("❌ Question not found in any category.");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

findAndFix();
