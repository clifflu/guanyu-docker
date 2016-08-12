'use strict';

const express = require('express');
const extend = require('extend');
const router = express.Router();

const file_scanner = require('../scanner/file');
const route_helper = require('../helper/route');
const sem = require('../sem');


/* GET home page. */
router.get('/', function (req, res, next) {
  route_helper.do_render(res, 'usage');
});


router.get('/healthcheck', (req, res) => {
  var status = 200;
  var response = {
    status: 'healthy',
    seats: sem.seats,
  };

  file_scanner.check_savd_status().then((running) => {
    if (!running) {
      // savd down
      status = 500;
      extend(response, {
        'status': 'unhealthy',
        'reason': 'Sophos AV Engine Down',
      });
    }

    res.status(status).send(response);
  });
});

module.exports = router;
