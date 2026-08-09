const admin = require("firebase-admin");
const env = require("./env.config");

const isConfigured =
  env.FIREBASE.PROJECT_ID &&
  env.FIREBASE.PRIVATE_KEY &&
  env.FIREBASE.CLIENT_EMAIL &&
  env.FIREBASE.PRIVATE_KEY !== "your-private-key" &&
  !env.FIREBASE.PRIVATE_KEY.includes("your-private-key");

if (!isConfigured) {
  console.warn(
    "⚠️ Firebase credentials missing. Using Mock Firebase for development.",
  );

  // Mock Admin Object
  const mockDb = {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => ({ exists: false, id, data: () => ({}) }),
        set: async (data) => ({ ...data }),
        update: async (data) => ({ ...data }),
      }),
      // Support chaining for queries
      where: function () {
        return this;
      },
      orderBy: function () {
        return this;
      },
      get: async () => ({ docs: [] }), // Returns empty list for queries
    }),
  };

  module.exports = {
    auth: () => ({
      verifyIdToken: async (token) => {
        if (token === "valid_mock_token")
          return { uid: "mock_uid", email: "mock@test.com" };
        throw new Error("Invalid mock token");
      },
    }),
    firestore: () => mockDb,
    apps: ["mock_app"], // Pretend we have an app
  };
} else {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE.PROJECT_ID,
          privateKey: env.FIREBASE.PRIVATE_KEY?.replace(/\\n/g, "\n"),
          clientEmail: env.FIREBASE.CLIENT_EMAIL,
        }),
      });
      admin.firestore().settings({ ignoreUndefinedProperties: true });
      console.log("Firebase Admin Initialized");
    } catch (error) {
      console.error("Firebase Admin Initialization Error:", error);
    }
  }
  module.exports = admin;
}
