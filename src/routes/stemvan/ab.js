var co = require('co');
var db = require('../../db');

module.exports = function( app ) {
	app.get('/about|/themas|/inspiratie', co.wrap(function*( req, res, next ) {
		var data = yield {
			highlightedIdeas : db.Idea.getHighlighted(),
			upcomingMeetings : db.Meeting.getUpcoming()
		};
		
		res.out('about', false, data);
	}));
};
