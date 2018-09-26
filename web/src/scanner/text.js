'use strict';

const extend = require('extend');

const { logger } = require('guanyu-core');
const { cache } = require('guanyu-core');
const myhash = require("../hash");
const uri_scanner = require('./uri');

const urlRegex = /((https?:\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi;


function fix_uri(resource) {
  if (resource.startsWith('//')) {
    return "http:" + resource;
  }

  if (!(
    resource.startsWith('http://') ||
    resource.startsWith('https://') ||
    resource.startsWith('ftp://')
  )) {
    return "http://" + resource
  }

  return resource
}

function fulfilled(promise) {
  return promise.then(
    (x) => Promise.resolve(x),
    (e) => Promise.resolve({
      malicious: false,
      result: e.message,
    }));
}


function check_text(payload) {
  if (payload.result) {
    logger.debug("Skip checking text");
    return Promise.resolve(payload);
  }

  return new Promise((fulfill, reject) => {
    let links = payload.resource.match(urlRegex) || [];
    let scanner_promises = [];

    logger.debug(`Found links in text: ${links}`);
    payload.resource = links;

    for (let idx = 0, len = links.length; idx < len; idx++) {
      let link = fix_uri(links[idx]);
      scanner_promises.push(fulfilled(uri_scanner.scan_uri(link, payload.options)));
    }

    Promise.all(scanner_promises).then((values) => {
      extend(payload, {
        malicious: false,
        result: {},
      });

      for (let idx = 0, len = values.length; idx < len; idx++) {
        let v = values[idx];

        payload.malicious = payload.malicious || (!!v.malicious);
        payload.result[v.resource] = v.result
      }
      logger.debug(`Text scan result: ${payload}`);
      fulfill(payload);
    }, reject)
  });
}

function scan_text(text, options) {
  return myhash.from_string(text, options)
    .then(cache.get_result)
    .then(check_text)
    .then(cache.update_result);
}

module.exports = {
  scan_text: scan_text
};
