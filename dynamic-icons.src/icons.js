/**
 * This is a special file loaded from your package.json that is only used for registering Icons.
 */

const { IconBuilder } = require("@freedeck/icons");

// thisPlugin is just the filename that's dropped in tmp to identify and search for the icon.
module.exports = (thisPlugin) => {
  new IconBuilder("templateStatic", "templateStatic.png") // USE RELATIVE PATH, AS IN RELATIVE TO THIS ICONS.JS FILE!
    .applyTo("dyi.stat")
    .register(thisPlugin)
    
  new IconBuilder("templateServer", "templateServer.png")
    .applyTo("dyi.server")
    .register(thisPlugin);
}