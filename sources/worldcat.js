const https = require("https");
const wae = require("web-auto-extractor").default;
const bent = require("bent");
const _ = require("lodash");
const getText = bent("string", 200);

// TODO: handle 10 vs 13
class WorldCat {
  constructor(base = "https://www.worldcat.org") {
    this.base = base;
  }
  async get(type, id) {
    const redirectedUrl = await new Promise(resolve => {
      https.get(`${this.base}/${type}/${id}`, res => {
        resolve(res.headers.location);
      });
    });
    const microdata = wae().parse(await getText(redirectedUrl));
    // TODO: how else could this data be shaped?
    return {
      isbn: _.property(["rdfa", "ProductModel", 0, "schema:isbn"])(microdata),
      oclc: _.property(["rdfa", "CreativeWork", 0, "library:oclcnum"])(
        microdata
      )
    };
  }
  async OCLC(oclc) {
    return await this.get("oclc", oclc);
  }
  async ISBN(isbn) {
    return await this.get("isbn", isbn);
  }
}

module.exports = WorldCat;
