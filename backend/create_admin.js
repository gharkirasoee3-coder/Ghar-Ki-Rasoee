require("dotenv").config();
const admin = require("./src/config/firebase.config");
const db = admin.firestore();

// Read from environment — NEVER hardcode credentials
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminPhone = process.env.ADMIN_PHONE || "+10000000000";

if (!adminEmail || !adminPassword) {
  console.error("ERROR: Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file first.");
  console.error("Example:");
  console.error("  ADMIN_EMAIL=admin@example.com");
  console.error("  ADMIN_PASSWORD=YourSecurePassword123!");
  process.exit(1);
}

async function createAdmin() {
  try {
    console.log("Checking if user exists in Firebase Auth...");
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(adminEmail);
      console.log("User already exists in Auth. Updating password...");
      userRecord = await admin.auth().updateUser(userRecord.uid, {
        password: adminPassword,
        displayName: "GKR Admin"
      });
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        console.log("Creating new user in Firebase Auth...");
        userRecord = await admin.auth().createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: "GKR Admin"
        });
      } else {
        throw error;
      }
    }

    const uid = userRecord.uid;
    console.log(`Auth User verified/created. UID: ${uid}`);

    console.log("Setting Firestore user document with role: 'admin'...");
    await db.collection("users").doc(uid).set({
      name: "GKR Admin",
      email: adminEmail,
      phone: adminPhone,
      role: "admin",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    }, { merge: true });

    console.log("Admin setup complete!");
    console.log(`Email: ${adminEmail}`);
    console.log("Password: [hidden]");
  } catch (err) {
    console.error("Error setting up admin:", err);
  } finally {
    process.exit(0);
  }
}

createAdmin();
