const path = require("path");
const Plugin = require(path.resolve('./src/classes/Plugin'));

class Clock extends Plugin {
    constructor() {
        // With JS Hooks, you must keep the ID of your plugin the name of the source folder.
        super('Clock', 'Freedeck', 'Clock', false);
        this.version = '1.2.1';
    }

    onInitialize () {
        this.setJSServerHook("clock/client.js");
        this.setJSClientHook("clock/client.js");
        this.registerNewType('Time (12h, seconds)', 'clock.time');
        this.registerNewType('Time (24h, seconds)', 'clock.time.24');
        this.registerNewType('Date', 'clock.date');
        // This is all you need to do. Freedeck will do all of the logic for you.
        return true;
    }

}

module.exports = {
	exec: () => new Clock(),
 	class: Clock
}