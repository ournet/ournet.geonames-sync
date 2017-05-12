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

exports.geonameNames = function (file, geonameid) {
    return new Promise((resolve, reject) => {
        const list = [];
        const input = fs.createReadStream(file);
        let isClosed = false;
        const rl = readline.createInterface({
            input: input
        }).on('line', line => {
            if (isClosed) {
                return;
            }
            const altName = exports.parseLine(line);
            if (altName.geonameid === geonameid) {
                list.push(altName);
            } else if (altName.geonameid > geonameid) {
                isClosed = true;
                debug('close reader');
                input.close();
                rl.close();
            }
        }).on('close', () => resolve(list)).on('error', reject);
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
