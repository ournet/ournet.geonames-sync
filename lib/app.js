'use strict';

require('dotenv').load();

var debug = require('debug')('geonames-sync');
var utils = require('./utils');
var countries = utils.supportedCountries();
var logger = require('./logger');
var updater = require('./updater');
var importer = require('./importer');

process.on('uncaughtException', function (err) {
	logger.error('uncaughtException: ' + err.message, err);
});

function update() {
	logger.warn('start updater');
	return updater.update(countries)
		.then(function () {
			logger.warn('END UPDATE');
		})
		.catch(function (error) {
			logger.error(error);
		});
}

function importCountry() {
	var country = process.env.COUNTRY;
	logger.warn('start import country', country);
	if (!country) {
		return utils.Promise.resove();
	}
	return importer.importCountry(country)
		.then(function () {
			logger.warn('END IMPORT');
		})
		.catch(function (error) {
			logger.error(error);
		});
}

switch (process.env.ACTION) {
	case 'import':
		return importCountry();
	default:
		return update();
}
