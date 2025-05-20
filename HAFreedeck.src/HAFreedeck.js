const { Plugin, HookRef, types, events, intents } = require("@freedeck/api");

const stateCache = {};
class HAF extends Plugin {
  token = "";
  statesToTrack = ["my.room.temperature"];
  statesCount = 3;
  url = "http://localhost:8123/";

  setup() {
    console.log("Initialized HAFreedeck.");
    this.add(HookRef.types.server, "haf/server.js");
    this.add(HookRef.types.client, "haf/server.js");

    this.requestIntent(intents.IO);

    const token = this.getFromSaveData("token");
    if (token == undefined || token == "") {
      console.log("No token found, please enter your token in the settings.");
      this.setToSaveData("token", "");
      return false;
    }

    const url = this.getFromSaveData("url");
    if (url == undefined) {
      console.log(
        "No URL found, please enter your Home Assistant URL in the settings."
      );
      this.setToSaveData("url", "http://localhost:8123/");
      return false;
    }

    const statesToTrack = this.getFromSaveData("statesToTrack");
    if (
      statesToTrack == undefined ||
      statesToTrack == ["change.my.room.temperature"]
    ) {
      console.log(
        "No states to track found, please enter the states you want to track in the settings."
      );
      this.setToSaveData("statesToTrack", ["change.my.room.temperature"]);
      return false;
    }

    let isSilent = this.getFromSaveData("silent");
    if (isSilent == undefined || isSilent == "") {
      console.log("No saved data found for silent mode, enabling.");
      this.setToSaveData("silent", true);
      isSilent = true;
    }

    let statesCount = this.getFromSaveData("statesCount");
    if (statesCount == undefined || statesCount == "") {
      console.log("No saved data found for states count, setting to 3.");
      this.setToSaveData("statesCount", 3);
      statesCount = 3;
    }

    for (let i = 0; i < statesCount - statesToTrack.length + 1; i++) {
      statesToTrack.push("state" + i);
      this.setToSaveData("statesToTrack", statesToTrack);
    }

    console.log("Connecting to Home Assistant...");

    fetch(url + "api/", {
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.text())
      .then((data) => {
        console.log("Connected to Home Assistant!");
      })
      .catch((err) => {
        console.error(
          "Failed to connect to Home Assistant. Make sure the server is online."
        );
      });

    this.register({
      display: "Force Update",
      type: "haf.forceupdate",
    });
    
    statesToTrack.forEach((state) => {
      this.register({
        display: state,
        type: state,
        renderType: types.text,
      });
      stateCache[state] = null;
    });

    // This is all you need to do. Freedeck will do all of the logic for you.

    setInterval(() => {
      this.stateLoop(token, url, statesToTrack, isSilent);
    }, this.getFromSaveData("updateInterval") || 1000);

    this.onButton(events.connection, ({ socket, io }) => {
      io.on("haf.forceupdate", () => {
        for (const state in stateCache) {
          const data = stateCache[state];
          if (!data) {
            this.io.emit("haf.statechange", {
              wanted: state,
              state: "Failed to query state.",
            });
          }
          this.io.emit("haf.statechange", {
            wanted: data.entity_id,
            state:
              data.attributes.friendly_name +
              ": " +
              data.state +
              data.attributes.unit_of_measurement,
          });
        }
      });
    });

    return true;
  }

  onButton(interaction) {
    if (interaction.type == "haf.forceupdate") {
      this.stateLoop(
        this.getFromSaveData("token"),
        this.getFromSaveData("url"),
        this.getFromSaveData("statesToTrack"),
        true
      );
      if (this.io != null) {
        const data = stateCache[interaction.type];
        if (data == null) {
          this.io.emit("haf.statechange", {
            wanted: interaction.type,
            state: "Failed to query state.",
          });
        }
        this.io.emit("haf.statechange", {
          wanted: data.entity_id,
          state:
            data.attributes.friendly_name +
            ": " +
            data.state +
            data.attributes.unit_of_measurement,
        });
      }
    }
    return true;
  }

  async stateLoop(t, u, s, i) {
    let output = [];
    try {
      const fetchPromises = s.map((state) =>
        fetch(u + "api/states/" + state, {
          headers: {
            Authorization: "Bearer " + t,
            "Content-Type": "application/json",
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data !== stateCache[state]) {
              stateCache[state] = data;
              output.push({
                wanted: data.entity_id,
                state:
                  data.attributes.friendly_name +
                  ": " +
                  data.state +
                  (data.attributes.unit_of_measurement || ""),
              });
            }
          })
          .catch((err) => {
            if (!i) console.log("Failed to query state " + state, err);
            output.push({
              wanted: state,
              state: "Failed to query state.",
            });
          })
      );

      await Promise.all(fetchPromises);
    } catch (err) {
      console.error("Error in stateLoop:", err);
    }

    if (this.io.active != false) this.io.emit("haf.statechange", output);
  }

  stateChange(changeData) {}
}

module.exports = {
  exec: () => new HAF(),
  class: HAF,
};
