import { setTileData } from "/companion/scripts/editor/data.js";

const listScenes = document.querySelector(".scene-list");
const listSources = document.querySelector(".source-list");
const listInputs = document.querySelector(".audio-list");


const editorBtn = document.querySelector("#editor-btn");

const typeShow = document.querySelector("#type");

if(universal.plugins.obscontrol.types.length > 1) {
  document.querySelector("#obsws-auth").style.display = "none";
  document.querySelector("#obsws-dash").style.display = "block";

  for(const type of universal.plugins.obscontrol.types) {
    if(type.type.startsWith("obs.ss")) {
      const sceneName = type.type.split(".")[2];
      const scene = document.createElement("button");
      scene.innerText = `Switch to ${sceneName}`;
      scene.onclick = () => {
        _setTo(type.type);
      }
      listScenes.appendChild(scene);
    }
    if(type.type.startsWith("obs.v")) {
      const sceneName = type.templateData.name;
      const scene = document.createElement("button");
      scene.innerText = `Volume of ${sceneName}`;
      scene.onclick = () => {
        _setTo(type.type, type.templateData, type.renderType);
      }
      listInputs.appendChild(scene);
    }
    if(type.type.startsWith("obs.m")) {
      const sceneName = type.templateData.name;
      const scene = document.createElement("button");
      scene.innerText = `Toggle Mute ${sceneName}`;
      scene.onclick = () => {
       _setTo(type.type, type.templateData, type.renderType);
      }
      listInputs.appendChild(scene);
    }
  }
}
document.querySelector("#obsws-pick-time-recording").onclick = () => {
  _setTo("obs.rec.time");
}
document.querySelector("#obsws-pick-start-recording").onclick = () => {
  _setTo("obs.rec.start");
}
document.querySelector("#obsws-pick-stop-recording").onclick = () => {
  _setTo("obs.rec.stop");
};
document.querySelector("#obsws-pick-toggle-recording").onclick = () => {
  _setTo("obs.rec.toggle");
};
document.querySelector("#obsws-pick-toggle-pause").onclick = () => {
  _setTo("obs.rec.toggle_pause");
};

document.querySelector("#obsws-pick-time-streaming").onclick = () => {
  _setTo("obs.str.time");
}
document.querySelector("#obsws-pick-start-streaming").onclick = () => {
  _setTo("obs.str.start");
}
document.querySelector("#obsws-pick-stop-streaming").onclick = () => {
  _setTo("obs.str.stop");
};
document.querySelector("#obsws-pick-toggle-streaming").onclick = () => {
  _setTo("obs.str.toggle");
};
document.querySelector("#obsws-pick-start-rb").onclick = () => {
  _setTo("obs.rb.start");
};
document.querySelector("#obsws-pick-save-rb").onclick = () => {
  _setTo("obs.rb.save");
};
document.querySelector("#obsws-pick-stop-rb").onclick = () => {
  _setTo("obs.rb.stop");
};
document.querySelector("#obsws-pick-toggle-rb").onclick = () => {
  _setTo("obs.rb.toggle");
};
document.querySelector("#obws-pick-currentscene").onclick = () => {
  _setTo("obs.cs", {}, "text");
}

function _setTo(type, data={}, renderType="button") {
  const currentInteraction = JSON.parse(editorBtn.getAttribute("data-interaction"));
  currentInteraction.type = type;
  currentInteraction.plugin = "obscontrol";
  currentInteraction.renderType = renderType;
  currentInteraction.data = {...data, ...currentInteraction.data};
  typeShow.value = type;
  editorBtn.setAttribute("data-interaction", JSON.stringify(currentInteraction));
}

document.querySelector("#obsws-auth-button").onclick = (ev) => {
  if(universal.plugins.obscontrol.types.length > 1) {
    document.querySelector("#obsws-auth").style.display = "none";
    document.querySelector("#obsws-dash").style.display = "block";
    return;
  }
  universal.send(universal.events.keypress, { event: ev, btn: { uuid: 0, name: "Emulated Button from OBSControl", type: "obs.cf", data: {
    password: document.querySelector("#obspswd").value,
  } } });
}

