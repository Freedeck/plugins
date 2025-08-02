const {makePackage, Operations} = require('./src/lib/developerApi');
const path = require('node:path');
const fs = require('node:fs');

const wantedSrcFolder = process.argv[2]
if(!wantedSrcFolder) {
  exitError("No source folder")
}

if(!fs.existsSync(wantedSrcFolder +".src")) {
  exitError("Source ID " + wantedSrcFolder +" not found.")
}

const wantedOpts = [];
for(const str of process.argv) {
  if(str.startsWith("--o:")) {
    const wantedOpt = str.split("--o:")[1];
    if(wantedOpt in Operations) {
      wantedOpts.push(Operations[wantedOpt])
    } else {
      exitError("Operation " + wantedOpt +" not recognized. Applicable types are: " + Object.keys(Operations))
    }
  }
}

makePackage({
  id: wantedSrcFolder,
  src: path.resolve(`${wantedSrcFolder}.src`),
  out: path.resolve("./plugins"),
  extra: wantedOpts
});

function exitError(str) {
  console.error(str);
  console.log(`Usage: node build.js <sourceID> [--o:INSTALL_DEPS_PRE_PACKAGE]`);
  process.exit(1);
}
