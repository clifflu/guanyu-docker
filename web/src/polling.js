const { cache, prepareLogger } = require('guanyu-core');
const logFn = "web:src/polling";

function polling(payload) {
  const logger = prepareLogger({ loc: `${logFn}:polling` });
  let time = [0, 1];
  let pullID;
  let timerID;

  if (payload.result && payload.cached) {
    return Promise.resolve(payload);
  }

  function end() {
    pullID = pullID && clearInterval(pullID);
    timerID = timerID && clearTimeout(timerID);
  };

  function checkResult() {
    return (payload) => {
      if (payload.status || payload.result) {
        end();
        logger.debug("Polling stop");
        cache.update_result_naive(payload).then(() => {
          if (payload.status) {
            return this.reject(payload);
          }
          return this.resolve(payload);
        });
      }
      if (timerID) {
        clearInterval(pullID);
        startInterval();
      }
    }
  };

  function setEndMethod(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;
  }

  function startInterval() {
    pullID = setInterval(() => {
      cache.get_result_ddb(payload).then(checkResult());
    }, getIntervalTime() * 1000);
  }

  function getIntervalTime() {
    let intervalTime = time[0] + time[1];

    if (intervalTime < 5) {
      time[0] = time[1];
      time[1] = intervalTime;
    }

    return intervalTime;
  }

  logger.debug("Polling start...");
  return new Promise((resolve, reject) => {
    setEndMethod(resolve, reject);
    timerID = setTimeout(() => {
      end();
      logger.debug("Polling timeout");
      reject(payload);
    }, (payload.responseTime || 60) * 1000);
    startInterval();
  });
}

module.exports = {
  polling: polling
}
