const {send} = require('micro');
const bent = require('bent');
const wae = require('web-auto-extractor').default;
const https = require('https');
const pelo = require('pelo');
const url = require('url');
const cheerio = require('cheerio');
const {GOODREADS_KEY} = require('./settings');
const getJSON = bent('json', 200);
const getText = bent('string', 200);
const getRedirect = bent('string', 303);
const _ = require('lodash');
const getXML = async url =>
  cheerio.load(await bent('string', 200)(url), { xmlMode: true });

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
  'openlibrary': {
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
  async getType(type, val) {
    try {
      let res = await getJSON(`${this.base}${type}:${val}`);
      let identifiers = _.property([`${type}:${val}`, 'identifiers'])(res);
      identifiers.isbn = (identifiers.isbn_10 || []).concat(identifiers.isbn_13 || []);
      return identifiers;
    } catch (e) {
      return null;
    }
  },
  async ISBN(isbn) {
    return await this.getType('ISBN', isbn);
  },
  async LCCN(lccn) {
    return await this.getType('LCCN', lccn);
  },
  async OLID(openlibrary) {
    return await this.getType('OLID', openlibrary);
  },
  async OCLC(oclc) {
    return await this.getType('OCLC', oclc);
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
  },
  async GoodReads(goodreads) {
    const url = `https://www.goodreads.com/book/show/${goodreads}.json?key=${GOODREADS_KEY}`;
    const res = await getXML(url);
    const ids = {};
    ['isbn', 'isbn13', 'asin'].forEach(type => {
      const value = res(`GoodreadsResponse > book > ${type}`).text();
      if (value) ids[type] = [value];
    });
    return ids;
  }
}

const WorldCat = {
  base: 'https://www.worldcat.org',
  // TODO: handle 10 vs 13
  async get(type, id) {
    const redirectedUrl = await new Promise(resolve => {
      https.get(`${this.base}/${type}/${id}`, res => {
        resolve(res.headers.location);
      });
    });
    const microdata = wae().parse(await getText(redirectedUrl));
    // TODO: how else could this data be shaped?
    return {
      isbn: _.property(["rdfa", 'ProductModel', 0, 'schema:isbn'])(microdata),
      oclc: _.property(["rdfa", 'CreativeWork', 0, 'library:oclcnum'])(microdata)
    };
  },
  async OCLC(oclc) {
    return await this.get('oclc', oclc);
  },
  async ISBN(isbn) {
    return await this.get('isbn', isbn);
  }
}

function parseRequest(url) {
  let match;
  if (match = url.match(/^\/\?openlibrary=(OL\d+M)$/)) {
    return { openlibrary: match[1] };
  }
  if (match = url.match(/^\/\?goodreads=(\d+)$/)) {
    return { goodreads: match[1] };
  }
  if (match = url.match(/^\/\?lccn=(\d+)$/)) {
    return { lccn: match[1] };
  }
  if (match = url.match(/^\/\?oclc=(\d+)$/)) {
    return { oclc: match[1] };
  }
  if (match = url.match(/^\/\?isbn=([\d\-]+X?)$/)) {
    let stripped = match[1].replace(/\-/g, '');
    if (stripped.length !== 10 && stripped.length !== 13) return;
    return { isbn: stripped };
  }
}

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

  if (url === '/') {
    return {
      "jsonapi": {
        "version": "1.0"
      }
    };
  }
}

function renderPage(results, parsedRequest) {
  return pelo`<html>
    <head>
      <title>bookish</title>
      <link rel="stylesheet" href="https://unpkg.com/tachyons@4.9.0/css/tachyons.min.css"/>
      <style>
      input.id {
        border: 1px solid #888;
        border-right: 0;
      }
      input.id::placeholder {
        color: rgba(0, 0, 0, 0.2);
      }
      input.id:focus {
        outline: 0;
        border-color: #000;
      }
      </style>
    </head>
    <body class='sans-serif fw3'>
      <div class='bb'>
        <div class='mw7 ph4 pv2 pv5-ns center'>
          <p class='lh-copy mb5'>Enter one form of book identification, get the other ones.</p>
          
          ${Object.keys(methods).map(method => pelo`
          <div class='flex items-center mb3'>
            <form class="flex w5 ma0" method=get>
              <input
                ${(parsedRequest && parsedRequest[method]) ? `value=${parsedRequest[method]}` : ''}
                class='flex-auto id code f6 pa2 v-top' required name=${method} type=text placeholder='${methods[method].example}' /><input
                class='bg-silver white ba b--black tl pa2 sans-serif f6 fw5 pointer hover-bg-black' type=submit value='${method}' />
            </form>
            <div class='w2'>
              <div class='bb'></div>
            </div>
            <div class='w4 ba f6 pa2'>
              ${results && results[method] ? results[method].join(', ') : '?'}
            </div>
          </div>`)}
        </div>
      </div>
      <div class='mw7 ph4 pv5 center'>
        <div class='lh-copy measure'>
          <p>Book identifiers are complicated. You might
          have an ISBN handy, but not an ISBN-13 - or one of many other identifers,
          like those specific to goodreads, WorldCat, Amazon, or some other
          organization.</p>
          <p>Bookish simply connects IDs to each other.
          Give it one kind of ID, it tries to find all the others.</p>
          <h3>Which numbers?</h3>
          <ul>
            ${Object.keys(methods).map(method => pelo`
            <li>
              ${method} (${methods[method].name})
              <ul>
              <li>
              Example:
              <a
              class='link light-blue'
              href='/?${method}=${methods[method].example}'>${method}=${methods[method].example}</a>
              </li>
              </ul>
            </li>`)}
          </ul>
          <h3>Who made this and why?</h3>
          <p>Hello, that's me, Tom MacWright.
          I'm an avid reader and I keep track of my reading habits on my
          website. I wanted to switch off of goodreads and was frustrated
          by its reliance on proprietary identifiers, and the lack of a
          universal converter. So I built one.</p>
        </div>
      </div>
    </body>
  </html>`;
}

function collapseResults(results) {
  let ids = {};
  for (let source in results) {
    for (let id in results[source]) {
      ids[id] = (ids[id] || []).concat(results[source][id]);
    }
  }
  for (let id in ids) {
    ids[id] = _.uniq(_.compact(ids[id]));
  }
  return ids;
}

module.exports = async (req, res) => {
  if (req.url === '/') {
    res.end(renderPage().toString());
    return;
  }
  const parsedRequest = parseRequest(req.url);
  if (!parsedRequest) {
    send(res, 500, 'Sorry, that does not look like a valid identifier!');
  }
  const results = collapseResults((await query(parsedRequest)).data);
  if (req.headers.accept.match(/json/)) {
    send(res, 200, results);
  } else if (results) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderPage(results, parsedRequest).toString());
  } else {
    send(res, 404);
  }
}

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.log(error);
});
