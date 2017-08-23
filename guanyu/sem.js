'use strict';

const os = require('os');
const sem = require('semaphore');

const config = require('./config');

const cpu_count = os.cpus().length;

const sav_seats = Math.floor(config.get('SCAN:PARALLEL') || config.get('SCAN:PER_CORE') * cpu_count);
const fetch_seats = Math.floor(config.get('FETCH:PARALLEL') || config.get('FETCH:PER_CORE') * cpu_count);
const conn_seats = Math.floor(config.get('CONN:RATIO') * (sav_seats + fetch_seats));

module.exports = {
  fetch: sem(fetch_seats),
  sav: sem(sav_seats),
  seats: {
    conn: conn_seats,
    fetch: fetch_seats,
    sav: sav_seats,
  }
};
