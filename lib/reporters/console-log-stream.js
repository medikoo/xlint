'use strict';

var forEachRight = require('es5-ext/array/#/for-each-right')
  , d            = require('es5-ext/object/descriptor')
  , mapToArray   = require('es5-ext/object/map-to-array')
  , extend       = require('es5-ext/object/extend')
  , deferred     = require('deferred')
  , Base         = require('./console').Reporter

  , Reporter;

Reporter = function () {
	Base.apply(this, arguments);
};
Reporter.prototype = Object.create(Base.prototype, {
	init: d(function () {
		var initialized, doReload, reports = {}, done = {}, waiting = [];

		this.data.on('change', function (event) {
			if (event.type === 'remove') {
				this.subtract(reports[event.name]);
				delete reports[event.name];
				if (initialized) this.reload();
				else doReload = true;
				return;
			}
			if (event.type === 'update') {
				this.subtract(reports[event.name]);
				if (!initialized) doReload = true;
			}
			this.add(reports[event.name] = event.report);
			if (initialized) {
				this.reload();
				return;
			}
			if (!event.report.length) return;
			waiting.push(this.normalize(event.report)(function (report) {
				if (!report) {
					this.subtract(event.report);
					delete reports[event.name];
					return;
				}
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
			}.bind(this)));
		}.bind(this));

		return this.data(function (data) {
			return deferred.map(waiting);
		}.bind(this))(this.data).aside(function () {
			initialized = true;
			this.logStatus();
			if (doReload) this.reload();
		}.bind(this));
	}),
	reload: d(function () {
		this.data(function (data) {
			return deferred.map(mapToArray(data, function (report, name) {
				if (report.length) {
					return this.normalize(report)(function (nreport) {
						if (!nreport) return;
						this.logFile(name, nreport);
					}.bind(this));
				}
			}, this));
		}.bind(this)).done(function () {
			this.logStatus();
			this.log('\n');
		}.bind(this));
	})
});

module.exports = exports = function (report/*, options*/) {
	deferred.validPromise(report);
	return (new Reporter(report, Object(arguments[1]))).init();
};
exports.returnsPromise = true;
exports.Reporter = Reporter;
