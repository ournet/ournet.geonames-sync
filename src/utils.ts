
const standardText = require('standard-text') as (text: string) => string;

export { standardText }

const SupportedCountries = ['md', 'ro', 'ru', 'in', 'pl', 'cz', 'hu', 'it', 'bg', 'al', 'tr'];
const SupportedLanguages = ['en', 'es', 'fr', 'de', 'ro', 'ru', 'hu', 'hi', 'pl', 'cs', 'it', 'bg', 'sq', 'tr', 'ku'];

const COUNTRY_LANGUAGES: { [name: string]: string[] } = {
	ro: ['en', 'ro', 'hu'],
	md: ['en', 'ro', 'ru'],
	ru: ['en', 'ru'],
	in: ['en', 'hi'],
	pl: ['en', 'pl'],
	cz: ['en', 'cs'],
	hu: ['en', 'ro', 'hu'],
	it: ['en', 'it'],
	bg: ['en', 'ro', 'bg'],
	al: ['en', 'sq'],
	tr: ['en', 'tr', 'ku']
}

export function countryLanguages(country: string) {
	return COUNTRY_LANGUAGES[country.toLowerCase()];
}

export function isSupportedCountry(country: string) {
	return SupportedCountries.indexOf(country) >= 0;
}

export function supportedLanguages() {
	return SupportedLanguages;
}

export function isSupportedLanguage(lang: string) {
	return SupportedLanguages.indexOf(lang) >= 0;
}

export function isValidAltName(name: string, lang: string) {
	if (typeof lang !== 'string' || lang.length !== 2) {
		return false;
	}

	if (lang === 'ru') {
		for (var i = name.length - 1; i >= 0; i--) {
			var ch = name[i];
			if (isRussianChar(ch)) {
				return true;
			}
		}
		return false;
	}

	return true;
};

// export function isValidPlace(place) {
// 	return (~SupportedCountries.indexOf(place.country_code.toLowerCase())) && (place.feature_class === 'P' || place.feature_class === 'A' && place.feature_code === 'ADM1');
// };

export function isRussianChar(ch: string) {
	return (ch >= 'а' && ch <= 'я') || (ch >= 'А' && ch <= 'Я');
}

const VALID_PLACE_TYPES: { [name: string]: string[] } = {
	A: ['ADM1'],
	P: [],
	S: ['AIRP', 'ANS', 'ATHF', 'CSTL', 'HSTS', 'OBS', 'PYR', 'PYRS', 'RLG', 'ZOO'],
	T: ['BCH', 'BCHS', 'CNYN', 'DSRT', 'DLTA', 'DPR', 'DSRT', 'HDLD', 'HLL', 'HLLS', 'ISLET', 'ISLF', 'MT', 'MTS', 'PK', 'PKS', 'PLN', 'VAL', 'VALS', 'VLC'],
	V: ['FRST', 'GRSLD']
};

export function isValidPlace(place: { country_code: string, feature_class: string, feature_code: string, admin1_code: string }) {
	return place && place.admin1_code && isSupportedCountry(place.country_code) && isValidPlaceType(place);
}

export function isValidPlaceType(place: { feature_class: string, feature_code: string }) {
	return place && place.feature_class
		&& VALID_PLACE_TYPES[place.feature_class] &&
		(VALID_PLACE_TYPES[place.feature_class].length === 0 ||
			VALID_PLACE_TYPES[place.feature_class].indexOf(place.feature_code) >= 0);
}
