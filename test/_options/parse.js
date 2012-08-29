'use strict';

var isCopy   = require('es5-ext/lib/Object/is-copy')
  , path     = require('path')
  , readFile = require('fs').readFile
  , inspect  = require('util').inspect

  , join = path.join, resolve = path.resolve

  , testFile = resolve(__dirname, 'parse.txt');

module.exports = function (t, a, d) {
	readFile(testFile, function (err, data) {
		var result, mod1, mod2, copy;
		if (err) {
			d(err);
			return;
		}
		result = t(data, join('/one/two'));
		mod1 = [{ action: 'add', value: ['bar', 'foo'] }];
		mod2 = [{ action: 'remove', value: ['mala', 'morda'] }];
		mod1.mod = mod2.mod = true;

		copy = { root: true };
		copy[join('/one/two')] = {
			adsafe: false,
			bitwise: true,
			devel: true,
			debug: false,
			predef: ['two'],
			eqeq: true
		};
		copy[join('/one/two/foo/bar')] = {
			browser: false,
			cap: true,
			predef: mod1
		};
		copy[join('/one/two/marko-zagalo.js')] = {
			predef: mod2
		};

		// console.log("DATA", inspect(result, false, Infinity));
		// console.log("COPY", inspect(copy, false, Infinity));
		a(isCopy(result, copy, Infinity), true);
		d();
	});
};
