const { app } = require("@src/http.js");
const path = require('node:path');
let pluginInstance;

app.get("/haf", (req, res) => {
  res.sendFile(path.resolve("./user-data/hooks/haf/page.html"));
});

function init(inst) {
  pluginInstance = inst;
}

module.exports = {init};