'use strict';

var getMap   = require('next/lib/fs/_get-conf-file-map')
  , readFile = require('next/lib/fs/read-file')
  , isRoot   = require('./_options/get-map').isRoot
  , parse    = require('./_options/parse');

require('next/lib/fs/_ignorefile-modes').lint = {
	filename: '.lintignore',
	isRoot: isRoot.bind({
		readRules: getMap.readRules, filename: '.lint',
		parse: parse, readFile: function (path) {
			return readFile(path, { loose: true });
		}
	}),
	isRootWatch: isRoot.bind({
		readRules: getMap.readRulesWatch, watch: true, filename: '.lint',
		parse: parse, readFile: function (path) {
			return readFile(path, { loose: true, watch: true });
		}
	})
};
