import { CronJob } from 'cron';
import { getBrowserConfig } from './config/shared.js';
import { runAll } from './scripts/all.js';

// 啟動時先連一次，讓允許視窗在啟動當下跳出，而不是等到排程時間
// runAll 會開啟常駐模式，整個排程共用同一條連線
await getBrowserConfig();

const job = CronJob.from({
	cronTime: '0 0 9 * * 2-5',
	onTick: runAll,
	start: true,
	timeZone: 'Asia/Taipei'
});
