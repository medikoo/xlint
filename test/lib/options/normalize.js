'use strict';

// var inspect = require('util').inspect;

module.exports = function (t, a) {
	var x = { foo: true }, copy;

	a.not(t(x), x, "Return copy");
	x = t({ foo: false, bar: {}, raz: ['raz', 3, {}, 'dwa'] });
	copy = { foo: false, raz: ['raz', '3', '[object Object]', 'dwa'] };

	// console.log("OPTS", inspect(x, false, Infinity));
	// console.log("COPY", inspect(copy, false, Infinity));
	a.deep(x, copy);
};
