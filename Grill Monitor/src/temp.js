// KPR Script file
exports.pins = {
	sensor: {type: "A2D"}
};
exports.configure = function() {
	this.sensor.init();
}
exports.read = function() {
	return this.sensor.read();
}
exports.close = function() {
	this.sensor.close();
}