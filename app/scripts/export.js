const Export = {
    LIBRARY_JS: [
        'tinytone.js',
        'const Tone=function(t){const i=1e-4,l=new AudioContext,u=[],n=l.createBuffer(1,2*l.sampleRate,l.sampleRate);var a=n.getChannelData(0);for(let e=0;e<2*l.sampleRate;e++)a[e]=.1*Math.random()-.05;!async function(){var t=["https://cdn.freesound.org/previews/732/732451_8772782-lq.mp3","https://cdn.freesound.org/previews/126/126200_4948-lq.mp3","https://cdn.freesound.org/previews/192/192337_3276562-lq.mp3"];for(let e=0;e<t.length;e++){var a=l.createConvolver(),n=await(await fetch(t[e])).arrayBuffer();a.buffer=await l.decodeAudioData(n),u.push(a)}}();const o=t.map(e=>e.map(e=>({efx:e[0].map(t=>{var e={type:t[0],attackLevel:t[1],sustainLevel:t[2]};if(0===t[0])return{...e,reverbType:t[3]};if(1!==t[0])return{...e,vibratoType:["sine","square","sawtooth"][t[3]],vibratoRate:t[4]};var a,n=new Float32Array(256);for(let e=0;e<n.length;e++)1<t[3]&&e%t[3]==0||1===t[3]&&e%5?n[e]=0:(a=2*e/256-1,n[e]=(Math.PI+75)*a/(Math.PI+75*Math.abs(a)));return{...e,distortCurve:n}}),envel:[{time:e[1],gain:i},{time:e[2],gain:e[3]},{time:e[4],gain:e[5]},{time:e[6],gain:e[7]},{time:e[8],gain:e[9]},{time:e[10],gain:i},{time:e[11],gain:i},{time:e[12],gain:i}],tex:{type:["sine","square","triangle","sawtooth","noise","custom"][e[13]],detune:e[14],degain:e[15],overtones:e[16]},keyUp:e[17],keyHold:e[18],attackPreEfx:e[19],attackPostEfx:e[20],sustainPreEfx:e[21],sustainPostEfx:e[22],isShadow:!!e[23]})));let s=[];class r{ID;TONE;FINISH_DURATION=0;finishTimeout=-1;constructor(a,e,t=-1){this.ID=t,this.TONE=o[e].map(e=>{const o={...e,efx:[],oscNode:l.createOscillator(),gainNodePreEfx:l.createGain(),gainNodePostEfx:l.createGain(),gainNodeEnvel:l.createGain(),startTime:0,loopTimeout:-1,isShadow:e.isShadow},s=l.createGain(),r=l.createGain();s.gain.value=1,r.gain.value=o.tex.degain,s.connect(o.gainNodePreEfx).connect(o.gainNodeEnvel).connect(r).connect(o.gainNodePostEfx).connect(l.destination);var t=a*o.tex.detune;let c;return("noise"===o.tex.type?(o.oscNode=l.createBufferSource(),o.oscNode.buffer=n,o.oscNode.loop=!0,(c=l.createBiquadFilter()).type="peaking",c.frequency.value=t,c.Q.value=.1,c.gain.value=40,o.oscNode.connect(c)):(o.oscNode=o.oscNode,o.oscNode.frequency.value=t,"custom"===o.tex.type?(t=l.createPeriodicWave(...o.tex.overtones),o.oscNode.setPeriodicWave(t)):o.oscNode.type=o.tex.type,o.oscNode)).connect(s),o.efx=e.efx.map(e=>{var t,a,n,i=l.createGain();return 2===e.type||3===e.type?(n=e,(t=l.createOscillator()).frequency.value=n.vibratoRate,t.type=n.vibratoType,t.connect(i),2===e.type?i.connect((c||o.oscNode).frequency):i.connect(s.gain),t.start()):(1===e.type&&(n=e,t=l.createWaveShaper(),(a=l.createGain()).gain.value=.25,t.curve=n.distortCurve,o.oscNode.connect(t).connect(a).connect(i).connect(o.gainNodeEnvel)),0===e.type&&(n=e,r.connect(i).connect(u[n.reverbType]).connect(l.destination))),{type:e.type,gainNodeEfx:i,attackLevel:e.attackLevel,sustainLevel:e.sustainLevel}}),o}),this.FINISH_DURATION=Math.max(...this.TONE.map(e=>e.envel[5].time)),s.push(this),8<s.length&&s[0]._stop()}start(){this.TONE.forEach(e=>{this._setGain(e.gainNodePreEfx,e.attackPreEfx),e.efx.forEach(e=>this._setGain(e.gainNodeEfx,e.attackLevel)),this._setGain(e.gainNodePostEfx,e.attackPostEfx),this._setGain(e.gainNodeEnvel,i),e.oscNode.start(),this._startToneLoop(e)})}finish(){let c=0;this.TONE.forEach(e=>{clearInterval(e.loopTimeout);var t,a,n,i=(new Date).valueOf()-e.startTime,o=e.envel[4],s=e.envel[5];let r;1===e.keyUp&&i<o.time||e.isShadow&&0===e.keyUp&&i<e.envel[0].time?(r=s.time-o.time,e.gainNodeEnvel.gain.cancelScheduledValues(l.currentTime),this._setGain(e.gainNodeEnvel),this._setGain(e.gainNodeEnvel,s.gain,r)):1===e.keyHold?(t=s.time,a=o.time,n=Math.max(0,a-i),r=n+t-a,0===n&&this._setGain(e.gainNodeEnvel,o.gain),this._setGain(e.gainNodeEnvel,s.gain,r)):r=e.envel[5].time-i,c=Math.max(c,r)}),this.finishTimeout=setTimeout(()=>this._stop(),c)}_startToneLoop(a){a.startTime=(new Date).valueOf();const t=a.envel[2].time,n=a.envel[4].time;this._setGain(a.gainNodePreEfx,a.attackPreEfx,t),this._setGain(a.gainNodePreEfx,a.sustainPreEfx,n),a.efx.forEach(e=>{this._setGain(e.gainNodeEfx,e.attackLevel,t),this._setGain(e.gainNodeEfx,e.sustainLevel,n)}),this._setGain(a.gainNodePostEfx,a.attackPostEfx,t),this._setGain(a.gainNodePostEfx,a.sustainPostEfx,n),a.envel.filter((e,t)=>t<7&&(t<5||5===t&&1!==a.keyHold)).forEach(e=>this._setGain(a.gainNodeEnvel,e.gain,e.time)),3===a.keyHold&&(a.loopTimeout=setTimeout(()=>this._startToneLoop(a),a.envel[7].time))}_setGain(e,t=-1,a=0){var n;-1===t?e.gain.setValueAtTime(e.gain.value,l.currentTime):(n=0===a,t=Math.max(i,.5*t),a=l.currentTime+.001*a,n?e.gain.setValueAtTime(t,a):e.gain.linearRampToValueAtTime(t,a))}_stop(){clearTimeout(this.finishTimeout),s.splice(s.indexOf(this),1),this.TONE.forEach(e=>{e.gainNodeEnvel.gain.cancelScheduledValues(l.currentTime),this._setGain(e.gainNodeEnvel),this._setGain(e.gainNodeEnvel,i,5),e.oscNode.stop(l.currentTime+5)})}}const c=440,f=400,d=3,h=Object.fromEntries([0,2,3,5,7,8,10].map((a,n)=>["BB","B","","#","##"].map((e,t)=>[String.fromCharCode(65+n)+e,440*Math.pow(1.0594630943593,a+t-2)])).flat());function v(e){return void 0===e?c:"number"==typeof e?e:(e=e.toUpperCase().match(/^([A-G][#B]*)(-?[0-9]*)$/))&&e[1]&&h[e[1]]?h[e[1]]*(e[2]?2**(parseInt(e[2])-d):1):c}function m(e=0){return 0<=e&&e<t.length?e:0}function p(e,a,n=!1){return("object"!=typeof e||void 0===e.length?[e]:e).map((e,t)=>"object"!=typeof e?{freq:v(e),start:t*f,sustain:n?-1:0,tone:m(a)}:void 0===e.length?{freq:v(e.note),start:e.start||0,sustain:n?-1:e.sustain||0,tone:m(e.tone??a)}:{freq:v(e[0]),start:e[1]||0,sustain:n?-1:e[2]||0,tone:m(e[3]??a)})}return{start:function(e,t){const a=1e18*Math.random();return p(e,t,!0).forEach(e=>new r(e.freq,e.tone,a).start()),a},finish:function(t){s.filter(e=>!t&&0!==t||e.ID===t).forEach(e=>e.finish())},play:function(e,t){p(e,t).forEach(e=>{const t=new r(e.freq,e.tone);e.start?setTimeout(()=>t.start(),e.start):t.start(),e.start||e.sustain?setTimeout(()=>t.finish(),e.start+e.sustain):t.finish()})}}}($_TONES_);'
    ],
    LIBRARY_DTS: [
        'tinytone.ts',
`export type tNote = number | string;
export type tNoteArray = [
    note:     tNote,
    start?:   number,
    sustain?: number,
    tone?:    number
];
export type tNoteObject = {
    note:     tNote,
    start?:   number,
    sustain?: number,
    tone?:    number
};
export interface iTone {
    play(
        note?: tNote | tNote[] | tNoteArray[] | tNoteObject[],
        tone?: number
    ): void;

    start(
        note?: tNote | tNoteArray[] | tNoteObject[],
        tone?: number
    ): number;

    finish(
        id?: number
    ): void;
}
export declare const Tone: iTone;`
    ],
    MAX_DEC: 4,
    EL_SIZES: [
        getEl('#EL_EXPORT_SIZE_0'),
        getEl('#EL_EXPORT_SIZE_1'),
    ],

    encodedTones: '',

    setEncodedTones() {
        this.encodedTones = this._getEncodedTones();
        const SIZE = Math.floor((this.LIBRARY_JS[1].length + this.encodedTones.length) / 100) / 10;
        this.EL_SIZES.forEach(el => el.innerText = SIZE);
        // navigator.clipboard.writeText('const $_TONES_ = ' + this.encodedTones);
    },

    downloadLibraryJs() {
        this._downloadLibrary(...this.LIBRARY_JS);
    },

    downloadLibraryMJs() {
        this._downloadLibrary(
            this.LIBRARY_JS[1],
            'export ' + this.LIBRARY_JS[1]
        );
    },

    downloadLibraryDTs() {
        this._downloadLibrary(...this.LIBRARY_DTS);
    },
    
    _downloadLibrary(fileName, content) {
        const EL = document.createElement('a');
        EL.setAttribute('download', fileName);
        EL.setAttribute(
            'href',
            'data:text/plain;charset=utf-8,' +
            encodeURIComponent(content.replace(
                TONES_PLACEHOLDER_STRING,
                this.encodedTones
            ))
        );

        document.body.appendChild(EL);
        EL.click();
        document.body.removeChild(EL);
    },

    _getEncodedTones() {
        return JSON.stringify(
            Tone
                .getAllTones()
                .map(tt => tt.map(t => {
                    const EFX = t.efx.map(e => [
                        e.type,
                        e.type === eEffectType.Vibrato || e.type === eEffectType.Tremolo
                            ? e.vibratoRangeAttack
                            : e.attackLevel,
                        e.type === eEffectType.Vibrato || e.type === eEffectType.Tremolo
                            ? e.vibratoRangeSustain
                            : e.sustainLevel,
                        ...(
                            e.type === eEffectType.Reverb
                                ? [ e.reverbType ]
                                : e.type === eEffectType.Distortion
                                ? [ _Efx.DISTORT_SHARPS[e._distortSharpDisplay] ]
                                : [
                                    e.vibratoType,
                                    e.vibratoRate
                                ]
                        )
                    ]);

                    const OVERTONES =
                        t.tex.type === eWaveType.Preset ||
                        t.tex.type === eWaveType.Custom
                            ? t.tex.wave.overtones
                            : [];

                    let
                        attackPreEfx = 1,
                        sustainPreEfx = 1,
                        attackPostEfx = 1,
                        sustainPostEfx = 1;
                    t.efx
                        .filter(e => e.type === eEffectType.Distort)
                        .forEach(e => {
                            attackPreEfx -= e.attackLevel;
                            sustainPreEfx -= e.sustainLevel;
                        });
                    t.efx
                        .filter(e => e.type === eEffectType.Reverb)
                        .forEach(e => {
                            attackPostEfx -= e.attackLevel;
                            sustainPostEfx -= e.sustainLevel;
                        });

                    return [
                        EFX,
                        t.envel.stages[eEnvelStage.Delay].time,
                        t.envel.stages[eEnvelStage.Attack].time,
                        t.envel.stages[eEnvelStage.Attack].gain,
                        t.envel.stages[eEnvelStage.Hold].time,
                        t.envel.stages[eEnvelStage.Hold].gain,
                        t.envel.stages[eEnvelStage.Decay].time,
                        t.envel.stages[eEnvelStage.Decay].gain,
                        t.envel.stages[eEnvelStage.Sustain].time,
                        t.envel.stages[eEnvelStage.Sustain].gain,
                        t.envel.stages[eEnvelStage.Release].time,
                        t.envel.stages[eEnvelStage.Offset].time,
                        t.envel.stages[eEnvelStage.Loop].time,
                        t.tex.type === eWaveType.Preset ? eWaveType.Custom : t.tex.type,
                        (2**t.tex.wave.octave) * Math.pow(TWELVE_RT_2, t.tex.detune),
                        t.tex.degain / MAX_DEGAIN,
                        OVERTONES,
                        t.envel.keyUp,
                        t.envel.keyHold,
                        attackPreEfx,
                        attackPostEfx,
                        sustainPreEfx,
                        sustainPostEfx,
                        t.isShadow ? 1 : 0
                    ];
                }))
        )
            .replace(/(\.[0-9]{4})[0-9]*/g, '$1')
    }
};