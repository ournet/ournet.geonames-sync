
const debug = require('debug')('ournet:geonames-sync');

import { FileImporter } from "./fileImporter";
import { ImportPlaceOptions } from "./import-place";
import { GeoName } from "./geonames";

export interface ImportCitiesOptions extends ImportPlaceOptions {
    startId?: string
}

export class Cities15000Importer extends FileImporter<ImportCitiesOptions> {
    private started = false;
    isValid(geoname: GeoName, options?: ImportCitiesOptions): boolean {
        if (options && options.startId && !this.started) {
            if (geoname.id === options.startId) {
                this.started = true;
            } else {
                return false;
            }
        }
        const populationLimit = 300000;
        if (!geoname.population || geoname.population < populationLimit) {
            debug(`Invalid geoname: population<${populationLimit}: ${geoname.asciiname}`);
            return false;
        }
        return super.isValid(geoname, options);
    }
}
