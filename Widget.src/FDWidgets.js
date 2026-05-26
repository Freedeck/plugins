const path = require("path");
const Plugin = require(path.resolve("./src/classes/Plugin"));
let _SIO;
class FDWidgets extends Plugin {

	constructor() {
		// With JS Hooks, you must keep the ID of your plugin the name of the source folder.
		super("FDWidgets", "FDWidgets", "Widget", false);
		this.version = "Devbelopemtnm";
	}

	onInitialize() {
		console.log("Initialized Widgets PoC Freedeck.");
		this.setJSServerHook("wd/server.js");
		this.setJSClientHook("wd/server.js");
		this.setJSSocketHook("wd/socket.js");

		this.registerNewType("2Rx1C: Gradient", "w.w", {}, "widget");

		return true;
	}

	setSio(s, sio) {
		_SIO = sio;
	}

	onButton(interaction) {
		return true;
	}

}

module.exports = {
	exec: () => new FDWidgets(),
	class: FDWidgets,
};
