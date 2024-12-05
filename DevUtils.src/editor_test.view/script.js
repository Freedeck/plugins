const editorButton = document.querySelector("#editor-btn");
const tester = document.querySelector("#test");
let currentInteraction = null;

function silly() {
  currentInteraction.type = "silly" + Math.random();
  tester.innerText = editorButton.innerText +" / " + currentInteraction.type;

  editorButton.setAttribute("data-interaction", JSON.stringify(currentInteraction))
}
window.silly = silly;
universal.listenFor("editTile", (e) => {
  currentInteraction = e;
})