var config       = require('config')
, express      = require('express')
, Promise      = require('bluebird')
, db           = require('../../db')
, auth         = require('../../auth')

// deze endpoints zijn voor de gemeentelijke monitoring tool coosto
            
module.exports = function( app ) {

	// all ideas
	app.route('/coosto/ideas')
		.all(auth.can('ideas:list'))
		.get(function( req, res, next ) {

			db.Idea.scope('summary', 'withUser').findAll({
				where: {
					status: ['OPEN','CLOSED','ACCEPTED','BUSY','DONE'],
					deletedAt: null,
				}})
				.then( ideas => {

					let result = ideas.map( idea => { return {
						id: idea.id,
						postDateCreated: new Date(idea.createdAt).toISOString(),
						postUrl: req.protocol + '://' + req.hostname + '/coosto/idea/' +  idea.id,
						postTotalComments: idea.argCount,
						postAuthor: idea.user.firstName + ' ' + idea.user.lastName,
						postTitle: idea.title,
						postContent: idea.description,
					}})
					
					res.json({
						status: "success",
						code: "200",
						payload: {
							postsTotal: result.length,
							postsstotalThisfeed: result.length,
							offset: 0,
							max: result.length,
							more: null,
							posts: result
						}
					})

				})
				.catch(next)
		});
	

	// one idea with arguments
	app.route('/coosto/idea/:ideaId(\\d+)')
		.all(auth.can('ideas:list'))
		.get(function( req, res, next ) {

			db.Idea.scope({method: ['withArguments', req.user.id]}, 'withUser').findOne({
				where: {
					id: parseInt(req.params.ideaId),
					status: ['OPEN','CLOSED','ACCEPTED','BUSY','DONE'],
					deletedAt: null,
				}})
				.then( idea => {

					let args = idea.argumentsFor.concat(idea.argumentsAgainst);

					let result = args.map( argument => { return {
						id: argument.id,
						commentNameUser: argument.user.firstName + ' ' + argument.user.lastName,
            commentDateCreated: new Date(argument.createdAt).toISOString(),
            commentUrl: req.protocol + '://' + req.hostname + '/idea/' + idea.id + '#arguments',
            commentText: argument.description, 
					}})
					
					res.json({
						status: "success",
						code: "200",
						payload: {
							postTitle: idea.title,
							postDateCreated: new Date(idea.createdAt).toISOString(),
							postUrl: req.protocol + '://' + req.hostname + '/idea/' + idea.id,
							postDescription: idea.summary,
							commentsTotal: args.length,
							commentstotalThisfeed: args.length,
							offset: 0,
							max: args.length,
							"comments": result,
						}
					})

				})
				.catch(next)
		});
	
}
