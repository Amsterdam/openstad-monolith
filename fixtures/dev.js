var _      = require('lodash')
  , co     = require('co')
  , moment = require('moment')
var log    = require('debug')('app:db');

module.exports = co.wrap(function*( db ) {
	log('generating meetings...');
	yield meetings.map(function( meetingData ) {
		return db.Meeting.create(meetingData);
	});
	log('generating users and ideas...');
	yield users.map(function( userData ) {
		return db.User.create(userData, {
			include  : [{
				model: db.Idea,
				include: [{
					model : db.Argument,
					as    : 'argumentsAgainst'
				}, {
					model : db.Argument,
					as    : 'argumentsFor'
				}, {
					model: db.Vote
				}]
			}],
			validate : userData.id != 4 // User 4 is anonymous and has credentials
		});
	});
	log('test database complete');
});

var today = moment().startOf('day');

// Meetings
// --------
var meetings = [
	{id: 1, date: moment(today).day(5).toDate()},
	{id: 2, date: moment(today).day(5).add(2, 'weeks').toDate()},
	{id: 3, date: moment(today).day(5).add(4, 'weeks').toDate()}
];
// Users including their ideas
// ---------------------------
var users = [
	{id : 1 , complete : 0 , role : 'unknown'},
	{id : 2 , complete : 1 , role : 'admin' ,      email: 'tjoekbezoer@gmail.com'        , password : 'password'        , firstName : 'Bastard Operator' , lastName : 'from Hell' , gender : 'male' , ideas : [
		{
			id               : 1,
			startDate        : moment(today).subtract(1, 'days'),
			title            : 'Metro naar stadsdeel West',
			summary          : 'Een nieuwe metrobuis naar het Bos en Lommerplein',
			description      : 'Ik moet nu een half uur fietsen, dat vind ik veel te lang. Ik wil een extra metrobuis!',
			argumentsAgainst : [
				{userId: 25, sentiment: 'against' , description: 'De kosten van dit idee zullen veel te hoog zijn. Daarnaast zal dit project ook weer enorm uit de hand lopen waarschijnlijk.'}
			],
			argumentsFor     : [
				{userId: 7  , sentiment: 'for'    , description: 'De metro is cool.'},
				{userId: 3  , sentiment: 'for'    , description: 'Fietsen is verschrikkelijk als het regent.'}
			],
			votes: [
				{userId: 3  , opinion: 'yes'},
				{userId: 2  , opinion: 'no'},
				{userId: 4  , opinion: 'yes'},
				{userId: 10 , opinion: 'yes'},
				{userId: 11 , opinion: 'abstain'},
				{userId: 12 , opinion: 'no'},
				{userId: 21 , opinion: 'yes'},
				{userId: 6  , opinion: 'yes'},
				{userId: 8  , opinion: 'no'}
			]
		}, {
			id               : 2,
			startDate        : moment(today).subtract(10, 'days'),
			title            : 'Boomloze wijk',
			summary          : 'Bomen geven troep en nemen licht weg. Uit de grond ermee!',
			description      : 'Al die boomknuffelaars die vast willen houden aan het verleden. Tijd voor een frisse wind! Alle bomen de grond uit, en een hoge muur om alle parken heen, zodat vallende bladeren geen probleem meer zijn!',
			argumentsAgainst : [
				{userId: 19, sentiment: 'against' , description: 'Bomen zijn goed voor mensen, en zuiveren de lucht.'},
				{userId: 30, sentiment: 'against' , description: 'Dit is een hellend vlak. Wat gaat dit betekenen voor de struiken?'}
			],
			votes            : [
				{userId: 2  , opinion: 'yes'},
				{userId: 4  , opinion: 'no'},
				{userId: 5  , opinion: 'no'},
				{userId: 7  , opinion: 'no'},
				{userId: 8  , opinion: 'abstain'},
				{userId: 9  , opinion: 'yes'},
				{userId: 11 , opinion: 'yes'},
				{userId: 13 , opinion: 'no'},
				{userId: 18 , opinion: 'no'},
				{userId: 25 , opinion: 'yes'},
				{userId: 26 , opinion: 'abstain'},
				{userId: 28 , opinion: 'no'},
				{userId: 29 , opinion: 'yes'},
				{userId: 30 , opinion: 'no'}
			]
		}
	]},
	{id : 3  , complete : 1 , role : 'member'   , email : 'tjoekbezoer+member@gmail.com' , password : 'member'       , firstName : 'Jennifer'  , lastName : 'Alexander' , gender : 'female' ,  zipCode : null, ideas :[
		{
			id          : 3,
			startDate   : moment(today).subtract(6, 'days'),
			title       : 'Markt uitbreiden',
			summary     : 'Er moet plek zijn voor twee groentemannen!',
			description : 'De groenteman die er nu staat is veel te duur. Ik wil goedkopere appels, dus er moet concurrentie komen.',
			votes: [
				{userId: 15 , opinion: 'no'},
				{userId: 7  , opinion: 'no'},
				{userId: 19 , opinion: 'yes'},
				{userId: 21 , opinion: 'yes'},
				{userId: 5  , opinion: 'abstain'},
				{userId: 8  , opinion: 'abstain'},
				{userId: 2  , opinion: 'no'}
			]
		}
	]},
	// User 4 validation is skipped, see above.
	{id : 4  , complete : 0 , role : 'anonymous' , email : null                          , password : 'anon'         , firstName : null        , lastName : null        , gender : 'male'   , zipCode : '1051 RL'} ,
	{id : 5  , complete : 1 , role : 'member'    , email : 'jedwards2@statcounter.com'   , password : 'QoPNQ8AddeD'  , firstName : 'Jane'      , lastName : 'Edwards'   , gender : 'female' , zipCode : null}      ,
	{id : 6  , complete : 1 , role : 'member'    , email : 'jcole3@skype.com'            , password : 'vPb2ycQFKt8'  , firstName : 'Justin'    , lastName : 'Cole'      , gender : 'male'   , zipCode : null}      ,
	{id : 7  , complete : 1 , role : 'member'    , email : 'crice1@nsw.gov.au'           , password : 'ZrY7tsEhlv'   , firstName : 'Sean'      , lastName : 'Scott'     , gender : 'male'   , zipCode : null}      ,
	{id : 8  , complete : 1 , role : 'member'    , email : 'pperkins8@springer.com'      , password : 'ra4UILqrctwq' , firstName : 'Laura'     , lastName : 'Kim'       , gender : 'female' , zipCode : null}      ,
	{id : 9  , complete : 1 , role : 'member'    , email : 'drose6@netscape.com'         , password : 'fJvrKcEKn'    , firstName : 'Donald'    , lastName : 'Rose'      , gender : 'male'   , zipCode : '1050 GH'} ,
	{id : 10 , complete : 1 , role : 'member'    , email : 'jgreene7@uol.com.br'         , password : 'ItNPABxwyj6'  , firstName : 'Joe'       , lastName : 'Greene'    , gender : 'male'   , zipCode : null}      ,
	{id : 11 , complete : 0 , role : 'anonymous' , email : null                          , password : null           , firstName : null        , lastName : null        , gender : 'female' , zipCode : '1053 BM'} ,
	{id : 12 , complete : 1 , role : 'member'    , email : 'amilleru@jugem.jp'           , password : 'tHZn7Q'       , firstName : 'Albert'    , lastName : 'Miller'    , gender : 'male'   , zipCode : null}      ,
	{id : 13 , complete : 1 , role : 'member'    , email : 'cfowlerv@deliciousdays.com'  , password : '7HMeZ7DGGksV' , firstName : 'Christine' , lastName : 'Fowler'    , gender : 'female' , zipCode : null}      ,
	{id : 14 , complete : 1 , role : 'member'    , email : 'jhughesw@netlog.com'         , password : 'a69GBf7GsE4'  , firstName : 'Jimmy'     , lastName : 'Hughes'    , gender : 'male'   , zipCode : '1050 JK'} ,
	{id : 15 , complete : 1 , role : 'member'    , email : 'ccarrx@moonfruit.com'        , password : 'I8ireC3iOP'   , firstName : 'Carlos'    , lastName : 'Carr'      , gender : 'male'   , zipCode : '1054 WK'} ,
	{id : 16 , complete : 1 , role : 'member'    , email : 'jfostery@harvard.edu'        , password : 'kb1KeoZc8'    , firstName : 'Jessica'   , lastName : 'Foster'    , gender : 'female' , zipCode : '1050 ER'} ,
	{id : 17 , complete : 1 , role : 'member'    , email : 'shawkinsz@google.com.au'     , password : 'vWSqV8nB'     , firstName : 'Steven'    , lastName : 'Hawkins'   , gender : 'male'   , zipCode : '1051 AB'} ,
	{id : 18 , complete : 1 , role : 'member'    , email : 'mjacobs10@chronoengine.com'  , password : '63uCZrurs'    , firstName : 'Michelle'  , lastName : 'Jacobs'    , gender : 'female' , zipCode : null}      ,
	{id : 19 , complete : 1 , role : 'member'    , email : 'leader@nasa.gov.us'          , password : 'rEY06Uly4X'   , firstName : 'Maria'     , lastName : 'Parker'    , gender : 'female' , zipCode : null}      ,
	{id : 20 , complete : 1 , role : 'member'    , email : 'madeup@somewhere.com'        , password : 'ybfDLt36NMM'  , firstName : 'Beverly'   , lastName : 'Black'     , gender : 'female' , zipCode : null}      ,
	{id : 21 , complete : 0 , role : 'anonymous' , email : null                          , password : null           , firstName : null        , lastName : null        , gender : 'female' , zipCode : '1050 FG'} ,
	{id : 22 , complete : 1 , role : 'member'    , email : 'jjones14@hp.com'             , password : 'PJxXmeA5XAd'  , firstName : 'Janet'     , lastName : 'Jones'     , gender : 'female' , zipCode : null}      ,
	{id : 23 , complete : 0 , role : 'anonymous' , email : null                          , password : null           , firstName : null        , lastName : null        , gender : 'female' , zipCode : '1051 TH'} ,
	{id : 24 , complete : 1 , role : 'member'    , email : 'jsmith16@cnbc.com'           , password : 'X6aD06u'      , firstName : 'Janet'     , lastName : 'Smith'     , gender : 'female' , zipCode : null}      ,
	{id : 25 , complete : 1 , role : 'member'    , email : 'fwatson17@alibaba.com'       , password : 'WSeqnH'       , firstName : 'Frances'   , lastName : 'Watson'    , gender : 'female' , zipCode : null}      ,
	{id : 26 , complete : 1 , role : 'member'    , email : 'cjordan18@lulu.com'          , password : 'mRHoBGu1yrKm' , firstName : 'Clarence'  , lastName : 'Jordan'    , gender : 'male'   , zipCode : null}      ,
	{id : 27 , complete : 1 , role : 'member'    , email : 'resistance@underground.fr'   , password : 'E1amNfG'      , firstName : 'Debra'     , lastName : 'Ferguson'  , gender : 'female' , zipCode : null}      ,
	{id : 28 , complete : 1 , role : 'member'    , email : 'lhughes1a@marriott.com'      , password : 'ruj44zW9Hgn'  , firstName : 'Lois'      , lastName : 'Hughes'    , gender : 'female' , zipCode : null}      ,
	{id : 29 , complete : 1 , role : 'member'    , email : 'jwest1b@hugedomains.com'     , password : '3esoK36QCnf8' , firstName : 'Jennifer'  , lastName : 'West'      , gender : 'female' , zipCode : null}      ,
	{id : 30 , complete : 1 , role : 'member'    , email : 'jhill1c@4shared.com'         , password : '9erzgsH'      , firstName : 'Judy'      , lastName : 'Hill'      , gender : 'female' , zipCode : null}      ,
	{id : 31 , complete : 1 , role : 'member'    , email : 'estone1d@baidu.com'          , password : '8Vh1vixS'     , firstName : 'Earl'      , lastName : 'Stone'     , gender : 'male'   , zipCode : null}
];