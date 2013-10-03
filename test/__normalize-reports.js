'use strict';

var curry   = require('es5-ext/function/#/curry')
  , assign  = require('es5-ext/object/assign')
  , clear   = require('es5-ext/object/clear')
  , forEach = require('es5-ext/object/for-each')
  , mapKeys = require('es5-ext/object/map-keys')

  , isArray = Array.isArray
  , join = curry.call(require('path').join, 1);

module.exports = function (data, copy) {
	var ncopy;
	if (isArray(data)) {
		data.forEach(function (value) {
			if (value.report) {
				delete value.report.options;
				delete value.report.src;
				delete value.report.path;
			}
		});
		copy.forEach(function (report) {
			report.name = join(report.name);
		});
	} else {
		forEach(data, function (value) {
			delete value.options;
			delete value.src;
			delete value.path;
		});
		ncopy = mapKeys(copy, join);
		assign(clear(copy), ncopy);
	}
};
