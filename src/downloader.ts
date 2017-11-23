
// const utils = require('./utils');
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
// const fs = Promise.promisifyAll(require('fs'));
// const fse = Promise.promisifyAll(require('fs-extra'));
const AdmZip = require('adm-zip');
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const debug = require('debug')('geonames-sync');
import * as readline from 'readline';
// const AltNames = require('./altnames');
import * as rimraf from 'rimraf';
import { parseAltName } from './geonames';
import { isValidAltName } from './utils';
import logger from './logger';

export function downloadCountry(country_code: string) {
    country_code = country_code.toUpperCase();
    return downloadUnzip(country_code).then(file => path.join(file, country_code + '.txt'));
}

export function downloadAlternateNames() {
    return downloadUnzip('alternateNames').then(file => path.join(file, 'alternateNames.txt'));
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
                                if (isValidAltName(altName.name, altName.language, country)
                                    && countryIds.indexOf(altName.geonameid) > -1) {
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

function getCountryIds(country: string): Promise<number[]> {
    const file = path.join(TEMP_DIR, country.toUpperCase(), country.toUpperCase() + '.txt');
    return new Promise((resolve, reject) => {
        const ids: number[] = [];

        readline.createInterface({
            input: fs.createReadStream(file)
        }).on('line', (line: string) => {
            if (/^\d+\t/.test(line)) {
                ids.push(parseInt(line.split(/\t+/)[0]));
            }
        }).on('close', () => {
            resolve(ids);
        }).on('error', reject);
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
