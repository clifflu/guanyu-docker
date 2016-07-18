'use strict';

var nconf = require('nconf');

nconf.use('memory')
  .env({
  separator: '__',
  whitelist: [
    'API_TOKEN',
    'CACHE__REDIS__DISABLED',
    'CACHE__REDIS__HOST',
    'CACHE__DDB__DISABLED',
    'CACHE__DDB__TABLE',
    'DRUNK',
    'FILE__MAX_SIZE',
    'PROC_PER_CORE',
    'REDIS_HOST',
    'UTOPIA',
  ],
}).defaults({
  // Max file size allowed
  FILE: {
    MAX_SIZE: 33554432
  },
  // Concurrent scanners (sav) allowed per core
  PROC_PER_CORE: 2,
});


function bridge_deprecated_to(was, now) {
  var old_value = nconf.get(was);
  if (old_value && !nconf.get(now)) {
    nconf.set(now, old_value);
    console.log(`[DEPRECATED] ${was} has been deprecated, use ${now} instead`);
  }
}

function update_boolean(name) {
  var value = nconf.get(name);
  var as_number = Number(value);

  if (Number.isNaN(as_number)) {
    return nconf.set(name, Boolean(value));
  }

  nconf.set(name, Boolean(as_number));
}

function update_number(name) {
  var value = nconf.get(name);
  var as_number = Number(value);

  if (!Number.isNaN(as_number)) {
    nconf.set(name, as_number);
  }
}

bridge_deprecated_to('REDIS_HOST', 'CACHE:REDIS:HOST');
bridge_deprecated_to('UTOPIA', 'DRUNK');

update_number('PROC_PER_CORE');
update_boolean('DRUNK');

module.exports = nconf;
