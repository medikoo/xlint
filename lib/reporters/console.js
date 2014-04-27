'use strict';

var compact       = require('es5-ext/array/#/compact')
  , identity      = require('es5-ext/function/identity')
  , partial       = require('es5-ext/function/#/partial')
  , isPlainObject = require('es5-ext/object/is-plain-object')
  , map           = require('es5-ext/object/map')
  , toArray       = require('es5-ext/object/to-array')
  , some          = require('es5-ext/object/some')
  , numPad        = require('es5-ext/number/#/pad')
  , pad           = require('es5-ext/string/#/pad')
  , repeat        = require('es5-ext/string/#/repeat')
  , deferred      = require('deferred')
  , clc           = require('cli-color')
  , readFile      = require('fs2/read-file')
  , normalize     = require('../_normalize-source')

  , floor = Math.floor, max = Math.max, min = Math.min
  , log = process.stdout.write.bind(process.stdout)

  , eolRe = /(?:\r\n|[\n\r\u2028\u2029])/

  , Reporter, lineFeed;

lineFeed = function (length, width) {
	return repeat.call(' ', max(width - length, 0)) + clc.move(-width, 1);
};

Reporter = function (data, options) {
	this.data = data;
	this.options = options;
	this.log = options.log || log;
	if (!this.options.color) {
		this.emap = map(this.emap, function self(value) {
			if (isPlainObject(value)) return map(value, self);
			return identity;
		});
	}
};
Reporter.prototype = {
	parsed: 0,
	failed: 0,
	errors: 0,
	all: 0,
	emap: {
		report: {
			name: clc.bold,
			options: clc.xterm(239),

			count: clc.xterm(232),
			messageErr: clc.yellow,
			lineNum: clc.xterm(240),
			code: clc.xterm(250),
			at: clc.xterm(250).bgXterm(235),
			messageOK: clc.green,
			moreErr: clc.blackBright.bold
		},
		status: {
			OK: clc.green.bold,
			OKPerc: clc.green,
			failed: clc.bold.red,
			errors: clc.red
		},
		bar: clc.bgXterm(240).xterm(247)
	},
	init: function () {
		return this.data(function (data) {
			return deferred.map(toArray(data, function (report, name) {
				this.add(report);
				if (report.length) {
					return this.normalize(report)(function (nreport) {
						if (!nreport) {
							this.subtract(report);
							return;
						}
						this.logFile(name, nreport);
					}.bind(this));
				}
			}, this));
		}.bind(this))(function () {
			this.logStatus();
			this.log('\n');
		}.bind(this))(this.data);
	},
	logOptions: function (options) {
		options = compact.call(toArray(options, function (value, name) {
			if (isPlainObject(value)) return name + ': ' + this.logOptions(value);
			if (value === true) return name;
			if (value === false) return null;
			return name + '=' + value;
		}, this)).sort();
		return options.length ? options.join(' ') : 'no options';
	},
	add: function (report) {
		++this.all;
		if (report.length) {
			++this.failed;
			this.errors += report.length;
		}
	},
	subtract: function (report) {
		--this.all;
		if (report.length) {
			--this.failed;
			this.errors -= report.length;
		}
	},
	normalize: function (report) {
		if (report.length) {
			if (report.src == null) {
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
			}
			report.srcLines = report.src.split(eolRe);
		}
		return deferred(report);
	},
	logFile: function (name, report, limit, pos) {
		var emap = this.emap.report, str = '', options
		  , rlnLength, slnLength, countPad, srcPad, indent, width, moreErrMsg;
		if (pos) {
			this.log(clc.moveTo(pos.left, pos.top));
			width = pos.width;
		}
		if (name && (name !== '.')) {
			if (pos && (name.length > width)) {
				name = '…' + name.slice(-(width - 1));
			}
			str += emap.name(name) +
				(pos ? lineFeed(name.length, width) : '\n');
		}
		options = this.logOptions(report.options);
		if (pos && (options.length > width)) {
			options = options.slice(0, width - 1) + '…';
		}
		str += emap.options(options) +
			(pos ? lineFeed(options.length, width) : '\n');

		if (report.length) {
			rlnLength = String(report.length).length;
			slnLength = max(String(report.srcLines.length).length, rlnLength + 1);
			countPad = partial.call(pad, ' ', rlnLength);
			srcPad = partial.call(numPad, slnLength);
			if (isNaN(report.options.indent)) {
				some(report.options, function (value, name) {
					if (value && !isNaN(value.indent)) {
						indent = value.indent;
						return true;
					}
				});
				if (!indent) indent = 4;
			} else {
				indent = report.options.indent;
			}
			indent = repeat.call(' ', max(min(Number(indent), 16), 1));

			(limit ? report.slice(0, limit) : report).forEach(function (data, index) {
				var line, at, start, message, src;
				if (data.line) {
					line = (report.srcLines[data.line - 1] == null) ? null :
							report.srcLines[data.line - 1].replace(/\t/g, indent);
				} else {
					line = null;
				}
				at = data.character ? data.character - 1 : null;
				message = data.message;

				if (pos) {
					if ((message.length + 2 + rlnLength) > width) {
						message = message.slice(0, width - 2 - rlnLength - 1) + '…';
					}
					if (line && ((line.length + 1 + slnLength) > width)) {
						if (at > (width - 5 - slnLength)) {
							if ((at + ((width - 1 - slnLength) / 2)) > line.length) {
								at -= line.length - (width - 1 - slnLength);
								line = '…' + line.slice(-(width - 2 - slnLength));
							} else {
								start = at - floor((width - slnLength + 1) / 2);
								at -= (start + 1);
								line = '…' + line.slice(start, start + width - 2 - slnLength) +
									'…';
							}
						} else {
							line = line.slice(0, width - 1 - slnLength - 1) + '…';
						}
					}
				}

				if (line) {
					src = emap.lineNum(srcPad.call(data.line)) + ' ' +
							emap.code(line.slice(0, at)) + emap.at(line[at]) +
							emap.code(line.slice(at + 1)) +
						(pos ? lineFeed(slnLength + 1 + line.length, width) : '\n');
				} else {
					src = emap.lineNum(data.line || '--') +
							(pos ? lineFeed(2, width) : '\n');
				}
				str += emap.count('#' + countPad.call(index + 1)) + ' ' +
					emap.messageErr(message) +
					(pos ? lineFeed(rlnLength + 2 + message.length, width) : '\n') +
					src;
			});
			if (limit && (report.length > limit)) {
				moreErrMsg = '... and ' + (report.length - limit) + ' more errors';
				str += emap.moreErr(moreErrMsg) +
					(pos ? lineFeed(moreErrMsg.length, width) : '\n');
			}
		} else {
			str += emap.messageOK('OK') + (pos ? lineFeed(2, width) : '\n');
		}
		str += (pos ? lineFeed(0, width) : '\n');
		this.log(str);
	},
	logStatus: function (width) {
		var str = '', ok, emap = this.emap.status;
		if (this.single) {
			if (this.failed) {
				str += emap.failed(this.errors + ' Errors');
			} else {
				str += emap.OK("All OK\n\n");
			}
		} else {
			ok = (this.all - this.failed);
			str += emap.OK(ok + ' OK') + ' ' + emap.OKPerc('[' +
				((this.all ? (ok / this.all) : 0) * 100).toFixed(2) + '%]') +
				'  ' + emap.failed(this.failed + ' Failed') + ' ' +
				emap.errors('[' + this.errors + ' Errors]');
		}
		this.log(str + (width ? lineFeed(str.length, width) : '\n'));
	}
};

module.exports = exports = function (report/*, options*/) {
	deferred.validPromise(report);
	return (new Reporter(report, Object(arguments[1]))).init();
};
exports.returnsPromise = true;
exports.Reporter = Reporter;
