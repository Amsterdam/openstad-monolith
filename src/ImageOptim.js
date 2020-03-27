// Optim child process manager
// ---------------------------
const cp  = require('child_process');
const log = require('debug')('app:optim');

var child;
var retries        = 0;

var queue          = [];
var readyToReceive = false;

var id             = 0;

var self = module.exports = {
	start: function() {

    // nu ff niet
    return;
    
		if( child ) return;
		
		child = cp.fork(__dirname+'/optim/index.js', [], {
			silent: true
		});
		
		child.on('message', onChildMessage);
		child.stdout.on('data', onChildLog);
		child.stderr.on('data', onChildError);
		child.on('exit', onChildExit);
	},
	
	processIdea: function( ideaId ) {
		self._addTask({
			action: 'processIdea',
			params: {
				id: ideaId
			}
		});
	},
	
	processArticle: function( articleId ) {
		self._addTask({
			action: 'processArticle',
			params: {
				id: articleId
			}
		});
	},
	
	_addTask: function( task ) {
		if( !task.action ) {
			throw Error('Task has no action name');
		}
		
		task.id = ++id;
		queue.push(task);
		
		log(`task queued: ${task.id}`);
		processQueue();
	}
};

function processQueue() {
	if( !readyToReceive || !queue.length ) {
		return;
	}
	
	var task = queue.shift();
	child.send(task);
}

// Child process events
// --------------------
function onChildMessage( task ) {
	if( task.action ) {
		log(`task completed: ${task.id}`);
	}
	
	retries        = 0;
	readyToReceive = true;
	processQueue();
}
function onChildLog( data ) {
	log(String(data).trim());
}
function onChildError( data ) {
	console.error('Image optim: '+String(data).trim());
}
function onChildExit( signal ) {
	console.error(`Image optim process exited with signal ${signal}`);
	
	child = null;
	if( retries++ > 5 ) {
		return console.error('Gave up spawning image optim process');
	}
	setTimeout(self.start, 500);
}
