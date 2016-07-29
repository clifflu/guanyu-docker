/**
 *
 * Payload structure:
 *
 * Successful Scan: {
 *    cached:
 *      optional, naive | redis | ddb
 *
 *    filename:
 *      scan/file only, eliminated after scan
 *
 *    hash:
 *      base64 hash of the URI, TEXT or File content
 *
 *    options:
 *      Scan option for the request, ignored in cache
 *
 *    malicious:
 *      boolean, indicates any of its sub-resources was found malicious
 *      only for successful scans.
 *
 *    resource:
 *      optional, uri or array of uri found in request
 *
 *    result:
 *      scan result appended AFTER SCAN, or error message if scan_uri called with `failsafe`
 *
 *    scanned:
 *      ISO datetime string
 *
 *    flags:
 *      placeholder for temporarily flags that acts like internal options
 * }
 *
 * Error: {
 *    error:
 *    message:
 *    status:
 *      optional, overrides response http code
 *  }
 *
 */
"use strict";

var crypto = require('crypto');
var extend = require('extend');
var fs = require('fs');

var logger = require('./logger');


function from_string(string, options) {
  var shasum = crypto.createHash('sha256');
  var reply = {
    resource: string,
    malicious: false,
    scanned: new Date().toISOString(),
    options: options
  };

  return new Promise((fulfill) => {
    shasum.update(string);
    reply.hash = shasum.digest('base64');
    logger.debug(`Hash from text "${reply.hash}"`);
    fulfill(reply);
  });
}

function from_filename(filename, options) {
  var shasum = crypto.createHash('sha256');
  var reply = {
    filename: filename,
    malicious: false,
    scanned: new Date().toISOString(),
    options: options
  };

  logger.debug(`Creating hash from ${filename}`);

  return new Promise((fulfill, reject) => {
    var s = fs.ReadStream(filename);
    try {
      s.on('data', (d) => {
        shasum.update(d)
      });
      s.on('end', () => {
        reply.hash = shasum.digest('base64');
        logger.debug(`${reply.filename} hashed to "${reply.hash}"`);
        fulfill(reply)
      });
    } catch (ex) {
      reply.hash = ex;
      reject(reply);
    }
  });
}

module.exports = {
  from_string: from_string,
  from_filename: from_filename
};
