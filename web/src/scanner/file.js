'use strict';

const assert = require('assert');
const extend = require('extend');
const fs = require('fs');
const os = require('os');

const logFn = "file:src/scanner/file"
const { config, cache, prepareLogger } = require('guanyu-core');
const myhash = require("../hash");

const exec = require('child_process').exec;

function ensure_savd_running(payload) {
  const logger = prepareLogger({ loc: `${logFn}:ensureSavdRunning` });

  /*
   * write S3 putObject logic and SQS sendMessage logic
  */

  /*
   *  RETURN
   *  
   *  return new Promise((fulfill, reject) => {
   *    fulfill(payload);
   *    reject(payload);
   *  });
   *  return Promise.resolve(payload);
   *  return Promise.reject(payload);
   */
}

/**
 * Scan a local file
 *
 * @param filename
 * @param options
 * @returns {Promise} rejects only on out-of-spec errors.
 */
function scan_file(filename, options) {
  return myhash.from_filename(filename, options)
    .then(cache.get_result)
    .then(ensure_savd_running)
    .then(cache.update_result);
}

module.exports = {
  scan_file: scan_file,
};
