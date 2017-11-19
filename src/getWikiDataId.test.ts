
import test from 'ava';
import { getWikiDataId } from './getWikiDataId';

test('get Chisinau wikidataID', async t => {
    const id = await getWikiDataId(618426);
    t.is('Q21197', id, 'id is Q21197');
});

