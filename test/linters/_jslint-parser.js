'use strict';

module.exports = function (t, a) {
	var linter = function () {
		linter.errors = [
			{ id: '(error)',
				raw: '{a} {d} {b} {c}',
				line: 5,
				character: 20,
				a: 'foo',
				b: 'bar',
				c: 'next',
				d: 'what'
			},
			{ id: '(error)',
				raw: 'Missing semicolon.',
				line: 5,
				character: 61,
				a: undefined,
				b: undefined,
				c: undefined,
				d: undefined
			}
		];
	};
	var data = t(linter, 'whatever', {});
	a.deep(data[0], { line: 5, character: 20, message: 'foo what bar next' },
		"#1");
	a.deep(data[1], { line: 5, character: 61, message: 'Missing semicolon.' },
		"#2");
};
