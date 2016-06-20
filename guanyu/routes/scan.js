"use strict";

var fs = require('fs');

var scanner = require('../guanyu/scanner.js');
var logger = require('../guanyu/logger.js');

var file_max_size = require('../config').file_max_size;
var router = require('express').Router();
var upload = require('multer')({limits: {fileSize: file_max_size}, dest: '/tmp/'});


function handle_err(res, err) {
  logger.warn(err);
  res.status(err.status || 500).render("error", {
    message: err.message || "Oops, something bad happened.",
    error: err
  });
}

function collect_options(req) {
  return {
    ignore_read_cache: req.body.ignore_read_cache || false
  };
}

router.get('/', (req, res) => {
  res.render('scan-usage');
});

router.get('/file', (req, res) => {
  res.render('scan-file-usage');
});

router.post('/file', upload.single('file'), (req, res) => {
  scanner.scan_file(
    req.file.path,
    collect_options(req)
  ).then(
    (result) => {
      logger.info(result);
      res.send(result);
    }, (err) => {
      handle_err(res, err);
    });
});


router.get('/uri', (req, res) => {
  res.render('scan-uri-usage');
});

router.post('/uri', (req, res) => {

  scanner.scan_uri(
    req.body.uri,
    collect_options(req)
  ).then(
    (result) => {
      logger.info(result);
      res.send(result);
    }, (err) => {
      return handle_err(res, err);
    });
});


router.get('/text', (req, res) => {
  res.render('scan-text-usage');
});

router.post('/text', (req, res) => {
  scanner.scan_text(
    req.body.text,
    collect_options(req)
  ).then(
    (result) => {
      logger.info(result);
      res.send(result);
    }, (err) => {
      return handle_err(res, err);
    });
});

module.exports = router;
