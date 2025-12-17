import { getEl } from "../common/ui.js";


//
// Private readonly variables
//

const
    ACTIVE_NOTE_IDS = {},
    BASE_FREQ = 173.83,
    SHORTCUTS = [
        'Q2WE4R5TY7U8I9OP'.split(''),
        'MJNHBVFCDXZA'.split('')
    ];


//
// Public functions
//

export function init() {
    renderKeys();
    window.addEventListener(
        'keydown',
        event => onKey(event, true)
    );
    window.addEventListener(
        'keyup',
        event => onKey(event, false)
    );
}

export function startNote(ID, key) {
    ACTIVE_NOTE_IDS[key] = ID;
}

export function finishNote(key) {
    if (ACTIVE_NOTE_IDS[key]) {
        const ID = ACTIVE_NOTE_IDS[key];
        delete ACTIVE_NOTE_IDS[key];
        return ID;
    } else {
        return -1;
    }
}


//
// Private functions
//

function renderKeys() {
    let notes = [];
    for (let i = 0; i < 12; i++) {
        notes.push(i ? notes[i - 1] * 1.5 : BASE_FREQ);
    }
    notes = notes.map(n => {
        while (n >= notes[0] * 2) {
            n *= 0.5;
        }
        return n;
    });
    notes.sort((a, b) => a - b);
    notes = [
        ...notes,
        ...notes.map(n => n * 2),
        ...notes.map(n => n * 4)
    ]
        .slice(4, 4 + (12 * 2) + 1)
        .map((n, ni, nArr) => ({
            freq: Math.round(n * 100) / 100,
            flat: !![0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1][ni % 12],
            shortcut: [
                SHORTCUTS[0][ni],
                SHORTCUTS[1][nArr.length - ni - 1]
            ].filter(s => s)
        }));
    
    const
        WIDTH_SM = 100 / 8,
        WIDTH_LG = 100 / notes.filter(n => !n.flat).length;
    let flatX = -0.5;
    getEl('#EL_KEYS_CONTAIN').innerHTML = notes
        .reduce((htm, n, ni, nArr) => {
            flatX += n.flat ? 0 : 1;
            return htm + `
                ${ n.flat && (ni === 0 || !nArr[ni - 1].flat) ? `
                    <div
                        class="keys__flat-container"
                        style="
                            --width-sm: ${ WIDTH_SM }%;
                            --width-lg: ${ WIDTH_LG }%;
                            --left-sm: ${ flatX * WIDTH_SM }%;
                            --left-lg: ${ flatX * WIDTH_LG }%;
                        "
                    >
                ` : '' }
                <button
                    class="
                        keys__key
                        ${ ni > 12 ? 'keys__key--second-octave' : '' }
                        ${ n.flat ? 'keys__key--flat' : '' }
                        ${ n.shortcut.map(s => 'keys__key--shortcut-' + s).join(' ') }
                    "
                    onmousedown="startNote(${ n.freq }, ${ ni })"
                    ontouchstart="startNote(${ n.freq }, ${ ni })"
                    onmouseup="finishNote(${ ni })"
                    onmouseleave="finishNote(${ ni })"
                    ontouchend="finishNote(${ ni })"
                    ontouchleave="finishNote(${ ni })"
                >
                    <span class="keys__key-label">
                        <span class="keys__key-label--shortcut">
                            ${ n.shortcut.join('/') }
                        </span>
                    </span>
                </button>
                ${ n.flat && (ni === nArr.length - 1 || !nArr[ni + 1].flat) ? `
                    </div>
                ` : '' }
            `;
        }, '');
}

function onKey(event, isDown) {
    if (event.repeat || event.shiftKey) {
        return;
    }

    const
        CLASS = 'keys__key--active',
        CODE = event.code;
    let
        key = CODE[CODE.length - 1],
        elKey = null;
    if (key && SHORTCUTS.flat().indexOf(key) !== -1) {
        elKey = getEl('.keys__key--shortcut-' + key)
    } else if (CODE === 'Space' || CODE === 'Enter') {
        elKey = getEl('.keys__key:focus');
    }

    if (elKey) {
        if (isDown) {
            elKey.dispatchEvent(new Event('mousedown'));
            elKey.classList.add(CLASS);
        } else {
            elKey.dispatchEvent(new Event('mouseup'));
            elKey.classList.remove(CLASS);
        }
    }
}