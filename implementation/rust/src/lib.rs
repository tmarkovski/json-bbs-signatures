use bbs::prelude::*;
use serde_json::{json, Value};
use std::convert::TryFrom;

pub fn normalize(document: &Value) -> Vec<String> {
    let flattened = jsonpointer_flatten::from_json(document);
    let mut result = Vec::new();

    for (key, value) in flattened.as_object().unwrap() {
        result.push(serde_json::to_string(&json!({ key: value })).unwrap());
    }

    result.sort();
    return result;
}

pub fn sign(document: &Value, secret_key: &SecretKey) -> Vec<u8> {
    let normalized = normalize(document);
    let messages: Vec<SignatureMessage> = normalized
        .iter()
        .map(|x| SignatureMessage::hash(x))
        .collect();

    let (dpk, _) =
        DeterministicPublicKey::new(Some(KeyGenOption::FromSecretKey(secret_key.to_owned())));
    let public_key = dpk.to_public_key(messages.len()).unwrap();

    let signature = Signature::new(messages.as_slice(), secret_key, &public_key).unwrap();

    signature.to_bytes_compressed_form().to_vec()
}

pub fn verify(
    document: &Value,
    signature: &[u8],
    d_public_key: &DeterministicPublicKey,
) -> Result<bool, BBSError> {
    let normalized = normalize(document);
    let messages: Vec<SignatureMessage> = normalized
        .iter()
        .map(|x| SignatureMessage::hash(x))
        .collect();

    let public_key = d_public_key.to_public_key(messages.len())?;
    let signature = Signature::try_from(signature)?;

    signature.verify(messages.as_slice(), &public_key)
}

#[cfg(test)]
mod test {
    use super::*;
    use bbs::{prelude::SIGNATURE_COMPRESSED_SIZE, FR_COMPRESSED_SIZE};
    use std::convert::TryFrom;

    #[test]
    fn test_normalize() {
        let document = json!({
            "firstName": "Jane",
            "age": 24
        });

        let normalized = normalize(&document);

        println!("{:?}", normalized);

        assert_eq!(normalized.len(), 3);
    }

    #[test]
    fn test_sign() {
        let sk = SecretKey::try_from([42u8; FR_COMPRESSED_SIZE]).unwrap();

        let document = json!({
            "firstName": "John",
            "age": 24
        });

        let signature = sign(&document, &sk);

        assert_eq!(signature.len(), SIGNATURE_COMPRESSED_SIZE);
    }

    #[test]
    fn test_sign_and_verify() {
        let secret_key = SecretKey::try_from([42u8; FR_COMPRESSED_SIZE]).unwrap();
        let (dpk, _) =
            DeterministicPublicKey::new(Some(KeyGenOption::FromSecretKey(secret_key.to_owned())));

        let document = json!({
            "firstName": "John",
            "age": 24
        });

        let signature = sign(&document, &secret_key);

        assert_eq!(signature.len(), SIGNATURE_COMPRESSED_SIZE);

        let result = verify(&document, signature.as_slice(), &dpk);

        assert!(result.is_ok());
        assert!(result.unwrap());
    }
}
