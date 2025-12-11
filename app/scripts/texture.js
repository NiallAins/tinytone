class _Tex {
    static REL_GAIN = {
        [eWaveType.Square]: 0.35,
        [eWaveType.Sawtooth]: 0.35,
        [eWaveType.Triangle]: 1.15,
        [eWaveType.Noise]: 0.45
    };

    detune = 0;
    degain = 1;
    octave = 0;
    type = eWaveType.Sine;
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
                () => Tex.setTex(this)
            );
            if (!isDeepCopy) {
                this.node.EL.click();
            }
        }
    }

    set wave(type) {
        if (this.degain === (_Tex.REL_GAIN[this.type] || 1)) {
            this.degain = _Tex.REL_GAIN[type] || 1;
        }

        this.type = type;
    }

    set preset(type) {
        this.presetWave = type;
        this.octave = PRESETS[type].octave;
    }

    get wave() {
        return {
            octave: this.octave,
            overtones: this.type === eWaveType.Custom
                ? this.customWave
                : this.type === eWaveType.Preset
                ? PRESETS[this.presetWave].overtones
                : eWaveType[this.type]
        };
    }

    shadowCopy() {
        const COPY = new _Tex(true);
        COPY.detune = this.detune;
        COPY.degain = this.degain;
        COPY.octave = this.octave;
        COPY.type = this.type;
        COPY.presetWave = this.presetWave;
        COPY.customWave = this.customWave;
        return COPY;
    }

    deepCopy() {
        const COPY = new _Tex(false, true);
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

const Tex = {
    CTX: null,
    A_CTX: null,
    CAN_W: 0,
    INPS_TYPE: [],
    INP_DEGAIN: null,
    INP_DETUNE: null,
    INP_OCTAVE: null,
    currentTex: null,
    _renderChartTimeout: -1,

    init() {
        this._initInputs();
        this.A_CTX = new AudioContext();
        this.currentTex = new _Tex();
        this._initCanvas();
    },

    addTex() {
        this.setTex(new _Tex());
    },

    setTex(tex) {
        if (this.currentTex !== tex) {
            this.currentTex = tex;
            this.INPS_TYPE[tex.type].click();
            this.INP_DETUNE.value = this.currentTex.detune;
            this.INP_DEGAIN.value = this.currentTex.degain;
            this.INP_OCTAVE.value = this.currentTex.octave;
            this._queueRenderChart();
        }
        Main.setTile(eNodeType.Tex);
    },

    _setTexType(type, preset = -1) {
        this.currentTex.wave = type;
        if (type === eWaveType.Preset && preset === -1) {
            preset = 0;
        }
        if (preset > -1) {
            this.currentTex.preset = preset;
        }
        this.INP_DETUNE.value = this.currentTex.detune;
        this.INP_DEGAIN.value = this.currentTex.degain;
        this.INP_OCTAVE.value = this.currentTex.octave;
        this._queueRenderChart();
    },

    _initCanvas() {
        const
            CAN = getEl('#EL_CAN_TEX'),
            CAN_H = WIDTH.chartH + 2*WIDTH.chartPad + WIDTH.yAxisPad;

        CAN.height = CAN_H * CAN_QUALITY;
        CAN.style.height = CAN_H + 'px';
        this.CTX = CAN.getContext('2d');
        
        window.addEventListener('resize', this._updateCanvasSize.bind(this));
        this._updateCanvasSize(this.currentTex);
    },

    _updateCanvasSize() {
        const
            EL_CAN_CONTAIN = getEl('#EL_CAN_TEX_CONTAIN'),
            CAN = getEl('#EL_CAN_TEX');

        this.CAN_W = EL_CAN_CONTAIN.clientWidth;
        CAN.width = this.CAN_W * CAN_QUALITY;
        CAN.style.maxWidth = this.CAN_W + 'px';
        this.CTX.scale(CAN_QUALITY, CAN_QUALITY);
        this.CTX.translate(WIDTH.chartPad, WIDTH.chartPad);
        this.CTX.lineCap = 'round';
        this.CTX.lineJoin = 'bevel';
        this.CTX.font = `${ WIDTH.fontChart }px Helvetica`;
        this.CTX.lineWidth = WIDTH.texStroke;
        this.CTX.fillStyle = COLOR.text;

        this._queueRenderChart();
    },

    _initInputs() {
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
        
        this.INP_DEGAIN = getEl('#EL_TEX_INP_DEGAIN');
        this.INP_DEGAIN.oninput  = event => {
            this.currentTex.degain  = parseFloat(event.target.value);
            this._queueRenderChart();
        };
        this.INP_DETUNE = getEl('#EL_TEX_INP_DETUNE');
        this.INP_DETUNE.oninput = event => {
            this.currentTex.detune = parseFloat(event.target.value);
            this._queueRenderChart();
        };
        this.INP_OCTAVE = getEl('#EL_TEX_INP_OCTAVE');
        this.INP_OCTAVE.oninput = event => {
            this.currentTex.octave = parseInt(event.target.value);
            this._queueRenderChart();
        };
        
        new Array(eWaveType.length)
            .fill('')
            .forEach((_, i) => {
                const [INP, EL] = createRadioButton(i, 'texType', eWaveType[i]);
                INP.checked = i === 0;
                INP.oninput = () => {
                    EL_CONTAIN_OVER
                        .classList[i === eWaveType.Custom ? 'add' : 'remove'](OVER_CLASS + '--open');
                    EL_CONTAIN_PRESET
                        .classList[i === eWaveType.Preset ? 'add' : 'remove'](PRESET_CLASS + '--open');
                    this._setTexType(i);
                }
                this.INPS_TYPE.push(INP);
                EL_CONTAIN_TYPE.appendChild(EL);
            });

        PRESETS
            .map((p, pi)=> createRadioButton(pi, 'texPreset', p.label))
            .forEach((inp, i) => {
                inp[0].checked = i === 0;
                inp[0].oninput = () => this._setTexType(eWaveType.Preset, i);
                EL_CONTAIN_PRESET.appendChild(inp[1]);
            });

        for (let i = 1; i <= OVERTONE_COUNT; i++) {
            const
                INP_REAL = createRangeInput(i === 1 ? 5 : 0, 10),
                INP_IMG  = createRangeInput(0, 10);
            INP_REAL.oninput = () => {
                this.currentTex.setOvertone(i, 0, parseFloat(INP_REAL.value));
                this._queueRenderChart();
            }
            INP_IMG.oninput = () => {
                this.currentTex.setOvertone(i, 1, parseFloat(INP_IMG.value));
                this._queueRenderChart();
            }
            EL_CONTAIN_OVER.appendChild(INP_REAL);
            EL_CONTAIN_OVER.appendChild(INP_IMG);
        }

        EL_CONTAIN.appendChild(EL_CONTAIN_TYPE); 
        EL_CONTAIN.appendChild(EL_CONTAIN_OVER);
        EL_CONTAIN.appendChild(EL_CONTAIN_PRESET); 
    },

    _queueRenderChart() {
        if (this._renderChartTimeout === -1) {
            this._renderChartTimeout = setTimeout(
                () => {
                    this._renderChart();
                    this._renderChartTimeout = -1;
                },
                100
            );
        }
    },

    _renderChart(tex = this.currentTex) {
        const
            W = this.CAN_W - WIDTH.xAxisPad;
            FREQ =
                W * 0.5 *
                (0.5 + ((tex.detune + 7) / 14)) *
                (2**tex.octave),
            ANAL_NODE = new AnalyserNode(this.A_CTX, {
                fftSize: 1024,
                smoothingTimeConstant: 0.8,
            }),
            DATA = new Uint8Array(ANAL_NODE.frequencyBinCount),
            GAIN_NODE = this.A_CTX.createGain();

        GAIN_NODE.gain.value = tex.degain / 1.5;

        let oscNode;
        
        if (tex.type === eWaveType.Noise) {
            const
                BUFF_SIZE = 2 * this.A_CTX.sampleRate,
                BUFF = this.A_CTX.createBuffer(1, BUFF_SIZE, this.A_CTX.sampleRate),
                DATA = BUFF.getChannelData(0);
            let rand = 231;
            for (let i = 0; i < BUFF_SIZE; i++) {
                DATA[i] = ((rand / 2147483647) * 0.1) - 0.05;
                rand = rand = rand * 16807 % 2147483647
            }

            oscNode = this.A_CTX.createBufferSource();
            oscNode.buffer = BUFF;

            const FILTER = this.A_CTX.createBiquadFilter();
            FILTER.type = 'peaking';
            FILTER.frequency.value = FREQ;
            FILTER.Q.value = 0.1;
            FILTER.gain.value = 40;

            oscNode
                .connect(FILTER)
                .connect(GAIN_NODE)
                .connect(ANAL_NODE);
        } else {
            oscNode = this.A_CTX.createOscillator(),
            oscNode.frequency.value = FREQ;
            const WAVE = tex.wave.overtones;
            typeof WAVE === 'string'
                ? oscNode.type = OSC_TYPES[tex.type]
                : oscNode.setPeriodicWave(
                    this.A_CTX.createPeriodicWave(...WAVE)
                );

            oscNode
                .connect(GAIN_NODE)
                .connect(ANAL_NODE);
        }

        oscNode.start();

        setTimeout(() => {
            let PATH = [];
            if (this.A_CTX.state === 'suspended') {
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

            const C = this.CTX;
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
};