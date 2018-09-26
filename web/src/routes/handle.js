const { logger } = require('guanyu-core');

function handle_err(response) {
  return (err) => {
    logger.warn(err);
    response.status(err.status || 500).render("error", {
      message: err.message || "Oops, something bad happened.",
      error: err
    });

    return Promise.resolve(err);
  }
}

function handle_result(response) {
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