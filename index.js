const {makePackage, Operations} = require('./src/lib/developerApi');
const path = require('node:path');
const fs = require('node:fs');
require('module-alias/register');

let mainRepository = {};
let devRepo = {};

console.log("INFO / STAGE 1 >> Building / validating all plugins");

build("testpluginv2", [], true);
build("Clock", []);
build("MyExampleTheme", [], true);
build("DevUtils", [], true);
build("HAFreedeck", []);
build("YTMD", []);
build("Twitch", []);
build("Kick", []);
build("TextBG", []);
build("DemoShowcase", []);
build("dynamic-icons", [],true);
build("Spotify", []);
build("fdinternals",[], true);
build("ExamplePlugin", [], true);
build("WaveLink",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("myinstants",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("EasyMidi",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("OBSControl", [Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("StreamChatMonitor", [Operations.INSTALL_DEPS_PRE_PACKAGE]);

function build(packageId, extra=[Operations.INSTALL_DEPS_PRE_PACKAGE], development = false) {
  makePackage({
    id: packageId,
    src: path.resolve(`${packageId}.src`),
    out: path.resolve("./plugins"),
    extra: extra
  });

  const folderPath = path.resolve(__dirname, packageId +".src");
  if(!fs.existsSync(folderPath)){
    console.error(`ERROR >> Source directory ${folderPath} does not exist.`);
    process.exit(1);
  }

  const {freedeck, name, author, description, version} = require(path.resolve(folderPath, "package.json"));

  const usedRepo = development ? devRepo : mainRepository;

  usedRepo[name] = {
    message: freedeck.message,
    source: `github:freedeck/${name}`,
    author,
    title: freedeck.title,
    description,
    version,
    download: `https://freedeck.github.io/plugins/plugins/${name}.fdpackage`
  }
}

console.log("INFO / STAGE 2 >> Sorting Main Repository");

const favoritedPackages = [
  "spotify",
  "obscontrol",
  "wavelink",
  "myinstants",
  "clock",
  "ytmd",
  "textbg"
]

const sortedMainRepository = {};
favoritedPackages.forEach(packageId => {
  if(mainRepository[packageId]){
    sortedMainRepository[packageId] = mainRepository[packageId];
    delete mainRepository[packageId];
  }
});

Object.assign(sortedMainRepository, mainRepository);
mainRepository = sortedMainRepository;

fs.writeFileSync(path.resolve(__dirname, "repository.json"), JSON.stringify(mainRepository, null, 2));
fs.writeFileSync(path.resolve(__dirname, "development.json"), JSON.stringify(devRepo, null, 2));

console.log("DONE. Built repository index and packages.")