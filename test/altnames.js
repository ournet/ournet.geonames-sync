'use strict';

const Downloader = require('../lib/downloader');
const AltNames = require('../lib/altnames');
const assert = require('assert');

describe('AltNames', function () {
    it('should get geonameNames', function () {
        this.timeout(1000 * 60 * 30);
        return Downloader.langAlternateNames().then(filename => {
            return AltNames.geonameNames(filename, 323777).then(names => {
                console.log('names', names);
                assert.ok(names);
            });
        });
    });
});
