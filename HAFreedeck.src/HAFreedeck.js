const { Plugin, HookRef, types, events, intents } = require("@freedeck/api");
const { init } = require("./userHelper");
const eventNames = require("@handlers/eventNames");

const stateCache = {};
class HAF extends Plugin {
	token = "";
	statesToTrack = ["my.room.temperature"];
	statesCount = 3;
	url = "http://localhost:8123/";

	setup() {
		console.log("Initialized HAFreedeck.");
		this.add(HookRef.types.server, "haf/auth-helper.js");
		this.add(HookRef.types.server, "haf/server.js");
		this.add(HookRef.types.client, "haf/server.js");
		this.add(HookRef.types.import, "haf/page.html");
		this.add(HookRef.types.import, "haf/msg01.png");
		this.add(HookRef.types.import, "haf/msg02.png");
		this.add(HookRef.types.import, "haf/msg03.png");
		init(this);

		this.setPopout(
			`<a id='con_haf' onclick='window.open("/haf", "Freedeck Home Assistant Settings", "width=800,height=800"); return false;'>Connect Home Assistant</a>`
		);

		this.requestIntent(intents.IO);
		this.requestIntent(intents.SOCKET);

		let token = this.getFromSaveData("token") || "";
		if (token == undefined || token == "") {
			console.log("No token found, please enter your token in the settings.");
			this.setToSaveData("token", "");
		}

		let url = this.getFromSaveData("url") || "http://localhost:8123/";
		if (url == undefined) {
			console.log(
				"No URL found, please enter your Home Assistant URL in the settings.",
			);
			this.setToSaveData("url", "http://localhost:8123/");
		}

		let statesToTrack = this.getFromSaveData("statesToTrack") || ["change.my.room.temperature"];
		if (
			statesToTrack == undefined ||
			statesToTrack == ["change.my.room.temperature"]
		) {
			console.log(
				"No states to track found, please enter the states you want to track in the settings.",
			);
			this.setToSaveData("statesToTrack", ["change.my.room.temperature"]);
		}

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

		setInterval(
			() => {
				this.stateLoop(token, url, statesToTrack, true);
			},
			this.getFromSaveData("updateInterval") || 1000,
		);

		this.on(events.connection, ({ socket, io }) => {
			socket.on("haf.setup_status", () => {
				socket.emit("haf.setup_status", this.getFromSaveData("token") != "");
			});
			socket.on("haf.set_settings", (data) => {
				if (!data.token || !data.url || !data.statesToTrack) {
					socket.emit(
						"haf.set_settings",
						"Error: missing either token, url, or statesToTrack",
					);
					return;
				}
				this.setToSaveData("statesToTrack", data.statesToTrack);
				this.setToSaveData("url", "http://" + data.url);
				this.setToSaveData("token", data.token);
				statesToTrack.forEach((state) => {
					this.deregisterType(state);
				});
				statesToTrack = data.statesToTrack;
				token = data.token;
				url = "http://"+data.url;
				data.statesToTrack.forEach((state) => {
					this.register({
						display: state,
						type: state,
						renderType: types.text,
					});
					stateCache[state] = null;
				});
				this.stateLoop(
					data.token,
					"http://"+data.url,
					data.statesToTrack,
					true,
				);
				io.emit(eventNames.default.reload);
			});
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
				true,
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
						console.log("Failed to query state " + state, err);
						output.push({
							wanted: state,
							state: "Failed to query state.",
						});
					}),
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
