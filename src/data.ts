
var debug = require('debug')('ournet-geonames-sync');

import logger from './logger';
import { PlaceCreateUseCase, PlaceDeleteUseCase, PlaceUpdateUseCase, IPlace, PlaceHelpers } from '@ournet/places-domain';
import { PlaceRepository, createDbTables } from '@ournet/places-data';
import { GeonameAltName } from './geonames';
import { isValidAltName } from './utils'

const ES_HOST = process.env.PLACES_ES_HOST;
if (!ES_HOST) {
    throw new Error(`env PLACES_ES_HOST is required!`);
}

const repository = new PlaceRepository({
    esOptions: { host: ES_HOST }
});

const placeCreate = new PlaceCreateUseCase(repository);
const placeUpdate = new PlaceUpdateUseCase(repository);
const placeDelete = new PlaceDeleteUseCase(repository);

export function init() {
    return createDbTables().then(() => repository.init());
}

export function setPlaceAltName(id: number, country: string, newnames: GeonameAltName[]) {
    if (!newnames) {
        return Promise.resolve(false);
    }

    return repository.getById(id)
        .then((place: IPlace) => {
            if (!place) {
                return Promise.resolve(false);
            }
            //console.log('got place');
            const orignames = place.names;
            let nnames = newnames.map(nn => {
                return { lang: nn.language, name: nn.name, isPreferred: nn.isPreferred }
            }).filter(name => isValidAltName(name.name, name.lang, country));

            if (place.names) {
                debug('names', place.names);
                const oldNames = PlaceHelpers.parseNames(place.names).map(n => { return { name: n.name, lang: n.lang, isPreferred: false } });
                nnames = oldNames.concat(nnames);
            }
            place.names = PlaceHelpers.formatNames(nnames);
            // console.log('from', orignames, ' > ', place.alternatenames);
            if (place.names.length < 1 || place.names === orignames) {
                debug('names not chenged: ' + place.names);
                return Promise.resolve(false);
            }
            //console.log('updating place');
            return updatePlace(place)
                .then(function () {
                    debug('Updated place names', { id: place.id, name: place.name, names: place.names });
                    return true;
                })
                .catch((e: any) => {
                    e.place = place;
                    e.geonames = newnames;
                    return Promise.reject(e);
                });
        });
}

export function putPlace(place: IPlace) {
    cleanObject(place);

    if (place.names) {
        place.names = filterPlaceNames(place.countryCode, place.names);
        if (!place.names) {
            delete place.names;
        }
    }

    debug('putting place', place);
    return repository.getById(place.id)
        .then((dbPlace: IPlace) => {
            if (dbPlace) {
                return placeDelete.execute(place.id).catch(e => logger.warn(e.message))
            }
        })
        .then(() => placeCreate.execute(place))
        .then(function (dbPlace: IPlace) {
            debug('Put place', place.id, place.name, place.countryCode);
            return dbPlace;
        });
}

export function updatePlace(place: IPlace) {
    cleanObject(place);

    if (place.names) {
        place.names = filterPlaceNames(place.countryCode, place.names);
        if (!place.names) {
            delete place.names;
        }
    }

    return placeUpdate.execute({ item: place })
        .then(function (nplace) {
            debug('updated place', place.id, place.name, place.countryCode);
            return nplace;
        });
}

function filterPlaceNames(country: string, names: string) {
    try {
        return PlaceHelpers.parseNames(names).filter(name => isValidAltName(name.name, name.lang, country)).map(name => PlaceHelpers.formatName(name.name, name.lang)).join('|');
    } catch (e) {
        logger.error(`Catch filterPlaceNames:`, names);
        throw e;
    }
}

function cleanObject<T extends { [name: string]: any }>(obj: T): T {
    Object.keys(obj).forEach(function (prop) {
        var value = obj[prop];
        if (value === null || value === undefined || (typeof value === 'string' && value.trim().length < 1)) {
            delete obj[prop];
        }
    });
    return obj;
}