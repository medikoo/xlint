'use strict';

module.exports = {
	adsafe: {
		type: 'bool',
		description: "if ADsafe rules should be enforced. "
			+ "See http://www.ADsafe.org/"
	},
	bitwise: {
		type: 'bool',
		description: "if bitwise operators should be allowed"
	},
	browser: {
		type: 'bool',
		description: "if the standard browser globals should be predefined"
	},
	cap: {
		type: 'bool',
		description: "if uppercase HTML should be allowed"
	},
	continue: {
		type: 'bool',
		description: "if the continue statement should be allowed"
	},
	css: {
		type: 'bool',
		description: "if CSS workarounds should be tolerated"
	},
	debug: {
		type: 'bool',
		description: "if debugger statements should be allowed"
	},
	devel: {
		type: 'bool',
		description: "if browser globals that are useful in development "
			+ "(alert, console etc) should be predefined"
	},
	eqeq: {
		type: 'bool',
		description: "if the == and != operators should be tolerated"
	},
	es5: {
		type: 'bool',
		default: true,
		description: "if ES5 syntax should be allowed"
	},
	evil: {
		type: 'bool',
		description: "if eval should be allowed"
	},
	forin: {
		type: 'bool',
		description: "if unfiltered for in statements should be allowed"
	},
	fragment: {
		type: 'bool',
		description: "if HTML fragments should be allowed"
	},
	indent: {
		type: 'number',
		default: 4,
		description: "The number of spaces used for indentation"
	},
	maxerr: {
		type: 'number',
		default: 50,
		description: "The maximum number of warnings (per file) reported"
	},
	maxlen: {
		type: 'number',
		description: "The maximum number of characters in a line"
	},
	newcap: {
		type: 'bool',
		description: "if Initial Caps with constructor functions is optional"
	},
	node: {
		type: 'bool',
		default: true,
		description: "if Node.js globals should be predefined"
	},
	nomen: {
		type: 'bool',
		default: true,
		description: "if names should not be checked "
			+ "for initial or trailing underbars"
	},
	on: {
		type: 'bool',
		description: "if HTML event handlers should be allowed"
	},
	passfail: {
		type: 'bool',
		description: "if the scan should stop on first error (per file)"
	},
	plusplus: {
		type: 'bool',
		description: "if ++ and -- should be allowed"
	},
	predef: {
		type: 'list',
		description: "Comma separated list of the names of "
			+ "predefined global variables"
	},
	regexp: {
		type: 'bool',
		description: "if . and [^...] should be allowed in RegExp literals"
	},
	rhino: {
		type: 'bool',
		description: "if the Rhino environment globals should be predefined"
	},
	safe: {
		type: 'bool',
		description: "if the safe subset rules are enforced. "
			+ "These rules are used by ADsafe."
	},
	sloppy: {
		type: 'bool',
		description: "if the ES5 'use strict'; pragma is not required."
	},
	stupid: {
		type: 'bool',
		description: "true if blocking ('...Sync') methods can be used."
	},
	sub: {
		type: 'bool',
		description: "if subscript notation may be used for expressions better "
			+ "expressed in dot notation"
	},
	undef: {
		type: 'bool',
		description: "if variables and functions need not be declared before used"
	},
	unparam: {
		type: 'bool',
		description: "if warnings should not be given for unused parameters"
	},
	vars: {
		type: 'bool',
		description: "if multiple var statement per function should be allowed"
	},
	white: {
		type: 'bool',
		description: "if strict whitespace rules should be ignored"
	},
	windows: {
		type: 'bool',
		description: "if the Windows globals should be predefined"
	}
};
