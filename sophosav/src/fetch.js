const extend = require('extend');
const gc = require('guanyu-core')
const scan = require('./scan');
const config = gc.config
const logFn = 'sophosav:src/fetch'
const plogger = gc.prepareLogger
const sqs = new gc.aws.SQS()

const sqsParams = Object.freeze({
  QueueUrl: config.get('PLUGIN:SOPHOSAV:QUEUE'),
  WaitTimeSeconds: config.get('PLUGIN:FETCH:WAIT_SECONDS'),
})

function receiveMessage() {
  const logger = plogger({loc: `${logFn}:receiveMessage`})

  return new Promise((resolve, reject) => {
    sqs.receiveMessage(sqsParams, (err, data) => err ? reject(err) : resolve(data))
  })
}

function parseMessageSync(awsData) {
  const logger = plogger({loc: `${logFn}:parsePayload`})

  if (!awsData.Messages) {  // No data
    logger.info(`empty queue`)
    return {}
  }

  let body
  let msg = awsData.Messages[0]
  let awsMsgId = msg.MessageId
  let handle = msg.ReceiptHandle

  try {
    body = JSON.parse(msg.Body)
  } catch (e) {
    // malformed body, log and mark for deletion
    logger.warn(`malformed body: ${JSON.stringify(msg.Body)}`)
    return { handle }
  }

  logger.info(`received msgId: ${awsMsgId}`)

  return { handle, awsMsgId, body }
}

function processMessage(payload) {
  const logger = plogger({loc: `${logFn}:processMessage`})

  if (!payload.body) {  // No resource
    logger.info(`queue message is empty`)
    return {}
  }

  return scan.scan_file(payload.body).then(function(value){
    return extend(payload, value);
  });
}

function deleteMessage(payload) {
  const logger = plogger({loc: `${logFn}:deleteMessage`})

  if (!payload.handle) {
    logger.info(`skipping ${payload.awsMsgId} for deleteion for handle missing`)
    return payload
  }

  let params = {
    QueueUrl: config.get('PLUGIN:SOPHOSAV:QUEUE'),
    ReceiptHandle: payload.handle,
  }

  return new Promise((resolve, reject) => {
    sqs.deleteMessage(params, (err, data) => {
      if (err)
        return reject(err)

      logger.info(`deleted msgId ${payload.awsMsgId}`)
      resolve(payload)
    })
  })

  return payload
}

function main() {
  return receiveMessage()
    .then(parseMessageSync)
    .then(processMessage)
    .then(deleteMessage)
}

module.exports = main
