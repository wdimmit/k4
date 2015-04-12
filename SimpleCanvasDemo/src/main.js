//@program

var mainContainer = new Container({
	left: 0, right: 0, top: 0, bottom: 0, active: true,
	contents: [
		new Canvas({ left:0, right:0, top:0, bottom:0, active: false, name:'cnvs',
				behavior: Object.create(Behavior.prototype, {
					onDisplayed: { value: function(canvas) {

						canvasHeight = canvas.height;
				        canvasWidth = canvas.width;
						
				        var ctx = canvas.getContext("2d");

						//Fill Background
						ctx.fillRect(0, 0, canvasWidth, canvasHeight);
				        ctx.fillStyle = 'White';
						
				        //Actually draw the line
						ctx.beginPath();
				        ctx.moveTo(0, 50);
				        ctx.lineTo(canvasWidth, 50);
				        ctx.strokeStyle = '#FF0000';
				        ctx.stroke();
				        ctx.closePath();
				        
					}},
				}),
		}),
	],
});

application.add(mainContainer);