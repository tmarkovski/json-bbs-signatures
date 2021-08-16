# BBS+ Signatures for JSON

Signature scheme proposal for using BBS+ signatures with JSON documents.

**Specification Status:** Proof of Concept

**Latest Draft:**
  [https://tmarkovski.github.io/json-bbs-signatures](https://tmarkovski.github.io/json-bbs-signatures)

Editors:
~ [Tomislav Markovski](https://www.linkedin.com/in/tmarkovski/)

Participate:
~ [GitHub repo](https://github.com/tmarkovski/json-bbs-signatures)
~ [File a bug](https://github.com/tmarkovski/json-bbs-signatures/issues)
~ [Commit history](https://github.com/tmarkovski/json-bbs-signatures/commits/master)

------------------------------------

## Abstract

This document explores potential use of [BBS+ signatures](https://mattrglobal.github.io/bbs-signatures-spec/) with JSON documents. It uses common JSON concepts and standards, such as JSON Schema, JSON Pointer and JSON Path, in contrast to the already established signature scheme that use Linked Data processors.

## Motivation

- Expand practical applications of BBS+ Signatures with JSON data
- Enable partial JSON data verification through selective disclosure
- Expand the availability of BBS+ Signatures for all platforms and languages by using widely available tools
- Explore practical implementation of offline use cases for signature verification

## Signature Scheme

Summary of technical and functional requirements needed to define a signature scheme:

<dl>
  <dt>Normalization Algorithm</dt>
  <dd>Deterministicly transform a JSON document into unique statements that unambiguously describe each JSON node</dd>
  <dt>Selective Disclosure</dt>
  <dd>Apply projections to reduce the JSON document into a subset of the original to satisfy selective disclosure requirements</dd>
  <dt>Document Definition</dt>
  <dd>JSON documents should be described using a standardized vocabulary and schemas. Consuming applications should be able to validate and interpret a document based on a pre-defined schema.</dd>
  <dt>Signature Format</dt>
  <dd>Standardized format of reperesenting the signatures</dd>
</dl>

### Normalization Algorithm

This document explores the use of [JSON Normalization](https://github.com/trinsic-id/json-normalize-ptr-spec) algorithm based on [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901). The normalization algorithm produces an output that flattens the original JSON object.

*Example JSON document:*

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "age": 24,
  "address": {
    "state": "CA",
    "postalCode": "394221"
  }
}
```

*The normalized form of this document:*

```json
{
  "": {},
  "/firstName": "Jane",
  "/lastName": "Doe",
  "/age": 24,
  "/address": {},
  "/address/state": "CA",
  "/address/postalCode": "394221"
}
```

Each of these statements, can now be signed using the BBS signature scheme. However, before we sign these messages, we need to represent them in a string format. An idiomatic way to achieve this would be to represent each key/value pair as a single JSON object and stringify the entire object into an array:

```json
[
  { "": {} },
  { "/firstName": "Jane" },
  { "/lastName": "Doe" },
  ...
]
```

or the entire document as an array of stringified objects:

```js
[
  '{"":{}}',
  '{"/address":{}}',
  '{"/address/postalCode":"394221"}',
  '{"/address/state":"CA"}',
  '{"/age":24}',
  '{"/firstName":"Jane"}',
  '{"/lastName":"Doe"}'
]
```

This collection of statements can then be signed using BBS+ signatures library.

#### Algorithm Details

- Given an input JSON document, use the [normalization algorithm](#normalization-algorithm) to obtain a normalized map of the document.
- Create new JSON array that will contain the resulting signing statements.
- Add each element from the normalized map to the resulting array using by wrapping the key/value into a JSON object
- Stringify the element using the native stringify functionality as described in [ECMAScript spec](https://tc39.es/ecma262/#sec-json.stringify).
- Sort the string messages in the array in place

See [implementation](https://github.com/tmarkovski/json-bbs-signatures/tree/main/implementation/node) details.

### Selective Disclosure

BBS+ Signatures support selective disclosure which allows the derivation of signature proof
by disclosing only a subset of the originally signed statements. Partial JSON documents can be represented with
a set of statement using JSON Path or JSON Pointer. Both are equally viable to describe the final document projection.

*Example of partial document*

```json
{
  "firstName": "Jane",
  "address": {
    "state": "CA"
  }
}
```

#### Using JSON Path

In order to provide a standardized way of describing object projections we can use [JSON Path](https://datatracker.ietf.org/doc/draft-ietf-jsonpath-base/01/). To request multiple document nodes, we can use an array of JSON Path expressions.

*Example JSON Path expressions*

```json
[
  "$.firstName",
  "$.address.state"
]
```

When these expressions are used to query a document, the new object can be projected into a subset of the original, as shown in the example above.

JSON Path allows much more complex querying using conditions, regular expressions, etc.

```js
$..*                       // returns the entire document
$.address[?(@ === 'CA')]   // returns the address object if the state is 'CA'
$.address[*]               // returns all fields in the 'address' node
```

#### Using JSON Pointer

Similarly, a set of JSON pointers can be used to request disclosure of a subset of the document.

```json
[
  "/firstName",
  "/address/state"
]
```

JSON pointer lacks the expressive syntax of JSON Path, but it's still a good candidate to request document disclosure.
JSON pointer can also be used with URI's to communicate a data from a specific schema.

```json
[
  "https://example.com/Person.json#/firstName",
  "https://example.com/Person.json#/address/state",
]
```

### Document Definition

JSON documents can use JSON Schema to reference a standardized data format. JSON Schemas can be used with decentralized storage systems to provide immutability to the schema. There's is no technical requirement for JSON Schemas in the signauture scheme, it's use is mostly for normative purposes.

JSON Schema can be referenced in a document as:

```json
{
  "$schema": "https://example.com/Person.json",
  "firstName": "Jane",
  "lastName": "Doe",
  "age": 24,
  "address": {
    "state": "CA",
    "postalCode": "394221"
  }
}
```

This will allow a signature to be created over the object and it's schema definition if required.

### Signature Format

This signature scheme is usable with many different signature formats, though with varying levels of compatibility. Most signature formats are designed for traditional signature schemes that use a single data payload. Since BBS signatures operate over a message vector, some of these schemes will require exensibility.

#### JOSE signatures (JWS/JWT)

Using this method will require extensibility of the original spec, since JWS works with single payload representation. However, the JWS/JWT data model and registered claims can be used to construct a digital signature for multi-payload schemes.

*Given a JWS header*

```json
{
    "alg": "https://mattrglobal.github.io/bbs-signatures-spec/#name-sign",
    "kid": "https://example.edu/issuers/keys/1"
}
```

or header for proof derivation algorithm

```json
{
    "alg": "https://mattrglobal.github.io/bbs-signatures-spec/#name-blindmessagesproofgen",
    "kid": "https://example.edu/issuers/keys/1",
    "crit": ["nonce"],
    "nonce": "3zpI2FINNA=="
}
```

We can produce a signature payload by using JWS flattened JSON serialization

```json
{
  "protected": {
    "alg": "https://mattrglobal.github.io/bbs-signatures-spec/#name-sign",
    "kid": "https://example.edu/issuers/keys/1"
  },
  "payload": {
    "firstName": "Jane",
    "lastName": "Doe",
    "age": 24,
    "address": {
      "state": "CA",
      "postalCode": "394221"
    }
  }
}

```

Apply the normalization algorithm to obtain the signing statements

```json
[
  '{"":{}}',
  '{"/payload":{}}',
  '{"/payload/address":{}}',
  '{"/payload/address/postalCode":"394221"}',
  '{"/payload/address/state":"CA"}',
  '{"/payload/age":24}',
  '{"/payload/firstName":"Jane"}',
  '{"/payload/lastName":"Doe"}',
  '{"/protected":{}}',
  '{"/protected/alg":"https://mattrglobal.github.io/bbs-signatures-spec/#name-sign"}',
  '{"/protected/kid":"https://example.edu/issuers/123#signing-key-1"}'
]
```

Append the signature (encoded in base64) to the JWS message

```json
{
  "protected": {
    "alg": "https://mattrglobal.github.io/bbs-signatures-spec/#name-sign",
    "kid": "https://example.edu/issuers/keys/1"
  },
  "payload": {
    "firstName": "Jane",
    "lastName": "Doe",
    "age": 24,
    "address": {
      "state": "CA",
      "postalCode": "394221"
    }
  },
  "signature": "pujOXuHxs4zDpONCLJsQSWzAwDH5mBGvpbPUMawQyQZgVkY5VMh+l/iEc+KH+gnQSDdOd1g1JKBqY8y3J9CDz1oXjNAkQwoJefIevaSnc8AT7CIPVRBxGuJJ4vbIGwUIF44TXTBMIFgC3zpI2FINNA=="
}
```

#### Linked Data Proofs

It is possible to use the signature scheme with LD proof format, by extending the spec with additional signature types. These types will describe the canocalization algorithm used and other parameters, as outlined in section [10. Creating New Proof Types](https://w3c-ccg.github.io/ld-proofs/#creating-new-proof-types). It seems this would be considered normative approach, as the LD Proofs spec doesn't explicitly require the use of URDNA2015 transformation.


#### Http Signatures

It is possible to use [Http Signatures](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures-12) when working with JSON content. While the spec is somewhat vague on extensibility, there's a clear opportunity for BBS+ signatures with JSON documents to be used with this scheme.

## Comparison between JSON-LD and JSON approach

|Feature| JSON-LD | JSON |
|-|-|-|
| Normalization algorithm | URDNA2015 | JSON Pointer |
| Selective disclosure | Framing algorithm | JSON Path <br /> JSON Pointer |
| Document definition | LD Context | JSON Schema |
| Compatible with JWS |  | &#10004; |
| Library and tooling support | Limited | Widely available |
| Offline usability | Document resolution requires caching | &#10004; |

## Standards Considerations

[TODO]

### VC Data Model Conformance

The [Verifiable Credentials Data Model 1.0](https://www.w3.org/TR/vc-data-model/) describes potential use of JSON format. While the spec doesn't provide examples for use of the VC model with non-LD data, the field type transformation can be applied for the purposes of this scheme.

Here's an example of a VC describing university degree credential expressed in JSON with a `$schema` reference.

```json
{
  "$schema": "./vc-data-model/index.json",
  "id": "https://example.edu/credentials/1",
  "issuer": "did:example:issuer1",
  "type": ["VerifiableCredential", "UniversityDegreeCredential" ],
  "issuanceDate": "2010-01-01T19:23:24Z",
  "credentialSubject": {
    "id": "did:example:ebfeb1f712ebc6f1c276e12ec21",
    "degree": {
      "type": "BachelorDegree",
      "name": "Bachelor of Science and Arts"
    }
  }
}
```

This document can be signed using the JTW proof format

```json
{
  "sub": "did:example:ebfeb1f712ebc6f1c276e12ec21",
  "jti": "https://example.edu/credentials/1",
  "iss": "did:example:issuer1",
  "nbf": 1541493724,
  "iat": 1541493724,
  "exp": 1573029723,
  "vc": {
    "type": ["VerifiableCredential", "UniversityDegreeCredential"],
    "credentialSubject": {
      "degree": {
        "type": "BachelorDegree",
        "name": "Bachelor of Science and Arts"
      }
    }
  }
}
```

or represented as JWT in flattened JSON serialization

```json
{
  "payload": {
    "sub": "did:example:ebfeb1f712ebc6f1c276e12ec21",
    "jti": "https://example.edu/credentials/1",
    "iss": "did:example:issuer1",
    "nbf": 1541493724,
    "iat": 1541493724,
    "exp": 1573029723,
    "vc": {
      "type": ["VerifiableCredential", "UniversityDegreeCredential"],
      "credentialSubject": {
        "degree": {
          "type": "BachelorDegree",
          "name": "Bachelor of Science and Arts"
        }
      }
    }
  },
  "protected": {
    "alg": "https://mattrglobal.github.io/bbs-signatures-spec/#name-sign",
    "kid": "did:example:issuer1#keys-1"
  }
}
```

## References