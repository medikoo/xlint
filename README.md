# xlint
## Powerful CLI for any lint solution

* Built-in support for __[JSLint](http://www.jslint.com/)__ and __[JSHint](http://www.jshint.com/)__ linters
* Picks all __.js and executable Node.js files__ from all directories recursively (nest level is configurable)
* [__Provides simple external configuration file standard__](#configuration-files) that allows to keep options out of program files
* If needed __understands _.gitignore_ rules__
* Additional [__ignore rules can be defined in _.lintignore_ files__](#ignoring-specific-files-and-directories)
* __Optional caching__ mechanism (no re-evaluation with same options on not modified files)
* Provides __live console__, that updates when code or configuration files are updated
* Covered by [__over 150 unit tests__](#tests-)

## Usage

```
$ xlint [options] [<paths>]
```

for example:

```
$ xlint --linter=path/to/jslint-module.js project/path
```

Interested in live console?

```
$ xlint --watch --linter=path/to/jslint-module.js project/path
```

## Installation

```
$ npm install -g xlint
```

## Options

* __linter__ `path` - Path to linter module. It must be CJS module, see e.g. [xlint-jslint](https://github.com/medikoo/xlint-jslint) for JSLint provided as one
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

## Tests [![Build Status](https://travis-ci.org/medikoo/xlint.png)](https://travis-ci.org/medikoo/xlint)

	$ npm test
