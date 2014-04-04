'use strict';

var resolve = require('path').resolve
//  , inspect = require('util').inspect

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
		a.deep(opts, copy);
		watcher.close();
	}).done(d, d);
};
