import { getBrowserConfig } from "../config/shared.js";
import { delay } from "../config/shared.js";
import * as fs from "fs";

export async function main() {
    try {
        const browser = await getBrowserConfig();
        
        // 直接連接到已開啟的頁面
        const pageId = "5BC9F0F809DDDDB59067A39040A6003E";
        const wsUrl = `ws://127.0.0.1:9222/devtools/page/${pageId}`;
        
        console.log("=== 連接到已開啟的頁面 ===\n");
        console.log(`WebSocket: ${wsUrl}\n`);
        
        // 連接到現有的頁面
        const pages = await browser.pages();
        let targetPage = null;
        
        for (const page of pages) {
            const url = page.url();
            if (url.includes('WebLogTrace.aspx')) {
                targetPage = page;
                console.log(`✅ 找到目標頁面: ${page.title()}\n`);
                break;
            }
        }
        
        if (!targetPage) {
            console.log("❌ 找不到目標頁面，請確保頁面已在瀏覽器中開啟");
            process.exit(1);
        }
        
        // 首先，找到並點擊每頁筆數的下拉選單
        console.log("🔍 尋找每頁筆數設定...\n");
        
        const pageSize = await targetPage.evaluate(() => {
            // 尋找包含"每頁"或類似文字的元素
            const allText = Array.from(document.querySelectorAll('*')).filter(el => {
                return el.textContent.includes('每頁') || el.textContent.includes('筆');
            });
            
            // 尋找 Select2 下拉選單
            const selects = Array.from(document.querySelectorAll('[id^="select2-"]'));
            
            return {
                textElements: allText.map(el => ({
                    tag: el.tagName,
                    text: el.textContent.trim().substring(0, 50),
                    id: el.id,
                    class: el.className
                })).slice(0, 10),
                selects: selects.map(sel => ({
                    id: sel.id,
                    value: sel.textContent.trim()
                }))
            };
        });
        
        console.log("找到的相關元素:");
        console.log(JSON.stringify(pageSize, null, 2));
        console.log();
        
        // 嘗試點擊每頁筆數的下拉選單（通常是第二個Select2）
        const dropdownsInfo = await targetPage.evaluate(() => {
            return Array.from(document.querySelectorAll('[id^="select2-"]')).map(el => ({
                id: el.id,
                value: el.textContent.trim(),
                parent: el.parentElement.textContent.trim().substring(0, 50)
            }));
        });
        
        console.log("所有 Select2 下拉選單:");
        dropdownsInfo.forEach((info, idx) => {
            console.log(`${idx}. ${info.id}: "${info.value}"`);
            console.log(`   父元素: ${info.parent}\n`);
        });
        
        // 如果找到多個下拉選單，第二個通常是每頁筆數
        if (dropdownsInfo.length >= 2) {
            const pagesSizeDropdown = dropdownsInfo[1];
            console.log(`📌 嘗試修改: ${pagesSizeDropdown.id} (目前值: ${pagesSizeDropdown.value})\n`);
            
            // 點擊下拉選單
            await targetPage.click(`#${pagesSizeDropdown.id}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 尋找 100 的選項並點擊
            const found100 = await targetPage.evaluate(() => {
                const items = Array.from(document.querySelectorAll('li[role="treeitem"]'));
                const target = items.find(item => item.textContent.trim() === '100');
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            });
            
            if (found100) {
                console.log("✅ 已選擇 100 筆\n");
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log("⚠️ 未找到 100 選項\n");
            }
        }
        const pageInfo = await targetPage.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                readyState: document.readyState
            };
        });
        
        console.log(`頁面標題: ${pageInfo.title}`);
        console.log(`當前 URL: ${pageInfo.url}`);
        console.log(`頁面狀態: ${pageInfo.readyState}\n`);
        
        // 只收集訊息表格下面的內容
        const pageAnalysis = await targetPage.evaluate(() => {
            const analysis = {
                title: document.title,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                logs: []
            };
            
            // 直接查找所有 textarea（每個都對應一個 log 記錄）
            const allTextareas = document.querySelectorAll('textarea[id^="f_strMemo_"]');
            
            allTextareas.forEach((textarea) => {
                // 從 textarea ID 中提取 Log ID
                const memoId = textarea.id; // f_strMemo_214555210
                const logId = memoId.replace('f_strMemo_', '');
                
                // 查找對應的 status select
                const statusSelectId = `f_strStatus_${logId}`;
                const statusSelect = document.getElementById(statusSelectId);
                
                // 查找對應的 checkbox
                const checkboxId = logId;
                const checkbox = document.getElementById(checkboxId);
                
                // 找出該 log 所在的行
                let row = textarea;
                while (row && row.tagName !== 'TR') {
                    row = row.parentElement;
                }
                
                // 從行中的按鈕提取 URL 參數中的訊息和錯誤訊息
                let errorMessage = '';
                let errorUrl = '';
                if (row) {
                    const button = row.querySelector('input[type="button"]');
                    if (button && button.onclick) {
                        const onclickText = button.getAttribute('onclick');
                        
                        // 提取 q_strErrorKey 參數（錯誤訊息）
                        const errorKeyMatch = onclickText.match(/q_strErrorKey=([^&]*)/);
                        if (errorKeyMatch) {
                            errorMessage = decodeURIComponent(errorKeyMatch[1]);
                        }
                        
                        // 提取 q_strErrorUrl 參數（錯誤 URL）
                        const errorUrlMatch = onclickText.match(/q_strErrorUrl=([^&]*)/);
                        if (errorUrlMatch) {
                            errorUrl = decodeURIComponent(errorUrlMatch[1]);
                        }
                    }
                }
                
                const logData = {
                    logId: logId,
                    checked: checkbox?.checked || false,
                    memo: textarea.value.trim(),
                    status: statusSelect?.value || '',
                    statusText: statusSelect ? statusSelect.options[statusSelect.selectedIndex]?.text : '',
                    errorMessage: errorMessage,
                    errorUrl: errorUrl
                };
                
                analysis.logs.push(logData);
            });
            
            return analysis;
        });
        
        // 輸出分析結果
        console.log("📊 Log 事件整理報告\n");
        console.log(`頁面標題: ${pageAnalysis.title}`);
        console.log(`抓取時間: ${pageAnalysis.timestamp}`);
        console.log(`收集的 Log 記錄: ${pageAnalysis.logs.length} 筆\n`);
        
        if (pageAnalysis.logs.length > 0) {
            console.log("=== Log 數據摘要 ===\n");
            pageAnalysis.logs.slice(0, 5).forEach((log, idx) => {
                console.log(`【Log ID: ${log.logId}】`);
                console.log(`  狀態: ${log.statusText || '未設定'}`);
                if (log.memo) console.log(`  備註: ${log.memo}`);
                console.log(`  內容: ${log.rowContent}`);
                console.log();
            });
            
            if (pageAnalysis.logs.length > 5) {
                console.log(`... 還有 ${pageAnalysis.logs.length - 5} 筆記錄\n`);
            }
        }
        
        
        // 保存到檔案便於查看
        const outputPath = "./log-analysis.json";
        fs.writeFileSync(outputPath, JSON.stringify(pageAnalysis, null, 2));
        console.log(`✅ 分析結果已保存到: ${outputPath}\n`);
        
        // 詳細的 Log 內容輸出
        if (pageAnalysis.logs.length > 0) {
            console.log("\n=== 所有 Log 記錄 ===\n");
            pageAnalysis.logs.forEach((log, idx) => {
                console.log(`【第 ${idx + 1} 筆 - Log ID: ${log.logId}】`);
                console.log(`  勾選: ${log.checked ? '是' : '否'}`);
                console.log(`  狀態: ${log.statusText || '未設定'}`);
                console.log(`  備註: ${log.memo || '(無)'}`);
                console.log(`  內容: ${log.rowContent}`);
                console.log();
            });
        }
        
        
    } catch (error) {
        console.error("❌ 分析錯誤:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

(async () => {
    await main();
})();
