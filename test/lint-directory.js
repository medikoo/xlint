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

  , path = resolve(__dirname, '__playground/lint-directory')
  , filePath = resolve(path, 'raz/dwa/other-test.js')
  , optsPath = resolve(path, '.lint')
  , ignorePath = resolve(path, '.lintignore')
  , cachePath = resolve(path, '.lintcache')

module.exports = function (t) {
	return {
		"": function (a, d) {
			var watcher, DELAY = 100, events = []
			  , fileOrgSrc, optsOrgSrc, ignoreOrgSrc;

			watcher = t(path, { watch: true, depth: Infinity });
			watcher.on('change', function (data) {
				events.push(data);
			});
			watcher(delay(function (data) {
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
				return readFile(optsPath)(function (data) {
					optsOrgSrc = String(data);
					return writeFile(optsPath, optsOrgSrc.replace('foo, ', ''));
				});
			}, 100))(delay(function () {
				var copy = [
					{ type: 'update', name: 'test.js', report: [
						{ line: 3, character: 1,
							message: '\'foo\' was used before it was defined.' },
						{ line: 5, character: 1,
							message: '\'fooelse\' was used before it was defined.' }
					] },
					{ type: 'update', name: 'raz/dwa/other-test.js', report: [
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
					{ type: 'update', name: 'raz/dwa/other-test.js', report: [
						{ line: 2, character: 11,
							message: 'Unexpected \'&\'.' },
						{ line: 3, character: 1,
							message: '\'foo\' was used before it was defined.' }
					] }
				];
				a(isCopy(events, copy, Infinity), true, "Options change: Events");
				events = [];
				return readFile(ignorePath)(function (data) {
					ignoreOrgSrc = String(data);
					return writeFile(ignorePath, ignoreOrgSrc.replace('bar.js\n', ''));
				});
			}, DELAY))(delay(function () {
				var copy = [
					{ type: 'add', name: 'raz/bar.js', report: [
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
					{ type: 'remove', name: 'raz/bar.js' }
				];
				a(isCopy(events, copy, Infinity), true, "Ignore revert change: Events");
				watcher.close();
				return deferred(writeFile(filePath, fileOrgSrc),
					writeFile(optsPath, optsOrgSrc),
					writeFile(ignorePath, ignoreOrgSrc))(false);
			}, DELAY)).end(d, d);
		},
		"Cache": function (a, d) {
			t(path, { cache: true, depth: Infinity })(function (report) {
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
				// console.log("DATA", inspect(report, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a(isCopy(report, copy, Infinity), true, "Report");
				return t(path, { cache: true, depth: Infinity })(function (r2) {
					a.deep(r2, report, "Taken from cache");
					return unlink(cachePath);
				});
			}).end(d, d);
		},
		"Progress": function (a, d) {
			var events = [], reader;
			reader = t(path, { depth: Infinity, progress: true });
			reader.on('change', function (data) {
				events.push(data);
			});
			reader(function (data) {
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
				// console.log("DATA", inspect(report, false, Infinity));
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
			}).end(d, d);
		}
	};
};
