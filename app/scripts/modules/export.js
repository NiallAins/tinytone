import { TWELVE_RT_2, TONES_PLACEHOLDER_STRING } from "../common/consts.js";
import { eTexType, eEnvelStage, eEffectType } from "../common/enums.js";
import { getEl } from "../common/ui.js";
import { getAllTones } from "./tone.js";
import { Efx } from "../classes/Efx.js";
import LIBRARY_JS_BODY from "../data/tinytone.export.js";
import LIBRARY_DTS_BODY from "../data/tinytone.defs.export.js";


//
// Private readonly variables
//

const
    LIBRARY_JS = [
        'tinytone.js',
        LIBRARY_JS_BODY
    ],
    LIBRARY_DTS = [
        'tinytone.ts',
        LIBRARY_DTS_BODY
    ],
    MAX_EXPORT_VALUE_DEC = 4,
    EL_SIZES = [
        getEl('#EL_EXPORT_SIZE_0'),
        getEl('#EL_EXPORT_SIZE_1'),
    ];


//
// Private variables
//

let
    encodedTones = '';


//
// Public functions
//

export function setEncodedTones() {
    encodedTones = getEncodedTones();
    const SIZE = Math.floor((LIBRARY_JS[1].length + encodedTones.length) / 100) / 10;
    EL_SIZES.forEach(el => el.innerText = SIZE);
    // navigator.clipboard.writeText('const $_TONES_ = ' + encodedTones);
}

export function downloadLibraryJs() {
    downloadLibrary(...LIBRARY_JS);
}

export function downloadLibraryMJs() {
    downloadLibrary(
        LIBRARY_JS[1],
        'export ' + LIBRARY_JS[1]
    );
}

export function downloadLibraryDTs() {
    downloadLibrary(...LIBRARY_DTS);
}


//
// Private functions
//

function downloadLibrary(fileName, content) {
    const EL = document.createElement('a');
    EL.setAttribute('download', fileName);
    EL.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' +
        encodeURIComponent(content.replace(
            TONES_PLACEHOLDER_STRING,
            encodedTones
        ))
    );

    document.body.appendChild(EL);
    EL.click();
    document.body.removeChild(EL);
}

function getEncodedTones() {
    return JSON.stringify(
        getAllTones()
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
                            ? [ Efx.DISTORT_SHARPS[e._distortSharpDisplay] ]
                            : [
                                e.vibratoType,
                                e.vibratoRate
                            ]
                    )
                ]);

                const OVERTONES =
                    t.tex.type === eTexType.Preset ||
                    t.tex.type === eTexType.Custom
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
                    t.tex.type === eTexType.Preset ? eTexType.Custom : t.tex.type,
                    (2**t.tex.wave.octave) * Math.pow(TWELVE_RT_2, t.tex.detune),
                    t.tex.degain,
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
        .replace(new RegExp(`(\.[0-9]{${ MAX_EXPORT_VALUE_DEC }})[0-9]*`, 'g'), '$1');
}