import { WIDTH } from "../common/styles.js";
import { clearCanvas } from "../common/canvas.js";
import { eEffectType, eNodeType, eReverbType, eVibratoType } from "../common/enums.js";
import { Node } from "./Node.js";
import { setEfx } from "../modules/effect.js";

//
// Protected class
//

export class Efx {
    static DEFAULT_LEVEL = 0.5;
    static DISTORT_CURVE; 
    static DISTORT_SHARPS = [0, 150, 33, 5, 2, 1];
    static MAX_VIBRATO_RANGE = 100;
    static MIN_VIBRATO_RATE = 0.5;
    static MAX_VIBRATO_RATE = 25;

    static setDistortCurve() {
        const
            SAMPLES = 2**8,
            AMOUNT = 75;

        this.DISTORT_CURVE = new Float32Array(SAMPLES);
        for (let i = 0; i < SAMPLES; i++) {
            const X = i * 2 / SAMPLES - 1;
            this.DISTORT_CURVE[i] =
                ((Math.PI + AMOUNT) * X) /
                (Math.PI + (AMOUNT * Math.abs(X)));
        }
    }

    _distortSharpDisplay;
    _vibratoRate;
    _vibratoRateDisplay;
    vibratoType = eVibratoType.Sine;
    reverbType = eReverbType.Church;
    type = eEffectType.Reverb;
    attackLevel = Efx.DEFAULT_LEVEL;
    sustainLevel = Efx.DEFAULT_LEVEL;
    distortCurve = new Float32Array(Efx.DISTORT_N);

    constructor() {
        this.attackLevel
            = this.sustainLevel
            = this.attackFreq
            = this.sustainFreq
                = Efx.DEFAULT_LEVEL;

        this.distortSharp = 0;
        this.vibratoRate = 0.3;

        this.node = new Node(
            this,
            eNodeType.Efx,
            () => setEfx(this)
        );
        this.node.EL.click();
    }

    set distortSharp(value) {
        this._distortSharpDisplay = value;
        const S = Efx.DISTORT_SHARPS[value];
        this.distortCurve = new Float32Array(Efx.DISTORT_CURVE);
        for (let i = 0; i < Efx.DISTORT_CURVE.length; i++) {
            if (
                (S > 1 && i % S === 0) ||
                (S === 1 && i % 5)
            ) {
                this.distortCurve[i] = 0;
            } 
        }
    }

    set vibratoRate(value) {
        this._vibratoRateDisplay = value;
        this._vibratoRate = Efx.MIN_VIBRATO_RATE + ((value ** 2) * (Efx.MAX_VIBRATO_RATE - Efx.MIN_VIBRATO_RATE));
    }
    
    get vibratoRate() {
        return this._vibratoRate;
    }

    get vibratoRangeAttack() {
        return (this.attackLevel**2) * Efx.MAX_VIBRATO_RANGE;
    }

    get vibratoRangeSustain() {
        return (this.sustainLevel**2) * Efx.MAX_VIBRATO_RANGE;
    }

    updateValues(values) {
        this.attackLevel = values[0];
        this.sustainLevel = values[2];
    }

    updatePreview(pts, canWidth = 1, canHeight = 1) {
        const C = this.node.CTX;
        clearCanvas(C);

        C.beginPath();
            C.save();
                C.translate(0, WIDTH.nodeStroke);
                C.scale(
                    WIDTH.nodeW / canWidth,
                    (WIDTH.nodeH - (WIDTH.nodeStroke * 2)) / canHeight,
                );
                if (pts) {
                    for (let i = 0; i < pts.length; i += 10) {
                        C.lineTo(...pts[i]);
                    }
                } else {
                    const
                        AY = 1 - this.attackLevel,
                        SY = 1 - this.sustainLevel;
                    C.moveTo(0, AY);
                    C.lineTo(0.25, AY);
                    C.bezierCurveTo(0.5, AY, 0.5, SY, 0.75, SY);
                    C.lineTo(1, SY);
                }
            C.restore();
        C.stroke();
    }
}