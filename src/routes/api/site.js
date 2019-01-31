const Promise = require('bluebird');
const express = require('express');
const db      = require('../../db');
const auth    = require('../../auth');

let router = express.Router({mergeParams: true});

router.route('/')

// list sites
// ----------
	.get(auth.can('sites:list'))
	.get(function(req, res, next) {
		db.Site
			.findAll()
			.then( found => {
				return found.map( entry => entry.toJSON() );
			})
			.then(function( found ) {
				res.json(found);
			})
			.catch(next);
	})

// create site
// -----------
	.post(auth.can('site:create'))
	.post(function(req, res, next) {
		db.Site
			.create(req.body)
			.then(result => {
				res.json(result);
			})
	})

// one site routes: get site
// -------------------------
router.route('/:siteId(\\d+)')
	.all(auth.can('site:view'))
	.all(function(req, res, next) {
		var siteId = parseInt(req.params.siteId) || 1;
		db.Site
			.find({
				where: { id: siteId }
			})
			.then(found => {
				if ( !found ) throw new Error('Site not found');
				req.site = found;
				next();
			})
			.catch(next);
	})

// view site
// ---------
	.get(function(req, res, next) {
		res.json(req.site);
	})

// update site
// -----------
	.put(auth.can('site:edit'))
	.put(function(req, res, next) {
		req.site
			.update(req.body)
			.then(result => {
				res.json(result);
			})
			.catch(next);
	})

// delete site
// ---------
	// .delete(auth.can('site:delete'))
	.delete(function(req, res, next) {
		req.site
			.destroy()
			.then(() => {
				res.json({ "site": "deleted" });
			})
			.catch(next);
	})

module.exports = router;
