"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createClientHEContext = createClientHEContext;
exports.createServerHEContext = createServerHEContext;

var _allows_wasm_node_umd = _interopRequireDefault(require("node-seal/allows_wasm_node_umd"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Creates a SEAL context
 * @param {number} polyModulusDegree
 * @param {number} securityLevel
 * @param {number} plainModulusBitSize
 * @returns {Promise<[Object, Object]>}
 */
async function createHEContext(polyModulusDegree, securityLevel, plainModulusBitSize) {
  const seal = await (0, _allows_wasm_node_umd.default)();
  const schemeType = seal.SchemeType.bfv;
  const secLevel = getSecurityLevel(securityLevel, seal);
  const parms = seal.EncryptionParameters(schemeType); // Set the PolyModulusDegree

  parms.setPolyModulusDegree(polyModulusDegree); // Create a suitable set of CoeffModulus primes.
  // We use the default helper

  const coeffModulus = seal.CoeffModulus.BFVDefault(polyModulusDegree, secLevel);
  parms.setCoeffModulus(coeffModulus);
  coeffModulus.delete(); // Create and set the PlainModulus to a prime of bitSize

  const plainModulus = seal.PlainModulus.Batching(polyModulusDegree, plainModulusBitSize);
  parms.setPlainModulus(plainModulus);
  plainModulus.delete();
  const context = seal.Context(parms, // Encryption Parameters
  true, // ExpandModChain
  secLevel // Enforce a security level
  );
  parms.delete();

  if (!context.parametersSet()) {
    throw new Error('Could not set the parameters in the given context. Please try different encryption parameters.');
  }

  return [seal, context];
}
/**
 * Create a client context
 * @param {number} polyModulusDegree
 * @param {number} plainModulus
 * @param {number} securityLevel
 * @param {string} compressionMode
 * @returns {Promise<Object>}
 */


async function createClientHEContext(polyModulusDegree, plainModulus, securityLevel, compressionMode) {
  const [seal, context] = await createHEContext(polyModulusDegree, securityLevel, plainModulus);
  const encoder = seal.BatchEncoder(context);
  const keyGenerator = seal.KeyGenerator(context);
  const publicKey = keyGenerator.createPublicKey();
  const secretKey = keyGenerator.secretKey(); // Use the `createGaloisKeysSerializable` function which generates a `Serializable` object
  // ready to be serialized. The benefit is about a 50% reduction in size,
  // but you cannot perform any HE operations until it is deserialized into
  // a proper GaloisKeys instance.

  const galoisKeys = keyGenerator.createGaloisKeysSerializable();
  const encryptor = seal.Encryptor(context, publicKey);
  const decryptor = seal.Decryptor(context, secretKey);
  const evaluator = seal.Evaluator(context);
  const compression = getComprModeType(compressionMode, seal);
  return {
    seal,
    compression,
    context,
    encoder,
    keyGenerator,
    publicKey,
    secretKey,
    galoisKeys,
    encryptor,
    decryptor,
    evaluator
  };
}
/**
 * Create a server context
 * @param {number} polyModulusDegree
 * @param {number} plainModulus
 * @param {number} securityLevel
 * @param {string} compressionMode
 * @returns {Promise<Object>}
 */


async function createServerHEContext(polyModulusDegree, plainModulus, securityLevel, compressionMode) {
  const [seal, context] = await createHEContext(polyModulusDegree, securityLevel, plainModulus);
  const encoder = seal.BatchEncoder(context);
  const evaluator = seal.Evaluator(context);
  const compression = getComprModeType(compressionMode, seal);
  return {
    seal,
    compression,
    context,
    encoder,
    evaluator
  };
}
/**
 * Gets the SEAL security enum from a number mapping
 * @param {number} securityLevel
 * @param {Object} options
 * @param {Object} options.SecurityLevel
 * @returns {Object}
 */


function getSecurityLevel(securityLevel, {
  SecurityLevel
}) {
  switch (securityLevel) {
    case 128:
      return SecurityLevel.tc128;

    case 192:
      return SecurityLevel.tc192;

    case 256:
      return SecurityLevel.tc256;

    default:
      return SecurityLevel.tc128;
  }
}
/**
 * Gets the SEAL compression enum from a string mapping
 * @param {string} compression
 * @param {Object} options
 * @param {Object} options.ComprModeType
 * @returns {Object}
 */


function getComprModeType(compression, {
  ComprModeType
}) {
  switch (compression) {
    case 'none':
      return ComprModeType.none;

    case 'zlib':
      return ComprModeType.zlib;

    case 'zstd':
      return ComprModeType.zstd;

    default:
      return ComprModeType.zstd;
  }
}