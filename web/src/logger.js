'use strict';

const winston = require('winston');

const config = require('../config');

const hellomsg = "Guanyu at your service...";

const log_level = Object.freeze({
  default: 'info',
  candidates: new Set(['debug', 'info', 'verbose', 'warn'])
});

const logger = new (winston.Logger)({
  level: log_level.candidates.has(config.get('LOG_LEVEL'))
    ? config.get('LOG_LEVEL')
    : log_level.default,
  transports: [
    new (winston.transports.Console)({
      timestamp: function () {
        return (new Date().toISOString()).replace(/\..+/, '');
      },
      formatter: function (options) {
        // Return string will be passed to logger.
        return options.timestamp() + ' ' + options.level.toUpperCase() + ' - ' + (undefined !== options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' );
      }
    })
  ]
});

logger.info(hellomsg);

module.exports = logger;
