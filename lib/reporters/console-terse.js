'use strict';

var d        = require('es5-ext/lib/Object/descriptor')
  , deferred = require('deferred')
  , Base     = require('./console').Reporter

  , Reporter;

Reporter = function () { Base.apply(this, arguments); };
Reporter.prototype = Object.create(Base.prototype, {
	constructor: d(Reporter),
	logFile: d(function (name, report, limit, pos) {
		if (!report.length) return;
		this.log((limit ? report.slice(0, limit) : report).map(function (msg) {
			return report.path + ':' + msg.line + ':' + msg.character + ':' +
					msg.message;
		}).join('\n'));
	}),
	logStatus: d(function () {})
});

module.exports = exports = function (reports/*, options*/) {
	var options = Object(arguments[1]);
	return deferred.map(reports.map(function (report) {
		deferred.validPromise(report);
		return (new Reporter(report, options)).init();
	}));
};
exports.returnsPromise = true;
exports.Reporter = Reporter;
