var extend = require('extend');


function collect_options(req) {
  var options = {
    bypass_cache: req.body.bypass_read_cache || false,
    fall_with_upstream: req.body.fall_with_upstream || false,
  };

  extend(options, {
    bypass_read_cache: options.bypass_cache || req.body.bypass_read_cache || false,
  });

  return options;
}

function do_render(res, template, options) {
  return res.render(
    template,
    extend(
      {},
      options ||
      {}, {'version': require("../version")}
    )
  );
}


module.exports = {
  collect_options: collect_options,
  do_render: do_render
};
