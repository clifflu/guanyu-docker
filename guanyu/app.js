'use strict';

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const bodyParser = require('body-parser');

const config = require('./guanyu/config');
const http_error = require('./guanyu/httperror');

const file_max_size = config.get('FILE:MAX_SIZE');
const max_conn = require('./guanyu/sem').seats.conn;

const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));

app.use(bodyParser.json({limit: file_max_size}));
app.use(bodyParser.urlencoded({limit: file_max_size, extended: false}));

// app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  let tokens = config.get('api-tokens');
  if (req.method == 'POST' && tokens) {
    let token_set = new Set(tokens);
    if (!token_set.has(req.headers['api-token'])) {
      return next(http_error.FORBIDDEN);
    }
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

  if (req.method !== 'POST') {
    // method other than POST
    next();
  } else if (live_connections > max_conn) {
    // POST and too many connections
    setTimeout(() => {
      next(http_error.TOO_MANY_REQUESTS);
    }, config.get('CONN:HOLD_DELAY'));
  } else {
    // POST with open seats
    ++live_connections;
    res.on('finish', hungUp)
    res.on('close', hungUp)
    next();
  }
});

app.use('/', require('./guanyu/routes/index'));
app.use('/scan', require('./guanyu/routes/scan'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(http_error.NOT_FOUND);
});

// error handlers
// no stacktrace for production
app.use((err, req, res) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: (app.get('env') === 'development') ? err.error : '',
  });
});

module.exports = app;
