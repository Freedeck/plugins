let isAuthorized = false;

universal.on("spotify_data", (data) => {
  const {playbackState, auth} = data;
  if(playbackState.error?.status == 400 || playbackState.error?.status==401 && !isAuthorized) {
    window.open(auth, "_blank")
    isAuthorized = true;
  } else {
    isAuthorized = true;
  }
  let showing = `${getArtistsNames(playbackState.item)} - ${playbackState.item.name}`
  universal.ui.visual.typeChangeText("sp.clf", showing)
  universal.ui.visual.typeChangeText("sp.clt", `${playbackState.item.name}`)
  if(playbackState.is_playing == false) {
    getAllOfType("sp.cl").forEach(({element, interaction}) => {
      setIndicatorToButton(element, "yellow")
    })

    getAllOfType("sp.playpause").forEach(({element, interaction}) => {
      setIndicatorToButton(element, "yellow")
    })
  } else {
    getAllOfType("sp.playpause").forEach(({element, interaction}) => {
      setIndicatorToButton(element, "green")
    })
    getAllOfType("sp.cl").forEach(({element, interaction}) => {
      removeIndicatorFromButton(element)
    })
  }

  const ctime = msToTimestamp(playbackState.progress_ms);
  const ttime = msToTimestamp(playbackState.item.duration_ms);
  universal.ui.visual.typeChangeText("sp.pbt", `${ctime}/${ttime}`)
})

function msToTimestamp(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function getArtistsNames(playbackItem) {
  let output = "";
  let lastArtist = playbackItem.artists[playbackItem.artists.length-1];
  for(const artist of playbackItem.artists) {
    output += artist.name
    if(artist.name != lastArtist.name) output += ", "
  }
  return output;
}

function setIndicatorToButton(btn, indicator) {
  if (!btn.querySelector('#sp_indi')) {
    let indicator = document.createElement('div');
    indicator.id = 'sp_indi';
    btn.appendChild(indicator);
  }
  const cl = btn.querySelector('#sp_indi').classList;
  cl.remove('indicator-red');
  cl.remove('indicator-green');
  cl.remove('indicator-yellow');
  cl.add('indicator-' + indicator);
}

function removeIndicatorFromButton(btn) {
  if (btn.querySelector('#sp_indi')) {
    btn.querySelector('#sp_indi').remove();
  }
}

function getAllOfType(type){
  let out = [];
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter != null) {
      if(inter.type == type) out.push({element:btn, interaction:inter})
    }
  });
  return out;
}

universal.listenFor("page_change", () => {
  universal.send("spotify_update");
})