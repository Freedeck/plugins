import { setTileData } from "/companion/scripts/editor/data.js";

const editorButton = document.querySelector("#editor-btn");
const searchBar = document.querySelector("#myi-search");
const searchResults = document.querySelector("#myi-results");
let currentInteraction = null;
/**
 * This function is apparently used in MyInstants's search result page.
 * Each button has an onclick="" attribute that calls this function like so:
 * play('/media/sounds/vine-boom-bass-boost-sound-effect.mp3', 'loader-233922', 'vine-boom-bass-boost-sound-effect-68900');
 * and it seems to be the same.
 * @param {*} a The full path (from excluding https://myinstants.com) to the sound file.
 * @param {*} b Potentially some ID? Not sure.
 * @param {*} c MyInstants Instant ID.
 * @param  {...any} extra This is just in case there are more arguments that are not used, so we don't have to worry about them.
 * @returns The full path to the sound file, including https://myinstants.com.
 */
window.play = (a, b, c, ...extra) => {
  return `https://myinstants.com${a}`;
}
function search() {
  return new Promise((resolve, reject) => {
    setTileData("_query", searchBar.value, currentInteraction);
    universal.send("mi:search", { query: searchBar.value });
    universal.once("mi:results", (e) => {
      searchResults.innerHTML = "";
      if(e.length === 0) {
        searchResults.innerText = "No sounds found. Try another search term.";
      }
      for(const app of e) {
        const result = document.createElement("div");
        result.classList.add("item");
        result.setAttribute("data-url", app.newPath);
        result.innerText = app.title.split("Play ")[1].split(" sound")[0];
        result.onclick = () => {
          for(const e of searchResults.querySelectorAll(".item")) e.classList.remove("selected");
          result.classList.add("selected");
          setTileData("url", app.newPath, currentInteraction);
          currentInteraction.type = 'mi.sound';
          currentInteraction.plugin = 'myinstants';
          editorButton.setAttribute("data-interaction", JSON.stringify(currentInteraction));
        }

        const preview = document.createElement("audio");
        preview.src = eval(app.onclick);
        preview.controls = true;
        result.appendChild(preview);
        searchResults.appendChild(result);
      }
      resolve();
    });
  })
}

window.myInstantsSearch = search;

universal.listenFor("editTile", (e) => {
  if(e.plugin !== "myinstants") return;
  if(e.data.url && !e.data._query) {
    e.data._query = e.data.url;
  }
  currentInteraction = e;
  searchBar.value = e.data._query || "";
  search().then(() => {
    if(currentInteraction.data.url) {
      for(const e of searchResults.querySelectorAll(".item")) e.classList.remove("selected");
      const selected = searchResults.querySelector(`[data-url="${currentInteraction.data.url}"]`);
      if(selected) selected.classList.add("selected");
    }
  })
})