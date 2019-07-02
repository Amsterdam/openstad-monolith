var config = {
	apps : [],
	deploy : {}
};

addApp('stemvan', [{
	appName    : 'stem-staging',
	deployName : 'staging',
	remotePath : '/var/www/stemvanwest.openstadsdeel.nl/www',
	ref        : 'origin/staging'
}, {
	appName    : 'stem-prod',
	deployName : 'production',
	remotePath : '/var/www/stemvanwest.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stem-centrum',
	deployName : 'production_centrum',
	remotePath : '/var/www/stemvancentrum.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stem-oost',
	deployName : 'production_oost',
	remotePath : '/var/www/stemvanoost.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stem-nieuwwest',
	deployName : 'production_nieuwwest',
	remotePath : '/var/www/stemvannieuwwest.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stem-zuidoost',
	deployName : 'production_zuidoost',
	remotePath : '/var/www/stemvanzuidoost.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stem-noord',
	deployName : 'production_noord',
	remotePath : '/var/www/stemvannoord.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stem-zuid',
	deployName : 'production_zuid',
	remotePath : '/var/www/stemvanzuid.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stem-westbegroot',
	deployName : 'production_westbegroot',
	remotePath : '/var/www/westbegroot.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'centrumbegroot-production',
	deployName : 'production_centrumbegroot',
	remotePath : '/var/www/centrumbegroot.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'centrumbegroot-staging',
	deployName : 'staging_centrumbegroot',
	remotePath : '/var/www/centrumbegroot.staging.openstadsdeel.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stem-zorggoedvooronzestad',
	deployName : 'production_zorggoedvooronzestad',
	remotePath : '/var/www/zorggoedvooronzestad.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'staging-zorggoedvooronzestad',
	deployName : 'staging_zorggoedvooronzestad',
	remotePath : '/var/www/zorggoedvooronzestad.openstadsdeel.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'demo-westbegroot-phase-1',
	deployName : 'demo_westbegroot_phase_1',
	remotePath : '/var/www/westbegroot-phase-1.demo.openstadsdeel.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'demo-westbegroot-phase-2',
	deployName : 'demo_westbegroot_phase_2',
	remotePath : '/var/www/westbegroot-phase-2.demo.openstadsdeel.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'demo-zorggoedvooronzestad-phase-1',
	deployName : 'demo_zorggoedvooronzestad_phase_1',
	remotePath : '/var/www/zorggoedvooronzestad-phase-1.demo.openstadsdeel.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'demo-zorggoedvooronzestad-phase-2',
	deployName : 'demo_zorggoedvooronzestad_phase_2',
	remotePath : '/var/www/zorggoedvooronzestad-phase-2.demo.openstadsdeel.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'demo-zorggoedvooronzestad-phase-3',
	deployName : 'demo_zorggoedvooronzestad_phase_3',
	remotePath : '/var/www/zorggoedvooronzestad-phase-3.demo.openstadsdeel.nl/www',
	ref        : 'origin/master'
}]);

addApp('stemtool', [{
	appName    : 'stemtool-javabrug',
	deployName : 'production_javabrug',
	remotePath : '/var/www/javabrug.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stemtool-kademuren',
	deployName : 'production_kademuren',
	remotePath : '/var/www/kademuren.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'kademuren-staging',
	deployName : 'staging_kademuren',
	remotePath : '/var/www/kademuren.staging.openstadsdeel.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'stemtool-kareldoorman',
	deployName : 'production_kareldoorman',
	remotePath : '/var/www/kareldoorman.amsterdam.nl/www',
	ref        : 'origin/master'
}, {
	appName    : 'demo-kareldoorman',
	deployName : 'demo_kareldoorman',
	remotePath : '/var/www/kareldoorman.demo.openstadsdeel.nl/www',
	ref        : 'origin/master'
}]);

module.exports = config;

// Helper
// ------
// Automates configuring production deployments to keep it DRY.
function addApp( env, app ) {
	if( app instanceof Array ) {
		return app.forEach(addApp.bind(null, env));
	}
	if( app.constructor !== Object ) {
		return;
	}
	
	var env = {
		NODE_ENV                   : env,
		NODE_APP_INSTANCE          : 'production',
		BLUEBIRD_LONG_STACK_TRACES : 1,
		BLUEBIRD_WARNINGS          : 0
	};
	
	config.apps.push({
		name         : app.appName,
		script       : 'server.js',
		node_args    : '--use-strict',
		instance_var : 'INSTANCE_ID',
		env          : env
	});
	config.deploy[app.deployName] = {
		user          : 'daan',
		host          : '185.110.174.172',
		path          : app.remotePath,
		
		ref           : app.ref,
		repo          : 'git@github.com:Amsterdam/openstad-monolith.git',
		
		env           : env,
		'post-deploy' : `git submodule init && git submodule update && npm install && node migrate.js && pm2 startOrRestart ecosystem.config.js --only ${app.appName} --update-env`
	};
}



