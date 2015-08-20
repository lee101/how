title: JavaScript, this, new and Object Oriented Programming
date: 2015-06-24 08:59:32
tags: 
- JavaScript
- Object Oriented Programming
- Design Patterns
- Code Style
---

##Problem 

Whats wrong with `this` and `new`?

    //problems with this and new
    
    var thing = (function () {
        this.a = 'hi'; // works
    })();
    
    var thing = (function () {
        "use strict";
        this.a = 'hi'; // breaks because we didn't use "new" so we don't have a "this"
    })();
    
    var thing = new (function () {
        "use strict";
        this.a = 'hi'; // works because we have a "this" because we used "new"
    })();
    
So if you use `this` trying to strict'nd up your code is error prone, 
once you have strict'nd up your code you'll have to remember to use `new` when constructing things that use `this`.
    
    // problems with this
    
    var thing = {
        word: 'hi',
        talk: function() {
            return this.word;
        }
    };
    
    thing.talk() // hi
    var thingTalkFunc = thing.talk;
    thingTalkFunc(); // cannot read property word of undefined (this is set to window)
    thingTalkFunc.call(thing); // technically works

The problem is that `this` means "whatever object your function is attached to when its called"
people don't usually expect that and it leads to huge amounts of bugs. 
I see people many popular frameworks like Backbone enforcing patterns requiring `this`.
I also see people doing all sorts of things to get around `this`, like iterating over an objects functions and binding them all to it creating a lot of boilerplate (coffee script).
 
 
##Proposed Solution: avoid `this` and avoid `new`

example OOP style:

    var someNamespace = (function () {
        "use strict";
        var self = {};
    
        self.animal = function (animalType, name) {
            var animalSelf = {};
    
            // public constructor
            animalSelf.construct = function (animalType, name) {
                type = animalType;
                animalSelf.name = name;
                return animalSelf;
            };
    
            // private var
            var type = 'human';
            // private function
            function getTalkingPrefix() {
                return type + ', ' + animalSelf.name + ': ';
            }
            //public var
            animalSelf.name = 'lee';
            //public function/method
            animalSelf.talk = function (words) {
                return getTalkingPrefix() + words;
            };
    
    
            // constructor is called at the end so when its called
            // animalSelf has all the variables and functions attached
            return animalSelf.construct(animalType, name);
        };
    
        self.duck = function (name) {
            var duckSelf = self.animal('duck', name);
    
            duckSelf.talk = function (words) {
                //optional argument
                if (typeof words == "undefined") {
                    words = 'quack quack';
                }
                return 'duck says: ' + words
            };
    
            return duckSelf;
        };
    
        return self;
    })();
    
    var peppaPig = someNamespace.animal('pig', 'peppa');
    peppaPig.talk('Hi'); // "pig, peppa: Hi"
    
    var daffyDuck = someNamespace.duck('daffy');
    daffyDuck.name;
    daffyDuck.talk(); // "duck says: quack quack"
    var talkingFunctions = [peppaPig.talk, daffyDuck.talk];
    talkingFunctions[0]('Hi'); // "pig, peppa: Hi" // still works! yay!
    talkingFunctions[1](); // "duck says: quack quack"
    
###pros

dons'nt have problems with `this` being lost and doesn't need any boilerplate to bind `this`, doesn't need `new`

Beginners don't need to understand the complexities of `this`.

Don't need any kind of framework to do it.

Interoperable with other frameworks e.g. Backbone

    BroadbandMap.Collections.Networks = function () {
    
        var self = new Backbone.Collection();
    
        self.model = BroadbandMap.Models.Network;
    
        self.url = '/api/1.0/networks';
    
        self.parse = function (response) {
            ...

###cons

This doesn't support protected variables (ones that only subclasses can access).

You could have package private (vars in the outer scope) and public things by adding to `self`.
 but adding package private vars and funcs in this outer scope could make it difficult to break out this file into smaller files.
 
 
You can override a method with one of a different signature, you probably shouldn't do that, 
in this case words is now an option argument to duck.talk which is probably fine, 
but overriding a `function(y, x)` with a `function(x, y)` would lead to bugs.

in general extension/inheritance is a complicated pattern, 
to use an object you need to understand its type hierarchy and all the ways that can affect its behaviour [https://vimeo.com/69255635](https://vimeo.com/69255635)
Its best to favour typical object composition with simple functions with inputs and outputs.
This is because it has less state (you might inherit things you don't want).
It is also easier to unit test because using mocks for some objects in the class hierarchy can be difficult 
(you may want to use mock objects to test some code interacts with other parts correctly without having to test those parts too).