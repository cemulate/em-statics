class CoordinateSystem {
	constructor(realWidth, realHeight) {
		this.realWidth = realWidth;
		this.realHeight = realHeight;

		this.maxX = 10;
		this.minX = -10;
		this.maxY = 10;
		this.minY = -10;
	}

	autoSetFromWidth(width) {
		// Sets left, top, width, and height such that the resultant coordinate system has the origin in the middle of the screen,
		// the desired width given, and a height determined from the width such that the aspect ratio is 1:1

		this.minX = (-width) / 2;
		this.maxX = width / 2;

		var h = (width / this.realWidth) * this.realHeight;

		this.maxy = h / 2;
		this.miny = -h / 2;
	}

	getMatrix() {
		var left = this.minX;
		var top = this.maxY;
		var width = this.maxX - this.minX;
		var height = -(this.maxY - this.minY);

		var tx = ((0 - left) / width) * this.realWidth;
		var ty = ((0 - top) / height) * this.realHeight;

		var sx = (1 / width) * this.realWidth;
		var sy = (1 / height) * this.realHeight;

		return {sx, sy, tx, ty};
	}
}
