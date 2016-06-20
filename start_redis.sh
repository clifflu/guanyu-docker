#!/bin/bash
docker run -d --name "guanyu-store" redis redis-server --save 60 5
