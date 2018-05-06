const fs = require("fs");
const rateLimit = require("micro-ratelimit");
const { parse } = require("url");
const got = require("got");
const { parse: parseQuery, stringify: stringifyQuery } = require("querystring");
const help = require("./help")
// const { send } = require("micro");
// const { guess, methods } = require("./api");

const backend = "http://localhost:4013";
const tachyons = fs.readFileSync("./tachyons.min.css", "utf8");

function render(ids) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<title>
  bookish
</title>
<meta name="description" content="give a book identifier, get the rest">
<meta charset="utf-8">
<style>${tachyons}</style>
</head>
<body>
<div class='mw6 ph4-ns sans-serif center'>

  <div class='flex justify-between items-end'>
    <h1 class='f3 mt4 mb0'>Booky</h1>
    <a href='/help'>help</a>
  </div>

  <form class="flex pv3" action="/search">
    <input name='id' type='text' class='f5 pa2 code flex-auto mr1 ba b--black-50 br2' />
    <select name='type' class='f5 ba b--black-50 mr1'>
      <option value="detect">Detect</option>
      <option value="isbn">ISBN</option>
      <option value="olid">OLID</option>
      <option value="oclc">OCLC</option>
      <option value="lccn">LCCN</option>
    </select>
    <input class='ba b--black-50 bg-light-yellow br2'
      type='submit' value="Search" />
  </form>

${
    ids
      ? `
  <div class='pv3'>
    <div class='br2 pa2 bg-light-yellow flex justify-between'>
      <span>Input: ...</span>
      <!--<span>autodetected as ISBN-10</span>-->
    </div>
    <h3 class='mt4'>Equivalents</h3>
    <table class='table w-100 collapse ba br2 b--black-10 pv2 ph3'>
      <tbody>
        <tr class='striped--moon-gray'>
          <th class='pv2 ph3 tl f6 fw6 ttu'>Code</th>
          <th class='pv2 ph3 tl f6 fw6 ttu'>Value</th>
        </tr>
        ${Object.entries(ids)
          .map(
            ([key, value]) => `
        <tr class='striped--moon-gray'>
          <td class='pv2 ph3'>${key}</td>
          <td class='pv2 ph3'>${value.join(", ")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
    <h3 class='mt4'>API / Code</h3>
    <a href='#'>https://booki.sh/isbn/123456789</a>
<pre>bookish.isbn('123456789');</pre>
    <h3 class='mt6'>More formats</h3>
    <h4 class='mt4'>Frontmatter</h4>
<pre>---
title: "White Rage"
author: "Carol Sanders"
author: "Carol Sanders"
isbn: 123456789
isbn13: 1111123456789
---</pre>

  </div>`
      : ""
  }
</div>
</body>
</html>`;
}

module.exports = rateLimit(
  { window: 10000, limit: 100, headers: true },
  async req => {
    const { pathname, query } = parse(req.url);

    if (pathname === "/") {
      return render();
    }

    if (pathname === "/help") {
      return help;
    }

    if (pathname === "/search") {
      const { id, type } = parseQuery(query);
      const { body } = await got(
        `${backend}/search?${stringifyQuery({ id, type })}`,
        {
          json: true
        }
      );
      return render(body);
    }

    return "Route not found";
  }
);
