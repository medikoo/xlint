'use strict';

var deferred  = require('deferred')
  , delay     = deferred.delay
  , promisify = deferred.promisify
  , isBuffer  = Buffer.isBuffer
  , fs        = require('fs')
  , resolve   = require('path').resolve
  , readFile  = promisify(fs.readFile)
  , writeFile = promisify(fs.writeFile)

  , path = resolve(__dirname, '__playground/lint-file/raz/dwa/test.js')
  , optsPath = resolve(__dirname, '__playground/lint-file/.lint')

module.exports = function (t, a, d) {
	var watcher, DELAY = 100, event = false, fileOrgSrc, optsOrgSrc;

	watcher = t(path, { watch: true });
	watcher.on('change', function (data) {
		a(event, false, "Expected invoke");
		event = data;
	});
	watcher(delay(function (data) {
		a.deep(data[0], { line: 2, character: 11, message: 'Unexpected \'&\'.' },
			"#1");
		a.deep(data[1], { line: 4, character: 1,
			message: '\'zoom\' was used before it was defined.' }, "#2");

		return readFile(optsPath)(function (data) {
			optsOrgSrc = String(data);
			return writeFile(optsPath, optsOrgSrc.replace('foo, ', ''));
		});
	}, 100))(delay(function () {
		a.deep(event[0], { line: 2, character: 11, message: 'Unexpected \'&\'.' },
			"Options change #1");
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
		a.deep(event[0], { line: 2, character: 11, message: 'Unexpected \'&\'.' },
			"Options change #1");
		a.deep(event[1], { line: 3, character: 1,
			message: '\'foo\' was used before it was defined.' },
			"Options change #2");
		watcher.close();
		return deferred(writeFile(path, fileOrgSrc),
			writeFile(optsPath, optsOrgSrc))(false);
	}, DELAY)).end(d, d);
};
