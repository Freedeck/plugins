const {makePackage, Operations} = require('./src/lib/developerApi');
const path = require('path');
const allBuiltPlugins = [];

console.log("INFO / STAGE 1 >> Building all plugins");

emptyBuild("testpluginv2");
emptyBuild("Clock");
emptyBuild("MyExampleTheme");
emptyBuild("DevUtils");
emptyBuild("HAFreedeck");
emptyBuild("YTMD");
emptyBuild("Twitch");
emptyBuild("TextBG");
emptyBuild("Spotify");
build("WaveLink",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("myinstants",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("EasyMidi",[Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("OBSControl", [Operations.INSTALL_DEPS_PRE_PACKAGE]);
build("StreamChatMonitor", [Operations.INSTALL_DEPS_PRE_PACKAGE]);

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



let repository = {};
const fs = require('fs');

console.log("INFO / STAGE 2 >> Generating repository.json");

for(const folder in allBuiltPlugins){
  const folderPath = path.resolve(__dirname, allBuiltPlugins[folder] +".src");
  if(fs.existsSync(folderPath)){
    console.log(`INFO >> Found plugin ${allBuiltPlugins[folder]}`);
  }
  else{
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
console.log(repository)

fs.writeFileSync(path.resolve(__dirname, "repository.json"), JSON.stringify(repository, null, 2));

