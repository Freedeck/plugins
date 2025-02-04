const path = require("node:path");
const fs = require("node:fs");
class Plugin {
  v2 = true;
  name;
  author;
  imports = [];
  Settings = {};
  hooks = [];
  views = {};
  id;
  disabled = false;
  stopped = false;
  hasInit = false;
  popout = "<p>No popout code set. Edit this in your PluginV2 definition!</p>";
  _hookLocation = "user-data/hooks/";
  _usesAsar = true;
  constructor() {
    console.log(`[DEV ENV] Plugin constructor called.!`);
    this.name = "Loading...";
    this.author = "Loading...";
    this.id = `predropin-${Math.random().toString(36).substring(7)}`;
    this.disabled = false;
    this.types = [];
    this._callbacks = {};
    this._intent = [];
  }

  setPopout(popout) {
    this.popout = popout;
    console.log("Setting popout");
  }
  hidePopout() {
    this.popout = "";
    console.log("Hiding popout");
  }
  setName(name) {
    this.name = name;
    console.log("Setting name");
  }
  setAuthor(author) {
    this.author = author;
    console.log("Setting author");
  }
  setID(id) {
    this.id = id;
    console.log("Setting ID");
  }
  setDisabled(disabled) {
    this.disabled = disabled;
    console.log("Setting disabled");
  }
  
  _fd_dropin() {
    console.log("Drop-in hit.");
    if (this.disabled) return;
    this.hasInit = this.onInitialize();
    if (!this.hasInit) {
      console.log("Plugin didn't initialize?");
    }
    
    console.log("Setup")
    this.setup();
    console.log("Sending ready")
    this.emit(events.ready);
    console.log("Done")
  }
  onInitialize() {
    return true;
  }
  onButton(e) {
    this.emit(events.button, e);
  }
  onStopping() {
    this.emit(events.stopping);
  }

  setup() {};
  exec() {};
  _callbacks = {};
  _intent = [];
  requestIntent(intent) {
    if(!Object.values(intents).includes(intent)) return;
    if(this._intent.includes(intent)) return;
    this._intent.push(intent);
    console.log("Requesting intent", Object.keys(intents)[Object.values(intents).indexOf(intent)]);
  }

  io = {
    active: false,
  }

  on(ev, cb) {
    if(!this._callbacks[ev]) this._callbacks[ev] = [];
    this._callbacks[ev].push(cb);
    console.log("Added callback for", Object.keys(events)[Object.values(events).indexOf(ev)]);
  }

  emit(ev, ...args) {
    if(!this._callbacks[ev]) return;
    for(const cb of this._callbacks[ev]) {
      cb(...args);
    }
    console.log("Emitted", Object.keys(events)[Object.values(events).indexOf(ev)]);
  }
  
  /**
   * Add a hook with the new HookRef system.
   * @param {HookRef} type 
   * @param {PathLike} file 
   */
  add(type, file) {
    console.log("Added", Object.keys(HookRef.types)[type], "hook at", file);
  }
  /**
   * @param {String} hook The JS file that will be loaded into the socket handler
   */
  setJSSocketHook(hook) {
    this.internalAdd(HookRef.types.socket, hook, `${this._hookLocation}_`);
  }

  /**
   * @param {String} hook The JS file that will be loaded into the browser
   */
  setJSServerHook(hook) {
    this.internalAdd(HookRef.types.server, hook, this._hookLocation);
  }

  /**
   * @param {String} hook The JS file that will be loaded into the browser
   */
   setJSClientHook(hook) {
    this.internalAdd(HookRef.types.client, hook, this._hookLocation);
  }

  addView(view, file) {
    console.log("Added view", view, "hook at", file);
  }

  /**
   Internal method for adding hookrefs
   @param {*} type the HookRef type
   @param {*} hook File path to hook
   @param {*} copyTo folder to copy hook to
   */
  internalAdd(type, hook, copyTo) {
    let foundPath = `tmp/_${this.id}.fdpackage`;
    if(this._usesAsar) foundPath = `tmp/_e_._plugins_${this.id}.Freedeck`;
    const hp = path.resolve(foundPath, hook);

    if (!fs.existsSync(hp)) {
      console.log(`Source file does not exist: ${hp}`);
      return;
    }

    this.hooks.push(new HookRef(hp, type, hook));

    const destination = path.resolve(copyTo, path.dirname(hook));

    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    const dt = {force:true};
    if(type === HookRef.types.view) {
      dt.recursive = true; 
    }

    console.log(`Copying ${hp} to ${path.resolve(destination, path.basename(hook))}`);

  }

  /**
   * @param {String} file The file you want to import
   */
  addImport(file) {
    this.imports.push(file);
    this.tempImportPath = path.resolve(
      `tmp/_${this.id}.fdpackage`,
      file,
    );
    fs.cpSync(this.tempImportPath, path.resolve(`user-data/hooks/${file}`));
  }

  /**
   * @return {String} The JS file that will be loaded into the browser
   */
  getJSServerHook() {
    return this.hooks.filter((ref) => ref.type === HookRef.types.server);
  }

  /**
   * @return {String} The JS file that will be loaded into the browser
   */
  getJSClientHook() {
    return this.hooks.filter((ref) => ref.type === HookRef.types.client);
  }

  /**
   * Create save data folders/file structure for the plugin.
   */
  createSaveData() {
    if (!fs.existsSync(path.resolve("./plugins"))) {
      fs.mkdirSync(path.resolve("./plugins"));
      console.log("Failsafe created plugins folder!");
    }
    if (!fs.existsSync(path.resolve(`./plugins/${this.id}`))) {
      fs.mkdirSync(path.resolve(`./plugins/${this.id}`));
      console.log(`Created ${this.id} data folder!`);
    }
    if (!fs.existsSync(path.resolve(`./plugins/${this.id}/settings.json`))) {
      fs.writeFileSync(
        path.resolve(`./plugins/${this.id}/settings.json`),
        JSON.stringify({}),
      );
    }
  }

  /**
   * Get from the save data.
   * @param {String} k The key to get from the save data
   * @return {*} The value from the save data
   */
  getFromSaveData(k) {
    this.createSaveData();
    const data = JSON.parse(
      fs.readFileSync(path.resolve(`./plugins/${this.id}/settings.json`)),
    );
    this.Settings[k] = data[k];
    return data[k];
  }

  /**
   * Add to the save data.
   * @param {String} k The key to set in the save data
   * @param {*} v The data to set in the save data
   */
  setToSaveData(k, v) {
    this.createSaveData();
    const data = JSON.parse(
      fs.readFileSync(path.resolve(`./plugins/${this.id}/settings.json`)),
    );
    data[k] = v;
    this.Settings[k] = v;
    fs.writeFileSync(
      path.resolve(`./plugins/${this.id}/settings.json`),
      JSON.stringify(data),
    );
  }

  /**
   * Add a notification to the queue.
   * @param {String} value The notification's content
   * @param {Object} options Extra options for the notification
   */
  pushNotification(value, options = null) {
    if (!options) console.log(`[Notification: ${this.name}] ${value}`);
    if (options != null && Object.keys(options).length > 0) {
      if (options.image) {
        console.log(`[Notification: ${this.name}] ${options.image} ${value}`);
      }
    }
  }

  /**
   * Register a new type for Companion
   * @param {String} name The name of the button type
   * @param {String} type The identifier for the button type
   * @param {Object} templateData The data for the button type
   * @param {String} renderType The type of button to render
   */
  registerNewType(name, type, templateData = {}, renderType = "button") {
    this.types.push({
      name,
      type,
      renderType,
      templateData,
      pluginId: this.id,
      display: this.name,
    });
    return true;
  }

  register(opt={display:"abc",type:"abc",templateData:{},renderType:types.button}) {
    if (!opt.display || !opt.type) return false;
    return this.registerNewType(opt.display, opt.type, opt.templateData, opt.renderType);
  }

  /**
   * Remove a type from Companion
   * @param {String} type The identifier for the button type
   * @return {Boolean} If the type was removed successfully
   */
  deregisterType(type) {
    this.types = this.types.filter((t) => t.type !== type);
    return true;
  }

  /**
   * End the plugin.
   */
  stop() {
    this.onStopping();
    this.disabled = true;
    this.stopped = true;
  }

  /**
   * Check if the plugin is running in the development environment.
   * @return {Boolean} If the development environment is active
   */
  isDev() {
    return false;
  }
};

class HookRef {
	file;
	type;
	static types = {
		client: 0,
		server: 1,
		socket: 2,
		import: 3,
		view: 4,
	};
	name;

	/**
	 * Create a new hook file reference
	 * @param {*} file The file path of the hook
	 * @param {HookRef.types} type The path (specified HookRef.types)
	 * @param {*} name The name (usually file) of the hook
	 */
	constructor(file, type, name) {
		this.file = file;
		this.type = type;
		this.name = name;
	}
};


const types = {
  button: "button",
  slider: "slider",
  text: "text"
}

const events = {
  connection: 0xa9,
  button: 0xb0,
  ready: 0xb1,
  stopping: 0xb2,
  stopped: 0xb3
}

const intents = {
  SOCKET: 0xc0,
  IO: 0xc1,
  CLIENTS: 0xc2,
  hooks: {
    CLIENT: 0xd2,
    SERVER: 0xd3,
    SOCKET: 0xd4,
    IMPORT: 0xd5,
    VIEW: 0xd6
  }
}

module.exports = {
  Plugin,
  HookRef,
  events,
  intents,
  types
}