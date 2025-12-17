#!/bin/bash

# Transpile and minify
tsc ./library/tinytone.ts -t esNext --module preserve;
uglifyjs ./library/tinytone.js -o ./dev/tinytone.js;
rm ./library/*.js;

# Copy library to data folder
echo -n "export default '" > ./app/scripts/data/tinytone.export.js;
cat ./dev/tinytone.js >> ./app/scripts/data/tinytone.export.js;
echo -n "'" >> ./app/scripts/data/tinytone.export.js;

# Copy defs to data folder
echo -n 'export default `' > ./app/scripts/data/tinytone.defs.export.js;
cat ./library/tinytone.defs.ts >> ./app/scripts/data/tinytone.defs.export.js;
echo '`' >> ./app/scripts/data/tinytone.defs.export.js;