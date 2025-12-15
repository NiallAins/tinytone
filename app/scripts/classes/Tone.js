import { eNodeType, eEnvelKeyHold } from "../common/enums.js";
import { Node } from "./Node.js";
import { BLANK as BLANK_ENVEL } from "../modules/envelope.js";
import { setTone } from "../modules/tone.js";

//
// Protected class
//

export class Tone {
    static BLANK_EFX;
    
    focusedNode = null;
    node = null;
    index;

    constructor() {
        this.node = new Node(
            this,
            eNodeType.Tone,
            () => setTone(this)
        );
        this.index = Node.NODES[eNodeType.Tone].indexOf(this.node);
        this.node.EL.click();
    }

    get tone() {
        const ROUTES = this._compileChildNodes()
            .map(tone => {
                let tex = tone
                    .find(n => n.type === eNodeType.Tex)
                    ?.child;
                if (!tex) {
                    return null;
                }
                let
                    envel = tone    
                        .find(n => n.type === eNodeType.Envel)
                        ?.child || BLANK_ENVEL,
                    efx = tone
                        .filter(n => n.type === eNodeType.Efx)
                        .map(e => e.child);
                
                return {
                    tex,
                    envel,
                    efx,
                    isShadow: false
                };
            })
            .filter(t => t);

        // Extrapolate arpeggios
        ROUTES
            .filter(r => r.envel.isArpegg)
            .forEach(r => r.envel.arpeggEnvels.forEach(arpeggEnvel => {
                const TEX = r.tex.shadowCopy();
                TEX.detune += arpeggEnvel.arpeggChildInterval;
                ROUTES.push({
                    tex: TEX,
                    envel: arpeggEnvel.shadowCopy(),
                    efx: r.efx,
                    isShadow: false
                });
            }));

        // Add additional notes for looping textures with overlapping envelopes
        ROUTES.forEach(r => {
            if (r.envel.keyHold == eEnvelKeyHold.Loop) {
                r.envel = r.envel.shadowCopy();
                const
                    DELAY = r.envel.stages[eEnvelStage.Delay],
                    LOOP = r.envel.stages[eEnvelStage.Loop],
                    RELEASE = r.envel.stages[eEnvelStage.Release];
                if (RELEASE.time - LOOP.time > DELAY.time) {
                    const
                        COPY_COUNT = Math.ceil(RELEASE.time / LOOP.time),
                        LOOP_TIME = LOOP.time * COPY_COUNT;
                    for (let i = 1; i < COPY_COUNT; i++) {
                        const
                            ENVEL = r.envel.shadowCopy(),
                            OFFSET = LOOP.time * i;
                        ENVEL.stages.forEach(s => s.time += OFFSET);
                        ENVEL.stages[eEnvelStage.Loop].time = LOOP_TIME;
                        ROUTES.push({
                            tex: r.tex,
                            envel: ENVEL,
                            efx: r.efx,
                            isShadow: true
                        });
                    }
                    LOOP.time = LOOP_TIME;
                }
            }
            return r;
        });

        return ROUTES;
    }

    _compileChildNodes(node = this, inSlot = 0, children = [], tones = []) {
        children = [node.node, ...children];
        if (node.node.outputs.length) {
            node.node.outputs
                .filter(o => o.outSlot === inSlot)
                .forEach(o => this._compileChildNodes(o, o.inSlot, children, tones));
        } else {
            tones.push(children);
        }
        return tones;
    }
}