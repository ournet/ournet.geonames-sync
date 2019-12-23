// const debug = require('debug')('ournet:geonames-sync');

import { mapGeoNamePlace, GeoName, GeonameAltName } from "./geonames";
import { isValidPlace } from "./utils";
import * as Data from "./data";
import { oldAccess } from "./olddata";
import { Place } from "@ournet/places-domain";
import { AltNamesDatabase } from "./alt-names-db";

export interface ImportPlaceOptions {
  placeType?: { [name: string]: string[] };
}

export function importPlace(
  namesDb: AltNamesDatabase,
  countryCode: string,
  geoname: GeoName,
  options?: ImportPlaceOptions
) {
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

  return oldAccess
    .place(parseInt(place.id))
    .then((oldplace: any) => {
      return (
        oldplace &&
        oldplace.alternatenames &&
        oldplace.alternatenames.replace(/;/g, "|")
      );
    })
    .then((oldnames: string) => {
      if (oldnames) {
        place.names = oldnames;
        // debug('oldnames', place.names);
      }
      return Data.putPlace(place)
        .then(() => namesDb.geoNameAltNames(place.id))
        .then((geonames: GeonameAltName[]) => {
          if (geonames && geonames.length) {
            // debug(`geonames for ${place.id}:`, geonames);
            return Data.setPlaceAltName(place.id, geonames);
          }
        });
    });
}

function isInOptionsType(place: Place, options?: ImportPlaceOptions) {
  if (options && options.placeType) {
    if (
      !options.placeType[place.featureClass] ||
      options.placeType[place.featureClass].indexOf(place.featureCode) < 0
    ) {
      return false;
    }
  } else {
    return true;
  }
}
