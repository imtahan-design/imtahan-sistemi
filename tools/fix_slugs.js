const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAak_eY0WNpY7cqAEuWEBG9wBDhg1NPw_0",
    authDomain: "imtahansistemi-17659.firebaseapp.com",
    projectId: "imtahansistemi-17659",
    storageBucket: "imtahansistemi-17659.appspot.com",
    messagingSenderId: "715396853166",
    appId: "1:715396853166:web:9829b853e5e572de4d2c3f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function slugify(str) {
    return (str || '')
        .toLowerCase()
        .replace(/ğ/g,'g').replace(/ə/g,'e').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/ş/g,'s').replace(/ü/g,'u')
        .replace(/[^a-z0-9\s-]/g,'')
        .trim()
        .replace(/\s+/g,'-')
        .replace(/-+/g,'-')
        .slice(0, 120);
}

async function fixSlugs() {
    console.log("Fetching news from Firestore...");
    try {
        const snapshot = await getDocs(collection(db, 'news'));
        console.log(`Found ${snapshot.size} articles.`);

        let updatedCount = 0;
        for (const document of snapshot.docs) {
            const data = document.data();
            const currentId = document.id;
            
            if (!data.slug) {
                const newSlug = slugify(data.title);
                console.log(`Updating [${currentId}]: ${data.title} -> ${newSlug}`);
                
                const docRef = doc(db, 'news', currentId);
                await updateDoc(docRef, {
                    slug: newSlug
                });
                updatedCount++;
            }
        }

        console.log(`Finished. Updated ${updatedCount} articles.`);
        process.exit(0);
    } catch (error) {
        console.error("Error updating slugs:", error);
        process.exit(1);
    }
}

fixSlugs();
