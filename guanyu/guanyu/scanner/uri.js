"use strict";

var extend = require('extend');
var fs = require('fs');
var Promise = require('promise');
var request = require('request');
var tmp = require('tmp');
var url = require('url');

var file_scanner = require('./file.js');
var logger = require('../logger');
var mycache = require('../cache');
var myhash = require("../hash");

var file_max_size = require('../../config').file_max_size;


var host_whitelist = [
  '104.com.tw',
  'asu5.com',
  'asus.com',
  'facebook.com',
  'flickr.com',
  'ford.com.tw',
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
  var uri = url.parse(payload.resource);

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

function fetch_uri(payload) {
  if (payload.result || !payload.resource) {
    logger.debug("Skip fetching uri for result found")
    return Promise.resolve(payload);
  }

  return new Promise((fulfill, reject) => {

    var name = tmp.tmpNameSync({template: '/tmp/guanyu-XXXXXXXX'});
    logger.debug(`Fetching "${payload.resource}" to "${name}"`);

    request({method: "HEAD", url: payload.resource}, (err, headRes) => {
      if (err)
        return reject(err);

      var size = headRes.headers['content-length'];
      if (size > file_max_size) {
        payload = extend(payload, {
          message: "Resource too large",
          status: 413,
          stack: `Resource size "${size}" exceeds limit "${file_max_size}"`
        });
        return reject(payload);
      }

      var fetched_size = 0,
        res = request({url: payload.resource});

      res
        .on('data', (data) => {
          fetched_size += data.length;
          if (fetched_size > file_max_size) {
            res.abort();
            fs.unlink(name);
            payload = extend(payload, {
              message: "Resource too large",
              status: 413,
              stack: `Fetched size "${fetched_size}" exceeds limit "${file_max_size}"`
            });
            return reject(payload)
          }
        })
        .pipe(fs.createWriteStream(name))
        .on('finish', () => {
          payload.filename = name;
          logger.debug(`Saved locally ${payload.filename}`)
          fulfill(payload);
        })
        .on('error', (err) => {
          payload.error = err;
          reject(payload);
        });
    });
  });
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
  scan_uri: scan_uri
};
