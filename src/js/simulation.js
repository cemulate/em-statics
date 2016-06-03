var rk4 = require('ode-rk4');
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
			this.renderFieldLines();
		});
		this.canvas.on("object:modified", (info) => {
			var p = [info.target.left, info.target.top];
			var ap = this.cs.pixelsToCoord(p);
			var c = this.charges.find(x => x.graphics == info.target);
			c.point = new jm.Vec2(...ap);
			this.renderFieldLines();
		});
		$(canvas.wrapperEl).on('mousewheel', (e) => {
		    var target = canvas.findTarget(e);
		    var delta = e.originalEvent.wheelDelta;
		    if (target) {
				var c = this.charges.find(x => x.graphics == target);
				c.value = (delta > 0) ? c.value + 0.4 : c.value - 0.4;
				console.log(15 * Math.abs(c.value));
				this.renderFieldLines();
				c.graphics.remove();
				c.graphics = this.drawCharge(c);
			}
		});

		console.log(this);
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
			radius: 15 * Math.abs(c.value),
			hasControls: false
		});
		this.canvas.add(c);
		return c;
	}

	calcField(point) {
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

	renderFieldLines() {

		// Unit vectors in evenly spaced directions
		var directions = [0,1,2,3,4,5,6,7].map(k => new jm.Vec2(Math.cos(2*Math.PI*k/8), Math.sin(2*Math.PI*k/8)));

		this.renderContext.clearRect(0, 0, this.cs.realWidth, this.cs.realHeight);

		var allNegative = true;
		for (var charge of this.charges) {
			if (charge.value > 0) allNegative = false;
		}

		for (var charge of this.charges) {

			//if (!allNegative && charge.value < 0) continue;
			var isNegative = (charge.value < 0);

			for (var dir of directions) {

				// Initial condition
				var start = dir.clone().scale(0.1).add(charge.point);
				console.log(start);

				var vec = new jm.Vec2(0, 0);
				var currentField;

				var solver = rk4([start.getX(), start.getY()], (drdt, r, t) => {
					vec.set(r[0], r[1]);
					currentField = this.calcField(vec);
					drdt[0] = currentField.getX() * (isNegative ? -1 : 1);
					drdt[1] = currentField.getY() * (isNegative ? -1 : 1);
				}, 0, 0.01);

				var as = this.cs.coordToPixels([start.getX(), start.getY()]);

				this.renderContext.beginPath();
				this.renderContext.moveTo(as[0], as[1]);

				var counter = 0;
				var ap;
				var fp = new fabric.Point(0, 0);
				while (true) {
					solver.step();
					ap = this.cs.coordToPixels(solver.y);
					if (counter == 10) {
						if (!this.cs.inRealBounds(ap)) break;
						this.renderContext.lineTo(ap[0], ap[1]);
						counter = 0;
					}

					fp.setXY(...ap);
					if (this.charges.find(x => x.graphics.containsPoint(fp))) break;

					// if (currentField.getX() < 0.1 || currentField.getY() < 0.1) {
					// 	if (currentField.magSq() < 0.05) {
					// 		break;
					// 	}
					// }

					counter += 1;
				}

				this.renderContext.stroke();

			}
		}
	}
}
