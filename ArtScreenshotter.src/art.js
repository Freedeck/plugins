const { Plugin, events } = require("@freedeck/api");
const path = require('node:path');

class ArtSSer extends Plugin {
  setup() {
    this.register({
      display: "Screenshot",
      type: "art.art"
    })
    this.on(events.button, (type) => {
      this.pushNotification("To screenshot, go to " + path.resolve('./tmp/artscreenshotter.fdpackage/for-companion')+" and run 'electron launcher.js'.")
    })
    return true;
  }
}

module.exports = {
  exec: () => new ArtSSer(),
  class: ArtSSer,
};