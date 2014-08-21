'use strict';

var deferred  = require('deferred')
  , fs        = require('fs')
  , resolve   = require('path').resolve
//   , inspect   = require('util').inspect
  , normalize = require('./__normalize-reports')
  , linter    = require('./__linter')

  , delay = deferred.delay, promisify = deferred.promisify
  , readFile = promisify(fs.readFile), writeFile = promisify(fs.writeFile)
  , unlink = promisify(fs.unlink)

  , path = resolve(__dirname, '__playground/lint-files')
  , file1Path = resolve(path, 'test.js')
  , file2Path = resolve(path, 'raz/bar.js')
  , filePath = resolve(path, 'raz/dwa/other-test.js')
  , optsPath = resolve(path, '.lint')
  , ignorePath = resolve(path, '.lintignore')
  , cachePath = resolve(path, '.lintcache');

module.exports = function (t) {
	return {
		"": function (a, d) {
			var watcher, DELAY = 100, events = []
			  , fileOrgSrc, optsOrgSrc, ignoreOrgSrc;

			watcher = t(linter, [file1Path, file2Path, filePath], { watch: true });
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
				normalize(events, copy);
				a.deep(events, copy, "Options change: Events");
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
				normalize(events, copy);
				a.deep(events, copy, "Options change: Events");
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
				normalize(events, copy);
				// console.log("DATA", inspect(events, false, Infinity));
				// console.log("COPY", inspect(copy, false, Infinity));
				a.deep(events, copy, "Ignore change: Events");
				events = [];
				return writeFile(ignorePath, ignoreOrgSrc);
			}, DELAY))(delay(function () {
				var copy = [
					{ type: 'remove', name: 'raz/bar.js' }
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
			t(linter, [file1Path, file2Path, filePath], { cache: true })(
				function (report) {
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
					normalize(report, copy);
					// console.log("DATA", inspect(report, false, Infinity));
					// console.log("COPY", inspect(copy, false, Infinity));
					a.deep(report, copy, "Report");
					return t(linter, [file1Path, file2Path, filePath],
						{ cache: true })(function (r2) {
						a.deep(r2, report, "Taken from cache");
						return unlink(cachePath);
					});
				}
			).done(d, d);
		}
	};
};
