# BBS+ Signatures for JSON

Signature scheme that allows BBS+ Signatures to be used with JSON objects as defined in JSON Schema.

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

This document explores potential use of [BBS+ Signatures](https://mattrglobal.github.io/bbs-signatures-spec/) with JSON data.

## Motivation

- Expand practical applications of BBS+ Signatures with JSON data
- Enable partial JSON data verification through selective disclosure
- Expand the availability of BBS+ Signatures for all platforms and languages by using widely available tools
- Explore practical implementation of offline use cases for signature verification

## Signature Scheme

Summary of technical and functional requirements needed to define a signature scheme:

<dl>
  <dt>Normalization Algorithm</dt>
  <dd>Deterministicly transform a JSON document into unique addressable statements that unambiguously describe each JSON node</dd>
  <dt>Selective Disclosure</dt>
  <dd>Ppply projections to reduce the JSON document into a subset of the original to satisfy selective disclosure requirements</dd>
  <dt>Document Definition</dt>
  <dd>JSON documents should be described using a standardized vocabulary and schemas</dd>
  <dt>Signature Format</dt>
  <dd>standardized format of reperesenting the signatures</dd>
</dl>

### Normalization Algorithm

This document explores the use of JSON Pointer, standardized with [RFC 6901](https://datatracker.ietf.org/doc/html/rfc6901), as a normalization algorithm.
JSON Pointer defines a string syntax for identifying a specific value within a JSON document. Each node in the JSON document is uniquely expressed as a string.<br />
JSON Pointer tools and libraries available in all languages.

*Example JSON document of personal address*

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

*JSON Pointer of each field and node*

```bash
Pointer                   Value
-----------------------------------------
""                        <root node>
"/firstName"              Jane
"/lastName"               Doe
"/age"                    24
"/address"                <"address" node>
"/address/state"          CA
"/address/postalCode"     394221
```

This unique addressing allows us to express each statement as a single JSON object using the format:

```js
{ "/firstName": "Jane" }
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

TODO: Add step by step descriptions

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

This signature method is usable with many different signature formats, though with varying levels of compatibility. Most signature formats are designed for traditional signature schemes that use a single data payload. Since BBS signatures operate over a data array vector, some of these schemes will require exensibility.

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

We can produce a signature payload by using JWS JSON serialization

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

##### Additional BBS+ operations and ZKP

The BBS+ Signatures spec defines other algorithms that operate in ZKP contexts, such as blinded signatures. These operations can also be used with JWS to provide seamless signature data model that works over all BBS signatures operations.

#### Http Signatures

It is possible to use [Http Signatures](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures-12) when working with JSON content. While the spec is somewhat vague on extensibility, there's a clear opportunity for BBS+ Signatures with JSON data to be used with this scheme.


## Existing BBS+ Signature scheme for JSON-LD

BBS+ Signatures can be used with [linked data signatures](https://w3c-ccg.github.io/ldp-bbs2020/) using JSON-LD format. This approach uses normalization of the JSON-LD document using [RDF dataset normalization algorithm](https://json-ld.github.io/rdf-dataset-canonicalization/spec/).

### Signatures using JSON-LD canonicalization

To sign a JSON-LD document, it must be normalized using the following steps:

*Step 1: Input document*

```json
{
  "@context": [
    "https://schema.org",
    "https://w3id.org/security/v1"
  ],
  "type": "Person",
  "givenName": "JOHN",
  "lastName": "SMITH"
}
```

This next intermidate step ensures the document is in the correct context.

*Step 2: Compacted input document using JSON-LD compaction algorithm*

```json
{
  "@context": "https://w3id.org/security/v1",
  "type": "http://schema.org/Person",
  "http://schema.org/givenName": "JOHN",
  "http://schema.org/lastName": "SMITH"
}
```

*Step 3: Normalized document using URDNA2015 algorithm*

```turtle
_:c14n0 <http://schema.org/givenName> "JOHN" .
_:c14n0 <http://schema.org/lastName> "SMITH" .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.org/Person> .
```

The final set of normalized statements is then signed using BBS+ and the signature is produced. This approach requires valid JSON-LD document.

### Proof derivation using JSON-LD framing

To allow selective disclosure of data, JSON-LD provides a way to describe a subset of the document, using the framing alorithm.

*Example JSON-LD frame*

```json
{
  "@context": "https://schema.org",
  "@explicit": true,
  "givenName": {}
}
```

When the original document is framed using the above expression, we get a subset of the document

```json
{
  "@context": "https://schema.org",
  "type": "Person",
  "givenName": "JOHN"
}
```

And it's normalized statements

```
_:c14n0 <http://schema.org/givenName> "JOHN" .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.org/Person> .
```

A proof can then be derived using BBS+ proof derivation algorithm by disclosing a subset of the original document.

## Comparison between JSON-LD and JSON approach

|Feature| JSON-LD | JSON |
|-|-|-|
| Normalization algorithm | URDNA2015 | JSON Pointer |
| Selective disclosure | Framing algorithm | JSON Path |
| Document definition | LD Context | JSON Schema |
| Compatible with JWS |  | &#10004; (extensions) |
| Library and tooling support | Limited | Widely available |
| Offline usability | Requires document caching | &#10004; |

## Standards Considerations

[Add more details]

### Considerations when using Linked Data

Linked data operates as a semantic structure, rather than format structure. This means that in LD terms, the following documents have the same meaning.

```js
// single context
{
  "@context": "https://schema.org",
  "firstName": "Jane"
}

// context as array object
{
  "@context": [ "https://schema.org" ],
  "firstName": "Jane"
}

// multiple context URIs
{
  "@context": [ "https://schema.org" , "http://example.org"],
  "firstName": "Jane"
}

// compacted document without context
{
  "https://schema.org/firstName": "Jane"
}
```

When using LD processor and signature suites, all above documents will be semantically represented as the same RDF data set and thus producing the same signature result.

The signature scheme discussed in this document operates on top of JSON format and does not allow different data formats (except for object field ordering).

### VC Data Model Conformance

The VC Data Model as a JSON structure is compatible with this signature scheme.

[Add more details]

### Presentation Exchange Compatibility

PEx definition uses JSON Path to request data for disclosure. This can be used directly in the proof derivation algorithm in this spec.

[Add more details]
