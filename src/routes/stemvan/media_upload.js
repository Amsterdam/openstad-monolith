var createError = require('http-errors')
  , express     = require('express')
//  , mmm         = require('mmmagic')
  , multer      = require('multer')
  , config      = require('config');
var db          = require('../../db');
var auth        = require('../../auth');

// var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

var upload = multer();

module.exports = function( app ) {
	// TODO: Rate limit?
	//       Limit number of uploads per user?
	app.route('/image')
	  .post(function( req, res, next ) {
      next();
    })
	.post(auth.can('image:upload'))
	  .post(function( req, res, next ) {
      next();
    })
	.post(upload.single('file'))
	  .post(function( req, res, next ) {
      next();
    })
	.post(function( req, res, next ) {
		var file = req.file;
		magic.detect(file.buffer, function( err, mimeType ) {
			if( err ) {
				return next(err);
			} else if( !isValidMimeType(mimeType) ) {
				let acceptedMimeTypes = (config.images && config.images.acceptedMimeTypes) || ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'];
				acceptedMimeTypes = acceptedMimeTypes.map( val => val.replace(/^[^/]+\//, '') );
				if (acceptedMimeTypes.indexOf('jpeg') != -1 && acceptedMimeTypes.indexOf('jpg') != -1) {
					var index = acceptedMimeTypes.indexOf('jpeg');
					acceptedMimeTypes.splice(index, 1);
				}
				let allowed = acceptedMimeTypes.slice(0,acceptedMimeTypes.length - 1).join(', ') + ' of ' + acceptedMimeTypes[acceptedMimeTypes.length-1];
				return next(createError(415, `Dit bestandstype is niet toegestaan. Upload een afbeelding in ${allowed} formaat.`));
			} else if (file.buffer.length > 8084883 ) {
				return next(createError(415, `Het bestand is te groot. De maximale bestandsgrootte is 8MB.`));
			} else {
				console.log(file.buffer.length);
				db.Image.create({
					
					userId   : req.user.id,
					key      : req.body.key,
					mimeType : file.mimetype,
					data     : file.buffer
				})
				.then(function() {
					res.status(204).send();
				})
				.catch(function( error ) {
					next(createError(500, 'Bestand uploaden niet gelukt', error));
				});
			}
		});
	});
};

function isValidMimeType( mimeType ) {

	let acceptedMimeTypes = (config.images && config.images.acceptedMimeTypes) || ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'];

	if (acceptedMimeTypes.indexOf(mimeType) != -1) {
		return true;
	} else {
		return false;
	}

}

