
const debug = require('debug')('ournet-geonames-sync');

const LineByLineReader = require('line-by-line');
import { parseGeoName, GeoName } from './geonames';
import logger from './logger';
import { importPlace, ImportPlaceOptions } from './import-place';

export class FileImporter<O extends ImportPlaceOptions> {
    import(file: string, options?: O): Promise<any> {
        debug('in importPlaces');
        let lastGeoname: any;
        let totalCount = 0;

        return new Promise((resolveImport, rejectImport) => {
            const lineSource = new LineByLineReader(file);

            lineSource.on('line', (line: string) => {
                lineSource.pause();

                const geoname = parseGeoName(line);
                if (!geoname) {
                    logger.warn('No geoname', {
                        line: line
                    });
                    return lineSource.resume();
                }

                if (!this.isValid(geoname)) {
                    return lineSource.resume();
                }

                const countryCode = geoname.country_code.trim().toLowerCase();

                lastGeoname = geoname;
                importPlace(countryCode, geoname, options)
                    .then(() => {
                        totalCount++;
                        // log every 100
                        if (totalCount % 1000 === 0) {
                            logger.warn(`${totalCount} - Importerd place: ${geoname.id}, ${countryCode}`);
                        }
                    })
                    .then(() => lineSource.resume())
                    .catch((e: Error) => {
                        rejectImport(e);
                        lineSource.close();
                    });
            })
                .on('error', rejectImport)
                .on('end', resolveImport);
        })
            .catch((error: Error) => {
                logger.error('Geoname error:', lastGeoname);
                return Promise.reject(error);
            });
    }

    isValid(_geoname: GeoName, _options?: O): boolean {
        return true;
    }
}
