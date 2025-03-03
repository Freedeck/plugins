universal.listenFor("keyRendered", (data) => {
  if(data.sndType == "w.w") {
    console.log("HI")
    data.keyObject.style.width = "calc(2*var(--fd-tile-w))";
    // lets make another div, like an overlay
    const overlay = document.createElement("div");
    overlay.style.width = "calc(2*var(--fd-tile-w))";
    overlay.style.height = "100%";
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.background = "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)";
    overlay.style.opacity = "0.5";
    overlay.style.zIndex = "1";
    data.keyObject.appendChild(overlay);
    
  }
})