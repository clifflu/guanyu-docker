'use strict';

const extend = require('extend')

const config = require('./config');

const levels = Object.freeze({
  debug: 10,
  verbose: 20,
  info: 30,
  warn: 40,
  error: 50,
})

let logLevel = 0
setLogLevel(config.get('LOG_LEVEL') || 'info')

function setLogLevel(newLevel) {
  const newNumericLevel = levels[newLevel]
  if (undefined === newNumericLevel) {
    console.error(`Unkonwn logLevel "${newLevel}"`)
    process.exit(1)
  }

  logLevel = newNumericLevel
}

function getLogLevel() {
  for (let key in levels) {
    if (levels[key] === logLevel) {
      return key
    }
  }
}

function log(msgObj) {
  if (levels[msgObj.level] < logLevel) {
    return
  }
  extend(msgObj, {ts: (new Date().toISOString()).replace(/\.\d+/, '')})

  console.log(JSON.stringify(msgObj))
}

function prepareLogger(options) {
  let _fragment = extend({}, options) // shallow copy

  return {
    debug: msg => log(extend({level: 'debug', msg}, _fragment)),
    info: msg => log(extend({level: 'info', msg}, _fragment)),
    verbose: msg => log(extend({level: 'verbose', msg}, _fragment)),
    warn: msg => log(extend({level: 'warn', msg}, _fragment)),
    error: msg => log(extend({level: 'error', msg}, _fragment)),
  }
}

module.exports = {
  getLogLevel,
  prepareLogger,
  setLogLevel,
}
