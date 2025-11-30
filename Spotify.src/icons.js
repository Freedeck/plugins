/**
 * This is a special file loaded from your package.json that is only used for registering Icons.
 */

const { IconBuilder } = require("@freedeck/icons");

// thisPlugin is just the filename that's dropped in tmp to identify and search for the icon.
module.exports = (thisPlugin) => {
	new IconBuilder("play", "play.png") // USE RELATIVE PATH, AS IN RELATIVE TO THIS ICONS.JS FILE!
		.register(thisPlugin);

	new IconBuilder("pause", "pause.png")
		.applyTo("sp.playpause")
		.register(thisPlugin);

	new IconBuilder("next", "next.png")
		.applyTo("sp.next")
		.register(thisPlugin);

	new IconBuilder("previous", "previous.png")
		.applyTo("sp.prev")
		.register(thisPlugin);
};
