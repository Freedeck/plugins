const path = require("path");
const {PluginV2, types, events, intents} = require(path.resolve("./src/classes/PluginV2"));
const HookRef = require(path.resolve("./src/classes/HookRef"));

let socketIoServer;
class TestPluginV2 extends PluginV2 {
  setup() {
    this.setName("Test Plugin V2");
    this.setAuthor("Test Author");
    this.setID("test-plugin-v2");
    console.log(this)
    
    this.add(HookRef.types.client, "test-plugin-v2.js");
    this.requestIntent(intents.IO);
    this.requestIntent(intents.SOCKET);
    this.register({
      display: "Test Button from PLV2",
      type: "test.plv2",
      templateData: {},
      renderType: types.button
    })

    this.on(events.button, this.buttonPressed);
    this.on(events.connection, this.onConnected);
  }

  onConnected({io, socket}) {
    console.log("Connected to Test Plugin V2");
    socketIoServer = io;
  }

  buttonPressed(interaction) {

  }
}

module.exports = {
  exec: () => new TestPluginV2(),
  class: TestPluginV2
};