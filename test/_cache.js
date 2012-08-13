'use strict';

var deferred  = require('deferred')
  , delay     = deferred.delay
  , promisify = deferred.promisify
  , fs        = require('fs')
  , resolve   = require('path').resolve
  , unlink    = promisify(fs.unlink)

  , cachePath = resolve(__dirname, '__playground/_cache/.lintcache')
  , path = resolve(__dirname, '__playground/_cache/test.js');

module.exports = function (t, a, d) {
	var report = {};
	t.get(path, { foo: true })(function (cache) {
		a(cache, null, "get: New");
		t.save(path, { foo: true }, report);
	})(delay(function () {
		return t.get(path, { foo: true })(function (result) {
			a(result, report, "get: Saved");
			return t.get(path, { bar: true });
		});
	}, 100))(function (result) {
		a(result, null, "get: Other");
		return unlink(cachePath);
	}).end(d, d);
};
