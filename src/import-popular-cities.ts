
const debug = require('debug')('ournet-geonames-sync');

import { downloadCities15000 } from './downloader';
import * as Data from './data';
import { ImportPlaceOptions } from './import-place';
import { Cities15000Importer } from './cities15000Importer';

export function importPupularCities(options?: ImportPlaceOptions) {
    debug(`start import popular cities`);
    return downloadCities15000()
        .then(file => Data.init().then(() => new Cities15000Importer().import(file, options)))
        .then(() => debug(`end import popular cities`));
}
