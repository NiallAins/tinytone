import { MIN_GAIN, MID_GAIN, MAX_GAIN, MIN_FADE, MIN_FADE_STEP, DEFAULT_MAX_DURATION, ARPEGG_TYPE_NOTES } from "../common/consts.js";
import { WIDTH, COLOR, REM, FONT_CHART } from "../common/styles.js";
import { eArpeggDirection, eArpeggType, eEnvelKeyHold, eEnvelKeyUp, eEnvelStage, eNodeType } from "../common/enums.js";
import { getEl } from "../common/ui.js";
import { clearCanvas } from "../common/canvas.js";
import { Node } from "./node.js";
import { setTile } from "./page.js";
import { Tone } from "./tone.js";
import { Tex } from "./texture.js";

class _Envel {
    static _DEFAULT_TIMES = [
        0,
        75, 200,
        275, 500,
        750,
        200, 850
    ];
    static _DEFAULT_GAINS = [
        MIN_GAIN,
        MAX_GAIN, MAX_GAIN,
        MID_GAIN, MID_GAIN,
        MIN_GAIN,
        MIN_GAIN, MIN_GAIN
    ];

    stages = [];
    node = null;

    _keyHold = eEnvelKeyHold.Sustain;
    _keyUp = eEnvelKeyUp.None;

    _isArpegg = false;
    _arpeggDirection = eArpeggDirection.Ascend;
    _arpeggType = eArpeggType.Maj;
    arpeggChildInterval = 0;
    arpeggEnvels = [];

    constructor(isBlank = false, arpeggChildInterval = null, isShadowCopy = false) {
        if (arpeggChildInterval !== null) {
            this.arpeggChildInterval = arpeggChildInterval;
        }

        this.stages = eEnvelStage
            .toArray()
            .map(si => {
                const
                    TIME = !isBlank
                        ? _Envel._DEFAULT_TIMES[si]
                        : si * MIN_FADE,
                    GAIN = !isBlank
                        ? _Envel._DEFAULT_GAINS[si]
                        : si <= eEnvelStage.Delay || si >= eEnvelStage.Release
                            ? MIN_GAIN
                            : MAX_GAIN;
                return {
                    time: TIME,
                    displayTime: TIME,
                    gain: GAIN,
                    displayGain: GAIN,
                };
            });

        if (!isBlank && !isShadowCopy) {
            this.node = new Node(
                this,
                eNodeType.Envel,
                () => Envel.setEnvel(this),
                arpeggChildInterval !== null
            );
            if (arpeggChildInterval == null) {
                this.node.EL.click();
            }
            
            this._updatePreview();
        }
    }

    get isArpegg()        { return this._isArpegg; }
    get arpeggDirection() { return this._arpeggDirection; }
    get arpeggType()      { return this._arpeggType; }
    get keyUp()           { return this._keyUp; }
    get keyHold() {
        return this._keyHold === eEnvelKeyHold.SustainAll
            ? eEnvelKeyHold.Sustain
            : this._isArpegg && this._keyHold === eEnvelKeyHold.Sustain
            ? eEnvelKeyHold.None
            : this._keyHold;
    }

    set keyHold(value) {
        this._keyHold = value;
        if (this._isArpegg) {
            this._setArpeggioEnvels();
            this.arpeggEnvels.forEach((e, ei, eArr) => e._keyHold =
                value === eEnvelKeyHold.keySustainAll
                    ? eEnvelKeyHold.keySustain
                    : value !== eEnvelKeyHold.Sustain
                    ? value
                    : ei === eArr.length - 1
                    ? eEnvelKeyHold.Sustain
                    : eEnvelKeyHold.None
            );
            this._updateArpeggEnvelValues();
        }
    }

    set keyUp(value) {
        this._keyUp = value;
        this.arpeggEnvels.forEach(e => e._keyUp = value);
    }

    set isArpegg(value) {
        this._isArpegg = value;
        if (!value) {
            this.arpeggEnvels.forEach(e => e.node.delete());
            this.arpeggEnvels = [];
        }
        if (value && this.arpeggEnvels.length === 0) {
            this.arpeggType = this._arpeggType;
        }
    }

    set arpeggDirection(value) {
        this._arpeggDirection = value;
        this.arpeggType = this._arpeggType;
    }

    set arpeggType(value) {
        this._arpeggType = value;
        this.keyHold = this._keyHold;
        this.keyUp = this._keyUp;
    }
    
    shadowCopy() {
        const ENVEL = new _Envel(false, 0, true);
        this.stages.forEach((s, si) => ENVEL.stages[si] = {
            time: s.time,
            gain: s.gain
        });
        ENVEL._keyHold = this._keyHold;
        ENVEL._keyUp = this._keyUp;
        return ENVEL;
    }

    detachArpegg() {
        this.node.offset = this.node.inputs.length - 1;
        this.arpeggEnvels.forEach(e => {
            e.node.isArpeggChild = false;
            this.node.inputs.forEach(inp => {
                const TEX = inp.node.child.deepCopy();
                TEX.detune += e.arpeggChildInterval;
                Tone.currentTone.node.connectTo(TEX.node, 0, 0);
                Tex._renderChart(TEX);
                TEX.node.connectTo(e.node, inp.outSlot, inp.inSlot);
            });
            this.node.outputs.forEach(out => {
                e.node.connectTo(out.node, out.outSlot, out.inSlot);
            });
            e.node.offset = this.node.inputs.length - 1;
            e.arpeggChildInterval = 0;
            e.node.EL.classList.remove(`tone__node--arpegg`);
            Tone._renderChart();
        });
        Envel.INPUTS.setInputProperty(
            eEnvelStage.Loop,
            'value',
            this.stages[eEnvelStage.Loop].time
        );
        Envel.updateMaxDuration();
        Tone._updateCanvasWidth();
        this.arpeggEnvels = [];
    }

    updateValues(values) {
        values.forEach((v, vi) => {
            this.stages[vi].displayTime = v[0];
            this.stages[vi].displayGain = v[1];
            this.stages[vi].time = v[0];
            this.stages[vi].gain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, v[1]));
        });

        for (let i = 1; i <= eEnvelStage.Release; i++) {
            if (this.stages[i].time - this.stages[i - 1].time < MIN_FADE) {
                this.stages[i].time = this.stages[i - 1].time + MIN_FADE;
            }
        }

        if (this._isArpegg) {
            this._updateArpeggEnvelValues();
        }

        this._updatePreview();
    }

    _updateArpeggEnvelValues() {
        this.stages[eEnvelStage.Loop].time =
            (this.arpeggEnvels.length + 1) *
            this.stages[eEnvelStage.Offset].time;

        this.arpeggEnvels.forEach((e, ei) => {
            e.updateValues(
                this.stages.map((s, si) => [
                    this.stages[si].time + (
                        si <= eEnvelStage.Release 
                            ? (ei + 1) * this.stages[eEnvelStage.Offset].time
                            : 0
                    ),
                    s.gain
                ])
            );
        });
    }

    _updatePreview() {
        const
            C = this.node.CTX,
            P = WIDTH.nodeStroke,
            W = WIDTH.nodeW - (P * 2),
            H = WIDTH.nodeH - (P * 2);
        clearCanvas(C);

        if (this._isArpegg || this._keyHold === eEnvelKeyHold.Loop) {
            C.save();
                C.beginPath();
                    const
                        X = P + ((this.stages[this._isArpegg ? eEnvelStage.Offset : eEnvelStage.Loop].displayTime / Envel.maxDuration) * W),
                        LW = WIDTH.nodeStroke * 1.5;
                    C.fillStyle = COLOR.bgXd;
                    C.fillRect(X - (LW * 0.5), 0, LW, P + H);
                C.fill();
            C.restore();
        }

        C.beginPath();
            C.moveTo(P, P + H);
            this.stages
                .filter((_, si) => si <= eEnvelStage.Release)
                .forEach(s => C.lineTo(
                    P + ((s.displayTime / Envel.maxDuration) * W),
                    P + ((MAX_GAIN - s.displayGain) * H)
                ));
            C.save();
                C.strokeStyle = COLOR.bg;
                C.lineWidth = WIDTH.nodeStroke * 2;
                C.stroke();
            C.restore();
        C.stroke();
    }

    _setArpeggioEnvels() {
        this.arpeggEnvels.forEach(e => e.node.delete());
        this.arpeggEnvels = [];
        const
            NOTES = ARPEGG_TYPE_NOTES[this.arpeggDirection][this.arpeggType],
            COUNT =
                this._keyHold === eEnvelKeyHold.Loop &&
                this._arpeggDirection !== eArpeggDirection.Ascend &&
                this._arpeggDirection !== eArpeggDirection.Descend
                    ? NOTES.length - 1
                    : NOTES.length;
        for (let n = 0; n < COUNT; n++) {
            this.arpeggEnvels.push(new _Envel(false, NOTES[n]));
        }
    }
}

export const Envel = {
    INPUTS: null,
    CONTROLS: {
        keyUp: [],
        keyHold: [],
        arpegg: null,
        arpeggType: [],
        arpeggDirection: []
    },
    maxDuration: DEFAULT_MAX_DURATION,
    BLANK: new _Envel(true),
    currentEnvel: null,

    init() {
        this._initInputs();
        this._initCanvas();
        this.addEnvel();
    },

    addEnvel() {
        this.setEnvel(new _Envel());
    },

    setEnvel(envel) {
        if (this.currentEnvel !== envel) {
            const OLD_ENVEL = this.currentEnvel;
            this.currentEnvel = envel;
            this.CONTROLS.keyUp[envel._keyUp].checked = true;
            this.CONTROLS.keyHold[envel._keyHold].checked = true;   
            if (OLD_ENVEL && OLD_ENVEL._isArpegg !== envel._isArpegg) {
                this.CONTROLS.arpegg.click();
            }
            this.CONTROLS.arpeggType[envel._arpeggType].checked = true;
            this.CONTROLS.arpeggDirection[envel._arpeggDirection].checked = true;
            this.INPUTS.value = envel.stages.map(s => [s.displayTime, s.displayGain]);
            this.INPUTS.setInputProperty(
                eEnvelStage.Loop,
                'disabled',
                envel.keyHold !== eEnvelKeyHold.Loop || envel.isArpegg
            );
        }
        setTile(eNodeType.Envel);
    },

    updateMaxDuration() {
        let max = Node
            .NODES[eNodeType.Envel]
            .filter(n => n.parentToneIndex === Tone.currentTone.index)
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
        if (max !== this.maxDuration) {
            this.maxDuration = max;
            this.INPUTS.setView({ maxX: this.maxDuration });
            eEnvelStage
                .toArray()
                .forEach((_, si) =>
                    this.INPUTS.setInputProperty(
                        si,
                        'max',
                        [
                            this.maxDuration,
                            MAX_GAIN
                        ]
                    )
                );
            this.INPUTS.render();

            Node
                .NODES[eNodeType.Envel]
                .forEach(n => n.child._updatePreview());
        }
    },

    _initInputs() {
        const
            EL_CONTAIN = getEl('#EL_ENVEL_INPUTS'),
            EL_KEYHOLD_SUSTAIN = getEl('#EL_ENVEL_INPUTS_KEYHOLD_1'),
            CLASS_ARPEGG_SHOW = 'envel__inputs--arpegg';

        // Key effects
        eEnvelKeyUp
            .toArray()
            .forEach(i => {
                const EL = getEl('#EL_ENVEL_INPUTS_KEYUP_' + i);
                this.CONTROLS.keyUp.push(EL)
                EL.oninput = () => this.currentEnvel.keyUp = i;
            });
        eEnvelKeyHold
            .toArray()
            .forEach(i => {
                const EL = getEl('#EL_ENVEL_INPUTS_KEYHOLD_' + i);
                this.CONTROLS.keyHold.push(EL);
                EL.oninput = () => {
                    this.currentEnvel.keyHold = i;
                    this.currentEnvel._updatePreview();

                    this.INPUTS.setInputProperty(
                        eEnvelStage.Loop,
                        'disabled',
                        i !== eEnvelKeyHold.Loop || this.currentEnvel.isArpegg
                    );
                }
            });

        // Arpeggio
        eArpeggType
            .toArray()
            .forEach(i => {
                const EL = getEl('#EL_ENVEL_INPUTS_TYPE_' + i);
                this.CONTROLS.arpeggType.push(EL);
                EL.oninput = () => this.currentEnvel.arpeggType = i
            });
        eArpeggDirection
            .toArray()
            .forEach(i => {
                const EL = getEl('#EL_ENVEL_INPUTS_DIRECTION_' + i);
                this.CONTROLS.arpeggDirection.push(EL);
                EL.oninput = () => this.currentEnvel.arpeggDirection = i
            });

        // Detach arpeggio
        getEl('#EL_ENVEL_INPUTS_DETACH').onclick = () => {
            this.currentEnvel.detachArpegg();
            this.CONTROLS.arpegg.click();
        };

        // Set arpeggio
        this.CONTROLS.arpegg = getEl('#EL_ENVEL_INPUTS_ARPEGG');
        this.CONTROLS.arpegg.oninput = e => {
            if (e.target.checked) {
                EL_CONTAIN.classList.add(CLASS_ARPEGG_SHOW);
                this.currentEnvel.isArpegg = true;
                this.INPUTS.setInputProperty(
                    eEnvelStage.Offset,
                    'disabled',
                    false
                );

                this.INPUTS.setInputProperty(
                    eEnvelStage.Loop,
                    'disabled',
                    this.currentEnvel.keyHold !== eEnvelKeyHold.Loop || this.currentEnvel.isArpegg
                );
            } else {
                EL_CONTAIN.classList.remove(CLASS_ARPEGG_SHOW);
                if (this.currentEnvel.keySustainAll) {
                    this.currentEnvel.keySustain = true;
                    EL_KEYHOLD_SUSTAIN.click();
                }
                this.currentEnvel.isArpegg = false;
                this.INPUTS.setInputProperty(
                    eEnvelStage.Offset,
                    'disabled',
                    true
                );

                this.INPUTS.setInputProperty(
                    eEnvelStage.Loop,
                    'disabled',
                    this.currentEnvel.keyHold !== eEnvelKeyHold.Loop || this.currentEnvel.isArpegg
                );
            }
            this.currentEnvel._updatePreview();
        };
    },

    _initCanvas() {
        const INPUT_ARR = Envel.BLANK
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
        
        this.INPUTS = new InputRangeGraph(
            [0, this.maxDuration, WIDTH.xAxisPad, WIDTH.thumbRadOuter],
            [0, MAX_GAIN, WIDTH.yAxisPad, WIDTH.thumbRadOuter],
            INPUT_ARR,
            this._renderChart.bind(this)
        );

        this.INPUTS.ELEMENT.addEventListener('input', e => {
            this.currentEnvel.updateValues(e.target.value);
        });
        getEl('#EL_ENVEL_CANVAS').appendChild(this.INPUTS.ELEMENT);
    },

    _renderChart(c, pts, toPx) {
        const
            X_MAX = toPx(this.maxDuration, 0),
            Y_MAX = toPx(0, MAX_GAIN),
            ORIGIN = toPx(0, 0);
        pts = pts.map(p => toPx(p));

        // Sections
        c.save();
            let prevP = ORIGIN;
            pts.forEach((p, pi) => {
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
        for (let i = 0; i <= this.maxDuration; i += WIDTH.durationTick) {
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
                    this.maxDuration + ' ms',
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
};