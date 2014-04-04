'use strict';

var resolve   = require('path').resolve
//  , inspect   = require('util').inspect
  , normalize = require('./__normalize-reports')
  , linter    = require('./__linter')

  , path = resolve(__dirname, '__playground/lint-path')
  , filePath = resolve(path, 'raz/dwa/other-test.js');

module.exports = function (t) {
	return {
		"Directory": function (a, d) {
			var lint, events = [];
			lint = t(linter, path, { depth: Infinity, stream: true, watch: true });
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
				normalize(data, copy);
				// console.log("DATA", inspect(data, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a.deep(data, copy, "Report");

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
				normalize(events, copy);
				a.deep(events, copy, "Events");

				lint.close();
			}).done(d, d);
		},
		"File": function (a, d) {
			var lint = t(linter, filePath, { watch: true });
			lint(function (data) {
				var copy = { ".": [
					{ line: 2, character: 11,
						message: 'Unexpected \'&\'.' },
					{ line: 4, character: 1,
						message: '\'zoom\' was used before it was defined.' }
				] };
				normalize(data, copy);
				// console.log("DATA", inspect(data, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a.deep(data, copy);
				lint.close();
			}).done(d, d);
		}
	};
};
