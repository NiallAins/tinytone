export function getEl(query, isArray) {
    const ELS = Array.from(document.querySelectorAll(query));
    return isArray === 1
        ? ELS
        : isArray === -1
        ? ELS[0]
        : ELS.length === 0
        ? null
        : ELS.length === 1
        ? ELS[0]
        : ELS;
}

export function createRangeInput(value, max = 1, min = 0, step = 0.01, label) {
    const INPUT = document.createElement('input');
    INPUT.type = 'range';
    INPUT.min = min;
    INPUT.max = max;
    INPUT.step = step;
    INPUT.value = value;
    if (label) {
        const
            LABEL = document.createElement('label'),
            ID = 'inputRange_' + Math.random().toString().substring(2);
        INPUT.id = ID;
        LABEL.setAttribute('for', ID);
        LABEL.innerHTML = `<span> ${ label } </span>`;
        LABEL.appendChild(INPUT);
        return [INPUT, LABEL];
    } else {
        return INPUT;
    }
}

export function createRadioButton(value, name, label) {
    const
        ID = `radioButton__${ name }_${ value }`,
        LABEL = document.createElement('label'),
        INPUT = document.createElement('input');

    LABEL.classList.add('radio-button');
    LABEL.setAttribute('for', ID);
    if (label) {
        LABEL.innerText = label;
    }

    INPUT.type = 'radio';
    INPUT.classList.add('radio-button__input');
    INPUT.setAttribute('id', ID);
    INPUT.name = name;
    INPUT.value = value;

    LABEL.appendChild(INPUT);

    return [INPUT, LABEL];
}

export function createCheckbox(label) {
    const
        ID = `check__${ label }`,
        LABEL = document.createElement('label'),
        INPUT = document.createElement('input');

    LABEL.classList.add('checkbox');
    LABEL.setAttribute('for', ID);
    if (label) {
        LABEL.innerText = label;
    }

    INPUT.type = 'checkbox';
    INPUT.classList.add('checkbox__input');
    INPUT.setAttribute('id', ID);
    LABEL.appendChild(INPUT);

    return [INPUT, LABEL];
}