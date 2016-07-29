#!/bin/bash

#
# Run Guanyu in upstream container (clifflu/sophos-av-npm) for development
#

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

docker run --rm -it \
  --name guanyu \
  -p 3000:3000 \
  -v "$SCRIPT_DIR/guanyu:/guanyu" \
  clifflu/sophos-av-npm \
  node /guanyu/bin/www
