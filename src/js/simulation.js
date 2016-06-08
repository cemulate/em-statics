var jm = require('justmath');

class PointCharge {
	constructor(point, value) {
		this.point = point; // in simulation coordinate system (m)
		this.value = value; // Coulumbs
	}
}

class SimulationManager {
	constructor(coordinates, canvas, renderContext) {
		this.cs = coordinates;
		this.canvas = canvas;
		this.renderContext = renderContext;
		this.charges = [];

		this.canvas.on("mouse:down", (info) => {
			if (!info.e.ctrlKey) return;
			var p = [info.e.offsetX, info.e.offsetY];
			var ap = this.cs.pixelsToCoord(p);
			var c = new PointCharge(new jm.Vec2(...ap), 1);
			var g = this.drawCharge(c);
			c.graphics = g;
			this.charges.push(c);
			this.renderField();
		});
		this.canvas.on("object:modified", (info) => {
			var p = [info.target.left, info.target.top];
			var ap = this.cs.pixelsToCoord(p);
			var c = this.charges.find(x => x.graphics == info.target);
			c.point = new jm.Vec2(...ap);
			this.renderField();
		});
		$(canvas.wrapperEl).on('mousewheel', (e) => {
		    var target = canvas.findTarget(e);
		    var delta = e.originalEvent.wheelDelta;
		    if (target) {
				var c = this.charges.find(x => x.graphics == target);
				c.value = (delta > 0) ? c.value + 0.4 : c.value - 0.4;
				this.renderField();
				c.graphics.remove();
				c.graphics = this.drawCharge(c);
			}
		});
	}

	drawCharge(c) {
		var p = this.cs.coordToPixels([c.point.getX(), c.point.getY()]);
		var c = new fabric.Circle({
			originX: "center",
			originY: "center",
			left: p[0],
			top: p[1],
			stroke: "black",
			fill: (c.value < 0 ? "blue" : "red"),
			radius: Math.max(15 * Math.sqrt(Math.abs(c.value)), 8),
			hasControls: false
		});
		this.canvas.add(c);
		return c;
	}

	calcField(point) {

		// Working in cgs units. Simulation coordinates are in cm, and this returns E-field in statV/m

		var sum = new jm.Vec2(0, 0);
		var highComponents = false;
		for (var charge of this.charges) {
			var toPoint = point.clone().sub(charge.point);
			var magSq = toPoint.magSq();
			var contrib = toPoint.norm().scale(charge.value / magSq);
			sum.add(contrib);
		}
		return sum;
	}

	clearField() {
		this.renderContext.clearRect(0, 0, this.cs.realWidth, this.cs.realHeight);
	}

	renderField() {
		this.renderContext.clearRect(0, 0, this.cs.realWidth, this.cs.realHeight);
		this.renderContext.lineWidth = 2.0;
		this.renderContext.strokeStyle = "rgb(50, 50, 50)";

		var gridStep = (this.cs.maxX - this.cs.minX) / 80;
		var maxLength = gridStep * 0.8;

		var vec = new jm.Vec2(0, 0);
		var longest = new jm.Vec2(0.1, 0.1);

		var cx = this.cs.minX;
		while (cx < this.cs.maxX) {
			var cy = this.cs.minY;
			while (cy < this.cs.maxY) {

				vec.set(cx, cy);

				var dists = this.charges.map(x => vec.distSq(x.point));

				var field = this.calcField(vec);

				// "Construct" the arrow in native CS coordinates (maxLength is interpreted in CS coordinates as well)
				if (field.magSq() > maxLength*maxLength) field.norm().scale(maxLength);
				var stepped = vec.clone().add(field);

				// Convert both to pixels here for drawing
				var start = this.cs.coordToPixels([cx, cy]);
				var end = this.cs.coordToPixels([stepped.getX(), stepped.getY()]);

				this.renderContext.beginPath();
				this.renderContext.moveTo(start[0], start[1]);
				this.renderContext.lineTo(end[0], end[1]);
				this.renderContext.stroke();

				cy += gridStep;
			}
			cx += gridStep;
		}
	}
}
