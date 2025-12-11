const Main = {
    EL_PAGE: getEl('#EL_PAGE'),
    EL_GRID: getEl('#EL_GRID'),
    currentTile: eNodeType.Tex,
    isDarkTheme: true,

    init() {
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
        
        this.exposeFunctions();
    },

    exposeFunctions() {
        window.setPage = this.setPage.bind(this);
        window.toggleTheme = this.toggleTheme.bind(this);

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
    },

    setPage(index) {
        PAGE_CLASS.forEach(p => EL_PAGE.classList.remove(p));
        EL_PAGE.classList.add(PAGE_CLASS[index]);
        if (index === 2) {
            Export.setEncodedTones();
        }
    },

    setTile(type) {
        this.currentTile = type;
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
    },

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;

        if (this.isDarkTheme) {
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
};

Main.init();