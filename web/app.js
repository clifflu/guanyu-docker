'use strict';

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const bodyParser = require('body-parser');

const config = require('./config');
const token = require('./src/token')
const http_error = require('./src/httperror');

const maxSize = config.get('MAX_SIZE');

const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));

app.use(bodyParser.json({limit: maxSize}));
app.use(bodyParser.urlencoded({limit: maxSize, extended: false}));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  if (req.method == 'POST' && !token.verify(req)) {
    return next(http_error.FORBIDDEN);
  }

  next();
});

let live_connections = 0;

app.use((req, res, next) => {
  function hungUp() {
    res.removeListener('finish', hungUp);
    res.removeListener('close', hungUp);
    --live_connections;
  }

  if (live_connections > config.get('CONN:MAX')) {
    setTimeout(() => {
      next(http_error.TOO_MANY_REQUESTS);
    }, config.get('CONN:HWM_DELAY'));
  } else {
    // take a seat and continue
    ++live_connections;
    res.on('finish', hungUp)
    res.on('close', hungUp)
    next();
  }
});

app.use('/', require('./src/routes/index'));
app.use('/scan', require('./src/routes/scan'));

// forward 404 to error handler
app.use((req, res, next) => {
  next(http_error.NOT_FOUND);
});

// error handler
app.use((err, req, res) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    // remove stacktrace in production
    error: (app.get('env') === 'production') ? '' : err.error,
  });
});

app.listen(3000)

module.exports = app;
