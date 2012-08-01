'use strict';

module.exports = function (t, a) {
	var data = t('x = 5');
	a.deep(Object.keys(data[0]).sort(), ['character', 'line', 'message'],
		"Error data");
};
