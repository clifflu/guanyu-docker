var fs = require('fs');
var path = require('path');

var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

module.exports = pkg.version || 'unknown';
