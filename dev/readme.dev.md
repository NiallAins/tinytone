# Dev notes

## Development

Before compiling library install:

```bash
npm install uglify-js -g
npm install typescript -g
```

Compile and build library by running:

```bash
.\library\build.sh
```

## To do


### Bugs

- Sticky tone headers break on mobile after fifth tones - refactor UI


### Testing

- test volume issues
- cross-browser
- cross-system
- cross-device


### Must have features


### Nice to have features

- Context menu
    - delete
    - duplicate
    - mute - remove optional tex input?
    - duplicate to tone
    - bypass - only envel and efx
- Hide unusable outputs / inputs
    - Envel with no effect
    - envel inp when envel out selected
    - efx out when no second efx
- more presets
- more reverbs
- draw connector cord when dragging
- Animated volumes on nodes


### Stretch goals

- tone presets
- local storage
    - save previous tones
    - recreate from uploads
- refactor in Vue + Typescript