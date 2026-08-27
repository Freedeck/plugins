const {Plugin, HookRef} = require("@freedeck/api");

class Clock extends Plugin {
    setup() {
        this.add(HookRef.types.server, "clock/client.js");
        this.add(HookRef.types.client, "clock/client.js");

        const add = {
            "Time (12h, seconds)": "clock.time",
            "Time (24h, seconds)": "clock.time.24",
            "Date": "clock.date",
        }

        for(const k in add) {
            this.register({
                display: k,
                type: add[k]
            })
        }

        return true;
    }

}

module.exports = {
	exec: () => new Clock(),
 	class: Clock
}