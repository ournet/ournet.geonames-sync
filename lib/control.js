'use strict';

// var debug = require('debug')('geonames-sync');
var utils = require('./utils');
var Promise = utils.Promise;
var _ = utils._;
var Data = require('./data');
var logger = require('./logger');

function formatNames(alternatenames, name) {
	var names = alternatenames && alternatenames.split(';') || [];
	//console.log('names: ', place.alternatenames);
	var newnames = {};
	names.forEach(function (n) {
		var nm = {
			name: n.substr(0, n.length - 4),
			language: n.substr(n.length - 3, 2)
		};
		if (nm.language === name.language && name.isPreferred && !name.isShort && !name.isHistoric && !name.isColloquial) {
			newnames[name.language] = name.name;
			return name;
		}
		if (!newnames[nm.language]) {
			newnames[nm.language] = nm.name;
		}
		return nm;
	});
	if (!newnames[name.language]) {
		newnames[name.language] = name.name;
	}
	alternatenames = [];
	for (var prop in newnames) {
		alternatenames.push(newnames[prop] + '[' + prop + ']');
	}
	alternatenames = alternatenames.join(';');

	return alternatenames;
}

exports.setAltName = function (geonameid, newnames) {
	if (!newnames) {
		return Promise.resolve(false);
	}
	newnames = Array.isArray(newnames) ? newnames : [newnames];
	//console.log('getting place: ', name.name);
	return Data.access.place(geonameid)
		.then(function (place) {
			if (!place) {
				return false;
			}
			//console.log('got place');
			var orignames = place.alternatenames;
			newnames.forEach(name => {
				place.alternatenames = formatNames(place.alternatenames, name);
			});
			// console.log('from', orignames, ' > ', place.alternatenames);
			if (place.alternatenames.length < 1 || place.alternatenames === orignames) {
				return false;
			}
			//console.log('updating place');
			return exports.updatePlace(place)
				.then(function (dbPlace) {
					logger.info('Updated place names', { id: place.id, name: place.name, names: place.alternatenames });
					return dbPlace;
				});
		});
};

exports.putPlace = function (place) {

	Object.keys(place).forEach(function (prop) {
		var value = place[prop];
		if (value === null || value === undefined || (_.isString(value) && value.length < 1)) {
			delete place[prop];
		}
	});

	// debug('updating place', place);

	return Data.control.putPlace(place)
		.then(function (nplace) {
			logger.warn('put place', place.id, place.name, place.country_code);
			return nplace;
		});
};

exports.updatePlace = function (place) {

	Object.keys(place).forEach(function (prop) {
		var value = place[prop];
		if (_.isString(value) && value.length < 1) {
			delete place[prop];
		}
	});

	return Data.control.updatePlace(place)
		.then(function (nplace) {
			logger.warn('updated place', place.id, place.name, place.country_code);
			return nplace;
		});
};

module.exports = _.assign({}, utils, exports);
