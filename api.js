/*
 * TODO
 *
 * - viaf identifiers?
 * - write back to openlibrary whenever someone queries for a book?
 */
const _ = require("lodash");
const GoodReads = require('./sources/goodreads');
const OpenLibrary = require('./sources/openlibrary');
const WorldCat = require('./sources/worldcat');

const goodreads = new GoodReads();
const openLibrary = new OpenLibrary();
const worldCat = new WorldCat();

const methods = {
  isbn: {
    name: "International Standard Book Number",
    example: "0140098682"
  },
  oclc: {
    name: "Ohio College Library Center",
    url: id => `http://www.worldcat.org/oclc/${id}?tab=details`,
    example: "956478923"
  },
  openlibrary: {
    name: "OpenLibrary ID",
    url: id => `https://openlibrary.org/books/${id}`,
    example: "OL794799M"
  },
  lccn: {
    name: "Library of Congress Control Number",
    url: id => `http://lccn.loc.gov/${id}`,
    example: "95030619"
  },
  // TODO: necessary
  // 'asin': 'Amazon Standard Identification Number',
  goodreads: {
    name: "GoodReads ID",
    url: id => `https://www.goodreads.com/book/show/${id}`,
    example: "544063"
  }
  // TODO: librarything
};

async function query(req) {
  if (req.isbn) {
    return {
      data: {
        openlibrary: await openLibrary.ISBN(req.isbn),
        goodreads: await goodreads.ISBN(req.isbn),
        worldcat: await worldCat.ISBN(req.isbn)
      }
    };
  }
  if (req.openlibrary) {
    return {
      data: {
        openlibrary: await openLibrary.OLID(req.openlibrary)
      }
    };
  }
  if (req.goodreads) {
    let g = await goodreads.GoodReads(req.goodreads);
    if (g.isbn && g.isbn.length) {
      let isbn = g.isbn[0];
      return {
        data: {
          goodreads: goodreads,
          openlibrary: await openLibrary.ISBN(isbn),
          goodreads: await goodreads.ISBN(isbn),
          worldcat: await worldCat.ISBN(isbn)
        }
      };
    }
    return {
      data: {
        goodreads: g
      }
    };
  }
  if (req.lccn) {
    return {
      data: {
        openlibrary: await openLibrary.LCCN(req.lccn)
      }
    };
  }
  if (req.oclc) {
    return {
      data: {
        openlibrary: await openLibrary.OCLC(req.oclc),
        worldcat: await worldCat.OCLC(req.oclc)
      }
    };
  }

  if (url === "/") {
    return {
      jsonapi: {
        version: "1.0"
      }
    };
  }
}

function collapseResults(results) {
  let ids = {};
  for (let source in results) {
    for (let id in results[source]) {
      ids[id] = (ids[id] || []).concat(results[source][id]);
    }
  }
  // TODO: note provenance
  for (let id in ids) {
    ids[id] = _.uniq(_.compact(ids[id]));
  }
  return ids;
}

module.exports.query = query;
module.exports.methods = methods;
module.exports.collapseResults = collapseResults;
