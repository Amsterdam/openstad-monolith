module.exports = function( role ) {
	role.action({
		'idea:view': true,
		'idea:create': true,
		'idea:edit': {
			allow: isIdeaOwner
		},
		'idea:delete': {
			allow: isIdeaOwner
		}
	});
};

function isIdeaOwner( user, idea ) {
	return user.id === idea.userId;
}