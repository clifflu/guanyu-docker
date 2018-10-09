const extend = require("extend");
const { config, cache, prepareLogger } = require('guanyu-core');
const logFn = "web:src/polling";

let pullID;
let timerID;

function end() {
  const logger = prepareLogger({ loc: `${logFn}:end` });
  logger.debug("polling stop");
  pullID = pullID && clearInterval(pullID);
  timerID = timerID && clearTimeout(timerID);
}

function checkResult(resolve, reject) {
  const logger = prepareLogger({ loc: `${logFn}:checkResult` });
  return (payload) => {
    logger.debug("check payload", payload);
    if (payload.status || payload.result) {
      end();
      cache.update_result_naive(payload).then(() => {
        if (payload.status) {
          return reject(payload);
        }
        resolve(payload);
      });
    }
  }
}

function get_result(payload) {
  const logger = prepareLogger({ loc: `${logFn}:get_result` });
  return new Promise((resolve, reject) => {
    timeerID = setTimeout(() => {
      end();
      reject(payload);
    }, 30 * 1000);
    pullID = setInterval(() => {
      cache.get_result_ddb(payload).then(checkResult(resolve, reject));
    }, 1000);
  });
}

module.exports = {
  get_result: get_result
}
