'use strict';

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
