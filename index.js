(function(require, module) {
	'use strict';

	var request = require('request-promise');
	var moment = require('moment');

	function checkAllReplications(serverUrl, done) {

		if (serverUrl[serverUrl.length-1] !== '/') {
			serverUrl += '/';
		}

		console.log('Checking replication for: ' + serverUrl);

		var replicatorUrl = serverUrl + '_replicator';
		return getAllReplicationDocs(replicatorUrl)
			.then(function(replications) {
				return replications.map(function(replication) {
					return checkReplication(replication, replicatorUrl);
				}).reduce(function(current, next) {
					return current.then(next);
				}, Promise.resolve());
			})
			.then(done, function(err) {
				console.error(err);
				done();
			});
	}

	function getAllReplicationDocs(replicatorUrl) {
		console.log('Searching for replications');
		return request({
			uri: replicatorUrl + '/_all_docs?include_docs=true',
			json: true
		})
			.then(function(result) {
				var rows = result.rows.filter(function(row) { return row.id !== '_design/_replicator' });
				var replications = rows.map(function(row) { return row.doc; });
				console.log('Found ' + replications.length + ' replications');
				return replications;
			});
	}

	function checkReplication(replication, replicatorUrl) {
		console.log('Checking ' + replication._id);
		if (replication._replication_state === 'error') {
			console.log(' Replication in error state: ' + replication._replication_state_reason);
			return recreateReplication(replication, replicatorUrl);
		}

		var lastUpdate = moment(replication._replication_state_time);
		if (moment().diff(lastUpdate, 'hours', true) > 1) {
			console.log(' Replication not updated in 1h: ' + replication._replication_state_reason);
			return recreateReplication(replication, replicatorUrl);
		}

		console.log(replication._id + ' ok');
	}

	function recreateReplication(replication, replicatorUrl) {
		console.log(' Deleting ' + replication._id);
		return request({
			uri: replicatorUrl + '/' + replication._id + '?rev=' + replication._rev,
			method: 'DELETE'
		})
			.then(function() {
				console.log(' ' + replication._id + ' deleted');
				delete replication._rev;
				delete replication._replication_state;
				delete replication._replication_state_time;
				delete replication._replication_state_reason;
				delete replication._replication_id;

				console.log(' Recreating ' + replication._id);
				return request({
					uri: replicatorUrl,
					method: 'POST',
					body: replication,
					json: true
				});
			})
			.then(function() {
				console.log(' ' + replication._id + ' recreated');
			});
	}

	module.exports = checkAllReplications;
}(require, module));