
import { Database, verbose } from 'sqlite3';
const sqlite3 = verbose();
import { TEMP_DIR, getCountryIds, isFileFresh, removeFR } from './downloader';
import { join } from 'path';
import * as readline from 'readline';
import { createReadStream } from 'fs';
import { parseAltName, GeonameAltName } from './geonames';
import { isValidAltName } from './utils';

export class CountryAltNames {
    private db: Database
    private tableName = 'names';
    constructor(private country: string) {
        const file = join(TEMP_DIR, `${country}-alt-names.db`);
        if (!isFileFresh(file, 24 * 14)) {
            removeFR(file)
        }
        this.db = new sqlite3.Database(file);
    }

    async geoNameAltNames(geonameid: string) {
        const sql = `SELECT geonameid, name, language, isColloquial, isHistoric, isPreferred, isShort FROM ${this.tableName} WHERE geonameid=${geonameid}`;
        const names = await this.all<GeonameAltName>(sql);

        return names.map<GeonameAltName>(item => ({ geonameid, name: item.name, language: item.language, isColloquial: !!item.isColloquial, isHistoric: !!item.isHistoric, isPreferred: !!item.isPreferred, isShort: !!item.isShort }));
    }

    async init() {
        try {
            console.log('creating table')
            await this.run(`CREATE TABLE ${this.tableName} (id INTEGER, geonameid INTEGER, name TEXT, language TEXT, isPreferred INTEGER, isShort INTEGER, isColloquial INTEGER, isHistoric INTEGER);`)
            console.log('crating index')
            await this.run(`CREATE INDEX geonameid_index ON ${this.tableName}(geonameid);`)
        } catch (e) {
            console.log(e);
        }
        console.log('selecting count')
        const count = (await this.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${this.tableName};`)).count;
        console.log('count', count);
        if (count > 0) {
            console.log('inited!');
            return;
        }
        console.log('initing...');
        let id = 1;
        let countLines = 0;
        let countAdded = 0;
        await getCountryIds(this.country)
            .then(countryIds => {
                return new Promise<void>((resolve, reject) => {
                    readline.createInterface({
                        input: createReadStream(join(TEMP_DIR, 'alternateNames', 'alternateNames.txt'))
                    }).on('line', (line: string) => {
                        const altName = parseAltName(line);
                        // if (altName && altName.language && isValidCountryLang(country, altName.language)) {
                        if (isValidAltName(altName.name, altName.language, this.country) && countryIds[altName.geonameid]) {
                            countLines++;
                            this.run(`INSERT INTO ${this.tableName} VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                [id++, altName.geonameid, altName.name, altName.language, altName.isPreferred === true ? 1 : 0, altName.isShort === true ? 1 : 0, altName.isColloquial === true ? 1 : 0, altName.isHistoric === true ? 1 : 0])
                                .then(() => countAdded++)
                                .catch(e => reject(e));
                        }
                    }).on('close', () => {
                        resolve();
                    }).on('error', reject);
                })
            });

        while (countAdded < countLines) {
            await new Promise(resolve => setTimeout(resolve, 1000 * 1));
        }

        console.log('inited!');
    }

    private async all<T>(sql: string) {
        return await new Promise<T[]>((resolve, reject) => {
            this.db.all(sql, (error, rows) => {
                if (error) {
                    return reject(error);
                }
                resolve(rows);
            });
        })
    }
    private async get<T>(sql: string) {
        return await new Promise<T>((resolve, reject) => {
            this.db.get(sql, (error, row) => {
                if (error) {
                    return reject(error);
                }
                resolve(row);
            });
        })
    }
    private async run(sql: string, params?: any[]) {
        return await new Promise<void>((resolve, reject) => {
            this.db.run(sql, params, (error) => {
                if (error) {
                    return reject(error);
                }
                resolve();
            });
        })
    }

    async close() {
        await new Promise((resolve, reject) => this.db.close(error => error ? reject() : resolve()));
    }
}
