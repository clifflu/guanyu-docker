const logger = require('./lib/logger')
module.exports = {
  aws: require('./lib/aws'),
  cache: require('./lib/cache'),
  config: require('./lib/config'),
  prepareLogger: logger.prepareLogger,
  getLogLevel: logger.getLogLevel,
  setLogLevel: logger.setLogLevel,
}
