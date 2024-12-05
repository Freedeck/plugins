const path = require("path");
const Plugin = require(path.resolve("./src/classes/Plugin"));
const eventNames = require(path.resolve("./src/handlers/eventNames.js"));
const { compileWebpack } = require(path.resolve("./src/webpack"));

let ioserver = null;
class DevUtils extends Plugin {
	wlc;
	constructor() {
		super("Developer Utilities", "Freedeck", "DevUtils", false);
		this.version = "2.0.0";
	}

	set(inst) {
		ioserver = inst;
	}

	onInitialize() {
		console.log("Initialized DevUtils plugin");
		this.setJSSocketHook("Socket.js");
		this.setJSServerHook("server.js");
		this.registerNewType("Reload All Clients", "du.rl");
		this.registerNewType("Recompile Webpack Bundles", "du.rc");
		this.addView("Editor tests bttuon", "editor_test");
		return true;
	}

	onButton(inter) {
		if (!ioserver) {
			this.sendNotification("No connection to the server");
			return;
		}
		if (inter.type == "du.rl") {
			ioserver.emit(eventNames.default.reload);
		} else if (inter.type == "du.rc") {
			ioserver.emit(eventNames.default.recompile);
			compileWebpack().catch((err) => console.error(err));
		}
	}
}

module.exports = {
	exec: () => new DevUtils(),
	class: DevUtils,
};
