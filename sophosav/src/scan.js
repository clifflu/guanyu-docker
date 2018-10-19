const assert = require('assert');
const extend = require('extend');
const { cache } = require('guanyu-core');
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


function call_sav_scan(payload) {
	const logger = plogger({ loc: `${logFn}:call_sav_scan` });
	if (payload.result || !payload.filename) {
		logger.debug("Skip sav scan for result or !filename");
		return Promise.resolve(payload);
	}

	logger.debug(`Scanning (sophos) ${payload.filename}`);

	return call_sav_scan_once(payload)
		.catch(call_sav_scan_once)
		.catch(call_sav_scan_once)
}


/**
* Scans `payload.filename` with Sophos.
*
* Resolve with standard payload defined in web/hash.js hydrated with following attributes: {
*  malicious: bool,
*  result: scan result (virus name | empty string) or error
* }
*
* @param payload
* @returns Promise
*/
function call_sav_scan_once(payload) {
	const logger = plogger({ loc: `${logFn}:call_sav_scan_once` });

	var sav = "/opt/sophos-av/bin/savscan";
	var sav_opt = "-archive -ndi -ss";
	var ptrn = / Virus '(.+)' found in file /;
	var match;

	return new Promise((fulfill, reject) => {
		exec(`${sav} ${sav_opt} "${payload.filename}"`, { timeout: 30000 }, (err, stdout, stderr) => {

			logger.debug(`Savscan: stdout: ${stdout}\nstderr: ${stderr}`);

			if (match = stdout.match(ptrn)) {
				assert(err.code == 3);
				payload.malicious = true;
				payload.result = match[1];
			} else if (stderr == '' && !err) {
				// No output and return 0 if negative
				payload.malicious = false;
				payload.result = "clean";
			} else if (err && err.code == 2) {
				// Encrypted file that savscan can't decrypt
				payload.malicious = false;
				payload.result = '#can\'t decrypt';
			} else {
				logger.warn(`File scanner failed with stdout: "${stdout}" and stderr: "${stderr}"`);
				logger.warn(err);

				return reject(extend({}, payload, {
					error: new Error(stderr || stdout),
					status: 500,
				}));
			}

			logger.debug(`Scan result for ${payload.filename}: ${payload.malicious}`);

			return fulfill(payload);
		});
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
	let file = fs.createWriteStream(payload.filename);

	return new Promise((resolve, reject) => {
		s3.getObject(params).createReadStream()
		.on('end', () => {
			logger.info(`get ${payload.filename} in ${bucketName}`);

			return resolve(payload)
		})
		.on('error', function (error) {
			logger.error(`${error.name}: ${error.message}`)
			return reject(err)
		})
		.pipe(file);
	});
}



/**
 *
 * @param payload
 * @returns {Promise}
 */
function delete_file_in_S3(payload) {
	const logger = plogger({ loc: `${logFn}:get_file_with_S3` });
	logger.debug(`Deleting "${payload.filename}" in S3 bucket`);

	let params = {
		Bucket: bucketName,
		Key: payload.filename
	};

	return new Promise((resolve, reject) => {
		s3.deleteObject(params, function (err, data) {
			if (err)
				return reject(err)

			return resolve(payload)
		});
	}).catch((err) => {
		logger.warn(`S3 cleanup "${payload.filename}" failed, err = ${err}`);
		return Promise.resolve(payload);
	});

}

/**
 *
 * @param payload
 * @returns {Promise}
 */
function delete_file(payload) {
	const logger = plogger({ loc: `${logFn}:get_file_with_S3` });
	logger.debug(`Deleting "${payload.filename}"`);

	try {
		fs.unlink(payload.filename);
	} catch (ex) {
		logger.warn(`FS cleanup "${payload.filename}" failed, err = ${ex}`)
	}

	delete payload.filename;
	delete payload.cached;
	return Promise.resolve(payload);
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
		.then(call_sav_scan)
		.then(delete_file_in_S3)
		.then(delete_file)
		.then(cache.update_result_ddb)
}

module.exports = {
	scan_file: scan_file,
};