
const debug = require('debug')('ournet:geonames-sync');

import { mapGeoNamePlace, GeoName } from './geonames';
import logger from './logger';
import { isValidPlace } from './utils';
import * as Data from './data';
import { getWikiDataId } from './getWikiDataId';
import { oldAccess } from './olddata';
import { Place } from '@ournet/places-domain';
import { CountryAltNames } from './country-alt-names';

export interface ImportPlaceOptions {
    placeType?: { [name: string]: string[] }
}

export function importPlace(altNames: CountryAltNames, countryCode: string, geoname: GeoName, options?: ImportPlaceOptions) {
    if (geoname.country_code.trim().toLowerCase() !== countryCode) {
        return Promise.resolve();
    }

    if (!isValidPlace(geoname)) {
        return Promise.resolve();
    }

    const place = mapGeoNamePlace(geoname);
    delete place.names;

    if (!isInOptionsType(place, options)) {
        return Promise.resolve();
    }

    // debug('importing place', place);

    return oldAccess.place(parseInt(place.id))
        .then((oldplace: any) => {
            return oldplace && oldplace.alternatenames && oldplace.alternatenames.replace(/;/g, '|');
        })
        .then((oldnames: string) => {
            if (oldnames) {
                place.names = oldnames;
                // debug('oldnames', place.names);
            }
            return getWikiDataId(place.id)
                .then(wikiId => {
                    if (wikiId) {
                        place.wikiId = wikiId;
                    }
                })
                .catch(e => logger.error(e))
                .then(() => Data.putPlace(place))
                .then(() => altNames.geoNameAltNames(place.id))
                .then(geonames => {
                    debug(`geonames for ${place.id}:`, geonames);
                    if (geonames && geonames.length) {
                        return Data.setPlaceAltName(place.id, place.countryCode, geonames);
                    }
                });
        });
}

function isInOptionsType(place: Place, options?: ImportPlaceOptions) {
    if (options && options.placeType) {
        if (!options.placeType[place.featureClass]
            || options.placeType[place.featureClass].indexOf(place.featureCode) < 0) {
            return false;
        }
    } else {
        return true;
    }
}
