const exec = require('child_process').exec;
const fs = require('fs');
const gc = require('guanyu-core');

const config = gc.config;
const logFn = 'sophosav:src/scan';
const plogger = gc.prepareLogger;

const s3 = new gc.aws.S3();
const bucketName = config.get('STACK:SAMPLE_BUCKET');



/**
 * Check SAVD status as promise
 *
 * @returns {Promise}
 */
const check_savd_status = (() => {
	var _savd_running;

	return () => {
		if (_savd_running !== undefined)
			return Promise.resolve(_savd_running);

		var savdstatus = "/opt/sophos-av/bin/savdstatus";
		var pattern_good = /^Sophos Anti-Virus is active /;

		return new Promise((fulfill) => {
			exec(savdstatus, { timeout: 1000 }, (err, stdout) => {
				if (stdout.match(pattern_good)) {
					_savd_running = true;
					return fulfill(true);
				}
				_savd_running = false;
				fulfill(false);
			});
		});
	}
})();


function ensure_savd_running(payload) {
	const logger = plogger({ loc: `${logFn}:ensure_savd_running` });

	return new Promise((fulfill, reject) => {
		check_savd_status().then((running) => {
			if (running)
				return fulfill(payload);

			exec('/opt/sophos-av/bin/savdctl --daemon start', { timeout: 3000 }, (err) => {
				if (err) {
					logger.warn('Failed starting savd, ', err);
					return reject(err);
				}

				logger.info('Started savd during scan');
				fulfill(payload);
			});
		})
	});
}


/**
 *
 * @param payload
 * @returns {Promise}
 */
function get_file_with_S3(payload) {
	const logger = plogger({ loc: `${logFn}:get_file_with_S3` });
	let params = {
		Bucket: bucketName,
		Key: payload.filename
	};
	logger.info(`Bucket name is ${bucketName}`)

	return new Promise((resolve, reject) => {
		s3.getObject(params, function (err, data) {
			if (err)
				return reject(err)

			logger.info(`get ${payload.filename} in ${bucketName}`);
			resolve(payload)
		}).createReadStream().pipe(fs.createWriteStream(payload.filename));
	});
}

/**
 * Scan a local file
 *
 * @param payload
 * @param options
 * @returns {Promise} rejects only on out-of-spec errors.
 */
function scan_file(payload) {
	return ensure_savd_running(payload)
		.then(get_file_with_S3)
}

module.exports = {
	scan_file: scan_file,
};