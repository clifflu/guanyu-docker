"use strict";

var express = require('express');
var Promise = require('promise');
var router = express.Router();

var route_helper = require('../guanyu/helper/route');

var exec = require('child_process').exec;
var sem = require('semaphore')(4);

/* GET home page. */
router.get('/', function (req, res, next) {
  route_helper.do_render(res, 'usage');
});

function check_savd_status() {
  var savdstatus = "/opt/sophos-av/bin/savdstatus";
  var pattern_good = /^Sophos Anti-Virus is active /;

  return new Promise((fulfill, reject) => {
    sem.take(() => {
      exec(savdstatus, {timeout: 1000}, (err, stdout) => {
        sem.leave();

        if (stdout.match(pattern_good))
          fulfill();

        reject();
      });
    });
  });
}

router.get('/healthcheck', (req, res) => {
  check_savd_status().then(() => {
      // savd running
      res.send({'status': 'healthy'});
    }, () => {
      // savd down
      res.status(500).send({
        'status': 'unhealthy',
        'reason': 'Sophos AV Engine Gone'
      });
    }
  )
});

module.exports = router;
