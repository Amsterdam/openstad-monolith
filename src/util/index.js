var fs        = require('fs')
	, path      = require('path');
var useragent = require('useragent');

// To get `satisfies` method for `useragent` module.
require('useragent/features');

var util = module.exports = {
	invokeDir: function( dirName, fn, ctx ) {
		dirName = util.relativePath(dirName);
		_invokeDir(dirName, fn, ctx);
	},
	
	relativePath: function( dirName ) {
		// Is `dirName` relative?
		if( path.normalize(dirName) !== path.resolve(dirName) ){
			// make `dirName` relative to the caller.
			var callerFilename = util.stack()[2].getFileName()
			  , callerPath     = path.dirname(callerFilename);
			dirName = path.resolve(callerPath, dirName);
		}
		return dirName;
	},
	
	stack: function _stackGrabber() {
		var orig = Error.prepareStackTrace;
		Error.prepareStackTrace = function(_, stack) { return stack; };
		var err = new Error();
		Error.captureStackTrace(err, _stackGrabber);
		var errStack = err.stack;
		Error.prepareStackTrace = orig;
		return errStack;
	},
	
	userAgent: function( ua ) {
		return useragent.parse(ua);
	}
};

function _invokeDir( dirName, fn, ctx ) {
	var dir = fs.readdirSync(dirName);
	for( let fileName of dir ) {
		var fullPath = path.join(dirName, fileName)
			, isDir    = fs.lstatSync(fullPath).isDirectory();
		
		if( isDir ) {
			_invokeDir(fullPath, fn, ctx);
		} else if(
			fileName !== 'index.js' &&
			fileName.match(/\.js$/) !== null
		) {
			var name = fileName.replace(/\.js$/, '');
			var file = require(fullPath);
			fn.call(ctx || file, file, name, dirName);
		}
	}
}