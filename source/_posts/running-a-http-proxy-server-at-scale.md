title: Running a HTTP Proxy Server At Scale
date: 2016-02-24 08:59:32
tags:
- development workflow
- working remotely
thumbnailImagePosition: left
autoThumbnailImage: yes
---
I wanted an easy way of designing greasemonkey scripts, chrome extensions and i would often report bugs and tell people how they can fix them.

I created [WebFiddle](http://webfiddle.net).net which would run some extra CSS and JS on any page, i didn't want anyone to have to install an extension to use it so you could easily share it to show someone a problem.
<!-- more -->

I tried implementing it using an iframe, i would inject my CSS and JS into it, i quickly realised to reach into an iframe on your page like this you need to be using exactly the same protocol://domain, subdomains need to match too.

So i was to implement the full blown proxy server approach, you could create a fiddle (some JS and CSS) and browse around webfiddle.net/<fiddle_id>/<url> and see what the web would look like with your edits, so for example you could see what the web would look like with a blue background and cats <http://webfiddle.net/cats-d8c4vu/www.google.com>

To develop WebFiddle i copied a fairly crude regex based proxy server from [github](https://github.com/bslatkin/mirrorrr), It runs on Google App Engine and caches pages in MemCache, i added [code mirror](https://codemirror.net/) as a code editor which i shimmed to reach into the current iframe on window load to give the editor context for CSS and JS autocomplete, i included ExtJs in its entirety just to use the splitter panes and finally tweeted when i was done.

one day i realized i had autoscaled to 10 instances, "must be going viral!?!?!" i quickly added Google Analytics which showed nothing, i jumped back to the logs and realized Googlebot was aggressively indexing the entire sub-web contained in my proxy server! I could see them doing things only a crawler capable of executing JavaScript would do like streaming video.

I had no users and now desperately needed to optimize the performance of the proxy server. I started [analysing app engine logs with bigquery](https://coderwall.com/p/fuztda/analysing-app-engine-logs-with-bigquery) to see what kinds of requests where costing me 💰 money .

I looked into replacing ads with my own to recover cost, i realised the proxy did a bad job of rewriting JS urls and so pages would request urls that would never make sense like /save-some-data or /pollingwebsocketything so instead of fixing it to handle JS properly i added JS to shim XMLHTTPRequest so that it atleast doesn't hit my servers with bad requests, I experimented with tuning memcache, i tried caching objects over the 1Mb limit by breaking them down into chucks which didn't work well because any one being expired would mean the rest are useless and data can't be reconstructed, i tried dropping certain types of requests i thought might be expensive like .mov .pdf files.

I played around with some HTTP headers adding a more aggressive `Cache-Control: max-age=LARGE_NUM_SECONDS`, started using CloudFlare CDN.

I noticed twitter wouldn't work through the proxy because i needed to strip the Content-Security-Policy specifying what domains could run JS and X-Frame-Options which specified that it couldn't run in an iframe, Github and StackOverflow have coded their own [iframe breakout code](http://blog.codinghorror.com/we-done-been-framed/)

`if(window !== top) top.location.replace(window.location)`

I got around it by specifying the [sandbox attribute](https://developer.mozilla.org/en/docs/Web/HTML/Element/iframe) on an iframe to block the child iframe from doing alerts and changing the url.

The regex based proxy wouldn't work with html imports and webcomponents from polymer and had some regex rewriting edge cases where the regexes where unaware of what context they where actually rewriting code in (JS/CSS/HTML).

Suddenly people started to pour in! But not the type of users i would have expected, instead of web developers interested in creating overrides, people where landing on some sub page within my [cat fiddle](http://webfiddle.net/cats-d8c4vu) as indexed by Googlebot on some long-tail fringe of the internet, I started getting multiple DCMA takedown requests because i would be inadvertently caching downloading sites, i received tonnes of phishing attack alerts because some automated scrapers didn't like the idea of an insecure login.paypal.com accessible through someone else's site (cat vision enabled or otherwise), CloudFlare automatically takes these pages down in response to these phishing reports which is handy because i don't want people using the powerful [XSS](https://www.google.com/search?q=cross%20site%20scripting&rct=j) features of WebFiddle to steal from people.

With the people came a serious outage because i never thought my App Engine daily spend limit would be reached, i simply went over that and my instances all went away in my sleep.

The 💰 money finally started coming in because i added AdSense ads to the proxy, one day i made $5 then $8 then $30, that day i was profitable and my [AdSense](https://www.google.com/adsense) account was immediately cancelled for displaying ads on other peoples content! A massive setback, i tried Chikita.com and media.net to serve ads which made a meagre $0 for a large amount of traffic, media.net was serving shameful ads linking to irrelevant searches on yahoo. I got scared away from using revenuehits.com at the mention of pop under's.

I had a huge $400 App Engine bill D: and no 💰 money

I had to add `Crawl-delay: 1` to my [robots.txt](http://webfiddle.net/robots.txt) among other rules to keep Googlebot from smashing the proxy server.

I have paid off the bill for being part of Googles Giant searchable cache and am advertising my own games through the proxy which make 💰 money using AdSense.

It can be really interesting being sent reports in [Google Webmaster Tools](https://www.google.com/webmasters/tools) to see things like how mobile friendly pages on my proxy are, i can confirm flash is dead and the more pressing issues people are having is a silly font-size, contrast ratio or not using responsive design.

I'm hoping to get some features done to get more devs using Web Fiddle and getting ready for the next strange surge in traffic :)

[Web Fiddle Is Open source](https://github.com/lee101/webfiddle) and you can [follow the development on Trello](https://trello.com/b/NA2zAjEQ/development).