'use strict';

const route_helper = require('../helper/route');
const router = require('express').Router();

router.get('/', (req, res) => {
  route_helper.do_render(res, 'usage-scan');
});

router.use('/v1', require('./v1'));
router.use('/v2', require('./v2'));

module.exports = router;
