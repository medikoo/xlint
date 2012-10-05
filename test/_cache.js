'use strict';

var deferred  = require('deferred')
  , resolve   = require('path').resolve

  , delay = deferred.delay, promisify = deferred.promisify
  , unlink = promisify(require('fs').unlink)

  , cachePath = resolve(__dirname, '__playground/_cache/.lintcache')
  , path = resolve(__dirname, '__playground/_cache/test.js');

module.exports = function (t, a, d) {
	var report = {}, linter = { xlintId: 'TEST' };
	t.get(linter, path, { foo: true })(function (cache) {
		a(cache, null, "get: New");
		t.save(linter, path, { foo: true }, report);
	})(delay(function () {
		return t.get(linter, path, { foo: true })(function (result) {
			a(result, report, "get: Saved");
			return t.get(linter, path, { bar: true });
		});
	}, 100))(function (result) {
		a(result, null, "get: Other");
		return unlink(cachePath);
	}).end(d, d);
};
