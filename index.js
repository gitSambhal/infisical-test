const dotenv = require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = 'https://app.infisical.com';
const ALGORITHM = 'aes-256-gcm';
const SECRET_TOKEN = process.env.SECRET_TOKEN

const decrypt = ({ ciphertext, iv, tag, secret }) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    secret,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  let cleartext = decipher.update(ciphertext, 'base64', 'utf8');
  cleartext += decipher.final('utf8');

  return cleartext;
}

const getSecretsUsingAxios = async () => {
  const serviceToken = SECRET_TOKEN;
  const serviceTokenSecret = serviceToken.substring(serviceToken.lastIndexOf('.') + 1);

  // 1. Get your Infisical Token data
  const { data: serviceTokenData } = await axios.get(
    `${BASE_URL}/api/v2/service-token`,
    {
      headers: {
        Authorization: `Bearer ${serviceToken}`
      }
    }
  );

  // 2. Get secrets for your project and environment
  const { data } = await axios.get(
    `${BASE_URL}/api/v2/secrets?${new URLSearchParams({
      environment: serviceTokenData.environment,
      workspaceId: serviceTokenData.workspace
    })}`,
    {
      headers: {
        Authorization: `Bearer ${serviceToken}`
      }
    }
  );

  const encryptedSecrets = data.secrets;

  // 3. Decrypt the (encrypted) project key with the key from your Infisical Token
  const projectKey = decrypt({
    ciphertext: serviceTokenData.encryptedKey,
    iv: serviceTokenData.iv,
    tag: serviceTokenData.tag,
    secret: serviceTokenSecret
  });

  // 4. Decrypt the (encrypted) secrets
  let secrets = {}
  encryptedSecrets.map((secret) => {
    const secretKey = decrypt({
      ciphertext: secret.secretKeyCiphertext,
      iv: secret.secretKeyIV,
      tag: secret.secretKeyTag,
      secret: projectKey
    });

    const secretValue = decrypt({
      ciphertext: secret.secretValueCiphertext,
      iv: secret.secretValueIV,
      tag: secret.secretValueTag,
      secret: projectKey
    });

    secrets[secretKey] = secretValue
    return ({
      secretKey,
      secretValue
    });
  });

  console.log('secrets: ', secrets);
}

const getSecretsUsingOfficialPackage = () => {
  const infisical = require("infisical-node");

  infisical.connect({
    token: SECRET_TOKEN
  })
    .then((instance) => {
      // your application logic
      // console.log(infisical.get('NODE_ENV'))
      console.log(instance.secrets);
    })
    .catch(err => {
      console.error('Error: ', err);
    })
}

// getSecretsUsingOfficialPackage()
// getSecretsUsingAxios();

