$(document).ready(() => {

    var [WIDTH, HEIGHT] = [$(window).width(), $(window).height() - $(".top-bar").outerHeight()];

    $("#canvas").width(WIDTH);
    $("#canvas").height(HEIGHT);

    var canvas = new fabric.Canvas("canvas");
    canvas.setWidth(WIDTH);
    canvas.setHeight(HEIGHT);

    var renderCanvas = $("#canvas").clone();
    renderCanvas.attr("id", "renderCanvas");
    $(".canvas-container").prepend(renderCanvas);
    var context = $("#renderCanvas").get(0).getContext("2d");

    var cs = new CoordinateSystem(WIDTH, HEIGHT);
    cs.calculateTransformation();

    var sim = new SimulationManager(cs, canvas, context);

});
