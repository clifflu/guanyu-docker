const logFn = 'web:src/routes/handle';
const { prepareLogger } = require('guanyu-core');

function handle_err(response) {
  const logger = prepareLogger({ loc: `${logFn}:handleErr` });
  return (err) => {
    logger.warn("Server error", err);
    response.status(err.status || 500).render("error", {
      message: err.message || "Oops, something bad happened.",
      error: err
    });

    return Promise.resolve(err);
  }
}

function handle_result(response) {
  const logger = prepareLogger({ loc: `${logFn}:handleResult` });
  return (result) => {
    logger.info(result);
    response.send(result);
    return Promise.resolve(result);
  }
}

module.exports = {
  handle_result: handle_result,
  handle_err: handle_err
};