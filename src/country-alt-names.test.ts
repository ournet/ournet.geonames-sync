
import test from 'ava';

import { CountryAltNames } from './country-alt-names';

const mdNames = new CountryAltNames('ru');

test.after('close', () => mdNames.close());

test('init', async t => {
    await t.notThrows(mdNames.init());
})

test('geoNames by id', async t => {
    const names = await mdNames.geoNameAltNames('618426');
    t.true(names.length > 0);
})
