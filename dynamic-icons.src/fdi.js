const {Plugin, events, intents} = require("@freedeck/api");
const sEvents = require("@handlers/eventNames");

let assumed = false;
class FDInternals extends Plugin {
    setup() {
        this.requestIntent(intents.IO);
        this.on(events.button, this.btn);

        this.register({
			display: "Static",
			type: "dyi.stat"
		});
		
        this.register({
			display: "Server-given",
			type: "dyi.server"
		});

        return true;
    }

    btn({interaction, io}) {
        if(interaction.type === 'dyi.server') {
            io.emit(sEvents.companion.set_tile_icon, "dyi.server", assumed ? "templateServer.png" : "templateStatic.png")
            assumed = !assumed;
        }
    }
}

module.exports = {
	exec: () => new FDInternals(),
 	class: FDInternals
}