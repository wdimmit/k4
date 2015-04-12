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
var dsp = require("dsp4kpr-ph.js");
var chart = require("charts4kpr.js");

/*STYLES*/
var labelStyle = new Style({ font:"bold 34px", color:"black", horizontal:"center", vertical:"middle" });
var menuStyle = new Style({ font:"bold 26px", color:"black", horizontal:"center", vertical:"top" });
var tunerStyle = new Style({font: "bold 75px", color: ["grey","green"], horizontal: "center", vertical: "middle"});
var tunerStyleLow = new Style({font: "bold 75px", color: ["white","red"], horizontal: "center", vertical: "middle"});
var tunerStyleHigh = new Style({font: "bold 75px", color: ["white","red"], horizontal: "center", vertical: "middle"});

/*TEXTURES*/
var menuTexture = new Texture("./assets/menu.png");

/*SKINS*/
var menuBackgroundSkin = new Skin({ fill: "#00FFFF" } );
var menuButtonSkin = new Skin({fill: "#CCCCCC" });
var tunerSkin = new Skin({fill: '#FFF'});
var threeLineSkin = new Skin({texture: menuTexture, x:0, y:0, width:35, height:35});
var dropDownSkin = new Skin({fill: '#FE9999FF'});

var info = new Object();
info.actionButton = 'Pause';
info.mode = 'F';
info.menu = false;

var NOTES = [['C4',260,262], ['C5',522, 524]];
var activeNote = 0;

var SMOOTHING = 24;
var UPDATESPEED = 10;
var SAMPLEMERGE = 16;

var SKIPBARS = 4;

/*The Create uses a variable buffer length that is a function of the 
 * sample rate.  The DSP library requires a buffer length that is a 
 * power of 2, hence the unusual sample rate.
 */
var BUFFERSIZE = 128;
var SAMPLERATE = 4131;



var DSP = new dsp.dsp();
var CHART = new chart.chart(320, 240);

var FFT = new DSP.RFFT((BUFFERSIZE)*SAMPLEMERGE, SAMPLERATE);

var graph;
var x = 0;
var signalCache = [];

var prevOutput = [];
var newOutput = [];

var slow = new Object();
slow.rms = new Array();
slow.average = new Array();
slow.peak = new Array();

var smooth = new Object();

var pitch = 0;
var frameStart;

Handler.bind("/gotAudio", {
	onInvoke: function(handler, message) {
		

		var response = message.requestObject;
                
		if (slow.rms.push(response.rms) > SMOOTHING)
			 slow.rms.shift();
			 
		if (slow.average.push(response.average) > SMOOTHING)
			slow.average.shift();

		if (slow.peak.push(response.peak) > SMOOTHING)
			slow.peak.shift();		
		
		//var signal = [];
        /*Convert signal from 16bit Int to Float*/
		var count = response.count;

		var samples = new Int16Array(response.samples, 0, count);
		var signal = new Array(count);
		for (var i = 0; i < count; i++)
		    signal[i] = samples[i] / 32678;
		
		
        if (signalCache.length > SAMPLEMERGE )
			signalCache.shift();
        if (signalCache.push(signal) > SAMPLEMERGE) {
			signalCache.shift();
        }
			
		if (x < UPDATESPEED) {
			x++;
			return;
		}
		else {
			x = 0;
			//frameStart = Date.now();

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
	        if (signalCache.length == SAMPLEMERGE) {
       	
	        	if (signalCache.length == SAMPLEMERGE) {
	        		var rawSignal = [];
	        		for (i=0; i<SAMPLEMERGE; i++) { rawSignal = rawSignal.concat(signalCache[i]); }
	        	}
	        	else
	        		return;
	        	if (rawSignal.length != BUFFERSIZE * SAMPLEMERGE) {
	        		trace(rawSignal.length+'\n');
	        		return;
	        	}
	        	//signal = DSP.DSP.getChannel(DSP.DSP.LEFT, rawSignal);
	        	signal = rawSignal;
	        	
		        /*Do Windowing*/
		        var window = new DSP.WindowFunction(DSP.DSP.LANCZOS);
		        signal = window.process(signal);

		        /*Calculate Spectrum*/
		        var spectrum = FFT.forward(signal);
		    	
		        /*Average out spectrum to help with noise*/
		    	prevOutput = newOutput;
		    	newOutput = new Array();
		    	var output = new Array();
		    	var maxResponse = new Object();
		    	maxResponse.bin = null;
		    	maxResponse.value = 0;
		    	
		    	for (q = 0; q < spectrum.length; q++) {
		    		newOutput[q] = spectrum[q];
		    	}
		    	if (prevOutput.length == newOutput.length) {
			    	for (q = 0; q<newOutput.length; q++) {
			    		output[q] = ((prevOutput[q]+newOutput[q]) / 2)
			    		if (output[q] > maxResponse.value) {
			    			maxResponse.value = output[q];
			    			maxResponse.bin = q;
			    		}
			    	}
		    	}
		    	else {
		    		output = newOutput;
		    	}   	
		    	
	    		/*Call the bargraph library to update screen*/    		
		    	pitch = Math.round((maxResponse.bin * ((SAMPLERATE /  2) / (output.length)))) ;
	    		trace(pitch+"\n");    	
		    	info.output = output;
	    		if (info.mode != 'T') {
	    			trace("invalidate\n");
	    			info.port.invalidate();
	    		}
	    		else {
	    			trace(pitch+"\n");
	    			if (pitch >= NOTES[activeNote][1] && pitch <= NOTES[activeNote][2]) {
	    				tuner.display.note.state = 1;
	    				tuner.display.low.state = 0;
	    				tuner.display.high.state = 0;
	    			}
	    			else if (pitch < NOTES[activeNote][1]) {
	    				tuner.display.note.state = 0;
	    				tuner.display.low.state = 1;
	    				tuner.display.high.state = 0;
	    			}
	    			else if (pitch > NOTES[activeNote][2]) {
	    				tuner.display.note.state = 0;
	    				tuner.display.low.state = 0;
	    				tuner.display.high.state = 1;
	    			}
	    		}
	        }
        }       
        
	}
});

/*
SCREEN
*/

var Screen = Container.template(function($) { return {
left:0, right:0, top:0, bottom:0, active:true, style: labelStyle,
contents: [
	Container ($, {anchor:"MENU", left:0, right: 0, top: 0, bottom: 0, 
		active: true,
		behavior: Object.create(Behavior.prototype, {
			onCreate: { value: function(container, data) {
				this.data = data;
			}}
		}),
		contents: [
		           
	           Container($, {width: 35, height: 35, top: 0, right: 0, active:true, skin:threeLineSkin,
	        	    behavior: Object.create(Behavior.prototype, {
	        	    	onTouchEnded: { value: function(container, id, x,  y, ticks) {
	        	    		if (info.menu == false) {
	        	    			screen.add(dropDownMenu);
	        	    			info.menu = true;
	        	    		}
	        	    	}}
	        	    })
	    	    }), 
       ]
	}),
	]
}});
var Analyzer = Container.template(function($) { return {
	left:0, right:0, top:0, bottom:0, active:true, style: labelStyle,
	contents: [
	           Port($, { anchor:"PORT", left: 0, right: 0, top: 0, bottom: 0, 	
	    		behavior: Object.create(Behavior.prototype, {
	    			onCreate: { value: function(port, data) {
	    				this.data = data;
	    				graph = new CHART.FastBarGraph({primaryColor: 'blue', background: 'white', marginWidth: 0, skipBars: SKIPBARS, dataMax: 0.01});
	    				info.port = port;
	    			}},
	    			onDraw: { value: function(port, x, y, width, height ) {			
	    				if (typeof(info.output) != 'undefined' && info.output.length == (((BUFFERSIZE)*SAMPLEMERGE)/2)) {
	    					graph.refresh(port, info.output);				
	    					port.drawLabel( Math.round(100*(1000/(Date.now()-frameStart)))/100+' FPS', 0, 5, 320, 30);
	    					frameStart = Date.now();
	    					//port.drawLabel( Math.round(Date.now()-frameStart), 0, 5, 320, 30);
	    					port.drawLabel( pitch + "Hz", 0, 50, 320, 30);
	    				}				
	    			}},
	    		})	
	    	}),
    	]
}});
var Tuner = Container.template(function($) { return {
	left:0, right:0, top:0, bottom:0, active:true, skin: tunerSkin,
    behavior: Object.create(Behavior.prototype, {
    	onTouchEnded: { value: function(container, id, x,  y, ticks) {
    		trace("x: "+x+" - y: "+y+"\n");
    		tuner.first.state = 1;
    	}}
    }),
	contents: [
	       Container($, {anchor: "TUNERBUTTON", left: 75, right: 75, top: 50, name: "display", 
	    	   contents: [ 
	    	               new Label({left: 0, style: tunerStyleLow, string: "<", name: "low"}),
	    	               new Label({style: tunerStyle, string: NOTES[activeNote][0], name: "note"}),
	    	    	       new Label({right: 0, style: tunerStyleHigh, string: ">", name: "high"})
    	               ]
	    	   
	       })
    ]
}});
var DropDownMenu = Container.template(function($) { return {
	right: 35, top: 15, width: 160, skin: dropDownSkin, active: true,
	contents: [
	           Column($, {left: 0, right: 0, top: 0, bottom: 0, 
	        	   contents: [
			           Label($, {height: 40, style:menuStyle, active: true, string:'Fast',
			        	    behavior: Object.create(Behavior.prototype, {
			        	    	onTouchEnded: { value: function(container, id, x,  y, ticks) {
				        	    	   screen.remove(dropDownMenu);   
				        	    	   info.menu = false;
				        	    	   BUFFERSIZE = 128;
			        			   	   SAMPLERATE = 4131;
			        			   	   SAMPLEMERGE = 2;
			        			   	   SKIPBARS = 1;
			        			   	   UPDATESPEED = 1;
			        			   	   
			        			   	   application.invoke(new MessageWithObject("pins:/microphone/read?repeat=off"));
			        			   	   application.invoke(new MessageWithObject("pins:/microphone/restart",{sampleRate: SAMPLERATE}));
			        			   	   application.invoke(new MessageWithObject("pins:/microphone/read?repeat=on&timer=audio&callback=/gotAudio"))	        			   	   
			        			   	   
			        			   	   
			        				   FFT = new DSP.RFFT((BUFFERSIZE)*SAMPLEMERGE, SAMPLERATE);
			        				   graph = new CHART.FastBarGraph({primaryColor: 'red', background: 'white', marginWidth: 0, skipBars: SKIPBARS, dataMax: 0.025});
			        				   if (info.mode == 'T') {
				        			   	   screen.remove(tuner);
				        			   	   screen.insert(analyzer, screen.first);
			        				   }
			        				   info.mode = 'F';
			        				   
			        	    	}}
			        	    })     	    	
			           }),
			           Label($, {height: 40, style:menuStyle, active: true, string:'Precise', 
			        	    behavior: Object.create(Behavior.prototype, {
			        	    	onTouchEnded: { value: function(container, id, x,  y, ticks) {
			        			   	   screen.remove(dropDownMenu);
			        			   	   info.menu = false;
			        			   	   BUFFERSIZE = 128;
			        			   	   SAMPLERATE = 4131;
			        			   	   SAMPLEMERGE = 16;
			        			   	   SKIPBARS = 4;
			        			   	   UPDATESPEED = 12;
			        			   	   
			        			   	   application.invoke(new MessageWithObject("pins:/microphone/read?repeat=off"));
			        			   	   application.invoke(new MessageWithObject("pins:/microphone/restart",{sampleRate: SAMPLERATE}));
			        			   	   application.invoke(new MessageWithObject("pins:/microphone/read?repeat=on&timer=audio&callback=/gotAudio"))	        			   	   
			        			   	   
			        			   	   
			        				   FFT = new DSP.RFFT((BUFFERSIZE)*SAMPLEMERGE, SAMPLERATE);
			        				   graph = new CHART.FastBarGraph({primaryColor: 'blue', background: 'white', marginWidth: 0, skipBars: SKIPBARS, dataMax: 0.008});
			        				   if (info.mode == 'T') {
				        			   	   screen.remove(tuner);
				        			   	   screen.insert(analyzer, screen.first);
			        				   }
			        				   info.mode = 'P';
			        	    	}}
			        	    })   
			           }),
			           Label($, {height: 40, style:menuStyle, active: true, string:'Tuner', 
			        	    behavior: Object.create(Behavior.prototype, {
			        	    	onTouchEnded: { value: function(container, id, x,  y, ticks) {		        			   	   
			        			   	   screen.remove(dropDownMenu);
			        			   	   info.menu = false;
			        			   	   BUFFERSIZE = 128;
			        			   	   SAMPLERATE = 4131;
			        			   	   SAMPLEMERGE = 32;
			        			   	   SKIPBARS = 4;
			        			   	   UPDATESPEED = 22;
			        			   	   
			        			   	   application.invoke(new MessageWithObject("pins:/microphone/read?repeat=off"));
			        			   	   application.invoke(new MessageWithObject("pins:/microphone/restart",{sampleRate: SAMPLERATE}));
			        			   	   application.invoke(new MessageWithObject("pins:/microphone/read?repeat=on&timer=audio&callback=/gotAudio"))
			        			   	   
			        				   FFT = new DSP.RFFT((BUFFERSIZE)*SAMPLEMERGE, SAMPLERATE);        				   

			        			   	   if (info.mode != 'T') {
			        			   		   screen.remove(analyzer);
			        			   		   screen.insert(tuner, screen.first);
			        			   	   }
			        			   	   info.mode = 'T';
			        	    	}}
			        	    })   
			           }),			           
		           ]
	           })
          ]

}})

var keyLabel = new Label 
var analyzer = new Analyzer();
var tuner = new Tuner();
var dropDownMenu = new DropDownMenu();
var screen;

var model = application.behavior = Object.create(Object.prototype, {
	onLaunch: { value: function(application) {
        application.invoke(new MessageWithObject("pins:configure", {
           microphone: {
               require: "audioin",
               pins: {
            	   audio: {sampleRate: SAMPLERATE, channels: 1}
               }
            }}));
        data = {actionButton: 'Pause', mode: 'P', labels: {}};
        
        info.data = data;
        
        data.labels.actionLabel = new Label({ top:0, bottom:0, left: 0, width: 130, style:menuStyle, string: data.actionButton});   
        
        //info.mode = 'T'
        
        screen = new Screen(data);
        screen.insert(analyzer, screen.first);
        
        application.add(screen);
        application.invoke(new MessageWithObject("pins:/microphone/read?repeat=on&timer=audio&callback=/gotAudio"));
    }}
});




