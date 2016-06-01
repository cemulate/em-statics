class PointCharge {
	constructor(point, value) {
		this.point = point; // in simulation coordinate system (m)
		this.value = value; // Coulumbs
	}
}

class SimulationManager {
	constructor() {
		this.coords = new CoordinateSystem(WIDTH, HEIGHT);
		this.coords.autoSetFromWidth(10);
		this.transform = this.coords.getMatrix();

		this.gridStep = 0.5; // Meters
		this.grid = null;
		this.E = null;

		this.calculateGridPoints();

		this.charges = [];

	}

	calculateGridPoints() {
		var points = [];
		var cx = this.coords.minX;
		var cy = this.coords.minY;
		while (cx < this.coords.maxX) {
			while (cy < this.coords.maxY) {
				points.push({x: cx, y: cy});
				cy += this.gridStep;
			}
			cx += this.gridStep;
		}
		this.grid = points;
	}
}
