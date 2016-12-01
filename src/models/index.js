var _    = require('lodash');
var util = require('../util');

module.exports = function( db, sequelize, DataTypes ) {
	var models = util.invokeDir('./', function( modelDef ) {
		return modelDef(db, sequelize, DataTypes);
	}, this);
	
	return models;
};