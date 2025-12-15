import { eReverbType } from "../common/enums.js";
import IR_SRC from "../data/IRs.js";
import { Note } from "../classes/Note.js";

//
// Public variables
//

export const
    IRs = [];


//
// Private readonly variables
//

const
    CTX = new AudioContext();


//
// Public functions
//

export function init() {
    initIRs();
};

export function startNote(tone, freq) {
    const NOTE = new Note(CTX, tone, freq);
    NOTE.start();

    return NOTE.ID;
}

export function finishNote(noteId) {
    Note.NOTES.find(n => n.ID === noteId)?.finish();
}


//
// Private functions
//

async function initIRs() {
    for (let i = 0; i < eReverbType.length; i++) {
        const
            IR = CTX.createConvolver(),
            SOURCE = IR_SRC[i],
            RESP = await fetch(SOURCE),
            BUFFER = await RESP.arrayBuffer();
        IR.buffer = await CTX.decodeAudioData(BUFFER);
        IRs.push(IR);
    }
}