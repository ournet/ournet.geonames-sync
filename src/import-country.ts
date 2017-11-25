
const debug = require('debug')('ournet-geonames-sync');

const LineByLineReader = require('line-by-line');
import { parseGeoName } from './geonames';
import { downloadCountry } from './downloader';
import logger from './logger';
import * as Data from './data';
import { importPlace, ImportPlaceOptions } from './import-place';

export interface ImportOptions extends ImportPlaceOptions {
    startId?: number
}

export function importCountry(countryCode: string, options?: ImportOptions) {
    countryCode = countryCode.toLowerCase();

    return downloadCountry(countryCode)
        .then(countryFile => Data.init().then(() => importPlaces(countryCode, countryFile, options)));
}

function importPlaces(countryCode: string, countryFile: string, options: ImportOptions) {
    debug('in importPlaces');
    let lastGeoname: any;
    let totalCount = 0;

    return new Promise((resolveImport, rejectImport) => {
        let started = false;
        const lineSource = new LineByLineReader(countryFile);

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
            lastGeoname = geoname;
            importPlace(countryCode, geoname)
                .then(() => {
                    totalCount++;
                    // log every 100
                    if (totalCount % 1000 === 0) {
                        logger.warn(`${totalCount} - Importerd place: ${geoname.id}, ${countryCode}`);
                    }
                })
                .then(() => lineSource.resume())
                .catch((e: Error) => {
                    rejectImport(e);
                    lineSource.close();
                });
        })
            .on('error', rejectImport)
            .on('end', resolveImport);
    })
        .catch((error: Error) => {
            logger.error('Geoname error:', lastGeoname);
            return Promise.reject(error);
        });
}
