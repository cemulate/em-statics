$(document).ready(() => {

    console.log($(window).height(), $(".top-bar").outerHeight());
    var [WIDTH, HEIGHT] = [$(window).width(), $(window).height() - $(".top-bar").outerHeight()];
    console.log(WIDTH, HEIGHT);

    $("#canvas").width(WIDTH);
    $("#canvas").height(HEIGHT);

    var canvas = Snap("#canvas");

    var line = canvas.line(0, 0, 100, 100);
    line.attr({
        stroke: "gray",
        strokeWidth: 5
    });

});
