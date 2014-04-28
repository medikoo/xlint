'use strict';

var isObject  = require('es5-ext/object/is-object')
  , forEach   = require('es5-ext/object/for-each')
  , normalize = require('es5-ext/object/normalize-options')

  , isArray = Array.isArray;

module.exports = function (options) {
	options = normalize(options);
	forEach(options, function (value, name) {
		if (isArray(value)) {
			options[name] = value.map(String);
			return;
		}
		if ((value == null) || isObject(value)) {
			delete options[name];
		}
	});
	return options;
};
