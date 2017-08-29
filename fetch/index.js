const gc = require('guanyu-core')

const logger = gc.logger
const sqs = new gc.aws.SQS()

function _main() {

}

function logAndDiscard(err) {
  logger.err({
    loc:
  })
}

function entry(){
  _main()
    .catch(logAndDiscard)
    .then(() => setTimeout(entry))
}
