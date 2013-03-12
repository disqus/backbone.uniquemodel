/*jshint unused:true, undef:true, strict:true*/
/*global module, test, equal, ok, start, notEqual, asyncTest, expect, Backbone, _ */
(function () {
  "use strict";

  module('instantiation');

  // localStorage needs time to persist data on disk, and fire the onstorage
  // event in any open windows. For most browsers, a minimum timeout was
  // sufficient (4ms), but running IE9 in a VM was problematic. 100 ms was
  // the lowest _reliable_ number I observed. Around 50ms, some tests would
  // fail periodically.
  var LS_SYNC_DURATION = 100;

  test('constructor maintains uniques', function () {
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

  test('collection maintains uniques', function () {
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

  module('localStorage', {
    setup: function () {
      var self = this;

      Backbone.UniqueModel.enableLocalStorage();

      this.User = Backbone.Model.extend({});
      this.UniqueUser = Backbone.UniqueModel(this.User, 'User');

      var frame = document.createElement('iframe');
      frame.style.display = 'none';
      frame.src = 'iframe.html';

      this.frame = frame;

      this.loadRemoteInstance = function (onload) {
        frame.onload = function () {
          var remoteInstance = frame.contentWindow.uniqueModelInstance;
          onload.call(self, remoteInstance);
        };
        document.body.appendChild(frame);
      };
    },

    teardown: function () {
      localStorage.clear();

      if (this.frame.parentNode)
        document.body.removeChild(this.frame);
    }
  });

  test("storage handler doesn't choke unknown keys", function () {
    Backbone.UniqueModel.storageHandler({ key: '' });
    Backbone.UniqueModel.storageHandler({ key: 'sup' });
    Backbone.UniqueModel.storageHandler({ key: 'hey_User_12345' });

    ok(true, "didn't throw an exception");
  });

  asyncTest('remote instance creation updates local', function () {
    expect(2);

    var localInstance = new this.UniqueUser({
      id: 1,
      name: 'Charles Francis Xavier'
    });

    this.loadRemoteInstance(function (remoteInstance) {
      setTimeout(function () {
        start();

        // Remote should have updated local
        equal(remoteInstance.get('name'), 'Charles Xavier');
        equal(localInstance.get('name'), 'Charles Xavier');
      }, LS_SYNC_DURATION);
    });
  });

  asyncTest('local instance creation updates remote', function () {
    expect(2);

    this.loadRemoteInstance(function (remoteInstance) {
      equal(remoteInstance.get('name'), 'Charles Xavier');

      // Creating a local instance *after* a remote instance already exists,
      // should update remote
      new this.UniqueUser({
        id: 1,
        name: 'Charles Francis Xavier'
      });

      setTimeout(function () {
        start();
        equal(remoteInstance.get('name'), 'Charles Francis Xavier');
      }, LS_SYNC_DURATION);
    });
  });

  asyncTest('local sync updates remote', function () {
    expect(2);

    var localInstance = new this.UniqueUser({
      id: 1,
      name: 'Charles Francis Xavier'
    });

    this.loadRemoteInstance(function (remoteInstance) {
      equal(remoteInstance.get('name'), 'Charles Xavier');

      // Syncing a local instance should update remote
      localInstance.set('name', 'Charles Francis Xavier');
      localInstance.trigger('sync', localInstance);

      // Give browser a chance to flush it's async onstorage handlers
      setTimeout(function() {
        start();

        equal(remoteInstance.get('name'), 'Charles Francis Xavier');
      }, LS_SYNC_DURATION);
    });
  });

  asyncTest('remote sync updates local', function () {
    expect(2);

    var localInstance = new this.UniqueUser({
      id: 1,
      name: 'Charles Xavier'
    });

    this.loadRemoteInstance(function (remoteInstance) {
      equal(remoteInstance.get('name'), 'Charles Xavier');

      remoteInstance.set('name', 'Charles Francis Xavier');
      remoteInstance.trigger('sync', remoteInstance);

      // Give browser a chance to flush it's async onstorage handlers
      setTimeout(function () {
        start();
        equal(localInstance.get('name'), 'Charles Francis Xavier');
      }, LS_SYNC_DURATION);
    });
  });
})();