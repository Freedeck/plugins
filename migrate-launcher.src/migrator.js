const { existsSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } = require("fs");
const { app } = require("@src/http.js");
const net = require("net");
const path = require("path");
const { Plugin, events, HookRef, intents } = require("@freedeck/api");

const pipePath = '\\\\.\\pipe\\fd_app_handoff';
let isConnected = false;

setInterval(() => {
  try {
    if (!isConnected) {
      const client = net.createConnection({ path: pipePath }, () => {
        isConnected = true;
      });
      client.on('error', () => { isConnected = false; });
      client.on('close', () => { isConnected = false; });
    }
  } catch (ignored) { }
}, 1000);

app.get("/fdml-page", (req, res) => {
  res.sendFile(path.resolve("./user-data/hooks/fdml/page.html"));
});

class AppMigrator extends Plugin {
  setup() {
    this.requestIntent(intents.IO);
    this.requestIntent(intents.SOCKET);
    this.setPopout(
      `<a onclick='window.open("/fdml-page", "App Migrator", "width=800,height=800"); return false;'>Open Migrator</a>`
    );

    this.add(HookRef.types.import, "fdml/page.html");

    this.on(events.connection, ({ socket }) => {
      socket.on('migrate-fdml', () => {
        if (isConnected) {
          socket.emit('migration-error', { message: 'Close the Freedeck launcher first!' });
          this.pushNotification('Close the Freedeck launcher first!');
          return;
        }

        const appDataPath = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
        const oldPath = path.resolve(appDataPath, 'FreedeckApp', 'freedeck');

        if (!existsSync(oldPath)) {
          socket.emit('migration-error', { message: 'No Freedeck App installation found.' });
          this.pushNotification('No Freedeck App installation found.');
          return;
        }

        if (existsSync(path.resolve(oldPath, "freedeck.migrated"))) {
          socket.emit('migration-error', { message: 'Already migrated!' });
          this.pushNotification('Already migrated!');
          return;
        }

        socket.emit('migration-start');

        try {
          const copyWithProgress = (src, dest, sectionName) => {
            if (!existsSync(src)) return;
            socket.emit('migration-status', { text: `Copying ${sectionName}...` });

            const recursiveCopy = (currentSrc, currentDest) => {
              if (!existsSync(currentDest)) {
                mkdirSync(currentDest, { recursive: true });
              }
              const entries = readdirSync(currentSrc, { withFileTypes: true });
              for (const entry of entries) {
                const srcItem = path.join(currentSrc, entry.name);
                const destItem = path.join(currentDest, entry.name);
                const relativePath = path.relative(oldPath, srcItem);

                if (entry.isDirectory()) {
                  recursiveCopy(srcItem, destItem);
                } else {
                  socket.emit('migration-file', { file: relativePath, section: sectionName });
                  copyFileSync(srcItem, destItem);
                }
              }
            };
            recursiveCopy(src, path.resolve(dest));
          };

          const baseMainCfg = 'src/configs';
          const baseMainCfgNew = 'user-data/config';
          const basePluginPath = 'plugins';
          const baseUD = 'user-data';

          if (!existsSync(path.resolve(oldPath, baseMainCfgNew))) {
            copyWithProgress(path.resolve(oldPath, baseMainCfg), baseMainCfg, 'Base Config');
          } else {
            copyWithProgress(path.resolve(oldPath, baseMainCfgNew), baseMainCfgNew, 'Config Data');
          }

          copyWithProgress(path.resolve(oldPath, baseUD), baseUD, 'User Data');
          copyWithProgress(path.resolve(oldPath, basePluginPath), basePluginPath, 'Plugins');

          writeFileSync(path.resolve(oldPath, "freedeck.migrated"), "1");
          socket.emit('migration-done', { message: 'Migration complete! Restart Freedeck to apply changes.' });
          this.pushNotification("Done! Restart Freedeck to load everything in.");

        } catch (err) {
          console.error(err);
          socket.emit('migration-error', { message: 'Migration failed: ' + err.message });
        }
      });
    });

    return true;
  }
}

module.exports = {
  exec: () => new AppMigrator(),
  class: AppMigrator,
};