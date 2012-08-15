'use strict';

var isCopy    = require('es5-ext/lib/Object/is-copy')
  , resolve   = require('path').resolve
  , inspect   = require('util').inspect

  , path = resolve(__dirname, '__playground/lint-path')
  , filePath = resolve(path, 'raz/dwa/other-test.js');

module.exports = function (t) {
	return {
		"Directory": function (a, d) {
			t(path, { depth: Infinity })(function (data) {
				var copy = {
					'test.js': [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					],
					'raz/dwa/other-test.js': [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					]
				};
				// console.log("DATA", inspect(data, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a(isCopy(data, copy, Infinity), true);
			}).end(d, d);
		},
		"File": function (a, d) {
			t(filePath)(function (data) {
				var copy = [
					{ line: 2, character: 11,
						message: 'Unexpected \'&\'.' },
					{ line: 4, character: 1,
						message: '\'zoom\' was used before it was defined.' }
				];
				// console.log("DATA", inspect(data, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a(isCopy(data, copy, Infinity), true);
			}).end(d, d);
		}
	};
};
