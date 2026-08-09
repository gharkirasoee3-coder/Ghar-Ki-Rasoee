const admin = require("./src/config/firebase.config");
const db = admin.firestore();

async function checkMenuConfig() {
  try {
    const doc = await db.collection("metadata").doc("menuConfig").get();
    if (!doc.exists) {
      console.log("Document does not exist in Firestore!");
    } else {
      console.log("Document exists!");
      console.log("Plans keys:", Object.keys(doc.data().plans || {}));
      console.log("Weekly menu standard monday:", JSON.stringify(doc.data().weeklyMenus?.standard?.monday, null, 2));
    }
  } catch (error) {
    console.error("Error reading doc:", error);
  }
  process.exit(0);
}

checkMenuConfig();
