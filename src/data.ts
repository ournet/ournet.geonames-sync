
var debug = require('debug')('ournet-geonames-sync');

import logger from './logger';
import DynamoDB = require('aws-sdk/clients/dynamodb');
import { Place, PlaceHelper } from '@ournet/places-domain';
import { PlaceRepositoryBuilder } from '@ournet/places-data';
import { GeonameAltName } from './geonames';
import { isValidAltName } from './utils';

const ES_HOST = process.env.PLACES_ES_HOST;
if (!ES_HOST) {
    throw new Error(`env PLACES_ES_HOST is required!`);
}

const dynamoClient = new DynamoDB.DocumentClient();
const repository = PlaceRepositoryBuilder.build(dynamoClient, ES_HOST);

export function init() {
    return repository.createStorage();
}

export function setPlaceAltName(id: string, country: string, newnames: GeonameAltName[]) {
    if (!newnames) {
        return Promise.resolve(false);
    }

    return repository.getById(id)
        .then((place: Place) => {
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
                const oldNames = PlaceHelper.parseNames(place.names).map(n => { return { name: n.name, lang: n.lang, isPreferred: false } });
                nnames = oldNames.concat(nnames);
            }
            place.names = PlaceHelper.formatNames(nnames);
            // console.log('from', orignames, ' > ', place.alternatenames);
            if (place.names.length < 1 || place.names === orignames) {
                debug('names not chenged: ' + place.names);
                return Promise.resolve(false);
            }
            //console.log('updating place');
            return putPlace(place)
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

export function putPlace(place: Place) {
    cleanObject(place);

    if (place.names) {
        place.names = filterPlaceNames(place.countryCode, place.names);
        if (!place.names) {
            delete place.names;
        }
    }

    debug('putting place', place);
    return repository.getById(place.id)
        .then((dbPlace: Place) => {
            if (dbPlace) {
                return repository.delete(place.id).catch(e => logger.warn(e.message))
            }
        })
        .then(() => repository.create(place))
        .then(function (dbPlace: Place) {
            debug('Put place', place.id, place.name, place.countryCode);
            return dbPlace;
        });
}

// export function updatePlace(place: Place) {
//     cleanObject(place);

//     if (place.names) {
//         place.names = filterPlaceNames(place.countryCode, place.names);
//         if (!place.names) {
//             delete place.names;
//         }
//     }

//     const id = place.id;
//     const set: Partial<Place> = place;
//     delete set.id;

//     const data: RepositoryUpdateData<Place> = { id, set };

//     // const remove: (keyof Place)[] = [];

//     return repository.update(data)
//         .then(function (nplace) {
//             debug('updated place', place.id, place.name, place.countryCode);
//             return nplace;
//         });
// }

function filterPlaceNames(country: string, names: string) {
    // let parsedNames: { name: string, lang: string }[];
    try {
        PlaceHelper.parseNames(names);
    } catch (e) {
        names = names.split(/\|/g).filter(name => !!name && /\[[a-z]{2}\]$/.test(name)).join('|');
    }

    return PlaceHelper.parseNames(names)
        .filter(name => isValidAltName(name.name, name.lang, country))
        .map(name => PlaceHelper.formatName(name.name, name.lang))
        .join('|');
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