// const utils = require('./utils');
import * as path from "path";
import * as fs from "fs";
import * as http from "http";
// const fs = Promise.promisifyAll(require('fs'));
// const fse = Promise.promisifyAll(require('fs-extra'));
const AdmZip = require("adm-zip");
export const TEMP_DIR = path.join("F:", "temp");
const debug = require("debug")("ournet:geonames-sync");
import * as readline from "readline";
// const AltNames = require('./altnames');
import * as rimraf from "rimraf";
import logger from "./logger";

export function downloadCities15000() {
  const name = "cities15000";
  return downloadUnzip(name).then(file => path.join(file, name + ".txt"));
}

export function getCountryFileName(country: string) {
  country = country.toUpperCase();
  return path.join(TEMP_DIR, country, country + ".txt");
}

export function downloadCountry(country_code: string) {
  country_code = country_code.toUpperCase();
  return downloadUnzip(country_code).then(file =>
    path.join(file, country_code + ".txt")
  );
}

export function downloadAlternateNames() {
  return downloadUnzip("alternateNames").then(file =>
    path.join(file, "alternateNames.txt")
  );
}

export function downloadFile(filename: string): Promise<string> {
  debug("downloading file", filename);

  var file = path.join(TEMP_DIR, filename);
  return Promise.all([removeFR(file.replace(/\.\w+$/, "")), removeFR(file)])
    .then(function() {
      var url = "http://download.geonames.org/export/dump/" + filename;
      debug("downloading url", url);
      return new Promise(function(resolve, reject) {
        http
          .get(url, function(response) {
            const outFile = fs.createWriteStream(file);
            response.pipe(outFile);
            outFile.on("finish", function() {
              outFile.close();
              resolve();
            });
          })
          .on("error", reject);
      });
    })
    .then(() => file);
}

export function getCountryIds(
  country: string
): Promise<{ [id: string]: boolean }> {
  const countryFile = path.join(TEMP_DIR, country.toLowerCase() + "-ids.txt");
  return isFileFresh(countryFile).then(isFresh => {
    if (isFresh) {
      logger.info("country ids file is fresh");
      return JSON.parse(fs.readFileSync(countryFile, "utf8"));
    }

    const file = path.join(
      TEMP_DIR,
      country.toUpperCase(),
      country.toUpperCase() + ".txt"
    );
    try {
      fs.unlinkSync(countryFile);
    } catch (e) {
      logger.warn(e);
    }
    logger.info("Creating country ids file");
    return downloadCountry(country).then(() => {
      return new Promise<{ [id: number]: boolean }>((resolve, reject) => {
        const ids: { [id: number]: boolean } = {};

        readline
          .createInterface({
            input: fs.createReadStream(file)
          })
          .on("line", (line: string) => {
            if (/^\d+\t/.test(line)) {
              ids[parseInt(line.split(/\t+/)[0])] = true;
            }
          })
          .on("close", () => {
            fs.writeFileSync(countryFile, JSON.stringify(ids), "utf8");
            resolve(ids);
          })
          .on("error", reject);
      });
    });
  });
}

function unzip(file: string, output: string): Promise<string> {
  return removeFR(output)
    .then(new AdmZip(file).extractAllTo(output, true))
    .then(() => output);
}

function downloadUnzip(name: string, hours?: number) {
  var folderName = path.join(TEMP_DIR, name);
  const zipName = path.join(TEMP_DIR, name + ".zip");
  return isFileFresh(zipName, hours).then(isFresh => {
    if (isFresh) {
      debug("file is fresh", zipName);
      return Promise.resolve(folderName);
    }
    return (
      removeFR(folderName)
        .then(() => downloadFile(name + ".zip"))
        // .delay(1000 * 2)
        .then(function() {
          return unzip(zipName, folderName).then(function() {
            return folderName;
          });
        })
    );
  });
}

export function isFileFresh(file: string, hours: number = 6) {
  try {
    const stats = fs.statSync(file);
    return Promise.resolve(
      stats.ctime.getTime() > Date.now() - hours * 60 * 60 * 1000
    );
  } catch (e) {
    return Promise.resolve(false);
  }
}

export function removeFR(file: string): Promise<string> {
  return new Promise(resolve => {
    rimraf(file, () => {
      // if (error) {
      //     return reject(error);
      // }
      resolve(file);
    });
  });
}

// function mkdir(dir: string): Promise<string> {
//     return new Promise((resolve) => {
//         rimraf(file, () => {
//             // if (error) {
//             //     return reject(error);
//             // }
//             resolve(file);
//         });
//     });
// }
