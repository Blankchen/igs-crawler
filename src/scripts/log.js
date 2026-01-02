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
        
        // 設定日期範圍
        console.log("📅 設定監控時間範圍...\n");
        const startDate = "2026/01/15";
        const endDate = "2026/01/21";
        
        const dateSetResult = await targetPage.evaluate((startDate, endDate) => {
            // 尋找日期輸入欄位
            const dateInputs = Array.from(document.querySelectorAll('input[type="text"]')).filter(input => {
                const placeholder = input.placeholder || '';
                const name = input.name || '';
                const id = input.id || '';
                return placeholder.includes('日') || name.includes('date') || name.includes('Date') || id.includes('date');
            });
            
            // 尋找所有input，查找可能的日期欄位
            const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
            
            return {
                dateInputs: dateInputs.map(input => ({
                    id: input.id,
                    name: input.name,
                    placeholder: input.placeholder,
                    value: input.value,
                    type: input.type
                })),
                allInputCount: allInputs.length,
                firstInputs: allInputs.slice(0, 10).map(input => ({
                    id: input.id,
                    name: input.name,
                    placeholder: input.placeholder,
                    value: input.value
                }))
            };
        }, startDate, endDate);
        
        console.log("找到的日期相關欄位:");
        console.log(JSON.stringify(dateSetResult, null, 2));
        console.log();
        
        // 嘗試設定日期
        const dateSettingSuccess = await targetPage.evaluate((startDate, endDate) => {
            let result = {
                startDateSet: false,
                endDateSet: false,
                startDateId: null,
                endDateId: null
            };
            
            // 尋找日期欄位（通常名為 startDate, endDate, beginDate, qStartDate 等）
            const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
            
            // 優先尋找含有 "start", "begin", "from" 的欄位
            const startInput = allInputs.find(input => {
                const name = (input.name || '').toLowerCase();
                const id = (input.id || '').toLowerCase();
                return name.includes('start') || name.includes('begin') || name.includes('from') ||
                       id.includes('start') || id.includes('begin') || id.includes('from');
            });
            
            // 優先尋找含有 "end", "to", "until" 的欄位
            const endInput = allInputs.find(input => {
                const name = (input.name || '').toLowerCase();
                const id = (input.id || '').toLowerCase();
                return name.includes('end') || name.includes('to') || name.includes('until') ||
                       id.includes('end') || id.includes('to') || id.includes('until');
            });
            
            // 如果找不到，嘗試按位置（通常第一個和第二個日期欄位）
            let startInputFinal = startInput;
            let endInputFinal = endInput;
            
            if (!startInputFinal && allInputs.length > 0) {
                // 查找看起來像日期的欄位
                startInputFinal = allInputs.find(input => {
                    const placeholder = (input.placeholder || '').toLowerCase();
                    return placeholder.includes('日') || placeholder.includes('yyyy') || placeholder.includes('2026');
                });
                if (!startInputFinal) startInputFinal = allInputs[0];
            }
            
            if (!endInputFinal && allInputs.length > 1) {
                endInputFinal = allInputs.find(input => {
                    const placeholder = (input.placeholder || '').toLowerCase();
                    return placeholder.includes('日') || placeholder.includes('yyyy') || placeholder.includes('2026');
                });
                if (!endInputFinal) endInputFinal = allInputs[1];
            }
            
            // 設定開始日期
            if (startInputFinal) {
                startInputFinal.value = startDate;
                startInputFinal.dispatchEvent(new Event('input', { bubbles: true }));
                startInputFinal.dispatchEvent(new Event('change', { bubbles: true }));
                result.startDateSet = true;
                result.startDateId = startInputFinal.id || startInputFinal.name;
            }
            
            // 設定結束日期
            if (endInputFinal) {
                endInputFinal.value = endDate;
                endInputFinal.dispatchEvent(new Event('input', { bubbles: true }));
                endInputFinal.dispatchEvent(new Event('change', { bubbles: true }));
                result.endDateSet = true;
                result.endDateId = endInputFinal.id || endInputFinal.name;
            }
            
            return result;
        }, startDate, endDate);
        
        console.log("日期設定結果:");
        console.log(`  開始日期 (${startDate}): ${dateSettingSuccess.startDateSet ? '✅ 已設定' : '❌ 失敗'} ${dateSettingSuccess.startDateId ? `(${dateSettingSuccess.startDateId})` : ''}`);
        console.log(`  結束日期 (${endDate}): ${dateSettingSuccess.endDateSet ? '✅ 已設定' : '❌ 失敗'} ${dateSettingSuccess.endDateId ? `(${dateSettingSuccess.endDateId})` : ''}\n`);
        
        // 尋找並點擊查詢/搜索按鈕
        console.log("🔍 尋找查詢按鈕...\n");
        const searchButtonFound = await targetPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
            const searchBtn = buttons.find(btn => {
                const value = (btn.value || btn.textContent || '').toLowerCase();
                return value.includes('查詢') || value.includes('search') || value.includes('submit');
            });
            
            if (searchBtn) {
                searchBtn.click();
                return true;
            }
            return false;
        });
        
        if (searchButtonFound) {
            console.log("✅ 已點擊查詢按鈕，等待頁面更新...\n");
            await delay(2000); // 等待查詢結果加載
        } else {
            console.log("⚠️ 未找到查詢按鈕\n");
        }
        
        // 將每頁筆數從 20 調整成 100（Select2 + 原生 select 雙保險）
        console.log("🔍 設定每頁筆數為 100...\n");

        const dropdownsInfo = await targetPage.evaluate(() => {
            return Array.from(document.querySelectorAll('[id^="select2-"]')).map(el => ({
                id: el.id,
                value: el.textContent.trim(),
                parent: el.parentElement?.textContent.trim().substring(0, 80) || ''
            }));
        });

        console.log("所有 Select2 下拉選單:");
        dropdownsInfo.forEach((info, idx) => {
            console.log(`${idx}. ${info.id}: "${info.value}"`);
            console.log(`   父元素: ${info.parent}\n`);
        });

        // 挑出看起來像每頁筆數的下拉，優先含 20/50/100 或父元素含「每頁」字樣
        const pagesSizeDropdown = dropdownsInfo.find(d => /(^|\s)(20|50|100)(\s|$)/.test(d.value) || d.parent.includes('每頁'))
            || dropdownsInfo[1];

        if (pagesSizeDropdown) {
            console.log(`📌 嘗試修改: ${pagesSizeDropdown.id} (目前值: ${pagesSizeDropdown.value})\n`);

            // 1) 點擊 Select2 外觀並選 100
            try {
                await targetPage.click(`#${pagesSizeDropdown.id}`);
                await targetPage.waitForSelector('li[role="treeitem"]', { timeout: 2000 });

                const found100 = await targetPage.evaluate(() => {
                    const items = Array.from(document.querySelectorAll('li[role="treeitem"]'));
                    const target = items.find(item => item.textContent.trim() === '100');
                    if (target) {
                        target.click();
                        return true;
                    }
                    return false;
                });

                console.log(found100 ? "✅ Select2 已選擇 100" : "⚠️ Select2 未找到 100 選項");
            } catch (err) {
                console.log(`⚠️ Select2 點擊失敗: ${err.message}`);
            }

            // 2) 直接調整背後的原生 select，避免畫面沒同步
            const nativeResult = await targetPage.evaluate(() => {
                const selects = Array.from(document.querySelectorAll('select'));
                const candidate = selects.find(sel => {
                    const textAround = (sel.parentElement?.textContent || '').toLowerCase();
                    const hasOption100 = Array.from(sel.options).some(opt => opt.text.trim() === '100' || opt.value === '100');
                    return hasOption100 || textAround.includes('每頁');
                });

                if (!candidate) {
                    return { applied: false, reason: 'no-select' };
                }

                const opt100 = Array.from(candidate.options).find(opt => opt.text.trim() === '100' || opt.value === '100');
                if (!opt100) {
                    return { applied: false, reason: 'no-100-option', selectId: candidate.id };
                }

                candidate.value = opt100.value;
                candidate.dispatchEvent(new Event('change', { bubbles: true }));

                const select2Display = document.querySelector(`#select2-${candidate.id}-container`);
                if (select2Display) select2Display.textContent = opt100.textContent.trim();

                return { applied: true, selectId: candidate.id, value: opt100.value };
            });

            if (nativeResult.applied) {
                console.log(`✅ 原生 select 已設為 100 (id: ${nativeResult.selectId || '未知'})\n`);
            } else {
                console.log(`⚠️ 原生 select 調整失敗 (${nativeResult.reason || '未知原因'})\n`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log("❌ 找不到每頁筆數的下拉選單\n");
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
        const pageAnalysis = await targetPage.evaluate(async () => {
            const decodeText = (txt) => {
                try {
                    return decodeURIComponent(txt);
                } catch (e) {
                    return txt;
                }
            };

            const analysis = {
                title: document.title,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                logs: []
            };
            
            // 直接查找所有 textarea（每個都對應一個 log 記錄）
            const allTextareas = Array.from(document.querySelectorAll('textarea[id^="f_strMemo_"]'));
            
            for (const textarea of allTextareas) {
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
                let rowText = '';
                let columns = [];
                let preText = '';
                let preHtml = '';
                let popupPreText = '';
                let popupHtml = '';
                let extraOnclick = {};
                let decodedOnclick = '';
                if (row) {
                    rowText = row.innerText.trim();
                    columns = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());

                    const findPre = () => {
                        const candidates = [row, row?.nextElementSibling, row?.previousElementSibling, row?.parentElement];
                        for (const n of candidates) {
                            if (!n) continue;
                            const p = n.querySelector('pre');
                            if (p) return p;
                        }
                        return document.querySelector('pre');
                    };

                    const pre = findPre();
                    if (pre) {
                        preText = pre.innerText.trim();
                        preHtml = pre.innerHTML || '';
                    }

                    const button = row.querySelector('input[type="button"]');
                    let rawOnclick = '';
                    let errorKeyRaw = '';
                    if (button && button.onclick) {
                        const onclickText = button.getAttribute('onclick');
                        rawOnclick = onclickText || '';
                        decodedOnclick = decodeText(decodeText(rawOnclick));
                        
                        // 提取 q_strErrorKey 參數（錯誤訊息）
                        const errorKeyMatch = onclickText.match(/q_strErrorKey=([^&]*)/);
                        if (errorKeyMatch) {
                            errorMessage = decodeURIComponent(errorKeyMatch[1]);
                            errorKeyRaw = errorKeyMatch[1];
                        }
                        
                        // 提取 q_strErrorUrl 參數（錯誤 URL）
                        const errorUrlMatch = onclickText.match(/q_strErrorUrl=([^&]*)/);
                        if (errorUrlMatch) {
                            errorUrl = decodeURIComponent(errorUrlMatch[1]);
                        }

                        // 直接抓取 popup 內容 (p_ChooseHistory.aspx...) 以取得完整堆疊
                        const urlMatch = onclickText.match(/open\('([^']+)'/);
                        if (urlMatch) {
                            const detailUrl = new URL(urlMatch[1], window.location.href).href;
                            try {
                                const res = await fetch(detailUrl, { credentials: 'include' });
                                const html = await res.text();
                                popupHtml = html;
                                const div = document.createElement('div');
                                div.innerHTML = html;
                                const preInPopup = div.querySelector('pre');
                                if (preInPopup) {
                                    popupPreText = preInPopup.innerText.trim();
                                }
                            } catch (e) {
                                popupPreText = popupPreText || '';
                            }
                        }
                    }
                    // 如果還沒有 errorUrl，嘗試從行文字中找出第一個 URL
                    if (!errorUrl) {
                        const urlMatch = rowText.match(/https?:\/\/[^\s]+/);
                        if (urlMatch) errorUrl = urlMatch[0];
                    }
                    // 如果 pre 內容有網址，也嘗試取第一個
                    if (!errorUrl && preText) {
                        const preUrlMatch = preText.match(/https?:\/\/[^\s]+/);
                        if (preUrlMatch) errorUrl = preUrlMatch[0];
                    }
                    // 將 onclick 原始與解碼內容也收集
                    if (!errorMessage && decodedOnclick) errorMessage = decodedOnclick;
                    extraOnclick = { rawOnclick, decodedOnclick, errorKeyRaw };
                }

                const decodedErrorMessage = decodeText(decodeText(errorMessage));
                const decodedErrorUrl = decodeText(decodeText(errorUrl));
                const decodedPreText = decodeText(decodeText(preText));
                const decodedPopupPre = decodeText(decodeText(popupPreText));
                const finalErrorMessage = decodedPopupPre || decodedPreText || decodedOnclick || decodedErrorMessage;
                
                const logData = {
                    logId: logId,
                    checked: checkbox?.checked || false,
                    memo: textarea.value.trim(),
                    status: statusSelect?.value || '',
                    statusText: statusSelect ? statusSelect.options[statusSelect.selectedIndex]?.text : '',
                    errorMessageBrief: decodedErrorMessage,
                    errorMessageFull: decodedPopupPre || decodedPreText,
                    errorUrl: decodedErrorUrl,
                    rowContent: rowText,
                    columns: columns,
                    onclick: extraOnclick || {}
                };
                
                analysis.logs.push(logData);
            }
            
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
