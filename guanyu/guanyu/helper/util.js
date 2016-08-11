'use strict';


/**
 *
 * @param func
 * @param options
 * @param options.ttl
 * @returns {function()}
 */
function cached(func, options) {
  let cache = {};
  let ttl = options.ttl || 0 ;

  return (arg) => {
    let now_s = Date.now() / 1000 | 0;
    if (cache.result === undefined || now_s >= cache.expires) {
      cache.result = func(arg);
      cache.expires = now_s + ttl;
    }

    return cache.result;
  }

}
