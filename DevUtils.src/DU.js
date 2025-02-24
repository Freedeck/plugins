const {Plugin, HookRef, intents} = require("@freedeck/api");

const path = require("path");

const evtNameLocation = path.resolve("./src/handlers/eventNames.js");
const webpackLocation = path.resolve("./src/webpack.js");

const eventNames = require(evtNameLocation);
const { compileWebpack } = require(webpackLocation);

class DevUtils extends Plugin {
	setup() {
		this.requestIntent(intents.IO);

		this.add(HookRef.types.server, 'duhooks/server.js');
		this.add(HookRef.types.socket, 'duhooks/socket.js');
		
		this.register({
			display: "Reload All Connected Sockets",
			type: "du.rl"
		});
		
		this.register({
			display: "Recompile Webpack Bundles",
			type: "du.rc"
		});

		this.addView("Editor Custom View Test", "editor_test");

		console.log("Initialized DevUtils plugin");
		return true;
	}

	onButton(inter) {
		if (!this.io) {
			this.sendNotification("No connection to the server");
			return;
		}
		if (inter.type == "du.rl") {
			this.io.emit(eventNames.default.reload);
		} else if (inter.type == "du.rc") {
			this.io.emit(eventNames.default.recompile);
			compileWebpack().catch((err) => console.error(err));
		}
	}
}

module.exports = {
	exec: () => new DevUtils(),
	class: DevUtils,
};
