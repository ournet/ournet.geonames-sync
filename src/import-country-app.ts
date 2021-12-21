require("dotenv").load();

import { isSupportedCountry } from "./utils";
import logger from "./logger";
import { importCountry } from "./import-country";
import { AltNamesDatabase } from "./alt-names-db";

process.on("uncaughtException", function (err) {
  logger.error("uncaughtException: " + err.message, err);
});

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at:", p, "reason:", reason);
});

process.on("warning", (warning) => {
  console.warn(warning.name); // Print the warning name
  console.warn(warning.message); // Print the warning message
  console.warn(warning.stack); // Print the stack trace
});

const country = process.env.COUNTRY || "";
logger.warn("start import country", country);
if (!isSupportedCountry(country)) {
  throw new Error(`Country ${country} is not supported`);
}

const startId = process.env.START_ID || "";

const namesDb = new AltNamesDatabase();

async function start() {
  await importCountry(namesDb, country, { startId: startId });
}

start()
  .then(function () {
    logger.warn("SUCCESS END IMPORT");
  })
  .catch(function (error) {
    logger.error("ERROR END IMPORT: " + country, error);
  })
  .then(() => namesDb.close());
