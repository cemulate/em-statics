$(document).ready(() => {

    var [WIDTH, HEIGHT] = [$(window).width(), $(window).height() - $(".top-bar").outerHeight()];

    $("#canvas").width(WIDTH);
    $("#canvas").height(HEIGHT);

    // The fabric canvas offers us an easy way to throw up some circles, and drag and drop them by default
    var canvas = new fabric.Canvas("canvas");
    canvas.setWidth(WIDTH);
    canvas.setHeight(HEIGHT);

    // We use a second canvas underneath the fabric canvas to render the field lines
    // The field line rendering method can then access the raw graphics context of this canvas
    // and draw the many lines more efficiently.
    var renderCanvas = $("#canvas").clone();
    renderCanvas.attr("id", "renderCanvas");
    $(".canvas-container").prepend(renderCanvas);
    var context = $("#renderCanvas").get(0).getContext("2d");

    var cs = new CoordinateSystem(WIDTH, HEIGHT);
    cs.calculateTransformation();

    var sim = new SimulationManager(cs, canvas, context);

});
