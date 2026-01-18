
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkConvention() {
    console.log("Searching for 'Konvensiya' category...");
    const snapshot = await getDocs(collection(db, 'categories'));
    
    let found = false;
    snapshot.forEach(doc => {
        const d = doc.data();
        if (d.name.toLowerCase().includes('konvensiya') || d.name.toLowerCase().includes('insan hüquqları')) {
            console.log(`FOUND: [${doc.id}] ${d.name} (${d.questions ? d.questions.length : 0} questions)`);
            found = true;
        }
    });

    if (!found) console.log("NOT FOUND yet.");
}

checkConvention().catch(console.error);
