let isAuthorized = false;
universal.on("spotify_rlco", () => {
  isAuthorized = false;
})
universal.on("spotify_data", (data) => {
  const {playbackState, auth} = data;
  if((playbackState.error?.status === 400 || playbackState.error?.status===401) && !isAuthorized) {
    window.open(auth, "_blank")
    isAuthorized = true;
  } else {
    isAuthorized = true;
  }
  const albumName = playbackState.item.album.name;
  const artists = getArtistsNames(playbackState.item);
  const itemName = playbackState.item.name;
  const showing = `${artists} - ${itemName}`
  
  universal.ui.visual.typeChangeText("sp.clf", showing)
  universal.ui.visual.typeChangeText("sp.clt", `${playbackState.item.name}`)
  
  if(playbackState.is_playing === false) {
    makeAll("sp.cl", "yellow");
    makeAll("sp.playpause", "yellow");
  } else {
    makeAll("sp.cl", "none");
    makeAll("sp.playpause", "green");
  }

  if(playbackState.shuffle_state === true) {
    makeAll("sp.shf", "green");
  } else {
    makeAll("sp.shf", "none");
  }

  const ctime = msToTimestamp(playbackState.progress_ms);
  const ttime = msToTimestamp(playbackState.item.duration_ms);
  universal.ui.visual.typeChangeText("sp.pbt", `${ctime}/${ttime}`)

  if(universal.plugins.textbg) {
    const isPaused = playbackState.is_playing ? "" : " (Paused)";
    const tbgTitle = `Spotify | <b>${artists}</b> - <b>${itemName}</b> | ${ctime}/${ttime}${isPaused} | on <b>${playbackState.device.name}</b>`;
    universal.send("textbg-display", tbgTitle);
    universal.send("_t", tbgTitle);
  }

  imgs = [];
  for(const {element, interaction} of [...getAllOfType("sp.clabt"), ...getAllOfType("sp.clabtplus")]) {
    if(!element.querySelector("img#sptcart")) {
      const image = new Image();
      image.id = "sptcart";
      image.style.pointerEvents='none';
      element.appendChild(image);
      imgs.push(image);
    } else {
      imgs.push(element.querySelector("img#sptcart"))
    }
    const txt = element.querySelector(".button-text");
    if(interaction.type === 'sp.clabtplus') {
      if(txt.style.display !== 'block') txt.style.display = 'block';
      if(txt.style.position !== 'fixed') txt.style.position = 'fixed';
      txt.querySelector("p").innerText = albumName;
    } else {
      if(txt.style.display !== 'none') txt.style.display = 'none';
    }
  }

  const wantedCoverArt = playbackState.item.album.images[0].url;
  for(const imgElement of imgs) {
    if(imgElement.src !== wantedCoverArt) imgElement.src = wantedCoverArt;
    if(imgElement.style.width !== "100%") imgElement.style.width="100%";
    if(imgElement.style.height !== "100%") imgElement.style.height="100%";
  }
})

function makeAll(type, color) {
  for(const {element} of getAllOfType(type)) {
    if(color === "none") removeIndicatorFromButton(element)
    else setIndicatorToButton(element, color);
  }
}

let imgs = [];

function msToTimestamp(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function getArtistsNames(playbackItem) {
  let output = "";
  const lastArtist = playbackItem.artists[playbackItem.artists.length-1];
  for(const artist of playbackItem.artists) {
    output += artist.name
    if(artist.name !== lastArtist.name) output += ", "
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
    if (inter != null && btn.id !== 'editor-btn') {
      if(inter.type == type) out.push({element:btn, interaction:inter})
    }
  });
  return out;
}

universal.listenFor("page_change", () => {
  universal.send("spotify_update");
})