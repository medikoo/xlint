'use strict';

var compact    = require('es5-ext/lib/Array/prototype/compact')
  , remove     = require('es5-ext/lib/Array/prototype/remove')
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

  , isArray = Array.isArray, now = Date.now
  , ceil = Math.ceil, floor = Math.floor, max = Math.max, min = Math.min
  , log = process.stdout.write.bind(process.stdout)
  , nextTick = process.nextTick
  , reportFile, isStatus

  , eolRe = /(?:\r\n|[\n\r\u2028\u2029])/

  , Reporter, InPlace, Cell, distColumns, areCellsComplete, lineFeed;

// Distributes reports per column e.g. [6, 6, 7] or [2, 3, 3]
distColumns = function (columns, length, max) {
	var base, rest, result, index;
	base = floor(length / columns);
	if (!base) {
		base = 1;
		rest = 0;
	} else if (base >= max) {
		base = max;
		rest = 0;
	} else {
		rest = length - base * columns;
	}

	result = [];

	while (columns--) {
		result.push(base);
	}
	if (rest) {
		index = result.length - 1;
		while (rest--) {
			result[index] = result[index] - 1;
			--index;
		}
	}
	return result;
};

areCellsComplete = function (cells) {
	return cells.every(function (cell) {
		return cell.report.length === cell.length;
	});
};

lineFeed = function (length, width) {
	return repeat.call(' ', width - length) + clc.move(-width, 1);
};

InPlace = function (reporter, width, height) {
	this.reporter = reporter;
	this.escape = this.reporter.emap.bar;
	this.totalWidth = width;
	this.totalHeight = height;
	this.pending = [];
	this.pending.remove = remove;
	this.errored = {};
};
InPlace.prototype = {
	init: function () {
		var updateMap = {}, waiting = [];

		// Reset
		log(clc.reset);

		// Status
		this.reporter.logStatus();

		// Bar
		log('\n' + this.reporter.emap.bar(repeat.call('-', this.totalWidth)));

		// Columns
		this.maxColumns = max(floor(this.totalWidth / 90), 1);
		this.columnHeight = this.totalHeight - 3;
		this.columnWidth = this.totalWidth;
		this.maxPerColumn = floor(this.columnHeight / 6);

		this.reporter.data.on('change', function (event) {
			var promise, time;
			time = updateMap[event.name] = now();
			if (event.report && event.report.length) {
				promise = this.reporter.normalize(event.report)(function (report) {
					if (time !== updateMap[event.name]) {
						// Race condition, abort
						return;
					}
					if (!report) {
						this.reporter.subtract(event.report);
						this.logStatus();
						if (this.errored[event.name]) {
							this.pending.remove(event.name);
							delete this.errored[event.name];
							this.logReports();
						}
					} else {
						if (!this.errored[event.name]) {
							this.pending.push(event.name);
						}
						this.errored[event.name] = event.report;
						this.logReports();
					}
				}.bind(this));
				if (!this.reporter.data.resolved) {
					waiting.push(promise);
				}
			} else if (this.errored[event.name]) {
				this.pending.remove(event.name);
				delete this.errored[event.name];
				this.logReports();
			}
			this.logStatus();
		}.bind(this));

		return deferred(this.reporter.data, deferred.map(waiting));
	},
	redraw: function () {
		var dist, columns, count, str, redrawAll, index;

		dist = distColumns(this.maxColumns, this.pending.length, this.maxPerColumn);
		columns = [];

		index = 0;
		this.pending.sort();
		dist.forEach(function (count) {
			var avg, cells, name, report, length;
			if (this.pending[index] == null) {
				return;
			}

			columns.push(cells = []);
			avg = floor((floor(this.columnHeight / count) - 4) / 2);
			while (count-- && (this.pending[index] != null)) {
				name = this.pending[index++];
				report = this.errored[name];
				length = min(avg, report.length);
				cells.push({ name: name, report: report, length: length,
					height: 2 + length * 2 + ((report.length > length) ? 2 : 1) });
			}
		}, this);

		columns.forEach(function (cells, index) {
			var height, diff, cell, column;
			height = cells.reduce(function (sum, cell) {
				return sum + cell.height;
			}, 0);

			diff = this.columnHeight - height;
			while ((diff > 1) && !areCellsComplete(cells)) {
				cells.some(function (cell) {
					if (cell.report.length > cell.length) {
						++cell.length;
						if (cell.report.length === cell.length) {
							++cell.height;
							--diff;
						} else {
							cell.height += 2;
							diff -= 2;
						}
						if (diff < 2) {
							return true;
						}
					}
				});
			}

			++index;
			while ((diff > 3) && columns[index]) {
				while (columns[index] && (columns[index][0].height < diff)) {
					cell = columns[index].shift();
					if (!columns[index].length) {
						columns.splice(index, 1);
					}
					cells.push(cell);
					diff -= cell.height;
					while ((diff > 1) && (cell.report.length > cell.length)) {
						++cell.length;
						if (cell.report.length === cell.length) {
							++cell.height;
							--diff;
						} else {
							cell.height += 2;
							diff -= 2;
						}
					}
				}
			}
		}, this);

		if (!this.current || (this.current.length !== columns.length)) {
			redrawAll = true;
			this.columnWidth = floor(this.totalWidth / columns.length);
			if (columns.length > 1) {
				// Draw columns
				for (count = 1; count < columns.length; ++count) {
					log(clc.set(count * this.columnWidth - 1, 3));
					log(this.escape(' ') + repeat.call(clc.move(-1, 1) + this.escape(' '),
						this.columnHeight - 1));
				}
			}
		}

		columns.forEach(function (column, index) {
			var top = 0, prevTop = 0
			  , prevColumn = this.current && this.current[index]
			  , width = ((columns.length - 1) === index) ?
					(this.totalWidth - this.columnWidth * index) : (this.columnWidth - 1)
			  , left = this.columnWidth * index;
			column.forEach(function (cell, index) {
				var previous = prevColumn && prevColumn[index];
				if (redrawAll || !previous || (previous.report !== cell.report) ||
						(previous.height !== cell.height) || (top !== prevTop)) {
					// Draw report
					this.reporter.logFile(cell.name, cell.report, cell.length,
						{ width: width, top: top + 3, left: left });
				}
				top += cell.height;
				prevTop += cell.height;
			}, this);
		}, this);
	},
	logReports: memoize(function () {
		nextTick(function () {
			this.logReports.clear();
			this.redraw();
			log(clc.set(0, this.totalHeight));
		}.bind(this));
	}, { method: 'logReports' }),
	logStatus: memoize(function () {
		nextTick(function () {
			this.logStatus.clear();
			log(clc.set(0, 0));
			this.reporter.logStatus();
			log(clc.set(0, this.totalHeight));
		}.bind(this));
	}, { method: 'logStatus' })
};

Reporter = function () {};
Reporter.prototype = {
	parsed: 0,
	failed: 0,
	errors: 0,
	all: 0,
	init: function (data, options) {
		this.data = data;
		this.options = options;
		if (options.watch) {
			return this.initWatch();
		} else if (options.progress) {
			return this.initProgress();
		} else {
			return this.initDirect()
		}
	},
	initWatch: function () {
		var columns, width, height, reports;

		width = clc.width;
		height = clc.height;
		if ((width < 10) || (height < 10)) {
			return this.initProgress();
		}

		this.reports = {};
		this.data.on('change', function (event) {
			if (event.type === 'remove') {
				this.subtract(this.reports[event.name]);
				delete this.reports[event.name];
				return;
			} else if (event.type === 'update') {
				this.subtract(this.reports[event.name]);
			}
			this.add(this.reports[event.name] = event.report);
		}.bind(this));
		this.inPlace = new InPlace(this, width, height);
		return this.inPlace.init();
	},
	initProgress: function () {
		var waiting, status, isStatus, clearStatus, reports = {};
		waiting = [];
		status = memoize(function () {  nextTick(function () {
			status.clear();
			clearStatus();
			this.logStatus();
			log('\n');
			isStatus = true;
		}.bind(this)); }.bind(this));

		clearStatus = function () {
			if (isStatus) {
				log(clc.bol(-2, true));
				isStatus = false;
			}
		};

		this.data.on('change', function (event) {
			if (event.type === 'remove') {
				this.subtract(reports[event.name]);
				delete reports[event.name];
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
		return this.data(function () {
			return deferred.map(waiting);
		}.bind(this));
	},
	initDirect: function () {
		return this.data(function (data) {
			return deferred.map(mapToArray(data, function (report, name) {
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
			log('\n');
		}.bind(this));
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
			messageOK: clc.green,
			moreErr: clc.gray.bold
		},
		status: {
			OK: clc.green.bold,
			OKPerc: clc.green,
			failed: clc.bold.red,
			errors: clc.red
		},
		bar: clc.bgXterm(240).xterm(247)
	},
	logOptions: function (options) {
		options = compact.call(mapToArray(options, function (value, name) {
			if (value === true) {
				return name;
			} else if (value === false) {
				return null;
			} else {
				return name + '=' + value;
			}
		}));
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
	logFile: function (name, report, limit, pos) {
		var emap = this.emap.report, str = '', options
		  , rlnLength, slnLength, countPad, srcPad, indent, width, moreErrMsg;
		if (pos) {
			log(clc.set(pos.left, pos.top));
			width = pos.width;
		}
		if (name) {
			if (pos && (name.length > width)) {
				name = '…' + name.slice(-(width - 1));
			}
			str += emap.name(name)
				+ (pos ? lineFeed(name.length, width) : '\n');
		}
		options = this.logOptions(report.options);
		if (pos && (options.length > width)) {
			options = options.slice(0, width - 1) + '…';
		}
		str += emap.options(options)
			+ (pos ? lineFeed(options.length, width) : '\n');

		if (report.length) {
			rlnLength = String(report.length).length;
			slnLength = max(String(report.srcLines.length).length, rlnLength + 1);
			countPad = partial.call(pad, ' ', rlnLength);
			srcPad = partial.call(numPad, slnLength);
			indent = repeat.call(' ', isNaN(report.options.indent) ? 4 :
				max(min(Number(report.options.indent), 16), 1));

			(limit ? report.slice(0, limit) : report).forEach(function (data, index) {
				var line = report.srcLines[data.line - 1].replace(/\t/g, indent)
				  , at = data.character - 1, start
				  , message = data.message;

				if (pos) {
					if ((message.length + 2 + rlnLength) > width) {
						message = message.slice(0, width - 2 - rlnLength - 1) + '…';
					}
					if ((line.length + 1 + slnLength) > width) {
						if (at > (width - 5 - slnLength)) {
							if ((at + ((width - 1 - slnLength) / 2)) > line.length) {
								at -= line.length - (width - 1 - slnLength);
								line = '…' + line.slice(-(width - 2 - slnLength));
							} else {
								start = at - floor((width - slnLength + 1) / 2);
								at -= (start + 1);
								line = '…' + line.slice(start, start + width - 2 - slnLength)
									+ '…';
							}
						} else {
							line = line.slice(0, width - 1 - slnLength - 1) + '…';
						}
					}
				}

				str += emap.count('#' + countPad.call(index + 1)) + ' '
					+ emap.messageErr(message)
					+ (pos ? lineFeed(rlnLength + 2 + message.length, width) : '\n')
					+ emap.lineNum(srcPad.call(data.line)) + ' '
					+ emap.code(line.slice(0, at)) + emap.at(line[at])
					+ emap.code(line.slice(at + 1))
					+ (pos ? lineFeed(slnLength + 1 + line.length, width) : '\n');
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
		log(str);
	},
	logStatus: function () {
		var str = '', ok, emap = this.emap.status;
		if (this.single) {
			if (this.failed) {
				str += emap.failed(this.errors + ' Errors');
			} else {
				str += emap.OK("All OK\n\n");
			}
		} else {
			ok = (this.all - this.failed);
			str += emap.OK(ok + ' OK') + ' ' + emap.OKPerc('['
				+ ((this.all ? (ok / this.all) : 0) * 100).toFixed(2) + '%]')
				+ '  ' + emap.failed(this.failed + ' Failed') + ' '
				+ emap.errors('[' + this.errors + ' Errors]');
		}
		log(str + '\n');
	}
};

module.exports = function (report, options) {
	var reporter;
	callable(report) && value(options);

	reporter = new Reporter();
	return reporter.init(report, options);
};
