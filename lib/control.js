'use strict';

var utils = require('./utils');
var Promise = utils.Promise;
var _ = utils._;
var Data = require('./data');
var logger = require('./logger');

exports.setAltName = function(name) {
	if (!name || !utils.isValidAltName(name.name, name.language)) {
		return Promise.resolve(false);
	}
	name.name = utils.standardText(name.name, name.language);
	//console.log('getting place: ', name.name);
	return Data.access.place(name.geonameid)
		.then(function(place) {
			if (!place) {
				return false;
			}
			//console.log('got place');
			var orignames = place.alternatenames;
			var names = place.alternatenames && place.alternatenames.split(';') || [];
			//console.log('names: ', place.alternatenames);
			var newnames = {};
			names = names.map(function(n) {
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
			place.alternatenames = [];
			for (var prop in newnames) {
				place.alternatenames.push(newnames[prop] + '[' + prop + ']');
			}
			place.alternatenames = place.alternatenames.join(';');
			if (place.alternatenames.length < 1 || place.alternatenames === orignames) {
				return false;
			}
			//console.log('updating place');
			return exports.updatePlace(place)
				.then(function() {
					logger.info('Updated place names', { id: place.id, name: place.name, names: place.alternatenames });
					return true;
				});
		});
};

exports.putPlace = function(place) {

	Object.keys(place).forEach(function(prop) {
		var value = place[prop];
		if (value === null || (_.isString(value) && value.length < 1)) {
			delete place[prop];
		}
	});

	if (!place.admin1_code || (place.feature_class === 'A' && place.feature_code !== 'ADM1')) {
		return Promise.resolve(null);
	}

	return Data.control.putPlace(place);
};

exports.updatePlace = function(place) {

	Object.keys(place).forEach(function(prop) {
		var value = place[prop];
		if (_.isString(value) && value.length < 1) {
			delete place[prop];
		}
	});

	if (!place.admin1_code || (place.feature_class === 'A' && place.feature_code !== 'ADM1')) {
		return Promise.resolve(null);
	}

	return Data.control.updatePlace(place);
};

module.exports = _.assign({}, utils, exports);
