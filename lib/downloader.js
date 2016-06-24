'use strict';

var utils = require('./utils');
var Promise = utils.Promise;
var request = require('request');
var path = require('path');
var fs = require('fs');
var fse = Promise.promisifyAll(require('fs-extra'));
var AdmZip = require('adm-zip');
var TEMP_DIR = process.env.TEMP_DIR || '/tmp';
var debug = require('debug')('geonames-sync');
var internal = {};

exports.country = function(country_code) {
	country_code = country_code.toUpperCase();
	return internal.downloadUnzip(country_code);
};

exports.alternateNames = function() {
	return internal.downloadUnzip('alternateNames');
};

internal.unzip = function(file, output) {
	return fse.removeAsync(output)
		.then(function() {
			return (new AdmZip(file)).extractAllTo(output, true);
		});
};

internal.downloadUnzip = function(name) {
	return internal.downloadFile(name + '.zip')
		.delay(1000 * 2)
		.then(function() {
			return internal.unzip(path.join(TEMP_DIR, name + '.zip'), path.join(TEMP_DIR, name));
		});
};

exports.file = internal.downloadFile = function(filename) {
	return new Promise(function(resolve, reject) {
		var file = path.join(TEMP_DIR, filename);
		fse.removeAsync(file)
			.then(function() {
				var url = 'http://download.geonames.org/export/dump/' + filename;
				debug('downloading url', url);
				request({ url: url })
					.on('end', function() {
						resolve(file);
					})
					.on('error', reject)
					.pipe(fs.createWriteStream(file));
			});
	});
};
