# how.nz
https://how.nz
My personal tech blog built using Hexo.io and deployed to heroku

#### Deployment
heroku login

hexo deploy

Clear caches (CloudFlare)

## Quick Start

### Create a new post

``` bash
$ hexo new "My New Post"
```

More info: [Writing](https://hexo.io/docs/writing.html)

### Run server

``` bash
$ hexo server
```

More info: [Server](https://hexo.io/docs/server.html)

### Generate static files

``` bash
$ hexo generate
```

More info: [Generating](https://hexo.io/docs/generating.html)

### Deploy to remote sites

``` bash
$ hexo deploy
```

More info: [Deployment](https://hexo.io/docs/one-command-deployment.html)


tuneling ----

mv ~/.cloudflared/cert.pem ~/.cloudflared/cert.pem.netwrck
cloudflared login

cloudflared tunnel create how
cloudflared tunnel route dns how how.nz
cloudflared tunnel --url 0.0.0.0:4000 --name how --protocol http2