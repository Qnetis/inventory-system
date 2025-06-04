'use strict';

const defaultRouter = require('./record');
const customRouter = require('./custom-record');

module.exports = {
  default: defaultRouter,
  custom: customRouter,
};