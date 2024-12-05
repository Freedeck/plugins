const path = require("path");
const Plugin = require(path.resolve('./src/classes/Plugin'));
const em = require("easymidi");

const midiOut = new em.Output("Freedeck EasyMidi Plugin", true);

class EasyMidi extends Plugin {
    constructor() {
        super('EasyMidi', 'Freedeck', 'EasyMidi', false);
    }

    onInitialize () {
        console.log("initializing EasyMidi")
        for(let i = 0; i < 128; i++) {
            this.registerNewType(`Note: ${i}`, "note-" + i);
        }
        
        return true;
    }

    onInteraction(dat) {
        const note = parseInt(dat.type.split("-")[1]);
        console.log("sending note", note);
        midiOut.send("noteon", {
            note: note,
            velocity: 127,
            channel: 0
        });
    }
}

module.exports = {
	exec: () => new EasyMidi(),
 	class: EasyMidi
}