const extend = require("extend");
const { config, cache, prepareLogger } = require('guanyu-core');
const logFn = "web:src/polling";

let pullID;
let timerID;

function end() {
  const logger = prepareLogger({ loc: `${logFn}:end` });
  pullID = pullID && clearInterval(pullID);
  timerID = timerID && clearTimeout(timerID);
}

function checkResult(payload) {
  const logger = prepareLogger({ loc: `${logFn}:checkResult` });
  return new Promise((resolve, reject) => {
    if (payload.status || payload.result) {
      end();
      if (payload.status) {
        return reject(payload);
      }
      resolve(payload);
    }
  });
}

function get_result(payload) {
  const logger = prepareLogger({ loc: `${logFn}:get_result` });
  return new Promise((resolve, reject) => {
    timeerID = setTimeout(() => {
      end();
      reject(payload);
    }, 5 * 1000);
    pullID = setInterval(() => {
      cache.get_result(payload).then(checkResult);
    }, 1000);
  });
}

module.exports = {
  get_result: get_result
}
