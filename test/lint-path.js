'use strict';

var isCopy       = require('es5-ext/lib/Object/is-copy')
  , resolve      = require('path').resolve
  , inspect      = require('util').inspect
  , clearOptions = require('./__clear-options')
  , linter       = require('./__linter')

  , path = resolve(__dirname, '__playground/lint-path')
  , filePath = resolve(path, 'raz/dwa/other-test.js')

module.exports = function (t) {
	return {
		"Directory": function (a, d) {
			var lint, events = [];
			lint = t(linter, path, { depth: Infinity, progress: true, watch: true });
			lint.on('change', function (data) {
				events.push(data);
			});
			lint(function (data) {
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
				clearOptions(data);
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
				clearOptions(events);
				a(isCopy(events, copy, Infinity), true, "Events");

				lint.close();
			}).end(d, d);
		},
		"File": function (a, d) {
			var lint;
			(lint = t(linter, filePath, { watch: true }))(function (data) {
				var copy = { "": [
					{ line: 2, character: 11,
						message: 'Unexpected \'&\'.' },
					{ line: 4, character: 1,
						message: '\'zoom\' was used before it was defined.' }
				] };
				// console.log("DATA", inspect(data, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				clearOptions(data);
				a(isCopy(data, copy, Infinity), true);
				lint.close();
			}).end(d, d);
		}
	};
};
