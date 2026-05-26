const { makePackage, Operations } = require("./src/lib/developerApi");
const path = require("node:path");
const fs = require("node:fs");
require("module-alias/register");
console.log("INFO / STAGE 1 >> Building / validating all plugins");
const defaultRepositoryName = "main";
const repositories = {[defaultRepositoryName]:{}}
const favorites = {};

/** Developer Repository */
newPackage("fdinternals").isFavorite().setRepository("dev").build();
newPackage("testpluginv2").setRepository("dev").build();
newPackage("MyExampleTheme").setRepository("dev").build();
newPackage("dynamic-icons").setRepository("dev").build();
newPackage("ExamplePlugin").setRepository("dev").build();
newPackage("DemoShowcase").setRepository("dev").build();

/** Main Repository */
newPackage("Spotify").isFavorite().build();
newPackage("OBSControl").isFavorite().addExtra(Operations.INSTALL_DEPS_PRE_PACKAGE).build();
newPackage("WaveLink").isFavorite().addExtra(Operations.INSTALL_DEPS_PRE_PACKAGE).build();
newPackage("myinstants").isFavorite().addExtra(Operations.INSTALL_DEPS_PRE_PACKAGE).build();
newPackage("Clock").isFavorite().build();
newPackage("YTMD").isFavorite().build();
newPackage("TextBG").isFavorite().build();
newPackage("HAFreedeck").build();
newPackage("Twitch").build();
newPackage("Kick").build();
newPackage("EasyMidi").addExtra(Operations.INSTALL_DEPS_PRE_PACKAGE).build();
newPackage("StreamChatMonitor").addExtra(Operations.INSTALL_DEPS_PRE_PACKAGE).build();

console.log("INFO / STAGE 2 >> Setting up favorites...");

Object.keys(repositories).forEach((repo) => {
  console.log("INFO / STAGE 2 >> Working on " + repo + " favorites..")

  favorites[repo].forEach((packageId) => {
    if (repositories[repo][packageId]) {
      if(!repositories[repo+'sorted']) repositories[repo+'sorted'] = {};
      repositories[repo+'sorted'][packageId] = repositories[repo][packageId];
      delete repositories[repo][packageId];
    }
  });


  Object.assign(repositories[repo+'sorted'], repositories[repo]);
  repositories[repo] = repositories[repo+'sorted'];

  fs.writeFileSync(
    path.resolve(__dirname, repo+".repo.json"),
    JSON.stringify(repositories[repo], null, 2),
  );
})

console.log("DONE. Built repository index and packages.");

function newPackage(source) {
  const pkg = {
    source,
    extras: [],
    repository: defaultRepositoryName,
    favorite: false,
    setSource: (t) => {
      pkg.source = t;
      return pkg;
    },
    addExtra: (t) => {
      pkg.extras.push(t);
      return pkg;
    },
    setRepository: (f) => {
      pkg.repository = f;
      if(!repositories[pkg.repository]) repositories[pkg.repository] = {};
      return pkg;
    },
    isFavorite: () => {
      pkg.favorite = true;
      return pkg;
    },
    build: () => {
      if(pkg.favorite) {
        if(!favorites[pkg.repository]) favorites[pkg.repository] = [];
        favorites[pkg.repository].push(pkg.source);
      }
      build(pkg.source, pkg.extras, pkg.repository);
    },
  };
  return pkg;
}

function build(packageId, extra = [], repository = defaultRepositoryName) {
  makePackage({
    id: packageId,
    src: path.resolve(`${packageId}.src`),
    out: path.resolve("./plugins"),
    extra: extra,
  });

  const folderPath = path.resolve(__dirname, packageId + ".src");
  if (!fs.existsSync(folderPath)) {
    console.error(`ERROR >> Source directory ${folderPath} does not exist.`);
    process.exit(1);
  }

  const { freedeck, name, author, description, version } = require(
    path.resolve(folderPath, "package.json"),
  );

  const usedRepo = repositories[repository];
  usedRepo[name] = {
    message: freedeck.message,
    source: `github:freedeck/${name}`,
    author,
    title: freedeck.title,
    description,
    version,
    download: `https://freedeck.github.io/plugins/plugins/${name}.fdpackage`,
  };
}