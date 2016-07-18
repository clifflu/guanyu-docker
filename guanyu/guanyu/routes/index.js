"use strict";

var express = require('express');
var router = express.Router();

var file_scanner = require('../scanner/file');
var route_helper = require('../helper/route');


/* GET home page. */
router.get('/', function (req, res, next) {
  route_helper.do_render(res, 'usage');
});


router.get('/healthcheck', (req, res) => {
  file_scanner.check_savd_status().then((running) => {
    if (running) {
      return res.send({'status': 'healthy'});
    }

    // savd down
    res.status(500).send({
      'status': 'unhealthy',
      'reason': 'Sophos AV Engine Gone'
    });
  });
});

module.exports = router;
