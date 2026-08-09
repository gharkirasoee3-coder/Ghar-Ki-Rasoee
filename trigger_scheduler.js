require("dotenv").config({ path: "./backend/.env" });
const admin = require("./backend/src/config/firebase.config");
const SchedulerService = require("./backend/src/services/scheduler.service");

async function run() {
  console.log("Starting manual scheduler run...");
  try {
    await SchedulerService.generateDailyOrders();
    console.log("Manual scheduler run completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Manual scheduler run failed:", error);
    process.exit(1);
  }
}

run();
