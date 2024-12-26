const {Plugin, HookRef, types, events, intents} = require("@freedeck/api");

class TestPluginV2 extends Plugin {
  setup() {
    this.hidePopout();
    this.add(HookRef.types.client, "test.js");
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
    console.log(this)
  }

  onConnected({io, socket}) {
    console.log("Connected to Test Plugin V2");
    console.log(this)
  }

  buttonPressed(interaction) {

  }
}

module.exports = {
  exec: () => new TestPluginV2(),
  class: TestPluginV2
};