import { getBrowserConfig } from "../config/shared.js";
import { delay } from "../config/shared.js";

// 組內事務 早會

export async function main() {
  const browser = await getBrowserConfig();

  const page = await browser.newPage();
  await page.goto("https://webcase.towergame.com/");
  await clickApplyButton();

  let dialogShown = false;

  async function clickApplyButton() {
    // 點擊「案件申請」連結
    await page.waitForSelector('a[href="/Petition.aspx"]');
    await page.click('a[href="/Petition.aspx"]');
  }

  page.on("dialog", async (dialog) => {
    dialogShown = true;
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 延遲 1 秒
    await dialog.accept();
    await clickApplyButton();
  });

  async function fillFormData() {
    // 點擊 select2 觸發元素
    await page.waitForSelector(".select2-selection");
    await page.click(".select2-selection");

    // 點擊「淘　gametower」選項
    await page.waitForSelector("#select2-f_nCaseClass-results li:nth-child(2)");
    await page.click("#select2-f_nCaseClass-results li:nth-child(2)");

    // 勾選「f_bAssignToSelf」checkbox
    await page.waitForSelector(
      'input[type="checkbox"][name="f_bAssignToSelf"]'
    );
    await page.click('input[type="checkbox"][name="f_bAssignToSelf"]');

    // 輸入今天日期加「組內事務」到 f_strCaseName
    const today = new Date();
    const formatted = today.toISOString().slice(0, 10).replace(/-/g, "/"); // 2025/10/01
    await page.waitForSelector('input[name="f_strCaseName"]');
    await page.type('input[name="f_strCaseName"]', `${formatted} 組內事務`);

    // 選擇「18」到 f_strFinishExecuteHour
    await page.waitForSelector('select[name="f_strFinishExecuteHour"]');
    await page.select('select[name="f_strFinishExecuteHour"]', "18");

    // 勾選 f_nTaskNo17 checkbox
    await page.waitForSelector(
      'input[type="checkbox"][name="f_nTaskNo"][id="f_nTaskNo17"]'
    );
    await page.click(
      'input[type="checkbox"][name="f_nTaskNo"][id="f_nTaskNo17"]'
    );

    // 填入「早會」到 f_strRemark textarea
    await page.waitForSelector('textarea[name="f_strRemark"]');
    await page.type('textarea[name="f_strRemark"]', "早會");

    // 點擊「送出」按鈕
    // await page.waitForSelector('button.btn[type="button"]');
    // await page.click('button.btn[type="button"]');
  }

  // 如果 3 秒內沒出現 dialog，直接填表單
  await delay(3000);
  if (!dialogShown) await fillFormData();

  await browser.disconnect(); // Keep browser open for debugging
}

(async () => {
  await main();
})();
