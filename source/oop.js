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
peppaPig.talk('Hi');

var daffyDuck = someNamespace.duck('daffy');
daffyDuck.name;
daffyDuck.talk();
var talkingFunctions = [peppaPig.talk, daffyDuck.talk];
talkingFunctions[0]();
talkingFunctions[1]();


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

