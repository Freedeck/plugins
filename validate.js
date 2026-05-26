const path = require('node:path');
const fs = require('node:fs');
const { validate } = require("./src/lib/manifestVerification");
require('module-alias/register');

const wantedSrcFolder = process.argv[2]
if(!wantedSrcFolder) {
  exitError("No source folder")
}

if(!fs.existsSync(wantedSrcFolder +".src")) {
  exitError("Source ID " + wantedSrcFolder +" not found.")
}

const packagepackage = require(path.resolve(wantedSrcFolder+".src", "package.json"));

for (const str of validate(packagepackage)) {
  switch (str) {
    case "valid_package":
      console.log(packagepackage.freedeck.title + " has a valid package.");
      break;
    case "no_freedeck_manifest":
      console.log("The package does not contain a 'freedeck' field.");
      break;
    case "invalid_id_not_lower":
      console.log("The ID (package.json -> name) must be all lowercase.");
      break;
    case "no_package_title":
      console.log(
        "The plugin does not have a given name (package.json -> freedeck['title']).",
      );
      break;
    case "no_package_type":
      console.log(
        "The plugin does not have a given type (package.json -> freedeck['package']).",
      );
      break;
    case "invalid_package_type":
      console.log(
        "The plugin does not have a valid type (package -> freedeck['package'] is not of valid types ['plugin', 'theme']).",
      );
      break;
    case "disabled_not_boolean":
      console.log(
        "The plugin has a disabled status that is not a boolean (package -> freedeck['disabled'] is not of valid types [true, false]).",
      );
      break;
  }
}

function exitError(str) {
  console.error(str);
  console.log(`Usage: node build.js <sourceID> [--o:INSTALL_DEPS_PRE_PACKAGE]`);
  process.exit(1);
}
