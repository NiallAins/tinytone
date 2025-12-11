class Node {
    static MAX_OUT = 5;
    static NODES = {
        [eNodeType.Tone]:  [],
        [eNodeType.Tex]:   [],
        [eNodeType.Envel]: [],
        [eNodeType.Efx]:   []
    };
    static EL_CONTAIN = {
        [eNodeType.Tone]:  getEl('#EL_TONE_TONE'),
        [eNodeType.Tex]:   getEl('#EL_TONE_TEX'),
        [eNodeType.Envel]: getEl('#EL_TONE_ENVEL'),
        [eNodeType.Efx]:   getEl('#EL_TONE_EFX')
    };
    static latestNodeIndex = 0;
    static latestToneIndex = 0;

    CTX = null;
    EL = null;
    EL_INPUT = null;
    EL_INPUTS = [];
    EL_OUTPUTS = [];
    type = 0;
    child = null;
    isArpeggChild = false;
    parentToneIndex = 0;
    outputs = [];
    inputs = [];
    availableInputs = 0;
    availableOutputs = 0;
    _offset = 0;

    constructor(child, type, clickCallback, isArpeggChild) {
        const
            IS_TONE = type === eNodeType.Tone,
            RADIO_I = IS_TONE ? Node.latestToneIndex : Node.latestNodeIndex;
        this.type = type;
        this.child = child;
        this.parentToneIndex = Tone.currentTone?.index || 0;

        Node.NODES[type].push(this);
        if (IS_TONE) {
            Node.latestToneIndex += 1;
        } else {
            Node.latestNodeIndex += 1;
        }

        // Radio button
        const
            TYPE_STRING = eNodeType[type],
            CLASS = `tone__node`,
            [EL_INPUT, EL] = createRadioButton(
                RADIO_I,
                IS_TONE ? 'toneNode' : 'node',
                IS_TONE ? 'Tone ' + (RADIO_I + 1) : ''
            );
        EL.classList.add(
            CLASS,
            `${ CLASS }--${ TYPE_STRING.toLowerCase() }`
        );
        if (!IS_TONE) {
            EL.classList.add(`${ CLASS }--of-tone-${ this.parentToneIndex }`);
        }
        if (isArpeggChild) {
            this.isArpeggChild = true;
            EL.classList.add(`${ CLASS }--arpegg`);
        }
        
        EL_INPUT.onchange = () => {
            if (!IS_TONE && Tone.currentTone) {
                Tone.currentTone.focusedNode = EL_INPUT;
            }
            clickCallback();
        }
        Node.EL_CONTAIN[type].appendChild(EL);

        // Delete button
        const EL_DEL = document.createElement('button');
        EL_DEL.classList.add(CLASS + '-delete');
        EL_DEL.onclick = this.delete.bind(this);
        EL.appendChild(EL_DEL);

        // Label / Canvas
        if (IS_TONE) {
            EL.style.width = WIDTH.nodeW + 'px';
            EL.style.height = WIDTH.nodeH + 'px';
            const SHORTCUT_TEXT = document.createElement('span');
            SHORTCUT_TEXT.classList.add(CLASS + '-shortcut');
            SHORTCUT_TEXT.innerHTML = '⇧&nbsp;' + (RADIO_I + 1);
            EL.appendChild(SHORTCUT_TEXT)
        } else if (type === eNodeType.Tex || type === eNodeType.Envel || type === eNodeType.Efx) {
            const
                NODE_CAN = document.createElement('canvas'),
                QUALITY = 2;
            NODE_CAN.width = WIDTH.nodeW * QUALITY;
            NODE_CAN.height = WIDTH.nodeH * QUALITY;
            NODE_CAN.style.width = WIDTH.nodeW + 'px';
            NODE_CAN.style.height = WIDTH.nodeH + 'px';

            this.CTX = NODE_CAN.getContext('2d');
            this.CTX.lineJoin = 'bevel';
            this.CTX.scale(QUALITY, QUALITY);
            this.CTX.lineWidth = WIDTH.nodeStroke;
            this.CTX.strokeStyle = COLOR.nodeStroke;
            this.CTX.fillStyle = COLOR.nodeStroke;

            EL.appendChild(NODE_CAN);
        }

        // Input / Output connections
        const
            MAX_IN = {
                [eNodeType.Tone]: 0,
                [eNodeType.Tex]: 1,
                [eNodeType.Envel]: Node.MAX_OUT,
                [eNodeType.Efx]: Node.MAX_OUT
            }[type],
            MAX_OUT = {
                [eNodeType.Tone]: 0,
                [eNodeType.Tex]: 1,
                [eNodeType.Envel]: Node.MAX_OUT,
                [eNodeType.Efx]: Node.MAX_OUT
            }[type],
            EL_OUTPUT_CONTAIN = document.createElement('div');

        if (MAX_OUT) {
            EL_OUTPUT_CONTAIN.classList.add(`${ CLASS }-outputs`);
            EL.appendChild(EL_OUTPUT_CONTAIN);
            this.EL_OUTPUTS = new Array(MAX_OUT)
                .fill('')
                .map((_, i) => {
                    const BUTTON = document.createElement('button');
                    BUTTON.classList.add(
                        `${ CLASS }-output`,
                        `${ CLASS }-output--${ i }`
                    );
                    BUTTON.onclick = () => Tone.selectOutput(this, i);
                    EL_OUTPUT_CONTAIN.appendChild(BUTTON);
                    return BUTTON;
                });
        }

        if (MAX_IN) {
            const EL_INPUT_CONTAIN = document.createElement('div');
            EL_INPUT_CONTAIN.classList.add(`${ CLASS }-inputs`);
            EL.appendChild(EL_INPUT_CONTAIN);
            this.EL_INPUTS = new Array(MAX_IN)
                .fill('')
                .map((_, i) => {
                    const BUTTON = document.createElement('button');
                    BUTTON.classList.add(
                        `${ CLASS }-input`,
                        `${ CLASS }-input--${ i }`
                    );
                    BUTTON.onclick = () => Tone._connectOutput(this, i);
                    EL_INPUT_CONTAIN.appendChild(BUTTON);
                    return BUTTON;
                });
        }
            
        this.EL = EL;
        this.EL_INPUT = EL_INPUT;
        this.updateVisibleInputs();
    }

    set offset(value) {
        value = Math.max(0, value);
        this._offset = value;
        if (value) {
            this.EL.style.marginRight = ((WIDTH.nodeWOuter + WIDTH.nodeGapX) * value) + 'px';
        }
    }

    connectTo(node, outSlot, inSlot) {
        this.outputs.push({
            node,
            outSlot,
            inSlot
        });
        node.inputs.push({
            node: this,
            outSlot,
            inSlot
        });
        this.updateVisibleInputs();
        node.updateVisibleInputs();
    }

    disconnect(inSlot) {
        this.inputs = this.inputs.filter(i => {
            if (i.inSlot === inSlot) {
                i.node.outputs = i.node.outputs
                    .filter(ii => ii.node !== this || ii.inSlot !== inSlot);
                i.node.updateVisibleInputs();
                return false;
            }
            return true;
        });
        this.updateVisibleInputs();
    }

    updateVisibleInputs() {
        const LAST_CLASS = 'tone__node-input--last-visible';
        const INPUT_COUNT = Math.max(
            this.inputs.reduce((max, o) => Math.max(max, o.inSlot + 1), 0),
            this.outputs.reduce((max, o) => Math.max(max, o.outSlot + 1), 0)
        );
        this.EL_INPUTS.forEach((el, i) => {
            el.classList.remove(LAST_CLASS);
            el.style.display = i <= INPUT_COUNT ? 'inline-block' : 'none';
            if (i === INPUT_COUNT) {
                el.classList.add(LAST_CLASS);
            }
        });
        this.EL_OUTPUTS.forEach((el, i) => {
            el.style.display = i <= INPUT_COUNT ? 'inline-block' : 'none';
            el.style.visibility =
                i === INPUT_COUNT
                    ? 'hidden'
                    : 'visible';
        });
        this.availableInputs = Math.max(1, Math.min(this.EL_INPUTS.length, INPUT_COUNT + 1));
    }

    delete() {
        const
            ACTIVE_NODES = Object
                .values(Node.NODES)
                .flat()
                .filter(n =>
                    n.type !== eNodeType.Tone &&
                    n.parentToneIndex === Tone.currentTone.index &&
                    !n.isArpeggChild
                ),
            INDEX = Node.NODES[this.type].indexOf(this),
            ALL_INDEX = ACTIVE_NODES.indexOf(this);

        for (let i = 0; i < Node.MAX_OUT; i++) {
            this.disconnect(i);
        }
        this.EL.parentElement.removeChild(this.EL);
        Node.NODES[this.type].splice(INDEX, 1);
        if (!this.isArpeggChild && this.type === eNodeType.Envel) {
            Envel.updateMaxDuration();
        }
        Tone._renderChart();

        // Focus nearest node, if deleted node is in focus
        if (this.EL_INPUT.checked) {
            if (ACTIVE_NODES.length === 1) {
                Main.setTile(-1);
            } else {
                ACTIVE_NODES[ALL_INDEX + 1 === ACTIVE_NODES.length ? ALL_INDEX - 1 : ALL_INDEX + 1].EL.click();
            }
        }
    }
}