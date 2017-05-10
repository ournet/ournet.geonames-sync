'use strict';

var debug = require('debug')('geonames-sync');
var logger = require('./logger');
var _ = require('./utils')._;
var Promise = require('./utils').Promise;
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: process.env.ES_HOST
});
client.indexAsync = Promise.promisify(client.index);

function formatPlace(place, country) {
    var data = _.pick(place, 'name', 'asciiname', 'alternatenames');
    if (!_.isString(data.alternatenames) || data.alternatenames.length < 1) {
        delete data.alternatenames;
    }
    else {
        data.names = data.alternatenames;
        delete data.alternatenames;
    }
    if (data.name === data.asciiname) {
        delete data.asciiname;
    }

    data.country = country || place.country_code;

    return data;
}

exports.index = function (place, country) {
    var esplace = formatPlace(place);

    debug('index place: ', esplace, place.id);
    return client.indexAsync({
        index: 'places',
        type: 'place',
        id: place.id,
        body: esplace
    }).catch(function (error) {
        logger.error(error);
    });
}