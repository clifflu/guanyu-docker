var extend = require('extend');


function collect_options(req) {
  return {
    bypass_read_cache: req.body.bypass_read_cache || false
  };
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
