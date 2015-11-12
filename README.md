# fix-couch-replications

Utility that examines all documents in the `_replicator` database for CouchDb and recreates any that either have an error or have not updated in the last hour.

## Installation

    npm install -g fix-couch-replications

## Usage

    fix-couch-replications --url http://user:pass@localhost:5984
