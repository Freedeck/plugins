const path = require("node:path");
const tar = require("tar");
const fs = require("fs");
const { execSync } = require("node:child_process");

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

class Operations {
  static CLEAR_PLUGINS_PRE_PACKAGE = -1;
  static MANIFEST_PRE_PACKAGE = 0;
  static INSTALL_DEPS_PRE_PACKAGE = 2;
  static RUN_POST_PACKAGE = 1;
  static INSTALL_DEPS_POST_PACKAGE = 3;
  static THEME_REMOVE_META_POST_PACKAGE = 4;
}

function makePackage(opt = {}) {
  _lastOpts = opt;
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
  const {freedeck} = require(path.resolve(opt.src, "package.json"));

  console.log(`${opt.id} INFO >> Using alias ${freedeck.title} for package ${opt.id}`);

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
      const { main, name, version, author, freedeck } = require(path.resolve(tempDir, "_" + path.basename(file), "package.json"));
      console.log(`${freedeck.title} INFO >> Extracted package to ${tempDir}`);
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
