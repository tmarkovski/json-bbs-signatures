---
  title: BBS+ Signatures for JSON data
  author: Tomislav Markovski
  date: 07-25-2021
---

# BBS+ Signatures for JSON data

This document explores a proof of concept for potential use of [BBS+ Signatures](https://mattrglobal.github.io/bbs-signatures-spec/) with JSON data.

### Table of contents

- [Motivation](#motivation)
- [Existing BBS+ Signature scheme for JSON-LD](#existing-bbs-signature-scheme-for-json-ld)
  * [Signatures using JSON-LD canonicalization](#signatures-using-json-ld-canonicalization)
  * [Proof derivation using JSON-LD framing](#proof-derivation-using-json-ld-framing)
- [BBS+ Signatures for JSON](#bbs-signatures-for-json)
  * [Normalization using JSON Pointer](#normalization-using-json-pointer)
  * [Object projections using JSON Path](#object-projections-using-json-path)
  * [Proof formats](#proof-formats)
    + [JOSE signatures (JWS/JWT)](#jose-signatures-jwsjwt)
      - [Signature for JSON payload](#signature-for-json-payload)
      - [Signature proof derivation](#signature-proof-derivation)
      - [Other BBS operations / ZKP](#other-bbs-operations--zkp)
    + [Linked Data Proofs](#linked-data-proofs)
    + [Http Signatures](#http-signatures)
- [Comparison between JSON-LD and JSON approach](#comparison-between-json-ld-and-json-approach)
- [Standards Considerations](#standards-considerations)
  * [Considerations when using Linked Data](#considerations-when-using-linked-data)
  * [VC Data Model Conformance](#vc-data-model-conformance)
  * [Presentation Exchange Compatibility](#presentation-exchange-compatibility)

## Motivation

- Expand practical applications of BBS+ Signatures with JSON data
- Enable partial JSON data verification through selective disclosure
- Expand the availability of BBS+ Signatures for all platforms and languages by using widely available tools
- Explore practical implementation of offline use cases for signature verification

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

```rdf
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

## BBS+ Signatures for JSON

A summary of the concepts required to define a signature scheme:

- [Normalization](#normalization-using-json-pointer) &mdash; deterministicly transform the JSON object into unique addressable statements that unambiguously describe each JSON field
- [Object projections](#object-projections-using-json-path) &mdash; apply projections to reduce the JSON object into a subset of the original to satisfy selective disclosure requirements
- [Proof formats](#proof-formats) &mdash; standardized format of reperesenting the signatures

### Normalization using JSON Pointer

This document explores the use of [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901) as potential normalization algorithm. The immediate benefit of this approach is that it can be applied to any JSON data and doesn't require LD processing. Document defintions can be described using JSON Schema, instead LD contexts.

JSON Pointer defines a string syntax for identifying a specific value within a JSON document. Each node in the JSON document is uniquely expressed as a string.

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

Each node in this document, can be uniquely represented using JSON Pointer addressing.

*JSON Pointer representation of each field and node*

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

### Object projections using JSON Path

BBS+ Signatures support selective disclosure which allows the derivation of signature proof
by disclosing only a subset of the originally signed statements.

*Example of partial document*

```json
{
  "firstName": "Jane",
  "address": {
    "state": "CA"
  }
}
```

In order to provide a standardized way of describing object projections we can use [JSON Path](https://datatracker.ietf.org/doc/draft-ietf-jsonpath-base/01/). In order to request multiple document nodes, we can use an array of JSON Path expressions.

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

### Proof formats

This signature method is usable with many different signature formats, though with varying levels of compatibility. Most signature formats are designed for traditional signature schemes that use a single data payload. Since BBS signatures operate over a data array vector, some of these schemes will require exensibility.

#### JOSE signatures (JWS/JWT)

Using this method will require extensibility of the original spec, since JWS works with single payload representation. However, the JWS/JWT data model and registered claims can be used to construct a digital signature for multi-payload schemes.

##### Signature for JSON payload

*Given a JWS header*

```js
{
  "alg": "https://mattrglobal.github.io/bbs-signatures-spec/#signature",
  "kid": "https://example.edu/issuers/keys/1"
}
```

We can produce a signature payload by concatenating the header with the document.

```js
[
  // HEADER
  '{"":{}}',
  '{"/alg":"https://mattrglobal.github.io/bbs-signatures-spec/#signature"}',
  '{"/kid":"https://example.edu/issuers/keys/1"}',

  // DOCUMENT
  '{"":{}}',
  '{"/address":{}}',
  '{"/address/postalCode":"394221"}',
  '{"/address/state":"CA"}',
  '{"/age":24}',
  '{"/firstName":"Jane"}',
  '{"/lastName":"Doe"}'
]
```

We can sign the above personal address document by concatenating the normalized forms (using JSON Pointer) of the header and the document, and produce BBS+ signature over the entire message vector. The signaute can still be represented in compact form, but it will be verified using the normalization method described here, instead the one described in the JWS spec.
Implementations must understand the `"alg"` value specifying the exact algorithm used.

##### Signature proof derivation

Similarly, when deriving proof of existing signature, the following header can be used.

```js
{
  "alg": "https://mattrglobal.github.io/bbs-signatures-spec/#signatureProof",
  "kid": "https://example.edu/issuers/keys/1",
  "crit": [ "nonce" ],
  "nonce": "MTIzNDU="
}
```

The difference here is the use of a different URI value for the `"alg"` field and the inclusion of `"nonce"` in the `"crit"` field.

##### Other BBS operations / ZKP

The BBS+ Signatures spec defines other algorithms that operate in ZKP contexts, such as blinded signatures. These operations can also be used with JWS to provide seamless signature data model that works over all BBS signatures operations.

> This JWS approach will require defining JWS extension spec that will describe the exact signature algorithms used for each operation.

#### Linked Data Proofs

Using LD Proofs is a bit more straightfoward considering that JSON-LD is also a JSON. The normalization algorithm works over any JSON, so JSON-LD compliant document can be used to produce LD signature. The document can include `@context` field which should point to the security vocabulary context, and add the proof value inline.

*Example signed document with custom signature suite*

```json
{
  "@context": "https://w3id.org/security/v2",
  "firstName": "Jane",
  "lastName": "Doe",
  "age": 24,
  "address": {
    "state": "CA",
    "postalCode": "394221"
  },
  "proof": {
    "type": "https://github.com/trinsic-id/json-bbs-signatures#signature",
    "created": "2021-07-01",
    "verificationMethod": "https://example.edu/issuers/keys/1",
    "proofPurpose": "assertionMethod",
    "proofValue": "F9uMu...DEg=="
  }
}
```

The `proofValue` can be calculated by normalizing the entire object including the proof object. Alternatively, to support proof sets and proof chains, the proof value can be calculated by concatenating the normalized proof object in compacted form and the normalized document without the `proof` node.

If LD semantics are important to the use case, a valid JSON-LD document can also be used.

> It's important to note that when LD tooling is available, this JSON scheme doesn't offer any significant adventage over JSON-LD scheme, though compatiblity with LD suites is possible.

This approach will require defining a new LD signature suite that describes the normalization algorithm and proof construction methods used.

#### Http Signatures

It is possible to use [Http Signatures](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures-12) when working with JSON content. While the spec is somewhat vague on extensibility, there's a clear opportunity for BBS+ Signatures with JSON data to be used with this scheme.

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
