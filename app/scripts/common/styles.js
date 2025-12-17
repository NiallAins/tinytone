//
// Get vars
//

let CSS_VARS = getComputedStyle(document.body);

function _cssVar(name, remToNum = false) {
    const VALUE = CSS_VARS.getPropertyValue('--' + name);
    return remToNum
        ? parseFloat(VALUE) * REM
        : VALUE;
}


//
// Dimensions
//

export const
    REM = parseFloat(_cssVar('w-rem')),
    WIDTH = {
        xAxisPad: 2*REM,
        yAxisPad: 2*REM,
        chartW: 35.5*REM,
        chartH: 16.5*REM,
        chartPad: 1*REM,
        chartTick: 0.5*REM,
        chartLabelMin: 1.5*REM,
        durationTick: 250,
        fontChart: 14,
        axisStroke: 2,
        envelStroke: 3,
        thumbStroke: 1,
        thumbRad: _cssVar('w-thumb-rad', true),
        thumbRadOuter:_cssVar('w-thumb-rad', true) + (3 * 2),
        cursor: 0.5*REM,
        efxStroke: 2,
        texStroke: 2,
        nodeW: _cssVar('w-node', true) - (1*REM) - 2,
        nodeH: _cssVar('h-node', true) - (1*REM) - 2,
        nodeWOuter: _cssVar('w-node', true),
        nodeHOuter: _cssVar('h-node', true),
        nodeStroke: 2,
        nodeGapX: _cssVar('w-node-gap-x', true),
        nodeGapY: _cssVar('w-node-gap-y', true),
        nodeConnectKink: _cssVar('w-node-connect-kink', true),
        nodeConnectBottom: _cssVar('w-node-connect-bottom', true),
        rowHead: _cssVar('w-row-head', true),
        toneStroke: 2,
        toneStrokeBorder: 2,
        toneStrokeRad: 8,
        toneStrokeArcRad: 1*REM
    };


//
// Fonts
//

export const
    FONT_FAMILY = 'Helvetica',
    FONT_CHART = WIDTH.fontChart + 'px ' + FONT_FAMILY;


//
// Color
//

function _setColorOpacity(color, opacity) {
    return color
        .replace(/hsla?/, 'hsla')
        .replace(')', `, ${ 100 * opacity }%)`);
}

const ENVEL_COLOR_ORDER = [0, 0, 8, 3, 6, 1, 0];
export let COLOR = {};

export function setColors() {
    CSS_VARS = getComputedStyle(document.body);

    const HIGHLIGHTS = new Array(_cssVar('c-highlight-count', true) / REM)
        .fill('')
        .map((_, i) => _cssVar('c-highlight-' + i));

    COLOR = {
        bg:     _cssVar('c-bg'),
        bgTile: _cssVar('c-bg-tile'),
        bgXd:   _cssVar('c-bg-xd'),
        fg:     _cssVar('c-fg'),
        text:   _cssVar('c-text'),
        textL:  _cssVar('c-text-l'),
        axis:   _cssVar('c-axis'),
        nodeStroke: _cssVar('c-primary'),
        efxStroke: [
            HIGHLIGHTS[1],
            HIGHLIGHTS[0],
            HIGHLIGHTS[8],
            HIGHLIGHTS[9]
        ],
        envelStroke: ENVEL_COLOR_ORDER.map((c, ci, cArr) => ci && ci < cArr.length - 1
            ? HIGHLIGHTS[c]
            : '#00000000'
        ),
        envelFill: ENVEL_COLOR_ORDER.map((c, ci, cArr) => ci && ci < cArr.length - 1
            ? _setColorOpacity(HIGHLIGHTS[c], 0.3)
            : '#00000000'
        ),
        texStroke: [
            HIGHLIGHTS[1],
            HIGHLIGHTS[0],
            HIGHLIGHTS[4],
            HIGHLIGHTS[3],
            HIGHLIGHTS[2],
            HIGHLIGHTS[9],
            HIGHLIGHTS[5]
        ],
        toneStroke: HIGHLIGHTS,
        toneStrokeDisabled: `#ffffff33`
    };
}