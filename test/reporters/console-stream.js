'use strict';

var deferred = require('deferred');

module.exports = function (t, a, d) {
	var report = [{ message: 'Lorem ipsum', character: 1, line: 1 }], invoked
	  , promise;
	report.src = 'Lorem ipsum';
	report.options = {};
	promise = deferred({ 'foo': report });
	t(promise, { log: function (str) {
		a(typeof str, 'string', "Log string");
		invoked = true;
	} }).done();
	promise.emit('change', { type: 'add', name: 'foo', report: report });
	a(invoked, true);
	process.nextTick(d);
};
