const jsonpointer = require("json8-pointer");
const jsonpath = require("jsonpath");

/**
 *
 * @param {Object} data The object graph to normalize
 *
 * @returns {{asText: String[], asBytes: Uint8Array[]}} Normalized messages as text and bytes
 */
function normalize(data) {
  const flattenedData = jsonpointer.flatten(data);
  const flattenedMessages = [];

  for (let [key, value] of Object.entries(flattenedData)) {
    flattenedMessages.push(JSON.stringify({ [key]: value }));
  }

  flattenedMessages.sort();

  return {
    asText: flattenedMessages,
    asBytes: flattenedMessages.map((x) => Uint8Array.from(Buffer.from(x, "utf-8"))),
  };
}

/**
 * Filter an object graph for the input JSON path expressions
 *
 * @param {Object} data - The input object
 * @param {String[]} jsonPaths - The JSON path expressions
 */
function projectForPaths(data, jsonPaths) {
  const assignValue = (obj, index, path, value) => {
    const element = path[index];

    if (path.length == index + 1) {
      obj[element] = value;
    } else if (obj.hasOwnProperty(element)) {
      assignValue(obj[element], index + 1, path, value);
    } else {
      const subProperty = typeof path[index + 1] === "number" ? [] : {};
      assignValue(subProperty, index + 1, path, value);
      obj[element] = subProperty;
    }
  };

  // Collect all nodes for the input JSON paths. May produce duplicates, those are OK
  const pathArrays = [];
  jsonPaths.forEach((path) => pathArrays.push(...jsonpath.nodes(data, path)));

  // Project an object graph that represents a subset of the original object
  // filtered with the supplied JSON paths
  const result = {};
  pathArrays.forEach((element) => assignValue(result, 1, element.path, element.value));

  return result;
}

module.exports = {
  normalize,
  projectForPaths,
};
