module.exports = (s, i, n) => {
	n.set(i);
	s.on("flute-regrab", () => n.blastAllChannelStatus());
};
