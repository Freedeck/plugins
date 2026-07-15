const { Plugin, events, intents, SettingBuilder } = require("@freedeck/api");

class FDPSTest extends Plugin {
  setup() {
    this.requestIntent(intents.IO);

    this.useSetting(new SettingBuilder()
                    .setId("test:01")
                  .setName("Test 01")
                .setDefaultValue("Example 01")
              .setDescription("This is my description!"))

    return true;
  }

}

module.exports = {
  exec: () => new FDPSTest(),
  class: FDPSTest,
};