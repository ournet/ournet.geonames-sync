'use strict';

var logger = require('./logger');

exports.geoname = function(line) {
	if (!line) {
		return null;
	}
	var fields = line.split('\t');
	if (fields.length < 19) {
		logger.error('Geonames fields<19', line);
		return null;
	}
	var geoname = {
		id: parseInt(fields[0]),
		name: fields[1].trim(),
		asciiname: fields[2].trim(),
		alternatenames: fields[3],
		latitude: parseFloat(fields[4]),
		longitude: parseFloat(fields[5]),
		feature_class: fields[6].trim().toUpperCase(),
		feature_code: fields[7].trim().toUpperCase(),
		country_code: fields[8].trim().toLowerCase(),
		admin1_code: fields[10].trim().toLowerCase(),
		admin2_code: fields[11],
		admin3_code: fields[12],
		population: parseInt(fields[14]) || 0,
		elevation: parseInt(fields[15]) || null,
		dem: parseInt(fields[16]),
		timezone: fields[17],
		modification_date: fields[18]
	};

	return geoname;
};

exports.alternatename = function(line) {
	if (!line) {
		return null;
	}
	var fields = line.split('\t');
	if (fields.length < 8) {
		logger.error('Altname fields<8', line);
		return null;
	}
	var name = {
		id: parseInt(fields[0]),
		geonameid: parseInt(fields[1]),
		language: fields[2].trim().toLowerCase(),
		name: fields[3].trim(),
		isPreferred: fields[4] === '1',
		isShort: fields[5] === '1',
		isColloquial: fields[6] === '1',
		isHistoric: fields[7] === '1'
	};
	if (name.language.length !== 2) {
		return null;
	}
	return name;
};

exports.alternatenameFronJson = function(data) {
	if (!data) {
		return null;
	}

	var name = {
		language: data.lang && data.lang.toLowerCase(),
		name: data.name,
		isPreferred: data.isPreferredName,
		isShort: data.isShortName,
		isColloquial: data.isColloquialName,
		isHistoric: data.isHistoricName
	};
	if (!name.language || name.language.length !== 2) {
		return null;
	}
	return name;
};
