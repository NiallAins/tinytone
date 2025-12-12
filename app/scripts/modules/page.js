import { PAGE_CLASS } from '../common/consts.js';
import { setColors } from '../common/styles.js';
import { getEl } from '../common/ui.js';
import { eNodeType } from '../common/enums.js';
import { Envel } from './envelope.js';
import { Tex } from './texture.js';
import { Efx } from './effect.js';
import { Sound } from './sound.js';
import { Tone } from './tone.js';
import { Node } from './node.js';
import { Keys } from './keys.js';
import { Export } from './export.js';


//
// Private variables
//

const
    EL_PAGE = getEl('#EL_PAGE'),
    EL_GRID = getEl('#EL_GRID');

let isDarkTheme = true;


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
        const TONES = Tone.currentTone.tone;
        if (TONES[0] !== null) {
            const ID = Sound.startNote(
                TONES,
                freq
            );
            Keys.startNote(ID, key);
        }
    };

    window.finishNote = (key) => {
        const ID = Keys.finishNote(key);
        Sound.finishNote(ID);
    };

    window.downloadLibraryJs  = Export.downloadLibraryJs.bind(Export);
    window.downloadLibraryMJs = Export.downloadLibraryMJs.bind(Export);
    window.downloadLibraryDTs = Export.downloadLibraryDTs.bind(Export);
}

function setPage(index) {
    PAGE_CLASS.forEach(p => EL_PAGE.classList.remove(p));
    EL_PAGE.classList.add(PAGE_CLASS[index]);
    if (index === 2) {
        Export.setEncodedTones();
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

    Efx.INPUTS.render();
    Envel.INPUTS.render();
    Tex._renderChart();
    Tone._renderChart();

    Node.NODES[eNodeType.Envel].forEach(n => n.child._updatePreview());
}

function closeMobilePanel() {
    EL_GRID.classList.remove('grid--mobile-panel-show')
}