'use strict';
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
 *    version:
 *      Guanyu version
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

const crypto = require('crypto');
const extend = require('extend');
const fs = require('fs');

const httperror = require('./httperror');
const logFn = "hash:src/hash";
const { prepareLogger } = require('guanyu-core');
const version = require('./version');


function from_string(string, options) {
  const logger = prepareLogger({ loc: `${logFn}:fromString` });
  if (!string)
    return Promise.reject(httperror.CONTENT_MISSING);

  let shasum = crypto.createHash('sha256');
  let reply = {
    malicious: false,
    options: options,
    resource: string,
    scanned: new Date().toISOString(),
    version: version,
  };

  return new Promise((fulfill) => {
    shasum.update(string);
    reply.hash = shasum.digest('base64');
    logger.debug(`Hash from text "${reply.hash}"`);
    fulfill(reply);
  });
}

function from_filename(filename, options) {
  const logger = prepareLogger({ loc: `${logFn}:fromFilename` });
  if (!filename)
    return Promise.reject(httperror.CONTENT_MISSING);

  let shasum = crypto.createHash('sha256');
  let reply = {
    filename: filename,
    malicious: false,
    options: options,
    scanned: new Date().toISOString(),
    version: version,
  };

  logger.debug(`Creating hash from ${filename}`);

  return new Promise((fulfill, reject) => {
    let s = fs.ReadStream(filename);
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
