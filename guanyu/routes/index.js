"use strict";

var express = require('express');
var router = express.Router();

var route_helper = require('../guanyu/helper/route');

/* GET home page. */
router.get('/', function(req, res, next) {
  route_helper.do_render(res, 'usage');
});

module.exports = router;
