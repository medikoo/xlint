'use strict';

var remove   = require('es5-ext/lib/Array/prototype/remove')
  , d        = require('es5-ext/lib/Object/descriptor')
  , repeat   = require('es5-ext/lib/String/prototype/repeat')
  , memoize  = require('memoizee')
  , deferred = require('deferred')
  , clc      = require('cli-color')
  , Base     = require('./console').Reporter

  , floor = Math.floor, max = Math.max, min = Math.min
  , now = Date.now
  , nextTick = process.nextTick

  , Reporter, distColumns, areReportsFullyExposed;

// Distributes reports per column e.g. [6, 6, 7], [2, 3, 3, 3]
distColumns = function (maxColumns, length, maxReports) {
	var base, rest, result, index;
	result = [];

	base = floor(length / maxColumns);

	if (!base) {
		while (length--) {
			result.push(1);
		}
		return result;
	} else if (base >= maxReports) {
		base = maxReports;
		rest = 0;
	} else {
		rest = length - base * maxColumns;
	}

	while (maxColumns--) {
		result.push(base);
	}
	if (rest) {
		index = result.length - 1;
		while (rest--) {
			result[index] = result[index] + 1;
			--index;
		}
	}
	return result;
};

areReportsFullyExposed = function (cells) {
	return cells.every(function (cell) {
		return cell.report.length === cell.length;
	});
};

Reporter = function () {
	Base.apply(this, arguments);

	this.totalWidth = clc.width;
	this.totalHeight = clc.height;
	this.pending = [];
	this.current = [];
	this.pending.remove = remove;
	this.errored = {};
};
Reporter.prototype = Object.create(Base.prototype, {
	init: d(function () {
		var reports = {}, updateMap = {}, waiting = [];

		this.data.on('change', function (event) {
			if (event.type === 'remove') {
				this.subtract(reports[event.name]);
				delete reports[event.name];
				return;
			} else if (event.type === 'update') {
				this.subtract(reports[event.name]);
			}
			this.add(reports[event.name] = event.report);
		}.bind(this));

		// Reset
		this.log(clc.reset);

		// Bar
		this.log(clc.moveTo(0, 2) +
			this.emap.bar(repeat.call('-', this.totalWidth)));

		// Status
		this.logStatus();

		// Columns
		this.maxColumns = max(floor(this.totalWidth / 90), 1);
		this.columnHeight = this.totalHeight - 3;
		this.maxPerColumn = floor(this.columnHeight / 6);

		this.data.on('change', function (event) {
			var promise, time;
			time = updateMap[event.name] = now();
			if (event.report && event.report.length) {
				promise = this.normalize(event.report)(function (report) {
					if (time !== updateMap[event.name]) {
						// Race condition, abort
						return;
					}
					if (!report) {
						this.subtract(event.report);
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
				if (!this.data.resolved) {
					waiting.push(promise);
				}
			} else if (this.errored[event.name]) {
				this.pending.remove(event.name);
				delete this.errored[event.name];
				this.logReports();
			}
			this.logStatus();
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
							this.logReports();
						}.bind(this));
					}
					this.logStatus();
				}.bind(this));
			}
		}.bind(this))(this.data);
	}),
	redraw: d(function () {
		var dist, columns, count, redrawAll, index, top, cls;

		if (!this.pending.length) {
			// No reports
			if (this.current.length) {
				// Clear screen
				top = 0;
				cls = repeat.call(' ', this.totalWidth);
				while (top < this.columnHeight) {
					this.log(clc.moveTo(0, top++ + 3) + cls);
				}
			}
			this.current = [];
			return;
		}

		// Calculate general distribution, e.g. [5, 5, 6]
		dist = distColumns(this.maxColumns, this.pending.length, this.maxPerColumn);
		columns = [];

		index = 0;
		this.pending.sort();

		// Distribute reports
		dist.forEach(function (count) {
			var avgErrCount, cells, name, report, length;
			if (this.pending[index] == null) {
				return;
			}

			columns.push(cells = []);
			avgErrCount = floor((floor(this.columnHeight / count) - 4) / 2);
			while (count-- && (this.pending[index] != null)) {
				name = this.pending[index++];
				report = this.errored[name];
				length = min(avgErrCount, report.length);
				cells.push({ name: name, report: report, length: length,
					height: 2 + length * 2 + ((report.length > length) ? 2 : 1) });
			}
		}, this);

		// Improve distribution within columns
		columns.forEach(function (cells, index) {
			var height, diff, cell, expand;
			height = cells.reduce(function (sum, cell) {
				return sum + cell.height;
			}, 0);

			diff = this.columnHeight - height;

			expand = function (cell) {
				if (cell.report.length > cell.length) {
					++cell.length;
					if (cell.report.length === cell.length) {
						++cell.height;
						--diff;
					} else {
						cell.height += 2;
						diff -= 2;
					}
				}
				return (diff < 2);
			};
			// Expand reports there's space left and they're not fully exposed
			while ((diff > 1) && !areReportsFullyExposed(cells)) cells.some(expand);

			// Move reports from next column to this one if that makes sense
			++index;
			while (columns[index] && (columns[index][0].height < diff)) {
				// Move cell
				cell = columns[index].shift();
				if (!columns[index].length) {
					// No more reports in next column, remove it
					// It doesn't affect forEach loop as we're removing next column
					columns.splice(index, 1);
				}
				cells.push(cell);
				diff -= cell.height;
				while ((diff > 1) && (cell.report.length > cell.length)) {
					// Expand not fully exposed report
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
		}, this);

		// Draw reports
		if (this.current.length !== columns.length) {
			// First draw or number of columns have changed
			// Need to redraw whole screen
			redrawAll = true;
			this.columnWidth = floor(this.totalWidth / columns.length);
			if (columns.length > 1) {
				// Draw column bars
				for (count = 1; count < columns.length; ++count) {
					this.log(clc.moveTo(count * this.columnWidth - 1, 3));
					this.log(this.emap.bar(' ') + repeat.call(clc.move(-1, 1) +
						this.emap.bar(' '), this.columnHeight - 1));
				}
			}
		}

		columns.forEach(function (column, index) {
			var top = 0, prevTop = 0
			  , prevColumn = this.current[index]
			  , width = ((columns.length - 1) === index) ?
					(this.totalWidth - this.columnWidth * index - 1) :
					(this.columnWidth - 1)
			  , left = this.columnWidth * index;
			column.forEach(function (cell, index) {
				var previous = prevColumn && prevColumn[index];
				if (redrawAll || !previous || (previous.report !== cell.report) ||
						(previous.height !== cell.height) || (top !== prevTop)) {
					// Draw report
					this.logFile(cell.name, cell.report, cell.length,
						{ width: width, top: top + 3, left: left });
				}
				top += cell.height;
				prevTop += previous ? previous.height : 0;
			}, this);
			while (top < this.columnHeight) {
				this.log(clc.moveTo(left, top++ + 3) + repeat.call(' ', width));
			}
		}, this);
		this.current = columns;
	}),
	logReports: d(memoize(function () {
		nextTick(function () {
			this.logReports.clear();
			this.redraw();
			this.log(clc.moveTo(0, this.totalHeight));
		}.bind(this));
	}, { method: 'logReports' })),
	logStatus: d(memoize(function () {
		nextTick(function () {
			this.logStatus.clear();
			this.log(clc.moveTo(0, 0));
			Base.prototype.logStatus.call(this, this.totalWidth);
			this.log(clc.moveTo(0, this.totalHeight));
		}.bind(this));
	}, { method: 'logStatus' }))
});

module.exports = exports = function (report/*, options*/) {
	deferred.validPromise(report);
	return (new Reporter(report, Object(arguments[1]))).init();
};
exports.returnsPromise = true;
exports.Reporter = Reporter;
