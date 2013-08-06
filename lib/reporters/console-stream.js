'use strict';

var forEachRight = require('es5-ext/lib/Array/prototype/for-each-right')
  , d            = require('es5-ext/lib/Object/descriptor')
  , extend       = require('es5-ext/lib/Object/extend')
  , memoize      = require('memoizee')
  , deferred     = require('deferred')
  , clc          = require('cli-color')
  , Base         = require('./console').Reporter

  , nextTick = process.nextTick

  , Reporter;

Reporter = function () {
	Base.apply(this, arguments);
};
Reporter.prototype = Object.create(Base.prototype, {
	init: d(function () {
		var waiting, status, isStatus, clearStatus, reports = {}, done = {};
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
					if (done.hasOwnProperty(event.name)) {
						report = extend([], report);
						forEachRight.call(report, function (error, i) {
							var id = error.line + ':' + error.character;
							if (this.hasOwnProperty(id)) {
								report.splice(i, 1);
								return;
							}
							this[id] = true;
						}, done[event.name]);
					} else {
						report.forEach(function (error) {
							this[error.line + ':' + error.character] = true;
						}, done[event.name] = {});
					}
					this.logFile(event.name, report);
					status();
				}.bind(this)));
			} else {
				status();
			}
		}.bind(this));

		return this.data(function (data) {
			return deferred.map(waiting);
		}.bind(this))(this.data);
	})
});

module.exports = exports = function (report/*, options*/) {
	deferred.validPromise(report);
	return (new Reporter(report, Object(arguments[1]))).init();
};
exports.returnsPromise = true;
exports.Reporter = Reporter;
