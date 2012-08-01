'use strict';

var reduce   = Array.prototype.reduce
  , readFile = require("fs").readFileSync
  , resolve  = require('path').resolve
  , vm       = require("vm")
  , parser   = require('./_jslint-parser')

  , ctx = vm.createContext({}), linter

vm.runInContext(readFile(resolve(__dirname, "../../external/jshint.js")), ctx);
linter = ctx.JSHINT;

module.exports = function (src, options) {
	return parser(linter, src, options);
};
