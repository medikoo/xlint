'use strict';

var resolve = require('path').resolve
//   , inspect = require('util').inspect

  , path = resolve(__dirname, '../__playground/get-map');

module.exports = function (t, a, d) {
	var path2 = resolve(path, './foo/bar'), watcher;

	watcher = t(path2, true);
	watcher(function (data) {
		var copy, map, map1, map2, mod;
		map1 = { root: true };
		map2 = {};
		map = {};

		map[path] = map1;
		map[path2] = map2;

		map1[path] = {
			adsafe: true,
			predef: ['bar', 'foo'],
			browser: false,
			eqeq: true
		};
		map1[resolve(path, './raz')] = {
			bitwise: true
		};

		mod = [{ action: 'add', value: ['dwa', 'raz'] }];
		mod.mod = true;
		map2[path2] = {
			predef: mod,
			eqeq: true
		};
		map2[resolve(path2, './foo/bar')] = {
			browser: true
		};
		copy = {
			root: path,
			map: map
		};

		// console.log("DATA", inspect(data, false, Infinity));
		// console.log("COPY", inspect(copy, false, Infinity));
		a.deep(data, copy);
		watcher.close();
	}).end(d, d);
};
