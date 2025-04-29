import { track } from "./src/bot/bot.mjs";
import { startServer } from "./src/server/index.mjs";
track();
setInterval(track, 1000 * 30);
startServer();
