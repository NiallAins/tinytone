import { MIN_GAIN, MAX_GAIN, MIN_FADE, MIN_FADE_STEP, DEFAULT_MAX_DURATION } from "../common/consts.js";
import { WIDTH, COLOR, REM, FONT_CHART } from "../common/styles.js";
import { eArpeggDirection, eArpeggType, eEnvelKeyHold, eEnvelKeyUp, eEnvelStage, eNodeType } from "../common/enums.js";
import { getEl } from "../common/ui.js";
import { Node } from "../classes/Node.js";
import { Envel } from "../classes/Envel.js";
import { setTile } from "./page.js";
import { currentTone } from "./tone.js";


//
// Public variables
//

export let
    maxDuration = DEFAULT_MAX_DURATION;

export const
    BLANK = new Envel(true);


//
// Private readonly variables
//

const
    CONTROLS = {
        keyUp: [],
        keyHold: [],
        arpegg: null,
        arpeggType: [],
        arpeggDirection: []
    };
let
    INPUTS = null;


//
// Private variables
//

let
    currentEnvel = null;


//
// Public functions
//

export function init() {
    initInputs();
    initCanvas();
    add();
}

export function add() {
    setEnvel(new Envel());
}

export function reRender() {
    INPUTS.render();
}

export function setEnvel(envel) {
    if (currentEnvel !== envel) {
        const OLD_ENVEL = currentEnvel;
        currentEnvel = envel;
        CONTROLS.keyUp[envel._keyUp].checked = true;
        CONTROLS.keyHold[envel._keyHold].checked = true;   
        if (OLD_ENVEL && OLD_ENVEL._isArpegg !== envel._isArpegg) {
            CONTROLS.arpegg.click();
        }
        CONTROLS.arpeggType[envel._arpeggType].checked = true;
        CONTROLS.arpeggDirection[envel._arpeggDirection].checked = true;
        INPUTS.value = envel.stages.map(s => [s.displayTime, s.displayGain]);
        INPUTS.setInputProperty(
            eEnvelStage.Loop,
            'disabled',
            envel.keyHold !== eEnvelKeyHold.Loop || envel.isArpegg
        );
    }
    setTile(eNodeType.Envel);
}

export function updateMaxDuration() {
    let max = Node
        .NODES[eNodeType.Envel]
        .filter(n => n.parentToneIndex === currentTone.index)
        .reduce(
            (max, n) => Math.max(
                max,
                ...n.child.stages
                    .filter((_, si) =>
                        si <= eEnvelStage.Release ||
                        (n.child.keyHold === eEnvelKeyHold.Loop && si === eEnvelStage.Loop)
                    )
                    .map(s => s.time)
            ),
            DEFAULT_MAX_DURATION
        );

    max = Math.ceil(max / WIDTH.durationTick) * WIDTH.durationTick;
    if (max !== maxDuration) {
        maxDuration = max;
        INPUTS.setView({ maxX: maxDuration });
        eEnvelStage
            .toArray()
            .forEach((_, si) =>
                INPUTS.setInputProperty(
                    si,
                    'max',
                    [
                        maxDuration,
                        MAX_GAIN
                    ]
                )
            );
        INPUTS.render();

        Node
            .NODES[eNodeType.Envel]
            .forEach(n => n.child._updatePreview());
    }
}

export function updateInputValue(stage, value) {
    INPUTS.setInputProperty( stage, 'value', value);
}


//
// Private functions
//

function initInputs() {
    const
        EL_CONTAIN = getEl('#EL_ENVEL_INPUTS'),
        EL_KEYHOLD_SUSTAIN = getEl('#EL_ENVEL_INPUTS_KEYHOLD_1'),
        CLASS_ARPEGG_SHOW = 'envel__inputs--arpegg';

    // Key effects
    eEnvelKeyUp
        .toArray()
        .forEach(i => {
            const EL = getEl('#EL_ENVEL_INPUTS_KEYUP_' + i);
            CONTROLS.keyUp.push(EL)
            EL.oninput = () => currentEnvel.keyUp = i;
        });
    eEnvelKeyHold
        .toArray()
        .forEach(i => {
            const EL = getEl('#EL_ENVEL_INPUTS_KEYHOLD_' + i);
            CONTROLS.keyHold.push(EL);
            EL.oninput = () => {
                currentEnvel.keyHold = i;
                currentEnvel._updatePreview();

                INPUTS.setInputProperty(
                    eEnvelStage.Loop,
                    'disabled',
                    i !== eEnvelKeyHold.Loop || currentEnvel.isArpegg
                );
            }
        });

    // Arpeggio
    eArpeggType
        .toArray()
        .forEach(i => {
            const EL = getEl('#EL_ENVEL_INPUTS_TYPE_' + i);
            CONTROLS.arpeggType.push(EL);
            EL.oninput = () => currentEnvel.arpeggType = i
        });
    eArpeggDirection
        .toArray()
        .forEach(i => {
            const EL = getEl('#EL_ENVEL_INPUTS_DIRECTION_' + i);
            CONTROLS.arpeggDirection.push(EL);
            EL.oninput = () => currentEnvel.arpeggDirection = i
        });

    // Detach arpeggio
    getEl('#EL_ENVEL_INPUTS_DETACH').onclick = () => {
        currentEnvel.detachArpegg();
        window.closePanel();
        CONTROLS.arpegg.click();
    };

    // Set arpeggio
    CONTROLS.arpegg = getEl('#EL_ENVEL_INPUTS_ARPEGG');
    CONTROLS.arpegg.oninput = e => {
        if (e.target.checked) {
            EL_CONTAIN.classList.add(CLASS_ARPEGG_SHOW);
            currentEnvel.isArpegg = true;
            INPUTS.setInputProperty(
                eEnvelStage.Offset,
                'disabled',
                false
            );

            INPUTS.setInputProperty(
                eEnvelStage.Loop,
                'disabled',
                currentEnvel.keyHold !== eEnvelKeyHold.Loop || currentEnvel.isArpegg
            );
        } else {
            EL_CONTAIN.classList.remove(CLASS_ARPEGG_SHOW);
            if (currentEnvel.keySustainAll) {
                currentEnvel.keySustain = true;
                EL_KEYHOLD_SUSTAIN.click();
            }
            currentEnvel.isArpegg = false;
            INPUTS.setInputProperty(
                eEnvelStage.Offset,
                'disabled',
                true
            );

            INPUTS.setInputProperty(
                eEnvelStage.Loop,
                'disabled',
                currentEnvel.keyHold !== eEnvelKeyHold.Loop || currentEnvel.isArpegg
            );
        }
        currentEnvel._updatePreview();
    };
}

function initCanvas() {
    const INPUT_ARR = BLANK
        .stages
        .filter((_, si) => si <= eEnvelStage.Release)
        .map((s, si, sArr) => {
            const IS_2D =
                si === eEnvelStage.Attack || si === eEnvelStage.Hold ||
                si === eEnvelStage.Decay || si === eEnvelStage.Sustain;
            return {
                value:    IS_2D ? [s.time, s.gain] : s.time,
                step:     [MIN_FADE_STEP, 0.01],
                y:        IS_2D ? null             : s.gain,
                bindXMax: si < sArr.length - 1 ? { [si + 1]: 'x' } : null,
                oninput: function(value, prevValue, inps) {
                    const DX = value[0] - prevValue[0];
                    inps
                        .filter(inp => inp.index > this.index && inp.index <= eEnvelStage.Release)
                        .forEach(inp => inp.x = inp.x + DX);
                }
            };
        });
        
    // Offset
    INPUT_ARR.push({
        value:    MIN_FADE,
        min:      MIN_FADE_STEP * 5,
        step:     MIN_FADE_STEP,
        y:        MIN_GAIN,
        disabled: true
    });

    // Loop
    INPUT_ARR.push({
        value:    MIN_FADE,
        min:      MIN_FADE_STEP * 10,
        step:     MIN_FADE_STEP,
        y:        MIN_GAIN,
        disabled: true
    });
    
    INPUT_ARR[eEnvelStage.Attack]  .bindY     = { [eEnvelStage.Hold]:    'y' };
    INPUT_ARR[eEnvelStage.Hold]    .bindYMax  = { [eEnvelStage.Attack]:  'y' };
    INPUT_ARR[eEnvelStage.Hold]    .bindYMin  = { [eEnvelStage.Attack]:  'y', [eEnvelStage.Decay]:    'y' };
    INPUT_ARR[eEnvelStage.Decay]   .bindYMax  = { [eEnvelStage.Hold]:    'y', [eEnvelStage.Sustain] : 'y' };
    INPUT_ARR[eEnvelStage.Decay]   .bindYMin  = { [eEnvelStage.Sustain]: 'y' };
    INPUT_ARR[eEnvelStage.Sustain] .bindY     = { [eEnvelStage.Decay]:   'y' }; 
    
    INPUTS = new InputRangeGraph(
        [0, maxDuration, WIDTH.xAxisPad, WIDTH.thumbRadOuter],
        [0, MAX_GAIN, WIDTH.yAxisPad, WIDTH.thumbRadOuter],
        INPUT_ARR,
        renderChart.bind(this)
    );

    INPUTS.ELEMENT.addEventListener('input', e => {
        currentEnvel.updateValues(e.target.value);
    });
    getEl('#EL_ENVEL_CANVAS').appendChild(INPUTS.ELEMENT);
}

function renderChart(c, pts, toPx) {
    const
        X_MAX = toPx(maxDuration, 0),
        Y_MAX = toPx(0, MAX_GAIN),
        ORIGIN = toPx(0, 0);
    pts = pts.map(p => toPx(p));

    // Sections
    c.save();
        let prevP = ORIGIN;
        pts
            .filter((_, pi) => pi <= eEnvelStage.Release)
            .forEach((p, pi) => {
                c.save();
                    c.beginPath();
                        c.moveTo(prevP.x, prevP.y);
                        c.lineTo(p.x, p.y);
                    c.strokeStyle = COLOR.envelStroke[pi];
                    c.lineWidth = WIDTH.envelStroke;
                    c.stroke();
                        c.lineTo(p.x, ORIGIN.y)
                        c.lineTo(prevP.x, ORIGIN.y);
                    c.fillStyle = COLOR.envelFill[pi];
                    c.fill();
                    prevP = p;
                c.restore();
            });
    c.restore();

    // Axis
    c.beginPath();
        c.moveTo(Y_MAX.x, Y_MAX.y - 0.625*REM);
        c.lineTo(ORIGIN.x, ORIGIN.y);
        c.lineTo(X_MAX.x, X_MAX.y);
    c.lineWidth = WIDTH.axisStroke;
    c.strokeStyle = COLOR.axis;
    c.stroke();

    // Ticks
    c.beginPath();
    for (let i = 0; i <= maxDuration; i += WIDTH.durationTick) {
        const PT = toPx(i, 0);
        c.moveTo(PT.x, PT.y);
        c.lineTo(PT.x, PT.y + WIDTH.chartTick);
    }
    c.stroke();

    // Thumbs
    c.lineWidth = WIDTH.thumbStroke;
    pts
        .filter(p => !p.disabled)
        .forEach(p => {
            c.beginPath();
                c.arc(p.x, p.y, WIDTH.thumbRad, 0, Math.PI * 2);
            c.fillStyle = p.hover || p.focus ? COLOR.fg : COLOR.bg;
            c.strokeStyle = COLOR.fg;
            c.fill();
            c.stroke();
            if (p.focus) {
                c.beginPath();
                    c.arc(p.x, p.y, WIDTH.thumbRad + (WIDTH.thumbStroke * 2), 0, Math.PI * 2);
                c.stroke();
            }
        });

    // Labels
    c.font = FONT_CHART;
    c.save();
        c.fillStyle = COLOR.text;
        c.textAlign = 'center';
        c.textBaseline = 'top';
        pts.forEach((p, pi, pArr) => {
            if (!p.disabled) {
                const
                    W = pi <= eEnvelStage.Release
                        ? p.x - (pi ? pArr[pi - 1].x : 0)
                        : WIDTH.chartLabelMin,
                    X = pi <= eEnvelStage.Release
                        ? p.x - (W * 0.5)
                        : p.x,
                    Y = pi <= eEnvelStage.Release
                        ? ORIGIN.y + WIDTH.fontChart
                        : ORIGIN.y - (WIDTH.fontChart * 2);
                if (W >= WIDTH.chartLabelMin) {
                    c.fillText(eEnvelStage[pi], X, Y);
                }
            }
        });
        c.textAlign = 'right';
        if (X_MAX.x - ((pts[pts.length - 3].x + pts[pts.length - 4].x) * 0.5) > 80) {
            c.fillStyle = COLOR.textL;
            c.fillText(
                maxDuration + ' ms',
                X_MAX.x, X_MAX.y + WIDTH.fontChart
            );
        }
        c.translate(WIDTH.xAxisPad * -0.5, 0);
        c.rotate(Math.PI * -0.5);
        c.textBaseline = 'middle';
        c.textAlign = 'right';
        c.fillStyle = COLOR.text;
        c.fillText('Gain', 0, 0);
    c.restore();
}