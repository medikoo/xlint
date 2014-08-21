'use strict';

var deferred = require('deferred')
  , resolve  = require('path').resolve
  , path     = resolve(__dirname, '../__playground/lib/lintignore-mode');

module.exports = function (t, a) {
	var mode = require('fs2/lib/ignore-modes').lint;

	a(mode.filename, '.lintignore', "Filename");
	return {
		Regular: function (a, d) {
			deferred(mode.isRoot(resolve(path, 'foo'))(function (result) {
				a(result, false);
			}), mode.isRoot(resolve(path))(function (result) {
				a(result, true);
			}))(false).done(d, d);
		},
		Watch: function (a, d) {
			var w1, w2;
			w1 = mode.isRootWatcher(resolve(path, 'foo'));
			w2 = mode.isRootWatcher(resolve(path));
			deferred(w1(function (result) { a(result, false); }),
				w2(function (result) { a(result, true); }))(function () {
				w1.close();
				w2.close();
			}).done(d, d);
		}
	};
};
