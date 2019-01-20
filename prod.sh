#!/bin/bash

yarn unlink @ournet/domain
yarn unlink @ournet/places-domain
yarn unlink @ournet/places-data

yarn add @ournet/domain
yarn add @ournet/places-domain
yarn add @ournet/places-data

yarn test
