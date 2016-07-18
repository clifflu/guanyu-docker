var AWS = require('aws-sdk');


AWS.config.credentials = new AWS.SharedIniFileCredentials({
  profile: process.env.AWS_DEFAULT_PROFILE || process.env.AWS_PROFILE
});

AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
});

module.exports = AWS;
