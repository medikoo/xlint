// Normalize module source code

'use strict';

var repeat     = require('es5-ext/lib/String/prototype/repeat')
  , startsWith = require('es5-ext/lib/String/prototype/starts-with')

module.exports = function (src) {

	// Fix UTF8 BOM
	if (startsWith.call(src, '\ufeff')) {
		src = src.slice(1);
	}

	// Remove shebang
	src = src.replace(/^(#![\0-\t\u000b-\uffff]*)\n/, function (all, sheBang) {
		return '//' + repeat.call(' ', sheBang.length - 3) + '$\n'
	});

	return src;
};
