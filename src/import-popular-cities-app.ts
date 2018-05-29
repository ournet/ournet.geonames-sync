
require('dotenv').load();

import logger from './logger';
import { importPupularCities } from './import-popular-cities';

process.on('uncaughtException', function (err) {
    logger.error('uncaughtException: ' + err.message, err);
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('warning', (warning) => {
    console.warn(warning.name);    // Print the warning name
    console.warn(warning.message); // Print the warning message
    console.warn(warning.stack);   // Print the stack trace
});

importPupularCities()
    .then(function () {
        logger.warn('SUCCESS END IMPORT');
    })
    .catch(function (error) {
        logger.error('ERROR END IMPORT', error);
    })
    .then(() => setTimeout(() => { }, 1000 * 6));
