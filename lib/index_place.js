'use strict';

var debug = require('debug')('geonames-sync');
var logger = require('./logger');
var utils = require('./utils');
var _ = utils._;
var Promise = require('./utils').Promise;
var AltNames = require('./altnames');
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: process.env.ES_HOST
});
client.indexAsync = Promise.promisify(client.index);
client.deleteAsync = Promise.promisify(client.delete);

function formatPlace(place, region) {
    var data = _.pick(place, 'name', 'asciiname', 'alternatenames', 'admin1_code');
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

    data.country = place.country_code.toLowerCase();
    if (region) {
        const languages = utils.countryLanguages(data.country);
        const names = AltNames.stringToList(region.alternatenames).filter(item => languages.indexOf(item.language) > -1);
        data.region = { name: region.name, names: AltNames.listToString(names) };
        if (data.region.names.length < 2) {
            delete data.region.names;
        }
    }

    return data;
}

exports.index = function (place, region) {
    var esplace = formatPlace(place, region);

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

exports.unindex = function (id) {
    debug('deleteindex: ', id);
    return client.deleteAsync({
        index: 'places',
        type: 'place',
        id: id
    }).catch(function (error) {
        // logger.error(error);
    });
}
