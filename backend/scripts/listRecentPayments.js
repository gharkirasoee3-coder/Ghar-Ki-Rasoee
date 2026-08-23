const admin = require("../src/config/firebase.config");
const db = admin.firestore();

async function listRecent() {
  console.log("--- RECENT SUBSCRIPTIONS ---");
  const subSnap = await db.collection("subscriptions")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();
  
  if (subSnap.empty) {
    console.log("No subscriptions found.");
  } else {
    subSnap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  User: ${data.userId}`);
      console.log(`  Plan: ${data.plan}`);
      console.log(`  Created: ${data.createdAt}`);
      console.log(`  Session ID: ${data.stripeSessionId}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Remaining Days: ${data.remainingDays}`);
    });
  }

  console.log("\n--- RECENT ORDERS ---");
  const orderSnap = await db.collection("orders")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  if (orderSnap.empty) {
    console.log("No orders found.");
  } else {
    orderSnap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  User: ${data.userId}`);
      console.log(`  Customer: ${data.customerName}`);
      console.log(`  Created: ${data.createdAt}`);
      console.log(`  Session ID: ${data.stripeSessionId}`);
      console.log(`  Price: $${data.price}`);
      console.log(`  Status: ${data.paymentStatus}`);
    });
  }
}

listRecent().catch(console.error).then(() => process.exit(0));
