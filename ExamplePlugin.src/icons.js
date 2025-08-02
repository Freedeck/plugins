/**
 * This is a special file loaded from your package.json that is only used for registering Icons.
 */

const { IconBuilder } = require("@freedeck/icons");

// thisPlugin is just the filename that's dropped in where plugins get extracted (tmp) to identify and search for the icon.

module.exports = (thisPlugin) => {
  new IconBuilder("myFirstIcon", "templateStatic.png") // USE RELATIVE PATH, AS IN RELATIVE TO THIS ICONS.JS FILE!
    .applyTo("dyi.stat") // Automatically, this will add "dyi.stat" to a list of types that is being watched, and Freedeck will apply the icon fully automatically, when the user sets the tile type to that.
    .register(thisPlugin) // This tells Freedeck to make the copy into the public directory where your icon will be on the web, identified by "myFirstIcon.png"
    
  new IconBuilder("templateServer", "templateServer.png")
    .register(thisPlugin);
}