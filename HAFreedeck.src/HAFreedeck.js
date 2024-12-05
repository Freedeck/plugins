const path = require("path");
const Plugin = require(path.resolve("./src/classes/Plugin"));
let _SIO, _SIOForceListener;
const stateCache = {};
class HAF extends Plugin {
	token = "";
	statesToTrack = ["my.room.temperature"];
	statesCount = 3;
	url = "http://localhost:8123/";
	constructor() {
		// With JS Hooks, you must keep the ID of your plugin the name of the source folder.
		super("Home Assistant Freedeck", "Freedeck", "HAFreedeck", false);
		this.version = "1.3.0";
	}

	onInitialize() {
		console.log("Initialized HomeAssistant Freedeck.");
		this.setJSServerHook("haf/server.js");
		this.setJSClientHook("haf/server.js");
		this.setJSSocketHook("haf/socket.js");

		const token = this.getFromSaveData("token");
		if (token == undefined || token == "") {
			console.log("No token found, please enter your token in the settings.");
			this.setToSaveData("token", "");
			return false;
		}
		const url = this.getFromSaveData("url");
		if (url == undefined || url == "http://localhost:8123/") {
			console.log(
				"No URL found, please enter your Home Assistant URL in the settings.",
			);
			this.setToSaveData("url", "http://localhost:8123/");
			return false;
		}
		const statesToTrack = this.getFromSaveData("statesToTrack");
		if (
			statesToTrack == undefined ||
			statesToTrack == ["my.room.temperature"]
		) {
			console.log(
				"No states to track found, please enter the states you want to track in the settings.",
			);
			this.setToSaveData("statesToTrack", ["my.room.temperature"]);
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
				console.error("Failed to connect to Home Assistant. Make sure the server is online.");
			});

		this.registerNewType("Force Update", "haf.forceupdate", {}, "button");
		statesToTrack.forEach((state) => {
			this.registerNewType(state, state, {}, "text");
			stateCache[state] = null;
		});

		// This is all you need to do. Freedeck will do all of the logic for you.

		setInterval(() => {
			this.stateLoop(token, url, statesToTrack, isSilent);
		}, this.getFromSaveData("updateInterval") || 1000);

		return true;
	}

	setSio(s, sio) {
		_SIO = sio;
		_SIOForceListener = _SIO.on("haf.forceupdate", () => {
			for(const state in stateCache) {
				const data = stateCache[state];
				if(!data) {
					_SIO.emit("haf.statechange", {
						wanted: state,
						state: "Failed to query state.",
					});
				}
				_SIO.emit("haf.statechange", {
					wanted: data.entity_id,
					state:
						data.attributes.friendly_name +
						": " +
						data.state +
						data.attributes.unit_of_measurement,
				});
			}
		});
	}

	onButton(interaction) {
		if (interaction.type == "haf.forceupdate") {
			this.stateLoop(
				this.getFromSaveData("token"),
				this.getFromSaveData("url"),
				this.getFromSaveData("statesToTrack"),
				true,
			);
			if (_SIO != null) {
				const data = stateCache[interaction.type];
				if(data==null) {
					_SIO.emit("haf.statechange", {
						wanted: interaction.type,
						state: "Failed to query state.",
					});
				}
				_SIO.emit("haf.statechange", {
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

	stateLoop(t, u, s, i) {
		for(const state of s) {
			fetch(u + "api/states/" + state, {
				headers: {
					Authorization: "Bearer " + t,
					"Content-Type": "application/json",
				},
			})
				.then((res) => res.json())
				.then((data) => {
					if(data == stateCache[state]) return;
					stateCache[state] = data;
					if (_SIO != null) {
						_SIO.emit("haf.statechange", {
							wanted: data.entity_id,
							state:
								data.attributes.friendly_name +
								": " +
								data.state +
								data.attributes.unit_of_measurement,
						});
					}
				})
				.catch((err) => {
					if (!i) console.log("Failed to query state " + state, err);
					if (_SIO != null) {
						if(stateCache[state]==null) return;
						_SIO.emit("haf.statechange", {
							wanted: state,
							state: "Failed to query state.",
						});
					}
				});
		};
	}

	stateChange(changeData) {}
}

module.exports = {
	exec: () => new HAF(),
	class: HAF,
};
