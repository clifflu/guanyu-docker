const gc = require('guanyu-core')
const main = require('./src/fetch')

const config = gc.config
const plogger = gc.prepareLogger

function resurrectFromDoom(err) {
  const logger = plogger({
    loc: 'sophosav:index:resurrectFromDoom',
    extra: {stack: err.stack}
  })

  logger.error(`${err.name}: ${err.message}`)

  return new Promise(resolve => setTimeout(resolve, config.get('DOOM_SLEEP')))
}

function loop(){
  main()
    .catch(resurrectFromDoom)
    .then(() => setTimeout(loop, 1000 * config.get('PLUGIN:FETCH:EMPTY_SLEEP')))
}

function entry() {
  const logger = plogger({loc: 'sophosav:index:entry'})
  logger.info(`listening from ${config.get('PLUGIN:SOPHOSAV:QUEUE')}`)

  loop()
}

entry()

