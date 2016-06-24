'use strict';

var Places = require('ournet.data.places');

exports.access = Places.AccessService.instance;
exports.control = Places.ControlService.instance;
