const bent = require("bent");
const _ = require("lodash");
const getText = bent("string", 200);
const { GOODREADS_KEY } = require("../settings");
const getXML = async url =>
  cheerio.load(await bent("string", 200)(url), { xmlMode: true });

// https://www.goodreads.com/api/index#book.isbn_to_id
class GoodReads {
  constructor(base = "https://www.goodreads.com/book") {
    this.base = base;
  }
  async ISBN(isbn) {
    const id = await getText(
      `${this.base}/isbn_to_id/${isbn}?key=${GOODREADS_KEY}`
    );
    return {
      goodreads: [String(id)]
    };
  }
  async GoodReads(goodreads) {
    const url = `${this.base}/show/${goodreads}.json?key=${GOODREADS_KEY}`;
    const res = await getXML(url);
    const ids = {};
    ["isbn", "isbn13", "asin"].forEach(type => {
      const value = res(`GoodreadsResponse > book > ${type}`).text();
      if (value) ids[type] = [value];
    });
    return ids;
  }
}

module.exports = GoodReads;
