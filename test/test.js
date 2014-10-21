/*jshint unused:true, undef:true, strict:true*/
/*global module, test, equal, ok, start, notEqual, asyncTest, expect, Backbone, _, sinon */
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

  test('preserves model\'s static attributes', function () {
    var User = Backbone.Model.extend({}, { someStaticAttribute: 'test' });
    var UniqueUser = Backbone.UniqueModel(User);

    equal(UniqueUser.someStaticAttribute, 'test');
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

  test('destroying intance removes from cache', function () {
    var User = Backbone.Model.extend({});
    var UniqueUser = Backbone.UniqueModel(User, 'DestroyTestUser');

    var user = new UniqueUser({
      id: 2,
      name: 'Bobby Drake'
    });

    var modelCache = Backbone.UniqueModel.getModelCache('DestroyTestUser');
    var model = modelCache.get({ id: 2});

    equal(model, user);

    model.trigger('destroy', model);

    // Note that modelCache.get will create a new instance; so just verify
    // new instance doesn't match old one
    model = modelCache.get({ id: 2});
    notEqual(model, user);
  });

  module('localStorage', {
    setup: function () {
      var self = this;

      localStorage.clear();
      Backbone.UniqueModel.clear();

      this.User = Backbone.Model.extend({});
      this.UniqueUser = Backbone.UniqueModel(this.User, 'User', 'localStorage');

      var frame = document.createElement('iframe');
      frame.style.display = 'none';
      frame.src = 'iframe.html';

      this.frame = frame;

      this.loadRemoteWindow = function (onload) {
        frame.onload = function () {
          if (onload)
            onload.call(self, frame.contentWindow);
        };
        document.body.appendChild(frame);
      };

      this.loadRemoteInstance = function (onload) {
        self.loadRemoteWindow(function (win) {
          onload.call(self, win.uniqueModelInstance);
        });
      };
    },

    teardown: function () {
      localStorage.clear();

      if (this.frame.parentNode) {
        document.body.removeChild(this.frame);
      }
    }
  });

  test('storage handler processes valid keys correctly', function () {
    var LocalStorageAdapter = Backbone.UniqueModel.StorageAdapter;
    LocalStorageAdapter.instances.User = { handleStorageEvent: function () {} };
    var restoreStub = sinon.stub(LocalStorageAdapter.instances.User, 'handleStorageEvent');

    var key;

    key = 'UniqueModel.User.12345';
    LocalStorageAdapter.onStorage({ key: key });
    ok(restoreStub.calledWith(key, '12345'));

    key = 'UniqueModel.User.joesmith';
    LocalStorageAdapter.onStorage({ key: key });
    ok(restoreStub.calledWith(key, 'joesmith'));

    key = 'UniqueModel.User.abc123-def456-ghi789';
    LocalStorageAdapter.onStorage({ key: key });
    ok(restoreStub.calledWith(key, 'abc123-def456-ghi789'));

    key = 'UniqueModel.User.abc123.def456.ghi789';
    LocalStorageAdapter.onStorage({ key: key });
    ok(restoreStub.calledWith(key, 'abc123.def456.ghi789'));

    key = 'UniqueModel.User.abc123 def456 ghi789';
    LocalStorageAdapter.onStorage({ key: key });
    ok(restoreStub.calledWith(key, 'abc123 def456 ghi789'));

    restoreStub.restore();
  });

  test("storage handler ignores invalid/unknown keys", function () {
    var LocalStorageAdapter = Backbone.UniqueModel.StorageAdapter;
    LocalStorageAdapter.instances.User = { handleStorageEvent: function () {} };
    var restoreStub = sinon.stub(LocalStorageAdapter.instances.User, 'handleStorageEvent');

    LocalStorageAdapter.onStorage({ key: '' });
    LocalStorageAdapter.onStorage({ key: 'sup' });
    LocalStorageAdapter.onStorage({ key: 'hey_User_12345' });
    LocalStorageAdapter.onStorage({ key: 'UniqueModel.User.' }); // id missing

    equal(restoreStub.callCount, 0);

    restoreStub.restore();
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

  asyncTest('local instance creation checks storage for cached instances', function () {
    expect(1);

    this.loadRemoteInstance(function (remoteInstance) {
      var localInstance = new this.UniqueUser({
        id: 1
      });

      // Give browser a chance to flush it's async onstorage handlers
      setTimeout(function() {
        start();
        equal(localInstance.get('name'), 'Charles Xavier');
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

  asyncTest('newly tracked local instance triggers add on remote', function () {
    expect(2);

    this.loadRemoteWindow(function (remoteWindow) {
      remoteWindow.UniqueUser.on('uniquemodel.add', function (instance) {
        start();
        equal(instance.id, 1337);
        equal(instance.get('name'), 'Logan');
        remoteWindow.UniqueUser.off();
      });

      // Once this user is added locally, eventually it will sync via
      // localStorage to the other window, and trigger uniquemodel.add on
      // the unique model class (UniqueUser)
      new this.UniqueUser({
        id: 1337,
        name: 'Logan'
      });
    });
  });

  asyncTest('newly tracked remote instance triggers add on local', function () {
    expect(2);

    this.UniqueUser.on('uniquemodel.add', function (instance) {
      start();

      equal(instance.id, 1);
      equal(instance.get('name'), 'Charles Xavier');
      this.UniqueUser.off();
    }, this);

    // Remote window always loads Charles Xavier
    this.loadRemoteWindow();
  });

  asyncTest('destroying local instance triggers destroy on remote', function () {
    expect(2);

    var localInstance = new this.UniqueUser({
      id: 1,
      name: 'Charles Xavier'
    });
    this.loadRemoteInstance(function (remoteInstance) {
      remoteInstance.on('destroy', function (instance) {
        start();
        equal(instance.id, 1);
        equal(instance.get('name'), 'Charles Xavier');
      });

      localInstance.trigger('destroy', localInstance);
    });
  });

  asyncTest('destroying remote instance triggers destroy on local', function () {
    expect(2);

    var localInstance = new this.UniqueUser({
      id: 1,
      name: 'Charles Xavier'
    });

    localInstance.on('destroy', function (instance) {
      start();
      equal(instance.id, 1);
      equal(instance.get('name'), 'Charles Xavier');
    });

    this.loadRemoteInstance(function (remoteInstance) {
      remoteInstance.trigger('destroy', remoteInstance);
    });
  });
})();
