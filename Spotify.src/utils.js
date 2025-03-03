const crypto = require("node:crypto");

const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters[randomIndex];
  }
  return randomString;
}
const sha256 = (plain) => {
  return crypto.createHash("sha256").update(plain).digest();
};

const base64urlEncode = (buffer) => {
  return buffer.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

module.exports = {
  generateRandomString,
  sha256,
  base64urlEncode
}