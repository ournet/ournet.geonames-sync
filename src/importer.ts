
// const debug = require('debug')('geonames-sync');

import * as readline from 'readline';
import * as fs from 'fs';
import { parseGeoName, mapGeoNamePlace, getGeonameNamesById } from './geonames';
import { downloadCountry, downloadLangAlternateNames } from './downloader';
import logger from './logger';
// import { PlaceHelpers } from '@ournet/places-domain';
import { isValidPlace } from './utils';
import * as Data from './data';


import { oldAccess } from './olddata';

function importPlaces(countryCode: string, countryFile: string, altNamesFile: string) {
    return new Promise((resolveImport, rejectImport) => {

        readline.createInterface({
            input: fs.createReadStream(countryFile)
        }).on('line', line => {
            const geoname = parseGeoName(line);
            if (!geoname) {
                logger.warn('No geoname', {
                    line: line
                });
                return;
            }

            if (geoname.country_code.trim().toLowerCase() !== countryCode) {
                return;
            }

            if (!isValidPlace(geoname)) {
                return;
            }

            const place = mapGeoNamePlace(geoname);
            delete place.names;

            return oldAccess.place(place.id)
                .then((oldplace: any) => {
                    return oldplace && oldplace.alternatenames && oldplace.alternatenames.replace(/;/g, '|');
                })
                .then((oldnames: string) => {
                    if (oldnames) {
                        place.names = oldnames;
                    }
                    return Data.putPlace(place)
                        .then(() => {
                            return getGeonameNamesById(altNamesFile, place.id)
                                .then(geonames => {
                                    if (geonames && geonames.length) {
                                        return Data.setPlaceAltName(place.id, geonames);
                                    }
                                });
                        });
                });

        })
            .on('close', resolveImport)
            .on('error', rejectImport);
    });
}

export function importCountry(countryCode: string) {
    countryCode = countryCode.toLowerCase();

    return downloadCountry(countryCode)
        .then(function (countryFile) {
            return downloadLangAlternateNames().then(altNamesFile => {
                return importPlaces(countryCode, countryFile, altNamesFile);
            });
        });
}