"use strict";

var express = require('express');
var router = express.Router();

router.get('/', (req, res) => {
  res.render('report-usage');
});

router.get('/:id', (req, res) => {
  res.send(`Report for scan ${req.params.id}`);
});

module.exports = router;
