const path = require("path");
const Plugin = require(path.resolve("./src/classes/Plugin"));

let _sio;
class Flute extends Plugin {
	constructor() {
		super("Flute", "Freedeck", "Flute", true);
		this.version = "1.0.0";
	}
	set(s) {
		_sio = s;
	}
	channels = {}
	onInitialize() {
		console.log("Initialized Flute plugin");
		this.setJSServerHook("flt/App.js");
		this.setJSClientHook("flt/App.js");
		this.setJSSocketHook("flt/Socket.js");
		this.registerNewType("Record Output", "f.r", {channel:"main"}, "button");
		this.registerNewType("Playback", "f.p", {channel:"main"}, "button");
		return true;
	}
	onButton(int) {
		if(int.type === "f.r") {
			if(!this.channels[int.channel]) this.channels[int.channel] = {
				status:false,
				uuid:[int.uuid]
			};
			else  this.channels[int.channel].uuid.includes(int.uuid) ? true : this.channels[int.channel].uuid.push(int.uuid);

			this.channels[int.channel] = !this.channels[int.channel];
			_sio.emit("flute-record-state", [this.channels[int.channel], int]);
		}
		if(int.type === "f.p") {
			_sio.emit("flute-playback", int);
		}

		_sio.emit("flute-loopback", int);
	}
	blastAllChannelStatus() {
		for(const channel in this.channels) {
			_sio.emit("flute-record-state", [this.channels[channel], {uuid:this.channels[channel].uuid}]);
		}
	}
}

module.exports = {
	exec: () => new Flute(),
	class: Flute,
};
