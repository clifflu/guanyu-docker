var AWS = require('aws-sdk');

process.env.AWS_PROFILE = process.env.AWS_PROFILE ||  process.env.AWS_DEFAULT_PROFILE;

if (process.env.AWS_DEFAULT_REGION) {
  AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION,
  });
}

module.exports = AWS;
