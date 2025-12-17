# TinyTone

### Description

<strong>TinyTone</strong> is a web app and a small library built on the native JavaScript Web Audio API.
The app allows you to create tones by combining audio textures, envelopes, and effects.
The library allows you to then import and use these tones in your project.

[Link to the <b>TinyTone</b> web app](https://niallains.github.io/tinytone/)

### Create tones

In the <strong>Create</strong> tab of the app, tones are created by combining audio textures, envelopes, and effects.
A texture is a combination of sine waves that produce a sound.
An envelope controls how the volume of that sound changes when it is played.
Effects further alter the quality of the sound.

### Export and use tones

#### Install

In the <strong>Export</strong> tab of the app, you can download a JavaScript file containing your tones, and a small library to play them.
You can then include this file in your project.
The simplest implementation is to add this file to the root folder of your project, then include it in the <code class="code code--inline">&lt;head&gt;</code> element of your html.
You can also import the library as a module, or import the library into a typescript project along with type definitions.

```html
<html>
    <head>
        <script src="./tinytone.js"></script>
    </head>
</html>
```

#### Usage
```ts
    // Play a note of a given frequency
    Tone.play(440);

    // Play a note of a given name and octave
    Tone.play('A');
    Tone.play('A#');
    Tone.play('Ab');
    Tone.play('A#3');

    // Play several notes in succession
    Tone.play(['A', 'C', 'E']);

    // Play a note with a given tone
    Tone.play('A', 2);

    // Play a note after a given time, with a given sustain length
    Tone.play([
        ['A', 1000, 200]
    ]);
    Tone.play([
        { note: 'A', start: 1000, sustain: 200 }
    ]);

    // Play several notes with given start times, sustains, and tones
    Tone.play([
        ['A',   0, 400, 1],
        ['C', 100, 300, 2],
        ['E', 200, 200, 1]
    ]);
    Tone.play([
        { note: 'A', start:   0, sustain: 400, tone: 1 },
        { note: 'C', start: 100, sustain: 300, tone: 2 },
        { note: 'E', start: 200, sustain: 200, tone: 1 }
    ]);

    // Start a note, then end it later
    const ID = Tone.start('A');
    // ...
    Tone.finish(ID);

    // Start several notes, then end them later
    const ID = Tone.start([
        ['A',   0, 400, 1],
        ['C', 100, 300, 2],
        ['E', 200, 200, 1]
    ]);
    // ...
    Tone.finish(ID);

    // Finish all started notes
    Tone.finish();
```

#### Full library API

```ts
type tNote = number | string/[A-G][b#]?[0-9]?/;

type tNoteArray = [
    note:     tNote,
    start:    number = 0,
    sustain:  number = 0,
    tone:     number = 0
];

type tNoteObject = {
    note:    tNote,
    start:   number = 0,
    sustain: number = 0,
    tone:    number = 0
};

interface Tone {
    play(
        note: tNote | tNote[] | tNoteArray[] | tNoteObject[],
        tone: number = 0
    ): void;

    start(
        note: tNote | tNoteArray[] | tNoteObject[],
        tone: number = 0
    ): number;

    finish(
        id?: number
    ): void;
}
```