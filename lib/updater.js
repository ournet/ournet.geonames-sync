'use strict';

var debug = require('debug')('geonames-sync');
var parser = require('./parser');
var utils = require('./utils');
var Promise = utils.Promise;
var downloader = require('./downloader');
var Data = require('./data');
var lineReader = require('line-reader');
var logger = require('./logger');
var control = require('./control');

function cbTrue(cb) {
	return cb(true);
}

exports.update = function (countries) {
	return exports.modifications(countries)
		.then(function () {
			return exports.alternateNamesModifications()
				.then(function () {
					return exports.deletes();
				});
		});
};

exports.modifications = function (countries) {
	var date = new Date();
	date.setDate(date.getDate() - 1);

	var filename = 'modifications-' + utils.formatDate(date) + '.txt';

	debug('processing modifications', filename);

	return downloader.file(filename)
		.then(function (file) {
			return new Promise(function (resolve) {
				lineReader.eachLine(file, function (line, last, cb) {
					var place = parser.geoname(line);
					cb = cbTrue.bind(null, cb);
					if (!place) {
						logger.warn('No place', {
							line: line
						});
						return cb();
					}
					if (countries.indexOf(place.country_code) < 0) {
						return cb();
					}
					debug('place', place.id, place.name);

					Promise.delay(1000 * 0.2).then(function () {

						Data.access.place(place.id)
							.then(function (dbplace) {
								// place exists
								if (dbplace) {
									if (countries.indexOf(place.country_code) < 0 || ['P', 'A'].indexOf(place.feature_class) < 0 || (place.feature_class === 'A' && place.feature_code !== 'ADM1')) {
										//deleting
										if (!place.population || place.population < 100) {
											Data.control.deletePlace(place.id).then(function () {
												logger.warn('Deleted place', place);
											});
										}
										return cb(true);
									} else {
										//updating
										place.alternatenames = dbplace.alternatenames;
										control.putPlace(place)
											.then(cb, function (error) {
												logger.error(error.message, error);
												cb(true);
											});
									}
								} else {
									//put
									if (countries.indexOf(place.country_code) < 0 || ['P', 'A'].indexOf(place.feature_class) < 0 || place.feature_class === 'A' && place.feature_code !== 'ADM1') {
										//console.log('no supported place: ', place.id, place.country_code);
										return cb(true);
									}

									delete place.alternatenames;
									return control.putPlace(place)
										.then(cb, function (error) {
											logger.error(error.message, error);
											cb(true);
										});
								}
							});
					});
				}).then(resolve);
			});
		});
};

exports.alternateNamesModifications = function () {
	var date = new Date();
	date.setDate(date.getDate() - 1);

	var filename = 'alternateNamesModifications-' + utils.formatDate(date) + '.txt';

	debug('processing alternatenames', filename);

	return downloader.file(filename)
		.then(function (file) {
			debug('downloaded file', filename);
			return new Promise(function (resolve) {
				lineReader.eachLine(file, function (line, last, cb) {
					cb = cbTrue.bind(null, cb);
					var name = parser.alternatename(line);
					//console.log(name);
					Promise.delay(1000)
						.then(function () {
							return control.setAltName(name.geonameid, name)
								.then(cb, function (error) {
									logger.error(error.message, error);
									cb(true);
								});
						});
				}).then(resolve);
			});
		});
};

exports.deletes = function () {
	var date = new Date();
	date.setDate(date.getDate() - 1);

	var filename = 'deletes-' + utils.formatDate(date) + '.txt';

	debug('processing deletes', filename);

	return downloader.file(filename)
		.then(function (file) {
			debug('downloaded file', filename);
			return new Promise(function (resolve) {
				lineReader.eachLine(file, function (line, last, cb) {
					cb = cbTrue.bind(null, cb);
					if (!line) {
						return cb(true);
					}
					var id = parseInt(line.split('\t')[0]);
					Promise.delay(1000)
						.then(function () {
							return Data.access.place(id)
								.then(function (place) {
									if (!place) {
										return cb(true);
									}
									if (place.population > 1000) {
										logger.error('Not deleted place', place);
										return cb(true);
									}
									return Data.control.deletePlace(place.id)
										.then(function () {
											logger.warn('Deleted place', place);
											cb(true);
										}, function (error) {
											logger.error(error.message, error);
											cb(true);
										});
								});
						});
				}).then(resolve);
			});
		});
};
