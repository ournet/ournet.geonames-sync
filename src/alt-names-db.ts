import { Database } from "sqlite3";
import { TEMP_DIR, isFileFresh, removeFR } from "./downloader";
import { join } from "path";
import { parseAltName, GeonameAltName } from "./geonames";
import { isValidAltName } from "./utils";
import { LineReader } from "./line-reader";

export class AltNamesDatabase {
  private db: Database;
  private tableName = "names";
  constructor() {
    const file = join(TEMP_DIR, `alt-names.db`);
    if (!isFileFresh(file, 24 * 30)) {
      removeFR(file);
    }
    this.db = new Database(file);
  }

  async geoNameAltNames(geonameid: string) {
    const sql = `SELECT geonameid, name, language, isColloquial, isHistoric, isPreferred, isShort FROM ${this.tableName} WHERE geonameid=${geonameid}`;
    const names = await this.all<GeonameAltName>(sql);

    return names.map<GeonameAltName>((item) => ({
      geonameid,
      name: item.name,
      language: item.language,
      isColloquial: !!item.isColloquial,
      isHistoric: !!item.isHistoric,
      isPreferred: !!item.isPreferred,
      isShort: !!item.isShort
    }));
  }

  async init() {
    try {
      console.log("creating table");
      await this.run(
        `CREATE TABLE ${this.tableName} (geonameid INTEGER, name TEXT, language TEXT, isPreferred INTEGER, isShort INTEGER, isColloquial INTEGER, isHistoric INTEGER);`
      );
      // console.log('crating index')
      // await this.run(`CREATE INDEX geonameid_index ON ${this.tableName}(geonameid);`)
    } catch (e) {
      console.log(e);
    }
    console.log("selecting count");
    const count = (
      await this.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName};`
      )
    ).count;
    console.log("count", count);
    if (count > 0) {
      console.log("inited!");
      return;
    }
    console.log("initing...");
    await this.fillDb();

    console.log("crating index");
    await this.run(
      `CREATE INDEX geonameid_index ON ${this.tableName}(geonameid);`
    );

    console.log("inited");
  }

  private async fillDb() {
    let countAdded = 0;

    const lineReader = new LineReader(
      join(TEMP_DIR, "alternateNames", "alternateNames.txt")
    );

    let statment = this.db.prepare(
      `INSERT INTO ${this.tableName} VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    await this.parallelize(async () => {
      await lineReader.start(async (line) => {
        const altName = parseAltName(line);
        if (!isValidAltName(altName.name, altName.language)) {
          return;
        }
        countAdded++;

        statment.run([
          altName.geonameid,
          altName.name,
          altName.language,
          altName.isPreferred === true ? 1 : 0,
          altName.isShort === true ? 1 : 0,
          altName.isColloquial === true ? 1 : 0,
          altName.isHistoric === true ? 1 : 0
        ]);

        if (countAdded % 1000 === 0) {
          console.log(`saving ${countAdded}...`);
          await new Promise((resolve, reject) => {
            statment.finalize((error) =>
              error ? reject(error) : resolve(null)
            );
          });
          statment = this.db.prepare(
            `INSERT INTO ${this.tableName} VALUES (?, ?, ?, ?, ?, ?, ?)`
          );
          console.log(
            `added ${countAdded} alt names`,
            new Date().toISOString()
          );
        }
      });
    });

    await new Promise((resolve, reject) => {
      statment.finalize((error) => (error ? reject(error) : resolve(null)));
    });
  }

  private parallelize(cb: () => Promise<void>) {
    return new Promise<void>((resolve, reject) => {
      this.db.parallelize(() => {
        cb().then(resolve).catch(reject);
      });
    });
  }

  private async all<T>(sql: string) {
    return await new Promise<T[]>((resolve, reject) => {
      this.db.all(sql, (error, rows) => {
        if (error) {
          return reject(error);
        }
        resolve(rows);
      });
    });
  }
  private async get<T>(sql: string) {
    return await new Promise<T>((resolve, reject) => {
      this.db.get(sql, (error, row) => {
        if (error) {
          return reject(error);
        }
        resolve(row);
      });
    });
  }
  private async run(sql: string, params?: any[]) {
    return await new Promise<void>((resolve, reject) => {
      this.db.run(sql, params, (error) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  async close() {
    await new Promise((resolve, reject) =>
      this.db.close((error) => (error ? reject() : resolve(null)))
    );
  }
}
