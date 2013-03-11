/*jshint unused:true, undef:true, strict:true*/
/*global global, _*/
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

    UniqueModel.addModel(Model, modelName);

    var wrapper = function (attrs, options) {
      var cache = UniqueModel.getModelCache(modelName);

      return cache.get(attrs, options);
    };

    // Backbone collections look up prototype
    wrapper.prototype = Model.prototype;

    return wrapper;
  }

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
      return;

    var cache = new ModelCache(Model, modelName);
    globalCache[modelName] = cache;
    return cache;
  };

  UniqueModel.enableLocalStorage = function () {
    localStorageEnabled = true;

    // TODO: disableLocalStorage?
    window.addEventListener('storage', UniqueModel.storageHandler, false);
  };

  UniqueModel.storageHandler = function (evt) {
    var key = evt.key;

    // This will process *all* storage events, so make sure not to choke
    // on events we're not interested in
    var split = key.split('_');
    if (split.length !== 3 || split[0] !== 'UniqueModel')
      return;

    var modelName = split[1];

    var cache = UniqueModel.getModelCache(modelName);

    var json = localStorage.getItem(key);
    var attrs = JSON.parse(json);

    var instance = cache.get(attrs);
    instance.set(attrs);
  };

  //
  // Encapsulates a cache for a single model.
  //

  function ModelCache (Model, modelName) {
    this.instances = {};
    this.Model = Model;
    this.modelName = modelName;
  }

  _.extend(ModelCache.prototype, {
    getWebStorageKey: function (instance) {
      // e.g. UniqueModel_User_12345
      return ['UniqueModel', this.modelName, instance.id].join('_');
    },

    add: function (id, attrs, options) {
      var instance = new this.Model(attrs, options);
      this.instances[id] = instance;

      if (localStorageEnabled) {
        instance.on('sync', function (instance) {
          var json = JSON.stringify(instance.attributes);
          localStorage.setItem(this.getWebStorageKey(instance), json);
        }, this);
      }
      return instance;
    },

    get: function (attrs, options) {
      var Model = this.Model;
      var id = attrs && attrs[Model.prototype.idAttribute];

      // If there's no ID, this model isn't being tracked; return
      // a new instance
      if (!id)
        return new Model(attrs, options);

      // Attempt to restore a cached instance
      var instance = this.instances[id];
      if (!instance) {
        // If we haven't seen this instance before, start caching it
        instance = this.add(id, attrs, options);
      } else {
        // Otherwise update the attributes of the cached instance
        instance.set(attrs);
      }
      return instance;
    }
  });

  window.Backbone.UniqueModel = UniqueModel;

})(typeof global === "object" ? global : this);
