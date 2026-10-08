import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// 依指定日期的 git commit 推算加班項目與時段：
// - 掃 IGS_WORK_DIR（預設 ~/Documents/work）底下各 git repo，作者為各 repo 的 git user.email
// - 只看加班開始時間（預設 18:30）之後的非 merge commit
// - 加班項目＝commit 數最多的工單；結束時間＝最後一筆 commit 往上取整到 30 分鐘
const OVERTIME_START = process.env.IGS_OVERTIME_START || "18:30";
const SLOT_MINUTES = 30;

function git(dir, args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function listRepos() {
  const roots = (process.env.IGS_WORK_DIR || path.join(os.homedir(), "Documents", "work")).split(";").filter(Boolean);
  const repos = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) {
      const dir = path.join(root, name);
      if (fs.existsSync(path.join(dir, ".git"))) repos.push(dir);
    }
  }
  return repos;
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// commit 標題格式：yyyyMMdd 姓名 w/r單號 案件名稱 [type:] 說明
// 有 type 前綴時可準確切出案件名稱；沒有時案件名稱與說明分不開，先取第一個詞，彙整時改用同單號有 type 的案件名稱
const SUBJECT = /^\d{8}\s+\S+\s+([wr]\d+)\s+(.+?)\s+(?:feat|fix|docs|refactor|chore|test|revert|perf|style|build|ci)(?:\([^)]*\))?:/i;
const SUBJECT_NO_TYPE = /^\d{8}\s+\S+\s+([wr]\d+)\s+(\S+)/i;

export function collectCommits(dateStr) {
  // dateStr：yyyy/MM/dd
  const day = dateStr.replace(/\//g, "-");
  const commits = [];
  for (const dir of listRepos()) {
    const email = git(dir, ["config", "user.email"]);
    if (!email) continue;
    const out = git(dir, [
      "log", "--all", "--no-merges", `--author=${email}`,
      `--since=${day} 00:00:00`, `--until=${day} 23:59:59`,
      "--date=format:%H:%M", "--format=%ad|%s",
    ]);
    for (const line of out.split("\n").filter(Boolean)) {
      const i = line.indexOf("|");
      const time = line.slice(0, i);
      const subject = line.slice(i + 1);
      const m = subject.match(SUBJECT);
      const loose = m ? null : subject.match(SUBJECT_NO_TYPE);
      if (!m && !loose) continue; // 略過 Begin、無工單號的 commit
      commits.push({
        repo: path.basename(dir), dir, time, subject,
        ticket: (m || loose)[1].toLowerCase(),
        caseName: (m || loose)[2].trim(),
        exactName: !!m,
      });
    }
  }
  // 沒有 type 前綴的 commit，案件名稱改用同單號有 type 的那筆；當天沒有就往該 repo 的歷史找
  const names = new Map(commits.filter((c) => c.exactName).map((c) => [c.ticket, c.caseName]));
  for (const c of commits) {
    if (c.exactName) continue;
    if (!names.has(c.ticket)) names.set(c.ticket, findCaseName(c.dir, c.ticket) || c.caseName);
    c.caseName = names.get(c.ticket);
  }
  return commits;
}

// 在 repo 歷史中找同單號、帶 type 前綴的 commit，取出完整案件名稱
export function findCaseName(dir, ticket) {
  const out = git(dir, ["log", "--all", "-n", "50", `--grep=${ticket}`, "--format=%s"]);
  for (const s of out.split("\n")) {
    const m = s.match(SUBJECT);
    if (m && m[1].toLowerCase() === ticket) return m[2].trim();
  }
  return null;
}

// 加班時段內沒有 commit 時的預設結束時間
const DEFAULT_END = process.env.IGS_OVERTIME_END || "20:30";

export function computeOvertime(dateStr, opts = {}) {
  const start = opts.start || OVERTIME_START;
  const startMin = toMinutes(start);
  const dayCommits = collectCommits(dateStr);
  let commits = dayCommits.filter((c) => toMinutes(c.time) >= startMin);
  let fallback = false;
  if (commits.length === 0) {
    // 加班時段沒有 commit：時段用預設值，項目改取當天 commit 最多的工單
    fallback = true;
    commits = dayCommits;
  }
  if (commits.length === 0) {
    return { found: false, fallback, date: dateStr, start, end: DEFAULT_END, reason: `${dateStr} 沒有 commit` };
  }

  // 同一筆 commit 可能同時出現在多個 repo（同步提交），依 時間＋標題 去重
  const unique = [...new Map(commits.map((c) => [`${c.time}|${c.subject}`, c])).values()];
  const byTicket = new Map();
  for (const c of unique) {
    const g = byTicket.get(c.ticket) || { ticket: c.ticket, caseName: c.caseName, count: 0, last: "00:00" };
    g.count += 1;
    if (c.time > g.last) g.last = c.time;
    byTicket.set(c.ticket, g);
  }
  const ranked = [...byTicket.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
  // 結束時間預設 20:30；只有 commit 證明做超過時才延後，未滿 30 分鐘的部分不算（21:15 → 21:00）
  const lastMin = Math.max(...unique.map((c) => toMinutes(c.time)));
  const endMin = Math.max(toMinutes(DEFAULT_END), Math.floor(lastMin / SLOT_MINUTES) * SLOT_MINUTES);

  return {
    found: true,
    fallback,
    date: dateStr,
    start,
    end: fallback ? DEFAULT_END : toHHMM(endMin),
    lastCommit: toHHMM(lastMin),
    ticket: ranked[0].ticket,
    caseName: ranked[0].caseName,
    candidates: ranked,
  };
}

// 從 WebCase 個人看版（Board21.aspx）「目前進度」表格讀出案件名稱 → 進度
export async function readCaseProgress(browser) {
  const page = await browser.newPage();
  try {
    await page.goto("https://webcase.towergame.com/Board/Board21.aspx", { waitUntil: "domcontentloaded" });
    // 看版表格在載入後才產生，等「目前進度」表頭出現再讀，避免偶發讀到空表
    await page.waitForFunction(() => document.body && document.body.innerText.includes("目前進度"), { timeout: 15000 }).catch(() => {});
    return await page.evaluate(() => {
      // 看版是巢狀表格：以「直接子儲存格」剛好含 案件名稱、目前進度 的列當表頭，只讀同一個 table 的列
      const result = {};
      const cellsOf = (tr) => [...tr.children].map((td) => td.innerText.trim());
      for (const header of document.querySelectorAll("tr")) {
        const cells = cellsOf(header);
        const nameIdx = cells.indexOf("案件名稱");
        const progressIdx = cells.indexOf("目前進度");
        if (nameIdx < 0 || progressIdx < 0) continue;
        const rows = header.parentElement.children;
        for (const tr of rows) {
          if (tr === header) continue;
          const c = cellsOf(tr);
          if (c.length <= Math.max(nameIdx, progressIdx)) continue;
          const name = c[nameIdx].replace(/^[^\p{L}\p{N}\[【「]+/u, "").trim(); // 去掉 ⚠️ 等前置符號
          const progress = c[progressIdx] === "" ? NaN : Number(c[progressIdx]);
          if (name && Number.isFinite(progress)) result[name] = progress;
        }
      }
      return result;
    });
  } finally {
    await page.close();
  }
}

export function findProgress(progressMap, caseName) {
  if (caseName in progressMap) return progressMap[caseName];
  const key = Object.keys(progressMap).find((k) => k.includes(caseName) || caseName.includes(k));
  return key === undefined ? null : progressMap[key];
}
