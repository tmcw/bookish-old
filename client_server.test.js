const ahandler = require("./api_server");
const handler = require("./client_server");
const micro = require("micro");
const listen = require("test-listen");
const got = require("got");

let aservice;
let service;
let url;

beforeAll(async () => {
  aservice = micro(ahandler);
  service = micro(handler);
  url = await listen(service);
});

afterAll(() => {
  aservice.close();
  service.close();
});

test("/", async () => {
  expect((await got(url)).body).toMatchSnapshot();
});

test("isbn", async () => {
  expect(
    (await got(`${url}/search?type=isbn&id=9780812993547`)).body
  ).toMatchSnapshot();
});

test("olid", async () => {
  expect(
    (await got(`${url}/search?type=olid&id=OL25773328M`)).body
  ).toMatchSnapshot();
});

test("lccn", async () => {
  expect(
    (await got(`${url}/search?type=lccn&id=2015008120`)).body
  ).toMatchSnapshot();
});
