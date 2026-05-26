const {Plugin, HookRef, types, intents} = require("@freedeck/api");

class FDWidgets extends Plugin {
	setup() {
		console.log("Initialized Widgets PoC Freedeck.");

		this.add(HookRef.types.server, "wd/server.js");
		this.add(HookRef.types.client, "wd/server.js");
		
		this.requestIntent(intents.IO);

		this.register({
			display: "2Rx1C: Gradient",
			type: "w.w",
			renderType: "widget"
		})

		return true;
	}

	onButton(interaction) {
		return true;
	}

}

module.exports = {
	exec: () => new FDWidgets(),
	class: FDWidgets,
};
