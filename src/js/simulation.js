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
				if (field.magSq() > maxLength*maxLength) field.norm().scale(maxLength);
				var stepped = vec.clone().add(field);

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

	renderFieldLines() {

		// Unit vectors in evenly spaced directions
		var directions = [0,1,2,3,4,5].map(k => new jm.Vec2(Math.cos(2*Math.PI*k/6), Math.sin(2*Math.PI*k/6)));

		this.renderContext.clearRect(0, 0, this.cs.realWidth, this.cs.realHeight);

		var allNegative = true;
		for (var charge of this.charges) {
			if (charge.value > 0) allNegative = false;
		}

		for (var charge of this.charges) {

			//if (!allNegative && charge.value < 0) continue;
			var isNegative = (charge.value < 0);

			for (var dir of directions) {

				var start = dir.clone().scale(0.1).add(charge.point);

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

				// var start = dir.clone().scale(0.1).add(charge.point);
				//
				// var vec = new jm.Vec2(0, 0);
				// var currentField;
				//
				// var step = (start.getX() - charge.point.getX() > 0) ? 0.001 : -0.001;
				// var solver = rk4([start.getY()], (dydx, y, x) => {
				// 	vec.set(x, y);
				// 	currentField = this.calcField(vec);
				// 	dydx[0] = currentField.getY() / currentField.getX();
				// }, start.getX(), step);
				//
				// var as = this.cs.coordToPixels([start.getX(), start.getY()]);
				//
				// this.renderContext.beginPath();
				// this.renderContext.moveTo(as[0], as[1]);
				//
				// var counter = 0;
				// var ap;
				// while (true) {
				// 	solver.step();
				// 	if (counter == 10) {
				// 		ap = this.cs.coordToPixels([solver.t, solver.y[0]]);
				// 		if (!this.cs.inRealBounds(ap)) break;
				// 		this.renderContext.lineTo(ap[0], ap[1]);
				// 		counter = 0;
				// 	}
				// 	counter += 1;
				// }
				//
				// console.log(solver);
				// this.renderContext.stroke();

			}
		}
	}
}
