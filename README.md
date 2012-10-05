# XLint – Powerful CLI for *any* lint solution

* Built-in support for __[JSLint](http://www.jslint.com/)__ and __[JSHint](http://www.jshint.com/)__ linters
* Picks all __.js and executable Node.js files__ from all directories recursively (nest level is configurable)
* [__Provides simple external configuration file standard__](#configuration-files) that allows to keep options out of program files
* If needed __understands _.gitignore_ rules__
* Additional [__ignore rules can be defined in _.lintignore_ files__](#ignoring-specific-files-and-directories)
* __Optional caching__ mechanism (no re-evaluation with same options on not modified files)
* Provides __live console__, that updates when code or configuration files are updated
* __Damn fast__
* Covered by [__over 150 unit tests__](#tests-)

## Usage

```
$ xlint [options] <linter> [<paths>]
```

for example:

```
$ xlint path/to/jslint.js project/path
```

Interested in live console?

```
$ xlint --watch path/to/jslint.js project/path
```

## Installation

```
$ npm install -g xlint
```

## Options

* __cache__ `bool` - Whether to cache generated reports. Very useful if we rerun the script on large projects. Cached reports are saved into _.lintcache_ file in your project main directory _[default: true]_
* __color__ `bool` - Colorize console output _[default: true]_
* __depth__ `number` - How deeply to recurse into subdirectories _[default: Infinity]_
* __ignoreRules__ `string` - Whether to obey rules found in ignore files (Currently just _git_ for _.giitignore_ rules is supported). It's backed by [_fs2.isIgnored_](https://github.com/medikoo/fs2#isignoredmode-path-options-cb) _[default: git]_
* __stream__ `bool` - Whether to generate reports on the go (as soon as first filenames are obtained) _[default: true]_
* __watch__ `bool` - Output reports in live console which updates after code or configuration files are updated _[default: false]_

## Ignoring specific files and directories

Apart of support for _.gitignore_ rules, XLint also looks for rules in _.lintignore_ files. Syntax rules for those files is same as for _.gitignore_ files.

## Configuration files

XLint supports external _.lint_ configuration files, through which we may setup options that are passed to linter. There can be many_.lint_ files placed in any directory within project

File format is similar to _conf_ files as we know them from *nix systems:

```
# This is a comment, any of this are ignored by the parser

@root                     # Root of a project, means that any rules found in upper directories won't have effect

plusplus                  # Regular boolean option
indent 2                  # Numeric option
predef console, window    # Array of strings

./foo.js                  # Options that would only address foo.js file
!plusplus                 # Overridden boolean option (set to false)
predef+ XMLHttpRequest    # Add token to array option
predef- console           # Remove token from array option

./some-dir                # Options that address only files within given directory
predef foo, bar           # Override array option
otherarr one,             # Other array option, if we set just one token, we need to post-fix it with comma
```

### JSHint case

XLint doesn't support options defined in `jshintrc` files.  
JSHint separates _global_ variable settings from other options, but in XLint configuration files, _global_ should be defined same as other options (as e.g. _predef_ for JSLint), it will be passed to JSHint as expected.

## Support for other linters

Internal architecture of XLint is well modularized. Other linters can be handled by XLint, by introdiif report procesor module that translates output report into XLint supported format is provided:

```javascript
// Custom linter handler

module.exports = function (src, options) {
	var rawReport, xlintReport
	rawReport = linter(src, options); // Get report from linter we want to use
	// Translate it into XLint friendly format, which is an array of warnings with it's meta data, e.g.:
	// xlintReport = [
	//   { line: 12, character: 43, message: 'Warning message' }
	//   { line: 16, character: 3, message: 'Other warning message' }
	// ];
	//
	// If there are no errors, empty array should be returned
	//
	// It's good to stamp our report with unique linter id (cache functionality distinguish linters by this):
	// xlintReport.xlintId = 'MYCUSTOM_LINTER@0.2';
	return xlintReport;
};
```

When we got that, we should just pass path to our module to xlint process

## TODO (v0.1.1 milestone)

* Possibility to lint using more than one linter with one process
* Provide simple plain text based read/write stream, so it can be easily plugged into external tools
* Fix live console for Windows

## Tests [![Build Status](https://secure.travis-ci.org/medikoo/xlint.png?branch=master)](https://secure.travis-ci.org/medikoo/xlint)

	$ npm test
