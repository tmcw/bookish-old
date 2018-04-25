const {send} = require('micro');
const {query, methods, collapseResults} = require('./api');
const pelo = require('pelo');
const about = require('./pages/about');
const {readFileSync} = require('fs');
const tachyons = readFileSync(require.resolve('tachyons').replace('.css', '.min.css'), 'utf8');

function parseRequest(url) {
  let match;
  if ((match = url.match(/^\/\?openlibrary=(OL\d+M)$/))) {
    return { openlibrary: match[1] };
  }
  if ((match = url.match(/^\/\?goodreads=(\d+)$/))) {
    return { goodreads: match[1] };
  }
  if ((match = url.match(/^\/\?lccn=(\d+)$/))) {
    return { lccn: match[1] };
  }
  if ((match = url.match(/^\/\?oclc=(\d+)$/))) {
    return { oclc: match[1] };
  }
  if ((match = url.match(/^\/\?isbn=([\d\-]+X?)$/))) {
    let stripped = match[1].replace(/\-/g, "");
    if (stripped.length !== 10 && stripped.length !== 13) return;
    return { isbn: stripped };
  }
}

function renderPage(results, parsedRequest) {
  return pelo`<html>
    <head>
      <title>bookish</title>
      <link rel="stylesheet" href="/style.css"/>
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
      <div class=''>
        <div class='mw7 ph4 pv2 pv5-ns center'>
          ${Object.keys(methods).map(
            method => pelo`
          <div class='flex items-center mb3'>
            <form class="flex w5 ma0" method=get>
              <input
                ${
                  parsedRequest && parsedRequest[method]
                    ? `value=${parsedRequest[method]}`
                    : ""
                }
                class='flex-auto id code f6 pa2 v-top' required name=${method} type=text /><input
                class='bg-silver white ba b--black tl pa2 sans-serif f6 fw5 pointer hover-bg-black' type=submit value='${method}' />
            </form>
            <div class='w2'>
              <div class='bb'></div>
            </div>
            <div class='w4 ba f6 pa2'>
              ${results && results[method] ? results[method].join(", ") : "?"}
            </div>
          </div>`
          )}
        </div>
      </div>
      
      </div>
    </body>
  </html>`;
}

module.exports = async (req, res) => {
  if (req.url === "/") {
    res.end(renderPage().toString());
    return;
  }
  if (req.url === "/about") {
    res.end(about);
    return;
  }
  if (req.url === "/style.css") {
    res.end(tachyons);
    return;
  }
  const parsedRequest = parseRequest(req.url);
  if (!parsedRequest) {
    send(res, 500, "Sorry, that does not look like a valid identifier!");
    return;
  }
  const results = collapseResults((await query(parsedRequest)).data);
  if (req.headers.accept.match(/json/)) {
    send(res, 200, results);
  } else if (results) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(renderPage(results, parsedRequest).toString());
  } else {
    send(res, 404);
  }
};

process.on("unhandledRejection", error => {
  // Will print "unhandledRejection err is not defined"
  console.log(error);
});
