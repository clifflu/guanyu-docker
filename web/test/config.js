"use strict";

var chai = require('chai');
var rewire = require('rewire');

var { config } = rewire('guanyu/config');

describe('test/config.js', function () {
  describe('API Token', function () {
    describe('harvest_api_tokens()', function () {
      var func = config.__get__('harvest_api_tokens');

      it('handle nothing', () => {
        chai.assert(null == func(undefined));
        chai.assert(null == func(null));
        chai.assert(null == func(''));
      });

      it('find one', () => {
        var token = 'asdasdfasdf+=';
        chai.assert(func(token).has(token));
      });

      it('find two', () => {
        var t1 = 'asdasdfasdf+=';
        var t2 = 'ghij';

        var ret = func(t1 + ',' + t2);
        chai.assert(ret.size == 2);
        chai.assert(ret.has(t1));
        chai.assert(ret.has(t2));
      });

      it('handle spaces and empty', () => {
        var t1 = 'asdasdfasdf+=';
        var t2 = 'ghij';

        var ret = func(' ' + t1 + ' ,, , ' + t2);
        chai.assert(ret.size == 2);
        chai.assert(ret.has(t1));
        chai.assert(ret.has(t2));
      });

    });
  });
});
