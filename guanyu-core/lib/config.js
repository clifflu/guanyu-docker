'use strict';

const nconf = require('nconf');

nconf.use('memory')
  .overrides({
    PLUGIN: {
      FETCH_QUEUE: 'https://sqs.us-west-2.amazonaws.com/328286347281/guanyu-FetchQueue-2YNGGHG1ZIDT',
      REKOGNITION_QUEUE: 'https://sqs.us-west-2.amazonaws.com/328286347281/guanyu-PluginRekognitionQueue-H3MNGDGANI4E',
      SOPHOSAV_QUEUE: 'https://sqs.us-west-2.amazonaws.com/328286347281/guanyu-PluginSophosQueue-11UGLC8R2Z7Q5',
    },
    STACK: {
      CACHE_TABLE: 'guanyu-CacheTable-Z07H35ELN8CC',
      SELF_ENDPOINT: 'http://localhost:3000/',
      SAMPLE_BUCKET: 'guanyu-samplebucket-1ei8320uyuze3',
    },
  })
  .env({
    separator: '__',
    whitelist: [
      'CONN__HWM_DELAY',
      'CONN__MAX',
      'LOG_LEVEL',
      'MAX_SIZE',
      'STACK__FETCH_QUEUE',
      'PLUGIN__REKOGNITION_QUEUE',
      'PLUGIN__SOPHOSAV_QUEUE',
      'STACK__CACHE_TABLE',
      'STACK__SELF_ENDPOINT',
      'STACK__SAMPLE_BUCKET',
    ],
  }).defaults({
    CONN: {
      HWM_DELAY: 200, // delay before closing hitting high-watermark, ms
      MAX: 32, // max concurrent connections for a container
    },
    LOG_LEVEL: 'info',
    MAX_SIZE: 33554432, // Max file size for fetch and upload
  });

if (!nconf.get('STACK:SELF_ENDPOINT')) {
  console.log(`Required parameter "ENDPOINT" missing, now quit`)
  process.exit(1)
}

module.exports = nconf;
