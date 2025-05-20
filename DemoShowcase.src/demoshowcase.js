const { Plugin, events, intents, HookRef } = require("@freedeck/api");
const settingsManager = require("@managers/settings");
const pluginsManager = require("@managers/plugins");
const eventNames = require("@handlers/eventNames");
const dphandler = require("@handlers/default.events/disable_plugin");

const inMemory = {
  writeLogs: true,
  release: "dev",
  theme: "default.css",
  profile: "Default",
  profiles: {},
  screenSaverActivationTime: 5,
  soundOnPress: false,
  useAuthentication: false,
  port: 5754,
};
function reset() {
  inMemory.profiles = {
    Screenshot: [
      {
        "Biggest Bird": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 0,
          uuid: "demo",
          data: {},
        },
      },
      {
        "Bugatti": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 1,
          uuid: "demo.0",
          data: {},
        },
      },
      {
        "COD Footsteps": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 2,
          uuid: "demo.1",
          data: {},
        },
      },
      {
        "COD Shooting": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 3,
          uuid: "demo.2",
          data: {},
        },
      },
      {
        "Disconnect": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 4,
          uuid: "demo.3",
          data: {},
        },
      },
      {
        "Let Me Do It For You": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 5,
          uuid: "demo.4",
          data: {},
        },
      },
      {
        "Haha": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 6,
          uuid: "demo.5",
          data: {},
        },
      },
      {
        "Huh": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 7,
          uuid: "demo.6",
          data: {},
        },
      },
      {
        "iPhone Ringtone Remix": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 8,
          uuid: "demo.7",
          data: {},
        },
      },
      {
        "Metal Pipe": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 9,
          uuid: "demo.8",
          data: {},
        },
      },
      {
        "Current Time": {
          type: "demo.time",
          plugin: "demoshowcase",
          pos: 10,
          uuid: "demo.9",
          data: {},
        },
      },
      {
        "Ohio": {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 11,
          uuid: "demo.10",
          data: {},
        },
      },
      {
        "Desk screenshot": {
          type: "demo.DSD",
          plugin: "demoshowcase",
          pos: 12,
          uuid: "demo.dss",
          data: {},
        },
      },
      {
        "Emu screenshot": {
          type: "demo.DSE",
          plugin: "demoshowcase",
          pos: 13,
          uuid: "demo.dse",
          data: {},
        },
      },
    ],
    Default: [
      {
        Freedeck: {
          type: "demo.fd",
          plugin: "demoshowcase",
          pos: 0,
          uuid: "demo",
          data: {},
        },
      },
      {
        "Go To Screenshot": {
          type: "fd.profile",
          pos: 1,
          uuid: "demo.1",
          data: {
            profile: "Screenshot",
          },
        }
      }
    ],
  };
}
class DemoShowcase extends Plugin {
  setup() {
    this.requestIntent(intents.IO);
    this.requestIntent(intents.SOCKET);
    console.log("Initializing DemoShowcase...");
    reset();
    this.setPopout(
      "<h1>This plugin is required.</h1><p>Demo Showcase creates a heavily sandboxed experience to demo Freedeck. Please don't disable.</p>"
    );
    this.add(HookRef.types.server, "dfd/server.js");
    this.add(HookRef.types.import, "dfd/htc.js");
    this.register({
      type: "demo.fd",
      display: "demo.fd",
    });
    this.register({
      type: "Desk screenshot",
      display: "demo.DSD",
    })
    this.register({
      type: "Mobile Emu",
      display: "demo.DSE",
    })
    this.register({
      display: 'demo.time',
      type: 'demo.time'
    })
    settingsManager.settings = () => {
      console.log('[Demo] "Retrieved" configuration.');
      console.log(lookForDemoKey());
      if (lookForDemoKey().length == 0) {
        reset();
      }
      if (inMemory.profiles.Default.length > 128) {
        this.pushNotification(
          "Limit of 128 demo tiles has been reached. Clearing. Download Freedeck on your computer to bypass this demo restriction."
        );
        reset();
      }
      return inMemory;
    };
    settingsManager.save = () => {
      console.log('[Demo] "Saved" configuration.');
    };

    this.on(events.connection, ({ socket, io }) => {
      bye(eventNames.default.disable_plugin, socket, io);
      bye(eventNames.default.reload_single_plugin, socket, io);
      bye(eventNames.default.enable_plugin, socket, io);
      bye(eventNames.companion.plugin_set, socket, io);
      bye(eventNames.companion.plugin_set_all, socket, io);
      bye(eventNames.relay.file, socket, io);
    });

    const TestEmulatorOne = {
        name: "OBSControl",
        id: 'obscontrol'
    }
    emulateTypes(TestEmulatorOne, {
        type: "emutype1",
        display: "Emulated Type 1"
    }, (e, eInstance) =>{
        if(e.type == "emutype1") {
            eInstance.pushNotification("emulated type 1");
            this.pushNotification("emulated type 1");
        }
    });

    return true;
  }

  onButton(e) {
    if(e.type === "demo.fd") {
      this.pushNotification("Welcome to Freedeck.");
    }
  }
}

const emulatedPlugins = {};
async function emulateTypes(pluginData, typeData, callback) {
    const {name, id} = pluginData;
    if(!emulatedPlugins[id]) {
        const testPlugin = new Plugin();
        testPlugin.requestIntent(intents.HIDE);
        testPlugin.id = id;
        testPlugin.name = name;
        testPlugin.author = "Demo Showcase";
        testPlugin.popout = "<p>This plugin has been created specifically for demonstration purposes.</p>";
        testPlugin._obl = [];
        testPlugin.onButton = (interaction) => {
            for(const cb of testPlugin._obl) {
                cb(interaction, testPlugin);
            }
        }
        testPlugin.emit(events.ready);
        emulatedPlugins[testPlugin.id] = testPlugin;
        pluginsManager._plc.set(testPlugin.id, {file:"",instance:testPlugin})

    }
    emulatedPlugins[id].register(typeData);
    emulatedPlugins[id]._obl.push(callback);
}

function bye(name, socket, io) {
  socket.removeAllListeners(name);
  io.removeAllListeners(name);
}

function lookForDemoKey() {
  return inMemory.profiles.Default.filter((e) => {
    return e[Object.keys(e)[0]].uuid == "demo";
  });
}

module.exports = {
  exec: () => new DemoShowcase(),
  class: DemoShowcase,
};
