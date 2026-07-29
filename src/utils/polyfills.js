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

// ========== structuredClone (Chrome 98+) ==========
if (typeof structuredClone === 'undefined') {
  // 简单回退：使用 JSON 序列化（不支持循环引用、函数、特殊类型）
  // 对于本项目中的普通对象足够使用
  if (typeof globalThis !== 'undefined') {
    globalThis.structuredClone = function (obj) {
      return JSON.parse(JSON.stringify(obj));
    };
  } else if (typeof window !== 'undefined') {
    window.structuredClone = function (obj) {
      return JSON.parse(JSON.stringify(obj));
    };
  }
}
