const { cache, prepareLogger } = require('guanyu-core');
const logFn = "web:src/polling";

function polling(payload) {
  const logger = prepareLogger({ loc: `${logFn}:polling` });
  let pullID;
  let timerID;

  if (payload.result && payload.cached) {
    return Promise.resolve(payload);
  }

  function end() {
    pullID = pullID && clearInterval(pullID);
    timerID = timerID && clearTimeout(timerID);
  };

  function checkResult(resolve, reject) {
    return (payload) => {
      if (payload.status || payload.result) {
        end();
        logger.debug("Polling stop");
        cache.update_result_naive(payload).then(() => {
          if (payload.status) {
            return reject(payload);
          }
          resolve(payload);
        });
      }
    }
  };

  logger.debug("Polling start...");
  return new Promise((resolve, reject) => {
    timerID = setTimeout(() => {
      end();
      logger.debug("Polling timeout");
      reject(payload);
    }, (payload.responseTime || 60) * 1000);
    pullID = setInterval(() => {
      cache.get_result_ddb(payload).then(checkResult(resolve, reject));
    }, 1000);
  });
}

module.exports = {
  polling: polling
}
