'use strict';

require('dotenv').load();

var debug = require('debug')('geonames-sync');
var utils = require('./utils');
var countries = utils.supportedCountries();
var logger = require('./logger');
var updater = require('./updater');

process.on('uncaughtException', function(err) {
	logger.error('uncaughtException: ' + err.message, err);
});

function update() {
	debug('start updater');
	return updater.update(countries);
}

switch (process.env.ACTION) {
	case 'put':
		return null;
	default:
		return update();
}
