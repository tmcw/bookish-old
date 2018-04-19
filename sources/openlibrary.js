const bent = require("bent");
const _ = require("lodash");
const getJSON = bent("json", 200);

// https://openlibrary.org/dev/docs/api/books
// TODO: handle 10 vs 13
class OpenLibrary {
  constructor(
    base = "https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys="
  ) {
    this.base = base;
  }
  async getType(type, val) {
    try {
      let res = await getJSON(`${this.base}${type}:${val}`);
      let identifiers = _.property([`${type}:${val}`, "identifiers"])(res);
      identifiers.isbn = (identifiers.isbn_10 || []).concat(
        identifiers.isbn_13 || []
      );
      return identifiers;
    } catch (e) {
      return null;
    }
  }
  async ISBN(isbn) {
    return await this.getType("ISBN", isbn);
  }
  async LCCN(lccn) {
    return await this.getType("LCCN", lccn);
  }
  async OLID(openlibrary) {
    return await this.getType("OLID", openlibrary);
  }
  async OCLC(oclc) {
    return await this.getType("OCLC", oclc);
  }
}

module.exports = OpenLibrary;
