const admin = require("../src/config/firebase.config");

const createTestUser = async () => {
  const email = "real_test_user@test.com";
  const password = "password123";
  const displayName = "Real Test User";

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log("User found in Auth:", userRecord.uid);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName,
        });
        console.log("Successfully created user in Auth:", userRecord.uid);
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
        role: "admin", // Promote to Admin
        createdAt: new Date().toISOString(),
        walletBalance: 0,
        activeOrders: 0,
      },
      { merge: true },
    );

    console.log("Successfully synced user profile to Firestore");
  } catch (error) {
    console.error("Error creating/syncing user:", error);
  }
};

createTestUser();
