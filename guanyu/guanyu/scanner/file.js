"use strict";


var assert = require('assert');
var extend = require('extend');
var fs = require('fs');
var Promise = require('promise');

var logger = require('../logger');
var mycache = require('../cache');
var myhash = require("../hash");

var sav_max_seats = require('../../config').sav_max_seats;

var exec = require('child_process').exec;
var sem = require('semaphore')(sav_max_seats);


/**
 * Check SAVD status as promise
 *
 * @returns {Promise}
 */
function check_savd_status() {
  var savdstatus = "/opt/sophos-av/bin/savdstatus";
  var pattern_good = /^Sophos Anti-Virus is active /;

  return new Promise((fulfill) => {
    exec(savdstatus, {timeout: 1000}, (err, stdout) => {
      if (stdout.match(pattern_good))
        fulfill(true);

      fulfill(false);
    });
  });
}

/**
 * Scans `payload.filename` with Sophos.
 *
 * Resolve or reject with {
 *  malicious: bool,
 *  scanned: ISO Time string,
 *  hash: hash (sha256 in base64) of that file
 *  result: scan result [clean|VirusName]
 *  error: stderr on error
 * }
 *
 * @param payload
 * @returns Promise
 */
function call_sav_scan(payload) {
  var sav = "/opt/sophos-av/bin/savscan";
  var sav_opt = "-archive -ndi -ss";
  var ptrn = / Virus '(.+)' found in file /;
  var match;


  if (payload.result || !payload.filename) {
    logger.debug("Skip sav scan for result or !filename");
    return Promise.resolve(payload);
  }

  logger.debug(`Scanning (sophos) ${payload.filename}`);

  return new Promise((fulfill, reject) => {
    sem.take(() => {
      exec(`${sav} ${sav_opt} "${payload.filename}"`, {timeout: 30000}, (err, stdout, stderr) => {
        sem.leave();

        logger.debug(`Deleting "${payload.filename}"`);
        try {
          fs.unlink(payload.filename);
        } catch (ex) {
          logger.warn(`FS cleanup "${payload.filename}" failed, err = ${ex}`)
        }

        if (match = stdout.match(ptrn)) {
          assert(err.code == 3);
          payload.malicious = true;
          payload.result = match[1]
        } else if (stderr == '' && !err) {
          // No output and return 0 if negative
          payload.result = "clean";
        } else if (err && err.code == 2) {
          // Encrypted file that savscan can't decrypt
          payload.result = "clean";
        } else {
          logger.warn(`File scanner failed with stdout: "${stdout}" and stderr: "${stderr}"`);
          logger.warn(err);
          payload.error = stderr || stdout;
          payload.status = 500;
          reject(payload);
          return
        }
        logger.debug(`Scan result for ${payload.filename}: ${payload.malicious}`);
        delete payload.filename;
        fulfill(payload);
      });
    });
  })
}

function scan_file(filename, options) {
  return myhash.from_filename(filename, options)
    .then(mycache.get_result)
    .then(call_sav_scan)
    .then(mycache.update_result);
}

module.exports = {
  call_sav_scan: call_sav_scan,
  check_savd_status: check_savd_status,
  scan_file: scan_file
};
