# BBS+ Signatures for JSON data

This is a proof of concept describing potential use of BBS+ Signatures with JSON data.

## Motivation

- Enable partial JSON data verification through selective disclosure
- Expand the availability of BBS+ Signatures for all platforms and languages by using widely available tools
- Promote practical implementation of offline use cases for signature verification

## Signature and Proof Derivation Concepts

- Normalization / flattening &mdash; deterministicly transform the JSON object into unique addressable statement that unambiguously describe each JSON field
- Object projections &mdash; apply projections to reduce the JSON object into a subset of the original to satisfy selective disclosure requirements
- Proof format representation &mdash; standardized format of reperesenting the signatures

### Normalization using JSON Pointer

[JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901) defines a string syntax for identifying a specific value within a JSON document. Each node in the JSON document is uniquely expressed as a string.

*Example JSON document*

```json
{
  "firstName": "Rack",
  "lastName": "Jackon",
  "age": 24,
  "address": {
    "state": "CA",
    "postalCode": "394221"
  }
}
```

*JSON Pointer representation of each field*

```bash
"/firstName"              Rack
"/lastName"               Jackon
"/age"                    24
"/address/state"          CA
"/address/postalCode"     394221
```

This unique addressing allows us to express each statement as a single JSON object, or the entire object
as a string array of these statements:

```js
[
  '{"":{}}',
  '{"/address":{}}',
  '{"/address/postalCode":"394221"}',
  '{"/address/state":"CA"}',
  '{"/age":24}',
  '{"/firstName":"Rack"}',
  '{"/lastName":"Jackon"}'
]
```

This collection of statements can then be signed using BBS+ signatures.

### Object projections using JSON Path

BBS+ Signatures support proof derivation which allows the derivation of signature proof
by disclosing only a subset of the originally signed statements.
In this case, we can use JSON document projections to express partial object graph.
A convenient method to achieve this is [JSON Path](https://datatracker.ietf.org/doc/draft-ietf-jsonpath-base/01/).

### Proof formats

## Standards Considerations

### VC Data Model Conformance

### Presentation Exchange Compatibility