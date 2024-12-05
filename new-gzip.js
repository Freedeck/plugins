const {makePackage, Operations} = require('./src/lib/developerApi');
const path = require('path');

// build("Spotilocal", [
//   Operations.MANIFEST_PRE_PACKAGE,
//   Operations.INSTALL_DEPS_PRE_PACKAGE,
//   Operations.RUN_POST_PACKAGE,
//   Operations.INSTALL_DEPS_POST_PACKAGE
// ])

build("testpluginv2", [])

build("MyExampleTheme", [
]);

build("WaveLink",[])

// build("OBSControl", [
//   Operations.MANIFEST_PRE_PACKAGE,
//   Operations.INSTALL_DEPS_PRE_PACKAGE,
//   Operations.RUN_POST_PACKAGE,
//   Operations.INSTALL_DEPS_POST_PACKAGE
// ])

function build(packageId, extra=[Operations.INSTALL_DEPS_PRE_PACKAGE]) {
  makePackage({
    id: packageId,
    src: path.resolve(`${packageId}.src`),
    out: path.resolve("./plugins"),
    extra: extra
  });
}

