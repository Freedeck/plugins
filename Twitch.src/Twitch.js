const {Plugin, HookRef, types} = require("@freedeck/api");

class Twitch extends Plugin {
	setup() {
		this.add(HookRef.types.server, "twitch/Hook.js");
		this.add(HookRef.types.client, "twitch/Hook.js");
		this.register({
			display: "Viewer Count (Number + Streamer Name)",
			type: "t.vc",
			templateData: {
				streamer: ""
			},
			renderType: types.text
		});
		this.register({
			display: "Viewer Count (Number Only)",
			type: "t.vcn",
			templateData: {
				streamer: ""
			},
			renderType: types.text
		});
	}
}

module.exports = {
	exec: () => new Twitch(),
	class: Twitch,
};
