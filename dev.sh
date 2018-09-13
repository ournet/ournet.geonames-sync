#!/bin/bash

yarn remove @ournet/domain
yarn remove @ournet/places-domain
yarn remove @ournet/places-data

yarn link @ournet/domain
yarn link @ournet/places-domain
yarn link @ournet/places-data

yarn test
