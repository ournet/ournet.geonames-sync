'use strict';

const utils = require('./utils');
const Promise = utils.Promise;
const readline = require('readline');
const fs = require('fs');
const lineReader = Promise.promisifyAll(require('line-reader'));
const EventEmitter = require('events');

exports.getFileLines = function (file) {
    return new Promise((resolve, reject) => {
        let count = 0;
        readline.createInterface({
            input: fs.createReadStream(file)
        }).on('line', () => {
            count++;
        }).on('close', () => resolve(count)).on('error', reject);
    });
}

function skipReader(reader, lineno, lines) {
    lines = lines || 0;

    if (lineno < 2) {
        return Promise.resolve();
    }

    if (reader.hasNextLine()) {
        return reader.nextLineAsync().then(line => {
            lines++;
            if (lines < lineno) {
                return skipReader(reader, lineno, lines);
            }
            return line;
        });
    }
    else {
        return reader.closeAsync();
    }
}

exports.LinesReader = class LinesReader extends EventEmitter {
    constructor() {
        super();
    }

    start(file, options) {
        options = options || {};
        const startLine = options.startLine || 0;
        const endLine = options.endLine || 999999999999;
        let lineCount = -1;
        const self = this;

        return lineReader.openAsync(file).then(reader => {
            reader = Promise.promisifyAll(reader);
            return skipReader(reader, startLine - 1).then(() => {
                lineCount = startLine;
                function getNextLine() {
                    if (lineCount >= endLine) {
                        return reader.closeAsync();
                    }
                    lineCount++;
                    if (reader.hasNextLine()) {
                        return reader.nextLineAsync();
                    }
                    else {
                        return reader.closeAsync();
                    }
                }

                function callNext() {
                    return getNextLine().then(line => {
                        if (line) {
                            self.emit('line', line, callNext);
                        } else {
                            self.emit('end');
                        }
                    }).catch(e => {
                        self.emit('error', e);
                    });
                }

                callNext();
            });
        });
    }
}

