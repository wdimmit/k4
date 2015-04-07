var THEME = require('themes/sample/theme');
var SCROLLER = require('mobile/scroller');
var SCREEN = require('mobile/screen');

/* ASSETS */
var blackSkin = new Skin({ fill: 'black',});
var whiteSkin = new Skin({ fill: 'white',});
var yellowSkin	= new Skin({ fill: 'yellow'});
var blueSkin = new Skin({fill: 'blue'})
var separatorSkin = new Skin({ fill: 'silver',});

/* STYLES */
var productNameStyle = new Style({  font: 'bold 22px', horizontal: 'left', vertical: 'middle', lines: 1, });
var productDescriptionStyle = new Style({  font: '18px', horizontal: 'left', vertical: 'middle', left: 1, color: 'white' });

/* STATIC */
var menuItems = [
    	{title: 'Pentium', button: 'P5'},
    	{title: 'Pentium MMX', button: 'Tillamook'},
    	{title: 'Pentium Pro', button: 'P6'},
    	{title: 'Pentium II', button: 'Klamath'},
    	{title: 'Pentium III', button: 'Coppermine'},
    	{title: 'Pentium IV', button: 'Prescott'},
    	{title: 'Pentium M', button: 'Dothan'},
    	{title: 'Core Duo', button: 'Yonah'},
    	{title: 'Core 2 Duo', button: 'Penryn'},
    	{title: 'Core i7', button: 'Sandy Bridge'}
    	];

var ProcessorLine = Line.template(function($) { return { left: 0, right: 0, active: true, skin: THEME.lineSkin, 
    behavior: Object.create(Behavior.prototype, {
    	onTouchBegan: { value: function(container, id, x,  y, ticks) {
    		container.skin = yellowSkin;
    	}},
    	onTouchEnded: { value: function(container, id, x,  y, ticks) {	
			container.skin = whiteSkin;
			trace(container.first.first.first.string+"\n");
		}}
    }),
	contents: [
     	Column($, { left: 0, right: 0, contents: [
     		Container($, { left: 4, right: 4, height: 52, 
     			contents: [
     			           Label($, { left: 10, style: productNameStyle, string: $.title,}),
     			           Label($, { right: 10, style: productDescriptionStyle, skin: blueSkin, active: true, string: $.button,
     			               behavior: Object.create(Behavior.prototype, {
     			           		    	onTouchEnded: { value: function(container, id, x,  y, ticks) {	
											trace(container.string+"\n");
										}}
								})
     			           }), 
 			           ], 
	           }),
     		Line($, { left: 0, right: 0, height: 1, skin: separatorSkin, }),
     	], }),
     ], 
 }});

var ScreenContainer = Container.template(function($) { return {
	left:0, right:0, top:0, bottom:0,
	contents: [
	   		SCROLLER.VerticalScroller($, { 
	   			contents: [
              			Column($, { left: 0, right: 0, top: 0, name: 'menu', }),
              			SCROLLER.VerticalScrollbar($, { }),
              			]
	   		})
	   		]
	}});

var data = new Object();
var screen = new ScreenContainer(data);

function ListBuilder(element, index, array) {
	screen.first.menu.add(new ProcessorLine(element));
}

application.behavior = Object.create(Object.prototype, {
	onLaunch: { value: function(application) {
		menuItems.forEach(ListBuilder);
		application.add(screen);
	}}
});