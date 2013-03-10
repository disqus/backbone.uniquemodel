/*jshint unused:true, undef:true, strict:true*/
/*global module, test, equal, ok, notEqual, Backbone, _ */
(function () {
  "use strict";

  var UniqueModel = Backbone.UniqueModel;

  module('UniqueModel');

  test('constructor', function () {
    var UserModel = Backbone.Model.extend({});

    var first = new UniqueModel(UserModel, {
      id: 1,
      name: 'Scott'
    });

    equal(1, first.id);
    equal('Scott', first.get('name'));

    var second = new UniqueModel(UserModel, {
      id: 1,
      name: 'Scott Summers'
    });

    equal(1, second.id);
    equal('Scott Summers', second.get('name'));
    equal(first, second);

    // Smoke test
    var third = new UniqueModel(UserModel, {
      id: 2,
      name: 'Jean Grey'
    });

    notEqual(first, third);
  });

  test('forCollection', function () {
    var UserModel = Backbone.Model.extend({});
    var UserCollection = Backbone.Collection.extend({
      model: UniqueModel.forCollection(UserModel)
    });

    // Test that models instantiated through a collection are unique.
    var users = new UserCollection([
      { id: 1, name: 'Henry' },
      { id: 2, name: 'Bobby' }
    ]);

    var user = new UniqueModel(UserModel, {
      id: 2,
      name: 'Bobby Drake'
    });

    equal(2, users.length);
    equal('Bobby Drake', user.get('name'));
    ok(_.any(users.models, function (obj) {
      return obj === user;
    }));
  });
})();