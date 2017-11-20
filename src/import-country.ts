
const debug = require('debug')('ournet-geonames-sync');

const LineByLineReader = require('line-by-line');
import { parseGeoName } from './geonames';
import { downloadCountry, downloadLangAlternateNames } from './downloader';
import logger from './logger';
import * as Data from './data';
import { importPlace, ImportPlaceOptions } from './import-place';

export interface ImportOptions extends ImportPlaceOptions {
    startId?: number
}

export function importCountry(countryCode: string, options?: ImportOptions) {
    countryCode = countryCode.toLowerCase();

    return downloadCountry(countryCode)
        .then(function (countryFile) {
            return downloadLangAlternateNames(countryCode).then(altNamesFile => {
                return Data.init().then(() => importPlaces(countryCode, countryFile, altNamesFile, options));
            });
        });
}

function importPlaces(countryCode: string, countryFile: string, altNamesFile: string, options: ImportOptions) {
    debug('in importPlaces');
    let lastPlaceId: number;

    return new Promise((resolveImport, rejectImport) => {
        let started = false;
        const lineSource = new LineByLineReader(countryFile);

        let closeError: Error;

        lineSource.on('line', (line: string) => {
            lineSource.pause();
            const geoname = parseGeoName(line);
            if (!geoname) {
                logger.warn('No geoname', {
                    line: line
                });
                return lineSource.resume();
            }

            if (options && options.startId && !started) {
                if (geoname.id === options.startId) {
                    started = true;
                } else {
                    return lineSource.resume();
                }
            }
            lastPlaceId = geoname.id;
            importPlace(countryCode, altNamesFile, geoname)
                .then(() => lineSource.resume())
                .catch((e: Error) => {
                    closeError = e;
                    lineSource.close();
                });
        })
            .on('error', rejectImport)
            .on('end', () => {
                if (closeError) {
                    rejectImport(closeError);
                } else {
                    resolveImport();
                }
            });
    })
        .catch((error: Error) => {
            logger.error(countryCode + ' END_PLACE_ID=' + lastPlaceId, { country: countryCode, placeId: lastPlaceId });
            return Promise.reject(error);
        });
}
