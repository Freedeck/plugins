const {makePackage, Operations} = require('./src/lib/developerApi');
const path = require('path');
build("testpluginv2", [Operations.CLEAR_PLUGINS_PRE_PACKAGE])

emptyBuild("Clock");
emptyBuild("MyExampleTheme");
emptyBuild("WaveLink");
emptyBuild("DevUtils");
emptyBuild("HAFreedeck");
emptyBuild("Twitch");
emptyBuild("TextBG");
build("myinstants",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("EasyMidi",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("OBSControl", [Operations.INSTALL_DEPS_PRE_PACKAGE])

function emptyBuild(packageId) {build(packageId,[])}

function build(packageId, extra=[Operations.INSTALL_DEPS_PRE_PACKAGE]) {
  makePackage({
    id: packageId,
    src: path.resolve(`${packageId}.src`),
    out: path.resolve("./plugins"),
    extra: extra
  });
}

