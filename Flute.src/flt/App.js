universal.on("flute-loopback", (int) => {
});
universal.on("flute-record-state", (int) => {
  let isRecording = int[0];
  universal.ui.visual.idChangeText(int[1].uuid, isRecording ? "Recording..." : "Record");
});
universal.on("flute-playback", (int) => {
  universal.ui.visual.idChangeText(int.uuid, "Playing...");
  universal.ui.visual.idChangeText(int.uuid, "Record");
});

universal.listenFor("page_change", () => {
  universal.send("flute-regrab");
});