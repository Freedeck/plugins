const {makePackage, Operations} = require('./src/lib/developerApi');
const path = require('path');
const allBuiltPlugins = [];

console.log("INFO / STAGE 1 >> Building all plugins");

emptyBuild("testpluginv2");
emptyBuild("Clock");
emptyBuild("MyExampleTheme");
emptyBuild("WaveLink");
emptyBuild("DevUtils");
emptyBuild("HAFreedeck");
emptyBuild("YTMD");
emptyBuild("Twitch");
emptyBuild("TextBG");
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



const repository = {};
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
    message: "This plugin could be unstable, as this is the built package straight from GitHub's latest commit.",
    source: `github:freedeck/${name}`,
    author,
    title: freedeck.title,
    description,
    version,
    download: `https://freedeck.github.io/plugins/plugins/${name}.fdpackage`
  }
}

fs.writeFileSync(path.resolve(__dirname, "repository.json"), JSON.stringify(repository, null, 2));

/*{
          "id": {
              "source": "github:username/repo",
              "author": "User",
              "title": "Example Plugin",
              "description": "This is a very good plugin",
              "version": "1.0.0",
              "download": "https://content-dl.freedeck.app"
          },
          "Clock": {
              "source": "github:freedeck/clock",
              "author": "Freedeck",
              "title": "Clock",
              "description": "A simple clock for your Freedeck.",
              "version": "1.2.0",
              "download": "https://content-dl.freedeck.app/hosted/Clock.Freedeck"
          }
    }*/