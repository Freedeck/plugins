const {Plugin, HookRef, types} = require("@freedeck/api");

class Kick extends Plugin {
	setup() {
		this.add(HookRef.types.server, "kick/Hook.js");
		this.add(HookRef.types.client, "kick/Hook.js");
		this.register({
			display: "Viewer Count (Number + Streamer Name)",
			type: "k.vc",
			templateData: {
				streamer: ""
			},
			renderType: types.text
		});
		this.register({
			display: "Viewer Count (Number Only)",
			type: "k.vcn",
			templateData: {
				streamer: ""
			},
			renderType: types.text
		});
	}
}

module.exports = {
	exec: () => new Kick(),
	class: Kick,
};
