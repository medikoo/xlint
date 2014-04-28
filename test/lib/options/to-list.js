'use strict';

module.exports = function (t, a) {
	a.deep(t('raz, dwa,trzy,,pięć,raz , trzy,'), ['dwa', 'pięć', 'raz', 'trzy']);
};
