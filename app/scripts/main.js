import { Envel } from './modules/envelope.js';
import { Tex } from './modules/texture.js';
import { Efx } from './modules/effect.js';
import { Sound } from './modules/sound.js';
import { Tone } from './modules/tone.js';
import { Keys } from './modules/keys.js';
import { init as initPage } from './modules/page.js';
import { setColors } from './common/styles.js';

function initApp() {
    setColors();
    
    Envel.init();
    Tex.init();
    Efx.init();
    Sound.init();
    Tone.init(
        [
            () => Tone.addTone(),
            () => Tex.addTex(),
            () => Envel.addEnvel(),
            () => Efx.addEfx()
        ],
        Envel.BLANK
    );
    Keys.init();
    initPage();
}

initApp();