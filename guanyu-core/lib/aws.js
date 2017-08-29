'use strict';

const AWS = require('aws-sdk');

process.env.AWS_PROFILE = process.env.AWS_PROFILE ||  process.env.AWS_DEFAULT_PROFILE
process.env.AWS_REGION = process.env.AWS_REGION ||  process.env.AWS_DEFAULT_REGION

if (process.env.AWS_REGION) {
  AWS.config.update({
    region: process.env.AWS_REGION,
  });
}

module.exports = AWS;
