'use strict'

const extend = require('extend')

const AWS = require('./aws')
const config = require('./config')
const logger = require('./logger')

const naive_database = {}

const get_ddb_client = (() => {
  let _cache
  let conf = config.get('CACHE:DDB')

  return () => {
    if (_cache === undefined) {
      _cache = conf && conf.TABLE && !conf.DISABLED
        ? new AWS.DynamoDB()
        : null
    }

    return _cache
  }
})()


function b64decode(b64string) {
  return new Buffer(b64string, 'base64')
}


/**
 * Get result from all possible sources sequentially
 * Naive -> DynamoDB
 *
 * @param payload
 * @returns {Promise}
 */
function get_result(payload) {
  if (payload.result) {
    logger.info(`Skipping fulfilled cache lookup on "${payload.hash}"`)
    return Promise.resolve(payload)
  }

  if (payload.options) {
    if (payload.options.bypass_cache || payload.options.bypass_read_cache) {
      logger.debug(`Skip cache lookup as requested "${payload.hash}"`)
      return Promise.resolve(payload)
    }
  }

  logger.debug(`Cache lookup on "${payload.hash}"`)

  return get_result_naive(payload)
    .then(get_result_ddb)
}

function get_result_naive(payload) {
  if (payload.result) {
    logger.debug(`Skipping naive cache lookup on "${payload.hash}"`)
    return Promise.resolve(payload)
  }

  if (naive_database[payload.hash]) {
    logger.info(`Cache hit (naive) "${payload.hash}"`)
    return Promise.resolve(naive_database[payload.hash])
  }

  logger.debug(`Cache miss (naive) "${payload.hash}"`)
  return Promise.resolve(payload)
}

function get_result_ddb(payload) {
  if (payload.result) {
    logger.debug(`Skipping DDB cache lookup on "${payload.hash}"`)
    return Promise.resolve(payload)
  }

  let dynamodb = get_ddb_client()

  if (!dynamodb) {
    return Promise.resolve(payload)
  }

  logger.debug("Trying DDB: " + config.get('CACHE:DDB:TABLE'))

  return new Promise(fulfill => {
    dynamodb.getItem({
      Key: {
        hash: { B: b64decode(payload.hash) },
      },
      ConsistentRead: false,
      TableName: config.get('CACHE:DDB:TABLE'),
    }, (err, data) => {
      if (err) {
        logger.error("Failed getItem from ddb", err)
        return fulfill(payload)
      }

      if (data.Item) {
        logger.info(`Cache hit (ddb) "${payload.hash}"`)
        try {
          return fulfill(JSON.parse(data.Item.payload.S))
        } catch (ex) {
          logger.warn(`Illegal JSON from DDB, ignoring it (${data.Item.payload.S})`)
          return fulfill(payload)
        }
      }

      logger.debug(`blah: ${JSON.stringify(data)}`)

      logger.debug(`Cache miss (ddb) "${payload.hash}"`)
      fulfill(payload)
    });
  })
}

/**
 *
 * @param payload
 * @returns {Promise}
 */
function update_result(payload) {
  if (!payload.hash) {
    logger.error("Critical field `hash` missing on payload " + JSON.stringify(payload))
    return Promise.reject("hash missing")
  }

  if (payload.options && payload.options.bypass_cache) {
    logger.debug(`Skip updating cache as requested "${payload.hash}"`)
    return Promise.resolve(payload)
  }

  // Skip result check, cache all results
  if (false && String(payload.result).startsWith('#')) {
    logger.info(`Skip updating cache with indeterminate results (#.*) "${payload.hash}"`)
    return Promise.resolve(payload)
  }

  // Work on a shallow copy and strip unwanted attributes
  let cached_entry = extend({}, payload)
  delete cached_entry['options']
  delete cached_entry['flags']

  Promise.all([
    update_result_naive(cached_entry),
    update_result_ddb(cached_entry),
  ]).then(() => {
    logger.info(`Cache ${payload.hash} updated`)
  })

  return Promise.resolve(payload)
}

function update_result_naive(payload) {
  logger.debug(`Updating cache (naive) ${payload.hash}`)
  if (payload.cached == 'naive') {
    // do nothing
  } else {
    // update naive cache otherwise
    naive_database[payload.hash] = extend({}, payload, { cached: 'naive' })
  }

  return Promise.resolve(payload)
}

function update_result_ddb(payload) {
  let dynamodb = get_ddb_client()

  if (!dynamodb) {
    return Promise.resolve(payload)
  }

  logger.debug(`Updating ddb cache ${payload.hash}`)

  if (payload.cached) {
    return Promise.resolve(payload)
  }

  return new Promise(fulfill => {
    dynamodb.putItem({
      Item: {
        hash: { B: b64decode(payload.hash) },
        payload: { S: JSON.stringify(extend({}, payload, { cached: 'ddb' })) },
      },
      TableName: config.get('CACHE:DDB:TABLE'),
    }, (err) => {
      if (err) {
        logger.error("Failed putItem to ddb", err)
        return fulfill(payload)
      }

      return fulfill(payload)
    })
  })
}


module.exports = {
  get_result: get_result,
  update_result: update_result
}
