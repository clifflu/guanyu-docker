# Cache

* Queue producer checks cache, consumer updates cache

# Flow change

## Logger shortening

| Type  | Logogram |
| ----- | -------- |
| info  | i        |
| debug | d        |
| error | e        |

## Web Flow

```
Origin                            Next
  file                              file
    myhash.from_filename              hash.from_filename (reject when
                                        payload without filename
                                        or hash fail)
    mycache.get_result (i)            cache.get_result (i)
      get_result_naive (i)              get_result_naive (i)
      get_result_redis (i, e)           get_result_ddb (i, e)
      get_result_ddb (i, e)
    (scan)                            (send_scan_request)
      ensure_sacd_running (i)           upload_file (reject when
      call_sac_scan                       can't use s3
        call_sav_scan_once                or failed read file from local
                                          or failed get file to s3)
                                        queqe.send_message (reject when
                                          can't use SQS
                                          or sendMessage error,
                                          need to delete file)
                                        (catch) delete_file (reject when
                                          have result
                                          or failed delete file
                                          or method exit)
    mycache.update_result (i, e)      cache.update_result (i, e) (reject when miss hash)
      update_result_naive (i)           update_result_naive (i)
      update_result_redis (i, e)        update_result_ddb (i, e)
      update_result_ddb (i, e)
                                      polling (reject when timeout)

  uri                               uri
    myhash.from_string                hash.from_string (reject when payload without string)
    shortcut_host_whitelist (i)       shortcut_host_whitelist (i)
    mycache.get_result (i)            cache.get_result (i)
      get_result_naive (i)              get_result_naive (i)
      get_result_redis (i, e)           get_result_ddb (i, e)
      get_result_ddb (i, e)
    (fetch url and scan)              send_fetch_request
      fetch_uri
        _fetch_uri
      file_scanner.call_sav_scan
    mycache.update_result (i, e)      cache.update_result (i, e) (reject when miss hash)
      update_result_naive (i)           update_result_naive (i)
      update_result_redis (i, e)        update_result_ddb (i, e)
      update_result_ddb (i, e)
                                      polling (reject when timeout)

  text                              text
    myhash.from_string                hash.from_string (reject when payload without string)
    mycache.get_result (i)            cache.get_result (i)
      get_result_naive (i)              get_result_naive (i)
      get_result_redis (i, e)           get_result_ddb (i, e)
      get_result_ddb (i, e)
    check_text                        check_text
    mycache.update_result (i, e)      cache.update_result (i, e) (reject when miss hash)
      update_result_naive (i)           update_result_naive (i)
      update_result_redis (i, e)        update_result_ddb (i, e)
      update_result_ddb (i, e)
```
