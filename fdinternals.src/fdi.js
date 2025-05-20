const {Plugin, HookRef} = require("@freedeck/api");

class FDInternals extends Plugin {
    setup() {
        this.register({
            display: 'Stop All',
            type: 'fd.stopall'
        })

        this.register({
            display: 'None',
            type: 'fd.none'
        })

        return true;
    }

}

module.exports = {
	exec: () => new FDInternals(),
 	class: FDInternals
}