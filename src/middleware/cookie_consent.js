var config = require('config');

module.exports = function( req, res, next ) {

	res.locals.cookieConsent = req.cookies && req.cookies.cookieConsent;
	next();

};
