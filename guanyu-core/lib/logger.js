'use strict';
/**
 * # logger
 *
 * ## usage
 *
 * ```
 * logger = prepareLogger({
 *   loc: "package:filename:function",
 *   req: "hash from main resource",
 *   extra: {...}
 * })
 * ```
 *
 *
 */
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

function log(msgObj, extra) {
  if (levels[msgObj.level] < logLevel) {
    return
  }
  extend(msgObj, {ts: (new Date().toISOString()).replace(/\.\d+/, '')})

  if (logLevel > levels.verbose) {
    delete msgObj.extra // ignore extra
  } else {
    // merge extra, msgObj.extra may be undefined
    msgObj.extra = extend(msgObj.extra, extra)
  }

  console.log(JSON.stringify(msgObj))
}

function prepareLogger(options) {
  let _opt = extend({}, options) // shallow copy

  function gen(level) {
    return (msg, extra) => log(extend({}, _opt, {level, msg}), extra)
  }

  return {
    debug: gen('debug'),
    info: gen('info'),
    verbose: gen('verbose'),
    warn: gen('warn'),
    error: gen('error'),
  }
}

module.exports = {
  getLogLevel,
  prepareLogger,
  setLogLevel,
}
