const {Plugin, events, intents} = require("@freedeck/api");
const connectRouter = require("@routers/connect");
const sEvents = require("@handlers/eventNames");
const { compileWebpack } = require("@src/webpack");

class FDInternals extends Plugin {
    setup() {
        this.requestIntent(intents.IO);
        this.on(events.button, this.btn);
        connectRouter.discoveryInformation.fdinternals = true;

        this.register({
			display: "Reload All Connected Sockets",
			type: "fdi.rl"
		});
		
		this.register({
			display: "Recompile Webpack Bundles",
			type: "fdi.rc"
		});

        this.register({
            display: 'Stop All Playing Sounds',
            type: 'fd.stopall'
        })

        this.register({
            display: "Static Slider",
            type: "fdi.es",
            renderType: "slider",
            templateData: {
                min: 0, max: 100, value: 20, direction: "vertical", format: "format"
            }
        })

        this.register({
            display: "Static Text",
            type: "fdi.et",
            renderType: "text"
        })

        this.register({
            display: 'None',
            type: 'fd.none'
        })

        return true;
    }

    btn({interaction, io}) {
        if(interaction.type === 'fdi.rl') {
            io.emit(sEvents.default.reload)
        }
        if(interaction.type === 'fdi.rc') {
            io.emit(sEvents.default.recompile)
            compileWebpack().catch((err) => console.error(err));
        }
    }
}

module.exports = {
	exec: () => new FDInternals(),
 	class: FDInternals
}