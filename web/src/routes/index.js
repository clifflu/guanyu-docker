'use strict';

const express = require('express');
const router = express.Router();

const route_helper = require('../helper/route');


/* GET home page. */
router.get('/', function (req, res, next) {
  route_helper.do_render(res, 'usage');
});


router.get('/healthcheck', (req, res) => {
  res
    .status(200)
    .send({ status: 'healthy' })
})

module.exports = router;
