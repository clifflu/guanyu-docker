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
  var response = {
    'param': {
      'proc_per_core': require('../config').get('PROC_PER_CORE'),
      'sav_max_seats': require('../scanner/file').sav_max_seats,
    }
  };

  file_scanner.check_savd_status().then((running) => {
    if (running) {
      extend(response, {
        'status': 'healthy'
      });
      return res.send(response);
    }

    // savd down
    extend(response, {
      'status': 'unhealthy',
      'reason': 'Sophos AV Engine Gone',
    });

    res.status(500).send(response);
  });
});

module.exports = router;
