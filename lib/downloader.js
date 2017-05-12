'use strict';

const utils = require('./utils');
const Promise = utils.Promise;
const request = require('request');
const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const fse = Promise.promisifyAll(require('fs-extra'));
const AdmZip = require('adm-zip');
const TEMP_DIR = process.env.TEMP_DIR || '/tmp';
const debug = require('debug')('geonames-sync');
const readline = require('readline');
const AltNames = require('./altnames');
const internal = {};

exports.country = function (country_code) {
	country_code = country_code.toUpperCase();
	return internal.downloadUnzip(country_code).then(file => path.join(file, country_code + '.txt'));
};

exports.alternateNames = function () {
	return internal.downloadUnzip('alternateNames').then(file => path.join(file, 'alternateNames.txt'));
};

exports.langAlternateNames = function () {
	return exports.alternateNames().then(altnamesfile => {
		const file = path.join(path.dirname(altnamesfile), 'langAlternateNames.txt');
		return internal.isFileFresh(file).then(isFresh => {
			if (isFresh) {
				return file;
			}
			return fse.removeAsync(file).then(function () {
				return new Promise((resolve, reject) => {
					const output = fs.createWriteStream(file);
					readline.createInterface({
						input: fs.createReadStream(altnamesfile)
					}).on('line', line => {
						const altName = AltNames.parseLine(line);
						if (altName && altName.language && altName.language.length === 2 && utils.supportedLanguages().indexOf(altName.language) > -1) {
							output.write(line + '\n', 'utf8');
						}
					}).on('close', () => {
						output.end();
						resolve(file);
					}).on('error', reject);
				});
			});
		});
	});
};

exports.file = internal.downloadFile = function (filename) {
	debug('downloading file', filename);
	return new Promise(function (resolve, reject) {
		var file = path.join(TEMP_DIR, filename);
		fse.removeAsync(file)
			.then(function () {
				var url = 'http://download.geonames.org/export/dump/' + filename;
				debug('downloading url', url);
				request({ url: url, timeout: 1000 * 60 })
					.on('end', function () {
						resolve(file);
					})
					.on('error', reject)
					.pipe(fs.createWriteStream(file));
			});
	});
};

internal.unzip = function (file, output) {
	return fse.removeAsync(output)
		.then(function () {
			return (new AdmZip(file)).extractAllTo(output, true);
		});
};

internal.downloadUnzip = function (name, hours) {
	var folderName = path.join(TEMP_DIR, name);
	const zipName = path.join(TEMP_DIR, name + '.zip');
	return internal.isFileFresh(zipName, hours)
		.then(isFresh => {
			if (isFresh) {
				debug('file is fresh', zipName);
				return folderName;
			}
			return internal.downloadFile(name + '.zip')
				.delay(1000 * 2)
				.then(function () {
					return internal.unzip(zipName, folderName).then(function () { return folderName });
				});
		});
};

internal.isFileFresh = function (file, hours) {
	hours = hours || 6;
	// console.log(Object.keys(fs));
	return fs.statAsync(file).then(stats => stats.ctime.getTime() > Date.now() - hours * 60 * 60 * 1000).catch(() => false);
};
