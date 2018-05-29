
const debug = require('debug')('ournet-geonames-sync');

import { FileImporter } from "./fileImporter";
import { ImportPlaceOptions } from "./import-place";
import { GeoName } from "./geonames";

export class Cities15000Importer extends FileImporter<ImportPlaceOptions> {
    isValid(geoname: GeoName, options?: ImportPlaceOptions): boolean {
        const populationLimit = 300000;
        if (!geoname.population || geoname.population < populationLimit) {
            debug(`Invalid geoname: population<${populationLimit}: ${geoname.asciiname}`);
            return false;
        }
        return super.isValid(geoname, options);
    }
}
