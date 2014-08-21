'use strict';

var deferred  = require('deferred')
  , fs        = require('fs')
  , resolve   = require('path').resolve
//  , inspect   = require('util').inspect
  , normalize = require('./__normalize-reports')
  , linter    = require('./__linter')

  , delay = deferred.delay, promisify = deferred.promisify
  , readFile = promisify(fs.readFile), writeFile = promisify(fs.writeFile)
  , unlink = promisify(fs.unlink)

  , path = resolve(__dirname, '__playground/lint-paths')
  , filePath = resolve(path, 'dwa/footka.js')
  , optsPath = resolve(path, 'dir1/.lint')
  , ignorePath = resolve(path, 'raz/dir2/.lintignore')
  , cachePath = resolve(path, '.lintcache');

module.exports = function (t) {
	var paths = [
		resolve(path, 'dir1/raz/dwa'),
		resolve(path, 'dir1'),
		resolve(path, 'raz/dir2/test.js'),
		filePath,
		resolve(path, 'raz/dir2'),
		resolve(path, 'dwa/footka.js')
	];
	return {
		"": function (a, d) {
			var watcher, DELAY = 100, events = []
			  , fileOrgSrc, optsOrgSrc, ignoreOrgSrc;

			watcher = t(linter, paths, { watch: true, depth: Infinity });
			watcher.on('change', function (data) {
				events.push(data);
			});
			watcher(delay(function (data) {
				var copy = {
					'raz/dir2/test.js': [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					],
					'dwa/footka.js': [
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					],
					'dir1/test.js': [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					],
					'dir1/raz/dwa/other-test.js': [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					],
					'raz/dir2/raz/dwa/other-test.js': [
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
				return readFile(optsPath)(function (data) {
					optsOrgSrc = String(data);
					return writeFile(optsPath, optsOrgSrc.replace('foo, ', ''));
				});
			}, 100))(delay(function () {
				var copy = [
					{ type: 'update', name: 'dir1/test.js', report: [
						{ line: 3, character: 1,
							message: '\'foo\' was used before it was defined.' },
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					] },
					{ type: 'update', name: 'dir1/raz/dwa/other-test.js', report: [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 3, character: 1,
							message: '\'foo\' was used before it was defined.' },
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					] }
				];
				normalize(events, copy);
				a.deep(events, copy, "Options change: Events");
				events = [];
				return readFile(filePath)(function (data) {
					fileOrgSrc = String(data);
					return writeFile(filePath, fileOrgSrc.replace('zoom = {};\n', ''));
				});
			}, DELAY))(delay(function () {
				var copy = [
					{ type: 'update', name: 'dwa/footka.js', report: [] }
				];
				normalize(events, copy);
				a.deep(events, copy, "Options change: Events");
				events = [];
				return readFile(ignorePath)(function (data) {
					ignoreOrgSrc = String(data);
					return writeFile(ignorePath, ignoreOrgSrc.replace('bar.js\n', ''));
				});
			}, DELAY))(delay(function () {
				var copy = [
					{ type: 'add', name: 'raz/dir2/raz/bar.js', report: [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 3, character: 1,
							message: '\'marko\' was used before it was defined.' }
					] }
				];
				normalize(events, copy);
				// console.log("DATA", inspect(events, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a.deep(events, copy, "Ignore change: Events");
				events = [];
				return writeFile(ignorePath, ignoreOrgSrc);
			}, DELAY))(delay(function () {
				var copy = [
					{ type: 'remove', name: 'raz/dir2/raz/bar.js' }
				];
				normalize(events, copy);
				a.deep(events, copy, "Ignore revert change: Events");
				watcher.close();
				return deferred(writeFile(filePath, fileOrgSrc),
					writeFile(optsPath, optsOrgSrc),
					writeFile(ignorePath, ignoreOrgSrc))(false);
			}, DELAY)).done(d, d);
		},
		Cache: function (a, d) {
			t(linter, paths, { cache: true, depth: Infinity })(function (report) {
				var copy = {
					'raz/dir2/test.js': [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					],
					'dwa/footka.js': [
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					],
					'dir1/test.js': [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					],
					'dir1/raz/dwa/other-test.js': [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					],
					'raz/dir2/raz/dwa/other-test.js': [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					]
				};
				normalize(report, copy);
				// console.log("DATA", inspect(report, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a.deep(report, copy, "Report");
				return t(linter, paths, { cache: true, depth: Infinity })(
					function (r2) {
						a.deep(r2, report, "Taken from cache");
						return unlink(cachePath);
					}
				);
			}).done(d, d);
		},
		Stream: function (a, d) {
			var events = [], reader;
			reader = t(linter, paths, { depth: Infinity, stream: true });
			reader.on('change', function (data) {
				events.push(data);
			});
			reader(function (data) {
				var copy, compare;
				copy = {
					'raz/dir2/test.js': [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					],
					'dwa/footka.js': [
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					],
					'dir1/test.js': [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					],
					'dir1/raz/dwa/other-test.js': [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					],
					'raz/dir2/raz/dwa/other-test.js': [
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

				compare = function (a, b) {
					return a.name.localeCompare(b.name);
				};
				copy = [
					{ type: 'add', name: 'raz/dir2/test.js', report: [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					] },
					{ type: 'add', name: 'dwa/footka.js', report: [
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					] },
					{ type: 'add', name: 'dir1/test.js', report: [
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					] },
					{ type: 'add', name: 'dir1/raz/dwa/other-test.js', report: [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					] },
					{ type: 'add', name: 'raz/dir2/raz/dwa/other-test.js', report: [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 4, character: 1,
							message: '\'zoom\' was used before it was defined.' }
					] }
				].sort(compare);
				normalize(events, copy);
				events.sort(compare);
				// console.log("DATA", inspect(events, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a.deep(events, copy, "Events");
			}).done(d, d);
		}
	};
};
