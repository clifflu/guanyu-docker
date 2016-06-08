"use strict";

module.exports = {
  scan_file: require("./scanner/file").scan_file,
  scan_uri: require('./scanner/uri').scan_uri,
  scan_text: require("./scanner/text").scan_text
};
