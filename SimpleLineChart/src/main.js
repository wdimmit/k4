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
var chart = require("charts4kpr.js");
var info = new Object();
var graph;
var demoData = [1,4,3,2,1,4,6,7,8,12];		

function shuffle(array) {
	  var currentIndex = array.length, temporaryValue, randomIndex ;

	  // While there remain elements to shuffle...
	  while (0 !== currentIndex) {

	    // Pick a remaining element...
	    randomIndex = Math.floor(Math.random() * currentIndex);
	    currentIndex -= 1;

	    // And swap it with the current element.
	    temporaryValue = array[currentIndex];
	    array[currentIndex] = array[randomIndex];
	    array[randomIndex] = temporaryValue;
	  }

	  return array;
}


/*
SCREEN
*/

var Screen = Container.template(function($) { return {
left:0, right:0, top:0, bottom:0, active:true,
contents: [
	Canvas($, { anchor:"CANVAS", left:0, right:0, top:0, bottom:0,active:true,
		behavior: Object.create(Behavior.prototype, {
			onCreate: {value: function(canvas, data) {
				this.data = data;			
			}},
			onDisplaying: { value: function(canvas) {
				var CHART = new chart.chart(canvas.width, canvas.height);			
				graph = new CHART.LineGraph(canvas.getContext("2d"), 
						{primaryColor: '#ff0000', background: 'white'});
				info.ctx = canvas.getContext("2d");
				info.canvas = canvas;
				
    			/*Call the bargraph library to update screen*/
	    		graph.refresh(shuffle(demoData));
			}},
 		   onTouchEnded: { value: function(container, id, x,  y, ticks) {	        			   
		    	/*As of 01/22/2015 this must be called between screen redraws or 
		    	 * the display will not update properly
		    	 */
	    		info.canvas.getContext("2d");
	    	
	    		/*Call the bargraph library to update screen*/
	    		graph.refresh(shuffle(demoData));
		   }}
		}),
	})
	]
}});

/*
APPLICATION
*/

var model = application.behavior = Object.create(Object.prototype, {
	onLaunch: { value: function(application) {
        data = {};       
        application.add(new Screen(data))
    }}
});