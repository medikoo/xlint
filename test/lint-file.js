'use strict';

var deferred = require('deferred')
  , fs       = require('fs')
  , resolve  = require('path').resolve
  , linter   = require('./__linter')

  , delay = deferred.delay, promisify = deferred.promisify
  , isBuffer = Buffer.isBuffer
  , readFile = promisify(fs.readFile), writeFile = promisify(fs.writeFile)
  , unlink = promisify(fs.unlink)

  , path = resolve(__dirname, '__playground/lint-file/raz/dwa/test.js')
  , optsPath = resolve(__dirname, '__playground/lint-file/.lint')
  , cachePath = resolve(__dirname, '__playground/lint-file/.lintcache');

module.exports = function (t) {
	return {
		"": function (a, d) {
			var watcher, DELAY = 100, event = false, fileOrgSrc, optsOrgSrc;

			watcher = t(linter, path, { watch: true });
			watcher.on('change', function (data) {
				a(event, false, "Expected invoke");
				event = data;
			});
			watcher(delay(function (data) {
				a.deep(data[0], { line: 2, character: 11,
					message: 'Unexpected \'&\'.' }, "#1");
				a.deep(data[1], { line: 4, character: 1,
					message: '\'zoom\' was used before it was defined.' }, "#2");

				return readFile(optsPath)(function (data) {
					optsOrgSrc = String(data);
					return writeFile(optsPath, optsOrgSrc.replace('foo, ', ''));
				});
			}, 100))(delay(function () {
				a.deep(event[0], { line: 2, character: 11,
					message: 'Unexpected \'&\'.' }, "Options change #1");
				a.deep(event[1], { line: 3, character: 1,
					message: '\'foo\' was used before it was defined.' },
					"Options change #2");
				a.deep(event[2], { line: 4, character: 1,
					message: '\'zoom\' was used before it was defined.' },
					"Options change #3");
				event = false;
				return readFile(path)(function (data) {
					fileOrgSrc = String(data);
					return writeFile(path, fileOrgSrc.replace('zoom = {};\n', ''));
				});
			}, DELAY))(delay(function () {
				a.deep(event[0], { line: 2, character: 11,
					message: 'Unexpected \'&\'.' }, "Options change #1");
				a.deep(event[1], { line: 3, character: 1,
					message: '\'foo\' was used before it was defined.' },
					"Options change #2");
				watcher.close();
				return deferred(writeFile(path, fileOrgSrc),
					writeFile(optsPath, optsOrgSrc))(false);
			}, DELAY)).end(d, d);
		},
		"Cache": function (a, d) {
			t(linter, path, { cache: true })(function (report) {
				a.deep(report[0], { line: 2, character: 11,
					message: 'Unexpected \'&\'.' }, "#1");
				a.deep(report[1], { line: 4, character: 1,
					message: '\'zoom\' was used before it was defined.' }, "#2");
				return t(linter, path, { cache: true })(function (r2) {
					a(r2, report, "Taken from cache");
					return unlink(cachePath);
				});
			}).end(d, d);
		}
	};
};
