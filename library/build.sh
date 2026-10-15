#!/usr/bin/env bash

# Transpile and minify
tsc ./library/tinytone.ts -t esNext --module preserve;
uglifyjs ./library/tinytone.js -o ./dev/tinytone.js -c -m;
rm -f ./library/tinytone.js;
rm -f ./library/tinytone.defs.js;

# Copy library as text to data folder
echo -n "export default '" > ./app/scripts/data/tinytone.export.js;
cat ./dev/tinytone.js >> ./app/scripts/data/tinytone.export.js;
echo -n "'" >> ./app/scripts/data/tinytone.export.js;

# Copy defs as text to data folder
echo -n 'export default `' > ./app/scripts/data/tinytone.defs.export.js;
cat ./library/tinytone.defs.ts >> ./app/scripts/data/tinytone.defs.export.js;
echo '`' >> ./app/scripts/data/tinytone.defs.export.js;