# Guanyu

RESTful API for [Sohpos Antivirus for Linux Free](https://www.sophos.com/en-us/products/free-tools/sophos-antivirus-for-linux.aspx).

## Install

```
docker pull clifflu/guanyu
```

## Starting Guanyu

Cache results in an javascirpt object, flushes (crash and restart) when OOM.

```
docker run -d -p 3000:3000 clifflu/guanyu
```


## Starting Options (Environments)

### Utopia

Env: `DRUNK`

Suppress common exceptions and assume files to be safe.

### API Token

Env: `API_TOKEN`

### REDIS

Env: `CACHE__REDIS__HOST`
Cache results on a redis server.

Was `REDIS_HOST`

```
docker run -d --name guanyu-storage redis redis-server --save 30 5  # Start redis
docker run -d -p 3000:3000 --link guanyu-storage --env CACHE__REDIS__HOST=guanyu-storage clifflu/guanyu
```


## License

MIT
