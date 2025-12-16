import { CAN_QUALITY } from "../common/consts.js";
import { eNodeType } from "../common/enums.js";
import { WIDTH, COLOR } from "../common/styles.js";
import { getEl } from "../common/ui.js";
import { clearCanvas, bezierBetween } from "../common/canvas.js";
import { Node } from "../classes/Node.js";
import { add as addEnvel, updateMaxDuration } from "./envelope.js";
import { add as addTex } from "./texture.js";
import { add as addEfx } from "./effect.js";
import { setTile } from "./page.js";
import { Tone } from "../classes/Tone.js";

//
// Public variables
//

export let
    currentTone = null;


//
// Private readonly variables
//

const
    EL_CONTAIN = getEl('#EL_TONE_CONTAIN'),
    CLASS_SHOW_INPUTS = 'tone--show-inputs';
let
    CTX = null,
    CAN = null;


//
// Private variables
//

let
    selectedOutput = null;


//
// Public functions
//

export function init() {
    document.body.addEventListener('mouseup',    unselectOutput.bind(this));
    document.body.addEventListener('mouseleave', unselectOutput.bind(this));
    document.addEventListener('keydown', e => {
        let move = e.key === '[' ? -1 : e.key === ']' ? 1 : 0;
        if (move) {
            const TONES = Node.NODES[eNodeType.Tone];
            move += TONES.indexOf(currentTone.node);
            TONES[move === -1 ? TONES.length - 1 : move % TONES.length].EL.click();
        }
    });

    initCanvas();
    initInputs();
    currentTone = new Tone();

    const
        TONE_0 = Node.NODES[eNodeType.Tone][0],
        TEX_0 = Node.NODES[eNodeType.Tex][0],
        ENVEL_0 = Node.NODES[eNodeType.Envel][0];
    TONE_0.connectTo(TEX_0, 0, 0);
    TEX_0.connectTo(ENVEL_0, 0, 0);
    currentTone.focusedNode = TEX_0.node;

    renderChart();
}

export function add() {
    currentTone = new Tone();
}

export function reRender() {
    renderChart();
}

export function getAllTones() {
    return Node.NODES[eNodeType.Tone]
        .map(n => n.child.tone)
        .filter(n => n.length);
}

export function updateCanvasWidth() {
    const CAN_W = getEl('#EL_TONE_SCROLL').scrollWidth - WIDTH.rowHead;
    CAN.width = CAN_W * CAN_QUALITY;
    CAN.style.width = CAN_W + 'px';

    CTX.scale(CAN_QUALITY, CAN_QUALITY);
    CTX.lineJoin = 'bevel';
    CTX.lineWidth = WIDTH.toneStroke;

    renderChart();
}

export function setTone(tone) {
    if (currentTone) {
        getEl(`.tone__node--of-tone-${ currentTone.index }:not(.tone__node--arpegg)`, 1)
            .forEach(n => n.style.display = 'none');
    }
    currentTone = tone;
    const
        TONES = Node.NODES[eNodeType.Tone],
        INDEX = TONES.indexOf(currentTone.node),
        PREV = (INDEX === 0 ? TONES.length : INDEX) - 1,
        NEXT = (INDEX + 1) % TONES.length;
    TONES.forEach((t, i) => {
        t.EL.classList.remove('tone__node--prev', 'tone__node--next');
        if (TONES.length > 1) {
            if (i === NEXT) {
                t.EL.classList.add('tone__node--next')
            } else if (i === PREV) {
                t.EL.classList.add('tone__node--prev')
            }
        }
    });
    const NODES = getEl(`.tone__node--of-tone-${ currentTone.index }:not(.tone__node--arpegg)`, 1);
    if (NODES.length) {
        NODES.forEach(n => n.style.display = 'inline-block');
        if (currentTone.focusedNode) {
            currentTone.focusedNode.click();
        }
    } else {
        setTile(-1);
    }
    updateMaxDuration();
    renderChart();
}

export function selectOutput(node, outSlot) {
    selectedOutput = {
        node,
        outSlot
    };
    EL_CONTAIN.classList.add(CLASS_SHOW_INPUTS);
}

export function connectOutput(node, inSlot) {
    const OUTPUT =
        !selectedOutput &&
        node.type === eNodeType.Tex &&
        node.inputs.length === 0
            ? { node: currentTone.node, outSlot: 0 }
            : selectedOutput;

    if (!OUTPUT) {
        node.disconnect(inSlot);
        renderChart();
    } else if (
        OUTPUT.node.type < node.type ||
        (
            OUTPUT.node.type === eNodeType.Efx  &&
            node.type === eNodeType.Efx &&
            !hasRecursion(OUTPUT.node, node)
        )
    ) {
        OUTPUT.node.connectTo(node, OUTPUT.outSlot, inSlot);
        renderChart();
    }
    selectedOutput = null;
}


//
// Private functions
//

function initInputs() {
    const ADD_CALLBACKS = [
        add,
        addTex,
        addEnvel,
        addEfx
    ];

    Object
        .entries(Node.EL_CONTAIN)
        .forEach((n, ni) => {
            const BUTTON = document.createElement('button');
            BUTTON.classList.add(`tone__add`);
            BUTTON.onclick = () => {
                ADD_CALLBACKS[n[0]]();
                const
                    TEXS = Node.NODES[eNodeType.Tex]
                        .filter(n => n.parentToneIndex === currentTone.index && !n.isArpeggChild),
                    ENVELS = Node.NODES[eNodeType.Envel]
                        .filter(n => n.parentToneIndex === currentTone.index && !n.isArpeggChild),
                    EFXS = Node.NODES[eNodeType.Efx]
                        .filter(n => n.parentToneIndex === currentTone.index && !n.isArpeggChild);
                if (ni === eNodeType.Tex) {
                    currentTone.node.connectTo(
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
                updateCanvasWidth();
            };
            n[1].appendChild(BUTTON);
        });
}

function initCanvas() {
    const CAN_H = 
        (WIDTH.nodeGapY * 0.75) +
        ((eNodeType.length - 1) * (WIDTH.nodeGapY + WIDTH.nodeHOuter));

    CAN = getEl('#EL_CAN_TONE');
    CAN.height = CAN_H * CAN_QUALITY;
    CAN.style.height = CAN_H + 'px';
    CTX = CAN.getContext('2d');

    updateCanvasWidth();
}

function unselectOutput() {
    if (selectedOutput) {
        setTimeout(() => {
            selectedOutput = null;
            EL_CONTAIN.classList.remove(CLASS_SHOW_INPUTS);
        });
    }
}

function hasRecursion(currentNode, targetNode) {
    return currentNode === targetNode
        ? true
        : currentNode.type !== eNodeType.Efx
        ? false
        : currentNode.inputs.some(n => hasRecursion(n.node, targetNode));
}

function renderChart() {
    const C = CTX;
    clearCanvas(C);

    if (!currentTone) {
        return;
    }

    const COLORS = getConnectionColors();

    currentTone.node.outputs
        .forEach((o, oi) => renderConnection(
            C,
            currentTone.node, o,
            COLORS[0][0][oi]
        ));

    Object
        .values(Node.NODES)
        .forEach((type, ti) => {
            if (ti !== eNodeType.Tone) {
                type.forEach((node, ni) => node.outputs.length
                    ? node.outputs.forEach(o => renderConnection(C, node, o, COLORS[ti][ni][o.outSlot]))
                    : node.inputs.forEach(i => renderStub(C, node, i.inSlot, COLORS[ti][ni][i.inSlot]))
                )
            }
        });
}

function renderConnection(c, nodeOut, output, colors) {
    const
        PT_OUT = getOutputPosition(nodeOut, output.outSlot),
        PT_IN = getOutputPosition(output.node, output.inSlot, true),
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
}

function renderStub(c, nodeOut, outSlot, colors) {
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
                    PT_OUT = getOutputPosition(nodeOut, outSlot),
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
}

function getConnectionColors(node, ii, color, colors) {
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
        currentTone.node.outputs.forEach(node => {
            const
                TEX_I = Node.NODES[eNodeType.Tex].indexOf(node.node),
                TEX_COLOR = COLOR.toneStroke[TEX_I % COLOR.toneStroke.length];
            colors[0][0].push([TEX_COLOR]);
            getConnectionColors(node.node, 0, TEX_COLOR, colors);
        });
        return colors;
    } else {
        colors[node.type][Node.NODES[node.type].indexOf(node)][ii].add(color);
        node
            .outputs
            .filter(o => o.outSlot === ii)
            .forEach(o => getConnectionColors(o.node, o.inSlot, color, colors));
    }
}

function getOutputPosition(node, outI = 0, isInput = false) {
    const
        TYPE = node.type,
        ACTIVE_NODES = Node.NODES[TYPE]
            .filter(n => n.parentToneIndex === currentTone.index && !n.isArpeggChild),
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