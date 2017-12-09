const {send} = require('micro');
const bent = require('bent');
const wae = require('web-auto-extractor').default;
const https = require('https');
const pelo = require('pelo');
const url = require('url');
const {GOODREADS_KEY} = require('./settings');
const getJSON = bent('json', 200);
const getText = bent('string', 200);
const getRedirect = bent('string', 303);

const methods = {
  'isbn': {
    name: 'International Standard Book Number',
    example: '0140098682'
  },
  'oclc': {
    name: 'Ohio College Library Center',
    url: id => `http://www.worldcat.org/oclc/${id}?tab=details`,
    example: '956478923'
  },
  'olid': {
    name: 'OpenLibrary ID',
    url: id => `https://openlibrary.org/books/${id}`,
    example: 'OL794799M'
  },
  'lccn': {
    name: 'Library of Congress Control Number',
    url: id => `http://lccn.loc.gov/${id}`,
    example: '95030619'
  },
  // TODO: necessary
  // 'asin': 'Amazon Standard Identification Number',
  'goodreads': {
    name: 'GoodReads ID',
    url: id => `https://www.goodreads.com/book/show/${id}`,
    example: '544063'
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

async function query(url) {
  let match;
  if (match = url.match(/^\/\?isbn=(\d{10,13})$/)) {
    return {
      data: {
        openlibrary: await OpenLibrary.ISBN(match[1]),
        goodreads: await goodreads.ISBN(match[1])
      }
    };
  }

  if (match = url.match(/^\/\?olid=(OL\d{10,13})$/)) {
    return {
      data: await OpenLibrary.OLID(match[1])
    };
  }

  if (match = url.match(/^\/\?lccn=(\d+)$/)) {
    return {
      data: await OpenLibrary.LCCN(match[1])
    };
  }

  if (match = url.match(/^\/\?oclc=(\d+)$/)) {
    return {
      data: {
        openlibrary: await OpenLibrary.OCLC(match[1]),
        worldcat: await WorldCat.OCLC(match[1])
      }
    };
  }

  if (url === '/') {
    return {
      "jsonapi": {
        "version": "1.0"
      }
    };
  }
}

function renderPage(results) {
  if (results.data) {
    return pelo`<html>
      <h2>Results</h2>
      <pre>${JSON.stringify(results.data, null, 2)}
      </pre>
    </html>`;
  } else {
    return pelo`<html>
      <h2>bookish</h2>
      <p>A book by lots of other identifiers should be the same book.</p>
      ${Object.keys(methods).map(method => pelo`
      <form method=get>
        <label for=${method}>${method}</label>
        <input name=${method} type=text />
        <input type=submit value='Search' />
      </form>`)}
      <hr />
      <h3>Information</h3>
      <ul>
        ${Object.keys(methods).map(method => pelo`
        <li>
          ${method} is ${methods[method].name}.
          <ul>
          <li>
          Example:
          <a
          href='/?${method}=${methods[method].example}'>${method}=${methods[method].example}</a>
          </li>
          </ul>
        </li>`)}
      </ul>
    </html>`;
  }
}

module.exports = async (req, res) => {
  const results = await query(req.url);
  if (req.headers.accept.match(/json/)) {
    return send(res, 200, results);
  } else if (results) {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderPage(results).toString());
  } else {
    res.end();
  }
}
