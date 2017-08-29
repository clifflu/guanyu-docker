'use strict';

const extend = require('extend');
const fs = require('fs');
const request = require('request');
const tmp = require('tmp');
const url = require('url');

const config = require('../../config');
const file_scanner = require('./file.js');
const logger = require('../logger');
const mycache = require('../cache');
const myhash = require("../hash");

const maxSize = config.get('MAX_SIZE');

const host_whitelist = [
  '104.com.tw',
  'asu5.com',
  'asus.com',
  'facebook.com',
  'flickr.com',
  'ford.com.tw',
  'www.google.com',
  'imgur.com',
  'linkedin.com',
  'microsoft.com',
  'nhri.org.tw',
  'picasaweb.google.com',
  'photos.google.com',
  'play.google.com',
  'piterest.com',
  'photo.xuite.net',
  'vimeo.com',
  'wretch.cc',
  'www.kimo.com.tw',
  'yahoo.com',
  'youtu.be',
  'youtube.com'
];


function shortcut_host_whitelist(payload) {
  let uri = url.parse(payload.resource);

  if (!uri.host) {
    logger.info(`Failed parsing uri: ${payload.resource}`);
    return Promise.resolve({
      malicious: false,
      result: `Failed parsing uri: ${payload.resource}`
    })
  }

  for (let idx = 0, len = host_whitelist.length; idx < len; idx++) {
    let host = host_whitelist[idx];
    if (uri.host.endsWith(host)) {
      logger.debug(`Whitelisted host "${host}" in "${payload.resource}"`);
      payload = extend(payload, {
        malicious: false,
        result: `whitelisted (${host})`
      });
      return Promise.resolve(payload)
    }
  }

  return Promise.resolve(payload);
}

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
  if (payload.result) {
    logger.debug("Skip fetching uri for result already known");
    return Promise.resolve(payload);
  }

  if (!/^https?:\/\/.+/.test(payload.resource)) {
    logger.warn(`Unsupported uri: ${payload.resource}`);
    return Promise.reject(extend({}, payload, {
      status: 400,
      message: `Unsupported uri: ${payload.resource}`
    }));
  }

  return new Promise((fulfill, reject) => {
    let name = tmp.tmpNameSync({template: '/tmp/guanyu-XXXXXXXX'});
    logger.debug(`Fetching "${payload.resource}" to "${name}"`);

    request({method: "HEAD", url: payload.resource}, (err, headRes) => {
      if (err)
        return reject(extend(payload, {
          status: 500,
          error: err,
        }));

      // Catches upstream 4XX
      if (Math.floor(headRes.statusCode / 100) == 4) {
        return reject(extend(payload, {
          status: 400,
          message: "Upstream failed: " + headRes.statusMessage,
        }))
      }

      let size = headRes.headers['content-length'];
      if (size > maxSize) {
        return reject(extend(payload, {
          status: 413,
          message: "Resource too large",
          result: new Error(`Resource size "${size}" exceeds limit "${maxSize}"`)
        }));
      }
      
      let fetched_size = 0;
      let res = request({url: payload.resource});

      res
        .on('data', (data) => {
          fetched_size += data.length;
          if (fetched_size > maxSize) {
            sem.leave();
            res.abort();
            fs.unlink(name);
            payload = extend(payload, {
              status: 413,
              message: "Resource too large",
              error: new Error(`Fetched size "${fetched_size}" exceeds limit "${maxSize}"`)
            });
            return reject(payload)
          }
        })
        .pipe(fs.createWriteStream(name))
        .on('finish', () => {
          sem.leave();
          payload.filename = name;
          logger.debug(`Saved locally ${payload.filename}`);
          fulfill(payload);
        })
        .on('error', (err) => {
          // Fetch failed
          sem.leave();
          reject(extend(payload, {
            status: "400",
            message: "fetch failed",
            error: err,
          }));
        });
    })
  })
}

/**
 *
 * @param uri
 * @returns {*}
 */
function scan_uri(uri, options) {
  return myhash.from_string(uri, options)
    .then(shortcut_host_whitelist)
    .then(mycache.get_result)
    .then(fetch_uri)
    .then(file_scanner.call_sav_scan)
    .then(mycache.update_result);
}

module.exports = {
  scan_uri: scan_uri,
};
