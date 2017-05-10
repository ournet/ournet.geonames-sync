'use strict';

var utils = require('ournet.utils');
var _ = require('lodash');
var Promise = require('bluebird');
var standardText = require('standard-text');

var supportedCountries = ['md', 'ro', 'ru', 'in', 'pl', 'cz', 'hu', 'it', 'bg', 'al', 'tr'];

exports.supportedCountries = function() {
	return supportedCountries;
};

exports.standardText = standardText;

exports.isValidAltName = function(name, lang) {
	if (!_.isString(lang) || lang.length !== 2) {
		return false;
	}

	if (lang === 'ru') {
		for (var i = name.length - 1; i >= 0; i--) {
			var ch = name[i];
			if (exports.isRussianChar(ch)) {
				return true;
			}
		}
		return false;
	}

	return true;
};

exports.isValidPlace = function(place) {
	return (~supportedCountries.indexOf(place.country_code.toLowerCase())) && (place.feature_class === 'P' || place.feature_class === 'A' && place.feature_code === 'ADM1');
};

exports.isRussianChar = function(ch) {
	return (ch >= 'а' && ch <= 'я') || (ch >= 'А' && ch <= 'Я');
};

module.exports = _.assign({ _: _, Promise: Promise }, utils, exports);