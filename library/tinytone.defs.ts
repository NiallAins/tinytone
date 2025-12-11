export type tNote = number | string;
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
export declare const Tone: iTone;