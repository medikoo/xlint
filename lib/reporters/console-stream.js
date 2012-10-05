'use strict';

var d        = require('es5-ext/lib/Object/descriptor')
  , memoize  = require('memoizee')
  , deferred = require('deferred')
  , clc      = require('cli-color')
  , Base     = require('./console').Reporter

  , nextTick = process.nextTick

  , Reporter;

Reporter = function () {
	Base.apply(this, arguments);
};
Reporter.prototype = Object.create(Base.prototype, {
	init: d(function () {
		var waiting, status, isStatus, clearStatus, reports = {};
		waiting = [];
		status = memoize(function () {  nextTick(function () {
			status.clear();
			clearStatus();
			this.logStatus();
			this.log('\n');
			isStatus = true;
		}.bind(this)); }.bind(this));

		clearStatus = function () {
			if (isStatus) {
				this.log(clc.bol(-2, true));
				isStatus = false;
			}
		}.bind(this);

		this.data.on('change', function (event) {
			if (event.type === 'remove') {
				this.subtract(reports[event.name]);
				delete reports[event.name];
				clearStatus();
				status();
				return;
			} else if (event.type === 'update') {
				this.subtract(reports[event.name]);
			}
			this.add(reports[event.name] = event.report);
			if (event.report.length) {
				waiting.push(this.normalize(event.report)(function (report) {
					if (!report) {
						this.subtract(event.report);
						delete reports[event.name];
						return;
					}
					clearStatus();
					this.logFile(event.name, report);
					status();
				}.bind(this)));
			} else {
				status();
			}
		}.bind(this));

		return this.data(function (data) {
			if (this.options.stream) {
				return deferred.map(waiting);
			} else {
				return deferred.map(data, function (report, name) {
					this.add(reports[name] = report);
					if (report.length) {
						return this.normalize(report)(function (nreport) {
							if (!nreport) {
								this.subtract(report);
								delete reports[name];
								return;
							}
							this.logFile(name, report);
						}.bind(this));
					}
				}.bind(this))(function () {
					status();
				});
			}
		}.bind(this))(this.data);
	})
});

module.exports = exports = function (report/*, options*/) {
	deferred.validPromise(report);
	return (new Reporter(report, Object(arguments[1]))).init();
};
exports.returnsPromise = true;
exports.Reporter = Reporter;
