'use strict';

const debug = require('debug')('geonames-sync');
const logger = require('./logger');
const utils = require('./utils');
const Promise = utils.Promise;
const readline = require('readline');
const fs = require('fs');
const internal = {};

exports.stringToList = function (str) {
    return (str || '').split(';').map(item => {
        return {
            name: item.substr(0, item.length - 4),
            language: item.substr(item.length - 3, 2)
        };
    });
}

exports.listToString = function (list) {
    return (list || []).map(item => item.name + '[' + item.language + ']').join(';');
}

const NAMES_MAP = {};

exports.geonameNames = function (file, geonameid) {
    if (NAMES_MAP[file]) {
        return Promise.resolve(NAMES_MAP[file][geonameid] || []);
    }
    return new Promise((resolve, reject) => {
        const map = {};
        readline.createInterface({
            input: fs.createReadStream(file)
        }).on('line', line => {
            const altName = exports.parseLine(line);
            map[altName.geonameid] = map[altName.geonameid] || [];
            map[altName.geonameid].push(altName);
        }).on('close', () => {
            NAMES_MAP[file] = map;
            resolve(map[geonameid] || []);
        }).on('error', reject);
    });
}

exports.parseLine = function (line) {
    line = line.split('\t');
    const altName = {
        geonameid: parseInt(line[1]),
        language: line[2] && line[2].trim().toLowerCase(),
        name: line[3].trim(),
        isPreferred: line[4] === '1',
        isShort: line[5] === '1',
        isColloquial: line[6] === '1',
        isHistoric: line[7] === '1'
    };

    return altName;
}
