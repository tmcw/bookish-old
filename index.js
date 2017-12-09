const {send} = require('micro');
const bent = require('bent');
const wae = require('web-auto-extractor').default;
const https = require('https');
const {GOODREADS_KEY} = require('./settings');
const getJSON = bent('json', 200);
const getText = bent('string', 200);
const getRedirect = bent('string', 303);

const methods = {
  'ISBN': 'International Standard Book Number',
  'OCLC': {
    name: 'Ohio College Library Center',
    url: id => `http://www.worldcat.org/oclc/${id}?tab=details`
  },
  'OLID': {
    name: 'OpenLibrary ID',
    url: id => `https://openlibrary.org/books/${id}`
  },
  'LCCN': {
    name: 'Library of Congress Control Number',
    url: id => `http://lccn.loc.gov/${id}`
  },
  // TODO: necessary
  'ASIN': 'Amazon Standard Identification Number',
  'goodreads': {
    name: 'GoodReads ID',
    url: id => `https://www.goodreads.com/book/show/${id}`
  }
};

// https://openlibrary.org/dev/docs/api/books
const OpenLibrary = {
  base: 'https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=',
  // TODO: handle 10 vs 13
  async ISBN(isbn) {
    const obj = await getJSON(`${this.base}ISBN:${isbn}`);
    return obj[`ISBN:${isbn}`].identifiers;
  },
  async LCCN(lccn) {
    const obj = await getJSON(`${this.base}LCCN:${lccn}`);
    return obj[`LCCN:${lccn}`].identifiers;
  },
  async OLID(olid) {
    const obj = await getJSON(`${this.base}OLID:${olid}`);
    return obj[`OLID:${olid}`].identifiers;
  },
  async OCLC(oclc) {
    const obj = await getJSON(`${this.base}OCLC:${oclc}`);
    return obj[`OCLC:${oclc}`].identifiers;
  }
}

// https://www.goodreads.com/api/index#book.isbn_to_id
const goodreads = {
  base: 'https://www.goodreads.com/book/isbn_to_id/',
  // TODO: handle 10 vs 13
  async ISBN(isbn) {
    const id = await getText(`${this.base}${isbn}?key=${GOODREADS_KEY}`);
    return {
      goodreads: [String(id)]
    };
  }
}

// https://openlibrary.org/dev/docs/api/books
const WorldCat = {
  base: 'https://www.worldcat.org',
  // TODO: handle 10 vs 13
  async OCLC(oclc) {
    const redirectedUrl = await new Promise(resolve => {
      https.get(`${this.base}/oclc/${oclc}`, res => {
        resolve(res.headers.location);
      });
    });
    const pageContent = await getText(redirectedUrl);
    const microdata = wae().parse(pageContent);
    // TODO: how else could this data be shaped?
    return {
      isbn: microdata.rdfa.ProductModel[0]['schema:isbn']
    };
  }
}

module.exports = async (req, res) => {
  let match;
  
  if (match = req.url.match(/^\/isbn\/(\d{10,13})$/)) {
    return send(res, 200, {
      openlibrary: await OpenLibrary.ISBN(match[1]),
      goodreads: await goodreads.ISBN(match[1])
    });
  }

  if (match = req.url.match(/^\/olid\/(OL\d{10,13})$/)) {
    return send(res, 200, await OpenLibrary.OLID(match[1]));
  }

  if (match = req.url.match(/^\/lccn\/(\d+)$/)) {
    return send(res, 200, await OpenLibrary.LCCN(match[1]));
  }

  if (match = req.url.match(/^\/oclc\/(\d+)$/)) {
    return send(res, 200, {
      openlibrary: await OpenLibrary.OCLC(match[1]),
      worldcat: await WorldCat.OCLC(match[1])
    });
  }

  res.end('Welcome to micro');
}
