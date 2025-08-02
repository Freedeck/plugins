const { Plugin, events, intents } = require("@freedeck/api");
const socketEvents = require("@handlers/eventNames");

let iconState = false;

class ExamplePlugin extends Plugin {
  setup() {
    this.requestIntent(intents.IO);
    this.on(events.button, this.btn);

    this.register({
      display: "Static",
      type: "dyi.stat",
    });

    this.register({
      display: "Server-given",
      type: "dyi.server",
    });

    return true;
  }

  btn({ interaction, io }) {
    if (interaction.type === "dyi.server") {
      io.emit(
        socketEvents.companion.set_tile_icon,
        "dyi.server",
        iconState ? "templateServer.png" : "templateStatic.png"
      );
      iconState = !iconState;
    }
  }
}

module.exports = {
  exec: () => new ExamplePlugin(),
  class: ExamplePlugin,
};
