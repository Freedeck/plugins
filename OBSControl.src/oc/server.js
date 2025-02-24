function getAllButtonsThatAreControlledByObsControl(typePredicate=(a)=>{return true}) {
  let buttons = [];
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter == null) return;
    if (universal.plugins.obscontrol.types.filter((a)=>{return a.type == inter.type}).length == 0) return;
    buttons.push({button: btn, interaction: inter});
  })
  buttons = buttons.filter(typePredicate);
  return buttons;
}
function oc_getButtonsStartingWith(type="obs.") {
  return getAllButtonsThatAreControlledByObsControl((e) => e.interaction.type.startsWith(type));
}


const handleCurrentScene = (data) => {
  universal.ui.visual.typeChangeText("obs.cs", data);
  setIndicatorsForSwitchSceneButtons(data);
}

const handleVolume = (array) => {
  for(const {button, interaction} of oc_getButtonsStartingWith("obs.v")) {
    for(const data of array) {
      if (interaction.type == 'obs.v.' + data.uuid) {
        button.querySelector('.slider-container').dataset.value = Math.round(data.inputVolumeDb);
      }
    }
  }
}

const handleRecordingStateUpdate = (data) => {
  universal.ui.visual.typeChangeText("obs.rec.time", data.outputTimecode == undefined ? "Start recording!" : data.outputTimecode);
  for(const {button, interaction} of oc_getButtonsStartingWith("obs.rec")) {

    if (interaction.type == 'obs.rec.start' || interaction.type == 'obs.rec.stop' || interaction.type == 'obs.rec.toggle') {
      if (data.outputActive && !data.outputPaused) {
        setIndicatorToButton(button, 'green');
      } else {
        if (data.outputPaused) {
          setIndicatorToButton(button, 'yellow');
        } else if(!data.outputActive) {
          removeIndicatorFromButton(button);
        }
      }
    }

    if (interaction.type == 'obs.rec.toggle_pause') {
      if (data.outputPaused) {
        setIndicatorToButton(button, 'yellow');
      } else {
        removeIndicatorFromButton(button);
      }
    }
  }
}

const handleStreamingStateUpdate = (data) => {
  universal.ui.visual.typeChangeText("obs.str.time", data.outputTimecode == undefined ? "Start recording!" : data.outputTimecode);
  for(const {button, interaction} of oc_getButtonsStartingWith("obs.str")) {
    if (interaction.type == 'obs.str.start' || interaction.type == 'obs.str.stop' || interaction.type == 'obs.str.toggle') {
      if (data.outputActive) {
        setIndicatorToButton(button, 'green');
      } else {
        removeIndicatorFromButton(button);
      }
    }
  }
}

const handleReplayBufferStateUpdate = (data) => {
  for(const {button, interaction} of oc_getButtonsStartingWith("obs.rb")) {
    if (interaction.type == 'obs.rb.start' || interaction.type == 'obs.rb.stop' || interaction.type == 'obs.rb.toggle') {
      if (data.outputActive) {
        setIndicatorToButton(button, 'green');
      } else {
        setIndicatorToButton(button, 'red');
      }
    }
  }
}

const handleMuteStatus = (data) => {
  for(const {button, interaction} of oc_getButtonsStartingWith("obs.m")) {
    if (interaction.type == 'obs.m.' + data.uuid) {
      if (data.inputMuted) {
        setIndicatorToButton(button, 'red');
      } else {
        setIndicatorToButton(button, 'green');
      }
    }
  }
}

const handleSourceVisibility = (data) => {
  for(const {button, interaction} of oc_getButtonsStartingWith("obs.src.vis")) {
    if (interaction.type == 'obs.src.vis' && interaction.data.Source == data.sourceName) {
      if (data.sceneItemEnabled) {
        setIndicatorToButton(button, 'green');
      } else {
        setIndicatorToButton(button, 'red');
      }
    }
  }
}

const packetDataHandlers = {
  "oc_cs": handleCurrentScene,
  "oc_vo": handleVolume,
  "oc_rec": handleRecordingStateUpdate,
  "oc_str": handleStreamingStateUpdate,
  "oc_rb": handleReplayBufferStateUpdate,
  "oc_ms": handleMuteStatus,
  "oc_src_vis": handleSourceVisibility,
};

const packetDataHandlerKeys = Object.keys(packetDataHandlers);

universal.on('oc_data', (packet) => {
  for(const packetKey of Object.keys(packet)) {
    if(packetDataHandlerKeys.includes(packetKey)) {
      (async() => {
        packetDataHandlers[packetKey](packet[packetKey]);
      })();
    }
  }
})

async function setIndicatorsForSwitchSceneButtons(currentScene) {
  for(const {button, interaction} of oc_getButtonsStartingWith("obs.ss")) {
    let scene = interaction.type.split('obs.ss.')[1];
    if (currentScene == scene) setIndicatorToButton(button, 'green');
    else removeIndicatorFromButton(button);
  }
}

function setIndicatorToButton(btn, indicator) {
  if (!btn.querySelector('#oc_indi')) {
    let indicator = document.createElement('div');
    indicator.id = 'oc_indi';
    btn.appendChild(indicator);
  }
  const cl = btn.querySelector('#oc_indi').classList;
  cl.remove('indicator-red');
  cl.remove('indicator-green');
  cl.remove('indicator-yellow');
  cl.add('indicator-' + indicator);
}

function removeIndicatorFromButton(btn) {
  if (btn.querySelector('#oc_indi')) {
    btn.querySelector('#oc_indi').remove();
  }
}

const obsc_handlePageChange = () => {
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter != null) {
      if (inter.type.startsWith('obs.v.')) {
        let uuid = inter.type.split('obs.v.')[1];
        universal.send('oc_vo', {
          name: inter.data.name,
          uuid: uuid
        });
      }

      if (inter.type.startsWith('obs.rec.') || inter.type.startsWith('obs.str.') || inter.type.startsWith('obs.rb.')) {
        let indicator = document.createElement('div');
        indicator.id = 'oc_indi';
        btn.appendChild(indicator);
      }
      if (inter.type.startsWith('obs.m.')) {
        let indicator = document.createElement('div');
        indicator.id = 'oc_indi';
        universal.send('oc_ms', {
          name: inter.data.name,
          uuid: inter.type.split('obs.m.')[1]
        });
        btn.appendChild(indicator);
      }
      if (inter.type == 'obs.src.vis') {
        let indicator = document.createElement('div');
        indicator.id = 'oc_indi';
        universal.send('oc_src_vis', {
          Scene: inter.data.Scene,
          Source: inter.data.Source,
        });
        btn.appendChild(indicator);
      }
    }
  })
};

obsc_handlePageChange();
universal.listenFor('launch', () => {
  obsc_handlePageChange();
})
universal.listenFor('page_change', () => {
  obsc_handlePageChange();
})

setInterval(() => {
  obsc_handlePageChange();
}, 1000);