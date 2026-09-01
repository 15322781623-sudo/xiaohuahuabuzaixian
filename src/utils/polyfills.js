/**
 * 旧版 WebView 兼容性 Polyfill
 * 针对 Android 9 WebView (Chrome 70-74) 缺失的 API 进行补丁
 */

// ========== globalThis (Chrome 71+) ==========
// Android 9 WebView 可能为 Chrome 70，缺少 globalThis
if (typeof globalThis === 'undefined') {
  if (typeof self !== 'undefined') self.globalThis = self;
  else if (typeof window !== 'undefined') window.globalThis = window;
  else if (typeof global !== 'undefined') global.globalThis = global;
}

// ========== Promise.allSettled (Chrome 76+) ==========
// Android 10 以下 WebView 不支持
if (!Promise.allSettled) {
  Promise.allSettled = function (promises) {
    return Promise.all(
      promises.map(p =>
        Promise.resolve(p).then(
          value => ({ status: 'fulfilled', value }),
          reason => ({ status: 'rejected', reason }),
        ),
      ),
    );
  };
}

// ========== Promise.any (Chrome 85+) ==========
if (!Promise.any) {
  Promise.any = function (promises) {
    return new Promise((resolve, reject) => {
      const errors = [];
      let remaining = promises.length;
      if (remaining === 0) {
        reject(new AggregateError([], 'All promises were rejected'));
        return;
      }
      promises.forEach((p, i) => {
        Promise.resolve(p).then(resolve, err => {
          errors[i] = err;
          if (--remaining === 0) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        });
      });
    });
  };
}

// ========== Array.prototype.at (Chrome 92+) ==========
if (!Array.prototype.at) {
  Array.prototype.at = function (index) {
    index = Math.trunc(index) || 0;
    if (index < 0) index += this.length;
    if (index < 0 || index >= this.length) return undefined;
    return this[index];
  };
}

// ========== String.prototype.at (Chrome 92+) ==========
if (!String.prototype.at) {
  String.prototype.at = function (index) {
    index = Math.trunc(index) || 0;
    if (index < 0) index += this.length;
    if (index < 0 || index >= this.length) return undefined;
    return this[index];
  };
}

// ========== Object.hasOwn (Chrome 93+) ==========
if (!Object.hasOwn) {
  Object.hasOwn = function (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// ========== Array.prototype.findLast / findLastIndex (Chrome 97+) ==========
if (!Array.prototype.findLast) {
  Array.prototype.findLast = function (callback, thisArg) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (callback.call(thisArg, this[i], i, this)) return this[i];
    }
    return undefined;
  };
}
if (!Array.prototype.findLastIndex) {
  Array.prototype.findLastIndex = function (callback, thisArg) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (callback.call(thisArg, this[i], i, this)) return i;
    }
    return -1;
  };
}

// ========== AbortSignal.timeout (Chrome 103+) ==========
if (typeof AbortSignal !== 'undefined' && !AbortSignal.timeout) {
  AbortSignal.timeout = function (ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms);
    return controller.signal;
  };
}

// ========== Object.fromEntries (Chrome 73+, Android WebView 73+) ==========
// 项目 browserslist 声明 Android >= 7，对应 Android 7 系统内置 WebView
// (Chrome 51) 不支持 Object.fromEntries；调用方通常是 CapacitorHttp 拦截的
// fetch 响应/headers 处理或第三方 UI 库内部实现，触发后表现为卡密激活
// 等接口的 `网络错误：Object.fromEntries is not a function`。
if (typeof Object.fromEntries !== 'function') {
  Object.fromEntries = function (iterable) {
    return Array.from(iterable).reduce((acc, pair) => {
      // 兼容 [key, value] 数组与 Map（Map 内部已实现 Symbol.iterator 返回 [k,v]）
      const key = pair[0];
      const value = pair[1];
      // 处理重复 key：保持与原生一致，后者后写覆盖先写
      acc[key] = value;
      return acc;
    }, Object.create(null));
  };
}

// ========== structuredClone (Chrome 98+) ==========
if (typeof structuredClone === 'undefined') {
  // 简单回退：使用 JSON 序列化（不支持循环引用、函数、特殊类型）
  // 对于本项目中的普通对象足够使用
  // 与原生 structuredClone 行为保持一致：undefined 直接返回，而不是抛错。
  // 否则 JSON.stringify(undefined) 返回 undefined 值，再交给 JSON.parse 会抛
  // `SyntaxError: "undefined" is not valid JSON`，
  // 导致同一份代码在 Chrome 98+（走原生）正常、在旧 WebView（走本 polyfill）崩溃。
  const jsonClone = function (obj) {
    if (obj === undefined) return undefined;
    return JSON.parse(JSON.stringify(obj));
  };
  if (typeof globalThis !== 'undefined') {
    globalThis.structuredClone = jsonClone;
  } else if (typeof window !== 'undefined') {
    window.structuredClone = jsonClone;
  }
}
