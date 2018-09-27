'use strict';

const nconf = require('nconf');

nconf.use('memory')
  .overrides({
    PLUGIN: {
      FETCH: {
        QUEUE: 'https://sqs.ap-northeast-1.amazonaws.com/408772917132/Fetch',
      },
      REKOGNITION: {
        QUEUE: 'https://sqs.us-west-2.amazonaws.com/328286347281/guanyu-PluginRekognitionQueue-H3MNGDGANI4E',
      },
      SOPHOSAV: {
        QUEUE: 'https://sqs.ap-northeast-1.amazonaws.com/408772917132/ScanFile',
      }
    },
    STACK: {
      CACHE_TABLE_DISABLED: false,
      CACHE_TABLE: 'GuanyuWebStackTest-Tod-CacheTable-5W5JDFW9JPAN',
      SELF_ENDPOINT: 'http://localhost:3000/',
      SAMPLE_BUCKET: 'guanyuwebstacktest-tod-scanfilebucket-19ljy401pxbnt',
    },
  })
  .env({
    separator: '__',
    whitelist: [
      'CONN__HWM_DELAY',
      'CONN__MAX',
      'LOG_LEVEL',
      'MAX_SIZE',
      'PLUGIN__FETCH__QUEUE',
      'PLUGIN__REKOGNITION__QUEUE',
      'PLUGIN__SOPHOSAV__QUEUE',
      'CACHE_TABLE_DISABLED',
      'STACK__CACHE_TABLE',
      'STACK__SELF_ENDPOINT',
      'STACK__SAMPLE_BUCKET',
    ],
  }).defaults({
    CONN: {
      HWM_DELAY: 200, // delay before closing hitting high-watermark, in ms
      MAX: 32, // max concurrent connections for a container
    },
    DOOM_SLEEP: 60 * 1000, // Sleep on unexpected errors, in ms
    LOG_LEVEL: 'debug',
    MAX_SIZE: 33554432, // Max file size for fetch and upload
    PLUGIN: {
      FETCH: {
        WAIT_SECONDS: 3,
        EMPTY_SLEEP: 3, // Sleep duration between receMsg calls, in seconds
      }
    },
  });

if (!nconf.get('STACK:SELF_ENDPOINT')) {
  console.log(`Required parameter "ENDPOINT" missing, now quit`)
  process.exit(1)
}

module.exports = nconf;
