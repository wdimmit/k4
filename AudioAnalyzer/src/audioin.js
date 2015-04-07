//@module

exports.pins = {
    audio: {type: "Audio", sampleRate: 8272, channels: 1, direction: "input"}
};

exports.configure = function(configuration) {
	this.audioConfiguration = configuration.pins.audio;
	this.audio.init();
    this.audio.start();
}

exports.restart = function (configuration) {  
    this.audioConfiguration.sampleRate = configuration.sampleRate; 
	this.audio.stop();
	this.audio.close();
    this.audio = PINS.create(this.audioConfiguration);
    this.audio.init();
    this.audio.start();
}
exports.read = function() {
    var samples = this.audio.read(); 
    var count = samples.length / 2;
    var total = 0, peak = 0, rms = 0.1;
    var data = new Int16Array(samples, 0, count);
    
    for (var i = 0; i < count; i++) {
        var sample = data[i];
        if (sample < 0)
            sample = -sample;

        total += sample;
        rms += sample * sample;

        if (peak < sample)
            peak = sample;
    
        
    }

    return {samples: samples, count: count, peak: peak, average: Math.round(total / count), rms: Math.round(Math.sqrt(rms / count))};
}
