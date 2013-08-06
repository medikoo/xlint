'use strict';

var deferred = require('deferred');

module.exports = function (t, a) {
	var r11, r12, r13, r21, r22, r1, r2, r, e, event, result, result2;
	r11 = [{ message: 'Report 11', line: 1, character: 1 },
		{ message: 'Report 12', line: 1, character: 3 },
		{ message: 'Report 13', line: 2, character: 3 }];
	r11.src = 'File 1';
	r11.path = '/File 1';
	r11.options = { raz: true, dwa: ['raz'] };

	r21 = [{ message: 'Report 21', line: 1, character: 2 },
		{ message: 'Report 22', line: 1, character: 3 },
		{ message: 'Report 23', line: 3, character: 3 }];
	r21.src = 'File 1';
	r21.path = '/File 1';
	r21.options = { trzy: true, dwa: ['raz'] };

	r22 = [{ message: 'File other', line: 1, character: 2 },
		{ message: 'Report 22', line: 1, character: 3 },
		{ message: 'Report 23', line: 3, character: 3 }];
	r22.src = 'File 2';
	r22.path = '/File 2';
	r22.options = { trzy: true, dwa: ['raz'] };

	r1 = deferred({ file1: r11 });
	r1.xlintId = 'FIRST';
	r2 = deferred({ file1: r21, file2: r22 });
	r2.xlintId = 'SECOND';

	r = t([r1, r2], { watch: true });
	result = [{ message: 'Report 11', line: 1, character: 1 },
		{ message: 'Report 21', line: 1, character: 2 },
		{ message: 'Report 12', line: 1, character: 3 },
		{ message: 'Report 13', line: 2, character: 3 },
		{ message: 'Report 23', line: 3, character: 3 }];
	r.done(function (r) {
		a.deep(Object.keys(r).sort(), ['file1', 'file2'], "Report #1 names");
		a(r.file1.length, result.length, "Report #1 length");
		a(r.file1.src, 'File 1', "Report #1 src");
		a(r.file1.path, '/File 1', "Report #1 path");
		a.deep(r.file1.options, { FIRST: r11.options, SECOND: r21.options },
			"Report #1 options");
		r.file1.forEach(function (error, index) {
			a.deep(error, result[index], "#1." + index);
		});
		a(r.file2, r.file2, "Report #2");
	});

	r.on('change', function (event) { e = event; });

	r11.pop();
	r1.emit('change', { name: 'file1', type: 'update',
		report: r11 });
	result = [{ message: 'Report 11', line: 1, character: 1 },
		{ message: 'Report 21', line: 1, character: 2 },
		{ message: 'Report 12', line: 1, character: 3 },
		{ message: 'Report 23', line: 3, character: 3 }];
	a(e.name, 'file1', "Remove error: Event: name");
	a(e.type, 'update', "Remove error: Event: update");
	a(e.report.length, result.length, "Remove error: Event: Report length");
	e.report.forEach(function (error, index) {
		a.deep(error, result[index], "Remove error: Event: Report: #" + index);
	});
	e = null;
	r.done(function (r) {
		a.deep(Object.keys(r).sort(), ['file1', 'file2'],
			"Remove error: Report #1 names");
		a(r.file1.length, result.length, "Remove error: Report #1 length");
		a(r.file1.src, 'File 1', "Remove error: Report #1 src");
		a(r.file1.path, '/File 1', "Remove error: Report #1 path");
		a.deep(r.file1.options, { FIRST: r11.options, SECOND: r21.options },
			"Remove error: Report #1 options");
		r.file1.forEach(function (error, index) {
			a.deep(error, result[index], "Remove error: Report #1." + index);
		});
		a(r.file2, r.file2, "Remove error: Report #2");
	});

	r21[1].character = 4;
	r2.emit('change', { name: 'file1', type: 'update',
		report: r21 });
	result = [{ message: 'Report 11', line: 1, character: 1 },
		{ message: 'Report 21', line: 1, character: 2 },
		{ message: 'Report 12', line: 1, character: 3 },
		{ message: 'Report 22', line: 1, character: 4 },
		{ message: 'Report 23', line: 3, character: 3 }];
	a(e.name, 'file1', "Misalign error: Event: name");
	a(e.type, 'update', "Misalign error: Event: update");
	a(e.report.length, result.length, "Misalign error: Event: Report length");
	e.report.forEach(function (error, index) {
		a.deep(error, result[index], "Misalign error: Event: Report: #" + index);
	});
	e = null;
	r.done(function (r) {
		a.deep(Object.keys(r).sort(), ['file1', 'file2'],
			"Misalign error: Report #1 names");
		a(r.file1.length, result.length, "Misalign error: Report #1 length");
		a(r.file1.src, 'File 1', "Misalign error: Report #1 src");
		a(r.file1.path, '/File 1', "Misalign error: Report #1 path");
		a.deep(r.file1.options, { FIRST: r11.options, SECOND: r21.options },
			"Misalign error: Report #1 options");
		r.file1.forEach(function (error, index) {
			a.deep(error, result[index], "Misalign error: Report #1." + index);
		});
		a(r.file2, r.file2, "Misalign error: Report #2");
	});

	r12 = [{ message: 'File other2', line: 1, character: 2 },
		{ message: 'Report 12', line: 1, character: 3 },
		{ message: 'Report 13', line: 5, character: 3 }];
	r12.src = 'File 2';
	r12.path = '/File 2';
	r12.options = { foo: true, dwa: ['raz'] };
	r1.emit('change', { name: 'file2', type: 'add',
		report: r12 });
	result2 = [{ message: 'File other2', line: 1, character: 2 },
		{ message: 'Report 12', line: 1, character: 3 },
		{ message: 'Report 23', line: 3, character: 3 },
		{ message: 'Report 13', line: 5, character: 3 }];
	a(e.name, 'file2', "Add existing: Event: name");
	a(e.type, 'update', "Add existing: Event: update");
	a(e.report.length, result2.length, "Add existing: Event: Report length");
	e.report.forEach(function (error, index) {
		a.deep(error, result2[index], "Add existing: Event: Report: #" + index);
	});
	e = null;
	r.done(function (r) {
		a.deep(Object.keys(r).sort(), ['file1', 'file2'],
			"Add existing: Report #1 names");
		a(r.file1.length, result.length, "Add existing: Report #1 length");
		a(r.file1.src, 'File 1', "Add existing: Report #1 src");
		a(r.file1.path, '/File 1', "Add existing: Report #1 path");
		a.deep(r.file1.options, { FIRST: r11.options, SECOND: r21.options },
			"Add existing: Report #1 options");
		r.file1.forEach(function (error, index) {
			a.deep(error, result[index], "Add existing: Report #1." + index);
		});
		a(r.file2.length, result2.length, "Add existing: Report #2 length");
		a(r.file2.src, 'File 2', "Add existing: Report #2 src");
		a(r.file2.path, '/File 2', "Add existing: Report #2 path");
		a.deep(r.file2.options, { FIRST: r12.options, SECOND: r22.options },
			"Add existing: Report #2 options");
		r.file2.forEach(function (error, index) {
			a.deep(error, result2[index], "Add existing: Report #2." + index);
		});
	});

	r13 = [{ message: 'Another', line: 1, character: 2 },
		{ message: 'Report 12', line: 1, character: 3 },
		{ message: 'Report 13', line: 5, character: 3 }];
	r13.src = 'File 3';
	r13.path = '/File 3';
	r13.options = { bar: true, dwa: ['raz'] };
	r1.emit('change', event = { name: 'file3', type: 'add',
		report: r13 });
	a(e, event, "Add new: Event");
	e = null;
	r.done(function (r) {
		a.deep(Object.keys(r).sort(), ['file1', 'file2', 'file3'],
			"Add new: Report #1 names");
		a(r.file1.length, result.length, "Add new: Report #1 length");
		a(r.file1.src, 'File 1', "Add new: Report #1 src");
		a(r.file1.path, '/File 1', "Add new: Report #1 path");
		a.deep(r.file1.options, { FIRST: r11.options, SECOND: r21.options },
			"Add new: Report #1 options");
		r.file1.forEach(function (error, index) {
			a.deep(error, result[index], "Add new: Report #1." + index);
		});
		a(r.file2.length, result2.length, "Add new: Report #2 length");
		a(r.file2.src, 'File 2', "Add new: Report #2 src");
		a(r.file2.path, '/File 2', "Add new: Report #2 path");
		a.deep(r.file2.options, { FIRST: r12.options, SECOND: r22.options },
			"Add new: Report #2 options");
		r.file2.forEach(function (error, index) {
			a.deep(error, result2[index], "Add new: Report #2." + index);
		});
		a(r.file3, r13, "Add new: Report #3");
	});

	r1.emit('change', event = { name: 'file3', type: 'remove' });
	a(e, event, "Remove: Event");
	e = null;
	r.done(function (r) {
		a.deep(Object.keys(r).sort(), ['file1', 'file2'],
			"Add new: Report #1 names");
		a(r.file1.length, result.length, "Add new: Report #1 length");
		a(r.file1.src, 'File 1', "Add new: Report #1 src");
		a(r.file1.path, '/File 1', "Add new: Report #1 path");
		a.deep(r.file1.options, { FIRST: r11.options, SECOND: r21.options },
			"Add new: Report #1 options");
		r.file1.forEach(function (error, index) {
			a.deep(error, result[index], "Add new: Report #1." + index);
		});
		a(r.file2.length, result2.length, "Add new: Report #2 length");
		a(r.file2.src, 'File 2', "Add new: Report #2 src");
		a(r.file2.path, '/File 2', "Add new: Report #2 path");
		a.deep(r.file2.options, { FIRST: r12.options, SECOND: r22.options },
			"Add new: Report #2 options");
		r.file2.forEach(function (error, index) {
			a.deep(error, result2[index], "Add new: Report #2." + index);
		});
	});

};
