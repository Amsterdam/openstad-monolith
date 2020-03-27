var config       = require('config')
, createError  = require('http-errors')
, htmlToText   = require('html-to-text')
, express      = require('express')
, moment       = require('moment-timezone')
, nunjucks     = require('nunjucks')
, Promise      = require('bluebird')
, csvStringify = Promise.promisify(require('csv-stringify'));
var util         = require('../../util')
, db           = require('../../db')
, auth         = require('../../auth')
, mail         = require('../../mail')
, passwordless = require('../../auth/passwordless');

module.exports = function( app ) {
	// Idea index page
	// ---------------
	app.route('(/ideas|/plannen|/stemmen|/inzendingen)')
		.all(auth.can('ideas:list', 'ideas:archive', 'idea:create'))
		.get(function( req, res, next ) {
			// Figure out idea sorting, and store in the user's session.
			var sort = (req.query.sort || '').replace(/[^a-z_]+/i, '') || req.cookies['idea_sort'] || config.ideas.defaultSort;
			res.cookie('idea_sort', sort, {
				expires: 0
			});
			var extraScopes = [];
			if (config.siteId == 'zorggoedvooronzestad2' || config.siteId == 'naamwedstrijd' ) {
				extraScopes.push('withUser');
			}

			var data = {
				sort             : sort,
				runningIdeas     : db.Idea.getRunning(sort, extraScopes),
				highlightedIdeas : db.Idea.getHighlighted(),
				upcomingMeetings : db.Meeting.getUpcoming(),
				userVoteIdeaId   : req.user.getUserVoteIdeaId(),
				userHasVoted     : req.user.hasVoted(),
				userHasConfirmed : req.user.hasConfirmed(),
				user             : req.user,
				csrfToken        : req.csrfToken(),
				isAdmin          : req.user.role == 'admin' ? true : '',
				fullHost         : req.protocol+'://'+req.hostname
			};

			if (req.path.match(/\stemmen/)) {
				data.stepNo   = '';
				data.ideaId   = '';
				data.zipCode  = '';
				data.email    = '';
				data.hasVoted = '';
			}
			
			Promise.props(data)
				.then(function( result ) {
					res.out('ideas/list', true, result);
				})
				.catch(next);
		});
	
	// View idea
	// ---------
	var router = express.Router();
	app.use('(/idea|/plan)', router);
	
	router.route('/:ideaId(\\d+)')
	// some instance do not use the /idea/:id page but show the idea in the list only
	// admins still need access vfor updates etc
		.all(function( req, res, next ) {
			if (config.ideas.onlyAdminsCanViewIdeaPage && req.user.role != 'admin') {
				return res.redirect('/ideas');
			} else {
				return next();
			}
		})
		.all(function( req, res, next ) {
			// To be able to pass the user ID to the `withArguments` scope,
			// we need to manually call the middleware created by `fetchIdea`.
			// 
			// Calling the `withArguments` scope as a method results in the field
			// `hasUserVoted` being added to the results. This field is used to
			// visualize whether a user has voted for an argument.
			// 
			// In other routes this scope is not called as a method. In these cases
			// the `hasUserVoted` field is omitted from the results.
			var middleware = fetchIdea(
				'withUser',
				'withVoteCount',
				'withPosterImage',
				{method: ['withArguments', req.user.id]}
			);
			middleware(req, res, next);
		})
		.all(fetchVoteForUser)
		.all(auth.can('idea:view', 'idea:*', 'user:mail'))
		.get(function( req, res, next) {
			db.Meeting.getSelectable(req.idea)
				.then(function( meetings ) {
					var data = {
						runningIdeas     : db.Idea.getRunning(),
						config             : config,
						idea               : req.idea,
						userVote           : req.vote,
						selectableMeetings : meetings,
						csrfToken          : req.csrfToken()
					}
					Promise.props(data)
						.then(function( result ) {
							res.out('ideas/idea', true, result);
						})
						.catch(next);
				})
				.catch(next);
		});
	
	// Create idea
	// -----------
	router.route('(/new|/nieuw)')
		.all(auth.can('idea:create', true))
		.all(function( req, res, next ) {
			if (config.ideas.addNewIdeas === 'closed') {
				next(createError(404));
			} else {
				return next();
			}
		})
		.get(function( req, res ) {
			if (req.query.introread || !config.ideas || !config.ideas.showFormIntro ) {
				var help = req.query.help;
				res.out('ideas/form', false, {
					showHelp				: help != undefined ? !!Number(help) : true,
					showForm				: req.can('idea:create'),
					useModernEditor : isModernBrowser(req),
					csrfToken				: req.csrfToken()
				});
			} else {
				res.out('ideas/form-intro', false, {
					showHelp				: help != undefined ? !!Number(help) : true,
					showForm				: req.can('idea:create'),
					useModernEditor : isModernBrowser(req),
					csrfToken				: req.csrfToken()
				});
				
			}
		})
		.post(function( req, res, next ) {
			req.body.location = JSON.parse(req.body.location || null);

			if (config.ideas && config.ideas.image && config.ideas.image.isMandatory && ( !req.body.images || req.body.images == 0 )) {
				req.flash('error', 'Je hebt geen ontwerp toegevoegd');
				return res.out('ideas/form', false, {
					showForm				: true,
					useModernEditor : isModernBrowser(req),
					idea						: req.body,
					csrfToken				: req.csrfToken()
				});
			}

			req.user.createNewIdea(req.body)
				.then(function( idea ) {
					sendThankYouMail(req, idea);
					res.success('/plan/'+idea.id, {idea: idea});
				})
				.catch(function( error ) {
					if( error instanceof db.sequelize.ValidationError ) {
						error.errors.forEach(function( error ) {
							// notNull kent geen custom messages in deze versie van sequelize; zie https://github.com/sequelize/sequelize/issues/1500
							req.flash('error', error.type === 'notNull Violation' && error.path === 'location' ? 'Kies een locatie op de kaart' : error.message);
						});
						res.out('ideas/form', false, {
							showForm        : true,
							useModernEditor : isModernBrowser(req),
							idea            : req.body,
							csrfToken       : req.csrfToken()
						});
					} else {
						next(error);
					}
				});
		});
	
	// Edit idea
	// ---------
	router.route('/:ideaId/edit')
		.all(fetchIdea('withVoteCount', 'withPosterImage', 'withArguments'))
		.all(auth.can('idea:edit'))
		.get(function( req, res, next ) {
			res.out('ideas/form', false, {
				showHelp        : false,
				showForm        : true,
				useModernEditor : isModernBrowser(req),
				idea            : req.idea,
				csrfToken       : req.csrfToken()
			});
		})
		.put(function( req, res, next ) {
			req.body.location = JSON.parse(req.body.location || null);

			if (config.ideas && config.ideas.image && config.ideas.image.isMandatory && ( !req.body.images || req.body.images == 0 )) {
				req.flash('error', 'Je hebt geen ontwerp toegevoegd');
				return res.out('ideas/form', false, {
					showForm				: true,
					useModernEditor : isModernBrowser(req),
					idea						: req.body,
					csrfToken				: req.csrfToken()
				});
			}

			req.user.updateIdea(req.idea, req.body)

				.then(function( idea ) {
					res.success('/plan/'+idea.id, {idea: idea});
				})
				.catch(function( error ) {
					if( error instanceof db.sequelize.ValidationError ) {
						error.errors.forEach(function( error ) {
							// notNull kent geen custom messages in deze versie van sequelize; zie https://github.com/sequelize/sequelize/issues/1500
							req.flash('error', error.type === 'notNull Violation' && error.path === 'location' ? 'Kies een locatie op de kaart' : error.message);
						});
						res.out('ideas/form', false, {
							showForm        : true,
							useModernEditor : isModernBrowser(req),
							idea            : req.idea,
							csrfToken       : req.csrfToken()
						});
					} else {
						next(error);
					}
				});
		});
	
	// Delete idea
	// -----------
	router.route('/:ideaId/delete')
		.all(fetchIdea('withVoteCount', 'withArguments'))
		.all(auth.can('idea:delete'))
		.delete(function( req, res, next ) {
			var idea = req.idea;
			idea.destroy()
				.then(function() {
					req.flash('success', 'Je idee is verwijderd');
					res.success('/plannen', true);
				})
				.catch(next);
		});
	
	// Vote for idea
	// -------------
	// Also functions as anonymous registration by zipcode. When a user
	// is not authorized to vote, a zipcode registration form is shown
	// via the POST error handler. After the user submits his zipcode,
	// a new anonymous member is created, and the normal POST handler
	// is called.
	// Addendum: 'zipCode' is now 'required fields' from the config
	router.route('/:ideaId/vote')
		.all(fetchIdea())
		.all(auth.can('idea:vote'))
		.post(function( err, req, res, next ) {
			if( err.status != 403 || !req.idea.isOpen() ) {
				return next(err);
			}

			var complete = true;
			var userValues = {};
			config.votes.requiredUser.fields.forEach((field) => {
				if (req.body[field.name]) userValues[field.name] = req.body[field.name];
				else complete = false;
			});

			var findUser = false;
			var newUserCreated = false;

			if( complete ) {
				// Register a new anonymous member and continue with the normal request.
				newUserCreated = db.User.registerAnonymous(userValues)
					.then(function( newUser ) {
						req.setSessionUser(newUser.id);
						req.user = newUser;
						next();
						return true;
					})
					.catch(function( error ) {
						if( error instanceof db.sequelize.ValidationError ) {
							error.errors.forEach(function( error ) {
								req.flash('error', error.message);
							});
							return false;
						} else {
							next(error);
						}
					});
				if (config.votes && config.votes.maxChoices) {
					// in de eberhard3  versie kun je een stem aanpassen
					findUser = db.User.find({ where: { email: userValues.email } })
						.then(user => {
							if (user) {
								req.setSessionUser(user.id);
								req.user = user;
								// temp hardcoded ellende
								if (req.body.zipCode) {
									req.user.update({zipCode: req.body.zipCode})
								}
								next();
								return true;
							} else {
								return newUserCreated;
							}
						})
						.catch(function( error ) {
							if( error instanceof db.sequelize.ValidationError ) {
								error.errors.forEach(function( error ) {
									req.flash('error', error.message);
								});
								return false;
							} else {
								next(error);
							}
						});
				}
			}

			Promise.resolve(findUser || newUserCreated)
				.then(function( userDone ) {
					if( userDone ) return;
					
					res.format({
						html: function() {
							res.out('ideas/enter_zipcode', false, {
								config,
								csrfToken : req.csrfToken(),
								opinion   : getOpinion(req),
								values    : userValues
							});
						},
						json: function() {
							next(err);
						}
					});
				})
				.catch(next);
		})
		.post(function( req, res, next ) {
			var user    = req.user;
			var idea    = req.idea;
			var opinion = getOpinion(req);
			
			// stemtool stijl, voor eberhard3 - TODO: werkt nu alleen voor maxChoices = 1;
			if (config.votes && config.votes.maxChoices) {

				idea.setUserVote(user, opinion, req.ip)
					.then(function( isUpdate ) {
						req.flash('success', (isUpdate ? 'Je stem is aangepast' : 'Je hebt gestemd') +  'We hebben je een email gestuurd. Bevestig je stem door op de link in email te klikken.');
						res.success('/plan/'+idea.id, function json() {
							return db.Idea.scope('withVoteCount').findById(idea.id)
								.then(function( idea ) {
									return {succes: { isUpdate: isUpdate }};
								});
						});
						sendVoteConfirmationMail(req, req.idea, isUpdate);
					})
					.catch(next);

			} else {

				idea.addUserVote(user, opinion, req.ip)
					.then(function( voteRemoved ) {
						req.flash('success', voteRemoved ? 'Je stem is ingetrokken' : 'Je hebt gestemd. Ga zo door!<br><br> Laat ook van de <a href="/plannen">andere plannen</a> weten wat je ervan vindt door te stemmen.' );
						res.success('/plan/'+idea.id, function json() {
							return db.Idea.scope('withVoteCount').findById(idea.id)
								.then(function( idea ) {
									return {idea: idea};
								});
						});
					})
					.catch(next);

			}
		});
	
	// Create argument
	// ---------------
	// Creating a new argument can be done two ways:
	// 1. Add a new argument to the idea.
	// 2. Reply to an existing argument.
	// 
	// Both methods share a lot of common ground, but differ in their
	// authorization logic and an extra data field: `parentId`.
	// 
	// That's why argument creation logic is split into 2 routes, with
	// a shared error handler.
	(function() {
		// New argument.
		router.route('/:ideaId/arg/new')
			.all(fetchIdea())
			.all(auth.can('arg:add'))
			.post(updateUserSession)
			.post(function( req, res, next ) {
				var isConfirmed = false;
				if (req.user && req.user.complete) {
					isConfirmed = true;
				} else {
					req.body.confirmationRequired = req.user.email || req.body.email;
				}
				var idea = req.idea;
				idea.addUserArgument(req.user, req.body)
					.then(function( argument ) {
						req.flash('success', isConfirmed ? 'Argument toegevoegd' : 'Argument opgeslagen. Bevestig je email om het argument zichtbaar te maken.');
						res.success(`/plan/${idea.id}#arg${argument.id}`, {
							argument: argument
						});
					})
					.catch(next);
			})
			.all(createArgumentError);
		
		// Reply to argument.
		router.route('/:ideaId/arg/reply')
			.all(fetchIdea())
			.all(fetchArgument)
			.all(auth.can('arg:reply'))
			.post(function( req, res, next ) {
				var idea = req.idea;
				idea.addUserArgument(req.user, req.body)
					.then(function( argument ) {
						req.flash('success', 'Reactie toegevoegd');
						res.success(`/plan/${idea.id}#arg${argument.id}`, {
							argument: argument
						});
					})
					.catch(next);
			})
			.all(createArgumentError);
		
		// Shared error handler.
		function createArgumentError( err, req, res, next ) {
			if( err.status == 403 && req.accepts('html') ) {
				var ideaId = req.params.ideaId;
				req.flash('error', err.message);
				res.success(`/account/register?ref=/plan/${ideaId}`);
			} else if( err instanceof db.sequelize.ValidationError ) {
				err.errors.forEach(function( error ) {
					req.flash('error', error.message);
				});
				next(createError(400));
			} else {
				next(err);
			}
		}
	})();
	
	// Edit argument
	// -------------
	router.route('/:ideaId/arg/:argId/edit')
		.all(fetchIdea())
		.all(fetchArgument)
		.all(auth.can('arg:edit'))
		.get(function( req, res, next ) {
			res.out('ideas/form_arg', false, {
				argument  : req.argument,
				csrfToken : req.csrfToken()
			});
		})
		.put(function( req, res, next ) {
			var user        = req.user;
			var argument    = req.argument;
			var description = req.body.description;
			
			req.idea.updateUserArgument(user, argument, description)
				.then(function( argument ) {
					var flashMessage = argument.parentId ?
			        'Reactie aangepast' :
			        'Argument aangepast';
					
					req.flash('success', flashMessage);
					res.success(`/plan/${argument.ideaId}#arg${argument.id}`, {
						argument: argument
					});
				})
				.catch(db.sequelize.ValidationError, function( err ) {
					err.errors.forEach(function( error ) {
						req.flash('error', error.message);
					});
					res.out('ideas/form_arg', false, {
						argument  : req.argument,
						csrfToken : req.csrfToken()
					});
				})
				.catch(next);
		});
	
	// Delete argument
	// ---------------
	router.route('/:ideaId/arg/:argId/delete')
		.all(fetchIdea())
		.all(fetchArgument)
		.all(auth.can('arg:delete'))
		.delete(function( req, res, next ) {
			var argument = req.argument;
			var ideaId   = argument.ideaId;
			var isReaction = !!argument.parentId;
			argument.destroy()
				.then(function() {
					let flashMessage = 'Argument verwijderd';
					if (isReaction) {
						flashMessage = 'Reactie verwijderd';
					}
					req.flash('success', flashMessage);
					res.success('/plan/'+ideaId + '#arguments');
				})
				.catch(next);
		});
	
	// Vote for argument
	// -----------------
	router.route('/:ideaId/arg/:argId/vote')
		.all(fetchIdea())
		.all(fetchArgument)
		.all(auth.can('arg:vote'))
		.post(function( req, res, next ) {
			var user     = req.user;
			var argument = req.argument;
			var idea     = req.idea;
			var opinion  = getOpinion(req);
			
			argument.addUserVote(user, opinion, req.ip)
				.then(function( voteRemoved ) {
					var flashMessage = !voteRemoved ?
			        'U heeft gestemd op het argument' :
			        'Uw stem op het argument is ingetrokken';
					
					req.flash('success', flashMessage);
					res.success(`/plan/${idea.id}#arg${argument.id}`, function json() {
						return db.Argument.scope(
							{method: ['withVoteCount', 'argument']},
							{method: ['withUserVote', 'argument', user.id]}
						)
							.findById(argument.id)
							.then(function( argument ) {
								return {argument: argument};
							});
					});
				})
				.catch(next);
		})
		.all(function( err, req, res, next ) {
			if( err.status == 403 && req.accepts('html') ) {
				var ideaId = req.params.ideaId;
				var argId  = req.params.argId;
				req.flash('error', err.message);
				res.success(`/account/register?ref=/plan/${ideaId}#arg${argId}`);
			} else {
				next(err);
			}
		});
	
	// Admin: change idea status
	// -------------------------
	router.route('/:ideaId/status')
		.all(fetchIdea('withVoteCount'))
		.all(auth.can('idea:admin'))
		.put(function( req, res, next ) {
			var idea = req.idea;
			idea.setStatus(req.body.status)
				.then(function() {
					res.success('/plan/'+idea.id, {idea: idea});
				})
				.catch(next);
		});
	
	// Admin: Change meeting connection
	// --------------------------------
	router.route('/:ideaId/meeting')
		.all(fetchIdea())
		.all(auth.can('idea:admin'))
		.put(function( req, res, next ) {
			var idea = req.idea;
			idea.setMeetingId(req.body.meetingId)
				.then(function() {
					res.success('/plan/'+idea.id, {idea});
				})
				.catch(next);
		});
	
	// Admin: change mod break
	// -----------------------
	router.route('/:ideaId/mod_break')
		.all(fetchIdea())
		.all(auth.can('idea:admin'))
		.get(function( req, res, next ) {
			res.out('ideas/form_mod_break', true, {
				idea      : req.idea,
				csrfToken : req.csrfToken()
			});
		})
		.put(function( req, res, next ) {
			var idea = req.idea;
			idea.setModBreak(req.user, req.body.modBreak)
				.then(function() {
					res.success('/plan/'+idea.id, {idea: idea});
				})
				.catch(next);
		});
	
	// Admin: view votes
	// -----------------
	router.route('/:ideaId/votes')
		.all(fetchIdea('withVotes'))
		.all(auth.can('idea:admin'))
		.get(function( req, res, next ) {
			var asDownload = 'download' in req.query;
			var idea       = req.idea;
			
			if( !asDownload ) {
				// Display votes as interactive table.
				res.out('ideas/idea_votes', true, {
					idea: idea,
					showConfirmed: config.votes && config.votes.confirmationRequired,
					showEmail: config.siteId == 'zorggoedvooronzestad', // TODO: misschien moet er een config blok met velden komen
				});
			} else {
				var votes_JSON = idea.votes.map(function( vote ) {
					return vote.toJSON();
				});
				let columns = {
					'user.id'      : 'userId',
					'user.zipCode' : 'zipCode',
					'ip'           : 'ip',
					'opinion'      : 'opinion',
					'createdAt'    : 'createdAt'
				};
				if ( config.votes && config.votes.confirmationRequired ) {
					columns['confirmed'] = 'confirmed';
				}
				if ( config.siteId == 'zorggoedvooronzestad' ) { 	// TODO: misschien moet er een config blok met velden komen
					columns['user.email'] = 'email';
				}
				// Download votes as CSV.
				csvStringify(votes_JSON, {
					header     : true,
					delimiter  : ';',
					quoted     : true,
					columns,
					formatters : {
						date: function( value ) {
							return moment(value)
						    .tz(config.get('timeZone'))
						    .format('YYYY-MM-DD HH:mm:ss');
						}
					}
				}).then(function( csvText ) {
					res.type('text/csv');
					res.set('Content-disposition', 'attachment; filename=Stemoverzicht plan '+req.idea.id+'.csv');
					res.send(csvText);
				});
			}
		});
	
	// Admin: toggle vote status
	// -------------------------
	router.route('/:ideaId/vote/:voteId/toggle_checked')
		.all(fetchVote)
		.all(auth.can('idea:admin'))
		.get(function( req, res, next ) {
			var ideaId = req.params.ideaId;
			var vote   = req.vote;
			
			vote.toggle()
				.then(function() {
					res.success('/plan/'+ideaId+'/votes', {vote: vote});
				})
				.catch(next);
		});
};

// Asset fetching
// --------------

function fetchIdea( /* [scopes] */ ) {
	var scopes = Array.from(arguments);
	
	return function( req, res, next ) {
		var ideaId = req.params.ideaId;
		db.Idea.scope(scopes).findById(ideaId)
			.then(function( idea ) {
				if( !idea ) {
					next(createError(404, 'Plan niet gevonden'));
				} else {
					req.idea = idea;
					if (scopes.find(element => element == 'withVoteCount')) {
						// add ranking
						db.Idea.getRunning()
							.then(rankedIdeas => {
								rankedIdeas.forEach((rankedIdea) => {
									if (rankedIdea.id == idea.id) {
										idea.ranking = rankedIdea.ranking;
									}
								});
							})
							.then(ideas => {
								next();
							})
					} else {
						next();
					}
				}
			})
			.catch(next);
	}
}
function fetchVote( req, res, next ) {
	var voteId = req.params.voteId;
	db.Vote.findById(voteId)
		.then(function( vote ) {
			if( vote ) {
				req.vote = vote;
			}
			next();
		})
		.catch(next);
}
function fetchVoteForUser( req, res, next ) {
	var user = req.user;
	var idea = req.idea;
	
	if( !user.isUnknown() && idea ) {
		idea.getUserVote(user)
			.then(function( vote ) {
				if( vote ) {
					req.vote = vote;
				}
				next();
			})
			.catch(next);
	} else {
		next();
	}
}
function fetchArgument( req, res, next ) {
	// HACK: Mixing `req.params` and req.body`? Really? B-E-A-utiful...
	var argId = req.params.argId || req.body.parentId;
	db.Argument.findById(argId)
		.then(function( argument ) {
			if( !argument ) {
				next(createError(404, 'Argument niet gevonden'));
			} else {
				req.argument = argument;
				next();
			}
		})
		.catch(next);
}

// Helper functions
// ----------------

function getOpinion( req ) {
	var opinion = req.body.opinion;
	// Fallback to support mutiple submit buttons with the opinion's
	// value as name.
	// e.g.: `<input type="submit" name="abstain" value="Neutral">`.
	if( !opinion ) {
		opinion = 'no'      in req.body ? 'no' :
		  'yes'     in req.body ? 'yes' :
		  'abstain' in req.body ? 'abstain' :
		  undefined;
	}
	return opinion;
}
// Used to check if Trix editor is supported.
// - Android >= 4.4
// - Firefox >= 48
// - Chrome >= 53
// - IE >= 11
// - Edge
// - Safari >= 8
// - iPhone >= 8.4
function isModernBrowser( req ) {
	var agent = util.userAgent(req.get('user-agent'));
	
	switch( agent.family.toLowerCase() ) {
		case 'android':
			return agent.satisfies('>= 4.4');
		case 'firefox':
			return agent.satisfies('>= 48');
		case 'chrome':
			return agent.satisfies('>= 53');
		case 'ie':
			return agent.satisfies('>= 11');
		case 'edge':
			return true;
		case 'safari':
			return agent.satisfies('>= 8');
		case 'mobile safari':
			return agent.satisfies('>= 8.4');
		default:
			return false;
	}
}

function sendVoteConfirmationMail(req, idea, isUpdate) {

	return passwordless.generateToken(req.user.id, `/stemmen`)
		.then(function( token ) {

			var data    = {
				date     : new Date(),
				user     : req.user,
				idea     : idea,
				token    : token,
				userId   : req.user.id,
				fullHost : req.protocol+'://'+req.hostname,
				isUpdate,
			};

			var html = nunjucks.render('email/confirm_vote.njk', data);

			var text = htmlToText.fromString(html, {
				ignoreImage              : true,
				hideLinkHrefIfSameAsText : true,
				uppercaseHeadings        : false
			});

			var attachments = config.ideas.confirmEmail.attachments;
			
			mail.sendMail({
				to          : req.user.email,
				subject     : isUpdate ? 'Stem gewijzigd: Bevestig je stem' : 'Bevestig je stem',
				html        : html,
				text        : text,
				
				attachments : attachments,
			});

		});

}

function sendThankYouMail( req, idea ) {
	var data    = {
		date     : new Date(),
		user     : req.user,
		idea     : idea,
		fullHost : req.protocol+'://'+req.hostname
	};
	var html = nunjucks.render('email/idea_created.njk', data);
	var text = htmlToText.fromString(html, {
		ignoreImage              : true,
		hideLinkHrefIfSameAsText : true,
		uppercaseHeadings        : false
	});

	let attachments;
  // TODO: ff een snelle oplossing één dag voor live; verzin hier iets generieks voor
	let site = config.get('siteId');
	if (site == 'westbegroot') {
		// TODO: deze moeten naar de config
		attachments = [{
			filename : 'logo.png',
			path     : 'img/logo-gemeenteams-webapplicaties.png',
			cid      : 'logo'
		}, {
			filename : 'map.png',
			path     : 'img/email/map@2x.png',
			cid      : 'map'
		}]
	} else {
		attachments = ( config.ideas.feedbackEmail && config.ideas.feedbackEmail.attachments ) || [{
			filename : 'logo.png',
			path     : 'img/logo-gemeenteams-webapplicaties.png',
			cid      : 'logo'
		}, {
			filename : 'map.png',
			path     : 'img/email/map@2x.png',
			cid      : 'map'
		}, {
			filename : 'steps.png',
			path     : 'img/email/steps@2x.png',
			cid      : 'steps'
		}]
	}

console.log(	{
		to          : req.user.email,
		subject     : (config.ideas && config.ideas.feedbackEmail && config.ideas.feedbackEmail.subject) || 'Bedankt voor je voorstel',
		html        : html,
		text        : text,
		attachments : attachments,
});

	
	mail.sendMail({
		to          : req.user.email,
		subject     : (config.ideas && config.ideas.feedbackEmail && config.ideas.feedbackEmail.subject) || 'Bedankt voor je voorstel',
		html        : html,
		text        : text,
		attachments : attachments,
	});
}

// `updateUserSession` wordt gebruikt door de nieue argumenten route, en werkt alleen daarvoor.
// Als je hem wilt gebruuiken voor andere dingen dan moet je de functionaliteit uitbreiden.
// Todo: dit past in hoe de applicatie werkt, maar het is nogal een k-oplossing.
function updateUserSession( req, res, next ) {

	var {user, body} = req;

	let data = {};
	data.role     = user.role != 'unknown' ? user.role : 'anonymous';
	data.email    = user.email    || body.email;
	data.nickName = user.nickName || body.nickName;
	data.zipCode  = user.zipCode  || body.zipCode;

	if (data.role == 'anonymous' && !( config.arguments && config.arguments.user && config.arguments.user.anonymousAllowed )) {
		// anonymous not allowed
		return next(createError(401, 'Anoniem argumenten toevoegen is niet toegestaan'))
	}

	// check fields
	let missingFields = [];
	if (config.arguments && config.arguments.user) {
		config.arguments.user.fieldsRequired.forEach((field) => {
			if (!data[field]) missingFields.push(field);
		});
		if (missingFields.length > 0) {
			return next(createError(missingFields.join(', ') + ' niet ingevuld'));
		}
	}

	let promise;
	let sendMailTo;
	if (!user || user.id == 1) {
		promise = db.User
			.findOne({ where: { email: data.email } })
			.then(found => {
				if (found) {
					data = undefined;
					sendMailTo = found;
					req.body.userId = found.id
					return user;
				}
				return db.User.registerAnonymous()
					.then(created => {
						sendMailTo = created;
						req.body.userId = created.id
						return created;
					})
			})
			.then(user => {
				sendAuthToken( sendMailTo, req )
				return user;
			})
			.catch(next);
	} else {
		promise = Promise.resolve(user);
	}

	promise
		.tap(function( user ) {
			if (data) {
				return user.update(data);
			} else {
				return user;
			}
		})
		.then(function( user ) {
			req.setSessionUser(user.id);
			req.user = user;
			next();
		})
		.catch(error => {
			if( error instanceof db.sequelize.ValidationError ) {
				error.errors.forEach(function( error ) {
					// unique errors zijn niet goed af te vangen in de huidige versie van Sequelize; zie https://github.com/sequelize/sequelize/issues/5033
					req.flash('error', error.type === 'unique violation' && error.path === 'users_email' ? 'Dit e-mail adres is al in gebruik' : error.message);
					req.user.email = null; // really? is dit nodig?
				});
				res.out('ideas/form', false, {
					showForm        : true,
					useModernEditor : isModernBrowser(req),
					idea            : req.body,
					csrfToken       : req.csrfToken()
				});
			} else {
				next(error);
			}
		});
}

// TODO: gekopieerd uit auth; zet hem ergens generiek neer
function sendAuthToken( user, req ) {
	// if( !user.isMember() ) {
	//  	throw createError(400, 'User is not a member');
	// }
	
	var hasCompletedRegistration = user.hasCompletedRegistration();
	var ref                      = req.query.ref;
	
	return passwordless.generateToken(user.id, ref)
		.then(function( token ) {
			var data = {
				complete : hasCompletedRegistration,
				date     : new Date(),
				fullHost : req.protocol+'://'+req.hostname,
				token    : token,
				userId   : user.id,
				ref      : ref
			};
			mail.sendMail({
				to          : user.email,
				subject     : hasCompletedRegistration ?
			    'Inloggen' :
			    'Registreren',
				html        : nunjucks.render('email/login_link.njk', data),
				text        : nunjucks.render('email/login_link_text.njk', data),
				attachments : [{
					filename : 'logo@2x.png',
					path     : 'img/email/logo@2x.png',
					cid      : 'logo'
				}]
			});
			
			return user;
		});
}
