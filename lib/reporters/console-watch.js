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
  , log = process.stdout.write.bind(process.stdout)

  , Reporter, distColumns, areCellsComplete;

// Distributes reports per column e.g. [6, 6, 7], [2, 3, 3, 3]
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

Reporter = function () {
	Base.apply(this, arguments);

	this.totalWidth = clc.width;
	this.totalHeight = clc.height;
	this.pending = [];
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
		this.log(clc.set(0, 2) + this.emap.bar(repeat.call('-', this.totalWidth)));

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
			if (this.options.progress) {
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
					this.log(clc.set(count * this.columnWidth - 1, 3));
					this.log(this.emap.bar(' ') + repeat.call(clc.move(-1, 1)
						+ this.emap.bar(' '), this.columnHeight - 1));
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
					this.logFile(cell.name, cell.report, cell.length,
						{ width: width, top: top + 3, left: left });
				}
				top += cell.height;
				prevTop += cell.height;
			}, this);
		}, this);
	}),
	logReports: d(memoize(function () {
		nextTick(function () {
			this.logReports.clear();
			this.redraw();
			this.log(clc.set(0, this.totalHeight));
		}.bind(this));
	}, { method: 'logReports' })),
	logStatus: d(memoize(function () {
		nextTick(function () {
			this.logStatus.clear();
			this.log(clc.set(0, 0));
			Base.prototype.logStatus.call(this);
			this.log(clc.set(0, this.totalHeight));
		}.bind(this));
	}, { method: 'logStatus' }))
});

module.exports = exports = function (report/*, options*/) {
	deferred.validPromise(report);
	return (new Reporter(report, Object(arguments[1]))).init();
};
exports.returnsPromise = true;
exports.Reporter = Reporter;
