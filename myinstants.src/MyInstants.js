const {Plugin, types, events, intents} = require("@freedeck/api");
const eventNames = require("@handlers/eventNames");
const cheerio = require("cheerio");
const cors_proxy = require("cors-anywhere");

let corsServer;
class MIP extends Plugin {
  setup() {
    this.hidePopout();
    
    this.requestIntent(intents.SOCKET);
    this.requestIntent(intents.IO);
    // Every time a user connects, this.io gets refreshed with the current server.
    
    this.addView("MyInstants Sound", "myinstants");

    this.register({
      display: "MyInstants Sound", 
      type: "mi.sound", 
      hidden: true,
      templateData: {
        url: "https://www.myinstants.com/en/instant/vine-boom-sound-70972/",
      },
      renderType: types.button
    });
    
    this.on(events.connection, ({socket, io}) => {
      socket.on("mi:search", ({query}) => {
        if(query.startsWith("https://www.myinstants.com") || query.startsWith("https://myinstants.com")) {
          (async () => {
            const response = await fetch(query);
            const body = await response.text();
            const $ = cheerio.load(body);
        
            const respondeArray = {};
            $("#instant-page-button-element").each((i, elem) => {
              const btn = $(elem);
              const url = btn.attr("data-url");
              const slashes = url.split("/");
              slashes.pop();
              io.emit("mi:results", [{
                title: btn.attr("title") || 'N/A',
                newPath: query,
                onclick: btn.attr("onclick") || 'load("Error",1,1)'
              }]);
            });
          })();
          return;
        }
        fetch(`http://localhost:5576/myinstants.com/en/search/?name=${encodeURIComponent(query)}`)
          .then((res) => res.text())
          .then((body) => {
            const $ = cheerio.load(body);
            const results = [];
            $(".instant").each((i, element) => {
              const btn = $(element).find('.small-button');
              const title = btn.attr('title') || 'N/A';
              const onclick = btn.attr('onclick') || 'N/A';
              const soundPageLink = $(element).find('.instant-link').attr('href') || 'N/A';
              const newPath = 'https://www.myinstants.com' + soundPageLink;
              results.push({ title, newPath, onclick });
            });
            console.log(results);
            io.emit("mi:results", results);
          });
      })
    })

    this.on(events.button, this.buttonPressed);
  }

  async buttonPressed({interaction, io}) {
    let url = interaction.data.url;
    if (!url) return;
    interaction.data = {path: '', file: ''}
    interaction.type = 'fd.sound'; // convert to sound so freedeck processes it properly
    delete interaction.plugin;
    delete interaction.renderType;
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
      interaction.data.path = respondeArray.path;
      interaction.data.file = respondeArray.file;
    });
    io.emit(eventNames.keypress, interaction);
  }

  async onStopping() {
    console.log("Stopping MIPlugin...");
    try {
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


module.exports = {
  exec: () => {
    start();
    return new MIP();
  },
  class: MIP,
};
