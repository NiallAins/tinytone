/**
    interface InputRangeGraph {
        readonly ELEMENT: HTMLDivElement;
        readonly CANVAS: HTMLCanvasElement;
        value: tAxisValue[];
        renderCallback: tRenderCallback;
            
        constructor(
            xAxis: tAxis,
            yAxis: tAxis,
            inputs: tInput[],
            renderCallback: tRenderCallback
        ): void;
        
        setInputProperty: (
            inputIndex: number,
            property: string,
            value: number
        ) => void;

        setView: (
            xAxisRange: tMinMax,
            yAxisRange: tMinMax
        ) => void;
    }

    type tMinMax = number | [number, number];
    type tAxis = tMinMax | [min: number, max: number, padPxStart?: number, padPxEnd?: number];
    type tAxisValue = number | [xValue: number, yValue: number];

    type tRenderCallback = (
        context: CanvasRenderingContext2D,
        points: tInputPoint[],
        pointSpacetoCanvasSpace:
            ((x: number, y: number) => { x: number, y: number }) |
            ((point: tInputPoint)   => { x: number, y: number }) |
            ((context: CanvasRenderingContext2D) => void)
    ) => void;

    type tInputPoint = {
        x: number,
        y: number
    };

    type tInput = {
        value?: tAxisValue;
        x?: number;
        y?: number;
        min?: tAxisValue;
        max?: tAxisValue;
        bindX?: tBind;
        bindY?: tBind;
        bindMinX?: tBind; 
        bindMinY?: tBind;
        bindMaxX?: tBind;
        bindMaxY?: tBind;
        oninput?: (
            newValue: tAxisValue,
            prevValue: tAxisValue,
            inputs: tInputPoint[]
        )
    }

    type tBind = {
        [inputIndex: number]:
            'x' |
            'y' |
            (x: number, y: number, inps: tInputPoint[]) => number
    };
 */

class _InputRangeGraph_input {
    //
    // Public readonly properties
    //
    INPUT_H = null;
    INPUT_V = null;
    
    //
    // Private reaonly properties
    //
    _PARENT;
    _MIN_X;
    _MAX_X;
    _MIN_Y;
    _MAX_Y;

    //
    // Public properties
    //
    index;
    focus = false;
    hover = false;
    active = false;
    rangeX0;
    rangeX1;
    rangeY0;
    rangeY1;
    oninput;
    
    //
    // Private properties
    //
    _x;
    _y;
    _prevX;
    _prevY;
    _stepH;
    _stepV;
    _rangeX0;
    _rangeX1;
    _rangeY0;
    _rangeY1;
    _bindX0 = null;
    _bindX1 = null;
    _bindY0 = null;
    _bindY1 = null;
    _depends = [];
    _disabled = false;
    

    //
    // Constructor
    //
    constructor(parent, props, index, xAxis, yAxis) {
        this._PARENT = parent;
        this.index = index;
        this._MIN_X = Math.min(xAxis[0], xAxis[1]);
        this._MAX_X = Math.max(xAxis[0], xAxis[1]);
        this._MIN_Y = Math.min(yAxis[0], yAxis[1]);
        this._MAX_Y = Math.max(yAxis[0], yAxis[1]);

        this._setInputs(props);

        this.value = props.value;
        this.step = props.step;
        this.min = props.min;
        this.max = props.max;
        Object
            .entries(props)
            .filter(p => p[1] != null)
            .forEach(p => this[p[0]] = p[1]);
    }


    //
    // Setters
    //

    set disabled(value) {
        this._disabled = value;
        this.INPUT_H?.setAttribute('tabIndex', value ? 0 : -1);
        this.INPUT_V?.setAttribute('tabIndex', value ? 0 : -1);
    }

    get disabled() {
        return this._disabled;
    }

    set value(value) {
        if (this.INPUT_H) {
            this._x = this._numOrDefault(value, 0, this._MIN_X);
        }
        if (this.INPUT_V) {
            this._y = this._numOrDefault(value, 1, this._MIN_Y);
        }
    }

    set step(value) {
        this._stepH = this._numOrDefault(value, 0, 'any', true);
        this._stepV = this._numOrDefault(value, 1, 'any', true);
        this.INPUT_H ? this.INPUT_H.step = this._stepH : null;
        this.INPUT_V ? this.INPUT_V.step = this._stepV : null;
    }

    set min(value) {
        this._rangeX0 = this._numOrDefault(value, 0, this._MIN_X);
        this._rangeY0 = this._numOrDefault(value, 1, this._MIN_Y);
    }

    set max(value) {
        this._rangeX1 = this._numOrDefault(value, 0, this._MAX_X);
        this._rangeY1 = this._numOrDefault(value, 1, this._MAX_Y);
    }

    set x(value) {
        this._x = this._rangeX0 = this._rangeX1 = this._numOrDefault(value, 0, this._MIN_X);
    }

    set y(value) {
        this._y = this._rangeY0 = this._rangeY1 = this._numOrDefault(value, 0, this._MIN_Y);
    }

    set bindMin(value) {
        if (this.INPUT_H) {
            this._bindX0 = this._getBindFunctions(value);
        }
        if (this.INPUT_V) {
            this._bindY0 = this._getBindFunctions(value);
        }
    }

    set bindMax(value) {
        if (this.INPUT_H) {
            this._bindX1 = this._getBindFunctions(value);
        }
        if (this.INPUT_V) {
            this._bindY1 = this._getBindFunctions(value);
        }
    }

    set bindX(value) {
        this._bindX0 = this._getBindFunctions(value);
        this._bindX1 = this._getBindFunctions(value);
    }

    set bindY(value) {
        this._bindY0 = this._getBindFunctions(value);
        this._bindY1 = this._getBindFunctions(value);
    }

    set bindXMin(value) {
        this._bindX0 = this._getBindFunctions(value);
    }

    set bindXMax(value) {
        this._bindX1 = this._getBindFunctions(value);
    }

    set bindYMin(value) {
        this._bindY0 = this._getBindFunctions(value);
    }

    set bindYMax(value) {
        this._bindY1 = this._getBindFunctions(value);
    }


    //
    // Getters
    //

    get value() {
        return [this._x, this._y];
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    get min() {
        return [ this._rangeX0, this._rangeY0 ];
    }

    get max() {
        return [ this._rangeX1, this._rangeY1 ];
    }


    //
    // Public methods
    //

    setDepends() {
        const I = this._PARENT.inputs.indexOf(this);
        this._depends = this._PARENT.inputs
            .map(inp => ({
                inp,
                bounds: [
                    !!(inp._bindX0 && inp._bindX0[I]),
                    !!(inp._bindX1 && inp._bindX1[I]),
                    !!(inp._bindY0 && inp._bindY0[I]),
                    !!(inp._bindY1 && inp._bindY1[I])
                ]
            }))
            .filter(d => d.bounds.some(b => b))
            .map(d => d.inp);
    }

    update(callers = [], dependant) {
        // Prevent circular dependencies
        if (callers.includes(this)) {
            return;
        }

        // Set position
        const R_X0 = this._resolveProp(this._rangeX0);
        if (this.INPUT_H && R_X0 !== this.rangeX0) {
            this.INPUT_H.min = R_X0;
        }
        this.rangeX0 = R_X0;

        const R_Y0 = this._resolveProp(this._rangeY0);
        if (this.INPUT_V && R_Y0 !== this.rangeY0) {
            this.INPUT_V.min = R_Y0;
        }
        this.rangeY0 = R_Y0;

        const R_X1 = this._resolveProp(this._rangeX1);
        if (this.INPUT_H && R_X1 !== this.rangeX1) {
            this.INPUT_H.max = R_X1;
        }
        this.rangeX1 = R_X1;

        const R_Y1 = this._resolveProp(this._rangeY1);
        if (this.INPUT_V && R_Y1 !== this.rangeY1) {
            this.INPUT_V.max = R_Y1;
        }
        this.rangeY1 = R_Y1;

        // Apply bounds
        const
            BIND_X0 =
                dependant && this._bindX0 && this._bindX0[dependant.index]
                    ? this._bindX0[dependant.index](dependant.x, dependant.y, this._PARENT.inputs)
                    : R_X0,
            BIND_X1 =
                dependant && this._bindX1 && this._bindX1[dependant.index]
                    ? this._bindX1[dependant.index](dependant.x, dependant.y, this._PARENT.inputs)
                    : R_X1,
            BIND_Y0 =
                dependant && this._bindY0 && this._bindY0[dependant.index]
                    ? this._bindY0[dependant.index](dependant.x, dependant.y, this._PARENT.inputs)
                    : R_Y0,
            BIND_Y1 =
                dependant && this._bindY1 && this._bindY1[dependant.index]
                    ? this._bindY1[dependant.index](dependant.x, dependant.y, this._PARENT.inputs)
                    : R_Y1,
            X = Math.min(R_X1, Math.max(R_X0,
                Math.min(BIND_X1, Math.max(BIND_X0,
                    this._stepH === 'any'
                        ? this._x
                        : (Math.floor((this._x - this.rangeX0) / this._stepH) * this._stepH) + this.rangeX0
                ))
            )),
            Y = Math.min(R_Y1, Math.max(R_Y0,
                Math.min(BIND_Y1, Math.max(BIND_Y0,
                    this._stepH === 'any'
                        ? this._y
                        : (Math.floor((this._y - this.rangeY0) / this._stepV) * this._stepV) + this.rangeY0
                ))
            ));

        // Set values
        if (this.INPUT_H && X !== this._x) {
            this.INPUT_H.value = X;
            this._x = X;
        }
        
        if (this.INPUT_V && Y !== this._y) {
            this.INPUT_V.value = Y;
            this._y = Y;
        }

        // oninput function
        const DEPENDS = [...this._depends];
        if (callers.length === 0 && this.oninput) {
            const THIS = this;
            this.oninput(
                [this._x, this._y],
                [this._prevX, this._prevY],
                this._PARENT.inputs
                .map(inp => new Proxy(inp, {
                    set(obj, prop, value) {
                        if (obj !== THIS) {
                            if (DEPENDS.indexOf(inp) === -1) {
                                DEPENDS.push(inp);
                            }
                            if (prop === 'x') {
                                obj._x = value;
                            } else if (prop === 'y') {
                                obj._y = value;
                            }
                        }
                    }
                }))
            );
        }

        this._prevX = this._x;
        this._prevY = this._y;

        // Update dependants
        callers.push(this);
        DEPENDS.forEach(dep => dep.update(callers, this));
    }

    setValueFromPoint(x, y) {
        if (this.INPUT_H) {
            this.INPUT_H.value = this._x = x;
        }
        if (this.INPUT_V) {
            this.INPUT_V.value = this._y = y;
        }
        (this.INPUT_H || this.INPUT_V).focus();
        this.update();
    }


    //
    // Private methods
    //

    _setInputs(props) {
        if (
            (typeof props.value === 'object' && props.value.length > 1) ||
            (typeof props.step === 'object'  && props.value.length > 1) ||
            [
                props.min,
                props.max
            ].some(p => typeof p === 'object' && p.length > 1 && p[0] !== p[1])
        ) {
            this._createInput(false);
            this._createInput(true);
        } else if (props.x != null && props.y == null) {
            this._createInput(true);
        } else {
            this._createInput(false);
        }
    }

    _createInput(isVertical) {
        const INPUT = document.createElement('input');
        INPUT.setAttribute('type', 'range');
        this._PARENT.ELEMENT.appendChild(INPUT);

        INPUT.onfocus = () => {
            this.focus = true;

            this._PARENT._callRender();
        };
        INPUT.onblur = () => {
            this.focus = false;

            this._PARENT._callRender();
        };
        INPUT.oninput = e => {
            isVertical
                ? this._y = parseFloat(INPUT.value)
                : this._x = parseFloat(INPUT.value);
            this.update();

            this._PARENT._callRender();
            this._PARENT._emitInputEvent();
            e?.stopPropagation();
        };
        INPUT.onchange = e => {
            this._PARENT._emitChangeEvent();
            e.stopPropagation();
        };
        INPUT.onkeydown = e => {
            if (
                (
                    isVertical &&
                    this.INPUT_H &&
                    (e.code === 'ArrowLeft' || e.code === 'ArrowRight')
                ) || (
                    !isVertical &&
                    this.INPUT_V &&
                    (e.code === 'ArrowDown' || e.code === 'ArrowUp')
                )
            ) {
                e.preventDefault();
                if (isVertical) {
                    this.INPUT_H.focus();
                    this.INPUT_H.value =
                        this._x +
                        (this._stepH * (e.code === 'ArrowRight' ? 1 : -1));
                    this.INPUT_H.oninput();
                } else {
                    this.INPUT_V.focus();
                    this.INPUT_V.value =
                        this._y +
                        (this._stepV * (e.code === 'ArrowUp' ? 1 : -1));
                    this.INPUT_V.oninput();
                }
            }
        };

        isVertical ? this.INPUT_V = INPUT : this.INPUT_H = INPUT;
        this.INPUT_V?.setAttribute('tabIndex', this.INPUT_V && this.INPUT_H ? -1 : 0);
    }

    _getBindFunctions(values) {
        return Object.fromEntries(
            Object
                .entries(values || {})
                .map(v => [
                    v[0],
                    v[1] === 'x'
                        ? x => x
                        : v[1] === 'y'
                        ? (_, y) => y
                        : typeof v[1] === 'function'
                        ? v[1]
                        : null
                ])
        );
    }

    _numOrDefault(num, i, def, preventZero = false) {
        let value = num && typeof num === 'object' ? num[Math.min(num.length - 1, i)] : num;
        if (typeof value === 'function') {
            return value;
        }
        value = parseFloat(value);
        return value || (!preventZero && value === 0) ? value : def;
    }

    _resolveProp(prop) {
        return typeof prop === 'function'
            ? prop(this._PARENT.inputs)
            : prop;
    }
}

class InputRangeGraph {
    //
    // Static properties
    //
    static _stylesAdded = false;
    static _CLASS = 'input-range-graph';
    static _COLOR = {
        track:            '#efefef',
        trackHover:       '#e8e8e8',
        trackBorder:      '#b2b2b2',
        trackBorderHover: '#b0b0b0',
        fill:             '#0275ff',
        fillHover:        '#075fc7',
        outline:          '#000000'
    };

    //
    // Static methods
    //
    static addStyles() {
        const STYLE = document.createElement('style');
        STYLE.innerHTML = `
            .${ this._CLASS } {
                position: relative;
                width: min(400px, calc(100% - 32px));
                height: 300px;
            }
            .${ this._CLASS } canvas {
                width: 100%;
                height: 100%
            }
            .${ this._CLASS } input[type="range"] {
                position: absolute;
                inset: 0 0 100% 100%;
            }
            .${ this._CLASS } input[type="range"]::-webkit-slider-thumb {
                display: none;
            }
        `;
        document.head.prepend(STYLE);
        this._stylesAdded = true;
    }

    //
    // Public readonly properties
    //
    ELEMENT = null;
    CANVAS = null;

    //
    // Private readonly properties
    //
    _CTX = null;

    //
    // Public properties
    //
    inputs = [];
    _renderFunc =
        (c, pts, toPx) => {
            c.lineCap = 'round';
            
            pts
                .sort((a, b) => 
                    (a.hover || a.focus || a.active ? 1 : -1) -
                    (b.hover || b.focus || b.active ? 1 : -1)
                )
                .map(p => toPx(p))
                .forEach(p => {
                    // Track
                    let stroke = 8;
                    c.lineWidth = stroke;
                    c.beginPath();
                        c.strokeStyle = p.hover || p.active
                            ? InputRangeGraph._COLOR.trackBorderHover
                            : InputRangeGraph._COLOR.trackBorder;
                        c.moveTo(p.x, p.min[1] - (stroke * 0.5));
                        c.lineTo(p.x, p.max[1] + (stroke * 0.5));
                        c.moveTo(p.min[0] + (stroke * 0.5), p.y);
                        c.lineTo(p.max[0] - (stroke * 0.5), p.y);
                    c.stroke();

                    // Track border
                    stroke -= 2;
                    c.lineWidth = stroke;
                    c.beginPath();
                        c.strokeStyle = p.hover || p.active
                            ? InputRangeGraph._COLOR.trackHover
                            : InputRangeGraph._COLOR.track;
                        c.moveTo(p.x, p.min[1] - (stroke * 0.5) - 1);
                        c.lineTo(p.x, p.max[1] + (stroke * 0.5) + 1);
                        c.moveTo(p.min[0] + (stroke * 0.5) + 1, p.y);
                        c.lineTo(p.max[0] - (stroke * 0.5) - 1, p.y);
                    c.stroke();

                    // Fill
                    stroke += 2;
                    c.lineWidth = stroke;
                    c.beginPath();
                        c.strokeStyle = p.hover || p.active
                            ? InputRangeGraph._COLOR.fillHover
                            : InputRangeGraph._COLOR.fill;
                        c.moveTo(p.x, p.min[1] - (stroke * 0.5));
                        c.lineTo(p.x, p.y);
                        c.moveTo(p.min[0] + (stroke * 0.5), p.y);
                        c.lineTo(p.x, p.y);
                    c.stroke();

                    // Thumb
                    c.beginPath();
                        c.fillStyle = p.hover || p.active
                            ? InputRangeGraph._COLOR.fillHover
                            : InputRangeGraph._COLOR.fill;
                        c.arc(p.x, p.y, 8, 0, Math.PI * 2);
                    c.fill();
                    
                    // Focus
                    if (p.focus || p.active) {
                        c.lineWidth = 2;
                        c.strokeStyle = InputRangeGraph._COLOR.outline;
                        c.beginPath();
                            c.fillStyle = p.hover || p.active
                                ? InputRangeGraph._COLOR.fillHover
                                : InputRangeGraph._COLOR.fill;
                            c.arc(p.x, p.y, 12, 0, Math.PI * 2);
                        c.stroke();  
                    }
                });
        };

    //
    // Private properties
    //
    _xAxis;
    _yAxis;
    _xAxisPad;
    _yAxisPad;
    _inputActive = -1;
    
    constructor(xAxis, yAxis, inputProps, renderCallback) {
        // Add global styles
        if (!InputRangeGraph._stylesAdded) {
            InputRangeGraph.addStyles();
        }

        // Set DOM
        this.CANVAS = document.createElement('canvas');
        this._CTX = this.CANVAS.getContext('2d');
        this.ELEMENT = document.createElement('div');
        this.ELEMENT.classList.add(InputRangeGraph._CLASS);
        this.ELEMENT.appendChild(this.CANVAS);

        // Mouse event listeners
        this.CANVAS.onmousemove = this.CANVAS.ontouchmove = this._onmousemove.bind(this);
        document.body.addEventListener('mousemove', e => this._inputActive > -1 ? this._onmousemove(e) : null);
        this.CANVAS.onmousedown = this.CANVAS.ontouchstart = this._onmousedown.bind(this);
        this.CANVAS.onmouseup = this.CANVAS.ontouchend = this._onmouseup.bind(this);
        document.body.addEventListener('mouseup', this._onmouseup.bind(this));
        document.body.addEventListener('touchend', this._onmouseup.bind(this));
        document.body.addEventListener('mouseleave', this._onmouseup.bind(this));
        document.body.addEventListener('touchleave', this._onmouseup.bind(this));

        // Rendering
        if (renderCallback) {
            this.render = renderCallback;
        }
        this.setView(xAxis, yAxis, true);
        new ResizeObserver(() => this._updateSize())
            .observe(this.ELEMENT);

        // Inputs
        this.inputs = inputProps.map((p, pi) => new _InputRangeGraph_input(this, p, pi, this._xAxis, this._yAxis));
        this.inputs.forEach(inp => inp.setDepends());
        this.inputs.forEach(inp => inp.update([{}]));
        
        setTimeout(() => this._updateSize());
    }

    set value(values) {
        values.forEach((v, vi) => v == null ? null : this.inputs[vi].value = v);
        values.forEach((v, vi) => v == null ? null : this.inputs[vi].update([{}]));
        this._callRender();
    }

    set render(value) {
        this._renderFunc = value;
    } 

    get value() {
        return this.inputs.map(inp => inp.value);
    }

    get render() {
        return this._callRender.bind(this);
    }

    setInputProperty(input, prop, value) {
        const INP = this.inputs[input];
        INP[prop] = value;
        this.inputs.forEach(inp => inp.setDepends(this.inputs));
        INP.update();
        this._callRender();
    }

    setView(x, y, _perventRender = false) {
        if (typeof x === 'object' && typeof x.length === 'undefined') {
            Object
                .entries(x)
                .forEach(e => {
                    switch (e[0]) {
                        case 'minX':      this._xAxis[0]    = e[1]; break;
                        case 'maxX':      this._xAxis[1]    = e[1]; break;
                        case 'minY':      this._yAxis[0]    = e[1]; break;
                        case 'maxY':      this._yAxis[1]    = e[1]; break;
                        case 'padLeft':   this._xAxisPad[0] = e[1]; break;
                        case 'padRight':  this._xAxisPad[1] = e[1]; break;
                        case 'padBottom': this._yAxisPad[0] = e[1]; break;
                        case 'padTop':    this._yAxisPad[1] = e[1]; break;
                    }
                });
        } else {
            this._xAxis    = typeof x === 'number' ? [0, x] : [x[0], x[1]];
            this._yAxis    = typeof y === 'number' ? [y, 0] : [y[1], y[0]];
            this._xAxisPad = typeof x === 'number' ? [0, 0] : [x[2] || 0, x[3] || 0];
            this._yAxisPad = typeof y === 'number' ? [0, 0] : [y[3] || 0, y[2] || 0];
        }
        if (!_perventRender) {
            this._updateSize();
        }
    }

    _updateSize() {
        const QUALITY = 2;
        this.CANVAS.width  = this.CANVAS.offsetWidth  * QUALITY;
        this.CANVAS.height = this.CANVAS.offsetHeight * QUALITY;
        this._xAxis[2] = (this.CANVAS.offsetWidth  - (this._xAxisPad[0] + this._xAxisPad[1])) / (this._xAxis[1] - this._xAxis[0]);
        this._yAxis[2] = (this.CANVAS.offsetHeight - (this._yAxisPad[0] + this._yAxisPad[1])) / (this._yAxis[1] - this._yAxis[0]);
        this._CTX.scale(QUALITY, QUALITY);
        this._CTX.translate(this._xAxisPad[0], this._yAxisPad[0]);
        this._callRender();
    }

    _callRender() {
        this._CTX.save();
            this._CTX.setTransform(1, 0, 0, 1, 0, 0);
            this._CTX.clearRect(0, 0, this.CANVAS.width, this.CANVAS.height);
        this._CTX.restore();
        this._CTX.save();
            this._renderFunc(
                this._CTX,
                this.inputs.map(inp => ({
                    x: inp.x,
                    y: inp.y,
                    min: inp.min,
                    max: inp.max,
                    hover: inp.hover,
                    focus: inp.focus,
                    active: inp.active,
                    disabled: inp.disabled
                })),
                this._graphPointToCanvasPoint.bind(this)
            )
        this._CTX.restore();
    }

    _graphToCanvas(p, isY) {
        return isY
            ? (p - this._yAxis[0]) * this._yAxis[2]
            : (p - this._xAxis[0]) * this._xAxis[2];
    }

    _graphPointToCanvasPoint(obj, y = 0) {
        return typeof obj === 'number'
            ?   {
                    x: this._graphToCanvas(obj, false),
                    y: this._graphToCanvas(  y, true)
                }
            :   obj.canvas
            ?   obj.transform(
                    this._xAxis[2], 0, 0, this._yAxis[2],
                    -1 * this._xAxis[2] * this._xAxis[0],
                    -1 * this._yAxis[2] * this._yAxis[0]
                )
            :   {
                    ...obj,
                    x: this._graphToCanvas(obj.x, false),   
                    y: this._graphToCanvas(obj.y, true),
                    min: obj.min
                        ?   [
                                this._graphToCanvas(obj.min[0], false),
                                this._graphToCanvas(obj.min[1], true)
                            ]
                        : undefined,
                    max: obj.max
                        ?   [
                                this._graphToCanvas(obj.max[0], false),
                                this._graphToCanvas(obj.max[1], true)
                            ]
                        : undefined
                };
    }

    _onmousemove(e) {
        const
            BOX = this.CANVAS.getBoundingClientRect(),
            X = e.clientX - BOX.left - this._xAxisPad[0],
            Y = e.clientY - BOX.top - this._yAxisPad[0],
            INP_HOVER = this._nearInput(X, Y);

        let renderHover = false;
        this.inputs.forEach((inp, i) => {
            const HOVER = i === INP_HOVER;
            if (inp.hover !== HOVER) {
                inp.hover = HOVER;
                renderHover = true;
            }
        });
        this.CANVAS.style.cursor = INP_HOVER > -1 ? 'pointer' : 'default';

        if (this._inputActive > -1) {
            this.inputs[this._inputActive].setValueFromPoint(
                (X / this._xAxis[2]) - this._xAxis[0],
                (Y / this._yAxis[2]) + this._yAxis[0]
            );
            this._emitInputEvent();
        }
        if (this._inputActive > -1 || renderHover) {
            this._callRender();
        }
    }

    _onmousedown(e) {
        const
            BOX = this.CANVAS.getBoundingClientRect(),
            INPUT = this._nearInput(
                e.clientX - BOX.left - this._xAxisPad[0],
                e.clientY - BOX.top  - this._yAxisPad[0]
            );
        if (INPUT > -1) {
            this._inputActive = INPUT;
            this.inputs[INPUT].active = true;

            this._callRender();
        }
    }

    _onmouseup() {
        if (this._inputActive > -1) {
            const INP = this.inputs[this._inputActive];
            (INP.INPUT_H || INP.INPUT_V).focus();
            INP.active = false;
            this._inputActive = -1;
            this._emitChangeEvent();

            this._callRender();
        }
    }

    _emitChangeEvent() {
        this.ELEMENT.dispatchEvent(new Event('change', { bubbles: true }));
    }

    _emitInputEvent() {
        this.ELEMENT.value = this.value;
        this.ELEMENT.dispatchEvent(new Event('input', { bubbles: true }));
    }

    _nearInput(x, y) {
        const PT_RAD_SQR = 100;
        return this.inputs.findLastIndex(inp =>
            !inp.disabled &&
            (
                (((inp.x - this._xAxis[0]) * this._xAxis[2]) - x)**2 +
                (((inp.y - this._yAxis[0]) * this._yAxis[2]) - y)**2 < PT_RAD_SQR
            )
        );
    }
}