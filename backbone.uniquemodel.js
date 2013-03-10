/*jshint unused:true, undef:true, strict:true*/
/*global global, _*/
(function (window) {
  "use strict";

  var Backbone = window.Backbone;

  // This is a factory function that enforces uniqueness of model instances.
  // It stores all instances by their ID (actual key should be specified via
  // idibute on a model).
  //
  // Example: Creating a new instance.
  //
  //   var first  = new UniqueModel(User, { id: 1, name: "Scott" });
  //   var second = new UniqueModel(User, { id: 1, name: "Scott Summers" });
  //   first === second;                     // true
  //   first.get('name') === 'Scott Summers' // true
  //
  // If an instance already exists, this function will simply update its
  // attributes.
  //
  // Example: Declaring a collection.
  //
  //   var UsersCollection = Backbone.Collection.extend({
  //       model: UniqueModel.forCollection(User)
  //       ...
  //   });

  function UniqueModel(Model, attrs, options) {
    var cache = UniqueModel.getModelCache(Model);
    var id = attrs && attrs[Model.prototype.idAttribute];

    // If there's no ID, this model isn't being tracked; return
    // a new instance
    if (!id)
      return new Model(attrs, options);

    // Attempt to restore a cached instance
    var instance = cache[id];
    if (!instance) {
      // If we haven't seen this instance before, start caching it
      instance = new Model(attrs, options);
      cache[id] = instance;
    } else {
      // Otherwise update the attributes of the cached instance
      instance.set(attrs);
    }

    return instance;
  }

  UniqueModel.cache = {};

  // Returns the cache associated with the given Model. If we
  // haven't seen this Model before, create a new cache.
  UniqueModel.getModelCache = function (Model) {
    var cache = UniqueModel.cache[Model.__uniqueModelId__];
    if (!cache)
      cache = this.addModel(Model, _.uniqueId('UniqueModel_'));

    return cache;
  };

  UniqueModel.addModel = function (Model, name) {
    if (Model.__uniqueModelId__ && UniqueModel.cache[name])
      return;

    Model.__uniqueModelId__ = name;
    var cache = {};
    UniqueModel.cache[name] = cache;
    return cache;
  };

  UniqueModel.forCollection = function (Model) {
    var proxy = _.bind(UniqueModel, {}, Model);
    proxy.prototype = Model.prototype;
    return proxy;
  };

  Backbone.UniqueModel = UniqueModel;

})(typeof global === "object" ? global : this);
