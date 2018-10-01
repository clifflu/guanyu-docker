const extend = require('extend');
const gc = require('guanyu-core')
const request = require('request');
const tmp = require('tmp');
const config = gc.config
const logFn = 'fetch:src/fetch_uri'
const plogger = gc.prepareLogger
const s3 = new gc.aws.S3();
const sqs = new gc.aws.SQS()

const file_max_size = config.get('MAX_SIZE');
const bucketName = config.get('STACK:SAMPLE_BUCKET');

const upload = require('s3-write-stream')(
	{
		Bucket: bucketName,
	}
)





/**
 * Wraps _fetch_uri and handle fall_with_upstream
 *
 * @param payload
 * @returns {Promise}
 */
function fetch_uri(payload) {
	let fall_with_upstream = payload.options && payload.options.fall_with_upstream;
  
	if (fall_with_upstream)
	  return _fetch_uri(payload);
  
	return _fetch_uri(payload).catch(function (payload) {
	  extend(payload, {
		malicious: false,
		result: `#${payload.message}`,
	  });
  
	  delete payload.error;
	  delete payload.status;
	  delete payload.message;
  
	  return Promise.resolve(payload);
	});
  }

  
/**
 *
 * @param payload
 * @returns {Promise}
 * @private
 */
function _fetch_uri(payload) {
	const logger = plogger({ loc: `${logFn}:fetch_uri` })

	if (!/^https?:\/\/.+/.test(payload.resource)) {
		logger.warn(`Unsupported uri: ${payload.resource}`);
		return Promise.reject(extend({}, payload, {
			status: 400,
			message: `Unsupported uri: ${payload.resource}`
		}));
	}

	return new Promise((fulfill, reject) => {
		let name = tmp.tmpNameSync({ template: 'guanyu-XXXXXXXX' });
		logger.debug(`Fetching "${payload.resource}" to "${name}"`);

		request({ method: "HEAD", url: payload.resource }, (err, headRes) => {
			// if (err)
			// 	return reject(extend(payload, {
			// 		status: 500,
			// 		error: err,
			// 	}));

			// // Catches upstream 4XX
			// if (Math.floor(headRes.statusCode / 100) == 4) {
			// 	return reject(extend(payload, {
			// 		status: 400,
			// 		message: "Upstream failed: " + headRes.statusMessage,
			// 	}))
			// }

			// let size = headRes.headers['content-length'];
			// if (size > file_max_size) {
			// 	return reject(extend(payload, {
			// 		status: 413,
			// 		message: "Resource too large",
			// 		result: new Error(`Resource size "${size}" exceeds limit "${file_max_size}"`)
			// 	}));
			// }


			let fetched_size = 0;
			let res = request({ url: payload.resource });

			res
				.on('data', (data) => {
					fetched_size += data.length;
					if (fetched_size > file_max_size) {
						payload = extend(payload, {
							status: 413,
							message: "Resource too large",
							error: new Error(`Fetched size "${fetched_size}" exceeds limit "${file_max_size}"`)
						});

						_delete_file(name).catch(function (err) {
							logger.debug(`Remove file in S3 error`);

							payload = extend(payload, { 
								message: "Failed to delete S3 file",
								error: err
							});

							return Promise.resolve(payload);
						});

						res.abort();

						return reject(payload)
					}
				})
				.pipe(upload(name))
				.on('finish', () => {
					payload.filename = name;
					logger.debug(`Saved to S3 ${payload.filename}`);
					fulfill(payload);
				})
				.on('error', (err) => {
					// Fetch failed
					reject(extend(payload, {
						status: "400",
						message: "fetch failed",
						error: err,
					}));
				});
		});
	});
}



/**
 *
 * @param payload
 * @returns {Promise}
 * @private
 */
function sendScanQueue(payload) {
	const logger = plogger({ loc: `${logFn}:sendScanQueue` })

	if(payload.result) {
		logger.info(`already have result, don't send scan queue`);
		return Promise.resolve(payload);
	}

	let sqsParams = {
		MessageBody: JSON.stringify(payload),
		QueueUrl: config.get('PLUGIN:SOPHOSAV:QUEUE')
	};

	return new Promise((resolve, reject) => {
		sqs.sendMessage(sqsParams, (err, data) => {
			if (err)
				return reject(extend(payload, {
					error: err
				}));

			return resolve(payload);
		})
	})
}


/**
 *
 * @param name
 * @returns {Promise}
 * @private
 */
function _delete_file(name) {
	const logger = plogger({ loc: `${logFn}:_delete_file` })
	logger.info(`Resource too large, delete fetch file in S3`)

	let params = {
		Bucket: bucketName,
		Key: name
	};

	return new Promise((resolve, reject) => {
		s3.deleteObject(params, function (err, data) {
			err = new Error("test error");
			if (err) {
				logger.info(`entry delete error`);
				return reject("err");
			}
		});

		return resolve("success");
	});
}


/**
 *
 * @param payload
 * @returns {*}
 */
function fetch_uri_and_upload(payload) {
	return fetch_uri(payload)
		.then(sendScanQueue)
}

module.exports = {
	fetch_uri_and_upload: fetch_uri_and_upload,
};
