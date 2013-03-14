/*jshint unused:true, undef:true, strict:true*/
/*global global, _, Backbone*/
(function (window) {
  "use strict";

  var localStorageEnabled = false;

  var globalCache = {};

  // This is a factory function that enforces uniqueness of model instances.
  // It stores all instances by their ID (actual key should be specified via
  // idibute on a model).
  //
  // Example: Creating a new instance.
  //
  //   var UniqueUser = UniqueModel(User);
  //   var first  = new UniqueUser({ id: 1, name: "Scott" });
  //   var second = new UniqueUser({ id: 1, name: "Scott Summers" });
  //   first === second;                     // true
  //   first.get('name') === 'Scott Summers' // true
  //
  // If an instance already exists, this function will simply update its
  // attributes.
  //
  // Example: Declaring a collection.
  //
  //   var UsersCollection = Backbone.Collection.extend({
  //       model: UniqueUser
  //       ...
  //   });

  function UniqueModel(Model, modelName) {
    modelName = modelName || _.uniqueId('UniqueModel_');

    var cache = UniqueModel.addModel(Model, modelName);

    return cache.modelConstructor;
  }

  UniqueModel.KEY_DELIMETER = '.';

  // Returns the cache associated with the given Model.
  UniqueModel.getModelCache = function (modelName) {
    var cache = globalCache[modelName];
    if (!cache)
      throw "Unrecognized model: " + modelName;

    return cache;
  };

  UniqueModel.addModel = function (Model, modelName) {
    // Throw error here? (added twice)
    if (globalCache[modelName])
      return globalCache[modelName];

    var cache = new ModelCache(Model, modelName);
    globalCache[modelName] = cache;
    return cache;
  };

  UniqueModel.enableLocalStorage = function () {
    localStorageEnabled = true;

    // TODO: disableLocalStorage?
    window.addEventListener('storage', UniqueModel.storageHandler, false);
  };

  // Clears all in-memory instances
  UniqueModel.clear = function () {
    for (var modelName in globalCache) {
      if (globalCache.hasOwnProperty(modelName))
        delete globalCache[modelName];
    }
  };

  UniqueModel.storageHandler = function (evt) {
    // TODO: IE fires onstorage even in the window that fired the
    //       change. Deal with that somehow.
    var key = evt.key;

    // This will process *all* storage events, so make sure not to choke
    // on events we're not interested in
    var split = key.split(UniqueModel.KEY_DELIMETER);
    if (split.length !== 3 || split[0] !== 'UniqueModel')
      return;

    var modelName = split[1];

    var cache = UniqueModel.getModelCache(modelName);

    var json = localStorage.getItem(key);
    var attrs = JSON.parse(json);

    var instance = cache.get(attrs, {
      fromStorage: true
    });
    instance.set(attrs);
  };

  //
  // Encapsulates a cache for a single model.
  //

  function ModelCache (Model, modelName) {
    var self = this;

    this.instances = {};
    this.Model = Model;
    this.modelName = modelName;

    var modelConstructor = function (attrs, options) {
      return self.get(attrs, options);
    };
    _.extend(modelConstructor, Backbone.Events);

    // Backbone collections need prototype of wrapped class
    modelConstructor.prototype = this.Model.prototype;
    this.modelConstructor = modelConstructor;
  }

  _.extend(ModelCache.prototype, {

    sync: function (instance) {
      var json = JSON.stringify(instance.attributes);
      localStorage.setItem(this.getWebStorageKey(instance), json);
    },

    getWebStorageKey: function (instance) {
      // e.g. UniqueModel_User_12345
      var str = ['UniqueModel', this.modelName, instance.id].join(UniqueModel.KEY_DELIMETER);
      return str;
    },

    add: function (id, attrs, options) {
      var instance = new this.Model(attrs, options);
      this.instances[id] = instance;

      if (localStorageEnabled) {
        this.sync(instance);
        instance.on('sync', _.bind(this.sync, this));
      }
      return instance;
    },

    get: function (attrs, options) {
      var Model = this.Model;
      var id = attrs && attrs[Model.prototype.idAttribute];

      // If there's no ID, this model isn't being tracked; return
      // a new instance
      if (!id) {
        instance = new Model(attrs, options);
        instance.on('sync', _.bind(this.sync, this));
        return instance;
      }

      // Attempt to restore a cached instance
      var instance = this.instances[id];
      if (!instance) {
        // If we haven't seen this instance before, start caching it
        instance = this.add(id, attrs, options);
        if (options && options.fromStorage) {
          this.modelConstructor.trigger('uniquemodel.add', instance);
        }
      } else {
        // Otherwise update the attributes of the cached instance
        instance.set(attrs);
        this.sync(instance);
      }
      return instance;
    }
  });

  window.Backbone.UniqueModel = UniqueModel;

})(typeof global === "object" ? global : this);
