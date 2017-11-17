
require('dotenv').load();

import { isSupportedCountry } from './utils';
import logger from './logger';
import { importCountry } from './importer';

process.on('uncaughtException', function (err) {
    logger.error('uncaughtException: ' + err.message, err);
});


const country = process.env.COUNTRY;
logger.warn('start import country', country);
if (!isSupportedCountry(country)) {
    throw new Error(`Country ${country} is not supported`);
}

importCountry(country)
    .then(function () {
        logger.warn('END IMPORT');
    })
    .catch(function (error) {
        logger.error(error);
    });

