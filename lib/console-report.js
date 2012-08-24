'use strict';

var compact    = require('es5-ext/lib/Array/prototype/compact')
  , i          = require('es5-ext/lib/Function/i')
  , partial    = require('es5-ext/lib/Function/prototype/partial')
  , mapToArray = require('es5-ext/lib/Object/map-to-array')
  , callable   = require('es5-ext/lib/Object/valid-callable')
  , value      = require('es5-ext/lib/Object/valid-value')
  , numPad     = require('es5-ext/lib/Number/prototype/pad')
  , pad        = require('es5-ext/lib/String/prototype/pad')
  , repeat     = require('es5-ext/lib/String/prototype/repeat')
  , memoize    = require('memoizee')
  , deferred   = require('deferred')
  , clc        = require('cli-color')
  , readFile   = require('next/lib/fs/read-file')
  , normalize  = require('./_normalize-source')

  , isArray = Array.isArray
  , ceil = Math.ceil, max = Math.max, min = Math.min
  , log = process.stdout.write.bind(process.stdout)
  , nextTick = process.nextTick
  , reportFile, isStatus

  , eolRe = /(?:\r\n|[\n\r\u2028\u2029])/

  , Reporter;

Reporter = function () {};
Reporter.prototype = {
	parsed: 0,
	failed: 0,
	errors: 0,
	all: 0,
	init: function (data, options) {
		var waiting, status, isStatus;
		if (options.progress) {
			waiting = [];
			status = memoize(function () {  nextTick(function () {
				status.clear();
				this.status();
				isStatus = true;
			}.bind(this)); }.bind(this));

			data.on('change', function (event) {
				this.calc(event.report);
				if (event.report.length) {
					waiting.push(this.normalize(event.report)(function (report) {
						if (report) {
							if (isStatus) {
								log(clc.bol(-3, true));
								isStatus = false;
							}
							this.file(event.name, report);
							status();
						}
					}.bind(this)));
				}
			}.bind(this));
			return data(function () {
				return deferred.map(waiting);
			}.bind(this));
		} else {
			return data(function (data) {
				return deferred.map(mapToArray(data, function (report, name) {
					this.calc(report);
					if (report.length) {
						return this.normalize(report)(function (report) {
							if (report) {
								this.file(name, report);
							}
						}.bind(this));
					}
				}, this));
			}.bind(this))(this.status.bind(this));
		}
	},
	emap: {
		report: {
			name: clc.bold,
			options: clc.xterm(239),

			count: clc.xterm(232),
			messageErr: clc.yellow,
			lineNum: clc.xterm(240),
			code: clc.xterm(250),
			at: clc.xterm(250).bgXterm(235),
			messageOK: clc.green
		},
		status: {
			OK: i,
			failed: clc.bold.red,
			errors: clc.red
		}
	},
	options: function (options) {
		var escape = this.emap.report.options;
		options = compact.call(mapToArray(options, function (value, name) {
			if (value === true) {
				return name;
			} else if (value === false) {
				return null;
			} else {
				return name + '=' + value;
			}
		}));
		return escape(options.length ? options.join(' ') : 'no options');
	},
	calc: function (report) {
		++this.all;
		if (report.length) {
			++this.failed;
			this.errors += report.length;
		}
	},
	directOutput: function (report, name) {
		this.calc(report);
		return this.normalize(report)(function (report) {
			if (report) {
				this.file(name, report);
			}
		}.bind(this));
	},
	normalize: function (report) {
		if (report.length) {
			if (!report.src) {
				return readFile(report.path)(function (src) {
					report.src = normalize(String(src));
					return this.normalize(report);
				}.bind(this), function (err) {
					if (!err.code || (err.code === 'EMFILE')) {
						return err;
					}
					--this.all;
					if (report.length) {
						--this.failed;
						this.errors -= report.length;
					}
				}.bind(this));
			} else {
				report.srcLines = report.src.split(eolRe);
			}
		}
		return deferred(report);
	},
	file: function (name, report) {
		var emap = this.emap.report, str = '', countPad, srcPad, indent;
		str += (name ? (emap.name(name) + '\n') : '') + this.options(report.options);
		if (report.length) {
			str += '\n';
			countPad = partial.call(pad, ' ', String(report.length).length);
			srcPad = partial.call(numPad, max(String(report.srcLines.length).length,
				String(report.length).length + 1));
			indent = repeat.call(' ', isNaN(report.options.indent) ? 4 :
				max(min(Number(report.options.indent), 16), 1));

			report.forEach(function (data, index) {
				var line = report.srcLines[data.line - 1].replace(/\t/g, indent)
				  , at = data.character - 1;

				str += emap.count('#' + countPad.call(index + 1)) + ' '
					+ emap.messageErr(data.message) + '\n'
					+ emap.lineNum(srcPad.call(data.line)) + ' '
					+ emap.code(line.slice(0, at)) + emap.at(line[at])
					+ emap.code(line.slice(at + 1)) + '\n';
			});
		} else {
			str += ' ' + emap.messageOK('OK') + '\n';
		}
		log(str + '\n');
	},
	status: function () {
		var str = '\n', ok, emap = this.emap.status;
		if (this.single) {
			if (this.failed) {
				str += emap.failed(this.errors + ' Errors');
			} else {
				str += emap.OK("All OK\n\n");
			}
		} else {
			ok = (this.all - this.failed);
			str += emap.OK(ok + ' OK [' + ((ok / this.all) * 100).toFixed(2) + '%]')
				+ '  ' + emap.failed(this.failed + ' Failed') + ' '
				+ emap.errors('[' + this.errors + ' Errors]');
		}
		log(str + '\n\n');
	}
};

module.exports = function (report, options) {
	var reporter;
	callable(report) && value(options);

	reporter = new Reporter();
	return reporter.init(report, options);
};
