const { parse } = require("url");
const { parse: parseQuery } = require("querystring");
const { send } = require("micro");
const { guess, methods } = require("./api");

module.exports = async (req, res) => {
  if (req.url === "/") {
    send(res, 200, { status: "ok" });
    return;
  }

  const parts = parse(req.url);

  if (parts.pathname === "/search") {
    const qs = parseQuery(parts.query);

    for (let method of methods) {
      if (qs[method.id]) {
        return await method.resolve(qs[method.id]);
      }
    }

    if (qs.guess) {
      return await guess(qs.guess);
    }
  }

  return "Route not found";
};
