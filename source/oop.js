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

