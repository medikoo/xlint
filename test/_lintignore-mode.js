'use strict';

var deferred = require('deferred')
  , resolve  = require('path').resolve
  , path     = resolve(__dirname, '__playground/_lintignore-mode')

module.exports = function (t, a) {
	var mode = require('next/lib/fs/_ignorefile-modes').lint;

	a(mode.filename, '.lintignore', "Filename");
	return {
		"Regular": function (a, d) {
			deferred(mode.isRoot(resolve(path, 'foo'))(function (result) {
				a(result, false);
			}), mode.isRoot(resolve(path))(function (result) {
				a(result, true);
			}))(false).end(d, d)
		},
		"Watch": function (a, d) {
			var w1, w2;
			deferred((w1 = mode.isRootWatch(resolve(path, 'foo')))(function (result) {
				a(result, false);
			}), (w2 = mode.isRootWatch(resolve(path)))(function (result) {
				a(result, true);
			}))(function () {
				w1.close();
				w2.close();
			}).end(d, d)
		}
	};
};
