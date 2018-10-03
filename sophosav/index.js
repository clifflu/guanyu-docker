const gc = require('guanyu-core')
const plogger = gc.prepareLogger

function entry() {
  const logger = plogger({loc: 'sophosav:index:entry'})
  logger.info(`entry sophosav`)
}

entry()
