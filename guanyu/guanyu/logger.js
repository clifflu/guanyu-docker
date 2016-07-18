var winston = require('winston');

var config = require('./config');

var logger = new (winston.Logger)({
  level: 'debug',
  transports: [
    new (winston.transports.Console)({
      timestamp: function() {
        return (new Date().toISOString()).replace(/\..+/, '');
      },
      formatter: function(options) {
        // Return string will be passed to logger.
        return options.timestamp() +' '+ options.level.toUpperCase() +' - '+ (undefined !== options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
      }
    })
  ]
});

var hellomsg = "Guanyu at your service...";
if (config.get('DRUNK')) {
  hellomsg = "[DRUNK] " + hellomsg + " (HIC ..ooOO)";
}
logger.info(hellomsg);

module.exports = logger;
