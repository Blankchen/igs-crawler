import { CronJob } from 'cron';

const job = CronJob.from({
	cronTime: '0 0 9 * * 1-5',
	onTick: function () {
		console.log('You will see this message every second');
    // uofMain();
    // towergameMain();
    import('./scripts/uof.js')
    import('./scripts/towergame.js')
	},
	start: true,
	timeZone: 'Asia/Taipei'
});