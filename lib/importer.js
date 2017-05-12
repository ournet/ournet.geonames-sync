'use strict';

const debug = require('debug')('geonames-sync');
const parser = require('./parser');
const utils = require('./utils');
const Promise = utils.Promise;
const downloader = require('./downloader');
const Data = require('./data');
const eachLine = require('line-reader').eachLine;
const logger = require('./logger');
const control = require('./control');
const indexPlace = require('./index_place').index;
const unindexPlace = require('./index_place').unindex;
const AltNames = require('./altnames');
const lineReader = require('./linereader');
let altNamesFile;
const REGIONS = {};

function getRegion(place) {
    if (place.feature_class === 'P') {
        return REGIONS[place.admin1_code];
    }
}

function getAltNames(id) {
    return AltNames.geonameNames(altNamesFile, id);
}

function genericImport(file, fileOptions, countryCode, passCondition, onAdded) {
    return new Promise((resolveImport, rejectImport) => {
        const linesReader = new lineReader.LinesReader();

        linesReader
            .on('error', rejectImport)
            .on('end', resolveImport)
            .on('line', function (line, getNextLine) {
                var place = parser.geoname(line);
                if (!place) {
                    logger.warn('No place', {
                        line: line
                    });
                    return getNextLine();
                }
                if (passCondition && !passCondition(place)) {
                    return getNextLine();
                }
                if (place.country_code.toLowerCase() !== countryCode) {
                    return getNextLine();
                }
                debug('place', place.id, place.name);

                //put
                if (['P', 'A'].indexOf(place.feature_class) < 0 || place.feature_class === 'A' && place.feature_code !== 'ADM1') {
                    debug('no supported place: ', place.id, place.country_code);
                    return getNextLine();
                }

                Promise.delay(1000 * 0).then(function () {

                    delete place.alternatenames;
                    return control.putPlace(place)
                        .then(function (dbPlace) {
                            return getAltNames(place.id).then(names => {
                                return new Promise((resolve) => {
                                    if (names && names.length) {
                                        return control.setAltName(place.id, names).then(p => resolve(p));
                                    }
                                    resolve(dbPlace);
                                }).then((dbPlace) => {
                                    if (onAdded) {
                                        onAdded(dbPlace);
                                    }
                                    if (place.feature_class === 'P') {
                                        return indexPlace(dbPlace, getRegion(dbPlace));
                                    } else {
                                        return unindexPlace(dbPlace.id);
                                    }
                                });
                            });
                        })
                        .then(getNextLine)
                        .catch(function (error) {
                            logger.error(error.message, error);
                            return getNextLine();
                        });

                });
            })
            .start(file, fileOptions);
    });
}

function importPlaces(file, countryCode) {
    logger.warn('IMPORT PLACES');
    const parts = parseInt(process.env.PARTS || 3);
    logger.info('PARTS', parts);

    if (parts < 2) {
        return genericImport(file, null, countryCode);
    }

    function importByParts(startLine, endLine) {
        logger.warn('START_LINE', startLine, 'END_LINE', endLine);
        return genericImport(file, { startLine: startLine, endLine: endLine }, countryCode);
    }

    return lineReader.getFileLines(file).then(linesCount => {
        logger.info('linesCount', linesCount);
        const step = parseInt(linesCount / parts);
        logger.info('step', step);
        const tasks = [];
        for (var i = 0; i < parts; i++) {
            tasks.push(importByParts(step * i, (i + 1) * step + 2, countryCode));
        }

        return Promise.all(tasks);
    });
}

function importRegions(file, countryCode) {
    logger.warn('IMPORT REGIONS');
    return genericImport(file, null, countryCode, function (place) {
        if (place.feature_class === 'A' && place.feature_code === 'ADM1') {
            return true;
        }
        return false;
    }, function onAdded(place) {
        if (place.feature_class === 'A' && place.feature_code === 'ADM1') {
            debug('set region', place);
            REGIONS[place.admin1_code] = place;
        }
    });
}

exports.importCountry = function (countryCode) {
    countryCode = countryCode.toLowerCase();
    // let start = false;
    return downloader.country(countryCode)
        .then(function (countryFile) {
            return downloader.langAlternateNames().then(altnamesFile => {
                altNamesFile = altnamesFile;
                return importRegions(countryFile, countryCode).then(() => importPlaces(countryFile, countryCode));
            });
        });
}
