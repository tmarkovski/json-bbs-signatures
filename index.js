const { projectForPaths: filterForPaths, normalize } = require("./utils.js");
const { blsSign, blsVerify, blsCreateProof, blsVerifyProof, BlsKeyPair } = require("@mattrglobal/bbs-signatures");
// const { blsSign, blsVerify, blsCreateProof, blsVerifyProof, BlsKeyPair } = nodeBbsSignatures;

/**
 * Sign an object payload
 *
 * @param {Object} payload The input object payload
 * @param {import("@mattrglobal/bbs-signatures").BlsKeyPair} keyPair The signer's keypair
 *
 * @returns {Promise<Uint8Array>} The signature value
 */
const sign = async (payload, keyPair) => {
  const normalized = normalize(payload);

  const signature = await blsSign({
    keyPair,
    messages: normalized.asBytes,
  });

  return signature;
};

/**
 * Verify if the signature for the input payload matches the public key
 *
 * @param {Object} payload The object to be verified
 * @param {Uint8Array} publicKey The public key associated with the signature
 * @param {Uint8Array} signature The signature value
 *
 * @returns {Promise<boolean>} Returns 'true' if verification was successful
 */
const verify = async (payload, publicKey, signature) => {
  const normalized = normalize(payload);

  const isVerified = await blsVerify({
    publicKey: publicKey,
    messages: normalized.asBytes,
    signature,
  });

  return isVerified.verified;
};

/**
 * @typedef {{payload: Object, proofValue: Uint8Array}} ProofResult
 */

/**
 * Create a proof of signature from a signed payload
 *
 * @param   {Object}            payload     The object payload
 * @param   {Uint8Array}        publicKey   The public key used to sign the payload
 * @param   {Uint8Array}        signature   The signature value
 * @param   {Uint8Array|String} nonce       Nonce value
 * @param   {String[]}          paths       Collection of JSON paths used to define the resulting proof
 *
 * @returns {Promise<ProofResult>}          The object projection and signature proof value
 */
const createProof = async (payload, publicKey, signature, nonce, paths) => {
  const normalizedPayload = normalize(payload);

  const projected = filterForPaths(payload, paths);
  const normalized = normalize(projected);

  const indices = [];
  normalized.asText.forEach((x) => indices.push(normalizedPayload.asText.indexOf(x)));

  const proof = await blsCreateProof({
    signature,
    publicKey: publicKey,
    messages: normalizedPayload.asBytes,
    nonce: typeof nonce === "string" ? Uint8Array.from(Buffer.from(nonce, "utf8")) : nonce,
    revealed: indices,
  });

  return {
    payload: projected,
    proofValue: proof,
  };
};

/**
 * Verify a proof signature
 *
 * @param {Object} payload The payload object to verify
 * @param {Uint8Array} publicKey The public key of the signer
 * @param {String|Uint8Array} nonce The nonce value
 * @param {Uint8Array} proofValue The signature value
 *
 * @returns {Promise<boolean>} The result of the verification
 */
const verifyProof = async (payload, publicKey, nonce, proofValue) => {
  const normalized = normalize(payload);

  const isProofVerified = await blsVerifyProof({
    proof: proofValue,
    publicKey: publicKey,
    messages: normalized.asBytes,
    nonce: typeof nonce === "string" ? Uint8Array.from(Buffer.from(nonce, "utf8")) : nonce,
  });

  return isProofVerified.verified;
};

module.exports = {
  sign,
  verify,
  createProof,
  verifyProof,
};
