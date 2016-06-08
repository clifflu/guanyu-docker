"use strict";

var crypto = require('crypto'),
    Promise = require('promise'),
    fs = require('fs');

var logger = require('./logger');


function from_string(string) {
  var shasum = crypto.createHash('sha256'),
      reply = {
        resource: string,
        malicious: false,
        scanned: new Date().toISOString(),
      };

  return new Promise((fulfill) => {

    shasum.update(string);
    reply.hash = "text::" + shasum.digest('base64');
    logger.info(`Hash from text "${reply.hash}"`);
    fulfill(reply)
  });
}

function from_filename(filename) {
  var s = fs.ReadStream(filename),
      shasum = crypto.createHash('sha256'),
      reply = {
        filename: filename,
        malicious: false,
        scanned: new Date().toISOString(),
      };

  logger.info(`Creating hash from ${filename}`);

  return new Promise((fulfill, reject) => {
    try {
      s.on('data', (d) => { shasum.update(d) });
      s.on('end', () => {
        reply.hash = "file::" + shasum.digest('base64');
        logger.info(`${reply.filename} hashed to "${reply.hash}"`);
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
