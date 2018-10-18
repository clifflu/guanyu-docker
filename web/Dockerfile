FROM node:alpine

COPY ./web /web
COPY ./guanyu-core /guanyu-core

RUN cd /web && npm install --production && npm dedupe
RUN cd /guanyu-core && npm install --production && npm dedupe
WORKDIR /web

EXPOSE 3000

CMD ["npm", "run", "start"]
