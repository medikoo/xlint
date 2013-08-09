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
		this.log('----- FILE  :  ' + report.path + ' -----\n');
		this.log((limit ? report.slice(0, limit) : report).map(function (msg) {
			return 'Line ' + msg.line + ', E:0000: ' + msg.message;
		}).join('\n') + '\n');
		this.log('Found ' + report.length + ' errors.');
	}),
	logStatus: d(function () {})
});

module.exports = exports = function (report/*, options*/) {
	deferred.validPromise(report);
	return (new Reporter(report, Object(arguments[1]))).init();
};
exports.returnsPromise = true;
exports.Reporter = Reporter;
