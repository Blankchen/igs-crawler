import { getBrowserConfig } from "../config/shared.js";

// 讀取 Board21.aspx 頁面資料

export async function main() {
  try {
    const browser = await getBrowserConfig();
    if (!browser) {
      console.log("❌ Chrome 未開啟或無法連線 port 9222，請確認瀏覽器已以 --remote-debugging-port=9222 啟動");
      process.exit(1);
    }

    const pages = await browser.pages();
    console.log(`找到 ${pages.length} 個分頁`);

    // 優先尋找 Board21.aspx，其次接受 webcase.towergame.com 的任意頁面
    let targetPage = pages.find((p) => p.url().includes("Board21"));
    if (!targetPage) {
      targetPage = pages.find((p) => p.url().includes("webcase.towergame.com"));
    }

    if (!targetPage) {
      console.log("❌ 找不到 Board21.aspx 或 webcase.towergame.com 的分頁，請確認頁面已開啟");
      process.exit(1);
    }

    console.log(`✅ 目標頁面: ${targetPage.url()}`);

    const text = await targetPage.evaluate(() => document.body.innerText);
    console.log("\n=== 頁面文字內容 ===\n");
    console.log(text);

    await browser.disconnect();
  } catch (error) {
    console.error("❌ 執行錯誤:", error.message);
    process.exit(1);
  }
}

(async () => {
  await main();
})();
