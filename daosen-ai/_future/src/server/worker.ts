import "dotenv/config";
import { processQueuedTasks } from "./tasks";
const poll = Number(process.env.TASK_WORKER_POLL_MS ?? 1500);
console.log(`[worker] polling every ${poll}ms`);
let running = true;
process.on("SIGTERM", () => { running = false; });
while (running) { await processQueuedTasks(); await new Promise(resolve => setTimeout(resolve, poll)); }
