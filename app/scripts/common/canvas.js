export function bezierBetween(c, from, to, horizontal = false) {
    const
        MID_X = (to[0] + from[0]) * 0.5,
        MID_Y = (to[1] + from[1]) * 0.5;
    c.lineTo(from[0], from[1]);
    c.bezierCurveTo(
        horizontal ? MID_X : from[0],
        horizontal ? from[1] : MID_Y,
        horizontal ? MID_X : to[0],
        horizontal ? to[1] : MID_Y,
        ...to
    );
}

export function yOnBezier(x, p0, c0, c1, p1) {
    return (
        p0[1] * (1 - 3*x + 3*x**2 - x**3) +
        c0[1] * (3*x - 6*x**2 + 3*x**3) +
        c1[1] * (3*x**2 - 3*x**3) +
        p1[1] * x**3
    );
}

export function clearCanvas(c) {
    c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    c.restore();
}