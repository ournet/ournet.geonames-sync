
require('dotenv').load();

import { isSupportedCountry } from './utils';
import logger from './logger';
import { importCountry } from './import-country';

process.on('uncaughtException', function (err) {
    logger.error('uncaughtException: ' + err.message, err);
});


const country = process.env.COUNTRY;
logger.warn('start import country', country);
if (!isSupportedCountry(country)) {
    throw new Error(`Country ${country} is not supported`);
}

const startId = process.env.START_ID && parseInt(process.env.START_ID);

importCountry(country, { startId: startId })
    .then(function () {
        logger.warn('SUCCESS END IMPORT');
    })
    .catch(function (error) {
        logger.error('ERROR END IMPORT: ' + country, error);
    });
