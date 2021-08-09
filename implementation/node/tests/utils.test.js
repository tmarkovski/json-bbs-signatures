const test = require("ava");
const { flatten } = require("json8-pointer");
const { normalize, projectForPaths } = require("../utils.js");

test("filter entire object", (t) => {
  const expected = {
    name: "Jane Doe",
  };

  const actual = projectForPaths(expected, ["$..*"]);

  t.deepEqual(actual, expected);
});

test("filter single property", (t) => {
  const expected = {
    name: "Jane Doe",
    age: 24,
  };

  const actual = projectForPaths(expected, ["$.age"]);

  t.deepEqual(actual, { age: 24 });
});

test("filter array property", (t) => {
  const expected = {
    numbers: [0, 1, { prop: "value" }],
  };

  const actual = projectForPaths(expected, ["$.numbers[*]"]);

  t.deepEqual(actual, expected);
});

test("flatten object using json pointer syntax", (t) => {
  const document = {
    firstName: "Rack",
    lastName: "Jackon",
    age: 24,
    address: {
      state: "CA",
      postalCode: "394221",
    },
  };

  const flattened = normalize(document);
  
  t.pass();
});
