const path = require("path");
const Plugin = require(path.resolve("./src/classes/Plugin"));
const cheerio = require("cheerio");

let corsServer, sockIo;

class MIP extends Plugin {
  constructor() {
    super("MyInstants", "Freedeck", "myinstants", false);
    this.version = "3.0.0";
  }

  setSocket(sio) {
    sockIo = sio;
  }

  onInitialize() {
    console.log("Initialized MIPlugin");
    this.setJSSocketHook("mi/socket.js");
    this.registerNewType("MyInstants Sound", "mi.sound", {
      url: "https://www.myinstants.com/en/instant/vine-boom-sound-70972/",
    });
    return true;
  }

  async onButton(interaction) {
    if(!sockIo) return;
    let url = interaction.data.url;
    if (!url) return;
	interaction.data = {path: '', file: ''}
    interaction.type = 'fd.sound'; // convert to sound so freedeck processes it properly
    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);

    const respondeArray = {};
    $("#instant-page-button-element").each((i, elem) => {
      const url = $(elem).attr("data-url");
      const slashes = url.split("/");
      slashes.pop();
      const path = "http://localhost:5576/myinstants.com" + slashes.join("/");
      const file = url.split("/").slice(3).join("/");
      respondeArray.path = path;
      respondeArray.file = file;
    });
    interaction.data.path = respondeArray.path;
    interaction.data.file = respondeArray.file;
    sockIo.emit("K", interaction);
  }

  async onStopping() {
    console.log("Stopping MIPlugin...");

    try {

      // Close CORS proxy connections if possible
      corsServer.closeAllConnections();
      await new Promise((resolve, reject) => {
        corsServer.close((err) => (err ? reject(err) : resolve()));
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("CORS proxy server stopped.");
    } catch (err) {
      console.error("Error stopping servers:", err);
    }

    console.log("MI:FD stopped!");
  }
}

const net = require("net");

function isPortInUse(port, host = "0.0.0.0") {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(true);  // Port is in use
      } else {
        reject(err);    // Other error
      }
    });

    server.once("listening", () => {
      server.close();  // Close the server immediately
      resolve(false);  // Port is free
    });

    server.listen(port, host);
  });
}

// Start servers
const start = async () => {
  try {
    if(!await isPortInUse(5576)) {
        const host = process.env.HOST || "0.0.0.0";
        const port = process.env.PORT || 5576;

        const cors_proxy = require("cors-anywhere");
        corsServer = cors_proxy.createServer({
        originWhitelist: [], // Allow all origins
        }).listen(port, host, () => {
        console.log("MiAPI:CORS initialized");
        });
    } else {
        // dispose of our unused server
        delete corsServer;
    }

    console.log("MiAPI2:FD initialized");
  } catch (err) {
    console.error("Error starting servers:", err);
  }
};

start();

module.exports = {
  exec: () => new MIP(),
  class: MIP,
};
