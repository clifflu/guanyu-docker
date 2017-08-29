const gc = require('guanyu-core')

const config = gc.config
const plogger = gc.prepareLogger
const sqs = new gc.aws.SQS()

function sendMessage() {
  return new Promise((resolve, reject) => {
    sqs.sendMessage(
      {
        QueueUrl: config.get('PLUGIN:FETCH:QUEUE'),
        MessageBody: '{"url": "aaa", "hash": "bbb"}'
      },
      (err, data) => err ? reject(err) : resolve(data)
    )
  }).then(() => console.log('Msg sent'))
}

function main() {
  setInterval(sendMessage, 5000)
}

main()
