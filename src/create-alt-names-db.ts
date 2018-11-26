
import { AltNamesDatabase } from './alt-names-db';

const db = new AltNamesDatabase();

db.init()
    .then(() => console.log('DONE'))
    .catch(e => console.trace(e))
