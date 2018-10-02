FROM node:10-alpine

COPY ./fetch ./fetch
COPY ./guanyu-core ./guanyu-core

RUN cd /fetch && npm install --production && npm dedupe
RUN cd /guanyu-core && npm install --production && npm dedupe

WORKDIR /fetch

CMD ["npm", "run", "start"]
