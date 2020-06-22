var Mocha = require('mocha')
  , fs    = require('fs')
  , path  = require('path');

var mocha  = new Mocha();
var suites = process.argv.length > 2 ?
             process.argv.slice(2) :
             undefined;

// Add each .js file to the mocha instance
// 
// FILENAMES MUST BE `## <suiteName>.js`
fs.readdirSync('test').sort().forEach(function( file ) {
	if(
		!suites && path.extname(file) === '.js' ||
		suites && suites.indexOf(path.basename(file, '.js').substr(3)) >= 0
	) {
		mocha.addFile(path.join('test', file));
	}
});

mocha.run(function( failures ) {
	process.on('exit', function () {
		process.exit(failures);
	});
});
