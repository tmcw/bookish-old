/*
 * TODO
 *
 * - viaf identifiers?
 * - write back to openlibrary whenever someone queries for a book?
 */

const { send } = require("micro");
const bent = require("bent");
const https = require("https");
const pelo = require("pelo");
const url = require("url");
const cheerio = require("cheerio");
const { GOODREADS_KEY } = require("./settings");
const getJSON = bent("json", 200);
const getText = bent("string", 200);
const getRedirect = bent("string", 303);
const _ = require("lodash");
const getXML = async url =>
  cheerio.load(await bent("string", 200)(url), { xmlMode: true });

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
        openlibrary: await OpenLibrary.ISBN(req.isbn),
        goodreads: await goodreads.ISBN(req.isbn),
        worldcat: await WorldCat.ISBN(req.isbn)
      }
    };
  }
  if (req.openlibrary) {
    return {
      data: {
        openlibrary: await OpenLibrary.OLID(req.openlibrary)
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
          openlibrary: await OpenLibrary.ISBN(isbn),
          goodreads: await goodreads.ISBN(isbn),
          worldcat: await WorldCat.ISBN(isbn)
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
        openlibrary: await OpenLibrary.LCCN(req.lccn)
      }
    };
  }
  if (req.oclc) {
    return {
      data: {
        openlibrary: await OpenLibrary.OCLC(req.oclc),
        worldcat: await WorldCat.OCLC(req.oclc)
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
