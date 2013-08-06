'use strict';

var forEach  = require('es5-ext/lib/Object/for-each')
  , deferred = require('deferred')

  , cumulate;

cumulate = function (reports, reporters) {
	var result = [], done = {};
	result.options = {};
	reports.forEach(function (report, index) {
		report.forEach(function (error) {
			var id = error.line + ':' + error.character;
			if (done.hasOwnProperty(id)) return;
			done[id] = true;
			result.push(error);
		});
		result.options[reporters[index].xlintId] = report.options;
		if (report.src) result.src = report.src;
		result.path = report.path;
	});
	return result.sort(function (a, b) {
		return (a.line - b.line) || (a.character - b.character);
	});
};

module.exports = function (reporters, options) {
	var data, cumulated, promise;
	if (!reporters.length) return deferred({});
	if (reporters.length === 1) return reporters[0];
	data = {};
	cumulated = {};
	reporters.forEach(function (reporter, index) {
		if (options.watch || options.stream) {
			reporter.on('change', function (event) {
				if (event.type === 'remove') {
					if (!data.hasOwnProperty(event.name)) return;
					delete data[event.name];
					delete cumulated[event.name];
					promise.emit('change', event);
					return;
				}
				if ((event.type === 'add') && !data.hasOwnProperty(event.name)) {
					data[event.name] = [];
					cumulated[event.name] = data[event.name][index] = event.report;
					promise.emit('change', event);
					return;
				}
				data[event.name][index] = event.report;
				cumulated[event.name] = cumulate(data[event.name], reporters);
				promise.emit('change', { type: 'update', name: event.name,
					report: cumulated[event.name] });
			});
		}
		if (!options.stream) {
			reporter(function (reporter) {
				forEach(reporter, function (report, name) {
					if (!data.hasOwnProperty(name)) data[name] = [];
					data[name][index] = report;
				});
			});
		}
	});
	promise = deferred.map(reporters);
	if (!options.stream) {
		promise.aside(function () {
			forEach(data, function (reports, name) {
				cumulated[name] = cumulate(reports, reporters);
			});
		});
	}
	promise = promise(cumulated);
	return promise
};
