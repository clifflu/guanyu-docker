FROM clifflu/sophos-av-npm

RUN sed -i "s/<Email><Status>enabled/<Email><Status>disabled/" /opt/sophos-av/etc/savd.cfg
COPY ./guanyu /guanyu
RUN cd /guanyu && npm install

EXPOSE 3000

CMD /opt/sophos-av/bin/savdctl start && cd /guanyu && npm run start
