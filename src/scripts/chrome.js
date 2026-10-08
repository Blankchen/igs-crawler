import { spawn } from "child_process";
import { CHROME_DEBUG_URL } from "../config/shared.js";

// 啟動自動化專用的 Chrome（固定 port 9222、獨立設定資料夾），連線時不會跳允許視窗
const CHROME_PATH = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR || "C:\\ChromeDebugProfile";
const START_URL = "https://webcase.towergame.com/Board/Board21.aspx";

async function isRunning() {
  try {
    const res = await fetch(`${CHROME_DEBUG_URL}/json/version`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

if (await isRunning()) {
  console.log(`✅ Chrome 已在 ${CHROME_DEBUG_URL} 執行中，不重複啟動`);
} else {
  const port = new URL(CHROME_DEBUG_URL).port;
  // detached + unref：讓 npm run chrome 立即結束，Chrome 繼續在背景執行
  spawn(CHROME_PATH, [`--remote-debugging-port=${port}`, `--user-data-dir=${USER_DATA_DIR}`, START_URL], {
    detached: true,
    stdio: "ignore",
  }).unref();
  console.log(`🚀 已啟動 Chrome（${CHROME_DEBUG_URL}，設定資料夾 ${USER_DATA_DIR}）`);
  console.log("首次使用請在此 Chrome 登入 webcase.towergame.com");
}
