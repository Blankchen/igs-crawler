import { setKeepAlive, closeBrowser, isMainModule } from "../config/shared.js";
import { main as towergameMain } from "./towergame.js";
import { main as uofMain } from "./uof.js";

// 在同一個 process 內依序執行所有腳本，共用同一條連線，Chrome 只需按一次允許
// 單一腳本失敗不影響其他腳本
export async function runAll() {
  setKeepAlive(true);
  for (const [name, run] of [["towergame", towergameMain], ["uof", uofMain]]) {
    try {
      await run();
    } catch (error) {
      console.error(`${name} 執行失敗:`, error.message);
    }
  }
}

// 直接執行（npm run all）：跑完後斷線讓 process 結束
if (isMainModule(import.meta.url)) {
  await runAll();
  await closeBrowser();
}
