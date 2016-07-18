'use strict';

var nconf = require('nconf');

nconf.env({
  separator: '__',
  whitelist: [
    'API_TOKEN',
    'FILE__MAX_SIZE',
    'PROC_PER_CORE',
    'REDIS_HOST',
    'REDIS__HOST',
    'REDIS__PORT',
  ],
}).defaults({
  // Max file size allowed
  FILE: {
    MAX_SIZE: 33554432
  },
  // Concurrent scanners (sav) allowed per core
  PROC_PER_CORE: 2,
});


module.exports = nconf;
