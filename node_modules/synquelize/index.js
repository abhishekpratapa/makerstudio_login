var Sequelize = require('sequelize');
var Fiber = require('fibers');
var Promise = require('sequelize/lib/promise').super_;

// [AsyncClass, SyncWrapperClass] pairs
var classPairs = [];

// Get wrapper class for possibly async instance
function getWrapClass(instance) {
  for (var i = 0; i < classPairs.length; ++i) {
    var cls = classPairs[i][0];
    if (instance instanceof cls) {
      var wrapCls = classPairs[i][1];
      var proto = Object.getPrototypeOf(instance);
      if (cls.prototype === proto)
        return wrapCls;
      // The following code handles only one level of inheritance
      for (var j = i + 1; j < classPairs.length; ++j)
        if (classPairs[j][0].prototype === proto)
          return classPairs[j][1];
      return wrapClass(proto.constructor, wrapCls);
    }
  }
}

// Return sync wrapper instance for possibly async value
function wrapValue(value) {
  var wrapCls;
  if (value instanceof Array &&
      value.length &&
      (wrapCls = getWrapClass(value[0]))) {
    var result = [];
    for (var i = 0; i < value.length; ++i)
      result.push(new wrapCls(value[i]));
    return result;
  }
  wrapCls = getWrapClass(value);
  return wrapCls ? new wrapCls(value) : value;
}

// Return sync method encapsulating async method call
function wrapMethod(method) {
  return function () {
    var ret = method.apply(this._obj, arguments);
    if (!(ret instanceof Promise))
      return wrapValue(ret);
    var fiber = Fiber.current;
    ret.then(
      function (value) {
        fiber.run(value);
      },
      function (err) {
       fiber.throwInto(err);
     });
    return wrapValue(Fiber.yield());
  }
}

// Return description of a property proxing getter and setter calls
function wrapProperty(descr) {
  var wrapDescr = {};
  if (descr.get) {
    wrapDescr.get = function () {
      return descr.get.call(this._obj);
    };
  }
  if (descr.set) {
    wrapDescr.set = function (value) {
      return descr.set.call(this._obj, value);
    }
  }
  return wrapDescr;
}

// Create sync wrapper class and save it in classPairs
function wrapClass(cls, superWrapCls) {
  var wrapCls = function (obj) {
    this._obj = arguments.length == 1 && obj instanceof cls
      ? obj
      : new (Function.prototype.bind.apply(
            cls, Array.prototype.concat.apply([null], arguments)));
  };

  for (var name in cls)
    wrapCls[name] = cls[name];

  if (superWrapCls)
    wrapCls.prototype = Object.create(superWrapCls.prototype);

  var names = Object.getOwnPropertyNames(cls.prototype);
  for (var i = 0; i < names.length; ++i) {
    name = names[i];
    var descr = Object.getOwnPropertyDescriptor(cls.prototype, name);
    if (descr.value)
      wrapCls.prototype[name] =
        typeof descr.value === 'function'
        ? wrapMethod(cls.prototype[name])
        : descr.value;
    else if (descr.get || descr.set)
      Object.defineProperty(wrapCls.prototype, name, wrapProperty(descr));
  }

  classPairs.push([cls, wrapCls]);

  return wrapCls;
}

// Wrap sequelize classes
wrapClass(require('sequelize/lib/model'));
wrapClass(require('sequelize/lib/instance'));
module.exports = wrapClass(Sequelize);

module.exports.run = function (callback) {
  Fiber(callback).run();
};
