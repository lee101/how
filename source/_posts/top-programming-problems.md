title: Top Programming Problems
date: 2016-04-21 08:44:24
tags: software engineering, design patterns, software architecture, autoscaling, memcache, networking
thumbnailImagePosition: left
autoThumbnailImage: yes
---
# Network usage

<img src="/2016/04/21/top-programming-problems/nope-latency-seems-fine.jpeg" class="img-responsive">
<!-- more -->

## Chunky (too much data in a request)

select * giving too many columns

Filtering and aggregating happening outside the database

Not limiting the number of results

Exploding joins (duplicates in joined fields make a join return lots more rows) cross joins (joins with no `on foreign_id=id` clause)

overload from giant batches can increase the failure rate (out of memory errors ect) and how annoying a failure is. BitTorrent includes a SHA-1 hash of every piece of a file so you can verify pieces as you receive them instead of one big SHA-1 code for the whole file because your download could then fail/restart at 99% because the file was corrupted or malicious.

Compress your things.

## Chatty

Forms auto-saving on every key-up should be debounced (auto complete search bars too)

n+1 joins (lazy loaded relationships getting iterated over causing a request for every related record)

Stats reporting can be batched up with something like statsd, logging can be batched up with logstash.

Polling as oppose to being told of things is really bad, watch out for things like Thread.sleep and setInterval. watch out for sawtooth performance graphs

Batching writes

Caching reads

## Thundering heard

Many writes to the same thing can be really slow especially if they all need to be atomic, use techniques like sharding counters where writes are written to different counter shards and the shards are summed up when read.

Application deployments and software updates should use some kind of rolling deploy to prevent many servers downloading the new code all at once, It increases complexity but can be a much safer way of doing things, many large websites also use feature flipping to deploy to a percentage of users or only those using modern devices to mitigate risk.

Partitioning by project could mean that if your company is only interested in one project at a time then the workload would be concentrated on one shard, try and pick a highly unique partition key (so there can be enough partitions) with highly uniform access like user_id (so work is divided evenly across machines).

Partitioning in memcache is done by key so try and distribute the work across your keyspace or one machine in the memcache cluster could be given all the traffic for having the wrong key.
## Unnecessary hops
<img src="/2016/04/21/top-programming-problems/unecessary-hops.png" class="img-responsive">

In many realtime apps requests may go from client->server->db -> server -> client

Clients could directly update each other with something like WebRTC instead

suggestions->completions->search: Often apps that search at a location offer a search bar which gives suggestions and then data(lat/lng ect) about a specific location then the data can be given to other APIs to return data about the point. Joining these queries can be challenging and may mean having a server which performs all the functions and does caching around them.

codepen.io compiling preprocessors (slim/haml/LESS/SASS) on the server side, doing it in the browser would save a network request every time you change your code, make the app work better offline and cut the server costs. Node and isomorphic apps that can run in either a server or browser are becoming much more popular for this reason.

Decentralize all the things talk https://www.youtube.com/watch?v=IxLh1LElBUE&feature=youtu.be
## Single points of failure

Master database going down, the player who hosts the game server quitting, DNS failure…

## Use fallbacks!

Shopify lets people go through the checkout process if the login system is down.

If elasticsearch is down you could send a LIKE query to the source database giving worse search results and performance, you’d have to be careful not to take down the database in this case, you could also fall back to suggesting their recent searches or popular searches.

Fallbacks for fonts in CSS especially if you use a custom font.

Fallbacks for files loaded from CDNs

Cross cloud fallbacks by replicating data into another cloud.

Netflix has multiple fallbacks built into their CDN where each client tries to optimise its download speed by pinging the servers and finding the fastest one.
Things being overloaded or out of memory can be unresponsive, overly long timeouts can leave users confused, use circuit breakers to fail faster and cut down unnecessary network requests to overloaded servers.

## Global State

on MultiplicationMaster.com youd start playing a timed level, quitting and playing another you would be gamovered by the ghost timer.

Try and reduce the scope of your state e.g. a timer should be part of a specific game, should be (con|de)structed as part of a game and shouldn’t leave around any artifacts

Keep an eye out for things which aren’t idempotent like $.append and for places that don’t clean up after themselves.

## Reconciliation/Consistency in CAP

What happens when things have made conflicting changes

When a logged out user signs in we may have to migrate their logged out usage data and attach it to the rest of their signed in data, games often award the highest of the progresses, e-commerce websites often ‘union’ the two shopping carts.

Online document editing: operational transform/diff syncing

git merge/rebase shows conflicts if edited lines are close enough together, which could be made more language aware e.g. one person relies on some function being there and someone else takes it away, the edits aren’t close and so are merged.

Multiversion Concurrencey Control in databases: should reads be allowed to read something half written or should it read from before the writes started? The latter would give more consistency with worse performance because the database maintains different versions of the data for each transaction, long running transactions would have a higher cost and start reading more and more out of date data.

Creative tools e.g. photoshop, maya: often people put the source files in dropbox hoping to keep always up to date with multiple people working at once, dropbox however refuses to merge diverged files, the tools really need to build this functionality themselves deciding what to automatically and manually merge and creating an interface to do manual merges and visualize incoming changes.

Often a scientist comes up with great results because so many of them are looking. The Bonferroni correction is sometimes used to re-estimate the significance of their results taking into account that their tests have actually been ran more than they think.

## Mutable === bad

Corrupted application server state can be a truly awful thing to debug.
It should have been immutable but a request ended up changing it.
You can find yourself in a scenario where it appears not to happen on your machine because your restarting your dev server a lot. Changing any code and reloading will temporarily fix it and deploying your presumed fixes will seem to fix it, until it happens again.
Your much safer using fail fast ‘frozen’ data types or always taking copies with immutable data structures (immutableJS pyrsystent)

#npmgate (unpublishing a npm module breaking everything) and the new decentralized immutable npm http://everythingstays.com/

open for extension closed for modification.

make things explicitly impossible to change.

blockchain technologies are being used to implement consistent immutable stores

## Database performance

no indexes! like % queries

large batch jobs like data refresh or backups running and slowing things down. Things polling for changes with ‘time since’ queries.
tradoffs with (de)normalisation and corresponding read/write speed

## Race Conditions

You pay to have something listed on a marketplace and its status changes to “active” then the autosave draft request arrives later and sets it back to “draft”.

memcache that’s invalidated via writes could mean its invalidated and then repopulated by a read of the old data from before the invalidating write got to the database, the data is then stuck to be the old data and the cache is “poisoned”. Even if you only invalidate the cache when you know a database write is successful there could still be an old database read coming from when the key wasn’t in memcache and about to poison your cache. You should use memcaches atomic “compare and set operation” to only write back to memcache when what you read hasn’t changed.

Ajax user interfaces usually don’t handle the case where the user clicks one link and then another, they may see transitions to the two different pages in an undefined order, people can handle this by adding an auto incrementing number to ajax page transition requests and only transitioning if the one returned is the latest one, this means only the last navigation click will transition the users and is the browser default for non ajax links.

## Unreliable dependencies

Web mashups and single page apps interact with multiple services, depend on different CDNs and data from multiple data-sources. if a typical app could have 10 dependencies which all have to work but only do 99% of the time: .99¹⁰ ~90% uptime

without fallbacks you could easily end up down for the busiest few hours of the day.

## Autoscaling

Many platforms don’t scale well to handle traffic spikes, the default AWS Elastic beanstalk app has a health check/monitoring interval of 5 minutes, once it realizes that it needs to scale, if you havn’t pre baked an AMI (amazon image) you could spend another 5 minutes just spinning up an application server to handle the load.

Netflix tackled this with “predictive pre-scaling”. App Engine uses a minimal userspace container with a small startup time and the automatic scheduler takes into account the number of instances, their latency and how long it takes to spin one up.

Many components in your web application stack won’t support autoscaling, e.g. can you auto-scale your database, Memcache cluster or CDN? If performance goes really bad could you autoscale your feature set and disable performance heavy features?

Scaling components independently: We had a webapp with an expensive API/search function, come launch the app couldn’t scale to support all the expensive searches, unfortunately we had coupled the delivery of the html/js with the API, that is the API and site where running on the same auto scaling group of app servers, because the API was overloaded the entire site wouldn’t load, it would take a long time to split them up and so we disabled all searches to the API using a filtering rule in cloudFlare our CDN which brought the site back online (but no one could search), it would have been much better if things with different scaling characteristics or different priorities where separated on different machines and so could scale independently.

## Reporting/Data Gathering/Decision making

Should you manually scale up your memcache cluster? how would that change the cost to run and performance of your app?

*basic*: (evaluating after a decision is made) If you had graphs of your avg expense per request and your avg latency you could observe the effects of scaling memcache then it would require some manual tweaking and re-guestimating to find the sweetspot.

*advanced* (estimating before moving): If you configured an amount your willing to pay for increased speed ratio e.g. .001c per second shaved off a requests latency and a min/max spend, the formula might look like

    $cost = $paid_for_memcache - $saved_cost_from_extra_cache_hits
    $saved_cost_from_extra_cache_hits = num_extra_cache_hits * avg_$cost_for_looking_up_uncached_value

To calculate the average cost for looking up uncached values you report the time from after the cache miss to when the looked up value was successfully set (value needs to be under 1Mb for memcache to accept it).
The ideal memcache size is a moving target depending on your usage patterns and application performance, one day a deploy could come along and make what your caching cheap to calculate without memcache, also as with any caching system the effectiveness is based on usage patterns that change over time.

*awesome* (estimating and moving automatically): having reporting and stats fed into automated decision making, the formula could be continuously calculated over some time interval and memcache automatically scaled, scaling memcache can mean blowing away all the keys, once you have worked out how switching benefits you over time you would subtract the cost to reconstruct the current cache.

## Testing

“all code is guilty until proven innocent”

Testing pyramid: write more unit tests closer to the code so it produces a better bug report

Flaky tests
write test suites which depend on abstractions and not concretions, expect the same quality from tests as normal code.

Don’t use unreliable selectors like
.article #comments ul > li > a.button
Changing anything in the html like ul->ol or a->input would break the test. Depend on ids or a single class name instead

Don’t depend on text being there like “click the button with the text Update” Text could easily change without someone thinking they are breaking things.

Try and mock out asynchronous things like network requests and timing sensitive code so you can explicitly test when things happen in a different order, I think some shims (e.g. jasmines mock network request/setTimeout shim) are okay, you won’t need to rewrite your code to inject everything.

## Conclusion
This was just a small subset of the problems!
Let me know what you think and please add your own problems to the list!
