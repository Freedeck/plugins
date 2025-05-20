const {Plugin, HookRef, events, intents} = require("@freedeck/api");

class TBG extends Plugin {
    wantedText = "";
    setup() {
        this.hidePopout();

        this.add(HookRef.types.server, "tbg/main-hook.js");
        this.add(HookRef.types.client, "tbg/main-hook.js");
        this.add(HookRef.types.import, "tbg/_tbg.css");

        this.requestIntent(intents.SOCKET);
        this.requestIntent(intents.IO);

        this.on(events.connection, ({socket, io}) => {
            socket.on("textbg-display", (txt) => {
                if(txt != null) this.wantedText = txt;
                io.emit("textbg-display", this.wantedText);
            });
            socket.on("textbg-command", (cmd) => {
                io.emit("textbg-command", cmd);
            })
        });
    }
}

module.exports = {
	exec: () => new TBG(),
 	class: TBG
}