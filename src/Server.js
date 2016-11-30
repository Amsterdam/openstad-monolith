var _              = require('lodash')
  , config         = require('config')
  , express        = require('express')
  , compression    = require('compression')
  , cors           = require('cors')
  , bodyParser     = require('body-parser')
  , methodOverride = require('method-override')
  , session        = require('express-session')
  , csurf          = require('csurf')
  , nunjucks       = require('nunjucks');
var util           = require('./util');
var log            = require('debug')('app:http');

var SequelizeStore = require('connect-session-sequelize')(session.Store);
var db             = require('./db');

module.exports  = {
	app: undefined,
	
	start: function( port ) {
		log('initializing...');
		this.app = express();
		this.app.set('x-powered-by', false);
		this.app.set('view engine', 'njk');
		
		this.app.use(compression());
		// this.app.use(cors());
		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({extended: true}));
		this.app.use(methodOverride(function( req, res ) {
			var method;
			if( req.body && req.body instanceof Object && '_method' in req.body ) {
				method = req.body._method;
				delete req.body._method;
			} else {
				method = req.get('X-HTTP-Method') ||
				         req.get('X-HTTP-Method-Override') ||
				         req.get('X-Method-Override');
			}
			if( method ) {
				log('method override: '+method);
			}
			return method;
		}));
		this.app.use(session({
			name              : 'amsterdam.sid',
			secret            : config.get('security.sessions.secret'),
			proxy             : true, // Trust apache reverse proxy
			resave            : false,
			unset             : 'destroy',
			saveUninitialized : false,
			store: new SequelizeStore({
				db    : db.sequelize,
				table : 'session'
			}),
			cookie: {
				httpOnly : true,
				secure   : false,
				maxAge   : 31536000000 // 1 year
			}
		}));
		// `csurf` makes non-GET requests require a CSRF token. Use `req.csrfToken()`
		// in form-rendering GET request in order to send the correct token.
		// 
		// TODO: Always sets a cookie for a user-specific token secret. Rewrite to use
		//       in-memory store?
		this.app.use(csurf());
		
		nunjucks.configure('html', {
			autoescape : true,
			watch      : false,
			express    : this.app
		});
		
		// Register statics first, because they don't require middlerware...
		this.app.use('/css', express.static('css'));
		// ... then the middleware...
		require('./middleware/session_user')(this.app);
		require('./middleware/out')(this.app);
		// ... routes...
		require('./routes')(this.app);
		// ... and error handlers always last.
		require('./middleware/error_handling')(this.app);
		
		this.app.listen(port, function() {
		  log('listening on port %s', port);
		});
	}
};