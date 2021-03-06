const fs = require("fs");
const tachyons = fs.readFileSync(
  require.resolve("tachyons").replace(".css", ".min.css"),
  "utf8"
);
module.exports = `<html>
<title>Booky | help</title>
<style>${tachyons}</style>
<body class="sans-serif">
<div class='mw7 ph4 pv5 center'>
<div class='lh-copy measure'>
  <a href="/">Home</a>
  <p>Book identifiers are complicated. You might
  have an ISBN handy, but not an ISBN-13 - or one of many other identifers,
  like those specific to goodreads, WorldCat, Amazon, or some other
  organization.</p>
  <p>Bookish simply connects IDs to each other.
  Give it one kind of ID, it tries to find all the others.</p>
  <h3>Who made this and why?</h3>
  <p>Hello, that's me, Tom MacWright.
  I'm an avid reader and I keep track of my reading habits on my
  website. I wanted to switch off of goodreads and was frustrated
  by its reliance on proprietary identifiers, and the lack of a
  universal converter. So I built one.</p>
</div>
</body>
</html>`;
