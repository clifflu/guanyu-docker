'use strict';

const extend = require('extend');
const url = require('url');

const logFn = "url:src/scanner/url";
const { config, cache, prepareLogger, queue } = require('guanyu-core');
const myhash = require("../hash");

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

  return _fetch_uri(payload).catch(payload => {
    extend(payload, {
      malicious: false,
      result: `#${payload.message}`,
    });

    delete payload.error;
    delete payload.status;
    delete payload.message;
    return Promise.reject(payload);
  });
}

/**
 *
 * @param payload
 * @returns {Promise}
 * @private
 */
function _fetch_uri(payload) {
  const logger = prepareLogger({ loc: `${logFn}:_fetchUri` });

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
  return myhash.from_string(uri, options)
    .then(shortcut_host_whitelist)
    .then(cache.get_result)
    .then(fetch_uri)
    .then(cache.update_result);
}

module.exports = {
  scan_uri: scan_uri,
};
