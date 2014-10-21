/*jshint unused:true, undef:true, strict:true*/
/*global global, _, Backbone*/
(function(root, factory) {

  // try AMD
  if (typeof define === 'function' && define.amd) {
    define(['backbone'], function (Backbone) {
      Backbone.UniqueModel = factory(Backbone);
    });

  // Next for Node.js or CommonJS
  } else if (typeof exports !== 'undefined') {
    var Backbone = require('backbone');
    Backbone.UniqueModel = factory(Backbone);

  // else just attach to the Backbone global
  } else {
    root.Backbone.UniqueModel = factory(root.Backbone);
  }

}(this, function(Backbone) {
  "use strict";

  var globalCache = {};

  /**
   * UniqueModel wrapper converts regular Backbone models into
   * unique ones.
   *
   * Example:
   *   var UniqueUser = UniqueModel(User);
   *
   * If this is model is synced between windows, you need to
   * specify the model's name (string) and a valid storage adapter
   * (currently just 'localStorage').
   *
   * Example:
   *   var SyncedUniqueUser = UniqueModel(User, 'User', 'localStorage');
   */

  function UniqueModel(Model, modelName, storageAdapter) {
    modelName = modelName || _.uniqueId('UniqueModel_');
    storageAdapter = storageAdapter || UniqueModel.STORAGE_DEFAULT_ADAPTER;

    var cache = UniqueModel.addModel(Model, modelName, storageAdapter);

    return cache.modelConstructor;
  }

  UniqueModel.STORAGE_DEFAULT_ADAPTER = 'memory';
  UniqueModel.STORAGE_KEY_DELIMETER = '.';
  UniqueModel.STORAGE_NAMESPACE = 'UniqueModel';

  // Returns the cache associated with the given Model.
  UniqueModel.getModelCache = function (modelName) {
    var cache = globalCache[modelName];
    if (!cache)
      throw "Unrecognized model: " + modelName;

    return cache;
  };

  UniqueModel.addModel = function (Model, modelName, storageAdapter) {
    // Throw error here? (added twice)
    if (globalCache[modelName])
      return globalCache[modelName];

    var cache = new ModelCache(Model, modelName, storageAdapter);
    globalCache[modelName] = cache;
    return cache;
  };

  // Clears all in-memory instances
  UniqueModel.clear = function () {
    for (var modelName in globalCache) {
      if (globalCache.hasOwnProperty(modelName))
        delete globalCache[modelName];
    }
  };

  /*
   * Encapsulates a cache for a single model.
   */

  function ModelCache (Model, modelName, storageAdapter) {
    var self = this;

    this.instances = {};
    this.Model = Model;
    this.modelName = modelName;

    this.storage = null;
    if (storageAdapter === 'localStorage') {
      this.storage = new StorageAdapter(this.modelName, localStorage);
    } else if (storageAdapter === 'sessionStorage') {
      this.storage = new StorageAdapter(this.modelName, sessionStorage);
    }

    if (this.storage) {
      this.storage.on('sync', this.storageSync, this);
      this.storage.on('destroy', this.storageDestroy, this);
    }

    var modelConstructor = function (attrs, options) {
      return self.get(attrs, options);
    };

    // Extend Model's static properties onto new
    _.extend(modelConstructor, Model);

    // NOTE: currently possible for Backbone.Events functions to collide with
    //       Model static properties e.g. Model.on vs Backbone.Events.on
    _.extend(modelConstructor, Backbone.Events);

    // Backbone collections need prototype of wrapped class
    modelConstructor.prototype = this.Model.prototype;
    this.modelConstructor = modelConstructor;

  }

  _.extend(ModelCache.prototype, {

    newModel: function (attrs, options) {
      var instance = new this.Model(attrs, options);

      if (this.storage) {
        if (instance.id)
          this.storage.save(instance.id, instance.attributes);
      }

      instance.on('sync', this.instanceSync, this);
      instance.on('destroy', this.instanceDestroy, this);

      return instance;
    },

    // Event handler when 'sync' is triggered on an instance
    instanceSync: function (instance) {
      if (this.storage)
        this.storage.save(instance.id, instance.attributes);
    },

    // Event handler when 'destroy' is triggered on an instance
    instanceDestroy: function (instance) {
      var id = instance.id;
      if (this.storage)
        this.storage.remove(id);

      // Stop tracking this model; otherwise mem leak (there are other
      // sources of memory leaks we need to address, but hey, here's one)
      if (this.instances[id])
        delete this.instances[id];
    },

    // Event handler when 'sync' is triggered on the storage adapter
    storageSync: function (id, attrs) {
      this.get(attrs, { fromStorage: true });
    },

    // Event handler when 'destroy' is triggered on the storage handler
    storageDestroy: function (id) {
      var instance = this.instances[id];
      if (instance) {
        instance.trigger('destroy', instance);
        delete this.instances[id];
      }
    },

    add: function (id, attrs, options) {
      var instance = this.newModel(attrs, options);
      this.instances[id] = instance;

      return instance;
    },

    get: function (attrs, options) {
      options = options || {};
      var Model = this.Model;
      var id = attrs && attrs[Model.prototype.idAttribute];

      // If there's no ID, this model isn't being tracked; return
      // a new instance
      if (!id)
        return this.newModel(attrs, options);

      // Attempt to restore a locally cached instance
      var instance = this.instances[id];

      // Attempt to restore a cached instance from storage
      if(this.storage &&

         // if this wasn't from a storage event
         !options.fromStorage &&

         // and there isn't already an existing instance
         !instance
        ) {
          var instanceAttrs = this.storage.getFromStorage(this.storage.getStorageKey(id));
          if (instanceAttrs)
            instance = this.add(id, instanceAttrs, options);
      }

      if (!instance) {
        // If we haven't seen this instance before, start caching it
        instance = this.add(id, attrs, options);
        if (options.fromStorage)
          this.modelConstructor.trigger('uniquemodel.add', instance);
      } else {
        // Otherwise update the attributes of the cached instance
        instance.set(attrs);
        if (!options.fromStorage)
          this.instanceSync(instance);
      }
      return instance;
    }
  });

  /**
   * Wraps localStorage access and onstorage events. Designed
   * so that this can be swapped out for another adapter (i.e.
   * sessionStorage or a localStorage-backed library like lscache)
   */
  function StorageAdapter (modelName, store) {
    this.modelName = modelName;
    this.store = store;

    StorageAdapter.instances[modelName] = this;

    // Global listener - only listen once
    if (!StorageAdapter.listener) {
      StorageAdapter.listener = window.addEventListener ?
        window.addEventListener('storage', StorageAdapter.onStorage, false) :
        window.attachEvent('onstorage', StorageAdapter.onStorage);
    }
  }

  // Hash of StorageAdapter instances
  StorageAdapter.instances = {};

  // Reference to the global onstorage handler
  StorageAdapter.listener = null;

  StorageAdapter.onStorage = function (evt) {
    // TODO: IE fires onstorage even in the window that fired the
    //       change. Deal with that somehow.
    var key = evt.key;

    // This will process *all* storage events, so make sure not to choke
    // on events we're not interested in.

    // Example regex output: /UniqueModel\.(\w+)\.(.+)/
    var re = new RegExp([
      UniqueModel.STORAGE_NAMESPACE, // namespace (default is UniqueModel)
      '(\\w+)',                      // class name
      '(.+)'                         // key
    ].join('\\' + UniqueModel.STORAGE_KEY_DELIMETER));

    var match = key.match(re);
    if (!match)
      return;

    var modelName = match[1];
    var id = match[2];

    var adapter = StorageAdapter.instances[modelName];
    if (!adapter)
      return;

    adapter.handleStorageEvent(key, id);
  };

  _.extend(StorageAdapter.prototype, {
    handleStorageEvent: function (key, id) {
      var attrs = this.getFromStorage(key);
      if (!attrs)
        this.trigger('destroy', id);
      else
        this.trigger('sync', id, attrs);
    },

    getFromStorage: function (key) {
      try {
        return JSON.parse(this.store.getItem(key));
      } catch (err) {
        return;
      }
    },

    getStorageKey: function (id) {
      // e.g. UniqueModel.User.12345
      var str = [
        UniqueModel.STORAGE_NAMESPACE,
        this.modelName,
        id
      ].join(UniqueModel.STORAGE_KEY_DELIMETER);

      return str;
    },

    save: function (id, attrs) {
      if (!id)
        throw 'Cannot save without id';

      var json = JSON.stringify(attrs);
      this.store.setItem(this.getStorageKey(id), json);
    },

    remove: function (id) {
      if (!id)
        throw 'Cannot remove without id';

      this.store.removeItem(this.getStorageKey(id));
    }
  }, Backbone.Events);

  // Exports
  _.extend(UniqueModel, {
    ModelCache: ModelCache,
    StorageAdapter: StorageAdapter
  });

  return UniqueModel;

}));
