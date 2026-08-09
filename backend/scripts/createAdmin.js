const admin = require("../src/config/firebase.config");

const createAdminUser = async () => {
  const email = "admin@gmail.com";
  const password = "admin123";
  const displayName = "Admin User";

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log("Admin user already exists in Auth:", userRecord.uid);
      // Optionally update password if needed, but for now just log it.
      await admin.auth().updateUser(userRecord.uid, { password: password });
      console.log("Admin password updated to default.");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName,
        });
        console.log("Successfully created Admin in Auth:", userRecord.uid);
      } else {
        throw error;
      }
    }

    // Create/Update user profile in Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email,
        name: displayName,
        role: "admin", // Explicitly set Admin role
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );

    console.log(
      "Successfully synced Admin profile to Firestore with role 'admin'",
    );
    process.exit(0);
  } catch (error) {
    console.error("Error creating/syncing Admin user:", error);
    process.exit(1);
  }
};

createAdminUser();
