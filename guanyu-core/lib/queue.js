const AWS = require('./aws');
const extend = require('extend');
const logFn = 'guanyu-core:lib/queue';
const { prepareLogger } = require('./logger');

function send_message(payload) {
  const logger = prepareLogger({ loc: `${logFn}:sendMessage` });

  if (payload.result) {
    logger.debug("Skip send message for result already known or error.");
    return Promise.resolve(payload);
  }

  if (payload.cached) {
    logger.debug("Skip send message for sophosav scanning");
    return Promise.resolve(payload);
  }

  let queue_url = payload.queue_url;
  delete payload.queue_url;
  let sqs = new AWS.SQS();

  if (!sqs) {
    logger.error("Failed create sqs.");
    return Promise.reject(extend({}, payload, {
      message: "Failed create sqs."
    }));
  }

  logger.debug(`Try send message to "${queue_url}"`);
  return sqs.sendMessage({
    MessageBody: JSON.stringify(payload),
    QueueUrl: queue_url
  }).promise().then(data => {
    logger.debug(`send message to fetch queue ("${queue_url}")`, data);
    return Promise.resolve(payload);
  }, err => {
    logger.error(`Failed send message to "${queue_url}"`, err);
    return Promise.reject(extend({}, payload, {
      message: "Failed send message to fetch queue."
    }));
  });
}

module.exports = {
  send_message: send_message
}