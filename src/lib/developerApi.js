const path = require("node:path");
const tar = require("tar");
const fs = require("fs");
const { execSync } = require("node:child_process");
const Operations = require("../../Operations");
const { validate } = require("./manifestVerification");

function gzipDirectory(folderPath, outputPath) {
  return new Promise((resolve, reject) => {
    tar
      .c(
        {
          gzip: true,
          file: outputPath,
          cwd: folderPath,
        },
        ["."]
      )
      .then(() => resolve())
      .catch(reject);
  });
}

let _lastOpts = {};

function debugLog(...args) {
  if (_lastOpts.debugOutput) console.log(...args);
}

function makePackage(opt = {}) {
  _lastOpts = opt;
  opt.extra = [...opt.extra, Operations.MANIFEST_PRE_PACKAGE]
  if (!fs.existsSync(opt.out)) {
    fs.mkdirSync(opt.out);
    debugLog(`${opt.id} INFO >> Created output directory ${opt.out}`);
  }

  if (!fs.existsSync(opt.src)) {
    console.error(`${opt.id} ERROR >> Source directory ${opt.src} does not exist.`);
    process.exit(1);
  }

  if(opt.extra.includes(Operations.CLEAR_PLUGINS_PRE_PACKAGE)) {
    fs.readdirSync(opt.out).forEach((file) => {
      fs.unlinkSync(path.resolve(opt.out, file));
    });
  }

  if(!fs.existsSync(path.resolve(opt.src, "package.json"))) {
    console.error(`${opt.id} ERROR >> Source directory ${opt.src} does not contain a package.json file.`);
    process.exit(1);
  }
  const packagepackage = require(path.resolve(opt.src, "package.json"));

  if(opt.extra.includes(Operations.MANIFEST_PRE_PACKAGE)) {
    for(const str of validate(packagepackage)) {
      switch(str) {
        case 'valid_package':
          console.log(packagepackage.freedeck.title + " has a valid package.");
          break;
        case 'no_freedeck_manifest':
          console.log("The package does not contain a 'freedeck' field.");
          break;
        case 'invalid_id_not_lower':
          console.log("The ID (package.json -> name) must be all lowercase.");
          break;
        case 'no_package_title':
          console.log("The plugin does not have a given name (package.json -> freedeck['title']).");
          break;
        case 'no_package_type':
          console.log("The plugin does not have a given name (package.json -> freedeck['package']).");
          break;
        case 'invalid_package_type':
          console.log("The plugin does not have a valid type (package -> freedeck['package'] is not of valid types ['plugin', 'theme']).");
          break;
        case 'disabled_not_boolean':
          console.log("The plugin has a disabled status that is not a boolean (package -> freedeck['disabled'] is not of valid types [true, false]).");
          break;
      }
    }
  }

  const {freedeck} = packagepackage;

  if (opt.extra.includes(Operations.INSTALL_DEPS_PRE_PACKAGE)) {
    execSync("npm i", {
      cwd: opt.src,
    });
    console.log(`${freedeck.title} INFO >> Installed dependencies for package for bundling`);
  }
  const folderPath = opt.src;
  const outFile = path.resolve(`./${opt.id}.fdpackage`);

  if (!fs.existsSync(opt.out)) fs.mkdirSync(opt.out);
  gzipDirectory(folderPath, outFile)
    .then(() => {
      console.log(freedeck.title +" INFO >> Created package at", outFile);
      fs.renameSync(outFile, path.resolve(opt.out, `${opt.id.toLowerCase()}.fdpackage`));

      if (opt.extra.includes(Operations.INSTALL_DEPS_POST_PACKAGE)) {
        execSync("npm i", {
          cwd: opt.src,
        });
        console.log(freedeck.title +" INFO >> Installed dependencies for package for testing");
      }

      if (opt.extra.includes(Operations.RUN_POST_PACKAGE)) {
        runPackage(path.resolve(opt.out, `${opt.id}.fdpackage`));
      }
    })
    .catch(console.error);
}

function runPackage(filename) {
  const file = path.resolve(filename);
  if (!fs.existsSync(file)) {
    console.error(`${filename} ERROR >> Package file ${file} does not exist.`);
    process.exit(1);
  }

  const tempDir = path.resolve("./tmp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  if (!fs.existsSync(path.resolve(tempDir, "_" + path.basename(file)))) {
    fs.mkdirSync(path.resolve(tempDir, "_" + path.basename(file)));
  }

  tar
    .x({
      file: file,
      cwd: path.resolve(tempDir, "_" + path.basename(file)),
      gzip: true,
    })
    .then(() => {
      const epackage = require(path.resolve(tempDir, "_" + path.basename(file), "package.json"));
      const { main, name, version, author, freedeck } = epackage;
      console.log(`${freedeck.title} INFO >> Extracted package to ${tempDir}`);
      if(freedeck.icons) {
        console.log(`${freedeck.title} INFO >> Detected an icon specification. Running.`);
        require(path.resolve(tempDir, "_" + path.basename(file), freedeck.icons))(path.resolve(tempDir, "_" + path.basename(file)));
      }
      if (!main) {
        console.error(`${freedeck.title} ERROR >> No main file specified in package.json.`);
        process.exit(1);
      }
      const package = require(path.resolve(tempDir, "_" + path.basename(file), main));
      package.class._usesAsar = false;

      console.log(`${freedeck.title} INFO >> Executing ${main}`);
      const out = package.exec();
      out.name = freedeck.title;
      out.version = version;
      out.author = author;
      out.id = name;
      out._fd_dropin();
    })
    .catch(console.error);
}

function checkKeys(obj, requiredKeys) {
  const missingKeys = [];

  for (const key of requiredKeys) {
    if (!obj.hasOwnProperty(key)) {
      missingKeys.push(key);
    }
  }

  return missingKeys;
}

module.exports = {
  makePackage,
  Operations,
};
