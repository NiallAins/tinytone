import { setColors } from './common/styles.js';
import { init as initEnvel } from './modules/envelope.js';
import { init as initTex } from './modules/texture.js';
import { init as initEfx } from './modules/effect.js';
import { init as initSound } from './modules/sound.js';
import { init as initTone } from './modules/tone.js';
import { init as initKeys } from './modules/keys.js';
import { init as initPage } from './modules/page.js';

function initApp() {
    setColors();
    initEnvel();
    initTex();
    initEfx();
    initSound();
    initTone();
    initKeys();
    initPage();
}

initApp();