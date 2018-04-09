var createError  = require('http-errors')
  , express      = require('express')
  , Promise      = require('bluebird')
var util         = require('../../util')
  , db           = require('../../db')
  , auth         = require('../../auth')

module.exports = function( app ) {
	// View idea
	// ---------
	app.route('/')
	.all(function( req, res, next ) {
		db.Idea.scope(
			'summary',
			'withUser',
			'withVoteCount',
			'withPosterImage',
			{method: ['withArguments', req.user.id]},
			'withAgenda'
		)
		.findById(2)
		.then(function( idea ) {
			if( !idea ) {
				next(createError(404, 'Plan niet gevonden'));
			} else {
				req.idea = idea;
				next();
			}
		})
		.catch(next);
	})
	.all(fetchPoll)
	.all(auth.can('idea:admin', 'poll:vote', true))
	.get(function( req, res, next) {
		res.out('index', true, {
			idea      : req.idea,
			poll      : req.poll,
			userVote  : req.vote,
			csrfToken : req.csrfToken()
		});
	});
};

// Asset fetching
// --------------

function fetchPoll( req, res, next ) {
	var ideaId = req.idea.id;
	if( !ideaId ) {
		throw createError(400, 'Geen ideaId');
	}
	
	db.Poll.scope('withVoteCount').findOne({
		where: {
			ideaId: ideaId
		}
	})
	.then(function( poll ) {
		if( !poll ) {
			throw createError(404, 'Poll niet gevonden');
		}
		
		req.poll = poll;
		next();
	})
	.catch(next);
}