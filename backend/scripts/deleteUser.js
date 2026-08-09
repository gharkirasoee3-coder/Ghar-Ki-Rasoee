const admin = require("../src/config/firebase.config");

const deleteUserByEmail = async (email) => {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(userRecord.uid);
    console.log(`Successfully deleted user with email: ${email}`);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.log(`User with email ${email} not found.`);
    } else {
      console.error("Error deleting user:", error);
    }
  }
};

const email = process.argv[2];

if (!email) {
  console.log("Please provide an email address as an argument.");
  console.log("Usage: node deleteUser.js <email>");
  process.exit(1);
}

deleteUserByEmail(email);
