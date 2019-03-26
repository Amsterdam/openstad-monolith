const Promise = require('bluebird');
const express = require('express');
const db      = require('../../db');
const auth    = require('../../auth');

let router = express.Router({mergeParams: true});

router.route('/')

// list arguments
// --------------
	.get(auth.can('arguments:list'))
	.get(function(req, res, next) {

		let ideaId = parseInt(req.params.ideaId) || 0;
		let where = {};
		req.scope = ['defaultScope'];
		req.scope.push({method: ['forSiteId', req.params.siteId]});
		if (ideaId) {
			where.ideaId = ideaId;
		}
		let sentiment = req.query.sentiment;
		if (sentiment) {
			where.sentiment = sentiment;
		}
		db.Argument
			.scope(...req.scope)
			.findAll({ where })
			.then( found => {
				return found.map( entry => entry.toJSON() );
			})
			.then(function( found ) {
				res.json(found);
			})
			.catch(next);

	})

// create argument
// ---------------
	.post(auth.can('argument:create'))
	.post(function(req, res, next) {
		let data = {
			description : req.body.description,
			sentiment   : req.body.sentiment || 'for',
			ideaId      : req.params.ideaId,
			userId      : req.user.id,
		}

		db.Argument
			.create(data)
			.then(result => {
				res.json(result);
			})
	})

	// with one existing argument
	// --------------------------
	router.route('/:argumentId(\\d+)')
		.all(function(req, res, next) {
			var argumentId = parseInt(req.params.argumentId) || 1;

			req.scope = ['defaultScope'];
			req.scope.push({method: ['forSiteId', req.params.siteId]});
			let ideaId = parseInt(req.params.ideaId) || 0;
			let sentiment = req.query.sentiment;
			let where = { ideaId, id: argumentId }

			if (sentiment) {
				where.sentiment = sentiment;
			}

			db.Argument
				.scope(...req.scope)
				.find({
					where
				})
				.then(found => {
					if ( !found ) throw new Error('Argument not found');
					req.argument = found;
					next();
				})
				.catch(next);
		})

	// view argument
	// -------------
		.get(auth.can('argument:view'))
		.get(function(req, res, next) {
			res.json(req.argument);
		})

	// update argument
	// ---------------
		.put(auth.can('argument:edit'))
		.put(function(req, res, next) {
			req.argument
				.update(req.body)
				.then(result => {
					res.json(result);
				})
				.catch(next);
		})

	// delete argument
	// ---------------
		.delete(auth.can('argument:delete'))
		.delete(function(req, res, next) {
			req.argument
				.destroy()
				.then(() => {
					res.json({ "argument": "deleted" });
				})
				.catch(next);
		})

module.exports = router;
