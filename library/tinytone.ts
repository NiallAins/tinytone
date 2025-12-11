//
// Public definitions
//

import { tNote, tNoteObject, tNoteArray, iTone } from './tinytone.defs';

type tNoteObjectSet = {
    freq:    number,
    start:   number,
    sustain: number,
    tone:    number
};

//
// Private definitions
//

declare const $_TONES_: tTonesEncoded;

// Reverb, Distortion, Vibrato, Tremolo
type eEffectType = 0 | 1 | 2 | 3;

// Church, Cave, Bedroom
type eReverbType = 0 | 1 | 2;

// Sine, Square, Sawtooth
type eVibratoType = 0 | 1 | 2;

// Sine, Square, Custom, Sawtooth, Triangle, Preset, Noise
type eWaveType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// None, Sustain, SustainAll, Loop
type eEnvelKeyHold = 0 | 1 | 2 | 3;

// None, Skip
type eEnvelKeyUp = 0 | 1;

type tTonesEncoded = [
    efx: (
        [
            type: 0,
            attackLevel: number,
            sustainLevel: number,
            reverbType: eReverbType
        ] |
        [
            type: 1,
            attackLevel: number,
            sustainLevel: number,
            distortSharp: number
        ] |
        [
            type: 2 | 3,
            attackLevel: number,
            sustainLevel: number,
            vibratoType: eVibratoType,
            vibratoRate: number
        ]
    )[],
    envelDelayTime: number,
    envelAttackTime: number,
    envelAttackGain: number,
    envelHoldTime: number,
    envelHoldGain: number,
    envelDecayTime: number,
    envelDecayGain: number,
    envelSustainTime: number,
    envelSustainGain: number,
    envelReleaseTime: number,
    envelOffsetTime: number,
    envelLoopTime: number,
    texType: eWaveType,
    texDetune: number,
    texDegain: number,
    texOvertones: [] | [number[], number[]],
    keyUp: eEnvelKeyUp,
    keyHold: eEnvelKeyHold,
    attackPreEfx: number,
    attackPostEfx: number,
    sustainPreEfx: number,
    sustainPostEfx: number,
    isShadow: 0 | 1
][][];

type tTone = {
    efx: tEfx[];
    envel: tEnvel;
    tex: tTex;
    keyHold: eEnvelKeyHold;
    keyUp: eEnvelKeyUp;
    attackPreEfx: number;
    attackPostEfx: number;
    sustainPreEfx: number;
    sustainPostEfx: number;
    isShadow: boolean;
};
interface tNoteTone extends Omit<tTone, 'efx'> {
    efx: tEfxNote[];
    oscNode: OscillatorNode | AudioBufferSourceNode;
    gainNodePreEfx: GainNode;
    gainNodePostEfx: GainNode;
    gainNodeEnvel: GainNode;
    startTime: number;
    loopTimeout: number;
    isShadow: boolean;
};

type tEfx = tEfxNoteReverb | tEfxNoteDistort | tEfxNoteVibrato;
interface tEfxNote extends _tEfx {
    gainNodeEfx: GainNode;
};
    type _tEfx = {
        type: eEffectType;
        attackLevel: number;
        sustainLevel: number;
    };
    interface tEfxNoteReverb extends _tEfx {
        reverbType: eReverbType;
    };
    interface tEfxNoteDistort extends _tEfx {
        distortCurve: Float32Array<ArrayBuffer>;
    };
    interface tEfxNoteVibrato extends _tEfx {
        vibratoType: OscillatorType;
        vibratoRate: number;
    };

type tEnvel = {
    time: number,
    gain: number
}[];

type tTex = {
    type: OscillatorType | 'noise',
    detune: number;
    degain: number; 
    overtones: [number[], number[]] | [],
};


//
// Library
//

const Tone: iTone = (function(tonesEncoded: tTonesEncoded) {

    const
        MAX_NOTES = 8,
        GAIN_SCALE_DISTORT = 0.25,
        MIN_FADE = 5,
        MIN_GAIN = 0.0001;

    //
    // Initalisation
    //

    const
        CTX = new AudioContext(),
        IR: ConvolverNode[] = [],
        NOISE = CTX.createBuffer(1, 2 * CTX.sampleRate, CTX.sampleRate);

    const _NOISE_DATA = NOISE.getChannelData(0)
    for (let i = 0; i < 2 * CTX.sampleRate; i++) {
        _NOISE_DATA[i] = (Math.random() * 0.1) - 0.05;
    }

    initIRs();

    async function initIRs() {
        const SOURCE = [
            'https://cdn.freesound.org/previews/732/732451_8772782-lq.mp3',
            'https://cdn.freesound.org/previews/126/126200_4948-lq.mp3',
            'https://cdn.freesound.org/previews/192/192337_3276562-lq.mp3'
        ];
        for (let i = 0; i < SOURCE.length; i++) {
            const
                CONVOLVER = CTX.createConvolver(),
                RESP = await fetch(SOURCE[i]),
                BUFFER = await RESP.arrayBuffer();
            CONVOLVER.buffer = await CTX.decodeAudioData(BUFFER);
            IR.push(CONVOLVER);
        }
    };


    //
    // Tones
    //

    const TONES: tTone[][] = tonesEncoded
        .map(tt => tt
            .map(t => ({
                efx: t[0].map(e => {
                    const EFX = {
                        type: e[0],
                        attackLevel: e[1],
                        sustainLevel: e[2],
                    };
                    if (e[0] === 0) {
                        return {
                            ...EFX,
                            reverbType: e[3]
                        };
                    } else if (e[0] === 1) {
                        const
                            SAMPLES = 2**8,
                            AMOUNT = 75,
                            CURVE = new Float32Array(SAMPLES);
                        for (let i = 0; i < CURVE.length; i++) {
                            if (
                                (e[3] > 1 && i % e[3] === 0) ||
                                (e[3] === 1 && i % 5)
                            ) {
                                CURVE[i] = 0;
                            } else {
                                const X = i * 2 / SAMPLES - 1;
                                CURVE[i] =
                                    ((Math.PI + AMOUNT) * X) /
                                    (Math.PI + (AMOUNT * Math.abs(X)));
                            }
                        }
                        return {
                            ...EFX,
                            distortCurve: CURVE
                        };
                    } else {
                        return {
                            ...EFX,
                            vibratoType: [
                                'sine',
                                'square',
                                'sawtooth'
                            ][e[3]] as OscillatorType,
                            vibratoRate: e[4]
                        };
                    }
                }),
                envel: [
                    { time: t[1], gain: MIN_GAIN },
                    { time: t[2], gain: t[3] },
                    { time: t[4], gain: t[5] },
                    { time: t[6], gain: t[7] },
                    { time: t[8], gain: t[9] },
                    { time: t[10], gain: MIN_GAIN },
                    { time: t[11], gain: MIN_GAIN },
                    { time: t[12], gain: MIN_GAIN }
                ],
                tex: {
                    type: [
                        'sine',
                        'square',
                        'triangle',
                        'sawtooth',
                        'noise',
                        'custom'
                    ][t[13]] as OscillatorType | 'noise',
                    detune: t[14],
                    degain: t[15],
                    overtones: t[16],
                },
                keyUp: t[17],
                keyHold: t[18],
                attackPreEfx: t[19],
                attackPostEfx: t[20],
                sustainPreEfx: t[21],
                sustainPostEfx: t[22],
                isShadow: !!t[23]
            }))
        );

    //
    // Individual note class
    //

    let
        currentNotes: Note[] = [];

    class Note {
        ID;
        TONE: tNoteTone[];
        FINISH_DURATION = 0;
        
        finishTimeout = -1;

        constructor(freq: number, toneIndex: number, id: number = -1) {
            this.ID = id;

            // Tones
            this.TONE = TONES[toneIndex].map(tone => {
                const TONE: tNoteTone = {
                    ...tone,
                    efx: [],
                    oscNode: CTX.createOscillator(),
                    gainNodePreEfx: CTX.createGain(),
                    gainNodePostEfx: CTX.createGain(),
                    gainNodeEnvel: CTX.createGain(),
                    startTime: 0,
                    loopTimeout: -1,
                    isShadow: tone.isShadow
                };

                // Init gains
                const
                    GAIN_NODE_TREMOLO = CTX.createGain(),
                    GAIN_NODE_DEGAIN = CTX.createGain();

                GAIN_NODE_TREMOLO.gain.value = 1;
                GAIN_NODE_DEGAIN.gain.value = TONE.tex.degain;

                GAIN_NODE_TREMOLO
                    .connect(TONE.gainNodePreEfx)
                    .connect(TONE.gainNodeEnvel)
                    .connect(GAIN_NODE_DEGAIN)
                    .connect(TONE.gainNodePostEfx)
                    .connect(CTX.destination);

                // Init oscillator
                const FREQ = freq * TONE.tex.detune;
                let noiseFilter: BiquadFilterNode;
                if (TONE.tex.type === 'noise') {
                    TONE.oscNode = CTX.createBufferSource();
                    TONE.oscNode.buffer = NOISE;
                    TONE.oscNode.loop = true;

                    noiseFilter = CTX.createBiquadFilter();
                    noiseFilter.type = 'peaking';
                    noiseFilter.frequency.value = FREQ;
                    noiseFilter.Q.value = 0.1;
                    noiseFilter.gain.value = 40;

                    TONE.oscNode
                        .connect(noiseFilter)
                        .connect(GAIN_NODE_TREMOLO)
                } else {
                    TONE.oscNode = TONE.oscNode as OscillatorNode;
                    TONE.oscNode.frequency.value = FREQ;

                    if (TONE.tex.type === 'custom') {
                        const PERIOD_WAVE = CTX.createPeriodicWave(...TONE.tex.overtones as [number[], number[]]);
                        TONE.oscNode.setPeriodicWave(PERIOD_WAVE);
                    } else {
                        TONE.oscNode.type = TONE.tex.type;
                    }

                    TONE.oscNode.connect(GAIN_NODE_TREMOLO);
                }

                // Effects
                TONE.efx = tone.efx.map(e => {
                    let gainNodeEfx = CTX.createGain();

                    // Vibrato / Tremelo
                    if (
                        e.type === 2 ||
                        e.type === 3
                    ) {
                        const
                            E = e as tEfxNoteVibrato,
                            MOD_F = CTX.createOscillator();
                        MOD_F.frequency.value = E.vibratoRate;
                        MOD_F.type = E.vibratoType;
                        MOD_F.connect(gainNodeEfx);
                        if (e.type === 2) {
                            gainNodeEfx.connect((noiseFilter || TONE.oscNode as OscillatorNode).frequency);
                        } else {
                            gainNodeEfx.connect(GAIN_NODE_TREMOLO.gain);
                        }
                        MOD_F.start();
                    } else {
                        // Distortion   
                        if (e.type === 1) {
                            const
                                E = e as tEfxNoteDistort,
                                DISTORT = CTX.createWaveShaper(),
                                SCALE_DISTORT = CTX.createGain();
                            SCALE_DISTORT.gain.value = GAIN_SCALE_DISTORT;
                            DISTORT.curve = E.distortCurve;
                            TONE.oscNode
                                .connect(DISTORT)
                                .connect(SCALE_DISTORT)
                                .connect(gainNodeEfx)
                                .connect(TONE.gainNodeEnvel);
                        }

                        // Reverb
                        if (e.type === 0) {
                            const E = e as tEfxNoteReverb;
                            GAIN_NODE_DEGAIN
                                .connect(gainNodeEfx)
                                .connect(IR[E.reverbType!])
                                .connect(CTX.destination);
                        }
                    }

                    return {
                        type: e.type,
                        gainNodeEfx,
                        attackLevel: e.attackLevel,
                        sustainLevel: e.sustainLevel,
                    };
                });

                return TONE;
            });

            // Oscillator stop timeout
            this.FINISH_DURATION = Math.max(
                ...this.TONE.map(t => t.envel[5].time)
            );

            // Save
            currentNotes.push(this);
            if (currentNotes.length > MAX_NOTES) {
                currentNotes[0]._stop();
            }
        }

        start(): void {
            // Start oscillators and zero gains
            this.TONE.forEach(tone => {
                this._setGain(tone.gainNodePreEfx, tone.attackPreEfx);
                tone.efx.forEach(e => this._setGain(e.gainNodeEfx, e.attackLevel));
                this._setGain(tone.gainNodePostEfx, tone.attackPostEfx);
                this._setGain(tone.gainNodeEnvel, MIN_GAIN);
                tone.oscNode.start()
                this._startToneLoop(tone);
            });
        }

        finish(): void {
            let maxDuration = 0;
            this.TONE.forEach(tone => {
                clearInterval(tone.loopTimeout);

                const
                    DT = (new Date().valueOf()) - tone.startTime,
                    PRE_RELEASE = tone.envel[4],
                    RELEASE = tone.envel[5];
                let time;

                // End envelope early, or prevent a delayed loop from starting
                if (
                    (tone.keyUp === 1 && DT < PRE_RELEASE.time) ||
                    (tone.isShadow && tone.keyUp === 0 && DT < tone.envel[0].time)
                ) {
                    time = RELEASE.time - PRE_RELEASE.time;
                    tone.gainNodeEnvel.gain.cancelScheduledValues(CTX.currentTime);
                    this._setGain(tone.gainNodeEnvel);
                    this._setGain(tone.gainNodeEnvel, RELEASE.gain, time);
                }

                // Complete extended sustain
                else if (tone.keyHold === 1) {
                    const
                        TIME_END = RELEASE.time,
                        TIME_START = PRE_RELEASE.time,
                        TIME_DELAY = Math.max(0, TIME_START - DT);
                    time = TIME_DELAY + TIME_END - TIME_START;
                    
                    if (TIME_DELAY === 0) {
                        this._setGain(tone.gainNodeEnvel, PRE_RELEASE.gain);
                    }
                    this._setGain(tone.gainNodeEnvel, RELEASE.gain, time);
                }
                
                // Complete standard note
                else {
                    time = tone.envel[5].time - DT;
                }

                maxDuration = Math.max(maxDuration, time);
            });

            this.finishTimeout = setTimeout(
                () => this._stop(),
                maxDuration
            );
        }

        _startToneLoop(
            tone: tNoteTone
        ): void {
            tone.startTime = new Date().valueOf();

            // Pure / Effect gain
            const
                ATTACK_END_TIME = tone.envel[2].time,
                SUSTAIN_START_TIME = tone.envel[4].time;
            this._setGain(tone.gainNodePreEfx, tone.attackPreEfx, ATTACK_END_TIME);
            this._setGain(tone.gainNodePreEfx, tone.sustainPreEfx, SUSTAIN_START_TIME);
            tone.efx.forEach(e => {
                this._setGain(e.gainNodeEfx, e.attackLevel, ATTACK_END_TIME);
                this._setGain(e.gainNodeEfx, e.sustainLevel, SUSTAIN_START_TIME);
            });
            this._setGain(tone.gainNodePostEfx, tone.attackPostEfx, ATTACK_END_TIME);
            this._setGain(tone.gainNodePostEfx, tone.sustainPostEfx, SUSTAIN_START_TIME);

            // Envelope
            tone
                .envel
                .filter((_, ei) =>
                    ei < 7 &&
                    (
                        ei < 5 ||
                        (
                            ei === 5 &&
                            tone.keyHold !== 1
                        )
                    )
                )
                .forEach(e => this._setGain(
                    tone.gainNodeEnvel,
                    e.gain,
                    e.time
                ));

            // Loop
            if (tone.keyHold === 3) {
                tone.loopTimeout = setTimeout(
                    () => this._startToneLoop(tone),
                    tone.envel[7].time
                );
            }
        }

        _setGain(
            gainNode: GainNode,
            level: number = -1,
            time: number = 0
        ): void {
            if (level === -1) {
                gainNode.gain.setValueAtTime(gainNode.gain.value, CTX.currentTime);
            } else {
                const INITIAL = time === 0;
                level = Math.max(MIN_GAIN, level * 0.5);
                time = CTX.currentTime + (time * 0.001);
                INITIAL
                    ? gainNode.gain.setValueAtTime(level, time)
                    : gainNode.gain.linearRampToValueAtTime(level, time);
            }
        }
        
        _stop(): void {
            clearTimeout(this.finishTimeout);
            currentNotes.splice(currentNotes.indexOf(this), 1);
            this.TONE.forEach(tone => {
                tone.gainNodeEnvel.gain.cancelScheduledValues(CTX.currentTime);
                this._setGain(tone.gainNodeEnvel);
                this._setGain(tone.gainNodeEnvel, MIN_GAIN, MIN_FADE);
                tone.oscNode.stop(CTX.currentTime + MIN_FADE);
            });
        }
    }
    

    //
    // Input parsing
    //

    const
        DEFAULT_NOTE = 440,
        DEFAULT_TEMPO = 400,
        DEFAULT_OCTVAE = 3,
        FREQS = Object.fromEntries(
            [0, 2, 3, 5, 7, 8, 10]
                .map((f, i) => [
                    'BB', 'B', '', '#', '##'
                ]
                    .map((n, ni) => [
                        String.fromCharCode(65 + i) + n,
                        440 * Math.pow(1.0594630943593, f + ni - 2)
                    ])
                )
                .flat()
        );

    function noteToFreq(
        note: undefined | string | number
    ): number {
        if (note === undefined) {
            return DEFAULT_NOTE;
        } else if (typeof note === 'number') {
            return note;
        } else {
            const NOTE = note
                .toUpperCase()
                .match(/^([A-G][#B]*)(-?[0-9]*)$/);
            if (!NOTE || !NOTE[1] || !FREQS[NOTE[1]]) {
                return DEFAULT_NOTE;
            }
            return FREQS[NOTE[1]] * (NOTE[2] ? 2**(parseInt(NOTE[2]) - DEFAULT_OCTVAE) : 1);
        }
    }

    function defaultToneIndex(
        index: number = 0
    ): number {
        return index >= 0 && index < tonesEncoded.length ? index : 0;
    }

    function parseNoteInput(
        notes?: tNote | tNote[] | tNoteArray[] | tNoteObject[],
        tone?: number,
        sustained: boolean = false
    ): tNoteObjectSet[] {
        return (
            typeof notes !== 'object' ||
            notes.length === undefined
                ? [ notes ]
                : notes
        )
            .map((n, ni) => {
                if (typeof n !== 'object') {
                    return {
                        freq:    noteToFreq(n),
                        start:   ni * DEFAULT_TEMPO,
                        sustain: sustained ? - 1 : 0,
                        tone:    defaultToneIndex(tone)
                    };
                } else if ((n as tNoteArray).length === undefined) {
                    n = n as tNoteObject;
                    return {
                        freq:    noteToFreq(n.note),
                        start:   n.start || 0,
                        sustain: sustained ? -1 : (n.sustain || 0),
                        tone:    defaultToneIndex(n.tone ?? tone)
                    };
                } else {
                    n = n as tNoteArray;
                    return {
                        freq:    noteToFreq(n[0]),
                        start:   n[1] || 0,
                        sustain: sustained ? -1 : (n[2] || 0),
                        tone:    defaultToneIndex(n[3] ?? tone)
                    };
                }
            });
    }


    //
    // Public methods
    //

    function start(
        note: tNote | tNoteArray[] | tNoteObject[],
        tone?: number
    ): number {
        const ID = Math.random() * 1e18;
        parseNoteInput(note, tone, true)
            .forEach(n =>
                new Note(n.freq, n.tone, ID)
                    .start()
            );
        return ID;
    }

    function finish(
        id?: number
    ): void {
        currentNotes
            .filter(n => (!id && id !== 0) || n.ID === id)
            .forEach(n => n.finish());
    }

    function play(
        note: tNote | tNote[] | tNoteArray[] | tNoteObject[],
        tone?: number
    ): void {
        parseNoteInput(note, tone)
            .forEach(n => {
                const N = new Note(n.freq, n.tone);
                n.start
                    ? setTimeout(() => N.start(), n.start)
                    : N.start();
                n.start || n.sustain
                    ? setTimeout(() => N.finish(), n.start + n.sustain)
                    : N.finish();
            });
    }

    return {
        start,
        finish,
        play
    };
})($_TONES_);