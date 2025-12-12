function Enum(...props) {
    return Object.fromEntries([
        ...props.map((p, pi) => [p, pi]),
        ...props.map((p, pi) => [pi, p]),
        ['length', props.length],
        [
            'toArray',
            () => new Array(props.length)
                .fill(0)
                .map((_, i) => i)
        ]
    ]);
}

export const
    eNodeType = Enum(
        'Tone',
        'Tex',
        'Envel',
        'Efx'
    ),
    eEffectType = Enum(
        'Reverb',
        'Distortion',
        'Vibrato',
        'Tremolo'
    ),
    eReverbType = Enum(
        'Church',
        'Cave',
        'Bedroom'
    ),
    eVibratoType = Enum(
        'Sine',
        'Square',
        'Sawtooth'
    ),
    eEnvelStage = Enum(
        'Delay',
        'Attack',
        'Hold',
        'Decay',
        'Sustain',
        'Release',
        'Offset',
        'Loop'
    ),
    eEnvelKeyHold = Enum(
        'None',
        'Sustain',
        'SustainAll',
        'Loop'
    ),
    eEnvelKeyUp = Enum(
        'None',
        'Skip'
    ),
    eArpeggType = Enum(
        'Maj',
        'Min',
        'Maj7',
        'Min7',
        'Dom7'
    ),
    eArpeggDirection = Enum(
        'Ascend',
        'Descend',
        'AscendFirst',
        'DescendFirst'
    ),
    eTexType = Enum(
        'Sine',
        'Square',
        'Triangle',
        'Sawtooth',
        'Noise',
        'Custom',
        'Preset'
    );