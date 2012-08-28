var JSLINT = function () {
	JSLINT.errors = [
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
