import { getBrowserConfig, releaseBrowser, isMainModule } from "../config/shared.js";
import { delay } from "../config/shared.js";

const reasonText = `加班`;

async function clickApplyForm(page) {
  try {
    // Wait for the iframe to load
    await page.waitForSelector("#Frame1", { timeout: 10000 });

    // Get the iframe element
    const frameElement = await page.$("#Frame1");
    if (!frameElement) {
      throw new Error("Frame1 not found");
    }

    // Get the content frame
    let frame = await frameElement.contentFrame();
    if (!frame) {
      throw new Error("Could not access iframe content");
    }

    console.log("Successfully accessed Frame1 iframe");

    // The portal can resume a stale last-visited page (e.g. a notice/registration
    // page) instead of Homepage.aspx. Force navigation back to the homepage.
    if (!frame.url().includes("Homepage.aspx")) {
      console.log("Frame1 not on Homepage, navigating via 我的首頁 link...");
      await frame.evaluate(() => {
        const link = Array.from(document.querySelectorAll("a")).find(
          (a) => a.textContent.trim() === "我的首頁"
        );
        if (link) link.click();
      });
      await delay(2000);

      const frameElementAfterNav = await page.$("#Frame1");
      if (!frameElementAfterNav) {
        throw new Error("Frame1 not found after navigating home");
      }
      frame = await frameElementAfterNav.contentFrame();
      if (!frame) {
        throw new Error("Could not access Frame1 content after navigating home");
      }
    }

    // The apply-form link's location has moved between homepage layouts before:
    // sometimes it sits directly on the homepage, sometimes nested inside a
    // dashboard widget iframe (e.g. a RadDock "FlowList" widget) whose id is
    // randomly generated per-deployment. Rather than hardcode one layout,
    // find whichever frame (the homepage itself or one of its iframes)
    // currently contains the link.
    const hasApplyLink = () =>
      Array.from(document.querySelectorAll("a")).some(
        (a) => a.textContent.trim() === "加班單" || a.title === "加班單"
      );

    const clickApplyLink = () => {
      const link = Array.from(document.querySelectorAll("a")).find(
        (a) => a.textContent.trim() === "加班單" || a.title === "加班單"
      );
      link.click();
    };

    const findFrameWithApplyLink = async () => {
      if (await frame.evaluate(hasApplyLink)) {
        return frame;
      }
      for (const iframeElement of await frame.$$("iframe")) {
        const nestedFrame = await iframeElement.contentFrame();
        if (!nestedFrame) continue;
        const found = await nestedFrame.evaluate(hasApplyLink).catch(() => false);
        if (found) return nestedFrame;
      }
      return null;
    };

    let targetFrame = null;
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      targetFrame = await findFrameWithApplyLink();
      if (targetFrame) break;
      await delay(500);
    }

    if (!targetFrame) {
      throw new Error("Could not find 加班單 apply link on homepage or any nested widget iframe");
    }

    await targetFrame.evaluate(clickApplyLink);

    console.log("Clicked 加班單 apply link");
  } catch (error) {
    console.error("Error occurred:", error.message);
  }
}

async function fillFormInNewTab(formPage) {
  // Calculate yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedDate =
    yesterday.getFullYear() +
    "/" +
    String(yesterday.getMonth() + 1).padStart(2, "0") +
    "/" +
    String(yesterday.getDate()).padStart(2, "0");

  console.log(`Setting date to: ${formattedDate}`);

  try {
    await formPage.waitForSelector("form", { timeout: 10000 });

    // Wait for the iframe to load
    await formPage.waitForSelector("iframe", { timeout: 10000 });

    // Get the iframe element
    const frameElement = await formPage.$("iframe");
    if (!frameElement) {
      throw new Error("NewTab Frame1 not found");
    }

    // Get the content frame
    const frame = await frameElement.contentFrame();
    if (!frame) {
      throw new Error("NewTab Could not access iframe content");
    }

    console.log("NewTab Successfully accessed Frame1 iframe");

    // Wait for Frame2 to appear inside Frame1
    await frame.waitForSelector("#content", { timeout: 10000 });

    // Get the iframe element inside Frame1
    const frame2Element = await frame.$("#content");
    if (!frame2Element) {
      throw new Error("NewTab Frame2 not found inside Frame1");
    }

    // Get the content frame of Frame2
    const frame2 = await frame2Element.contentFrame();
    if (!frame2) {
      throw new Error("NewTab Could not access Frame2 iframe content");
    }

    // Wait for the first date input field to be available
    const dateInputSelector1 =
      "#ctl00_ContentPlaceHolder1_VersionFieldCollectionUsingUC1_versionFieldUC6_RadDatePicker1_dateInput";
    await frame2.waitForSelector(dateInputSelector1, { timeout: 10000 });

    // Fill the first date input field
    await frame2.type(dateInputSelector1, formattedDate);
    console.log(`Successfully filled first date field with: ${formattedDate}`);

    // Wait for the second date input field to be available
    const dateInputSelector2 =
      "#ctl00_ContentPlaceHolder1_VersionFieldCollectionUsingUC1_versionFieldUC9_RadDatePicker1_dateInput";
    await frame2.waitForSelector(dateInputSelector2, { timeout: 10000 });

    // Fill the second date input field
    await frame2.type(dateInputSelector2, formattedDate);
    console.log(`Successfully filled second date field with: ${formattedDate}`);

    // Wait for and select the time dropdown
    const timeDropdownSelector =
      "#ctl00_ContentPlaceHolder1_VersionFieldCollectionUsingUC1_versionFieldUC7_DropDownList1";
    await frame2.waitForSelector(timeDropdownSelector, { timeout: 10000 });

    // Click the dropdown first to open it
    await frame2.click(timeDropdownSelector);
    await delay(500);

    // Select the "18:30" option using evaluate
    await frame2.evaluate((selector) => {
      const dropdown = document.querySelector(selector);
      dropdown.value = "18:30";
      dropdown.dispatchEvent(new Event("change", { bubbles: true }));
    }, timeDropdownSelector);
    console.log("Successfully selected 18:30 from the time dropdown");

    // Wait for and select the time dropdown
    const time2DropdownSelector =
      "#ctl00_ContentPlaceHolder1_VersionFieldCollectionUsingUC1_versionFieldUC10_DropDownList1";
    await frame2.waitForSelector(time2DropdownSelector, { timeout: 10000 });

    // Click the dropdown first to open it
    await frame2.click(time2DropdownSelector);
    await delay(500);

    // Select the "20:30" option using evaluate
    await frame2.evaluate((selector) => {
      const dropdown = document.querySelector(selector);
      dropdown.value = "20:30";
      dropdown.dispatchEvent(new Event("change", { bubbles: true }));
    }, time2DropdownSelector);
    console.log("Successfully selected 20:30 from the time dropdown");

    // Wait for and fill the textarea
    const textareaSelector =
      "#ctl00_ContentPlaceHolder1_VersionFieldCollectionUsingUC1_versionFieldUC12_tbxMultiLineText";
    await frame2.waitForSelector(textareaSelector, { timeout: 10000 });

    // Type reasonText into the textarea
    await frame2.type(textareaSelector, reasonText);
    console.log("Successfully typed 'reasonText' into the textarea");

    // Wait for and fill the textarea
    const textarea2Selector =
      "#ctl00_ContentPlaceHolder1_VersionFieldCollectionUsingUC1_versionFieldUC13_tbxMultiLineText";
    await frame2.waitForSelector(textarea2Selector, { timeout: 10000 });

    // Type reasonText into the textarea
    await frame2.type(textarea2Selector, reasonText);
    console.log("Successfully typed 'reasonText' into the textarea");
  } catch (error) {
    console.error("Error filling form fields:", error.message);
  }
}

export async function main() {
  try {
    const browser = await getBrowserConfig();

    const page = await browser.newPage();
    await page.goto("https://hq.igs.com.tw/UOF/");

    await clickApplyForm(page);

    const pageTarget = page.target();

    const newTarget = await browser.waitForTarget(
      (target) => target.opener() === pageTarget
    );

    // Get the page object for the newly opened tab
    const formPage = await newTarget.page();

    // Add a small delay to ensure page is fully ready
    await delay(3000);

    await fillFormInNewTab(formPage);

    console.log("Form filling completed.");

    await releaseBrowser(browser); // Keep browser open for debugging

  } catch (error) {
    console.error("Main execution error:", error);
    // 往外拋而不是 process.exit，避免常駐排程因單次失敗而整個結束
    throw error;
  }
}

// 直接執行（npm run uof）才自動跑；被 index.js import 時由排程呼叫 main()
if (isMainModule(import.meta.url)) {
  await main();
}
