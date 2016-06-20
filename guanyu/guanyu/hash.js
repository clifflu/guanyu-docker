"use strict";

var crypto = require('crypto');
var fs = require('fs');
var Promise = require('promise');

var logger = require('./logger');


function from_string(string) {
  var shasum = crypto.createHash('sha256');
  var reply = {
      resource: string,
      malicious: false,
      scanned: new Date().toISOString()
    };

  return new Promise((fulfill) => {
    shasum.update(string);
    reply.hash = "text::" + shasum.digest('base64');
    logger.debug(`Hash from text "${reply.hash}"`);
    fulfill(reply)
  });
}

function from_filename(filename) {
  var shasum = crypto.createHash('sha256');
  var reply = {
      filename: filename,
      malicious: false,
      scanned: new Date().toISOString(),
    };

  logger.debug(`Creating hash from ${filename}`);

  return new Promise((fulfill, reject) => {
    var s = fs.ReadStream(filename);
    try {
      s.on('data', (d) => {
        shasum.update(d)
      });
      s.on('end', () => {
        reply.hash = "file::" + shasum.digest('base64');
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
