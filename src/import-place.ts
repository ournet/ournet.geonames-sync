const debug = require("debug")("ournet:geonames-sync");

import { mapGeoNamePlace, GeoName } from "./geonames";
import { isValidPlace } from "./utils";
import * as Data from "./data";
import { Place } from "@ournet/places-domain";
import { AltNamesDatabase } from "./alt-names-db";

export interface ImportPlaceOptions {
  placeType?: { [name: string]: string[] } | null;
  population?: number | null;
}

const isValidPopulation = (place: Place, options?: ImportPlaceOptions) => {
  if (!options?.population) return true;

  return (
    place.featureClass === "P" &&
    place.population &&
    place.population > options.population
  );
};

export async function importPlace(
  namesDb: AltNamesDatabase,
  countryCode: string,
  geoname: GeoName,
  options?: ImportPlaceOptions
) {
  if (geoname.country_code.trim().toLowerCase() !== countryCode) return;

  if (!isValidPlace(geoname)) return;

  const place = mapGeoNamePlace(geoname);
  delete place.names;

  if (!isInOptionsType(place, options) && !isValidPopulation(place, options))
    return;

  debug("importing place", place);

  await Data.putPlace(place);
  const geonames = await namesDb.geoNameAltNames(place.id);
  if (geonames && geonames.length) {
    debug(`geonames for ${place.id}:`, geonames);
    return Data.setPlaceAltName(place.id, geonames);
  }
}

function isInOptionsType(place: Place, options?: ImportPlaceOptions) {
  if (options?.placeType) {
    if (
      !options.placeType[place.featureClass] ||
      options.placeType[place.featureClass].indexOf(place.featureCode) < 0
    ) {
      return false;
    }
  }

  return true;
}
