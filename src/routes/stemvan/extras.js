var co = require('co');
var config = require('config');
var db = require('../../db');

module.exports = function( app ) {

	if (config.siteId = 'zorggoedvooronzestad2') {

		app.get('/locatie', co.wrap(function*( req, res, next ) {
			var data = {
			};
			res.out('locatie', false, data);
		}));

	  app.get('/wedstrijd', co.wrap(function*( req, res, next ) {
		  var data = {
		  };
		  res.out('wedstrijd', false, data);
	  }));

	}

	if (config.siteId = 'stemvanwest') {

	  app.get('/rattenoverlast', co.wrap(function*( req, res, next ) {
		  var data = {
		  };
		  res.out('rattenoverlast', false, data);
	  }));

	}

};
