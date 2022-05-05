import fetch from "node-fetch";

export function getWikiDataId(geonameId: string): Promise<string | null> {
  const query = `select ?item {?item wdt:P1566 "${geonameId}" .}`;

  return fetch(
    "https://query.wikidata.org/sparql?format=json&query=" +
      encodeURIComponent(query),
    {
      method: "GET"
    }
  )
    .then((response) => response.json())
    .then(
      (json: any) =>
        json &&
        json.results &&
        json.results.bindings &&
        json.results.bindings.length &&
        json.results.bindings[0].item.value.replace(
          "http://www.wikidata.org/entity/",
          ""
        )
    )
    .then((result) => {
      if (typeof result === "string" && /^Q\d+$/.test(result)) {
        return result;
      }
      return null;
    });
}
