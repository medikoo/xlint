'use strict';

var isArray = Array.isArray
  , forEach = require('es5-ext/lib/Object/for-each');

module.exports = function (data) {
	if (isArray(data)) {
		data.forEach(function (value) {
			if (value.report) {
				delete value.report.options;
				delete value.report.src;
				delete value.report.path;
			}
		});
	} else {
		forEach(data, function (value) {
			delete value.options;
			delete value.src;
			delete value.path;
		});
	}
};
