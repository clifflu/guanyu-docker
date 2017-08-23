'use strict';

const nconf = require('nconf');

nconf.use('memory')
  .env({
    separator: '__',
    whitelist: [
      'API_TOKEN',
      'CACHE__REDIS__DISABLED',
      'CACHE__REDIS__HOST',
      'CACHE__DDB__DISABLED',
      'CACHE__DDB__TABLE',
      'CONN__HOLD_DELAY',
      'CONN__RATIO',
      'DRUNK',
      'FETCH__PARALLEL',
      'FETCH__PER_CORE',
      'FILE__MAX_SIZE',
      'LOG_LEVEL',
      'SCAN__PARALLEL',
      'SCAN__PER_CORE',
    ],
  }).defaults({
  CONN: {
    CONN__HOLD_DELAY: 1000,
    RATIO: 2,
  },
  FETCH: {
    PER_CORE: 6,
  },
  FILE: {
    // Max file size allowed
    MAX_SIZE: 33554432
  },
  SCAN: {
    // Concurrent scanners (sav) allowed per core
    PER_CORE: 2,
  }
});


function bridge_deprecated_to(was, now) {
  let old_value = nconf.get(was);
  if (old_value && !nconf.get(now)) {
    nconf.set(now, old_value);
    console.log(`[DEPRECATED] ${was} has been deprecated, use ${now} instead`);
  }
}

function update_boolean(name) {
  let value = nconf.get(name);
  let as_number = Number(value);

  if (Number.isNaN(as_number)) {
    if (/^false$/i.test(value))
      return nconf.set(name, false);

    return nconf.set(name, Boolean(value));
  }

  nconf.set(name, Boolean(as_number));
}

function update_number(name) {
  let value = nconf.get(name);
  let as_number = Number(value);

  if (!Number.isNaN(as_number)) {
    nconf.set(name, as_number);
  }
}

function harvest_api_tokens(api_token) {
  let tokens = new Set();

  if (api_token) {
    api_token.split(',').map((token) => {
      if (token = token.trim()) {
        tokens.add(token);
      }
    });
  }

  return tokens.size == 0
    ? null
    : Array.from(tokens);
}

update_number('CONN__RATIO');
update_number('FETCH__PER_CORE');
update_number('SCAN__PER_CORE');

update_boolean('DRUNK');

nconf.set('api-tokens', harvest_api_tokens(nconf.get('API_TOKEN')));

module.exports = nconf;
