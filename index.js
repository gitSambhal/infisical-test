const dotenv = require('dotenv').config();
const InfisicalClient = require("infisical-node");

async function main() {
  const client = new InfisicalClient({
    token: process.env.SECRET_TOKEN
  });

  const secrets = await client.getAllSecrets();
  const obj = {}
  secrets.map(s => {
    obj[s.secretName] = s.secretValue
  })
  console.log(obj)
}
// your app logic
main()