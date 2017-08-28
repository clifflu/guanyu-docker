'use strict';

const assert = require('assert');
const extend = require('extend');
const fs = require('fs');
const os = require('os');

const config = require("../../config");
const logger = require('../logger');
const mycache = require('../cache');
const myhash = require("../hash");

const exec = require('child_process').exec;


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
      exec(savdstatus, {timeout: 1000}, (err, stdout) => {
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
  return new Promise((fulfill, reject) => {
    check_savd_status().then((running) => {
      if (running || config.get('DRUNK'))
        return fulfill(payload);

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


function call_sav_scan(payload) {
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

  return call_sav_scan_once(payload)
    .catch(call_sav_scan_once)
    .catch(call_sav_scan_once)
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
function call_sav_scan_once(payload) {
  var sav = "/opt/sophos-av/bin/savscan";
  var sav_opt = "-archive -ndi -ss";
  var ptrn = / Virus '(.+)' found in file /;
  var match;

  return new Promise((fulfill, reject) => {
    exec(`${sav} ${sav_opt} "${payload.filename}"`, {timeout: 30000}, (err, stdout, stderr) => {
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

        logger.debug(`Deleting "${payload.filename}"`);

        try {
          fs.unlink(payload.filename);
        } catch (ex) {
          logger.warn(`FS cleanup "${payload.filename}" failed, err = ${ex}`)
        }

        logger.debug(`Scan result for ${payload.filename}: ${payload.malicious}`);
        delete payload.filename;
        return fulfill(payload);
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
  scan_file: scan_file,
};
