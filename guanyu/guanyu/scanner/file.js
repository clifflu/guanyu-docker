"use strict";

var assert = require('assert');
var extend = require('extend');
var fs = require('fs');
var os = require('os');

var config = require("../config");
var logger = require('../logger');
var mycache = require('../cache');
var myhash = require("../hash");

var cpu_count = os.cpus().length;
var sav_max_seats = require('../config').get('PROC_PER_CORE') * cpu_count;

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


function ensure_savd_running(payload) {
  return new Promise((fulfill, reject) => {
    check_savd_status().then((running) => {
      if (running || config.get('DRUNK')) {
        return fulfill(payload);
      }

      exec('/opt/sophos-av/bin/savdctl --daemon start', {timeout: 3000}, (err) => {
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
 * Scans `payload.filename` with Sophos.
 *
 * Resolve with standard payload defined in cache.js hydrated with following attributes: {
 *  malicious: bool,
 *  result: scan result (virus name | empty string) or error
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

  if (config.get('DRUNK')) {
    return Promise.resolve(extend(payload, {
      malicious: false,
      result: "#drunk",
    }))
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
        delete payload.filename;
        fulfill(payload);
      });
    });
  })
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
    .then(mycache.get_result)
    .then(ensure_savd_running)
    .then(call_sav_scan)
    .then(mycache.update_result);
}

module.exports = {
  call_sav_scan: call_sav_scan,
  check_savd_status: check_savd_status,
  sav_max_seats: sav_max_seats,
  scan_file: scan_file,
};
