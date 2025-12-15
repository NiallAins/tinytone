import { eEffectType, eReverbType, eVibratoType, eNodeType } from "../common/enums.js";
import { WIDTH, COLOR, REM, FONT_CHART } from "../common/styles.js";
import { getEl } from "../common/ui.js";
import { createRangeInput, createRadioButton } from "../common/ui.js";
import { yOnBezier } from "../common/canvas.js";
import { setTile } from "./page.js";
import { Efx } from "../classes/Efx.js";


//
// Private readonly variables
//

const
    ATTACK_X = 0.25,
    SUSTAIN_X = 0.75,
    INPS_TYPE = [],
    INPS_REVERB_TYPE =  [],
    INPS_VIBRATO_TYPE =  [];
let
    INPUTS = null,
    INP_RANGE_DISTORT = null,
    INP_RANGE_VIBRATO = null;


//
// Private variables
//

let
    currentEfx = null;


//
// Public functions
//

export function init() {
    Efx.setDistortCurve();
    initInputs();
}

export function reRender() {
    INPUTS.render()
}

export function add() {
    setEfx(new Efx());
}

export function setEfx(efx) {
    if (currentEfx !== efx) {
        currentEfx = efx;
        INPS_TYPE[efx.type].click();
        INPS_REVERB_TYPE[efx.reverbType].click();
        INPS_VIBRATO_TYPE[efx.vibratoType].click();
        INP_RANGE_DISTORT.value = efx._distortSharpDisplay;
        INP_RANGE_VIBRATO.value = efx._vibratoRateDisplay;
        INPUTS.value = [
            efx.attackLevel,
            (efx.attackLevel + efx.sustainLevel) * 0.5,
            efx.sustainLevel
        ];
    }
    setTile(eNodeType.Efx);
}


//
// Private functions
//

function initInputs() {
    const
        CLASS = 'efx__canvas',
        CLASS_LABEL = CLASS + '-label',
        CLASS_INPUT = CLASS + '-input',
        CLASS_LABEL_SHOW = CLASS_LABEL + '--show',
        EL_CANVAS = getEl('#EL_EFX_CANVAS'),
        EL_INPUTS = getEl('#EL_EFX_INPUTS');

    const
        [EL_SHARP_INP, EL_SHARP] = createRangeInput(0, Efx.DISTORT_SHARPS.length - 1, 0, 1, 'Sharpness'),
        [EL_FREQ_INP, EL_FREQ] = createRangeInput(0.3, 1, 0, 0.01, 'Rate');
    EL_SHARP_INP.oninput = () => {
        currentEfx.distortSharp = parseFloat(EL_SHARP_INP.value);
        INPUTS.render();
    }
    EL_FREQ_INP.oninput = () => {
        currentEfx.vibratoRate = parseFloat(EL_FREQ_INP.value);
        INPUTS.render();
    }
    EL_SHARP.classList.add(CLASS_LABEL, CLASS_LABEL + '--' + eEffectType.Distortion);
    EL_FREQ.classList.add(CLASS_LABEL, CLASS_LABEL + '--' + eEffectType.Vibrato);
    EL_SHARP_INP.classList.add(CLASS_INPUT);
    EL_FREQ_INP.classList.add(CLASS_INPUT);
    EL_CANVAS.appendChild(EL_SHARP);
    EL_CANVAS.appendChild(EL_FREQ);
    INP_RANGE_VIBRATO = EL_FREQ_INP;
    INP_RANGE_DISTORT = EL_SHARP_INP;

    const
        EL_REVERB_CONTAIN = document.createElement('div'),
        CLASS_REVERB = CLASS + '-reverb',
        CLASS_REVERB_SHOW = CLASS_REVERB + '--show';
    EL_REVERB_CONTAIN.classList.add(CLASS_REVERB);

    eReverbType
        .toArray()
        .forEach(i => {
            const [EL_INP, EL] = createRadioButton(i, 'reverbType', eReverbType[i]);
            EL_INP.onclick = () => currentEfx.reverbType = i;
            EL_INP.checked = i === 0;
            INPS_REVERB_TYPE.push(EL_INP);
            EL_REVERB_CONTAIN.appendChild(EL);
        });

    const
        EL_VIBRATO_CONTAIN = document.createElement('div'),
        CLASS_VIBRATO = CLASS + '-vibrato',
        CLASS_VIBRATO_SHOW = CLASS_VIBRATO + '--show';
    EL_VIBRATO_CONTAIN.classList.add(CLASS_VIBRATO);

    eVibratoType
        .toArray()
        .forEach(i => {
        const [EL_INP, EL] = createRadioButton(i, 'vibratoType', eVibratoType[i]);
        EL_INP.onclick = () => {
            currentEfx.vibratoType = i;
            INPUTS.render();
        }
        EL_INP.checked = i === 0;
        INPS_VIBRATO_TYPE.push(EL_INP);
        EL_VIBRATO_CONTAIN.appendChild(EL);
    });

    eEffectType
        .toArray()
        .forEach(i => {
            const [EL_INP, EL] = createRadioButton(i, 'efxType', eEffectType[i]);
            EL_INP.onclick = () => {
                currentEfx.type = i;
                getEl('.' + CLASS_LABEL_SHOW)?.classList.remove(CLASS_LABEL_SHOW);
                getEl('.' + CLASS_LABEL + '--' + Math.min(i, eEffectType.length - 2))?.classList.add(CLASS_LABEL_SHOW);
                INPUTS.render();
                i === eEffectType.Reverb
                    ? EL_REVERB_CONTAIN.classList.add(CLASS_REVERB_SHOW)
                    : EL_REVERB_CONTAIN.classList.remove(CLASS_REVERB_SHOW);
                i === eEffectType.Vibrato || i === eEffectType.Tremolo
                    ? EL_VIBRATO_CONTAIN.classList.add(CLASS_VIBRATO_SHOW)
                    : EL_VIBRATO_CONTAIN.classList.remove(CLASS_VIBRATO_SHOW);
            }
            EL_INP.checked = i === 0;
            INPS_TYPE.push(EL_INP);
            EL_INPUTS.appendChild(EL);
        });

    EL_INPUTS.appendChild(EL_REVERB_CONTAIN);
    EL_INPUTS.appendChild(EL_VIBRATO_CONTAIN);

    let offsetY = 0;
    INPUTS = new InputRangeGraph(
        [0, 1, WIDTH.xAxisPad, WIDTH.thumbRadOuter],
        [0, 1, WIDTH.yAxisPad, WIDTH.thumbRadOuter],
        [
            {
                value: Efx.DEFAULT_LEVEL,
                x: ATTACK_X,
                bindY: { 1: (_, y) => y + offsetY }
            },
            {
                x: (SUSTAIN_X + ATTACK_X) * 0.5,
                min: () => Math.abs(offsetY),
                max: () => 1 - Math.abs(offsetY),
                bindY: {
                    0: (_, y, inps) => {
                        y = (y + inps[2].y) * 0.5;
                        offsetY = inps[0].y - y;
                        return y;
                    },  
                    2: (_, y, inps) => {
                        y = (y + inps[0].y) * 0.5;
                        offsetY = inps[0].y - y;
                        return y;
                    },
                }
            },
            {
                value: Efx.DEFAULT_LEVEL,
                x: SUSTAIN_X,
                bindY: { 1: (_, y) => y - offsetY }
            }
        ],
        renderChart.bind(this)
    );

    INPUTS.ELEMENT.classList.add('efx__canvas-canvas');
    INPUTS.ELEMENT.addEventListener('input', e => {
        currentEfx.updateValues(e.target.value.map(v => v[1]));
    });

    EL_CANVAS.appendChild(INPUTS.ELEMENT);
}

function renderChart(c, pts, toPx) {
    if (!currentEfx) {
        return;
    }

    c.strokeStyle = COLOR.fg;
    c.lineWidth = WIDTH.axisStroke;
    c.lineJoin = 'miter';

    const
        X_MAX = toPx(1, 0),
        X_MID = toPx(0.5, 0),
        Y_MAX = toPx(0, 1),
        ORIGIN = toPx(0, 0);
    pts = pts.map(p => toPx(p));

    // Line
    c.strokeStyle = COLOR.efxStroke[currentEfx.type];
    const LINE_PTS = [];
    if (
        currentEfx.type === eEffectType.Vibrato ||
        currentEfx.type === eEffectType.Tremolo ||
        currentEfx.type === eEffectType.Distortion
    ) {
        const
            P0 = [pts[0].x, pts[0].y],
            C0 = [X_MID.x, pts[0].y],
            C1 = [X_MID.x, pts[2].y],
            P1 = [pts[2].x, pts[2].y],
            OFFSET_FREQ_SIN = 50 + (currentEfx._vibratoRateDisplay * 250),
            OFFSET_FREQ = currentEfx.vibratoType === eVibratoType.Sawtooth
                ? 14 + (60 - (OFFSET_FREQ_SIN / 5))
                : OFFSET_FREQ_SIN,
            OFFSET_AMP = WIDTH.chartPad - WIDTH.axisStroke,
            Q = currentEfx.type === eEffectType.Distortion
                ? 5 - (currentEfx._distortSharpDisplay * 0.75)
                : 1;

        let
            prevP = P0,
            distortI;
        for (let x = ORIGIN.x; x < X_MAX.x; x += Q) {
            let
                lineAng = Math.PI * 0.5,
                pt;
            if (x < P0[0] || x > P1[0]) {
                pt = [
                    x,
                    x < P0[0] ? P0[1] : P1[1]
                ];
            } else {
                pt = [
                    x,
                    yOnBezier(
                        (x - P0[0]) / (P1[0] - P0[0]),
                        P0, C0, C1, P1
                    )
                ];
                lineAng += Math.atan2(pt[1] - prevP[1], pt[0] - prevP[0]);
            }

            prevP = [...pt];

            let offset;
            if (currentEfx.type === eEffectType.Distortion) {
                if (x === 0) {
                    distortI = 231 + INP_RANGE_DISTORT.value;
                    offset = 0;
                } else {
                    distortI = distortI * 16807 % 2147483647;
                    offset = ((distortI / 2147483647) * 2) - 1;
                }
            } else if (currentEfx.vibratoType === eVibratoType.Sawtooth) {
                offset = (((x % OFFSET_FREQ) / OFFSET_FREQ) * -2) + 1;
            } else {
                offset = Math.sin(OFFSET_FREQ * (x / X_MAX.x));
                if (currentEfx.vibratoType === eVibratoType.Square) {
                    offset = offset > 0 ? 1 : -1;
                }
            }
            offset *= OFFSET_AMP;
            offset *= 1 - (pt[1] / ORIGIN.y);
            pt[0] += Math.cos(lineAng) * offset;
            pt[1] += Math.sin(lineAng) * offset;

            LINE_PTS.push(pt);
        }

        if (currentEfx.type === eEffectType.Distortion) {
            LINE_PTS[LINE_PTS.length - 1][1] = pts[2].y;
        }

        c.beginPath();
            LINE_PTS.forEach(pt => c.lineTo(...pt));
        c.stroke();
        currentEfx.updatePreview(LINE_PTS, X_MAX.x - ORIGIN.x, ORIGIN.y - Y_MAX.y);
    } else if (currentEfx.type === eEffectType.Reverb) {
        const
            MAX_DY = 7,
            AY = MAX_DY * currentEfx.attackLevel,
            SY = MAX_DY * currentEfx.sustainLevel;
        [
            [-AY * 2, -SY * 2, 0.25],
            [-AY, -SY, 0.5],
            [0, 0, 1, 1],
            [AY, SY, 0.5, 0.75],
            [AY * 2, SY * 2, 0.25]
        ].forEach(l => {
            c.save();
                const
                    DX = (l[0] * 0.5),
                    A_DY = l[0],
                    S_DY = l[1],
                    P0 = [ORIGIN.x, pts[0].y + A_DY],
                    P1 = [pts[0].x + DX, pts[0].y + A_DY],
                    C0 = [X_MID.x  + DX, pts[0].y + A_DY],
                    C1 = [X_MID.x  + DX, pts[2].y + S_DY],
                    P2 = [pts[2].x + DX, pts[2].y + S_DY],
                    P3 = [X_MAX.x, pts[2].y + S_DY];
                c.globalAlpha = l[2];
                c.beginPath();
                    c.moveTo(...P0);
                    c.lineTo(...P1);
                    c.bezierCurveTo(
                        ...C0,
                        ...C1,
                        ...P2
                    );
                    c.lineTo(...P3);
                c.stroke();
            c.restore();
        });
        currentEfx.updatePreview();
    }

        // Axis
    c.strokeStyle = COLOR.fg;
    c.lineWidth = WIDTH.axisStroke;
    c.beginPath();
        c.moveTo(Y_MAX.x, Y_MAX.y - 0.625*REM);
        c.lineTo(ORIGIN.x, ORIGIN.y);
        c.lineTo(X_MAX.x, X_MAX.y);
    c.stroke();

    // Thumbs
    c.lineWidth = WIDTH.thumbStroke;
    pts.forEach(p => {
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
        c.fillText(
            'Attack',
            pts[0].x,
            ORIGIN.y + WIDTH.fontChart
        );
        c.fillText(
            'Sustain',
            pts[2].x ,
            ORIGIN.y + WIDTH.fontChart
        );
        c.textBaseline = 'middle';
        c.translate(WIDTH.xAxisPad * -0.5, 0);
        c.rotate(Math.PI * -0.5);
        c.textAlign = 'right';
        c.fillText('Effect level', 0, 0);
    c.restore();
}