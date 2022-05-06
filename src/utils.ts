import { uniq } from "@ournet/domain";

const standardText = require("standard-text") as (text: string) => string;

export { standardText };

export const DATA: {
  [code: string]: string[];
} = require("../valid-languages-by-country.json");
const LANGUAGES = uniq(
  Object.keys(DATA).reduce<string[]>((list, cc) => {
    list = list.concat(DATA[cc]);
    return list;
  }, [])
);
const COUNTRIES = Object.keys(DATA);

// export function getValidLanguageCodes() {
// 	return CODES;
// }

export function isValidLanguage(lang: string) {
  return LANGUAGES.indexOf(lang) > -1;
}

export function isValidCountryLanguage(lang: string, country: string) {
  const codes = DATA[country.trim().toLowerCase()];
  return codes.indexOf(lang) > -1;
}

export function isSupportedCountry(country: string) {
  return COUNTRIES.indexOf(country) >= 0;
}

export function isValidAltName(
  name: string,
  lang: string,
  featureCode?: string
) {
  if (typeof name !== "string" || name.trim().length < 2) {
    return false;
  }

  if (!lang || !/^[a-z]{2}$/.test(lang)) {
    return false;
  }

  if (lang === "ru") {
    for (const ch of name) {
      if (isRussianChar(ch)) {
        return true;
      }
    }
    return false;
  }

  if (lang === "be") {
    for (const ch of name) {
      if (isBelarusianChar(ch)) {
        return true;
      }
    }
    return false;
  }

  if (featureCode === "PPLA") {
    if (name.startsWith("Raionul ")) return false;
  }

  if (["ro", "en", "fr", "de", "it", "es", "pt", "pl"].includes(lang)) {
    for (const ch of name) {
      if (isRussianChar(ch)) {
        return false;
      }
    }
  }

  // if (lang === "sr") {
  //   for (const ch of name) {
  //     if (isSerbianChar(ch)) {
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  return true;
}

// export function isValidPlace(place) {
// 	return (~SupportedCountries.indexOf(place.country_code.toLowerCase())) && (place.feature_class === 'P' || place.feature_class === 'A' && place.feature_code === 'ADM1');
// };

export function isSerbianChar(ch: string) {
  return (
    (ch >= "а" && ch <= "ш") ||
    (ch >= "А" && ch <= "Ш") ||
    [
      1057, 1088, 1087, 1089, 1082, 1080, 1112, 1077, 1079, 1080, 1082, 1082,
      1072, 1088, 1072, 1082, 1090, 1077, 1088, 1080, 1089, 1090, 1080, 1095,
      1085, 1072
    ].includes(ch.charCodeAt(0))
  );
}

export function isRussianChar(ch: string) {
  return (ch >= "а" && ch <= "я") || (ch >= "А" && ch <= "Я");
}

export function isBelarusianChar(ch: string) {
  return (ch >= "а" && ch <= "я") || (ch >= "А" && ch <= "Я");
}

const VALID_PLACE_TYPES: { [name: string]: string[] } = {
  A: ["ADM1"],
  L: [
    "CST",
    "LCTY",
    "MILB",
    "MVA",
    "OILF",
    "PRT",
    "RGN",
    "RGNH",
    "RGNL",
    "TRB"
  ],
  P: [],
  S: [
    "AIRP",
    "ANS",
    "ATHF",
    "CSTL",
    "HSTS",
    "OBS",
    "PYR",
    "PYRS",
    "RLG",
    "RSRT",
    "ZOO"
  ],
  T: [
    "BCH",
    "BCHS",
    "CNYN",
    "DSRT",
    "DLTA",
    "DPR",
    "DSRT",
    "HDLD",
    "HLL",
    "HLLS",
    "ISLET",
    "ISLF",
    "MT",
    "MTS",
    "PK",
    "PKS",
    "PLN",
    "VAL",
    "VALS",
    "VLC"
  ],
  V: ["FRST", "GRSLD"]
};

export function isValidPlace(place: {
  country_code: string;
  feature_class: string;
  feature_code: string;
  admin1_code: string;
  timezone: string;
}) {
  return (
    place &&
    place.admin1_code &&
    place.admin1_code !== "00" &&
    place.feature_class &&
    place.feature_code &&
    isSupportedCountry(place.country_code) &&
    isValidPlaceType(place) &&
    !!place.timezone
  );
}

export function isValidPlaceType(place: {
  feature_class: string;
  feature_code: string;
}) {
  return (
    place &&
    place.feature_class &&
    VALID_PLACE_TYPES[place.feature_class] &&
    (VALID_PLACE_TYPES[place.feature_class].length === 0 ||
      VALID_PLACE_TYPES[place.feature_class].indexOf(place.feature_code) >= 0)
  );
}

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
