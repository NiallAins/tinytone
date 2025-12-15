import { MIN_GAIN, MID_GAIN, MAX_GAIN, MIN_FADE, ARPEGG_TYPE_NOTES } from "../common/consts.js";
import { WIDTH, COLOR } from "../common/styles.js";
import { eArpeggDirection, eArpeggType, eEnvelKeyHold, eEnvelKeyUp, eEnvelStage, eNodeType } from "../common/enums.js";
import { Node } from "./Node.js";
import { currentTone, reRender, updateCanvasWidth } from "../modules/tone.js";
import { clearCanvas } from "../common/canvas.js";
import { Tex } from "./Tex.js";
import { updateMaxDuration } from "../modules/envelope.js";
import { setEnvel } from "../modules/envelope.js";

//
// Protected class
//

export class Envel {
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

    constructor(
        isBlank = false,
        arpeggChildInterval = null,
        isShadowCopy = false
    ) {
        if (arpeggChildInterval !== null) {
            this.arpeggChildInterval = arpeggChildInterval;
        }

        this.stages = eEnvelStage
            .toArray()
            .map(si => {
                const
                    TIME = !isBlank
                        ? Envel._DEFAULT_TIMES[si]
                        : si * MIN_FADE,
                    GAIN = !isBlank
                        ? Envel._DEFAULT_GAINS[si]
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
                () => setEnvel(this),
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
        const ENVEL = new Envel(false, 0, true);
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
                currentTone.node.connectTo(TEX.node, 0, 0);
                Tex._renderChart(TEX);
                TEX.node.connectTo(e.node, inp.outSlot, inp.inSlot);
            });
            this.node.outputs.forEach(out => {
                e.node.connectTo(out.node, out.outSlot, out.inSlot);
            });
            e.node.offset = this.node.inputs.length - 1;
            e.arpeggChildInterval = 0;
            e.node.EL.classList.remove(`tone__node--arpegg`);
            reRender();
        });
        updateInputValue(eEnvelStage.Loop, this.stages[eEnvelStage.Loop].time);
        updateMaxDuration();
        updateCanvasWidth();
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
            this.arpeggEnvels.push(new Envel(false, NOTES[n]));
        }
    }
}