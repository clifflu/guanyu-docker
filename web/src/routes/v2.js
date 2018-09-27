const route_helper = require('../helper/route');
const { config } = require('guanyu-core');
const max_size = config.get('SAMPLE:MAX_SIZE');
const upload = require('multer')({ limits: { fileSize: max_size }, dest: '/tmp/' });
const { handle_result, handle_err } = require('./handle');
const router = require('express').Router();

router.get('/file', (req, res) => {
  route_helper.do_render(res, 'usage-scan-file');
});

router.post('/file', upload.single('file'), (req, res) => {
  require('../scanner/file').scan_file(
    req.file ? req.file.path : undefined,
    route_helper.collect_options(req)
  ).then(handle_result(res), handle_err(res));
});

router.get('/uri', (req, res) => {
  route_helper.do_render(res, 'usage-scan-uri');
});

router.post('/uri', (req, res) => {
  require('../scanner/uri').scan_uri(
    req.body.uri,
    route_helper.collect_options(req)
  ).then(handle_result(res), handle_err(res));
});


router.get('/text', (req, res) => {
  route_helper.do_render(res, 'usage-scan-text');
});

router.post('/text', (req, res) => {
  require('../scanner/text').scan_text(
    req.body.text,
    route_helper.collect_options(req)
  ).then(handle_result(res), handle_err(res));
});

module.exports = router;