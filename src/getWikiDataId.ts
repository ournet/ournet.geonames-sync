
import fetch from 'node-fetch';

export function getWikiDataId(geonameId: number): Promise<string> {

    const query = `select ?item {?item wdt:P1566 "${geonameId}" .}`;

    return fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query), {
        method: 'GET'
    })
        .then(response => response.json())
        .then(json => json && json.results && json.results.bindings && json.results.bindings.length && json.results.bindings[0].item.value.replace('http://www.wikidata.org/entity/', ''));
}
