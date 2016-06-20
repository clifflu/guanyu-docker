"use strict";

var extend = require('extend');
var Promise = require('promise');

var logger = require('./logger');

var naive_database = {};

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

  logger.debug(`Cache lookup on "${payload.hash}"`);
  return get_result_naive(payload);
}

function get_result_naive(payload) {
  if (naive_database[payload.hash]) {
    logger.debug(`Cache hit (naive) "${payload.hash}"`);
    return Promise.resolve(naive_database[payload.hash]);
  }

  logger.debug(`Cache miss for "${payload.hash}"`);
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

  if (payload.hash) {
    logger.debug(`Updating cache for ${payload.hash}`);
    let cached_entry = extend({}, payload, {cached: true})
    naive_database[payload.hash] = cached_entry;
  }

  return Promise.resolve(payload);
}

module.exports = {
  get_result: get_result,
  update_result: update_result
};
