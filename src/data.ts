
// var debug = require('debug')('geonames-sync');

import logger from './logger';
import { PlaceCreateUseCase, PlaceDeleteUseCase, PlaceUpdateUseCase, IPlace, PlaceHelpers } from '@ournet/places-domain';
import { PlaceRepository, createDbTables } from '@ournet/places-data';
import { GeonameAltName } from './geonames';

const ES_HOST = process.env.PLACES_ES_HOST;
if (!ES_HOST) {
    throw new Error(`env PLACES_ES_HOST is required!`);
}

const repository = new PlaceRepository({
    esHost: ES_HOST
});

const placeCreate = new PlaceCreateUseCase(repository);
const placeUpdate = new PlaceUpdateUseCase(repository);
const placeDelete = new PlaceDeleteUseCase(repository);

export function init() {
    return createDbTables();
}

export function setPlaceAltName(id: number, newnames: GeonameAltName[]) {
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
            });
            if (place.names) {
                const oldNames = PlaceHelpers.parseNames(place.names).map(n => { return { name: n.name, lang: n.lang, isPreferred: false } });
                nnames = oldNames.concat(nnames);
            }
            place.names = PlaceHelpers.formatNames(nnames);
            // console.log('from', orignames, ' > ', place.alternatenames);
            if (place.names.length < 1 || place.names === orignames) {
                return Promise.resolve(false);
            }
            //console.log('updating place');
            return updatePlace(place)
                .then(function () {
                    logger.info('Updated place names', { id: place.id, name: place.name, names: place.names });
                    return true;
                });
        });
}

export function putPlace(place: IPlace) {
    cleanObject(place);

    return repository.getById(place.id)
        .then(dbPlace => {
            if (dbPlace) {
                return placeDelete.execute(place.id)
            }
        })
        .then(() => placeCreate.execute(place))
        .then(function (dbPlace) {
            logger.warn('Put place', place.id, place.name, place.countryCode);
            return dbPlace;
        });
}

export function updatePlace(place: IPlace) {
    cleanObject(place);

    return placeUpdate.execute({ item: place })
        .then(function (nplace) {
            logger.warn('updated place', place.id, place.name, place.countryCode);
            return nplace;
        });
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