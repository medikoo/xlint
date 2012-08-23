'use strict';

var compact    = require('es5-ext/lib/Array/prototype/compact')
  , i          = require('es5-ext/lib/Function/i')
  , partial    = require('es5-ext/lib/Function/prototype/partial')
  , mapToArray = require('es5-ext/lib/Object/map-to-array')
  , callable   = require('es5-ext/lib/Object/valid-callable')
  , value      = require('es5-ext/lib/Object/valid-value')
  , numPad     = require('es5-ext/lib/Number/prototype/pad')
  , pad        = require('es5-ext/lib/String/prototype/pad')
  , memoize    = require('memoizee')
  , clc        = require('cli-color')
  , readFile   = require('next/lib/fs/read-file')
  , normalize  = require('./_normalize-source')

  , isArray = Array.isArray, ceil = Math.ceil
  , log = process.stdout.write.bind(process.stdout)
  , nextTick = process.nextTick
  , reportFile, isStatus

  , eolRe = /(?:\r\n|[\n\r\u2028\u2029])/
  , lname = clc.bold, lgray = clc.gray, lerr = clc.yellow, lok = clc.green
	, lopts, lstatOk = i, lstatFail = clc.bold.red, lstatErr = clc.red
  , lcount = clc.xterm(232), lline = clc.xterm(240);

lopts = function (options) {
	options = compact.call(mapToArray(options, function (name, value) {
		if (value == true) {
			return name;
		} else if (value === false) {
			return null;
		} else if (isArray(value)) {
			return value.join(', ');
		} else {
			return value;
		}
	}));
	return lgray('(' + (options.length ? options.join('|') : 'no options')  + ')');
};

reportFile = function (name, report) {
	var str = '', countPad, srcPad;
	isStatus = false;
	str += lname(name) + ' ' + lopts(report.options);
	if (report.length) {
		str += '\n';
		countPad = partial.call(pad, ' ', String(report.length).length);
		srcPad = partial.call(numPad, String(report.srcLines.length).length);
		report.forEach(function (data, index) {
			str += lcount(countPad.call(index + 1) + ':') + ' ' + lerr(data.message)
				+ '\n' + lline(srcPad.call(data.line) + ':')
				+ report.srcLines[data.line - 1] + '\n';
		});
	} else {
		str += ' ' + lok('OK') + '\n';
	}
	log(str + '\n');
};

module.exports = function (report, options) {
	var root, reports, process, promise, reportStatus;
	callable(report) && value(options);

	process = function (report, name) {
		if (report.length) {
			if (!report.src) {
				return readFile(event.path, { loose: true })(function (src) {
					report.src = normalize(String(src));
					return process(report, name);
				});
			} else {
				report.srcLines = report.src.split(eolRe);
				reportFile(name, report);
				reportStatus(reports);
			}
		}
		return report;
	};

	reportStatus = memoize(function () {
		nextTick(function () {
			var ok;
			reports.slice(reports.parsed).forEach(function (report) {
				if (report.length) {
					++reports.failed;
					reports.errors += report.length;
				}
			});
			reports.parsed = reports.length;
			ok = (reports.length - reports.failed);
			log(lstatOk(ok + ' OK ['
				+ ((ok / reports.length) * 100).toFixed(2)
				+ '%]') + '  ' + lstatFail(reports.failed + ' Failed') + ' '
				+ lstatErr('[' + reports.errors + ' Errors]') + '\n\n');
			isStatus = true;
			reportStatus.clear();
		});
	});

	root = report.root;
	if (options.progress) {
		reports = [];
		reports.parsed = 0;
		reports.errors = 0;
		reports.failed = 0;
		report.on('change', function (event) {
			reports.push(process(event.report, event.name));
		});
		promise = report(reports);
	} else {
		promise = report(function (data) {
			reports = mapToArray(data, process);
			reports.parsed = 0;
			reports.errors = 0;
			reports.failed = 0;
			return reports;
		});
	}
	return promise(function (data) {
		if (!data.length) {
			console.log("No files to process");
		}
	});
};
