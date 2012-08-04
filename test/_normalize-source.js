'use strict';

module.exports = function (t, a) {
	a(t('\ufeffvar x = 4\n'), 'var x = 4\n', "BOM");
	a(t('#!/usr/bin/env node\nvar x = 4\n'),
		'//                 \nvar x = 4\n', "She bang");
	a(t('\ufeff#!/usr/bin/env node\nvar x = 4\n'),
		'//                 \nvar x = 4\n', "BOM & She bang");
	a(t('var x = 4\n'), 'var x = 4\n', "Plain");
};
