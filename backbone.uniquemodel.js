/*jshint unused:true, undef:true, strict:true*/
/*global global, _*/
(function (window) {
  "use strict";

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

  UniqueModel.cache = {};

  // Returns the cache associated with the given Model.
  UniqueModel.getModelCache = function (modelName) {
    var cache = UniqueModel.cache[modelName];
    if (!cache)
      throw "Unrecognized model: " + modelName;

    return cache;
  };

  UniqueModel.addModel = function (Model, modelName) {
    // Throw error here? (added twice)
    if (UniqueModel.cache[modelName])
      return;

    var cache = new ModelCache(Model);
    UniqueModel.cache[modelName] = cache;
    return cache;
  };

  //
  // Encapsulates a cache for a single model.
  //

  function ModelCache (Model) {
    this.instances = {};
    this.Model = Model;
  }

  _.extend(ModelCache.prototype, {
    add: function (id, attrs, options) {
      var instance = new this.Model(attrs, options);
      this.instances[id] = instance;

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
