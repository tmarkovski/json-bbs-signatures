const test = require("ava");
const { sign, verify, createProof, verifyProof } = require("../index.js");
const { generateBls12381G2KeyPair } = require("@mattrglobal/node-bbs-signatures");
const document = require("./data/document.json");
const documentVc = require("./data/document-vc.json");

test("demo test w/ plain json", async (t) => {
  const nonce = "123";
  const proofRequest = ["$.firstName", "$.phoneNumbers[*]", "$[?(@.state === 'CA')].postalCode"];

  //Generate a new key pair
  const keyPair = await generateBls12381G2KeyPair();

  //Create the signature
  const signature = await sign(document, keyPair);

  //Verify the signature
  const isVerified = await verify(document, keyPair.publicKey, signature);

  t.true(isVerified);

  // Define a proof request using JSON Path requesting a subset of the original data
  const proof = await createProof(document, keyPair.publicKey, signature, nonce, proofRequest);

  //Verify the created proof
  const isProofVerified = await verifyProof(proof.payload, keyPair.publicKey, nonce, proof.proofValue);

  t.true(isProofVerified);
});


test("demo test w/ vc", async (t) => {
  const keyPair = await generateBls12381G2KeyPair();

  const signature = await sign(documentVc, keyPair);

  const isVerified = await verify(documentVc, keyPair.publicKey, signature);

  t.true(isVerified);
});