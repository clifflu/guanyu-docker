'use strict';

const nconf = require('nconf');

nconf.use('memory')
  .env({
    separator: '__',
    whitelist: [
      'CACHE__TABLE',
      'CONN__HWM_DELAY',
      'CONN__MAX',
      'ENDPOINT',
      'LOG_LEVEL',
      'QUEUE__FETCH',
      'QUEUE__REKOGNITION',
      'QUEUE__SOPHOSAV',
      'SAMPLE__BUCKET',
      'SAMPLE__MAX_SIZE',
    ],
  }).defaults({
    CONN: {
      HWM_DELAY: 200, // ms before close on high-watermark
      MAX: 1024, // max concurrent connections for a container
    },
    SAMPLE: {
      MAX_SIZE: 33554432, // Max file size allowed
    },
  });

if (!nconf.get('ENDPOINT')) {
  console.log(`Required parameter "ENDPOINT" missing, now quit`)
  process.exit(1)
}

module.exports = nconf;
