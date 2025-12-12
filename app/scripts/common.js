
//
// Enums
//

function Enum(...props) {
    return Object.fromEntries([
        ...props.map((p, pi) => [p, pi]),
        ...props.map((p, pi) => [pi, p]),
        ['length', props.length],
        [
            'toArray',
            () => new Array(props.length)
                .fill(0)
                .map((_, i) => i)
        ]
    ]);
}

const
    eNodeType = Enum(
        'Tone',
        'Tex',
        'Envel',
        'Efx'
    ),
    eEffectType = Enum(
        'Reverb',
        'Distortion',
        'Vibrato',
        'Tremolo'
    ),
    eReverbType = Enum(
        'Church',
        'Cave',
        'Bedroom'
    ),
    eVibratoType = Enum(
        'Sine',
        'Square',
        'Sawtooth'
    ),
    eEnvelStage = Enum(
        'Delay',
        'Attack',
        'Hold',
        'Decay',
        'Sustain',
        'Release',
        'Offset',
        'Loop'
    ),
    eEnvelKeyHold = Enum(
        'None',
        'Sustain',
        'SustainAll',
        'Loop'
    ),
    eEnvelKeyUp = Enum(
        'None',
        'Skip'
    ),
    eArpeggType = Enum(
        'Maj',
        'Min',
        'Maj7',
        'Min7',
        'Dom7'
    ),
    eArpeggDirection = Enum(
        'Ascend',
        'Descend',
        'AscendFirst',
        'DescendFirst'
    ),
    eWaveType = Enum(
        'Sine',
        'Square',
        'Triangle',
        'Sawtooth',
        'Noise',
        'Custom',
        'Preset'
    );


//
// Labels / strings
//

const
    PAGE_CLASS = [
        'page--about',
        'page--create',
        'page--export'
    ],
    ARPEGG_TYPE_NOTES = {
        [eArpeggDirection.Ascend]: {
            [eArpeggType.Maj]:  [4, 7, 12],
            [eArpeggType.Min]:  [3, 7, 12],
            [eArpeggType.Maj7]: [4, 7, 11, 12],
            [eArpeggType.Min7]: [3, 7, 10, 12],
            [eArpeggType.Dom7]: [4, 7, 10, 12]
        },
        [eArpeggDirection.Descend]: {
            [eArpeggType.Maj]:  [-5, -8, -12],
            [eArpeggType.Min]:  [-5, -9, -12],
            [eArpeggType.Maj7]: [-1, -5, -8, -12],
            [eArpeggType.Min7]: [-2, -5, -9, -12],
            [eArpeggType.Dom7]: [-2, -5, -8, -12]
        },
        [eArpeggDirection.AscendFirst]: {
            [eArpeggType.Maj]:  [4, 7, 12, 7, 4, 0],
            [eArpeggType.Min]:  [3, 7, 12, 7, 3, 0],
            [eArpeggType.Maj7]: [4, 7, 11, 12, 11, 7, 4, 0],
            [eArpeggType.Min7]: [3, 7, 10, 12, 10, 7, 3, 0],
            [eArpeggType.Dom7]: [4, 7, 10, 12, 10, 7, 4, 0]
        },
        [eArpeggDirection.DescendFirst]: {
            [eArpeggType.Maj]:  [-5, -8, -12, -8, -5, 0],
            [eArpeggType.Min]:  [-5, -9, -12, -9, -5, 0],
            [eArpeggType.Maj7]: [-1, -5, -8, -12, -8, -5, -1, 0],
            [eArpeggType.Min7]: [-2, -5, -9, -12, -9, -5, -2, 0],
            [eArpeggType.Dom7]: [-2, -5, -8, -12, -8, -5, -2, 0]
        },
    },
    OSC_TYPES = {
        [eWaveType.Sine]: 'sine',
        [eWaveType.Square]: 'square',
        [eWaveType.Sawtooth]: 'sawtooth',
        [eWaveType.Triangle]: 'triangle',
    };

    
//
// Global constants
//

const
    CAN_QUALITY = 2,
    TWELVE_RT_2 = 1.059463,
    OVERTONE_COUNT = 8,
    MIN_FADE = 5,
    MIN_FADE_STEP = 10,
    MAX_GAIN = 1,
    MAX_DEGAIN = 1.25,
    MID_GAIN = 0.5,
    MIN_GAIN = 0.00001,
    DEFAULT_MAX_DURATION = 1500,
    MS_TO_S = 0.001,
    TONES_PLACEHOLDER_STRING = '$_TONES_';


//
// Styling variables
//

function _cssVar(name, remToNum = false) {
    const VALUE = _CSS_VARS.getPropertyValue('--' + name);
    return remToNum
        ? parseFloat(VALUE) * REM
        : VALUE;
}

function _setColorOpacity(color, opacity) {
    return color
        .replace(/hsla?/, 'hsla')
        .replace(')', `, ${ 100 * opacity }%)`);
}

let _CSS_VARS = getComputedStyle(document.body);

const
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

const
    FONT_FAMILY = 'Helvetica',
    FONT_CHART = WIDTH.fontChart + 'px ' + FONT_FAMILY;

const
    ENVEL_COLOR_ORDER = [0, 0, 8, 3, 6, 1, 0];
let
    HIGHLIGHTS = [],
    COLOR = {};

function setColors() {
    _CSS_VARS = getComputedStyle(document.body);
    HIGHLIGHTS = new Array(_cssVar('c-highlight-count', true) / REM)
        .fill('')
        .map((_, i) => _cssVar('c-highlight-' + i)),
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
setColors();


//
// UI helpers
//

function getEl(query, isArray) {
    const ELS = Array.from(document.querySelectorAll(query));
    return isArray === 1
        ? ELS
        : isArray === -1
        ? ELS[0]
        : ELS.length === 0
        ? null
        : ELS.length === 1
        ? ELS[0]
        : ELS;
}

function createRangeInput(value, max = 1, min = 0, step = 0.01, label) {
    const INPUT = document.createElement('input');
    INPUT.type = 'range';
    INPUT.min = min;
    INPUT.max = max;
    INPUT.step = step;
    INPUT.value = value;
    if (label) {
        const
            LABEL = document.createElement('label'),
            ID = 'inputRange_' + Math.random().toString().substring(2);
        INPUT.id = ID;
        LABEL.setAttribute('for', ID);
        LABEL.innerHTML = `<span> ${ label } </span>`;
        LABEL.appendChild(INPUT);
        return [INPUT, LABEL];
    } else {
        return INPUT;
    }
}

function createRadioButton(value, name, label) {
    const
        ID = `radioButton__${ name }_${ value }`,
        LABEL = document.createElement('label'),
        INPUT = document.createElement('input');

    LABEL.classList.add('radio-button');
    LABEL.setAttribute('for', ID);
    if (label) {
        LABEL.innerText = label;
    }

    INPUT.type = 'radio';
    INPUT.classList.add('radio-button__input');
    INPUT.setAttribute('id', ID);
    INPUT.name = name;
    INPUT.value = value;

    LABEL.appendChild(INPUT);

    return [INPUT, LABEL];
}

function createCheckbox(label) {
    const
        ID = `check__${ label }`,
        LABEL = document.createElement('label'),
        INPUT = document.createElement('input');

    LABEL.classList.add('checkbox');
    LABEL.setAttribute('for', ID);
    if (label) {
        LABEL.innerText = label;
    }

    INPUT.type = 'checkbox';
    INPUT.classList.add('checkbox__input');
    INPUT.setAttribute('id', ID);
    LABEL.appendChild(INPUT);

    return [INPUT, LABEL];
}

function curveThrough(c, from, to) {
    c.lineTo(...from);
    c.bezierCurveTo(
        from[0], to[1],
        from[0], to[1],
        from[0] - (to[1] - from[1]), to[1]
    );
    c.lineTo(...to);
}


//
// Canvas helpers
//

function bezierBetween(c, from, to, horizontal = false) {
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

function yOnBezier(x, p0, c0, c1, p1) {
    return (
        p0[1] * (1 - 3*x + 3*x**2 - x**3) +
        c0[1] * (3*x - 6*x**2 + 3*x**3) +
        c1[1] * (3*x**2 - 3*x**3) +
        p1[1] * x**3
    );
}

function clearCanvas(c) {
    c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    c.restore();
}