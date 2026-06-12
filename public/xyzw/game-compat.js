// 游戏加密兼容性层
// 只提供微信扫码登录需要的加密功能，不加载完整Cocos2d引擎
// 注意：cc, cc._decorator, cc.ccclass, cc.property, cc._RF 已在index.html的head中提前定义

// TypeScript辅助函数 - __extends用于类继承
var __extends = (this && this.__extends) || (function () {
  var extendStatics = function (d, b) {
    extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
  };
  return function (d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
})();

// 扩展cc对象的其他必要方法
cc.Class = function(options) {
  const className = options.name || 'AnonymousClass';
  const ctor = options.ctor || function() {};
  const proto = {};
  
  for (const key in options) {
    if (key !== 'name' && key !== 'ctor' && typeof options[key] === 'function') {
      proto[key] = options[key];
    }
  }
  
  const Class = function() {
    ctor.apply(this, arguments);
  };
  
  Class.prototype = proto;
  Class.prototype.constructor = Class;
  Class.__classname__ = className;
  
  return Class;
};

cc.Action = cc.Class({
  name: 'cc.Action',
  ctor: function() {
    this.originalTarget = null;
    this.target = null;
    this.tag = -1;
  }
});

cc.Action.TAG_INVALID = -1;

cc.logID = function(id) {};
cc.warn = function() {};
cc.error = function() {};

console.log('游戏加密兼容性层已加载');
