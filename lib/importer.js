'use strict';

var debug = require('debug')('geonames-sync');
var parser = require('./parser');
var utils = require('./utils');
var Promise = utils.Promise;
var downloader = require('./downloader');
var Data = require('./data');
var eachLine = require('line-reader').eachLine;
var logger = require('./logger');
var control = require('./control');
var axios = require('axios');
var indexPlace = require('./index_place').index;
var unindexPlace = require('./index_place').unindex;

const REGIONS = {};

function getRegion(place) {
    if (place.feature_class === 'P') {
        return REGIONS[place.admin1_code];
    }
}

function getAltNames(id) {
    return axios.get('http://www.geonames.org/getJSON?id=' + id, { timeout: 1000 * 5 })
        .then(response => {
            // console.log('response', response);
            let names = response.data.alternateNames || [];
            names = names.map(name => parser.alternatenameFronJson(name)).filter(name => !!name);

            var nnames = {};

            names.forEach(name => {
                if (name.isShort || name.isHistoric || name.isColloquial) {
                    return;
                }
                name.geonameid = id;

                if (nnames[name.language]) {
                    if (name.isPreferred) {
                        nnames[name.language] = name;
                    }
                } else {
                    nnames[name.language] = name;
                }
            });

            return Object.keys(nnames).map(lang => nnames[lang]);
        });
}

function genericImport(file, countryCode, passCondition, onAdded) {
    return eachLine(file, (line, last, cb) => {
        // console.log('line', line);
        var place = parser.geoname(line);
        if (!place) {
            logger.warn('No place', {
                line: line
            });
            return cb();
        }
        if (passCondition && !passCondition(place)) {
            return cb();
        }
        // if (!start) {
        //     if (place.id === 298442) {
        //         start = true;
        //     } else {
        //         return cb();
        //     }
        // }
        if (place.country_code.toLowerCase() !== countryCode) {
            return cb();
        }
        debug('place', place.id, place.name);

        //put
        if (['P', 'A'].indexOf(place.feature_class) < 0 || place.feature_class === 'A' && place.feature_code !== 'ADM1') {
            debug('no supported place: ', place.id, place.country_code);
            return cb();
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
                .then(cb)
                .catch(function (error) {
                    logger.error(error.message, error);
                    cb();
                });

        });
    });
}

function importPlaces(file, countryCode) {
    logger.warn('IMPORT PLACES');
    const ids = (process.env.PARTS || '').split(/[,;|\s-]+/g).map(item => parseInt(item));

    function importByParts(startId, endId) {
        logger.warn('START_ID', startId, 'END_ID', endId);
        return genericImport(file, countryCode, function (place) {
            if (startId === 0 && endId === 0) {
                return true;
            }
            if (startId > 0 && endId > 0) {
                return place.id >= startId && place.id <= endId;
            }
            if (startId > 0) {
                return place.id >= startId;
            }
            return place.id <= endId;
        });
    }

    const tasks = [];
    ids.forEach((startId, index) => {
        tasks.push(importByParts(startId, (ids.length - 1 < index ? 0 : ids[index + 1])));
    });

    return Promise.all(tasks);
}

function importRegions(file, countryCode) {
    logger.warn('IMPORT REGIONS');
    return genericImport(file, countryCode, function (place) {
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
        .then(function (file) {
            return importRegions(file, countryCode).then(() => importPlaces(file, countryCode));
        });
}
