const path = require("path");
const { Plugin, HookRef, types, events, intents } = require("@freedeck/api");

const { WaveLinkController } = require("@darrellvs/node-wave-link-sdk");

class WaveLink extends Plugin {
  wlc;

  setup() {
    this.requestIntent(intents.IO);
    this.requestIntent(intents.SOCKET);
    console.log("Initialized WaveLink plugin");
    this.add(HookRef.types.server, "wavelink/companion.js");
    this.add(HookRef.types.client, "wavelink/companion.js");
    this.on(events.connection, ({ socket, io }) => {
      socket.on("wl.stat", async (wanted) => {
        let type = wanted.split("@")[1];
        wanted = wanted.split("@")[0];
        try {
          const inp = await this.wlc.getInput({ name: wanted });
          let returning = type == "m" ? inp.localMute : inp.streamMute;
          io.emit(
            "wl.stat",
            JSON.stringify({ input: wanted, value: returning, type })
          );
        } catch (err) {
          console.log("Error while fetching input:", err);
          console.log(
            "WaveLink may not be connected yet, so this is not fatal."
          );
        }
      });
      socket.on("wl.vol", async (wanted) => {
        let type = wanted.split("@")[1];
        wanted = wanted.split("@")[0];
        try {
          const inp = await this.wlc.getInput({ name: wanted });
          let returning = type == "v" ? inp.localVolume : inp.streamVolume;
          io.emit(
            "wl.vol",
            JSON.stringify({ input: wanted, value: returning, type })
          );
        } catch (err) {
          console.log("Error while fetching input:", err);
          console.log(
            "WaveLink may not be connected yet, so this is not fatal."
          );
        }
      });
    });
    this.WaveLinkControl();
    return true;
  }

  async WaveLinkControl() {
    const wlc = new WaveLinkController();
    await wlc.connect();
    this.wlc = wlc;
    console.log("Connected to Elgato WaveLink");

    const inputs = await wlc.getInputs();
    inputs.forEach((input) => {
      this.register({
        display: "Mute " + input.name + " (Monitor)",
        type: "wl.m." + input.name,
      });
      this.register({
        display: "Mute " + input.name + " (Stream)",
        type: "wl.sm." + input.name,
      });
      this.register({
        display: "Volume " + input.name + "(Monitor)",
        type: "wl.v." + input.name,
        renderType: types.slider,
        templateData: {
          min: 0,
          max: 100,
          value: 0,
          direction: "vertical",
        },
      });
      this.register({
        display: "Volume " + input.name + "(Stream)",
        type: "wl.vm." + input.name,
        renderType: types.slider,
        templateData: {
          min: 0,
          max: 100,
          value: 0,
          direction: "vertical",
        },
      });
    });
  }

  onButton(buttonId) {
    if (buttonId.type.startsWith("wl.m.")) {
      const inputId = buttonId.type.split(".").pop();
      const inp = this.wlc.getInput({ name: inputId });
      inp.localMute = !inp.localMute;
    } else if (buttonId.type.startsWith("wl.sm.")) {
      const inputId = buttonId.type.split(".").pop();
      const inp = this.wlc.getInput({ name: inputId });
      inp.streamMute = !inp.streamMute;
    } else if (buttonId.type.startsWith("wl.v.")) {
      const inputId = buttonId.type.split(".").pop();
      const inp = this.wlc.getInput({ name: inputId });
      inp.localVolume = Math.floor(parseInt(buttonId.data.value));
    } else if (buttonId.type.startsWith("wl.vm.")) {
      const inputId = buttonId.type.split(".").pop();
      const inp = this.wlc.getInput({ name: inputId });
      inp.streamVolume = Math.floor(parseInt(buttonId.data.value));
    }
  }
}

module.exports = {
  exec: () => new WaveLink(),
  class: WaveLink,
};
