class _Note {
    static NOTES = [];
    static GAIN_SCALE = 0.5;
    static GAIN_SCALE_DISTORT = 0.25;

    ID = Math.random() * 1e18;
    CTX = null;
    TONE = [];
    FINISH_DURATION = 0;
    
    finishTimeout = -1;

    constructor(ctx, tone, freq) {
        this.CTX = ctx;

        // Tones
        this.TONE = tone.map(tone => {
            // Init gains
            const
                GAIN_NODE_TREMOLO = ctx.createGain(),
                GAIN_NODE_PRE_EFX = ctx.createGain(),
                GAIN_NODE_POST_EFX = ctx.createGain(),
                GAIN_NODE_ENVEL = ctx.createGain(),
                GAIN_NODE_DEGAIN = ctx.createGain();

            GAIN_NODE_TREMOLO.gain.value = 1;
            GAIN_NODE_DEGAIN.gain.value = tone.tex.degain / MAX_DEGAIN;

            // Pure texture
            GAIN_NODE_TREMOLO
                .connect(GAIN_NODE_PRE_EFX)
                .connect(GAIN_NODE_ENVEL)
                .connect(GAIN_NODE_DEGAIN)
                .connect(GAIN_NODE_POST_EFX)
                .connect(ctx.destination);

            // Init texture
            const FREQ = 
                freq *
                (2**tone.tex.wave.octave) *
                Math.pow(TWELVE_RT_2, tone.tex.detune);

            let oscNode;
            let oscNodeFilter;
            if (tone.tex.type === eWaveType.Noise) {
                const
                    BUFF_SIZE = 2 * ctx.sampleRate,
                    BUFF = ctx.createBuffer(1, BUFF_SIZE, ctx.sampleRate),
                    DATA = BUFF.getChannelData(0);
                for (let i = 0; i < BUFF_SIZE; i++) {
                    DATA[i] = (Math.random() * 0.1) - 0.05;
                }

                oscNode = ctx.createBufferSource();
                oscNode.buffer = BUFF;
                oscNode.loop = true;

                oscNodeFilter = ctx.createBiquadFilter();
                oscNodeFilter.type = 'peaking';
                oscNodeFilter.frequency.value = FREQ;
                oscNodeFilter.Q.value = 0.1;
                oscNodeFilter.gain.value = 40;

                oscNode
                    .connect(oscNodeFilter)
                    .connect(GAIN_NODE_TREMOLO)
            } else {
                oscNode = ctx.createOscillator();
                oscNode.frequency.value = FREQ;
                    
                if (typeof tone.tex.wave.overtones === 'string') {
                    oscNode.type = OSC_TYPES[tone.tex.type];
                } else {
                    const PERIOD_WAVE = this.CTX.createPeriodicWave(...tone.tex.wave.overtones);
                    oscNode.setPeriodicWave(PERIOD_WAVE);
                }

                oscNode.connect(GAIN_NODE_TREMOLO);
            }

            // Effects tone
            const EFX = tone.efx.map(e => {
                if (
                    e.type === eEffectType.Vibrato ||
                    e.type === eEffectType.Tremolo
                ) {
                    const
                        MOD_F = this.CTX.createOscillator(),
                        MOD_G = this.CTX.createGain();
                    let
                        attackLevel = e.vibratoRangeAttack,
                        sustainLevel = e.vibratoRangeSustain;
                    MOD_F.frequency.value = e.vibratoRate;
                    MOD_F.type = eVibratoType[e.vibratoType].toLowerCase();
                    MOD_F.connect(MOD_G);
                    if (e.type === eEffectType.Vibrato) {
                        MOD_G.connect((oscNodeFilter || oscNode).frequency);
                    } else {
                        attackLevel = e.attackLevel * 2;
                        sustainLevel = e.sustainLevel * 2;
                        MOD_G.connect(GAIN_NODE_TREMOLO.gain);
                    }
                    MOD_F.start();

                    return {
                        type: e.type,
                        gainNodeEfx: MOD_G,
                        attackLevel,
                        sustainLevel
                    };
                } else {
                    let gainNodeEfx = ctx.createGain();
                    if (e.type === eEffectType.Distortion) {
                        const
                            DISTORT = this.CTX.createWaveShaper(),
                            SCALE_DISTORT = this.CTX.createGain();
                        SCALE_DISTORT.gain.value = _Note.GAIN_SCALE_DISTORT;
                        DISTORT.curve = e.distortCurve;
                        oscNode
                            .connect(DISTORT)
                            .connect(SCALE_DISTORT)
                            .connect(gainNodeEfx)
                            .connect(GAIN_NODE_ENVEL);
                    }
                    if (e.type === eEffectType.Reverb) {
                        GAIN_NODE_DEGAIN
                            .connect(gainNodeEfx)
                            .connect(Sound.IR[e.reverbType])
                            .connect(ctx.destination);
                    }
                    return {
                        type: e.type,
                        gainNodeEfx,
                        attackLevel: e.attackLevel,
                        sustainLevel: e.sustainLevel
                    };
                }
            });

            let
                attackPreEfx = 1,
                sustainPreEfx = 1,
                attackPostEfx = 1,
                sustainPostEfx = 1;
            EFX
                .filter(e => e.type === eEffectType.Distort)
                .forEach(e => {
                    attackPreEfx -= e.attackLevel;
                    sustainPreEfx -= e.sustainLevel;
                });
            EFX
                .filter(e => e.type === eEffectType.Reverb)
                .forEach(e => {
                    attackPostEfx -= e.attackLevel;
                    sustainPostEfx -= e.sustainLevel;
                });

            return {
                oscNode,
                efx: EFX,
                attackPreEfx,
                attackPostEfx,
                sustainPreEfx,
                sustainPostEfx,
                envel: tone.envel.stages,
                gainNodePreEfx: GAIN_NODE_PRE_EFX,
                gainNodePostEfx: GAIN_NODE_POST_EFX,
                gainNodeEnvel: GAIN_NODE_ENVEL,
                keyHold: tone.envel.keyHold,
                keyUp: tone.envel.keyUp,
                startTime: 0,
                loopTimeout: -1,
                isShadow: tone.isShadow
            };
        });

        this.FINISH_DURATION = Math.max(
            ...this.TONE.map(t => t.envel[eEnvelStage.Release].time)
        );

        // Save
        _Note.NOTES.push(this);
    }

    _setGain(gainNode, level = -1, time = 0) {
        if (level === -1) {
            gainNode.gain.setValueAtTime(gainNode.gain.value, this.CTX.currentTime);
        } else {
            const INITIAL = time === 0;
            level = Math.max(MIN_GAIN, level * _Note.GAIN_SCALE);
            time = this.CTX.currentTime + (time * MS_TO_S);
            INITIAL
                ? gainNode.gain.setValueAtTime(level, time)
                : gainNode.gain.linearRampToValueAtTime(level, time);
        }
    }

    start() {
        this.TONE.forEach(tone => {
            this._setGain(tone.gainNodePreEfx, tone.attackPreEfx);
            tone.efx.forEach(e => this._setGain(e.gainNodeEfx, e.attackLevel));
            this._setGain(tone.gainNodePostEfx, tone.attackPostEfx);
            this._setGain(tone.gainNodeEnvel, MIN_GAIN);
            tone.oscNode.start()
            this.startToneLoop(tone);
        });
    }

    startToneLoop(tone) {
        tone.startTime = new Date().valueOf();

        // Pure / Effect gain
        const
            ATTACK_END_TIME = tone.envel[eEnvelStage.Hold].time,
            SUSTAIN_START_TIME = tone.envel[eEnvelStage.Sustain].time;
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
                ei < eEnvelStage.Loop &&
                (
                    ei < eEnvelStage.Release ||
                    (
                        ei === eEnvelStage.Release &&
                        tone.keyHold !== eEnvelKeyHold.Sustain
                    )
                )
            )
            .forEach(e => this._setGain(
                tone.gainNodeEnvel,
                e.gain,
                e.time
            ));

        // Loop
        if (tone.keyHold === eEnvelKeyHold.Loop) {
            tone.loopTimeout = setTimeout(
                () => this.startToneLoop(tone),
                tone.envel[eEnvelStage.Loop].time
            );
        }
    }

    finish() {
        let maxDuration = 0;
        this.TONE.forEach(tone => {
            clearInterval(tone.loopTimeout);

            const
                DT = (new Date().valueOf()) - tone.startTime,
                PRE_RELEASE = tone.envel[eEnvelStage.Release - 1],
                RELEASE = tone.envel[eEnvelStage.Release];
            let time;

            if (
                (
                    tone.keyUp === eEnvelKeyUp.Skip &&
                    DT < PRE_RELEASE.time
                ) || (
                    tone.isShadow &&
                    tone.keyUp === eEnvelKeyUp.None &&
                    DT < tone.envel[eEnvelStage.Delay].time
                )
            ) {
                time = RELEASE.time - PRE_RELEASE.time;
                tone.gainNodeEnvel.gain.cancelScheduledValues(this.CTX.currentTime);
                this._setGain(tone.gainNodeEnvel);
                this._setGain(tone.gainNodeEnvel, RELEASE.gain, time);
            } else if (tone.keyHold === eEnvelKeyHold.Sustain) {
                 const
                    TIME_END = RELEASE.time,
                    TIME_START = PRE_RELEASE.time,
                    TIME_DELAY = Math.max(0, TIME_START - DT);
                time = TIME_DELAY + TIME_END - TIME_START;
                
                if (TIME_DELAY === 0) {
                    this._setGain(tone.gainNodeEnvel, PRE_RELEASE.gain);
                }
                this._setGain(tone.gainNodeEnvel, RELEASE.gain, time);
            } else {
                time = tone.envel[eEnvelStage.Release].time - DT;
            }

            maxDuration = Math.max(maxDuration, time);
        });

        this.finishTimeout = setTimeout(
            () => this.stop(),
            maxDuration
        );
    }
    
    stop() {
        clearTimeout(this.finishTimeout);
        _Note.NOTES.splice(_Note.NOTES.indexOf(this), 1);
        this.TONE.forEach(tone => {
            tone.gainNodeEnvel.gain.cancelScheduledValues(this.CTX.currentTime);
            this._setGain(tone.gainNodeEnvel);
            this._setGain(tone.gainNodeEnvel, MIN_GAIN, MIN_FADE);
            tone.oscNode.stop(this.CTX.currentTime + MIN_FADE);
        });
    }
}

const Sound = {
    CTX: new AudioContext(),
    IR: [],

    init() {
        this.initIRs();
    },

    async initIRs() {
        for (let i = 0; i < eReverbType.length; i++) {
            const
                IR = this.CTX.createConvolver(),
                SOURCE = [
                    'https://cdn.freesound.org/previews/732/732451_8772782-lq.mp3',
                    'https://cdn.freesound.org/previews/126/126200_4948-lq.mp3',
                    'https://cdn.freesound.org/previews/192/192337_3276562-lq.mp3'
                ][i],
                RESP = await fetch(SOURCE),
                BUFFER = await RESP.arrayBuffer();
            IR.buffer = await this.CTX.decodeAudioData(BUFFER);
            this.IR.push(IR);
        }
    },

    startNote(tone, freq) {
        const NOTE = new _Note(this.CTX, tone, freq);
        NOTE.start();

        return NOTE.ID;
    },

    finishNote(noteId) {
        _Note.NOTES.find(n => n.ID === noteId)?.finish();
    }
};