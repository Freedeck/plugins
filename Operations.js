/**
 * Certain customizable steps during the PluginV2 build process.  
 * Any Operation that states it's not available currently can be used, but will have no effect on the plugin.
 */
module.exports = class Operations {
  /**
   * Empty out all previously built plugins in the `./plugins` folder
   */
  static CLEAR_PLUGINS_PRE_PACKAGE = -1;

  /**
   * Not available currently.  
   * Checks and validate your manifest as well as preview it in the CLI before being packaged.
   */
  static MANIFEST_PRE_PACKAGE = 0;

  /**
   * Run `npm install` in the PluginV2 directory BEFORE being packaged (INCLUDE libraries in your plugin bundle)
   */
  static INSTALL_DEPS_PRE_PACKAGE = 2;

  /**
   * Run your plugin as Freedeck would (extracting the .fdpackage, not from source)  
   * This also runs a live simulated version of the Freedeck PluginV2 API, and will log output to the console when certain actions occur.
   */
  static RUN_POST_PACKAGE = 1;

  /**
   * Run `npm install` in the PluginV2 directory AFTER being packaged (EXCLUDE libraries in your plugin bundle)
   */
  static INSTALL_DEPS_POST_PACKAGE = 3;

  /**
   * Not available currently.
   * Feature in progress.
   */
  static THEME_REMOVE_META_POST_PACKAGE = 4;
}