'use strict';

var getMap   = require('next/lib/fs/_get-conf-file-map')
  , readFile = require('next/lib/fs/read-file')
  , isRoot   = require('./_options/get-map').isRoot
  , parse    = require('./_options/parse');

require('next/lib/fs/_ignore-modes').lint = module.exports = {
	filename: '.lintignore',
	isRoot: isRoot.bind({
		readRules: getMap.readRules, filename: '.lint',
		parse: parse, readFile: function (path) {
			return readFile(path, { loose: true });
		}
	}),
	isRootWatcher: isRoot.bind({
		readRules: getMap.readRulesWatcher, watch: true, filename: '.lint',
		parse: parse, readFile: function (path) {
			return readFile(path, { loose: true, watch: true });
		}
	})
};
