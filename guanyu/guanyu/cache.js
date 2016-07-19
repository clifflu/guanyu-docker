"use strict";

var extend = require('extend');
var redis = require("redis");

var AWS = require('./aws');
var config = require('./config');
var logger = require('./logger');

var naive_database = {};

var get_redis_client = (() => {
  var _cache;
  var conf = config.get('CACHE:REDIS');

  return () => {
    if (_cache === undefined) {
      _cache = conf && conf.HOST && !conf.DISABLED
        ? redis.createClient({host: conf.HOST})
        : null;
    }

    return _cache;
  };
})();


var get_ddb_client = (() => {
  var _cache;
  var conf = config.get('CACHE:DDB');

  return () => {
    if (_cache === undefined) {
      _cache = conf && conf.TABLE && !conf.DISABLED
        ? new AWS.DynamoDB()
        : null;
    }

    return _cache;
  };
})();


function b64decode(b64string) {
  return new Buffer(b64string, 'base64');
}


/**
 * Get result from all possible sources sequentially
 * Naive -> Redis (if enabled) -> DynamoDB
 *
 * @param payload
 * @returns {Promise}
 */
function get_result(payload) {
  if (payload.result) {
    logger.info(`Skipping fulfilled cache lookup on "${payload.hash}"`);
    return Promise.resolve(payload);
  }

  if (payload.options && payload.options.bypass_cache) {
    logger.debug(`Skip cache lookup as requested "${payload.hash}"`);
    return Promise.resolve(payload);
  }

  logger.debug(`Cache lookup on "${payload.hash}"`);

  return get_result_naive(payload)
    .then(get_result_redis)
    .then(get_result_ddb);
}

function get_result_naive(payload) {
  if (payload.result) {
    logger.debug(`Skipping naive cache lookup on "${payload.hash}"`);
    return Promise.resolve(payload);
  }

  if (naive_database[payload.hash]) {
    logger.info(`Cache hit (naive) "${payload.hash}"`);
    return Promise.resolve(naive_database[payload.hash]);
  }

  logger.debug(`Cache miss (naive) "${payload.hash}"`);
  return Promise.resolve(payload);
}

function get_result_redis(payload) {
  if (payload.result) {
    logger.debug(`Skipping redis cache lookup on "${payload.hash}"`);
    return Promise.resolve(payload);
  }

  var redis_client = get_redis_client();

  if (!redis_client) {
    return Promise.resolve(payload);
  }

  logger.debug("Trying redis: " + config.get('CACHE:REDIS:HOST'));

  return new Promise(fulfill => {
    redis_client.get(payload.hash, function (err, data) {
      if (err) {
        logger.error("Failed get from redis", err);
        return fulfill(payload);
      }

      if (data) {
        logger.info(`Cache hit (redis) "${payload.hash}"`);
        try {
          return fulfill(JSON.parse(data));
        } catch (ex) {
          logger.warn(`Illegal JSON from redis, ignoring it (${data})`);
          return fulfill(payload);
        }
      }

      logger.debug(`Cache miss (redis) "${payload.hash}"`);
      fulfill(payload);
    })
  });
}

function get_result_ddb(payload) {
  if (payload.result) {
    logger.debug(`Skipping DDB cache lookup on "${payload.hash}"`);
    return Promise.resolve(payload);
  }

  var dynamodb = get_ddb_client();

  if (!dynamodb) {
    return Promise.resolve(payload);
  }

  logger.debug("Trying DDB: " + config.get('CACHE:DDB:TABLE'));

  return new Promise(fulfill => {
    dynamodb.getItem({
      Key: {
        hash: {B: b64decode(payload.hash)},
      },
      ConsistentRead: false,
      TableName: config.get('CACHE:DDB:TABLE'),
    }, (err, data) => {
      if (err) {
        logger.error("Failed getItem from ddb", err);
        return fulfill(payload);
      }

      if (data.Item && data.Item.length) {
        logger.info(`Cache hit (ddb) "${payload.hash}"`);
        try {
          return fulfill(JSON.parse(data.Item.payload.S));
        } catch (ex) {
          logger.warn(`Illegal JSON from DDB, ignoring it (${data.Item.payload.S})`);
          return fulfill(payload);
        }
      }

      logger.debug(`Cache miss (ddb) "${payload.hash}"`);
      fulfill(payload);
    });
  })
}

/**
 *
 * @param payload
 * @returns {Promise}
 */
function update_result(payload) {
  if (payload.cached) {
    return Promise.resolve(payload);
  }

  if (!payload.hash) {
    logger.error("Critical field `hash` missing on payload " + JSON.stringify(payload));
    return Promise.reject("hash missing");
  }

  if (payload.options && payload.options.bypass_cache) {
    logger.debug(`Skip updating cache as requested "${payload.hash}"`);
    return Promise.resolve(payload);
  }

  let cached_entry = extend({}, payload, {cached: true});
  delete cached_entry['options'];

  Promise.all([
    update_result_naive(cached_entry),
    update_result_redis(cached_entry),
    update_result_ddb(cached_entry),
  ]).then(()=> {
    logger.info(`Cache ${payload.hash} updated`);
  });

  return Promise.resolve(payload);
}

function update_result_naive(payload) {
  logger.debug(`Updating cache (naive) ${payload.hash}`);
  naive_database[payload.hash] = payload;
  return Promise.resolve(payload);
}

function update_result_redis(payload) {
  var redis_client = get_redis_client();

  if (!redis_client) {
    return Promise.resolve(payload);
  }

  logger.debug(`Updating redis cache ${payload.hash}`);
  return new Promise((fulfill, reject) => {
    redis_client.set(payload.hash, JSON.stringify(payload), function (err) {
      if (err) {
        logger.error("Redis update failed ", err);
        return reject(err);
      }

      return fulfill(payload);
    });
  });
}

function update_result_ddb(payload) {
  var dynamodb = get_ddb_client();

  if (!dynamodb) {
    return Promise.resolve(payload);
  }

  logger.debug(`Updating ddb cache ${payload.hash}`);

  return new Promise(fulfill => {
    dynamodb.putItem({
      Item: {
        hash: {B: b64decode(payload.hash)},
        payload: {S: JSON.stringify(payload)},
      },
      TableName: config.get('CACHE:DDB:TABLE'),
    }, (err, data) => {
      if (err) {
        logger.error("Failed putItem to ddb", err);
        return fulfill(payload);
      }

      return fulfill(payload);
    });
  });
}


module.exports = {
  get_result: get_result,
  update_result: update_result
};
