Backbone.UniqueModel
======================

Backbone.UniqueModel ensures unique modal instances across your application. It can even guarantee unique model data in code running on different windows.

## Usage

### Instantiating models

When creating a new model, if that model is already being tracked, you will be returned the original model instance.

```javascript
var UniqueUser = Backbone.UniqueModel(User);

var first  = new UniqueUser({ id: 1, name: 'Jean Grey' });
var second = new UniqueUser({ id: 1, name: 'Jean Summers' });

first === second; // true
first.get('name') === 'Jean Summers'; // true
```

UniqueModel will also update the attributes of the instance to reflect the latest state.

### Working with collections

Backbone.UniqueModel also guarantees that instances created through a collection (e.g. via fetch) are also unique.

```javascript
var UserCollection = Backbone.Collection.extend({
    model: UniqueUser
});

var users = new UserCollection([
  { id: 2, name: 'Henry McCoy' },
  { id: 3, name: 'Bobby Drake' }
]);

var user = new UniqueUser({ id: 2, name: 'Henry McCoy' });
user === users.get(2); // true
```

### Window sync via localStorage (experimental)

If enabled, UniqueModel will attempt to ensure uniqueness of model instances across windows using localStorage.

```javascript
// Window 1
var UniqueUser = Backbone.UniqueModel(User, 'User', 'localStorage');
var logan1 = new UniqueUser({ id: 4, name: 'Logan' });

// Window 2
var UniqueUser = Backbone.UniqueModel(User, 'User', 'localStorage');
var logan2 = new UniqueUser({ id: 4, name: 'Logan', power: 'Healing' });

// Back to Window 1
logan1.get('power'); // Healing
```

To minimize the disk swaps, persistence is done on object creation and on Backbone's sync event.

## Running Tests

The unit tests need to be served from a web server; they cannot be accessed from local filesystem. This is because localStorage isn't shared between file:// resources in Chrome, which causes the sync tests to fail in that browser.

If you have Python installed (pre-installed on OS X), you can just use `SimpleHTTPServer`:

```
$ python -m SimpleHTTPServer 8000
```

Then open http://localhost:8000/tests/ and you're off to the races.

## Acknowledgments

Backbone.UniqueModel is brought to you by [Ben Vinegar](http://github.com/benvinegar), [Anton Kovalyov](http://github.com/antonkovalyov), and [Burak Yigit Kaya](http://github.com/byk).
