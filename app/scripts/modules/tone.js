import { CAN_QUALITY } from "../common/consts.js";
import { eNodeType, eEnvelKeyHold } from "../common/enums.js";
import { WIDTH, COLOR } from "../common/styles.js";
import { getEl } from "../common/ui.js";
import { clearCanvas, bezierBetween } from "../common/canvas.js";
import { Node } from "./node.js";
import { Envel } from "./envelope.js";
import { setTile } from "./page.js";

class _Tone {
    static BLANK_ENVEL;
    static BLANK_EFX;
    
    focusedNode = null;
    node = null;
    index;

    constructor() {
        this.node = new Node(
            this,
            eNodeType.Tone,
            () => Tone.setTone(this)
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
                        ?.child || _Tone.BLANK_ENVEL,
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

export const Tone = {
    EL_CONTAIN: getEl('#EL_TONE_CONTAIN'),
    CLASS_SHOW_INPUTS: 'tone--show-inputs',
    CTX: null,
    CAN: null,
    currentTone: null,
    selectedOutput: null,

    init(addCallbacks, blankEnvel) {
        document.body.addEventListener('mouseup',    this.unselectOutput.bind(this));
        document.body.addEventListener('mouseleave', this.unselectOutput.bind(this));
        document.addEventListener('keydown', e => {
            if (e.shiftKey && e.code.slice(0, 5) === 'Digit') {
                const TONE_NODE = Node.NODES[eNodeType.Tone][parseInt(e.code[5]) - 1];
                if (TONE_NODE) {
                    TONE_NODE.EL.click();
                    e.stopPropagation();
                };
            }
        });

        _Tone.BLANK_ENVEL = blankEnvel;

        this._initCanvas();
        this._initInputs(addCallbacks);
        this.currentTone = new _Tone();

        const
            TONE_0 = Node.NODES[eNodeType.Tone][0],
            TEX_0 = Node.NODES[eNodeType.Tex][0],
            ENVEL_0 = Node.NODES[eNodeType.Envel][0];
        TONE_0.connectTo(TEX_0, 0, 0);
        TEX_0.connectTo(ENVEL_0, 0, 0);
        this.currentTone.focusedNode = TEX_0.node;

        this._renderChart();
    },

    addTone() {
        this.currentTone = new _Tone();
    },

    setTone(tone) {
        if (this.currentTone) {
            getEl(`.tone__node--of-tone-${ this.currentTone.index }:not(.tone__node--arpegg)`, 1)
                .forEach(n => n.style.display = 'none');
        }
        this.currentTone = tone;
        const NODES = getEl(`.tone__node--of-tone-${ this.currentTone.index }:not(.tone__node--arpegg)`, 1);
        if (NODES.length) {
            NODES.forEach(n => n.style.display = 'inline-block');
            if (this.currentTone.focusedNode) {
                this.currentTone.focusedNode.click();
            }
        } else {
            setTile(-1);
        }
        Envel.updateMaxDuration();
        this._renderChart();
    },

    getAllTones() {
        return Node.NODES[eNodeType.Tone]
            .map(n => n.child.tone)
            .filter(n => n.length);
    },

    selectOutput(node, outSlot) {
        this.selectedOutput = {
            node,
            outSlot
        };
        this.EL_CONTAIN.classList.add(this.CLASS_SHOW_INPUTS);
    },

    unselectOutput() {
        if (this.selectedOutput) {
            setTimeout(() => {
                this.selectedOutput = null;
                this.EL_CONTAIN.classList.remove(this.CLASS_SHOW_INPUTS);
            });
        }
    },

    _connectOutput(node, inSlot) {
        const OUTPUT =
            !this.selectedOutput &&
            node.type === eNodeType.Tex &&
            node.inputs.length === 0
                ? { node: this.currentTone.node, outSlot: 0 }
                : this.selectedOutput;

        if (!OUTPUT) {
            node.disconnect(inSlot);
            this._renderChart();
        } else if (
            OUTPUT.node.type < node.type ||
            (
                OUTPUT.node.type === eNodeType.Efx  &&
                node.type === eNodeType.Efx &&
                !this._hasRecursion(OUTPUT.node, node)
            )
        ) {
            OUTPUT.node.connectTo(node, OUTPUT.outSlot, inSlot);
            this._renderChart();
        }
        this.selectedOutput = null;
    },

    _hasRecursion(currentNode, targetNode) {
        return currentNode === targetNode
            ? true
            : currentNode.type !== eNodeType.Efx
            ? false
            : currentNode.inputs.some(n => this._hasRecursion(n.node, targetNode));
    },

    _initInputs(addCallbacks) {
        Object
            .entries(Node.EL_CONTAIN)
            .forEach((n, ni) => {
                const BUTTON = document.createElement('button');
                BUTTON.classList.add(`tone__add`);
                BUTTON.onclick = () => {
                    addCallbacks[n[0]]();
                    const
                        TEXS = Node.NODES[eNodeType.Tex]
                            .filter(n => n.parentToneIndex === this.currentTone.index && !n.isArpeggChild),
                        ENVELS = Node.NODES[eNodeType.Envel]
                            .filter(n => n.parentToneIndex === this.currentTone.index && !n.isArpeggChild),
                        EFXS = Node.NODES[eNodeType.Efx]
                            .filter(n => n.parentToneIndex === this.currentTone.index && !n.isArpeggChild);
                    if (ni === eNodeType.Tex) {
                        this.currentTone.node.connectTo(
                            Node.NODES[eNodeType.Tex][Node.NODES[eNodeType.Tex].length - 1],
                            0, 0
                        );
                        if (ENVELS[TEXS.length - 1]?.inputs.length === 0) {
                            TEXS[TEXS.length - 1].connectTo(
                                ENVELS[TEXS.length - 1],
                                0, 0
                            );
                        }
                    } else if (ni === eNodeType.Envel) {
                        if (TEXS[ENVELS.length - 1]?.outputs.length === 0) {
                            TEXS[ENVELS.length - 1].connectTo(
                                ENVELS[ENVELS.length - 1],
                                0, 0
                            );
                        }
                    } else if (ni === eNodeType.Efx) {
                        if (EFXS.length === 1) {
                            if (ENVELS.length > 0) {
                                ENVELS.forEach(e => {
                                    if (e.inputs.length > 0) {
                                        e.connectTo(
                                            EFXS[0],
                                            0, 0
                                        )
                                    }
                                });
                            } else {
                                TEXS.forEach(t => {
                                    if (t.inputs.length > 0) {
                                        t.connectTo(
                                            EFXS[0],
                                            0, 0
                                        )
                                    }
                                });
                            }
                        } else {
                            const LAST = EFXS.filter((e, ei) =>
                                ei !== EFXS.length - 1 &&
                                e.inputs.length > 0 &&
                                e.outputs.length === 0
                            );
                            if (LAST.length === 1) {
                                LAST[0].connectTo(
                                    EFXS[EFXS.length - 1],
                                    0, 0
                                );
                            }
                        }
                    }
                    this._updateCanvasWidth();
                };
                n[1].appendChild(BUTTON);
            });
    },

    _initCanvas() {
        const CAN_H = 
            (WIDTH.nodeGapY * 0.75) +
            ((eNodeType.length - 1) * (WIDTH.nodeGapY + WIDTH.nodeHOuter));

        this.CAN = getEl('#EL_CAN_TONE');
        this.CAN.height = CAN_H * CAN_QUALITY;
        this.CAN.style.height = CAN_H + 'px';
        this.CTX = this.CAN.getContext('2d');

        this._updateCanvasWidth();
    },

    _updateCanvasWidth() {
        const CAN_W = getEl('#EL_TONE_SCROLL').scrollWidth - WIDTH.rowHead;
        this.CAN.width = CAN_W * CAN_QUALITY;
        this.CAN.style.width = CAN_W + 'px';

        this.CTX.scale(CAN_QUALITY, CAN_QUALITY);
        this.CTX.lineJoin = 'bevel';
        this.CTX.lineWidth = WIDTH.toneStroke;

        this._renderChart();
    },

    _renderChart() {
        const C = this.CTX;
        clearCanvas(C);

        if (!this.currentTone) {
            return;
        }

        const COLORS = this._getConnectionColors();

        this.currentTone.node.outputs
            .forEach((o, oi) => this._renderConnection(
                C,
                this.currentTone.node, o,
                COLORS[0][0][oi]
            ));

        Object
            .values(Node.NODES)
            .forEach((type, ti) => {
                if (ti !== eNodeType.Tone) {
                    type.forEach((node, ni) => node.outputs.length
                        ? node.outputs.forEach(o => this._renderConnection(C, node, o, COLORS[ti][ni][o.outSlot]))
                        : node.inputs.forEach(i => this._renderStub(C, node, i.inSlot, COLORS[ti][ni][i.inSlot]))
                    )
                }
            });
    },

    _renderConnection(c, nodeOut, output, colors) {
        const
            PT_OUT = this._getOutputPosition(nodeOut, output.outSlot),
            PT_IN = this._getOutputPosition(output.node, output.inSlot, true),
            ARC_RAD = WIDTH.toneStrokeArcRad;
        colors = Array.from(colors);
        if (!colors || colors.length === 0) {
            colors = [COLOR.toneStrokeDisabled];
        }
        [COLOR.bgTile, COLOR.bgTile, ...colors].forEach((color, ci) => {
            c.strokeStyle = color;
            c.lineWidth = WIDTH.toneStroke + (ci < 2 ? WIDTH.toneStrokeBorder * 2 : 0);
            ci = ci === 0
                ? (colors.length > 1 ? colors.length - 1 : 0)
                : ci === 1
                ? (colors.length > 1 ? colors.length - 2 : -1)
                : ci - 2;
            if (ci > -1) {
                const
                    OFFSET_D =
                        Math.ceil((ci % 6) * 0.5) *
                        (ci % 2 ? 1 : -1) *
                        WIDTH.toneStroke * 1.25,
                    OFFSET_A = Math.atan2(PT_OUT[1] - PT_IN[1], PT_OUT[0] - PT_IN[0]) - (Math.PI * 0.5),
                    OFFSET_X = Math.cos(OFFSET_A) * OFFSET_D,
                    OFFSET_Y = Math.sin(OFFSET_A) * OFFSET_D;
                c.beginPath();
                    c.moveTo(...PT_OUT);
                    if (PT_IN[1] > PT_OUT[1]) {
                        const
                            TO_LEFT = PT_OUT[0] > PT_IN[0],
                            ARC_RAD_X = ARC_RAD * (TO_LEFT ? -1 : 1),
                            ARC_END_OUT = [
                                PT_OUT[0] + ARC_RAD_X + OFFSET_X,
                                PT_OUT[1] - ARC_RAD - WIDTH.nodeConnectKink + OFFSET_Y
                            ],
                            ARC_END_IN = [
                                PT_IN[0] - ARC_RAD_X + OFFSET_X,
                                PT_IN[1] + ARC_RAD + WIDTH.nodeConnectKink + OFFSET_Y
                            ];
                        c.arc(
                            ARC_END_OUT[0],
                            ARC_END_OUT[1] + ARC_RAD,
                            ARC_RAD,
                            TO_LEFT ? 0 : Math.PI, Math.PI * 1.5, TO_LEFT
                        );
                        bezierBetween(c, ARC_END_OUT, ARC_END_IN, true);
                        c.arc(
                            ARC_END_IN[0],
                            ARC_END_IN[1] - ARC_RAD,
                            ARC_RAD, Math.PI * 0.5, TO_LEFT ? Math.PI : 0, !TO_LEFT
                        );
                    } else {
                        c.lineTo(PT_OUT[0], PT_OUT[1] - WIDTH.nodeConnectKink);
                        bezierBetween(
                            c,
                            [PT_OUT[0] + OFFSET_X, PT_OUT[1] - WIDTH.nodeConnectKink + OFFSET_Y],
                            [PT_IN[0] + OFFSET_X, PT_IN[1] + WIDTH.nodeConnectKink + OFFSET_Y]
                        );
                        c.lineTo(PT_IN[0], PT_IN[1] + WIDTH.nodeConnectKink);
                    }
                    c.lineTo(...PT_IN);
                c.stroke();
            }
        });
    },

    _renderStub(c, nodeOut, outSlot, colors) {
        colors = Array.from(colors);
        if (!colors || colors.length === 0) {
            colors = [COLOR.toneStrokeDisabled];
        }
        [COLOR.bgTile, COLOR.bgTile, ...colors].forEach((color, ci) => {
            c.strokeStyle = color || COLOR.toneStrokeDisabled;
            c.lineWidth = WIDTH.toneStroke + (ci < 2 ? WIDTH.toneStrokeBorder * 2 : 0);
            ci = ci === 0
                ? (colors.length > 1 ? colors.length - 1 : 0)
                : ci === 1
                ? (colors.length > 1 ? colors.length - 2 : -1)
                : ci - 2;
            if (ci > -1) {
                c.beginPath();
                    const
                        PT_OUT = this._getOutputPosition(nodeOut, outSlot),
                        OFFSET =
                            Math.min(Math.ceil(ci * 0.5), 2) *
                            (ci % 2 ? 1 : -1) *
                            WIDTH.toneStroke;
                    c.moveTo(...PT_OUT);
                    c.lineTo(PT_OUT[0] + OFFSET, PT_OUT[1] - WIDTH.nodeConnectKink);
                    c.lineTo(PT_OUT[0] + OFFSET, PT_OUT[1] - (WIDTH.nodeConnectKink * 1.5));
                c.stroke();
            }
        });
    },

    _getConnectionColors(node, ii, color, colors) {
        if (!node) {
            colors = Object
                .values(Node.NODES)
                .map((t, ti) => t
                    .map(() => ti === eNodeType.Tone
                        ? []
                        : new Array(Node.MAX_OUT)
                            .fill()
                            .map(() => new Set())
                    )
                );
            this.currentTone.node.outputs.forEach(node => {
                const
                    TEX_I = Node.NODES[eNodeType.Tex].indexOf(node.node),
                    TEX_COLOR = COLOR.toneStroke[TEX_I % COLOR.toneStroke.length];
                colors[0][0].push([TEX_COLOR]);
                this._getConnectionColors(node.node, 0, TEX_COLOR, colors);
            });
            return colors;
        } else {
            colors[node.type][Node.NODES[node.type].indexOf(node)][ii].add(color);
            node
                .outputs
                .filter(o => o.outSlot === ii)
                .forEach(o => this._getConnectionColors(o.node, o.inSlot, color, colors));
        }
    },

    _getOutputPosition(node, outI = 0, isInput = false) {
        const
            TYPE = node.type,
            ACTIVE_NODES = Node.NODES[TYPE]
                .filter(n => n.parentToneIndex === this.currentTone.index && !n.isArpeggChild),
            NODE_I = TYPE === eNodeType.Tone
                ? node.child.index
                : ACTIVE_NODES.indexOf(node),
            OFFSET_X = ACTIVE_NODES
                .filter((_, ni) => ni < NODE_I)
                .reduce((sum, n) => sum + n._offset, 0),
            COUNT = node.availableInputs;
        return [
            Math.floor(
                ((NODE_I + OFFSET_X) * (WIDTH.nodeWOuter + WIDTH.nodeGapX)) +
                ((WIDTH.nodeWOuter / COUNT) * outI) +
                ((WIDTH.nodeWOuter / COUNT) * 0.5) +
                0.5
            ),
            Math.floor(
                (WIDTH.nodeGapY * 0.75) +
                ((eNodeType.length - TYPE - 1) * (WIDTH.nodeHOuter + WIDTH.nodeGapY)) +
                (isInput ? WIDTH.nodeHOuter : 0 ) +
                (WIDTH.nodeConnectBottom * (TYPE === 0 ? 0 : isInput ? 1 : -1))
            )
        ];
    }
};