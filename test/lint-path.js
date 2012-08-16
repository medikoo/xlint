'use strict';

var isCopy    = require('es5-ext/lib/Object/is-copy')
  , resolve   = require('path').resolve
  , inspect   = require('util').inspect

  , path = resolve(__dirname, '__playground/lint-path')
  , filePath = resolve(path, 'raz/dwa/other-test.js');

module.exports = function (t) {
	return {
		"Directory": function (a, d) {
			var linter, events = [];
			linter = t(path, { depth: Infinity, progress: true, watch: true });
			linter.on('change', function (data) {
				events.push(data);
			});
			linter(function (data) {
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
				a(isCopy(data, copy, Infinity), true, "Report");

				copy = [
					{ type: 'add', name: 'test.js', report: [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					] },
					{ type: 'add', name: 'raz/dwa/other-test.js', report: [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					] }
				];
				a(isCopy(events, copy, Infinity), true, "Events");

				linter.close();
			}).end(d, d);
		},
		"File": function (a, d) {
			var linter;
			(linter = t(filePath, { watch: true }))(function (data) {
				var copy = [
					{ line: 2, character: 11,
						message: 'Unexpected \'&\'.' },
					{ line: 4, character: 1,
						message: '\'zoom\' was used before it was defined.' }
				];
				// console.log("DATA", inspect(data, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a(isCopy(data, copy, Infinity), true);
				linter.close();
			}).end(d, d);
		}
	};
};
