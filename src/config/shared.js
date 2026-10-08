import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

// 自動化專用 Chrome 的遠端偵錯位址（由 npm run chrome 以 --remote-debugging-port=9222 啟動）
export const CHROME_DEBUG_URL = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222";

// 以 --remote-debugging-port 啟動的 Chrome 提供 /json/version，連線不會跳允許視窗
async function connectToUserChrome() {
  console.log(`Connecting to Chrome: ${CHROME_DEBUG_URL}`);
  const browser = await puppeteer.connect({
    browserURL: CHROME_DEBUG_URL,
    defaultViewport: null,
  });
  console.log("Successfully connected to Chrome");
  return browser;
}

// 共用連線：同一個 process 內只連一次，之後重複使用（避免 Chrome 每次都跳允許視窗）
let sharedBrowserPromise = null;
let keepAlive = false;

// 常駐模式（例如 index.js 排程）下，releaseBrowser 不會斷線，連線留給下一次使用
export function setKeepAlive(value) {
  keepAlive = value;
}

export async function getBrowserConfig() {
  if (sharedBrowserPromise) {
    const browser = await sharedBrowserPromise;
    if (browser?.connected) return browser;
  }

  sharedBrowserPromise = connectBrowser();
  const browser = await sharedBrowserPromise;
  if (!browser) {
    sharedBrowserPromise = null;
    return browser;
  }

  // Chrome 關閉或連線中斷時清掉快取，下次呼叫會重新連線
  browser.once("disconnected", () => {
    console.log("Browser disconnected");
    sharedBrowserPromise = null;
  });
  return browser;
}

// 取代直接呼叫 browser.disconnect()：常駐模式保留連線，單次執行則斷線讓 process 結束
export async function releaseBrowser(browser) {
  if (keepAlive || !browser) return;
  await browser.disconnect();
}

// 結束共用連線（不會為了斷線而重新連線）
export async function closeBrowser() {
  const browser = await sharedBrowserPromise;
  if (browser?.connected) await browser.disconnect();
}

async function connectBrowser() {
  try {
    return await connectToUserChrome();
  } catch (error) {
    console.log(`Could not connect to Chrome（${CHROME_DEBUG_URL}），請先執行 npm run chrome`);
    console.error("Connection error:", error.message);
  }
}

// 判斷腳本是被 node 直接執行（npm run tg 等），還是被 index.js import
export function isMainModule(metaUrl) {
  return !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}

export async function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}