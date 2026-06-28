const { Plugin, HookRef, types, events, intents, SettingBuilder } = require("@freedeck/api");
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

    this.useSetting(new SettingBuilder()
    .setId("token")
    .setName("Long-Lived Access Token")
    .setDefaultValue("Change me!")
    .setDescription("This is your Home Assistant token."))

    this.useSetting(new SettingBuilder()
    .setId("url")
    .setName("Home Assistant Instance URL")
    .setDefaultValue("http://localhost:8123/")
    .setDescription("This is your HA instance URL."))
    this.useSetting(new SettingBuilder()
    .setId("states")
    .setName("States To Track")
    .setDefaultValue(["change.my.room.temperature"])
    .setDescription("These are what states HAF will track."))

    this.useSetting(new SettingBuilder()
    .setId("updi")
    .setName("Update Interval")
    .setDefaultValue(1000)
    .setDescription("This is how often to poll HA."))

		let token = this.getSetting("token")
		let url = this.getSetting("url")
		let statesToTrack = this.getSetting("states")

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
			this.getSetting("updi") || 1000,
		);

		let hasReceivedServer = false;

		this.on(events.connection, ({ socket, io }) => {
			if(!hasReceivedServer) {
				hasReceivedServer = true;
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
			}

			socket.on("haf.setup_status", () => {
				socket.emit("haf.setup_status", this.getSetting("token") != "null");
			});
			socket.on("haf.set_settings", (data) => {
				if (!data.token || !data.url || !data.statesToTrack) {
					socket.emit(
						"haf.set_settings",
						"Error: missing either token, url, or statesToTrack",
					);
					return;
				}
				this.setSetting("states", data.statesToTrack);
				this.setSetting("url", "http://" + data.url);
				this.setSetting("token", data.token);
				
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
		});

		return true;
	}

	onButton(interaction) {
		if (interaction.type == "haf.forceupdate") {
			this.stateLoop(
				this.getSetting("token"),
				this.getSetting("url"),
				this.getSetting("states"),
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
