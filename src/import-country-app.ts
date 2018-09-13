
require('dotenv').load();

import { isSupportedCountry } from './utils';
import logger from './logger';
import { importCountry } from './import-country';

process.on('uncaughtException', function (err) {
    logger.error('uncaughtException: ' + err.message, err);
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

process.on('warning', (warning) => {
    console.warn(warning.name);    // Print the warning name
    console.warn(warning.message); // Print the warning message
    console.warn(warning.stack);   // Print the stack trace
});

// const SIGNALS = ['SIGTERM', 'SIGINT', 'SIGPIPE', 'SIGHUP', 'SIGTERM', 'SIGBREAK', 'SIGWINCH', 'SIGKILL', 'SIGSTOP', 'SIGBUS', 'SIGFPE', 'SIGSEGV', 'SIGILL']

// process.on('SIGPIPE', () => {
//     console.log('SIGPIPE', arguments);
// });
// process.on('SIGHUP', () => {
//     console.log('SIGHUP', arguments);
// });
// process.on('SIGTERM', () => {
//     console.log('SIGTERM', arguments);
// });
// process.on('SIGBREAK', () => {
//     console.log('SIGBREAK', arguments);
// });
// process.on('SIGWINCH', () => {
//     console.log('SIGWINCH', arguments);
// });
// // process.on('SIGKILL', () => {
// //     console.log('SIGKILL', arguments);
// // });
// process.on('SIGSTOP', () => {
//     console.log('SIGSTOP', arguments);
// });
// process.on('SIGBUS', () => {
//     console.log('SIGBUS', arguments);
// });
// process.on('SIGFPE', () => {
//     console.log('SIGFPE', arguments);
// });

// process.on('SIGINT', () => {
//     console.log('SIGTERM', arguments);
// });

// process.on('SIGTERM', () => {
//     console.log('SIGTERM', arguments);
// });

// process.on('SIGUSR1', () => {
//     console.log('SIGUSR1', arguments);
// });

// process.on('SIGUSR2', () => {
//     console.log('SIGUSR2', arguments);
// });

// process.on('exit', (code) => {
//     console.log(`About to exit with code: ${code}`);
// });


const country = process.env.COUNTRY;
logger.warn('start import country', country);
if (!isSupportedCountry(country)) {
    throw new Error(`Country ${country} is not supported`);
}

const startId = process.env.START_ID || '';

importCountry(country, { startId: startId })
    .then(function () {
        logger.warn('SUCCESS END IMPORT');
    })
    .catch(function (error) {
        logger.error('ERROR END IMPORT: ' + country, error);
    })
    .then(() => setTimeout(() => { }, 1000 * 6));
