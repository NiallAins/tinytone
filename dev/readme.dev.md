# Dev notes

## Development

### Web app

Web app development can be done without build scripts, as all modules are `.js`.\
Open `index.html` with local server to view app.\
VsCode with extension "Live Server" recommended option.

### Library

Before compiling library install dev packages with:

```bash
nvm use 22 # Optional
npm install
```

Compile and build library by running:

```bash
npm run build-library
```


## To do


### Bugs

- Sticky tone headers break on mobile after fifth tones - refactor UI


### Testing

- test volume issues
- cross-browser


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
    - efx out when no second efx
- more presets
- more reverbs
- Animated volumes on nodes


### Stretch goals

- tone presets
- local storage
    - save previous tones
    - recreate from uploads
- refactor in Vue + Typescript