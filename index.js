const {makePackage, Operations} = require('./src/lib/developerApi');
const path = require('node:path');
const fs = require('node:fs');
require('module-alias/register');

const allBuiltPlugins = [];

console.log("INFO / STAGE 1 >> Building / validating all plugins");

build("testpluginv2", []);
build("Clock", []);
build("MyExampleTheme", []);
build("DevUtils", []);
build("HAFreedeck", []);
build("YTMD", []);
build("Twitch", []);
build("Kick", []);
build("TextBG", []);
build("DemoShowcase", []);
build("Spotify", []);
build("fdinternals",[]);
build("WaveLink",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("myinstants",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("EasyMidi",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("OBSControl", [Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("StreamChatMonitor", [Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("ExamplePlugin", [Operations.RUN_POST_PACKAGE]);

function build(packageId, extra=[Operations.INSTALL_DEPS_PRE_PACKAGE]) {
  allBuiltPlugins.push(packageId);
  makePackage({
    id: packageId,
    src: path.resolve(`${packageId}.src`),
    out: path.resolve("./plugins"),
    extra: extra
  });
}

let repository = {};

console.log("INFO / STAGE 2 >> Generating repository.json");

for(const folder in allBuiltPlugins){
  const folderPath = path.resolve(__dirname, allBuiltPlugins[folder] +".src");
  if(!fs.existsSync(folderPath)){
    console.error(`ERROR >> Source directory ${folderPath} does not exist.`);
    process.exit(1);
  }

  const {freedeck, name, author, description, version} = require(path.resolve(folderPath, "package.json"));

  repository[name] = {
    message: freedeck.message,
    source: `github:freedeck/${name}`,
    author,
    title: freedeck.title,
    description,
    version,
    download: `https://freedeck.github.io/plugins/plugins/${name}.fdpackage`
  }
}

const favoritedPackages = [
  "spotify",
  "obscontrol",
  "wavelink",
  "myinstants",
  "clock",
  "ytmd",
  "textbg"
]
const sortedRepository = {};
favoritedPackages.forEach(packageId => {
  if(repository[packageId]){
    sortedRepository[packageId] = repository[packageId];
    delete repository[packageId];
  }
});

Object.assign(sortedRepository, repository);
repository = sortedRepository;

fs.writeFileSync(path.resolve(__dirname, "repository.json"), JSON.stringify(repository, null, 2));

console.log("DONE. Built repository index and packages.")