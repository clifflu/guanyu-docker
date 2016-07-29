# Guanyu

RESTful API wrapper for [Sohpos Antivirus for Linux Free](https://www.sophos.com/en-us/products/free-tools/sophos-antivirus-for-linux.aspx) 
on top of [maxipowa/sophos-av](https://github.com/maxpowa/sophos-av-docker).

## Install

```
docker pull clifflu/guanyu
```

## Starting Guanyu

```
docker run -d -p 3000:3000 clifflu/guanyu
```

## Using Guanyu

```
curl -X POST -F "file=@/tmp/virus.exe" http://localhost:3000/scan/file"
```

## Environment Options

### API Token

* Env name: `API_TOKEN`
* Format: characters separated by comma (,)
* When enabled, POST requests must have request header `Api-Token` set with matching values to be authenticated.

### Cache

#### AWS DynamoDB

* Env name: `CACHE__DDB__HOST`
* Format: table name 
* Enables cache on AWS DynamoDB

* Env name: `CACHE__DDB__DISABLED`,
* Type: boolean (0/1 preferred)
* Disable DynamoDB even if `CACHE__DDB__TABLE` is set.

#### Redis

* Env name: `CACHE__REDIS__HOST`
* Format: IP or domain name to Redis server
* Enables cache on redis

* Env name: `CACHE__REDIS__DISABLED`,
* Type: boolean (0/1 preferred)
* Disable redis even if `CACHE__REDIS__HOST` is set.

```
docker run -d --name guanyu-storage redis redis-server --save 30 5  # Start redis
docker run -d -p 3000:3000 --link guanyu-storage --env CACHE__REDIS__HOST=guanyu-storage clifflu/guanyu
```


### Drunk

* Env name: `DRUNK`
* Type: boolean (0/1 preferred)
* Skip scanning and pretend all files to be clean, primarily for debugging. 

### File Max Size

* Env name: `FILE__MAX_SIZE`
* Type: number
* Default: 33554432 (32mb)
* Maximal size in bytes for file uploads and remote files.

### Log Level

* Env name: `LOG_LEVEL`
* Possible values: ['debug', 'verbose', 'info', 'warn']
* Default: info

### Process per Core

* Env name: `PROC_PER_CORE`,
* Type: number
* Default: 2
* Number of concurrent scans allowed per CPU core


## License

MIT

## Note

Guanyu is open-sourced under permission as a side project from [104 Corp.](https://www.104.com.tw/) 
