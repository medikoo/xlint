'use strict';

var isCopy    = require('es5-ext/lib/Object/is-copy')
  , deferred  = require('deferred')
  , delay     = deferred.delay
  , promisify = deferred.promisify
  , isBuffer  = Buffer.isBuffer
  , fs        = require('fs')
  , resolve   = require('path').resolve
  , inspect   = require('util').inspect

  , readFile = promisify(fs.readFile), writeFile = promisify(fs.writeFile)
  , unlink = promisify(fs.unlink)

  , path = resolve(__dirname, '__playground/lint-paths')
  , filePath = resolve(path, 'dwa/footka.js')
  , optsPath = resolve(path, 'dir1/.lint')
  , ignorePath = resolve(path, 'raz/dir2/.lintignore')
  , cachePath = resolve(path, '.lintcache')

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

			watcher = t(paths, { watch: true, depth: Infinity });
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
				// console.log("DATA", inspect(data, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a(isCopy(data, copy, Infinity), true, "Report");
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
				a(isCopy(events, copy, Infinity), true, "Options change: Events");
				events = [];
				return readFile(filePath)(function (data) {
					fileOrgSrc = String(data);
					return writeFile(filePath, fileOrgSrc.replace('zoom = {};\n', ''));
				});
			}, DELAY))(delay(function () {
				var copy = [
					{ type: 'update', name: 'dwa/footka.js', report: [] }
				];
				a(isCopy(events, copy, Infinity), true, "Options change: Events");
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
				// console.log("DATA", inspect(events, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a(isCopy(events, copy, Infinity), true, "Ignore change: Events");
				events = [];
				return writeFile(ignorePath, ignoreOrgSrc);
			}, DELAY))(delay(function () {
				var copy = [
					{ type: 'remove', name: 'raz/dir2/raz/bar.js' }
				];
				a(isCopy(events, copy, Infinity), true, "Ignore revert change: Events");
				watcher.close();
				return deferred(writeFile(filePath, fileOrgSrc),
					writeFile(optsPath, optsOrgSrc),
					writeFile(ignorePath, ignoreOrgSrc))(false);
			}, DELAY)).end(d, d);
		},
		"Cache": function (a, d) {
			t(paths, { cache: true, depth: Infinity })(function (report) {
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
				// console.log("DATA", inspect(report, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a(isCopy(report, copy, Infinity), true, "Report");
				return t(paths, { cache: true, depth: Infinity })(function (r2) {
					a.deep(r2, report, "Taken from cache");
					return unlink(cachePath);
				});
			}).end(d, d);
		},
		"Progress": function (a, d) {
			var events = [], reader;
			reader = t(paths, { depth: Infinity, progress: true });
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
				// console.log("DATA", inspect(report, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a(isCopy(data, copy, Infinity), true, "Report");

				compare = function (a, b) {
					return a.name.localeCompare(b);
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
				a(isCopy(events.sort(compare), copy, Infinity), true, "Events");
			}).end(d, d);
		}
	};
};

