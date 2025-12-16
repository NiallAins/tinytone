import { OVERTONE_COUNT } from "../common/consts.js";
import { eTexType, eNodeType } from "../common/enums.js";
import { WIDTH } from "../common/styles.js";
import { clearCanvas } from "../common/canvas.js";
import PRESETS from "../data/presets.js";
import { Node } from "./Node.js";
import { setTex } from "../modules/texture.js";


//
// Protected class
//

export class Tex {
    static REL_GAIN = {
        [eTexType.Sine]: 1,
        [eTexType.Square]: 0.12,
        [eTexType.Triangle]: 0.75,
        [eTexType.Sawtooth]: 0.2,
        [eTexType.Noise]: 0.5,
        [eTexType.Custom]: 0.75,
        [eTexType.Preset]: 0.75
    };

    detune = 0;
    degain = 1;
    octave = 0;
    type = eTexType.Sine;
    presetWave = 0;
    customWave = [
        [0, 5, ...(new Array(OVERTONE_COUNT - 1).fill(0))],
        [0, 0, ...(new Array(OVERTONE_COUNT - 1).fill(0))]
    ];

    node;

    constructor(isShadowCopy = false, isDeepCopy = false) {
        if (!isShadowCopy) {
            this.node = new Node(
                this,
                eNodeType.Tex,
                () => setTex(this)
            );
            if (!isDeepCopy) {
                this.node.EL.click();
            }
        }
    }

    set wave(type) {
        this.degain = Tex.REL_GAIN[type];
        this.octave = 0;
        this.type = type;
    }

    set preset(type) {
        this.presetWave = type;
        this.octave = PRESETS[type].octave;
    }

    get wave() {
        return {
            octave: this.octave,
            overtones: this.type === eTexType.Custom
                ? this.customWave
                : this.type === eTexType.Preset
                ? PRESETS[this.presetWave].overtones
                : eTexType[this.type]
        };
    }

    shadowCopy() {
        const COPY = new Tex(true);
        COPY.detune = this.detune;
        COPY.degain = this.degain;
        COPY.octave = this.octave;
        COPY.type = this.type;
        COPY.presetWave = this.presetWave;
        COPY.customWave = this.customWave;
        return COPY;
    }

    deepCopy() {
        const COPY = new Tex(false, true);
        COPY.detune = this.detune;
        COPY.degain = this.degain;
        COPY.type = this.type;
        COPY.presetWave = this.presetWave;
        COPY.customWave.octave = this.octave;
        COPY.customWave.overtones = [
            ...this.customWave[0],
            ...this.customWave[1]
        ];
        return COPY;
    }

    setOvertone(i, type, value) {
        this.customWave[type][i] = value;
    }

    updatePreview(path, canW) {
        const C = this.node.CTX;
        clearCanvas(C);

        C.save();

        C.translate(WIDTH.nodeStroke, WIDTH.nodeStroke);
        C.scale(
            (WIDTH.nodeW - (2 * WIDTH.nodeStroke)) / canW,
            (WIDTH.nodeH - (2 * WIDTH.nodeStroke)) / WIDTH.chartH
        );
        C.beginPath();
        path.forEach(p => C.lineTo(...p));

        C.restore();
        C.stroke();
    }
}