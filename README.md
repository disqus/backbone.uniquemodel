Backbone.UniqueModel
======================

Backbone.UniqueModel provides a set of helper utilities for ensuring unique model instances across your application.

## Usage

### Instantiating models

When creating a new model, if that model is already being tracked, you will be returned the original model instance.

```javascript
var User = Backbone.Model.extend({});

var first  = new Backbone.UniqueModel(User, { id: 1, name: "Jean Grey" });
var second = new Backbone.UniqueModel(User, { id: 1, name: "Jean Summers" });

first === second; // true
first.get('name') === 'Jean Summers'; // true
```

UniqueModel will also update the attributes of the instance to reflect the latest state.

### Working with Collections

To persist unique instances in collections, you need to use the UniqueModel.forCollection helper.

```javascript
var UserCollection = Backbone.Collection.extend({
	model: UniqueModel.forCollection(User)
});

var users = new UserCollection([
  { id: 1, name: 'Henry McCoy' },
  { id: 2, name: 'Bobby Drake' }
]);

var user = new Backbone.UniqueModel(User, {
	id: 1,
	name: 'Bobby Drake'
});

user === users.get(1); // true
```


## Acknowledgments

Backbone.UniqueModel is brought to you by [Ben Vinegar](http://github.com/benvinegar), [Anton Kovalyov](http://github.com/antonkovalyov), and [Burak Yigit Kaya](http://github.com/byk).
