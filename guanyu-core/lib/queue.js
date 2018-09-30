const AWS = require('./aws');
const extend = require('extend');
const logFn = 'queue:guanyu-core/lib/queue';
const { prepareLogger } = require('./logger');

function send_message(payload) {
  const logger = prepareLogger({ loc: `${logFn}:sendMessage` });
  let queue_url = payload.queue_url;
  delete payload.queue_url;
  let sqs = new AWS.SQS();

  if (!sqs) {
    logger.error(`Failed send message to "${queue_url}"`, err);
    return Promise.reject(extend({}, payload, {
      message: "Failed create sqs."
    }));
  }

  logger.debug(`Try send message to "${queue_url}"`);
  return new Promise((resolve, reject) => {
    sqs.sendMessage({
      MessageBody: JSON.stringify(payload),
      QueueUrl: queue_url
    }, (err, data) => {
      if (err) {
        logger.error(`Failed send message to "${queue_url}"`, err);
        return reject(extend({}, payload, {
          message: "Failed send message to fetch queue."
        }));
      }
      logger.debug(`send message to fetch queue ("${queue_url}")`, data);

      return resolve(payload);
    })
  });
}

module.exports = {
  send_message: send_message
}