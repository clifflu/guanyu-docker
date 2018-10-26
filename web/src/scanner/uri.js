'use strict';

const extend = require('extend');
const url = require('url');

const logFn = "web:src/scanner/url";
const { config, cache, prepareLogger, queue } = require('guanyu-core');
const hash = require("../hash");
const { polling } = require("../polling");

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
  const logger = prepareLogger({ loc: `${logFn}:shortcutHostWhitelist` });
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

function send_fetch_request(payload) {
  const logger = prepareLogger({ loc: `${logFn}:sendQueue` });

  if (payload.result) {
    logger.debug("Skip fetching uri for result already known");
    return Promise.resolve(payload);
  }

  if (payload.cache) {
    logger.debug("Skip fetching uri for sophosav scanning");
    return Promise.resolve(payload);
  }

  return queue.send_message(extend({}, payload, {
    queue_url: config.get('PLUGIN:FETCH:QUEUE')
  }));
}

/**
 *
 * @param uri
 * @returns {*}
 */
function scan_uri(uri, options) {
  return hash.from_string(uri, options)
    .then(shortcut_host_whitelist)
    .then(cache.get_result)
    .then(send_fetch_request)
    .then(cache.update_result)
    .then(polling);
}

module.exports = {
  scan_uri: scan_uri,
};
