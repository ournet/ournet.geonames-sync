
// const debug = require('debug')('geonames-sync');

import logger from './logger';
import * as readline from 'readline';
import * as fs from 'fs';
import { IPlace } from '@ournet/places-domain';

// exports.stringToList = function (str) {
//     return (str || '').split(';').map(item => {
//         return {
//             name: item.substr(0, item.length - 4),
//             language: item.substr(item.length - 3, 2)
//         };
//     });
// }

// exports.listToString = function (list) {
//     return (list || []).map(item => item.name + '[' + item.language + ']').join(';');
// }

export function mapGeoNamePlace(geoname: GeoName): IPlace {
    const place: IPlace = { id: geoname.id, name: geoname.name, asciiname: geoname.asciiname };
    place.admin1Code = geoname.admin1_code;
    place.admin2Code = geoname.admin2_code;
    place.admin3Code = geoname.admin3_code;
    place.countryCode = geoname.country_code;
    place.dem = geoname.dem;
    place.elevation = geoname.elevation;
    place.featureClass = geoname.feature_class as ('A' | 'H' | 'L' | 'P' | 'R' | 'S' | 'T' | 'U' | 'V');
    place.featureCode = geoname.feature_code;
    place.latitude = geoname.latitude;
    place.longitude = geoname.longitude;
    place.population = geoname.population;
    place.timezone = geoname.timezone;

    return place;
}

const NAMES_MAP: { [name: string]: { [id: number]: GeonameAltName[] } } = {};

export function getGeonameNamesById(file: string, geonameid: number): Promise<GeonameAltName[]> {
    if (NAMES_MAP[file]) {
        return Promise.resolve(NAMES_MAP[file][geonameid] || []);
    }
    return new Promise((resolve, reject) => {
        const map: { [id: number]: GeonameAltName[] } = {};
        readline.createInterface({
            input: fs.createReadStream(file)
        }).on('line', line => {
            const altName = parseAltName(line);
            map[altName.geonameid] = map[altName.geonameid] || [];
            map[altName.geonameid].push(altName);
        }).on('close', () => {
            NAMES_MAP[file] = map;
            resolve(map[geonameid] || []);
        }).on('error', reject);
    });
}

export type GeonameAltName = {
    geonameid: number
    name: string
    language: string
    isPreferred: boolean
    isShort: boolean
    isColloquial: boolean
    isHistoric: boolean
}

export function parseAltName(line: string): GeonameAltName {
    const parts = line.split(/\t/g);

    const altName: GeonameAltName = {
        geonameid: parseInt(parts[1]),
        language: parts[2] && parts[2].trim().toLowerCase(),
        name: parts[3].trim(),
        isPreferred: parts[4] === '1',
        isShort: parts[5] === '1',
        isColloquial: parts[6] === '1',
        isHistoric: parts[7] === '1'
    };

    return altName;
}

export type GeoName = {
    id: number
    name: string
    asciiname: string
    alternatenames: string
    latitude: number
    longitude: number
    feature_class: string
    feature_code: string
    country_code: string
    admin1_code: string
    admin2_code: string
    admin3_code: string
    population: number
    elevation: number
    dem: number
    timezone: string
    modification_date: string
}

export function parseGeoName(line: string): GeoName {
    if (!line) {
        return null;
    }
    var fields = line.split('\t');
    if (fields.length < 19) {
        logger.error('Geonames fields<19', line);
        return null;
    }
    var geoname: GeoName = {
        id: parseInt(fields[0]),
        name: fields[1].trim(),
        asciiname: fields[2].trim(),
        alternatenames: fields[3],
        latitude: parseFloat(fields[4]),
        longitude: parseFloat(fields[5]),
        feature_class: fields[6].trim().toUpperCase(),
        feature_code: fields[7].trim().toUpperCase(),
        country_code: fields[8].trim().toLowerCase(),
        admin1_code: fields[10].trim().toLowerCase(),
        admin2_code: fields[11],
        admin3_code: fields[12],
        population: parseInt(fields[14]) || 0,
        elevation: parseInt(fields[15]) || null,
        dem: parseInt(fields[16]),
        timezone: fields[17],
        modification_date: fields[18]
    };

    return geoname;
};
