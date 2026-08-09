require("dotenv").config();

console.log("🔍 Verifying Environment Variables...");

const requiredKeys = [
  "CLIENT_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
];

let hasError = false;

requiredKeys.forEach((key) => {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Missing variable: ${key}`);
    hasError = true;
  } else {
    // Obfuscate secret values for log
    const displayValue =
      key.includes("KEY") || key.includes("SECRET")
        ? `${value.substring(0, 5)}...`
        : value;
    console.log(`✅ ${key} is set: ${displayValue}`);
  }
});

// Check Firebase Private Key format
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  if (privateKey.includes("\\n")) {
    console.warn(
      "⚠️  FIREBASE_PRIVATE_KEY contains escaped newlines ('\\n'). Verify if your Firebase initialization replaces them with real newlines.",
    );
  } else if (privateKey.includes("\n")) {
    console.log("✅ FIREBASE_PRIVATE_KEY contains real newlines.");
  } else {
    console.warn(
      "⚠️  FIREBASE_PRIVATE_KEY appears to be a single line without newlines.",
    );
  }

  if (!privateKey.startsWith("-----BEGIN PRIVATE KEY-----")) {
    console.error(
      "❌ FIREBASE_PRIVATE_KEY does not start with '-----BEGIN PRIVATE KEY-----'",
    );
    hasError = true;
  }
}

if (hasError) {
  console.error(
    "\n❌ Environment verification FAILED. Please fix the missing or incorrect variables.",
  );
  process.exit(1);
} else {
  console.log("\n✅ Environment verification PASSED.");
}
