'use strict';

var isCopy  = require('es5-ext/lib/Object/is-copy')
  , resolve = require('path').resolve
  , inspect = require('util').inspect

  , path = resolve(__dirname, '../__playground/read/raz/dwa/foo.js');

module.exports = function (t, a, d) {
	var watcher;
	watcher = t(path, true);
	watcher(function (opts) {
		var copy = {
			adsafe: true,
			predef: ['foo', 'last', 'marko', 'prelast', 'raz'],
			es5: true,
			forin: true,
			fragment: true,
			nomen: true
		};

		// console.log("OPTS", inspect(opts, false, Infinity));
		// console.log("COPY", inspect(copy, false, Infinity));
		a(isCopy(opts, copy, Infinity), true);
		watcher.close();
	}).end(d, d);
};
