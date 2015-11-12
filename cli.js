#!/usr/bin/env node

(function(require) {
	var args = require('optimist').argv;

	require('./index.js')(args.url, function() {
		process.exit();
	});
}(require));