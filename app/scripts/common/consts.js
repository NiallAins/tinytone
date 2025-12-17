import { eArpeggDirection, eArpeggType, eTexType } from "./enums.js";

//
// Global constants
//

export const
    CAN_QUALITY = 2,
    TWELVE_RT_2 = 1.059463,
    OVERTONE_COUNT = 8,
    MIN_FADE = 10,
    MIN_FADE_STEP = 10,
    MAX_GAIN = 1,
    MID_GAIN = 0.5,
    MIN_GAIN = 0.00001,
    DEFAULT_MAX_DURATION = 1500,
    MS_TO_S = 0.001,
    TONES_PLACEHOLDER_STRING = '$_TONES_';


//
// Strings and labels
//

export const
    PAGE_CLASS = [
        'page--about',
        'page--create',
        'page--export'
    ],
    ARPEGG_TYPE_NOTES = {
        [eArpeggDirection.Ascend]: {
            [eArpeggType.Maj]:  [4, 7, 12],
            [eArpeggType.Min]:  [3, 7, 12],
            [eArpeggType.Maj7]: [4, 7, 11, 12],
            [eArpeggType.Min7]: [3, 7, 10, 12],
            [eArpeggType.Dom7]: [4, 7, 10, 12]
        },
        [eArpeggDirection.Descend]: {
            [eArpeggType.Maj]:  [-5, -8, -12],
            [eArpeggType.Min]:  [-5, -9, -12],
            [eArpeggType.Maj7]: [-1, -5, -8, -12],
            [eArpeggType.Min7]: [-2, -5, -9, -12],
            [eArpeggType.Dom7]: [-2, -5, -8, -12]
        },
        [eArpeggDirection.AscendFirst]: {
            [eArpeggType.Maj]:  [4, 7, 12, 7, 4, 0],
            [eArpeggType.Min]:  [3, 7, 12, 7, 3, 0],
            [eArpeggType.Maj7]: [4, 7, 11, 12, 11, 7, 4, 0],
            [eArpeggType.Min7]: [3, 7, 10, 12, 10, 7, 3, 0],
            [eArpeggType.Dom7]: [4, 7, 10, 12, 10, 7, 4, 0]
        },
        [eArpeggDirection.DescendFirst]: {
            [eArpeggType.Maj]:  [-5, -8, -12, -8, -5, 0],
            [eArpeggType.Min]:  [-5, -9, -12, -9, -5, 0],
            [eArpeggType.Maj7]: [-1, -5, -8, -12, -8, -5, -1, 0],
            [eArpeggType.Min7]: [-2, -5, -9, -12, -9, -5, -2, 0],
            [eArpeggType.Dom7]: [-2, -5, -8, -12, -8, -5, -2, 0]
        },
    },
    OSC_TYPES = {
        [eTexType.Sine]: 'sine',
        [eTexType.Square]: 'square',
        [eTexType.Sawtooth]: 'sawtooth',
        [eTexType.Triangle]: 'triangle',
    };