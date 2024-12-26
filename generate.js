const pluginsForOutput = [
  "Clock",
  "DevUtils",
  "EasyMidi",
  "HAFreedeck",
  "MyExampleTheme",
  "OBSControl",
  "myinstants",
  "Twitch",
  "WaveLink",
  "testpluginv2"
]

const repository = {};
const fs = require('fs');
const path = require('path');
for(const folder in pluginsForOutput){
  const folderPath = path.resolve(__dirname, pluginsForOutput[folder] +".src");
  if(fs.existsSync(folderPath)){
    console.log(`INFO >> Found plugin ${pluginsForOutput[folder]}`);
  }
  else{
    console.error(`ERROR >> Source directory ${folderPath} does not exist.`);
    process.exit(1);
  }

  const {freedeck, name, author, description, version} = require(path.resolve(folderPath, "package.json"));

  repository[name] = {
    source: `github:freedeck/${name}`,
    author,
    title: freedeck.title,
    description,
    version,
    download: `https://content-dl.freedeck.app/hosted/${name}.fdpackage`
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