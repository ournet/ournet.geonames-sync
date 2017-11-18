
const debug = require('debug')('geonames-sync');

// import * as readline from 'readline';
const LineByLineReader = require('line-by-line');
// import * as fs from 'fs';
import { parseGeoName, mapGeoNamePlace, getGeonameNamesById } from './geonames';
import { downloadCountry, downloadLangAlternateNames } from './downloader';
import logger from './logger';
// import { PlaceHelpers } from '@ournet/places-domain';
import { isValidPlace } from './utils';
import * as Data from './data';
// import { Observable } from 'rxjs';

import { oldAccess } from './olddata';

function processLine(countryCode: string, altNamesFile: string, line: string) {
    const geoname = parseGeoName(line);
    if (!geoname) {
        logger.warn('No geoname', {
            line: line
        });
        return Promise.resolve();
    }

    if (geoname.country_code.trim().toLowerCase() !== countryCode) {
        return Promise.resolve();
    }

    if (!isValidPlace(geoname)) {
        return Promise.resolve();
    }

    const place = mapGeoNamePlace(geoname);
    delete place.names;

    debug('importing place', place);

    return oldAccess.place(place.id)
        .then((oldplace: any) => {
            return oldplace && oldplace.alternatenames && oldplace.alternatenames.replace(/;/g, '|');
        })
        .then((oldnames: string) => {
            if (oldnames) {
                place.names = oldnames;
                // debug('oldnames', place.names);
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
}

function importPlaces(countryCode: string, countryFile: string, altNamesFile: string) {
    debug('in importPlaces');
    return new Promise((resolveImport, rejectImport) => {

        // const lineSource = readline.createInterface({
        //     input: fs.createReadStream(countryFile)
        // });
        const lineSource = new LineByLineReader(countryFile);

        lineSource.on('line', (line: string) => {
            lineSource.pause();
            processLine(countryCode, altNamesFile, line)
                .then(() => lineSource.resume())
                .catch((e: Error) => {
                    lineSource.close();
                    rejectImport(e);
                });
        })
            .on('error', rejectImport)
            .on('end', resolveImport);

        // const lineEvents = Observable.fromEvent<string>(lineSource, 'line')

        // lineEvents.subscribe(line => {
        //     // debug('line in subscriber: ' + line);
        //     lineSource.pause();
        //     processLine(countryCode, altNamesFile, line)
        //         .then(() => lineSource.resume())
        //         .catch((e: Error) => {
        //             lineSource.close();
        //             rejectImport(e);
        //         });
        // }, (error: Error) => {
        //     rejectImport(error || 'Error!');
        // }, resolveImport);
    });
}

export function importCountry(countryCode: string) {
    countryCode = countryCode.toLowerCase();

    return downloadCountry(countryCode)
        .then(function (countryFile) {
            return downloadLangAlternateNames().then(altNamesFile => {
                return Data.init().then(() => importPlaces(countryCode, countryFile, altNamesFile));
            });
        });
}
