"use strict";

var express = require('express');
var extend = require('extend');
var router = express.Router();

var file_scanner = require('../scanner/file');
var route_helper = require('../helper/route');


/* GET home page. */
router.get('/', function (req, res, next) {
  route_helper.do_render(res, 'usage');
});


router.get('/healthcheck', (req, res) => {
  var status = 200;
  var response = {
    param: {
      status: 'healthy',
      proc_per_core: require('../config').get('PROC_PER_CORE'),
      sav_max_seats: require('../scanner/file').sav_max_seats,
    }
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
