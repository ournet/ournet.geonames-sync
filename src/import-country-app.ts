require("dotenv").load();

import logger from "./logger";
import { importCountry } from "./import-country";
import { AltNamesDatabase } from "./alt-names-db";
import { delay } from "./utils";

const input_country = process.env.COUNTRY || "";
logger.warn("start import country", input_country);
if (!input_country)
  throw new Error(`Country ${input_country} is not supported`);

const countries = input_country.split(/[,;]/g).filter((c) => !!c.trim());

const placeType = ["true", "1", "True", "yes"].includes(
  process.env.IMPORTANT_ONLY || ""
)
  ? {
      P: ["PPLC", "PPLA", "ADM1", "ADM2", "PCLI"],
      A: ["ADM1", "ADM2", "PCLI"]
    }
  : null;

const startId = process.env.START_ID;

const namesDb = new AltNamesDatabase();

async function start() {
  for (const country of countries) {
    logger.warn("IMPORTING", country);
    await importCountry(namesDb, country, { startId, placeType });
    if (countries.length > 1) delay(1000 * 3);
    logger.warn("SUCCESS END IMPORT", country);
  }
}

start()
  .then(function () {
    logger.warn("SUCCESS END IMPORT");
  })
  .catch(function (error) {
    logger.error("ERROR END IMPORT: " + input_country, error);
  })
  .then(() => namesDb.close());
