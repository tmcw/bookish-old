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
                class='flex-auto id code f6 pa2 v-top' required name=${method} type=text placeholder='${
              methods[method].example
            }' /><input
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
            ${Object.keys(methods).map(
              method => pelo`
            <li>
              ${method} (${methods[method].name})
              <ul>
              <li>
              Example:
              <a
              class='link light-blue'
              href='/?${method}=${methods[method].example}'>${method}=${
                methods[method].example
              }</a>
              </li>
              </ul>
            </li>`
            )}
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

module.exports = async (req, res) => {
  if (req.url === "/") {
    res.end(renderPage().toString());
    return;
  }
  const parsedRequest = parseRequest(req.url);
  if (!parsedRequest) {
    send(res, 500, "Sorry, that does not look like a valid identifier!");
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
