import { CronJob } from 'cron';

const job = CronJob.from({
	cronTime: '0 0 9 * * 2-5',
	onTick: function () {
		console.log('You will see this message every second');
    // uofMain();
    // towergameMain();
    import('./scripts/towergame.js')
    import('./scripts/uof.js')
	},
	start: true,
	timeZone: 'Asia/Taipei'
});