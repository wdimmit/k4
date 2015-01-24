/*
 *  Copyright 2015 Will Dimmit <will@ultimatetrip.net>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

//@program
var dsp = require("dsp4kpr.js");
var chart = require("charts4kpr.js");

var info = new Object();

var SMOOTHING = 24;
var UPDATESPEED = 3;

/*The Create uses a variable buffer length that is a function of the 
 * sample rate.  The DSP library requires a buffer length that is a 
 * power of 2, hence the unusual sample rate.
 */
var BUFFERSIZE = 512;
var SAMPLERATE = 8262;//16525;

var DSP = new dsp.dsp();
var CHART = new chart.chart();

/*Use half the buffersize here because the incoming signal is "stereo"*/
var FFT = new DSP.RFFT(BUFFERSIZE/2, SAMPLERATE);

var graph;
var x = 0;
var prevOutput = [];
var newOutput = [];

var slow = new Object();
slow.rms = new Array();
slow.average = new Array();
slow.peak = new Array();

var smooth = new Object();

Handler.bind("/gotAudio", {
	onInvoke: function(handler, message) {
		var response = message.requestObject;
                
		if (slow.rms.push(response.rms) > SMOOTHING)
			 slow.rms.shift();
			 
		if (slow.average.push(response.average) > SMOOTHING)
			slow.average.shift();

		if (slow.peak.push(response.peak) > SMOOTHING)
			slow.peak.shift();		
		
	
		if (x < UPDATESPEED) {
			x++;
			return;
		}
		else {
			x = 0;
			
			/*Calculate averaged out audio stats*/
			/*NOTE - These are not presently displayed*/
			var rms = 0;
			for (i = 0; i < slow.rms.length; i++) { rms += slow.rms[i]; }
			smooth.rms = Math.round(rms / slow.rms.length, 0);
	        		
			var average = 0;
			for (i = 0; i < slow.average.length; i++) { average += slow.average[i]; }
			smooth.average = Math.round(average / slow.average.length, 0);
	        	        
			var peak = 0;
			for (i = 0; i < slow.peak.length; i++) { peak += slow.peak[i]; }
			smooth.peak = Math.round(peak / slow.peak.length, 0);
				
			/*The whole FFT / Chart thing*/
	        if (response.samples.length == BUFFERSIZE) {
       	
	        	var signal = [];
		        
		        /*Convert signal from Unsigned 8bit Int to Float*/
		        for (q = 0; q<response.samples.length; q++) {
		        	signal[q] = (((response.samples[q] - 128)) / 128);

		        }        
		        /*The signal is actually on the right channel, extract it*/
		        signal = DSP.DSP.getChannel(DSP.DSP.RIGHT, signal);
		        
		        /*Do Windowing*/
		        var window = new DSP.WindowFunction(DSP.DSP.LANCZOS, 0.25);
		        signal = window.process(signal);

		        /*Calculate Spectrum*/
		        var spectrum = FFT.forward(signal);
		    	
		        /*Average out spectrum to help with noise*/
		    	prevOutput = newOutput;
		    	newOutput = new Array();
		    	var output = new Array();
		    	for (q = 0; q < spectrum.length; q++) {
		    		newOutput[q] = spectrum[q];
		    	}
		    	if (prevOutput.length == newOutput.length) {
			    	for (q = 0; q<newOutput.length; q++) {
			    		output[q] = (prevOutput[q]+newOutput[q] / 2)
			    	}
		    	}
		    	else {
		    		output = newOutput;
		    	}   	
	    		/*Call the bargraph library to update screen*/
	    		info.output = output;
	    		info.port.invalidate();	    		
	        }
        }       
        
	}
});

/*
SCREEN
*/

var Screen = Container.template(function($) { return {
left:0, right:0, top:0, bottom:0, active:true,
contents: [
	Port($, { anchor:"PORT", left: 0, right: 0, top: 0, bottom: 0, active: true,
		behavior: Object.create(Behavior.prototype, {
			onCreate: { value: function(port, data) {
				graph = new CHART.FastBarGraph({primaryColor: 'blue', background: 'white', marginWidth: 0});
				info.port = port;
			}},
			onDraw: { value: function(port, x, y, width, height ) {			
				if (typeof(info.output) != 'undefined' && info.output.length == BUFFERSIZE/2/2) {
					graph.refresh(port, info.output);
				}				
			}},
		})	
	})
	]
}});

var model = application.behavior = Object.create(Object.prototype, {
	onLaunch: { value: function(application) {
        application.invoke(new MessageWithObject("pins:configure", {
           microphone: {
               require: "audioin",
               pins: {
            	   audio: {sampleRate: SAMPLERATE, channels: 1}
               }
            }}));
        data = {};
        
        application.add(new Screen(data))

        application.invoke(new MessageWithObject("pins:/microphone/read?repeat=on&timer=audio&callback=/gotAudio"));
    }}
});




