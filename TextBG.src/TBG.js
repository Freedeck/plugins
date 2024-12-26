const {Plugin, HookRef, events, intents} = require("@freedeck/api");

class TBG extends Plugin {
    wantedText = "Loading...";
    setup() {
        this.hidePopout();

        this.add(HookRef.types.server, "tbg/main-hook.js");
        this.add(HookRef.types.client, "tbg/main-hook.js");
        this.add(HookRef.types.import, "tbg/_tbg.css");

        this.requestIntent(intents.SOCKET);

        let msg = this.getFromSaveData('message');
        if(msg != undefined && msg != '')
            this.wantedText = msg;
        else
            this.setToSaveData("message", "Your message here!");
    
        this.on(events.connection, ({socket}) => {
            socket.on("Request text", () => {
                // Compatibility layer for v1
                socket.emit("textbg-display", this.wantedText);
            });

            socket.on("textbg-request", () => {
                socket.emit("textbg-display", this.wantedText);
            });
        });
    }
}

module.exports = {
	exec: () => new TBG(),
 	class: TBG
}