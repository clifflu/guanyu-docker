"use strict";

var extend = require('extend');
var Promise = require('promise');
var redis = require("redis");

var logger = require('./logger');

var naive_database = {};
var redis_client = process.env.REDIS_HOST
  ? redis.createClient({host: process.env.REDIS_HOST})
  : undefined;


/**
 *
 * @param payload
 * @returns {Promise}
 */
function get_result(payload) {
  if (payload.result) {
    logger.debug(`Skip cache lookup for fulfilled already on "${payload.hash}"`);
    return Promise.resolve(payload);
  }

  if (payload.options && payload.options.ignore_read_cache) {
    logger.debug(`Skip cache lookup as requested "${payload.hash}"`);
    return Promise.resolve(payload);
  }

  logger.debug(`Cache lookup on "${payload.hash}"`);

  return redis_client
    ? get_result_redis(payload)
    : get_result_naive(payload);
}


/**
 * Get cached result from redis
 *
 * @param payload
 * @returns {Promise} | null
 */
function get_result_redis(payload) {
  if (!redis_client) {
    return null;
  }

  logger.debug("Trying redis: " + process.env.REDIS_HOST);

  return new Promise((fulfill, reject) => {
    redis_client.get(payload.hash, function (err, data) {
      if (err) {
        logger.error("Failed get from redis", err);
        return reject(err);
      }

      if (data) {
        logger.info(`Cache hit (redis) "${payload.hash}"`);
        try {
          return fulfill(JSON.parse(data));
        } catch (ex) {
        }
      }

      logger.debug(`Cache miss (redis) "${payload.hash}"`);
      fulfill(payload);
    })
  });
}


function get_result_naive(payload) {
  if (naive_database[payload.hash]) {
    logger.info(`Cache hit (naive) "${payload.hash}"`);
    return Promise.resolve(naive_database[payload.hash]);
  }

  logger.debug(`Cache miss (naive) "${payload.hash}"`);
  return Promise.resolve(payload);
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

  let cached_entry = extend({}, payload, {cached: true});
  delete cached_entry['options'];

  return redis_client
    ? update_result_redis(cached_entry)
    : update_result_naive(cached_entry);
}

function update_result_redis(payload) {
  logger.debug(`Updating cache (redis) ${payload.hash}`);
  return new Promise((fulfill, reject) => {
    redis_client.set(payload.hash, JSON.stringify(payload), function (err) {
      if (err) {
        logger.error("Redis update failed ", err);
        return reject(err);
      }

      logger.info(`Cache (redis) ${payload.hash} updated`);
      return fulfill(payload);
    })
  });
}

function update_result_naive(payload) {
  logger.debug(`Updating cache (naive) ${payload.hash}`);
  naive_database[payload.hash] = payload;
  return Promise.resolve(payload);
}

module.exports = {
  get_result: get_result,
  update_result: update_result
};
