const {makePackage, Operations} = require('./src/lib/developerApi');
const path = require('path');
const allBuiltPlugins = [];

console.log("this script is in development");

/**
 * node build.js <file> [--o:INSTALL_DEPS_PRE_PACKAGE]
 */



function emptyBuild(packageId) {build(packageId,[])}

function build(packageId, extra=[Operations.INSTALL_DEPS_PRE_PACKAGE]) {
  allBuiltPlugins.push(packageId);
  makePackage({
    id: packageId,
    src: path.resolve(`${packageId}.src`),
    out: path.resolve("./plugins"),
    extra: extra
  });
}