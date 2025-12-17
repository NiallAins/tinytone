import { PAGE_CLASS } from '../common/consts.js';
import { setColors } from '../common/styles.js';
import { getEl } from '../common/ui.js';
import { eNodeType } from '../common/enums.js';
import { Node } from '../classes/Node.js';
import { reRender as reRenderTex } from './texture.js';
import { reRender as reRenderTone } from './tone.js';
import { reRender as reRenderEfx } from './effect.js';
import { reRender as reRenderEnvel } from './envelope.js';
import { startNote as startNoteSound, finishNote as finishNoteSound } from './sound.js';
import { startNote as startNoteKey, finishNote as finishNoteKey } from './keys.js';
import { setEncodedTones, downloadLibraryDTs, downloadLibraryJs, downloadLibraryMJs } from './export.js';
import { currentTone } from './tone.js';


//
// Private reaonly variables
//

const
    EL_PAGE = getEl('#EL_PAGE'),
    EL_GRID = getEl('#EL_GRID');


//
// Private variables
//

let
    isDarkTheme = true;


//
// Public functions
//

export function init() {
    closeMobilePanel();
    exposeFunctions();
}

export function setTile(type) {
    new Array(eNodeType.length)
        .fill('')
        .forEach((_, t) => {
            const CLASS = 'grid--' + eNodeType[t].toLowerCase();
            t === type
                ? EL_GRID.classList.add(CLASS)
                : EL_GRID.classList.remove(CLASS);
        });
    type === -1
        ? EL_GRID.classList.add('grid--empty')
        : EL_GRID.classList.remove('grid--empty')
}


//
// Private functions
//

function exposeFunctions() {
    window.setPage = setPage.bind(this);
    window.toggleTheme = toggleTheme.bind(this);
    window.closePanel = closeMobilePanel.bind(this);

    window.startNote = (freq, key) => {
        const TONES = currentTone.tone;
        if (TONES[0] !== null) {
            const ID = startNoteSound(
                TONES,
                freq
            );
            startNoteKey(ID, key);
        }
    };

    window.finishNote = (key) => {
        const ID = finishNoteKey(key);
        finishNoteSound(ID);
    };
    window.addEventListener('blur', () => finishNoteSound());

    window.downloadLibraryJs  = downloadLibraryJs;
    window.downloadLibraryMJs = downloadLibraryMJs;
    window.downloadLibraryDTs = downloadLibraryDTs;
}

function setPage(index) {
    PAGE_CLASS.forEach(p => EL_PAGE.classList.remove(p));
    EL_PAGE.classList.add(PAGE_CLASS[index]);
    if (index === 2) {
        setEncodedTones();
    }
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;

    if (isDarkTheme) {
        getEl('body').classList.remove('body--theme-light');
        getEl('body').classList.add('body--theme-dark');
    } else {
        getEl('body').classList.remove('body--theme-dark');
        getEl('body').classList.add('body--theme-light');
    }
    setColors();

    reRenderEnvel();
    reRenderEfx();
    reRenderTex();
    reRenderTone();

    Node.NODES[eNodeType.Envel].forEach(n => n.child._updatePreview());
}

function closeMobilePanel() {
    EL_GRID.classList.remove('grid--mobile-panel-show')
}