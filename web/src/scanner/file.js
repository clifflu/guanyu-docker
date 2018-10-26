'use strict';

const logFn = "web:src/scanner/file"
const { aws, config, cache, prepareLogger, queue } = require('guanyu-core');
const extend = require('extend');
const fs = require('fs');
const hash = require("../hash");
const { polling } = require("../polling");
const s3 = new aws.S3();
const bucket = config.get('STACK:SAMPLE_BUCKET');

function upload_file(payload) {
  const logger = prepareLogger({ loc: `${logFn}:uploadFile` });

  if (payload.result) {
    logger.debug("Skip upload file for result already known");
    return Promise.resolve(payload);
  }

  if (payload.cached) {
    logger.debug("Skip upload file for sophosav scanning");
    return Promise.resolve(payload);
  }

  if (!s3) {
    return Promise.reject(payload);
  }

  logger.debug(`Try put object to bucket: "${bucket}"`);
  return new Promise((resolve, reject) => {
    let filename = payload.filename.split("/tmp/")[1];
    fs.readFile(payload.filename, (err, data) => {
      if (err) {
        logger.error(`Failed read file from "${payload.filename}"`, err)
        return reject(payload);
      }

      let base64data = new Buffer.from(data, 'binary');

      s3.putObject({
        Bucket: bucket,
        Key: filename,
        Body: base64data
      }).promise().then(data => {
        logger.debug(`Put object "${payload.filename}" to ${bucket}`, data);
        payload.filename = filename;
        extend(payload, {
          queue_url: config.get('PLUGIN:SOPHOSAV:QUEUE')
        });

        resolve(payload);
      }, err => {
        logger.error(`Failed put file "${payload.filename}" to "${bucket}"`, err);
        reject(payload);
      });
    });
  });
}

function delete_file(payload) {
  let logger = prepareLogger({ loc: `${logFn}:delete_file` });

  if (!payload.deletefile) {
    logger.debug("Skip delete file for file be not put to s3");
    return Promise.reject(payload);
  }

  logger.debug(`Try to delete file "${payload.filename}"`);

  delete payload.deletefile;
  s3.deleteObject({
    Bucket: bucket,
    Key: payload.filename
  }, (err, data) => {
    if (err) {
      logger.error(`Failed to delete file "${payload.filename}" in "${bucket}"`, err);
    } else {
      logger.debug(`Success to delete file "${payload.filename}" in "${bucket}"`, data);
    }
  });

  return Promise.reject(payload);
}

/**
 * Scan a local file
 *
 * @param filename
 * @param options
 * @returns {Promise} rejects only on out-of-spec errors.
 */
function scan_file(filename, options) {
  return hash.from_filename(filename, options)
    .then(cache.get_result)
    .then(upload_file)
    .then(queue.send_message)
    .catch(delete_file)
    .then(cache.update_result)
    .then(polling);
}

module.exports = {
  scan_file: scan_file,
};
