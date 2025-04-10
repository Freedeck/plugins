const dataPacket = {};

function set(k, v) {
  dataPacket[k] = v;
}

function get(k, d=null) {
  return dataPacket[k] || d;
}

function remove(k) {
  if(dataPacket[k]) delete dataPacket[k];
}

module.exports = {
  dataPacket,
  set,
  get,
  remove
}