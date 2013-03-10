/*jshint unused:true, undef:true, strict:true*/
/*global module, test, equal, ok, start, notEqual, asyncTest, expect, Backbone, _ */
(function () {
  "use strict";

  module('UniqueModel');

  test('constructor', function () {
    var User = Backbone.Model.extend({});
    var UniqueUser = Backbone.UniqueModel(User);

    var first = new UniqueUser({
      id: 1,
      name: 'Scott'
    });

    equal(1, first.id);
    equal('Scott', first.get('name'));

    var second = new UniqueUser({
      id: 1,
      name: 'Scott Summers'
    });

    equal(1, second.id);
    equal('Scott Summers', second.get('name'));
    equal(first, second);

    // Smoke test
    var third = new UniqueUser({
      id: 2,
      name: 'Jean Grey'
    });

    notEqual(first, third);
  });

  test('forCollection', function () {
    var User = Backbone.Model.extend({});
    var UniqueUser = Backbone.UniqueModel(User);

    var UserCollection = Backbone.Collection.extend({
      model: UniqueUser
    });

    // Test that models instantiated through a collection are unique.
    var users = new UserCollection([
      { id: 1, name: 'Henry' },
      { id: 2, name: 'Bobby' }
    ]);

    var user = new UniqueUser({
      id: 2,
      name: 'Bobby Drake'
    });

    equal(2, users.length);
    equal('Bobby Drake', user.get('name'));
    ok(_.any(users.models, function (obj) {
      return obj === user;
    }));
  });

  asyncTest('localStorage', function () {
    expect(1);

    var User = Backbone.Model.extend({});
    var UniqueUser = Backbone.UniqueModel(User, 'User');

    var localInstance = new UniqueUser({
      id: 1,
      name: 'Charles Xavier'
    });

    var frame = document.createElement('iframe');
    frame.src = 'iframe.html';

    document.body.appendChild(frame);

    frame.onload = function () {
      // Append increasing timestamp in order to force localStorage
      // onstorage event (if data isn't new, won't fire)
      localInstance.set('name', 'Charles Francis Xavier' + ' ' + (new Date()).getTime());

      // Give browser a chance to flush it's async onstorage handlers
      setTimeout(function() {
        start();

        var remoteInstance = frame.contentWindow.xavier;
        equal(localInstance.get('name'), remoteInstance.get('name'));
      }, 0);
    };
  });
})();