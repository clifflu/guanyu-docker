"use strict";

var extend = require('extend');
var Promise = require('promise');

var logger = require('../logger');
var mycache = require('../cache');
var myhash = require("../hash");
var uri_scanner = require('./uri');

var urlRegex = /((https?:\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi;


function check_text(payload) {
  if (payload.result || !payload.resource) {
    logger.debug("Skip checking text");
    return Promise.resolve(payload);
  }

  return new Promise((fulfill, reject) => {
    let links = payload.resource.match(urlRegex)
      , scanner_promises = [];

    logger.debug(`Found links in text: ${links}`);
    payload.resource = links;

    for (let idx = 0, len = links.length; idx < len; idx++) {
      scanner_promises.push(uri_scanner.scan_uri(links[idx]));
    }

    Promise.all(scanner_promises).then((values) => {
      payload = extend(payload, {
        malicious: false,
        results: {}
      });

      for (let idx = 0, len = values.length; idx < len; idx++) {
        let v = values[idx];

        payload.malicious = payload.malicious || v.malicious;
        payload.results[v.resource] = v.result
      }
      logger.debug(`Text scan result: ${payload}`);
      fulfill(payload);
    }, reject)

  });
}

function scan_text(text, options) {
  return myhash.from_string(text, options)
    .then(mycache.get_result)
    .then(check_text)
    .then(mycache.update_result);
}

module.exports = {
  scan_text: scan_text
};
