'use strict';

var getMap   = require('fs2/lib/get-conf-file-map')
  , readFile = require('fs2/read-file')
  , isRoot   = require('./_options/get-map').isRoot
  , parse    = require('./_options/parse');

require('fs2/lib/ignore-modes').lint = module.exports = {
	filename: '.lintignore',
	isRoot: isRoot.bind({
		readRules: getMap.readRules,
		filename: '.lint',
		parse: parse,
		readFile: function (path) {
			return readFile(path, { loose: true });
		}
	}),
	isRootWatcher: isRoot.bind({
		readRules: getMap.readRulesWatcher,
		watch: true,
		filename: '.lint',
		parse: parse,
		readFile: function (path) {
			return readFile(path, { loose: true, watch: true });
		}
	})
};
