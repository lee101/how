title: JavaScript, this, new and Object Oriented Programming
date: 2015-07-24 08:59:32
tags: 
- JavaScript
- Object Oriented Programming
- Design Patterns
- Code Style
---

##Problem 

Whats wrong with `this` and `new`?

```javascript
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
    
```

So if you use `this` trying to stricten up your code is error prone,
once you stricten up your code you'll have to remember to use `new` when constructing things that use `this`.
    
```javascript
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

```

The problem is that `this` means "whatever object your function is attached to when its called"
people don't usually expect that and it leads to huge amounts of bugs. 
I see people many popular frameworks like Backbone, Angular and Ember suggesting patterns requiring `this`.
I also see people doing all sorts of things to get around `this`, like iterating over an objects functions and binding them all to it creating a lot of boilerplate (coffee script).
 
 
##Proposed Solution: avoid `this` and avoid `new`

example OOP style:
```javascript

var someNamespace = (function () {
    "use strict";
    var self = {};

    self.Animal = function (animalType, name) {
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

    self.Duck = function (name) {
        var duckSelf = self.Animal('Duck', name);

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

var peppaPig = someNamespace.Animal('pig', 'peppa');
peppaPig.talk('Hi'); // "pig, peppa: Hi"

var daffyDuck = someNamespace.Duck('daffy');
daffyDuck.name; // "daffy"
daffyDuck.talk(); // "duck says: quack quack"
var talkingFunctions = [peppaPig.talk, daffyDuck.talk];
talkingFunctions[0]('Hi'); // "pig, peppa: Hi" // still works! yay!
talkingFunctions[1](); // "duck says: quack quack"

```
    
###pros

No problems with `this` being lost and no boilerplate to bind `this`, doesn't need `new`

Beginners don't need to understand the complexities of `this`.

No framework required.

Interoperable with other frameworks e.g. instead of using `Backbone.Collection.extend({ ... })`
```javascript

BroadbandMap.Collections.Networks = function () {

    var self = new Backbone.Collection();

    self.model = BroadbandMap.Models.Network;

    self.url = '/api/1.0/networks';

    self.parse = function (response) {
        ...
```

private classes are easy too e.g. `var Duck` instead of `self.Duck`

###cons

This doesn't support protected variables (ones that only subclasses can access) (arguably a plus).

You could have package private (vars in the outer scope) and public things by adding to `self`.
 but adding package private vars and funcs in this outer scope could make it difficult to break out this file into smaller files.
 
You can override a method with one of a different signature, you probably shouldn't do that, 
in this case words is now an option argument to duck.talk which is probably fine, 
but overriding a `function(y, x)` with a `function(x, y)` would lead to bugs.

The style may look unusual to people as most frameworks suggest using `this` 

####ES6 

classes use `this` so we will still see lots of bugs related to its complexity.
Luckily for us even more complexity is added around `this` because the new arrow functions will be forever bound to the `this` from the calling context.
This behaviour is simpler in that `this` isn't going to change on you but using the `this` from the calling context may confuse some people:

```javascript
var thing = {
    word: 'hi',
    talk: () => {
        return this.word;
    }
};
thing.talk() // undefined because this == window when the arrow function was created and window.word is undefined
```

At-least we won't have so many libraries implementing inheritance differently and we will have a boilerplate-less constructor which has access to the methods when called.

One small benefit in ES6 is type checking that new must be used with a constructor.
```javascript
class C {
    m() {}
}
new C.prototype.m(); // TypeError: m() {} is not a constructor
```

[shimming ES6 to bind methods so that they hold onto this](http://www.2ality.com/2013/06/auto-binding.html)
[es6 arrow functions and this](http://codepen.io/somethingkindawierd/blog/es6-arrow-functions-this)

### conclusion

in general extension/inheritance is a complicated pattern, 
to use an object you need to understand its type hierarchy and all the ways that can affect its behaviour
Its best to favour typical object composition with simple functions with inputs and outputs rather than [closure's](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) and global state.
This is because it has less state (you might inherit things you don't want). 
Using this contrived example, why does a duck have a name or use words if all it does is quack? why is it an animal? a quacking function probably suffices.

["classical inheritance is obsolete talk"](https://vimeo.com/69255635)

It is also easier to unit test because using mocks for some objects in the class hierarchy can be difficult 
(you may want to use mock objects to test some code interacts with other parts correctly without having to test those parts too).

Generally using inheritance is good when you know that the subclass really is a subtle variation of the "default behaviour" in the parent class and they will normally want to share lots of behaviour, 
don't feel bad if you don't use inheritance and still treat objects interchangeably based on them having the same properties/methods (duck typing).

Beware the complexities of this!

Let me know what you think! Could it be improved? Are there any pros and cons that i have missed?
