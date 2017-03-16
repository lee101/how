title: Migrate to AWS Elastic Beanstalk v3
date: 2016-02-25 08:59:32
tags:
- AWS
- elastic beanstalk

---
v3 is FAR better than v2

You installed v2 by adding some directory to your PATH, remove that and run `sudo pip install awsebcli`

Blow away your `.elasticbeanstalk/` folder and run `eb init new-name` to start from scratch.

init sets up a new key pair and you can run `eb ssh` to get to your EC2 instance(s)

You can configure your app through the UI or by running `eb config new-name` to edit the yaml configuration file, this will apply the changes when you save and quit. 

The UI and yaml file are kept in sync :)

You can clone environments with `eb clone new-name` this lets you set a "CNAME" (readable URLs!) for the new environment.

You can switch the old environment URL to use the new environment with `eb swap old-name` which may take a few minutes. 

use `eb -h` for docs.



