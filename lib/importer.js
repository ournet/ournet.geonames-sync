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

function getAltNames(id) {
    return axios.get('http://www.geonames.org/getJSON?id=' + id, { timeout: 1000 * 5 })
        .then(response => {
            // console.log('response', response);
            let names = response.data.alternateNames || [];
            names = names.map(name => parser.alternatenameFronJson(name)).filter(name => !!name);

            const nnames = {};

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

exports.importCountry = function (countryCode) {
    countryCode = countryCode.toLowerCase();
    // let start = false;
    return downloader.country(countryCode)
        .then(function (file) {
            // debug('file', file);
            return eachLine(file, (line, last, cb) => {
                // console.log('line', line);
                var place = parser.geoname(line);
                if (!place) {
                    logger.warn('No place', {
                        line: line
                    });
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

                Promise.delay(1000 * 0.2).then(function () {

                    //put
                    if (['P', 'A'].indexOf(place.feature_class) < 0 || place.feature_class === 'A' && place.feature_code !== 'ADM1') {
                        debug('no supported place: ', place.id, place.country_code);
                        return cb();
                    }

                    delete place.alternatenames;
                    return control.putPlace(place)
                        .then(function () {
                            return getAltNames(place.id).then(names => {
                                debug('names', names);
                                if (names && names.length) {
                                    return Promise.each(names, name => control.setAltName(name)).then(() => cb());
                                }
                                cb();
                            });
                        })
                        .catch(function (error) {
                            logger.error(error.message, error);
                            cb();
                        });

                });
            });

        });
}
