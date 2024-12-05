const path = require("path");
const Plugin = require(path.resolve("./src/classes/Plugin"));

class Twitch extends Plugin {
	constructor() {
		super("Twitch", "Freedeck", "Twitch", false);
		this.version = "1.1.0";
	}
	onInitialize() {
		console.log("Initialized Twitch plugin");
		this.setJSServerHook("twitch/Hook.js");
		this.setJSClientHook("twitch/Hook.js");
		this.registerNewType("Viewer Count (Number + Streamer Name)", "t.vc", {streamer:""}, "text");
		this.registerNewType("Viewer Count (Number)", "t.vcn", {streamer:""}, "text");
		return true;
	}
}

module.exports = {
	exec: () => new Twitch(),
	class: Twitch,
};
