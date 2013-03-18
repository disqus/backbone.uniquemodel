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

### Window sync via localStorage

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

#### Add event

It's possible for completely new models to become available through localStorage sync. To be notified of new models, subscribe to the `uniquemodel.add` event on your UniqueModel class.

For example, you can use this event to automatically add new models to your collections:

```javascript
UniqueUser.on('uniquemodel.add', function (model) {
  userCollection.add(model);
});
```

#### Destroy event

If a model is destroyed in one window, the destroy event will be called on that model in any other open windows.

In Backbone, collections automatically remove any models that trigger destroy events. So there's nothing for you to do here — just know that it happens automatically.

```javascript
// Window 1
userCollection.add(logan1);

// Window 2
logan2.destroy(); // Triggers 'destroy' event in Window 1

// Back to Window 1
userCollection.where({ name: 'Logan' }).length === 0; // Removed from set
```

## Demo

Bundled in this repository is a version of [TodoMVC](http://addyosmani.github.com/todomvc/) that has been modified to use UniqueModel. It's a good demonstration of UniqueModel's window syncing abilities. Open up the demo in multiple windows, and observe your changes propagate instantly between each window intance.

You can [try the demo live on GitHub](http://disqus.github.com/backbone.uniquemodel/todomvc), or you can run it yourself from the repository.

## Running Tests

The unit tests need to be served from a web server; they cannot be accessed from local filesystem. This is because localStorage isn't shared between file:// resources in Chrome, which causes the sync tests to fail in that browser.

If you have Python installed (pre-installed on OS X), you can just use `SimpleHTTPServer`:

```
$ python -m SimpleHTTPServer 8000
```

Then open http://localhost:8000/tests/ and you're off to the races.

## Browser support

UniqueModel has been verified working in the following browsers:

* Internet Explorer 8+ (localStorage sync requires IE9+)
* Chrome 25
* Safari 6
* Firefox 18

### IE8 and localStorage sync

Despite [implementing webstorage]((http://caniuse.com/namevalue-storage), IE8's onstorage event doesn't communicate what data changed. There are [workarounds](http://jsfiddle.net/rodneyrehm/bAhJL/), which I plan to explore in a future version.

## Acknowledgments

Backbone.UniqueModel is written by [Ben Vinegar](http://github.com/benvinegar), based on work from [Anton Kovalyov](http://github.com/antonkovalyov) and [Burak Yigit Kaya](http://github.com/byk).
