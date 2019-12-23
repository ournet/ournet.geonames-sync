import { LineReader } from "./line-reader";
import { GeoName, parseGeoName } from "./geonames";
import logger from "./logger";
import { join } from "path";
import { getCountryFileName, downloadCountry } from "./downloader";

export class FileGeonameReader {
  private reader: LineReader;
  constructor(file: string) {
    this.reader = new LineReader(file);
  }

  start(cb: (geoname: GeoName) => Promise<void>) {
    return this.reader.start(async line => {
      const geoname = parseGeoName(line);
      if (!geoname) {
        logger.warn("No geoname", {
          line: line
        });
      }
      await cb(geoname);
    });
  }
}

export class CountryGeonameReader extends FileGeonameReader {
  constructor(private country: string) {
    super(join(getCountryFileName(country)));
  }

  async start(cb: (geoname: GeoName) => Promise<void>) {
    await downloadCountry(this.country);
    return super.start(cb);
  }
}
