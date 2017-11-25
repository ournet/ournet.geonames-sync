
// const utils = require('./utils');
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
// const fs = Promise.promisifyAll(require('fs'));
// const fse = Promise.promisifyAll(require('fs-extra'));
const AdmZip = require('adm-zip');
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const debug = require('debug')('ournet-geonames-sync');
import * as readline from 'readline';
// const AltNames = require('./altnames');
import * as rimraf from 'rimraf';
import { parseAltName } from './geonames';
import { isValidAltName } from './utils';
import logger from './logger';

export const IN_MEMORY_ALT_NAMES: { [country: string]: { [id: number]: any[] } } = {}

export function downloadCountry(country_code: string) {
    country_code = country_code.toUpperCase();
    return downloadUnzip(country_code).then(file => path.join(file, country_code + '.txt'));
}

export function downloadAlternateNames() {
    return downloadUnzip('alternateNames').then(file => path.join(file, 'alternateNames.txt'));
}

export function getCountryAltNames(country: string): Promise<{ [id: number]: any[] }> {
    logger.info('Start getCountryAltNames');
    if (IN_MEMORY_ALT_NAMES[country]) {
        return Promise.resolve(IN_MEMORY_ALT_NAMES[country]);
    }
    return downloadAlternateNames()
        .then(altnamesFile => getCountryIds(country)
            .then(countryIds => {
                IN_MEMORY_ALT_NAMES[country] = {};
                return new Promise<{ [id: number]: any[] }>((resolve, reject) => {
                    readline.createInterface({
                        input: fs.createReadStream(altnamesFile)
                    }).on('line', (line: string) => {
                        const altName = parseAltName(line);
                        // if (altName && altName.language && isValidCountryLang(country, altName.language)) {
                        if (isValidAltName(altName.name, altName.language, country) && countryIds[altName.geonameid]) {
                            IN_MEMORY_ALT_NAMES[country][altName.geonameid] = IN_MEMORY_ALT_NAMES[country][altName.geonameid] || [];
                            IN_MEMORY_ALT_NAMES[country][altName.geonameid].push(altName);
                        }
                    }).on('close', () => {
                        resolve(IN_MEMORY_ALT_NAMES[country]);
                    }).on('error', reject);
                })
            })
        ).then(_ => {
            logger.info('End getCountryAltNames');
            return _;
        });
}

export function cleanCountryAltName(country: string) {
    delete IN_MEMORY_ALT_NAMES[country];
}

export function downloadLangAlternateNames(country: string): Promise<string> {
    logger.info('Start downloadLangAlternateNames');
    return downloadAlternateNames()
        .then(altnamesfile => {
            const file = path.join(path.dirname(altnamesfile), country + '-langAlternateNames.txt');
            return isFileFresh(file).then(isFresh => {
                if (isFresh) {
                    return file;
                }
                return removeFR(file)
                    .then(() => getCountryIds(country))
                    .then(countryIds => {
                        return new Promise((resolve, reject) => {
                            const output = fs.createWriteStream(file);
                            readline.createInterface({
                                input: fs.createReadStream(altnamesfile)
                            }).on('line', (line: string) => {
                                const altName = parseAltName(line);
                                // if (altName && altName.language && isValidCountryLang(country, altName.language)) {
                                if (isValidAltName(altName.name, altName.language, country) && countryIds[altName.geonameid]) {
                                    output.write(line + '\n', 'utf8')
                                }
                            }).on('close', () => {
                                output.end();
                                resolve(file);
                            }).on('error', reject);
                        });
                    });
            })
                .then(() => file);
        }).then(file => {
            logger.info('End downloadLangAlternateNames');
            return file;
        })
}

export function downloadFile(filename: string): Promise<string> {
    debug('downloading file', filename);

    var file = path.join(TEMP_DIR, filename);
    return Promise.all([removeFR(file.replace(/\.\w+$/, '')), removeFR(file)])
        .then(function () {
            var url = 'http://download.geonames.org/export/dump/' + filename;
            debug('downloading url', url);
            return new Promise(function (resolve, reject) {
                http.get(url, function (response) {
                    const outFile = fs.createWriteStream(file);
                    response.pipe(outFile);
                    outFile.on('finish', function () {
                        outFile.close();
                        resolve();
                    });
                }).on('error', reject);
            });
        }).then(() => file);
}

function getCountryIds(country: string): Promise<{ [id: number]: boolean }> {
    const countryFile = path.join(TEMP_DIR, country.toLowerCase() + '-ids.txt')
    return isFileFresh(countryFile).then(isFresh => {

        if (isFresh) {
            logger.info('country ids file is fresh');
            return JSON.parse(fs.readFileSync(countryFile, 'utf8'));
        }

        const file = path.join(TEMP_DIR, country.toUpperCase(), country.toUpperCase() + '.txt');
        try {
            fs.unlinkSync(countryFile);
        } catch (e) { logger.warn(e) }
        logger.info('Creating country ids file');
        return new Promise<{ [id: number]: boolean }>((resolve, reject) => {
            const ids: { [id: number]: boolean } = {};

            readline.createInterface({
                input: fs.createReadStream(file)
            }).on('line', (line: string) => {
                if (/^\d+\t/.test(line)) {
                    ids[parseInt(line.split(/\t+/)[0])] = true;
                }
            }).on('close', () => {
                fs.writeFileSync(countryFile, JSON.stringify(ids), 'utf8');
                resolve(ids);
            }).on('error', reject);
        });
    });
}

function unzip(file: string, output: string): Promise<string> {
    return removeFR(output)
        .then((new AdmZip(file)).extractAllTo(output, true))
        .then(() => output);
}

function downloadUnzip(name: string, hours?: number) {
    var folderName = path.join(TEMP_DIR, name);
    const zipName = path.join(TEMP_DIR, name + '.zip');
    return isFileFresh(zipName, hours)
        .then(isFresh => {
            if (isFresh) {
                debug('file is fresh', zipName);
                return Promise.resolve(folderName);
            }
            return removeFR(folderName)
                .then(() => downloadFile(name + '.zip'))
                // .delay(1000 * 2)
                .then(function () {
                    return unzip(zipName, folderName).then(function () { return folderName });
                });
        });
}

function isFileFresh(file: string, hours: number = 6) {
    try {
        const stats = fs.statSync(file);
        return Promise.resolve(stats.ctime.getTime() > Date.now() - hours * 60 * 60 * 1000);
    } catch (e) {
        return Promise.resolve(false);
    }
}

function removeFR(file: string): Promise<string> {
    return new Promise((resolve) => {
        rimraf(file, () => {
            // if (error) {
            //     return reject(error);
            // }
            resolve(file);
        });
    });
}

// function mkdir(dir: string): Promise<string> {
//     return new Promise((resolve) => {
//         rimraf(file, () => {
//             // if (error) {
//             //     return reject(error);
//             // }
//             resolve(file);
//         });
//     });
// }
