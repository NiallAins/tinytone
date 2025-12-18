import { OVERTONE_COUNT, CAN_QUALITY, OSC_TYPES } from "../common/consts.js";
import { eTexType, eNodeType } from "../common/enums.js";
import { WIDTH, COLOR, REM } from "../common/styles.js";
import { getEl } from "../common/ui.js";
import { createRadioButton, createRangeInput } from "../common/ui.js";
import { clearCanvas } from "../common/canvas.js";
import presets from "../data/presets.js";
import { setTile } from "./page.js";
import { Tex } from "../classes/Tex.js";

//
// Private readonly variables
//

const
    INPS_TYPE = [],
    INPS_PRESET = [],
    INPS_REAL = [],
    INPS_IMG = [];
let
    CTX = null,
    A_CTX = null,
    INP_DEGAIN = null,
    INP_DETUNE = null,
    INP_OCTAVE = null


//
// Private variables
//

let
    canW = 0,
    currentTex = null,
    renderChartTimeout = -1;

    
//
// Public functions
//

export function init() {
    initInputs();
    A_CTX = new AudioContext();
    currentTex = new Tex();
    initCanvas();
}

export function add() {
    setTex(new Tex());
}

export function reRender(tex) {
    renderChart(tex);
}

export function setTex(tex) {
    if (currentTex !== tex) {
        currentTex = tex;
        INPS_TYPE[tex.type].click();
        if (tex.type === eTexType.Preset) {
            INPS_PRESET[tex.presetWave].click();
        }
        INPS_REAL.forEach((inp, i) => inp.value = tex.customWave[0][i + 1]);
        INPS_IMG.forEach((inp, i) => inp.value = tex.customWave[1][i + 1]);
        INP_DETUNE.value = currentTex.detune;
        INP_DEGAIN.value = currentTex.degain;
        INP_OCTAVE.value = currentTex.octave;
        queueRenderChart();
    }
    setTile(eNodeType.Tex);
}

//
// Public 
//

function setType(type, preset = -1) {
    currentTex.wave = type;
    if (type === eTexType.Preset && preset === -1) {
        preset = 0;
    }
    if (preset > -1) {
        currentTex.preset = preset;
    }
    INP_DETUNE.value = currentTex.detune;
    INP_DEGAIN.value = currentTex.degain;
    INP_OCTAVE.value = currentTex.octave;

    queueRenderChart();
}

function initCanvas() {
    const
        CAN = getEl('#EL_CAN_TEX'),
        CAN_H = WIDTH.chartH + 2*WIDTH.chartPad + WIDTH.yAxisPad;

    CAN.height = CAN_H * CAN_QUALITY;
    CAN.style.height = CAN_H + 'px';
    CTX = CAN.getContext('2d');
    
    let windowW = window.innerWidth;
    window.addEventListener('resize', () => {
        if (windowW !== window.innerWidth) {
            updateCanvasSize.bind(this);
            windowW = window.innerWidth;
        }
    });
    updateCanvasSize(currentTex);
}

function updateCanvasSize() {
    const
        EL_CAN_CONTAIN = getEl('#EL_CAN_TEX_CONTAIN'),
        CAN = getEl('#EL_CAN_TEX');

    canW = EL_CAN_CONTAIN.clientWidth;
    CAN.width = canW * CAN_QUALITY;
    CAN.style.maxWidth = canW + 'px';
    CTX.scale(CAN_QUALITY, CAN_QUALITY);
    CTX.translate(WIDTH.chartPad, WIDTH.chartPad);
    CTX.lineCap = 'round';
    CTX.lineJoin = 'bevel';
    CTX.font = `${ WIDTH.fontChart }px Helvetica`;
    CTX.lineWidth = WIDTH.texStroke;
    CTX.fillStyle = COLOR.text;

    queueRenderChart();
}

function initInputs() {
    const
        EL_CONTAIN = getEl('#EL_INP_TEX_CONTAIN'),
        EL_CONTAIN_TYPE = document.createElement('div'),
        EL_CONTAIN_PRESET = document.createElement('div'),
        EL_CONTAIN_OVER = document.createElement('div'),
        OVER_CLASS = 'tex__inputs-overtone',
        PRESET_CLASS = 'tex__inputs-preset';
    EL_CONTAIN_TYPE.classList.add('tex__inputs-type');
    EL_CONTAIN_OVER.classList.add(OVER_CLASS);
    EL_CONTAIN_PRESET.classList.add(PRESET_CLASS);
    
    INP_DEGAIN = getEl('#EL_TEX_INP_DEGAIN');
    INP_DEGAIN.oninput  = event => {
        currentTex.degain  = parseFloat(event.target.value);
        queueRenderChart();
    };
    INP_DETUNE = getEl('#EL_TEX_INP_DETUNE');
    INP_DETUNE.oninput = event => {
        currentTex.detune = parseFloat(event.target.value);
        queueRenderChart();
    };
    INP_OCTAVE = getEl('#EL_TEX_INP_OCTAVE');
    INP_OCTAVE.oninput = event => {
        currentTex.octave = parseInt(event.target.value);
        queueRenderChart();
    };
    
    new Array(eTexType.length)
        .fill('')
        .forEach((_, i) => {
            const [INP, EL] = createRadioButton(i, 'texType', eTexType[i]);
            INP.checked = i === 0;
            INP.oninput = () => {
                EL_CONTAIN_OVER
                    .classList[i === eTexType.Custom ? 'add' : 'remove'](OVER_CLASS + '--open');
                EL_CONTAIN_PRESET
                    .classList[i === eTexType.Preset ? 'add' : 'remove'](PRESET_CLASS + '--open');
                setType(i);
            }
            INPS_TYPE.push(INP);
            EL_CONTAIN_TYPE.appendChild(EL);
        });

    presets
        .map((p, pi)=> createRadioButton(pi, 'texPreset', p.label))
        .forEach((inp, i) => {
            inp[0].checked = i === 0;
            inp[0].oninput = () => setType(eTexType.Preset, i);
            EL_CONTAIN_PRESET.appendChild(inp[1]);
            INPS_PRESET.push(inp[0]);
        });

    for (let i = 1; i <= OVERTONE_COUNT; i++) {
        const
            INP_REAL = createRangeInput(i === 1 ? 5 : 0, 10),
            INP_IMG  = createRangeInput(0, 10);
        INP_REAL.oninput = () => {
            currentTex.setOvertone(i, 0, parseFloat(INP_REAL.value));
            INPS_REAL.push(INP_REAL);
            queueRenderChart();
        }
        INP_IMG.oninput = () => {
            currentTex.setOvertone(i, 1, parseFloat(INP_IMG.value));
            INPS_IMG.push(INP_IMG);
            queueRenderChart();
        }
        EL_CONTAIN_OVER.appendChild(INP_REAL);
        EL_CONTAIN_OVER.appendChild(INP_IMG);
    }

    EL_CONTAIN.appendChild(EL_CONTAIN_TYPE); 
    EL_CONTAIN.appendChild(EL_CONTAIN_OVER);
    EL_CONTAIN.appendChild(EL_CONTAIN_PRESET); 
}

function queueRenderChart() {
    if (renderChartTimeout === -1) {
        renderChartTimeout = setTimeout(
            () => {
                renderChart();
                renderChartTimeout = -1;
            },
            100
        );
    }
}

function renderChart(tex = currentTex) {
    const
        W = canW - WIDTH.xAxisPad,
        FREQ =
            W * 0.5 *
            (0.5 + ((tex.detune + 7) / 14)) *
            (2**tex.octave),
        ANAL_NODE = new AnalyserNode(A_CTX, {
            fftSize: 1024,
            smoothingTimeConstant: 0.8,
        }),
        DATA = new Uint8Array(ANAL_NODE.frequencyBinCount),
        GAIN_NODE = A_CTX.createGain();

    GAIN_NODE.gain.value = tex.degain / 1.5;

    let oscNode;
    
    if (tex.type === eTexType.Noise) {
        const
            BUFF_SIZE = 2 * A_CTX.sampleRate,
            BUFF = A_CTX.createBuffer(1, BUFF_SIZE, A_CTX.sampleRate),
            DATA = BUFF.getChannelData(0);
        let rand = 231;
        for (let i = 0; i < BUFF_SIZE; i++) {
            DATA[i] = ((rand / 2147483647) * 0.1) - 0.05;
            rand = rand = rand * 16807 % 2147483647
        }

        oscNode = A_CTX.createBufferSource();
        oscNode.buffer = BUFF;

        const FILTER = A_CTX.createBiquadFilter();
        FILTER.type = 'peaking';
        FILTER.frequency.value = FREQ;
        FILTER.Q.value = 0.1;
        FILTER.gain.value = 40;

        oscNode
            .connect(FILTER)
            .connect(GAIN_NODE)
            .connect(ANAL_NODE);
    } else {
        oscNode = A_CTX.createOscillator(),
        oscNode.frequency.value = FREQ;
        const WAVE = tex.wave.overtones;
        typeof WAVE === 'string'
            ? oscNode.type = OSC_TYPES[tex.type]
            : oscNode.setPeriodicWave(
                A_CTX.createPeriodicWave(...WAVE)
            );

        oscNode
            .connect(GAIN_NODE)
            .connect(ANAL_NODE);
    }

    oscNode.start();

    setTimeout(() => {
        let PATH = [];
        if (A_CTX.state === 'suspended') {
            for (let i = 0; i < 512; i++) {
                PATH.push([
                    i * (W / 512),
                    (WIDTH.chartH * 0.5) +
                    ((Math.sin(i * 0.036)) * WIDTH.chartH * 0.35)
                ]);
            }
        } else {
            ANAL_NODE.getByteTimeDomainData(DATA);
            oscNode.stop();
            
            DATA.forEach((d, di) => PATH.push([
                di * (W / ANAL_NODE.frequencyBinCount),
                ((d / 128) * WIDTH.chartH) / 2
            ]));
        }

        const C = CTX;
        clearCanvas(C);

        // Wave
        C.strokeStyle = COLOR.texStroke[tex.type];
        C.lineWidth = WIDTH.texStroke;
        C.beginPath();
            for (let i = 0; i < PATH.length; i += 2) {
                C.lineTo(...PATH[i]);
            }
        C.stroke();

        // Ticks, Labels
        C.strokeStyle = COLOR.axis;
        C.fillStyle = COLOR.textL;
        C.textAlign = 'center';
        C.beginPath();
            const
                TICK_COUNT = 16,
                IW = W / TICK_COUNT,
                INTERVALS = {
                        4: 'M3',
                        7: 'P5',
                    11: 'M7',
                    12: '-2',
                    16: '+2'
                },
                Y = WIDTH.chartH;
            for (let i = 0; i <= TICK_COUNT; i++) {
                const X = i * IW;
                C.moveTo(X, Y);
                C.lineTo(X, Y + WIDTH.chartTick);
                if (INTERVALS[i] && window.innerWidth > 34*REM) {
                    C.fillText(
                        INTERVALS[i],
                        X, Y + WIDTH.chartTick + (WIDTH.fontChart * 1.5)
                    );
                }
            }
            C.moveTo(0, 0);
            C.lineTo(0, Y);
            C.lineTo(11 * IW, Y);
            C.moveTo(12 * IW, Y);
            C.lineTo(16 * IW, Y);
        C.lineWidth = WIDTH.axisStroke;
        C.stroke();

        tex.updatePreview(PATH, W);
    }, 100);
}