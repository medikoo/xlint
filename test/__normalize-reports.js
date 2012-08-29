'use strict';

var isArray = Array.isArray
  , curry   = require('es5-ext/lib/Function/prototype/curry')
  , clear   = require('es5-ext/lib/Object/clear')
  , extend  = require('es5-ext/lib/Object/extend')
  , forEach = require('es5-ext/lib/Object/for-each')
  , mapKeys = require('es5-ext/lib/Object/map-keys')

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
		extend(clear(copy), ncopy);
	}
};
