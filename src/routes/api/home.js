var express = require('express');

var router = express.Router();
router.use('/?$', function( req, res, next ) {
	res.redirect('/examples')
	res.end();
});

module.exports = router;
