const { Plugin, HookRef } = require("@freedeck/api");

class ShowTilePreviews extends Plugin {
    setup() {
        this.add(HookRef.types.server, "fd-stp/inject.js");
        this.add(HookRef.types.client, "fd-stp/inject.js");
        this.add(HookRef.types.import, "fd-stp/stp.css");
    }
}

module.exports = {
    exec: () => new ShowTilePreviews(),
    class: ShowTilePreviews
};