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
      // Mute / Unmute Status Request
      socket.on("wl.stat", async (wanted) => {
        let type = wanted.split("@")[1]; // 'm' for Local (Master), 'sm' for Stream
        wanted = wanted.split("@")[0];   // Channel Name

        try {
          if (!this.wlc) return;
          const channel = this.wlc.getChannels().find(c => c.name === wanted);
          if (!channel) return;

          let returning = false;
          if (type === "m") {
            returning = channel.isMuted;
          } else {
            const streamMix = this.wlc.getMixes().find(m => m.name === 'Stream Mix');
            returning = channel.mixes.find(m => m.id === streamMix?.id)?.isMuted || false;
          }

          io.emit(
            "wl.stat",
            JSON.stringify({ input: wanted, value: returning, type })
          );
        } catch (err) {
          console.log("Error while fetching input status:", err);
        }
      });

      // Volume Status Request
      socket.on("wl.vol", async (wanted) => {
        let type = wanted.split("@")[1]; // 'v' for Local (Master), 'vm' for Stream
        wanted = wanted.split("@")[0];   // Channel Name

        try {
          if (!this.wlc) return;
          const channel = this.wlc.getChannels().find(c => c.name === wanted);
          if (!channel) return;

          let floatValue = 0;
          if (type === "v") {
            floatValue = channel.level;
          } else {
            const streamMix = this.wlc.getMixes().find(m => m.name === 'Stream Mix');
            floatValue = channel.mixes.find(m => m.id === streamMix?.id)?.level || 0;
          }
          
          // Convert 0-1 float back to 0-100 for your front-end slider
          let returning = Math.round(floatValue * 100);

          io.emit(
            "wl.vol",
            JSON.stringify({ input: wanted, value: returning, type })
          );
        } catch (err) {
          console.log("Error while fetching volume:", err);
        }
      });
    });

    this.WaveLinkControl();
    return true;
  }

  WaveLinkControl() {
    const wlc = new WaveLinkController();
    
    wlc.on('ready', () => {
      this.wlc = wlc;
      console.log("Connected to Elgato WaveLink");

      // Register companion controls once the SDK is populated with data
      const channels = wlc.getChannels();
      channels.forEach((channel) => {
        this.register({
          display: "Mute " + channel.name + " (Monitor)",
          type: "wl.m." + channel.name,
        });
        this.register({
          display: "Mute " + channel.name + " (Stream)",
          type: "wl.sm." + channel.name,
        });
        this.register({
          display: "Volume " + channel.name + " (Monitor)",
          type: "wl.v." + channel.name,
          renderType: types.slider,
          templateData: {
            min: 0,
            max: 100,
            value: 0,
            direction: "vertical",
          },
        });
        this.register({
          display: "Volume " + channel.name + " (Stream)",
          type: "wl.vm." + channel.name,
          renderType: types.slider,
          templateData: {
            min: 0,
            max: 100,
            value: 0,
            direction: "vertical",
          },
        });
      });
    });

    wlc.on('disconnected', () => {
      console.log("WaveLink disconnected.");
      this.wlc = null;
    });

    // In v2, connect() is synchronous; initialization happens over the 'ready' event listener
    wlc.connect();
  }

  onButton(buttonId) {
    if (!this.wlc) return;

    const channelName = buttonId.type.split(".").pop();
    const channel = this.wlc.getChannels().find(c => c.name === channelName);
    if (!channel) return;

    const streamMix = this.wlc.getMixes().find(m => m.name === 'Stream Mix');

    // 1. Monitor Mute Toggle
    if (buttonId.type.startsWith("wl.m.")) {
      this.wlc.setChannel({ 
        id: channel.id, 
        isMuted: !channel.isMuted 
      });
    } 
    
    // 2. Stream Mute Toggle
    else if (buttonId.type.startsWith("wl.sm.")) {
      if (!streamMix) return;
      const currentStreamMute = channel.mixes.find(m => m.id === streamMix.id)?.isMuted || false;
      
      this.wlc.setChannel({
        id: channel.id,
        mixes: [{ id: streamMix.id, isMuted: !currentStreamMute }]
      });
    } 
    
    // 3. Monitor Volume Slider (Incoming 0-100 translated to 0-1)
    else if (buttonId.type.startsWith("wl.v.")) {
      const targetVolume = Math.min(Math.max(parseInt(buttonId.data.value) / 100, 0), 1);
      this.wlc.setChannel({ 
        id: channel.id, 
        level: targetVolume 
      });
    } 
    
    // 4. Stream Volume Slider (Incoming 0-100 translated to 0-1)
    else if (buttonId.type.startsWith("wl.vm.")) {
      if (!streamMix) return;
      const targetVolume = Math.min(Math.max(parseInt(buttonId.data.value) / 100, 0), 1);
      
      this.wlc.setChannel({
        id: channel.id,
        mixes: [{ id: streamMix.id, level: targetVolume }]
      });
    }
  }
}

module.exports = {
  exec: () => new WaveLink(),
  class: WaveLink,
};