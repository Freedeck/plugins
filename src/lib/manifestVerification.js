/**
 * Verify the package.json of a Freedeck PluginV2 or Theme package.
 */

/**
 * Validates the given package.json content.
 * @param {*} object JSON.parsed package.json
 * @returns {['no_freedeck_manifest']}
 */
function validate(object) {
  let status = ['valid_package'];
  if(!object.freedeck) {
    status.push('no_freedeck_manifest');
  }

  if(object.name != object.name.toLowerCase()) {
    status.push('invalid_id_not_lower');
  }

  const fd = object.freedeck;
  if(!("title" in fd)) {
    status.push('no_package_title');
  }

  if(!("package" in fd)) {
    status.push('no_package_type');
  }
  
  const pkg = fd.package;
  if(!(pkg == 'plugin' || pkg == 'theme')) {
    status.push('invalid_package_type');
  }

  if("disabled" in fd) {
    if(!(fd.disabled == true || fd.disabled == false)) {
      status.push("disabled_not_boolean")
    }
  }



  if(status.length > 1) status[0] = 'invalid_package';
  return status
}

module.exports = {validate}