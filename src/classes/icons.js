/**
 * Generic Icon class. Applies to literally anything. No rules.  
 * Uses the builder pattern.
 */
class IconBuilder {
  img;
  identifier;
  isStatic = true;
  types = [];
  
  /**
   * Create a generic Icon, with only an image.
   * @param {String} img Relative path to the image file.
   */
  constructor(identifier, img) {
    this.img = img;
    this.identifier = identifier;
    console.log(`IconBuilder >> Added new image ${img} (${identifier})`)
  }

  /**
   * Register your Icon (move the image to a web-public directory & add to registry)
   * @param {String} package_identifier The name of your `.fdpackage`, to be identified
   */
  register(package_identifier) {
    console.log(`IconBuilder >> Registering ${this.identifier} and using ${package_identifier} to locate it.`)
    return this;
  }

  /**
   * Apply this icon to any type.
   * @param {String} type The Freedeck Tile type that this icon will apply to.
   */
  applyTo(type) {
    console.log(`IconBuilder >> Applying static type ${type} to ${this.identifier}`)
    this.types.push(type);
    return this;
  }
}

module.exports = {IconBuilder};