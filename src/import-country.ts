
const debug = require('debug')('ournet:geonames-sync');

import { downloadCountry } from './downloader';
import logger from './logger';
import * as Data from './data';
import { importPlace, ImportPlaceOptions } from './import-place';
import { AltNamesDatabase } from './alt-names-db';
import { CountryGeonameReader } from './file-geoname-reader';

export interface ImportOptions extends ImportPlaceOptions {
    startId?: string
}

export function importCountry(namesDb: AltNamesDatabase, countryCode: string, options?: ImportOptions) {
    countryCode = countryCode.toLowerCase();

    return downloadCountry(countryCode)
        .then(() => Data.init().then(() => importPlaces(namesDb, countryCode, options && options.startId)));
}

async function importPlaces(namesDb: AltNamesDatabase, countryCode: string, startId?: string) {
    debug('in importPlaces');
    let totalCount = 0;
    let started = !startId;

    return new CountryGeonameReader(countryCode)
        .start(async geoname => {
            totalCount++;
            if (!started && startId === geoname.id) {
                started = true;
            }
            if (started) {
                await importPlace(namesDb, countryCode, geoname)
            }
            // log every 1000
            if (totalCount % 1000 === 0) {
                logger.warn(`${totalCount} - Importerd place: ${geoname.id}, ${countryCode}, ${new Date().toISOString()}`);
            }
        })
}
