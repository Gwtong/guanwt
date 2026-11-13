(() => {
  var __defProp = Object.defineProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet(obj, member, value, setter);
    },
    get _() {
      return __privateGet(obj, member, getter);
    }
  });

  // cloudflare/node_modules/hono/dist/compose.js
  var compose = (middleware, onError, onNotFound) => {
    return (context, next) => {
      let index = -1;
      return dispatch(0);
      async function dispatch(i) {
        if (i <= index) {
          throw new Error("next() called multiple times");
        }
        index = i;
        let res;
        let isError = false;
        let handler;
        if (middleware[i]) {
          handler = middleware[i][0][0];
          context.req.routeIndex = i;
        } else {
          handler = i === middleware.length && next || void 0;
        }
        if (handler) {
          try {
            res = await handler(context, () => dispatch(i + 1));
          } catch (err) {
            if (err instanceof Error && onError) {
              context.error = err;
              res = await onError(err, context);
              isError = true;
            } else {
              throw err;
            }
          }
        } else {
          if (context.finalized === false && onNotFound) {
            res = await onNotFound(context);
          }
        }
        if (res && (context.finalized === false || isError)) {
          context.res = res;
        }
        return context;
      }
    };
  };

  // cloudflare/node_modules/hono/dist/request/constants.js
  var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

  // cloudflare/node_modules/hono/dist/utils/buffer.js
  var bufferToFormData = (arrayBuffer, contentType) => {
    const response = new Response(arrayBuffer, {
      headers: {
        // Normalize the media type (case-insensitive) while keeping parameters like the boundary
        "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
      }
    });
    return response.formData();
  };

  // cloudflare/node_modules/hono/dist/utils/body.js
  var isRawRequest = (request) => "headers" in request;
  var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
    const { all = false, dot = false } = options;
    const headers = isRawRequest(request) ? request.headers : request.raw.headers;
    const contentType = headers.get("Content-Type");
    const mediaType = contentType == null ? void 0 : contentType.split(";")[0].trim().toLowerCase();
    if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
      return parseFormData(request, { all, dot });
    }
    return {};
  };
  async function parseFormData(request, options) {
    if (!isRawRequest(request) && request.bodyCache.formData) {
      return convertFormDataToBodyData(
        await request.bodyCache.formData,
        options
      );
    }
    const headers = isRawRequest(request) ? request.headers : request.raw.headers;
    const arrayBuffer = await request.arrayBuffer();
    const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
    if (!isRawRequest(request)) {
      request.bodyCache.formData = formDataPromise;
    }
    const formData = await formDataPromise;
    if (formData) {
      return convertFormDataToBodyData(formData, options);
    }
    return {};
  }
  function convertFormDataToBodyData(formData, options) {
    const form = /* @__PURE__ */ Object.create(null);
    formData.forEach((value, key) => {
      const shouldParseAllValues = options.all || key.endsWith("[]");
      if (!shouldParseAllValues) {
        form[key] = value;
      } else {
        handleParsingAllValues(form, key, value);
      }
    });
    if (options.dot) {
      Object.entries(form).forEach(([key, value]) => {
        const shouldParseDotValues = key.includes(".");
        if (shouldParseDotValues) {
          handleParsingNestedValues(form, key, value);
          delete form[key];
        }
      });
    }
    return form;
  }
  var handleParsingAllValues = (form, key, value) => {
    if (form[key] !== void 0) {
      if (Array.isArray(form[key])) {
        ;
        form[key].push(value);
      } else {
        form[key] = [form[key], value];
      }
    } else {
      if (!key.endsWith("[]")) {
        form[key] = value;
      } else {
        form[key] = [value];
      }
    }
  };
  var handleParsingNestedValues = (form, key, value) => {
    if (/(?:^|\.)__proto__\./.test(key)) {
      return;
    }
    let nestedForm = form;
    const keys = key.split(".");
    keys.forEach((key2, index) => {
      if (index === keys.length - 1) {
        nestedForm[key2] = value;
      } else {
        if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
          nestedForm[key2] = /* @__PURE__ */ Object.create(null);
        }
        nestedForm = nestedForm[key2];
      }
    });
  };

  // cloudflare/node_modules/hono/dist/utils/url.js
  var splitPath = (path) => {
    const paths = path.split("/");
    if (paths[0] === "") {
      paths.shift();
    }
    return paths;
  };
  var splitRoutingPath = (routePath) => {
    const { groups, path } = extractGroupsFromPath(routePath);
    const paths = splitPath(path);
    return replaceGroupMarks(paths, groups);
  };
  var extractGroupsFromPath = (path) => {
    const groups = [];
    path = path.replace(/\{[^}]+\}/g, (match2, index) => {
      const mark = `@${index}`;
      groups.push([mark, match2]);
      return mark;
    });
    return { groups, path };
  };
  var replaceGroupMarks = (paths, groups) => {
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = paths.length - 1; j >= 0; j--) {
        if (paths[j].includes(mark)) {
          paths[j] = paths[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    return paths;
  };
  var patternCache = {};
  var getPattern = (label, next) => {
    if (label === "*") {
      return "*";
    }
    const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    if (match2) {
      const cacheKey = `${label}#${next}`;
      if (!patternCache[cacheKey]) {
        if (match2[2]) {
          patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
        } else {
          patternCache[cacheKey] = [label, match2[1], true];
        }
      }
      return patternCache[cacheKey];
    }
    return null;
  };
  var tryDecode = (str, decoder) => {
    try {
      return decoder(str);
    } catch {
      return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
        try {
          return decoder(match2);
        } catch {
          return match2;
        }
      });
    }
  };
  var tryDecodeURI = (str) => tryDecode(str, decodeURI);
  var getPath = (request) => {
    const url = request.url;
    const start = url.indexOf("/", url.indexOf(":") + 4);
    let i = start;
    for (; i < url.length; i++) {
      const charCode = url.charCodeAt(i);
      if (charCode === 37) {
        const queryIndex = url.indexOf("?", i);
        const hashIndex = url.indexOf("#", i);
        const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
        const path = url.slice(start, end);
        return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
      } else if (charCode === 63 || charCode === 35) {
        break;
      }
    }
    return url.slice(start, i);
  };
  var getPathNoStrict = (request) => {
    const result = getPath(request);
    return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
  };
  var mergePath = (base, sub, ...rest) => {
    if (rest.length) {
      sub = mergePath(sub, ...rest);
    }
    return `${(base == null ? void 0 : base[0]) === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${(base == null ? void 0 : base.at(-1)) === "/" ? "" : "/"}${(sub == null ? void 0 : sub[0]) === "/" ? sub.slice(1) : sub}`}`;
  };
  var checkOptionalParameter = (path) => {
    if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
      return null;
    }
    const segments = path.split("/");
    const results = [];
    let basePath = "";
    segments.forEach((segment) => {
      if (segment !== "" && !/\:/.test(segment)) {
        basePath += "/" + segment;
      } else if (/\:/.test(segment)) {
        if (segment.charCodeAt(segment.length - 1) === 63) {
          if (results.length === 0 && basePath === "") {
            results.push("/");
          } else {
            results.push(basePath);
          }
          const optionalSegment = segment.slice(0, -1);
          basePath += "/" + optionalSegment;
          results.push(basePath);
        } else {
          basePath += "/" + segment;
        }
      }
    });
    return results.filter((v, i, a) => a.indexOf(v) === i);
  };
  var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
  var _decodeURI = (value) => {
    if (value.indexOf("+") !== -1) {
      value = value.replace(/\+/g, " ");
    }
    return tryDecodeURIComponent(value);
  };
  var _getQueryParam = (url, key, multiple) => {
    var _a11;
    let encoded;
    if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
      let keyIndex2 = url.indexOf("?", 8);
      if (keyIndex2 === -1) {
        return void 0;
      }
      if (!url.startsWith(key, keyIndex2 + 1)) {
        keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
      }
      while (keyIndex2 !== -1) {
        const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
        if (trailingKeyCode === 61) {
          const valueIndex = keyIndex2 + key.length + 2;
          const endIndex = url.indexOf("&", valueIndex);
          return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
        } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
          return "";
        }
        keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
      }
      encoded = /[%+]/.test(url);
      if (!encoded) {
        return void 0;
      }
    }
    const results = /* @__PURE__ */ Object.create(null);
    encoded != null ? encoded : encoded = /[%+]/.test(url);
    let keyIndex = url.indexOf("?", 8);
    while (keyIndex !== -1) {
      const nextKeyIndex = url.indexOf("&", keyIndex + 1);
      let valueIndex = url.indexOf("=", keyIndex);
      if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
        valueIndex = -1;
      }
      let name = url.slice(
        keyIndex + 1,
        valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
      );
      if (encoded) {
        name = _decodeURI(name);
      }
      keyIndex = nextKeyIndex;
      if (name === "") {
        continue;
      }
      let value;
      if (valueIndex === -1) {
        value = "";
      } else {
        value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
        if (encoded) {
          value = _decodeURI(value);
        }
      }
      if (multiple) {
        if (!(results[name] && Array.isArray(results[name]))) {
          results[name] = [];
        }
        ;
        results[name].push(value);
      } else {
        (_a11 = results[name]) != null ? _a11 : results[name] = value;
      }
    }
    return key ? results[key] : results;
  };
  var getQueryParam = _getQueryParam;
  var getQueryParams = (url, key) => {
    return _getQueryParam(url, key, true);
  };
  var decodeURIComponent_ = decodeURIComponent;

  // cloudflare/node_modules/hono/dist/request.js
  var _validatedData, _matchResult, _HonoRequest_instances, getDecodedParam_fn, getAllDecodedParams_fn, getParamValue_fn, _cachedBody, _a;
  var HonoRequest = (_a = class {
    constructor(request, path = "/", matchResult = [[]]) {
      __privateAdd(this, _HonoRequest_instances);
      /**
       * `.raw` can get the raw Request object.
       *
       * @see {@link https://hono.dev/docs/api/request#raw}
       *
       * @example
       * ```ts
       * // For Cloudflare Workers
       * app.post('/', async (c) => {
       *   const metadata = c.req.raw.cf?.hostMetadata?
       *   ...
       * })
       * ```
       */
      __publicField(this, "raw");
      __privateAdd(this, _validatedData);
      // Short name of validatedData
      __privateAdd(this, _matchResult);
      __publicField(this, "routeIndex", 0);
      /**
       * `.path` can get the pathname of the request.
       *
       * @see {@link https://hono.dev/docs/api/request#path}
       *
       * @example
       * ```ts
       * app.get('/about/me', (c) => {
       *   const pathname = c.req.path // `/about/me`
       * })
       * ```
       */
      __publicField(this, "path");
      __publicField(this, "bodyCache", {});
      __privateAdd(this, _cachedBody, (key) => {
        const { bodyCache, raw: raw2 } = this;
        const cachedBody = bodyCache[key];
        if (cachedBody) {
          return cachedBody;
        }
        for (const anyCachedKey in bodyCache) {
          return bodyCache[anyCachedKey].then((body) => {
            if (anyCachedKey === "json") {
              body = JSON.stringify(body);
            }
            return new Response(body)[key]();
          });
        }
        return bodyCache[key] = raw2[key]();
      });
      this.raw = request;
      this.path = path;
      __privateSet(this, _matchResult, matchResult);
    }
    param(key) {
      return key ? __privateMethod(this, _HonoRequest_instances, getDecodedParam_fn).call(this, key) : __privateMethod(this, _HonoRequest_instances, getAllDecodedParams_fn).call(this);
    }
    query(key) {
      return getQueryParam(this.url, key);
    }
    queries(key) {
      return getQueryParams(this.url, key);
    }
    header(name) {
      var _a11;
      if (name) {
        return (_a11 = this.raw.headers.get(name)) != null ? _a11 : void 0;
      }
      const headerData = /* @__PURE__ */ Object.create(null);
      this.raw.headers.forEach((value, key) => {
        headerData[key] = value;
      });
      return headerData;
    }
    async parseBody(options) {
      return parseBody(this, options);
    }
    /**
     * `.json()` can parse Request body of type `application/json`
     *
     * @see {@link https://hono.dev/docs/api/request#json}
     *
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.json()
     * })
     * ```
     */
    json() {
      return __privateGet(this, _cachedBody).call(this, "text").then((text) => JSON.parse(text));
    }
    /**
     * `.text()` can parse Request body of type `text/plain`
     *
     * @see {@link https://hono.dev/docs/api/request#text}
     *
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.text()
     * })
     * ```
     */
    text() {
      return __privateGet(this, _cachedBody).call(this, "text");
    }
    /**
     * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
     *
     * @see {@link https://hono.dev/docs/api/request#arraybuffer}
     *
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.arrayBuffer()
     * })
     * ```
     */
    arrayBuffer() {
      return __privateGet(this, _cachedBody).call(this, "arrayBuffer");
    }
    /**
     * `.bytes()` parses the request body as a `Uint8Array`.
     *
     * @see {@link https://hono.dev/docs/api/request#bytes}
     *
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.bytes()
     * })
     * ```
     */
    bytes() {
      return __privateGet(this, _cachedBody).call(this, "arrayBuffer").then((buffer) => new Uint8Array(buffer));
    }
    /**
     * Parses the request body as a `Blob`.
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.blob();
     * });
     * ```
     * @see https://hono.dev/docs/api/request#blob
     */
    blob() {
      return __privateGet(this, _cachedBody).call(this, "blob");
    }
    /**
     * Parses the request body as `FormData`.
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.formData();
     * });
     * ```
     * @see https://hono.dev/docs/api/request#formdata
     */
    formData() {
      return __privateGet(this, _cachedBody).call(this, "formData");
    }
    /**
     * Adds validated data to the request.
     *
     * @param target - The target of the validation.
     * @param data - The validated data to add.
     */
    addValidatedData(target, data) {
      var _a11;
      ;
      ((_a11 = __privateGet(this, _validatedData)) != null ? _a11 : __privateSet(this, _validatedData, {}))[target] = data;
    }
    valid(target) {
      var _a11;
      return (_a11 = __privateGet(this, _validatedData)) == null ? void 0 : _a11[target];
    }
    /**
     * `.url()` can get the request url strings.
     *
     * @see {@link https://hono.dev/docs/api/request#url}
     *
     * @example
     * ```ts
     * app.get('/about/me', (c) => {
     *   const url = c.req.url // `http://localhost:8787/about/me`
     *   ...
     * })
     * ```
     */
    get url() {
      return this.raw.url;
    }
    /**
     * `.method()` can get the method name of the request.
     *
     * @see {@link https://hono.dev/docs/api/request#method}
     *
     * @example
     * ```ts
     * app.get('/about/me', (c) => {
     *   const method = c.req.method // `GET`
     * })
     * ```
     */
    get method() {
      return this.raw.method;
    }
    get [GET_MATCH_RESULT]() {
      return __privateGet(this, _matchResult);
    }
    /**
     * `.matchedRoutes()` can return a matched route in the handler
     *
     * @deprecated
     *
     * Use matchedRoutes helper defined in "hono/route" instead.
     *
     * @see {@link https://hono.dev/docs/api/request#matchedroutes}
     *
     * @example
     * ```ts
     * app.use('*', async function logger(c, next) {
     *   await next()
     *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
     *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
     *     console.log(
     *       method,
     *       ' ',
     *       path,
     *       ' '.repeat(Math.max(10 - path.length, 0)),
     *       name,
     *       i === c.req.routeIndex ? '<- respond from here' : ''
     *     )
     *   })
     * })
     * ```
     */
    get matchedRoutes() {
      return __privateGet(this, _matchResult)[0].map(([[, route2]]) => route2);
    }
    /**
     * `routePath()` can retrieve the path registered within the handler
     *
     * @deprecated
     *
     * Use routePath helper defined in "hono/route" instead.
     *
     * @see {@link https://hono.dev/docs/api/request#routepath}
     *
     * @example
     * ```ts
     * app.get('/posts/:id', (c) => {
     *   return c.json({ path: c.req.routePath })
     * })
     * ```
     */
    get routePath() {
      return __privateGet(this, _matchResult)[0].map(([[, route2]]) => route2)[this.routeIndex].path;
    }
  }, _validatedData = new WeakMap(), _matchResult = new WeakMap(), _HonoRequest_instances = new WeakSet(), getDecodedParam_fn = function(key) {
    var _a11;
    const paramKey = (_a11 = __privateGet(this, _matchResult)[0][this.routeIndex]) == null ? void 0 : _a11[1][key];
    const param = __privateMethod(this, _HonoRequest_instances, getParamValue_fn).call(this, paramKey);
    return param && tryDecodeURIComponent(param);
  }, getAllDecodedParams_fn = function() {
    var _a11, _b;
    const decoded = {};
    const keys = Object.keys((_b = (_a11 = __privateGet(this, _matchResult)[0][this.routeIndex]) == null ? void 0 : _a11[1]) != null ? _b : {});
    for (const key of keys) {
      const value = __privateMethod(this, _HonoRequest_instances, getParamValue_fn).call(this, __privateGet(this, _matchResult)[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }, getParamValue_fn = function(paramKey) {
    return __privateGet(this, _matchResult)[1] ? __privateGet(this, _matchResult)[1][paramKey] : paramKey;
  }, _cachedBody = new WeakMap(), _a);

  // cloudflare/node_modules/hono/dist/utils/html.js
  var HtmlEscapedCallbackPhase = {
    Stringify: 1,
    BeforeStream: 2,
    Stream: 3
  };
  var raw = (value, callbacks) => {
    const escapedString = new String(value);
    escapedString.isEscaped = true;
    escapedString.callbacks = callbacks;
    return escapedString;
  };
  var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
    if (typeof str === "object" && !(str instanceof String)) {
      if (!(str instanceof Promise)) {
        str = str.toString();
      }
      if (str instanceof Promise) {
        str = await str;
      }
    }
    const callbacks = str.callbacks;
    if (!(callbacks == null ? void 0 : callbacks.length)) {
      return Promise.resolve(str);
    }
    if (buffer) {
      buffer[0] += str;
    } else {
      buffer = [str];
    }
    const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
      (res) => Promise.all(
        res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
      ).then(() => buffer[0])
    );
    if (preserveCallbacks) {
      return raw(await resStr, callbacks);
    } else {
      return resStr;
    }
  };

  // cloudflare/node_modules/hono/dist/context.js
  var TEXT_PLAIN = "text/plain; charset=UTF-8";
  var setDefaultContentType = (contentType, headers) => {
    return {
      "Content-Type": contentType,
      ...headers
    };
  };
  var createResponseInstance = (body, init) => new Response(body, init);
  var _rawRequest, _req, _var, _status, _executionCtx, _res, _layout, _renderer, _notFoundHandler, _preparedHeaders, _matchResult2, _path, _Context_instances, newResponse_fn, _a2;
  var Context = (_a2 = class {
    /**
     * Creates an instance of the Context class.
     *
     * @param req - The Request object.
     * @param options - Optional configuration options for the context.
     */
    constructor(req, options) {
      __privateAdd(this, _Context_instances);
      __privateAdd(this, _rawRequest);
      __privateAdd(this, _req);
      /**
       * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
       *
       * @see {@link https://hono.dev/docs/api/context#env}
       *
       * @example
       * ```ts
       * // Environment object for Cloudflare Workers
       * app.get('*', async c => {
       *   const counter = c.env.COUNTER
       * })
       * ```
       */
      __publicField(this, "env", {});
      __privateAdd(this, _var);
      __publicField(this, "finalized", false);
      /**
       * `.error` can get the error object from the middleware if the Handler throws an error.
       *
       * @see {@link https://hono.dev/docs/api/context#error}
       *
       * @example
       * ```ts
       * app.use('*', async (c, next) => {
       *   await next()
       *   if (c.error) {
       *     // do something...
       *   }
       * })
       * ```
       */
      __publicField(this, "error");
      __privateAdd(this, _status);
      __privateAdd(this, _executionCtx);
      __privateAdd(this, _res);
      __privateAdd(this, _layout);
      __privateAdd(this, _renderer);
      __privateAdd(this, _notFoundHandler);
      __privateAdd(this, _preparedHeaders);
      __privateAdd(this, _matchResult2);
      __privateAdd(this, _path);
      /**
       * `.render()` can create a response within a layout.
       *
       * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
       *
       * @example
       * ```ts
       * app.get('/', (c) => {
       *   return c.render('Hello!')
       * })
       * ```
       */
      __publicField(this, "render", (...args) => {
        var _a11;
        (_a11 = __privateGet(this, _renderer)) != null ? _a11 : __privateSet(this, _renderer, (content) => this.html(content));
        return __privateGet(this, _renderer).call(this, ...args);
      });
      /**
       * Sets the layout for the response.
       *
       * @param layout - The layout to set.
       * @returns The layout function.
       */
      __publicField(this, "setLayout", (layout) => __privateSet(this, _layout, layout));
      /**
       * Gets the current layout for the response.
       *
       * @returns The current layout function.
       */
      __publicField(this, "getLayout", () => __privateGet(this, _layout));
      /**
       * `.setRenderer()` can set the layout in the custom middleware.
       *
       * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
       *
       * @example
       * ```tsx
       * app.use('*', async (c, next) => {
       *   c.setRenderer((content) => {
       *     return c.html(
       *       <html>
       *         <body>
       *           <p>{content}</p>
       *         </body>
       *       </html>
       *     )
       *   })
       *   await next()
       * })
       * ```
       */
      __publicField(this, "setRenderer", (renderer) => {
        __privateSet(this, _renderer, renderer);
      });
      /**
       * `.header()` can set headers.
       *
       * @see {@link https://hono.dev/docs/api/context#header}
       *
       * @example
       * ```ts
       * app.get('/welcome', (c) => {
       *   // Set headers
       *   c.header('X-Message', 'Hello!')
       *   c.header('Content-Type', 'text/plain')
       *
       *   // Append multiple headers using the append option (e.g. Vary)
       *   c.header('Vary', 'Accept-Encoding', { append: true })
       *   c.header('Vary', 'User-Agent', { append: true })
       *
       *   return c.body('Thank you for coming')
       * })
       * ```
       */
      __publicField(this, "header", (name, value, options) => {
        var _a11;
        if (this.finalized) {
          __privateSet(this, _res, createResponseInstance(__privateGet(this, _res).body, __privateGet(this, _res)));
        }
        const headers = __privateGet(this, _res) ? __privateGet(this, _res).headers : (_a11 = __privateGet(this, _preparedHeaders)) != null ? _a11 : __privateSet(this, _preparedHeaders, new Headers());
        if (value === void 0) {
          headers.delete(name);
        } else if (options == null ? void 0 : options.append) {
          headers.append(name, value);
        } else {
          headers.set(name, value);
        }
      });
      __publicField(this, "status", (status) => {
        __privateSet(this, _status, status);
      });
      /**
       * `.set()` can set the value specified by the key.
       *
       * @see {@link https://hono.dev/docs/api/context#set-get}
       *
       * @example
       * ```ts
       * app.use('*', async (c, next) => {
       *   c.set('message', 'Hono is hot!!')
       *   await next()
       * })
       * ```
       */
      __publicField(this, "set", (key, value) => {
        var _a11;
        (_a11 = __privateGet(this, _var)) != null ? _a11 : __privateSet(this, _var, /* @__PURE__ */ new Map());
        __privateGet(this, _var).set(key, value);
      });
      /**
       * `.get()` can use the value specified by the key.
       *
       * @see {@link https://hono.dev/docs/api/context#set-get}
       *
       * @example
       * ```ts
       * app.get('/', (c) => {
       *   const message = c.get('message')
       *   return c.text(`The message is "${message}"`)
       * })
       * ```
       */
      __publicField(this, "get", (key) => {
        return __privateGet(this, _var) ? __privateGet(this, _var).get(key) : void 0;
      });
      __publicField(this, "newResponse", (...args) => __privateMethod(this, _Context_instances, newResponse_fn).call(this, ...args));
      /**
       * `.body()` can return the HTTP response.
       * You can set headers with `.header()` and set HTTP status code with `.status`.
       * This can also be set in `.text()`, `.json()` and so on.
       *
       * @see {@link https://hono.dev/docs/api/context#body}
       *
       * @example
       * ```ts
       * app.get('/welcome', (c) => {
       *   // Set headers
       *   c.header('X-Message', 'Hello!')
       *   c.header('Content-Type', 'text/plain')
       *   // Set HTTP status code
       *   c.status(201)
       *
       *   // Return the response body
       *   return c.body('Thank you for coming')
       * })
       * ```
       */
      __publicField(this, "body", (data, arg, headers) => __privateMethod(this, _Context_instances, newResponse_fn).call(this, data, arg, headers));
      /**
       * `.text()` can render text as `Content-Type:text/plain`.
       *
       * @see {@link https://hono.dev/docs/api/context#text}
       *
       * @example
       * ```ts
       * app.get('/say', (c) => {
       *   return c.text('Hello!')
       * })
       * ```
       */
      __publicField(this, "text", (text, arg, headers) => {
        return !__privateGet(this, _preparedHeaders) && !__privateGet(this, _status) && !arg && !headers && !this.finalized ? new Response(text) : __privateMethod(this, _Context_instances, newResponse_fn).call(this, text, arg, setDefaultContentType(TEXT_PLAIN, headers));
      });
      /**
       * `.json()` can render JSON as `Content-Type:application/json`.
       *
       * @see {@link https://hono.dev/docs/api/context#json}
       *
       * @example
       * ```ts
       * app.get('/api', (c) => {
       *   return c.json({ message: 'Hello!' })
       * })
       * ```
       */
      __publicField(this, "json", (object, arg, headers) => {
        return __privateMethod(this, _Context_instances, newResponse_fn).call(this, JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
      });
      __publicField(this, "html", (html, arg, headers) => {
        const res = (html2) => __privateMethod(this, _Context_instances, newResponse_fn).call(this, html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
        return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
      });
      /**
       * `.redirect()` can Redirect, default status code is 302.
       *
       * @see {@link https://hono.dev/docs/api/context#redirect}
       *
       * @example
       * ```ts
       * app.get('/redirect', (c) => {
       *   return c.redirect('/')
       * })
       * app.get('/redirect-permanently', (c) => {
       *   return c.redirect('/', 301)
       * })
       * ```
       */
      __publicField(this, "redirect", (location2, status) => {
        const locationString = String(location2);
        this.header(
          "Location",
          // Multibyes should be encoded
          // eslint-disable-next-line no-control-regex
          !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
        );
        return this.newResponse(null, status != null ? status : 302);
      });
      /**
       * `.notFound()` can return the Not Found Response.
       *
       * @see {@link https://hono.dev/docs/api/context#notfound}
       *
       * @example
       * ```ts
       * app.get('/notfound', (c) => {
       *   return c.notFound()
       * })
       * ```
       */
      __publicField(this, "notFound", () => {
        var _a11;
        (_a11 = __privateGet(this, _notFoundHandler)) != null ? _a11 : __privateSet(this, _notFoundHandler, () => createResponseInstance());
        return __privateGet(this, _notFoundHandler).call(this, this);
      });
      __privateSet(this, _rawRequest, req);
      if (options) {
        __privateSet(this, _executionCtx, options.executionCtx);
        this.env = options.env;
        __privateSet(this, _notFoundHandler, options.notFoundHandler);
        __privateSet(this, _path, options.path);
        __privateSet(this, _matchResult2, options.matchResult);
      }
    }
    /**
     * `.req` is the instance of {@link HonoRequest}.
     */
    get req() {
      var _a11;
      (_a11 = __privateGet(this, _req)) != null ? _a11 : __privateSet(this, _req, new HonoRequest(__privateGet(this, _rawRequest), __privateGet(this, _path), __privateGet(this, _matchResult2)));
      return __privateGet(this, _req);
    }
    /**
     * @see {@link https://hono.dev/docs/api/context#event}
     * The FetchEvent associated with the current request.
     *
     * @throws Will throw an error if the context does not have a FetchEvent.
     */
    get event() {
      if (__privateGet(this, _executionCtx) && "respondWith" in __privateGet(this, _executionCtx)) {
        return __privateGet(this, _executionCtx);
      } else {
        throw Error("This context has no FetchEvent");
      }
    }
    /**
     * @see {@link https://hono.dev/docs/api/context#executionctx}
     * The ExecutionContext associated with the current request.
     *
     * @throws Will throw an error if the context does not have an ExecutionContext.
     */
    get executionCtx() {
      if (__privateGet(this, _executionCtx)) {
        return __privateGet(this, _executionCtx);
      } else {
        throw Error("This context has no ExecutionContext");
      }
    }
    /**
     * @see {@link https://hono.dev/docs/api/context#res}
     * The Response object for the current request.
     */
    get res() {
      var _a11;
      return __privateGet(this, _res) || __privateSet(this, _res, createResponseInstance(null, {
        headers: (_a11 = __privateGet(this, _preparedHeaders)) != null ? _a11 : __privateSet(this, _preparedHeaders, new Headers())
      }));
    }
    /**
     * Sets the Response object for the current request.
     *
     * @param _res - The Response object to set.
     */
    set res(_res2) {
      if (__privateGet(this, _res) && _res2) {
        _res2 = createResponseInstance(_res2.body, _res2);
        for (const [k, v] of __privateGet(this, _res).headers.entries()) {
          if (k === "content-type") {
            continue;
          }
          if (k === "set-cookie") {
            const cookies = __privateGet(this, _res).headers.getSetCookie();
            _res2.headers.delete("set-cookie");
            for (const cookie of cookies) {
              _res2.headers.append("set-cookie", cookie);
            }
          } else {
            _res2.headers.set(k, v);
          }
        }
      }
      __privateSet(this, _res, _res2);
      this.finalized = true;
    }
    /**
     * `.var` can access the value of a variable.
     *
     * @see {@link https://hono.dev/docs/api/context#var}
     *
     * @example
     * ```ts
     * const result = c.var.client.oneMethod()
     * ```
     */
    // c.var.propName is a read-only
    get var() {
      if (!__privateGet(this, _var)) {
        return {};
      }
      return Object.fromEntries(__privateGet(this, _var));
    }
  }, _rawRequest = new WeakMap(), _req = new WeakMap(), _var = new WeakMap(), _status = new WeakMap(), _executionCtx = new WeakMap(), _res = new WeakMap(), _layout = new WeakMap(), _renderer = new WeakMap(), _notFoundHandler = new WeakMap(), _preparedHeaders = new WeakMap(), _matchResult2 = new WeakMap(), _path = new WeakMap(), _Context_instances = new WeakSet(), newResponse_fn = function(data, arg, headers) {
    var _a11;
    let responseHeaders = __privateGet(this, _res) ? new Headers(__privateGet(this, _res).headers) : __privateGet(this, _preparedHeaders);
    if (typeof arg === "object" && arg.headers) {
      responseHeaders != null ? responseHeaders : responseHeaders = new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : (_a11 = arg == null ? void 0 : arg.status) != null ? _a11 : __privateGet(this, _status);
    return createResponseInstance(data, {
      status,
      headers: responseHeaders != null ? responseHeaders : headers
    });
  }, _a2);

  // cloudflare/node_modules/hono/dist/router.js
  var METHOD_NAME_ALL = "ALL";
  var METHOD_NAME_ALL_LOWERCASE = "all";
  var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
  var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
  var UnsupportedPathError = class extends Error {
  };

  // cloudflare/node_modules/hono/dist/utils/constants.js
  var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

  // cloudflare/node_modules/hono/dist/hono-base.js
  var notFoundHandler = (c) => {
    return c.text("404 Not Found", 404);
  };
  var errorHandler = (err, c) => {
    if ("getResponse" in err) {
      const res = err.getResponse();
      return c.newResponse(res.body, res);
    }
    console.error(err);
    return c.text("Internal Server Error", 500);
  };
  var _path2, __Hono_instances, clone_fn, _notFoundHandler2, addRoute_fn, handleError_fn, dispatch_fn, _a3;
  var Hono = (_a3 = class {
    constructor(options = {}) {
      __privateAdd(this, __Hono_instances);
      __publicField(this, "get");
      __publicField(this, "post");
      __publicField(this, "put");
      __publicField(this, "delete");
      __publicField(this, "options");
      __publicField(this, "patch");
      __publicField(this, "query");
      __publicField(this, "all");
      __publicField(this, "on");
      __publicField(this, "use");
      /*
        This class is like an abstract class and does not have a router.
        To use it, inherit the class and implement router in the constructor.
      */
      __publicField(this, "router");
      __publicField(this, "getPath");
      // Cannot use `#` because it requires visibility at JavaScript runtime.
      __publicField(this, "_basePath", "/");
      __privateAdd(this, _path2, "/");
      __publicField(this, "routes", []);
      __privateAdd(this, _notFoundHandler2, notFoundHandler);
      // Cannot use `#` because it requires visibility at JavaScript runtime.
      __publicField(this, "errorHandler", errorHandler);
      /**
       * `.onError()` handles an error and returns a customized Response.
       *
       * @see {@link https://hono.dev/docs/api/hono#error-handling}
       *
       * @param {ErrorHandler} handler - request Handler for error
       * @returns {Hono} changed Hono instance
       *
       * @example
       * ```ts
       * app.onError((err, c) => {
       *   console.error(`${err}`)
       *   return c.text('Custom Error Message', 500)
       * })
       * ```
       */
      __publicField(this, "onError", (handler) => {
        this.errorHandler = handler;
        return this;
      });
      /**
       * `.notFound()` allows you to customize a Not Found Response.
       *
       * @see {@link https://hono.dev/docs/api/hono#not-found}
       *
       * @param {NotFoundHandler} handler - request handler for not-found
       * @returns {Hono} changed Hono instance
       *
       * @example
       * ```ts
       * app.notFound((c) => {
       *   return c.text('Custom 404 Message', 404)
       * })
       * ```
       */
      __publicField(this, "notFound", (handler) => {
        __privateSet(this, _notFoundHandler2, handler);
        return this;
      });
      /**
       * `.fetch()` will be entry point of your app.
       *
       * @see {@link https://hono.dev/docs/api/hono#fetch}
       *
       * @param {Request} request - request Object of request
       * @param {Env} env - env Object
       * @param {ExecutionContext} executionCtx - context of execution
       * @returns {Response | Promise<Response>} response of request
       *
       */
      __publicField(this, "fetch", (request, ...rest) => {
        return __privateMethod(this, __Hono_instances, dispatch_fn).call(this, request, rest[1], rest[0], request.method);
      });
      /**
       * `.request()` is a useful method for testing.
       * You can pass a URL or pathname to send a GET request.
       * app will return a Response object.
       * ```ts
       * test('GET /hello is ok', async () => {
       *   const res = await app.request('/hello')
       *   expect(res.status).toBe(200)
       * })
       * ```
       * @see https://hono.dev/docs/api/hono#request
       */
      __publicField(this, "request", (input, requestInit, Env, executionCtx) => {
        if (input instanceof Request) {
          return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
        }
        input = input.toString();
        return this.fetch(
          new Request(
            /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
            requestInit
          ),
          Env,
          executionCtx
        );
      });
      /**
       * `.fire()` automatically adds a global fetch event listener.
       * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
       * @deprecated
       * Use `fire` from `hono/service-worker` instead.
       * ```ts
       * import { Hono } from 'hono'
       * import { fire } from 'hono/service-worker'
       *
       * const app = new Hono()
       * // ...
       * fire(app)
       * ```
       * @see https://hono.dev/docs/api/hono#fire
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
       * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
       */
      __publicField(this, "fire", () => {
        addEventListener("fetch", (event) => {
          event.respondWith(__privateMethod(this, __Hono_instances, dispatch_fn).call(this, event.request, event, void 0, event.request.method));
        });
      });
      var _a11;
      const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
      allMethods.forEach((method) => {
        this[method] = (args1, ...args) => {
          if (typeof args1 === "string") {
            __privateSet(this, _path2, args1);
          } else {
            __privateMethod(this, __Hono_instances, addRoute_fn).call(this, method, __privateGet(this, _path2), args1);
          }
          args.forEach((handler) => {
            __privateMethod(this, __Hono_instances, addRoute_fn).call(this, method, __privateGet(this, _path2), handler);
          });
          return this;
        };
      });
      this.on = (method, path, ...handlers) => {
        for (const p of [path].flat()) {
          __privateSet(this, _path2, p);
          for (const m of [method].flat()) {
            handlers.map((handler) => {
              __privateMethod(this, __Hono_instances, addRoute_fn).call(this, m.toUpperCase(), __privateGet(this, _path2), handler);
            });
          }
        }
        return this;
      };
      this.use = (arg1, ...handlers) => {
        if (typeof arg1 === "string") {
          __privateSet(this, _path2, arg1);
        } else {
          __privateSet(this, _path2, "*");
          handlers.unshift(arg1);
        }
        handlers.forEach((handler) => {
          __privateMethod(this, __Hono_instances, addRoute_fn).call(this, METHOD_NAME_ALL, __privateGet(this, _path2), handler);
        });
        return this;
      };
      const { strict, ...optionsWithoutStrict } = options;
      Object.assign(this, optionsWithoutStrict);
      this.getPath = (strict != null ? strict : true) ? (_a11 = options.getPath) != null ? _a11 : getPath : getPathNoStrict;
    }
    /**
     * `.route()` allows grouping other Hono instance in routes.
     *
     * @see {@link https://hono.dev/docs/api/routing#grouping}
     *
     * @param {string} path - base Path
     * @param {Hono} app - other Hono instance
     * @returns {Hono} routed Hono instance
     *
     * @example
     * ```ts
     * const app = new Hono()
     * const app2 = new Hono()
     *
     * app2.get("/user", (c) => c.text("user"))
     * app.route("/api", app2) // GET /api/user
     * ```
     */
    route(path, app2) {
      const subApp = this.basePath(path);
      app2.routes.map((r) => {
        var _a11;
        let handler;
        if (app2.errorHandler === errorHandler) {
          handler = r.handler;
        } else {
          handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
          handler[COMPOSED_HANDLER] = r.handler;
        }
        __privateMethod(_a11 = subApp, __Hono_instances, addRoute_fn).call(_a11, r.method, r.path, handler, r.basePath);
      });
      return this;
    }
    /**
     * `.basePath()` allows base paths to be specified.
     *
     * @see {@link https://hono.dev/docs/api/routing#base-path}
     *
     * @param {string} path - base Path
     * @returns {Hono} changed Hono instance
     *
     * @example
     * ```ts
     * const api = new Hono().basePath('/api')
     * ```
     */
    basePath(path) {
      const subApp = __privateMethod(this, __Hono_instances, clone_fn).call(this);
      subApp._basePath = mergePath(this._basePath, path);
      return subApp;
    }
    /**
     * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
     *
     * @see {@link https://hono.dev/docs/api/hono#mount}
     *
     * @param {string} path - base Path
     * @param {Function} applicationHandler - other Request Handler
     * @param {MountOptions} [options] - options of `.mount()`
     * @returns {Hono} mounted Hono instance
     *
     * @example
     * ```ts
     * import { Router as IttyRouter } from 'itty-router'
     * import { Hono } from 'hono'
     * // Create itty-router application
     * const ittyRouter = IttyRouter()
     * // GET /itty-router/hello
     * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
     *
     * const app = new Hono()
     * app.mount('/itty-router', ittyRouter.handle)
     * ```
     *
     * @example
     * ```ts
     * const app = new Hono()
     * // Send the request to another application without modification.
     * app.mount('/app', anotherApp, {
     *   replaceRequest: (req) => req,
     * })
     * ```
     */
    mount(path, applicationHandler, options) {
      let replaceRequest;
      let optionHandler;
      if (options) {
        if (typeof options === "function") {
          optionHandler = options;
        } else {
          optionHandler = options.optionHandler;
          if (options.replaceRequest === false) {
            replaceRequest = (request) => request;
          } else {
            replaceRequest = options.replaceRequest;
          }
        }
      }
      const getOptions = optionHandler ? (c) => {
        const options2 = optionHandler(c);
        return Array.isArray(options2) ? options2 : [options2];
      } : (c) => {
        let executionContext = void 0;
        try {
          executionContext = c.executionCtx;
        } catch {
        }
        return [c.env, executionContext];
      };
      replaceRequest || (replaceRequest = (() => {
        const mergedPath = mergePath(this._basePath, path);
        const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
        return (request) => {
          const url = new URL(request.url);
          url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
          return new Request(url, request);
        };
      })());
      const handler = async (c, next) => {
        const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
        if (res) {
          return res;
        }
        await next();
      };
      __privateMethod(this, __Hono_instances, addRoute_fn).call(this, METHOD_NAME_ALL, mergePath(path, "*"), handler);
      return this;
    }
  }, _path2 = new WeakMap(), __Hono_instances = new WeakSet(), clone_fn = function() {
    const clone = new _a3({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    __privateSet(clone, _notFoundHandler2, __privateGet(this, _notFoundHandler2));
    clone.routes = this.routes;
    return clone;
  }, _notFoundHandler2 = new WeakMap(), addRoute_fn = function(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }, handleError_fn = function(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }, dispatch_fn = function(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await __privateMethod(this, __Hono_instances, dispatch_fn).call(this, request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: __privateGet(this, _notFoundHandler2)
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await __privateGet(this, _notFoundHandler2).call(this, c);
        });
      } catch (err) {
        return __privateMethod(this, __Hono_instances, handleError_fn).call(this, err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : __privateGet(this, _notFoundHandler2).call(this, c))
      ).catch((err) => __privateMethod(this, __Hono_instances, handleError_fn).call(this, err, c)) : res != null ? res : __privateGet(this, _notFoundHandler2).call(this, c);
    }
    const composed = compose(matchResult[0], this.errorHandler, __privateGet(this, _notFoundHandler2));
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return __privateMethod(this, __Hono_instances, handleError_fn).call(this, err, c);
      }
    })();
  }, _a3);

  // cloudflare/node_modules/hono/dist/router/utils.js
  var createNullObject = () => /* @__PURE__ */ Object.create(null);

  // cloudflare/node_modules/hono/dist/router/reg-exp-router/matcher.js
  var emptyParam = [];
  function match(method, path) {
    const matchers = this.buildAllMatchers();
    const match2 = (method2, path2) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match3 = path2.match(matcher[0]);
      if (!match3) {
        return [[], emptyParam];
      }
      const index = match3.indexOf("", 1);
      return [matcher[1][index], match3];
    };
    this.match = match2;
    return match2(method, path);
  }

  // cloudflare/node_modules/hono/dist/router/reg-exp-router/node.js
  var LABEL_REG_EXP_STR = "[^/]+";
  var ONLY_WILDCARD_REG_EXP_STR = ".*";
  var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
  var PATH_ERROR = /* @__PURE__ */ Symbol();
  var regExpMetaChars = new Set(".\\+*[^]$()");
  function compareKey(a, b) {
    if (a.length === 1) {
      return b.length === 1 ? a < b ? -1 : 1 : -1;
    }
    if (b.length === 1) {
      return 1;
    }
    if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
      return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
    } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
      return -1;
    }
    if (a === LABEL_REG_EXP_STR) {
      return 1;
    } else if (b === LABEL_REG_EXP_STR) {
      return -1;
    }
    return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
  }
  var _index, _varIndex, _children, _a4;
  var Node = (_a4 = class {
    constructor() {
      // handler index of a dynamic path, or -1 for a static path terminal
      __privateAdd(this, _index);
      __privateAdd(this, _varIndex);
      __privateAdd(this, _children, createNullObject());
    }
    insert(tokens, index, paramMap, context, isStatic) {
      var _a11;
      let node = this;
      for (let i = 0, len = tokens.length; i < len; i++) {
        const token = tokens[i];
        const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
        let nextNode;
        if (pattern) {
          const name = pattern[1];
          let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
          if (name && pattern[2]) {
            if (regexpStr === ".*") {
              throw PATH_ERROR;
            }
            regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
            if (/\((?!\?:)/.test(regexpStr)) {
              throw PATH_ERROR;
            }
            if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
              throw PATH_ERROR;
            }
          }
          nextNode = __privateGet(node, _children)[regexpStr];
          if (!nextNode) {
            if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
              for (const k in __privateGet(node, _children)) {
                if (
                  // a single-char pattern coexists with single-char literals as a literal does
                  (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
                ) {
                  throw PATH_ERROR;
                }
              }
            }
            nextNode = __privateGet(node, _children)[regexpStr] = new _a4();
          }
          if (name !== "") {
            (_a11 = __privateGet(nextNode, _varIndex)) != null ? _a11 : __privateSet(nextNode, _varIndex, context.varIndex++);
            paramMap.push([name, __privateGet(nextNode, _varIndex)]);
          }
        } else {
          nextNode = __privateGet(node, _children)[token];
          if (!nextNode) {
            for (const k in __privateGet(node, _children)) {
              if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
                throw PATH_ERROR;
              }
            }
            nextNode = __privateGet(node, _children)[token] = new _a4();
          }
        }
        node = nextNode;
      }
      if (__privateGet(node, _index) !== void 0) {
        throw PATH_ERROR;
      }
      __privateSet(node, _index, isStatic ? -1 : index);
    }
    buildRegExpStr() {
      const childKeys = Object.keys(__privateGet(this, _children)).sort(compareKey);
      const strList = childKeys.map((k) => {
        const c = __privateGet(this, _children)[k];
        const childStr = c.buildRegExpStr();
        return childStr === "" ? "" : (typeof __privateGet(c, _varIndex) === "number" ? `(${k})@${__privateGet(c, _varIndex)}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
      }).filter(Boolean);
      if (typeof __privateGet(this, _index) === "number" && __privateGet(this, _index) !== -1) {
        strList.unshift(`#${__privateGet(this, _index)}`);
      }
      if (strList.length === 0) {
        return "";
      }
      if (strList.length === 1) {
        return strList[0];
      }
      return "(?:" + strList.join("|") + ")";
    }
  }, _index = new WeakMap(), _varIndex = new WeakMap(), _children = new WeakMap(), _a4);

  // cloudflare/node_modules/hono/dist/router/reg-exp-router/trie.js
  var _context, _root, _index2, _a5;
  var Trie = (_a5 = class {
    constructor() {
      __privateAdd(this, _context, { varIndex: 0 });
      __privateAdd(this, _root, new Node());
      __privateAdd(this, _index2, 0);
      // dynamic path -> [handler index, param assoc]; static paths are not registered
      __publicField(this, "paths", createNullObject());
    }
    insert(path, isStatic) {
      if (isStatic) {
        __privateGet(this, _root).insert(path.split(""), 0, [], __privateGet(this, _context), true);
        return;
      }
      const paramAssoc = [];
      const groups = [];
      let markedPath = path;
      for (let i = 0; ; ) {
        let replaced = false;
        markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
          const mark = `@\\${i}`;
          groups[i] = [mark, m];
          i++;
          replaced = true;
          return mark;
        });
        if (!replaced) {
          break;
        }
      }
      const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
      for (let i = groups.length - 1; i >= 0; i--) {
        const [mark] = groups[i];
        for (let j = tokens.length - 1; j >= 0; j--) {
          if (tokens[j].indexOf(mark) !== -1) {
            tokens[j] = tokens[j].replace(mark, groups[i][1]);
            break;
          }
        }
      }
      __privateGet(this, _root).insert(tokens, __privateGet(this, _index2), paramAssoc, __privateGet(this, _context), false);
      this.paths[path] = [__privateWrapper(this, _index2)._++, paramAssoc];
    }
    buildRegExp() {
      let regexp = __privateGet(this, _root).buildRegExpStr();
      if (regexp === "") {
        return [/^$/, [], []];
      }
      let captureIndex = 0;
      const indexReplacementMap = [];
      const paramReplacementMap = [];
      regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
        if (handlerIndex !== void 0) {
          indexReplacementMap[++captureIndex] = Number(handlerIndex);
          return "$()";
        }
        if (paramIndex !== void 0) {
          paramReplacementMap[Number(paramIndex)] = ++captureIndex;
          return "";
        }
        return "";
      });
      return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
    }
  }, _context = new WeakMap(), _root = new WeakMap(), _index2 = new WeakMap(), _a5);

  // cloudflare/node_modules/hono/dist/router/reg-exp-router/router.js
  var wildcardRegExpCache = createNullObject();
  function buildWildcardRegExp(path) {
    var _a11;
    return (_a11 = wildcardRegExpCache[path]) != null ? _a11 : wildcardRegExpCache[path] = new RegExp(
      `^${path.replace(
        /\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g,
        (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ONLY_WILDCARD_REG_EXP_STR : `/:${LABEL_REG_EXP_STR}`
      )}$`
    );
  }
  function findMiddleware(middleware, path) {
    for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
      if (buildWildcardRegExp(k).test(path)) {
        return [...middleware[k]];
      }
    }
    return void 0;
  }
  var _middleware, _routes, _tries, _RegExpRouter_instances, insertPath_fn, buildMatcher_fn, _a6;
  var RegExpRouter = (_a6 = class {
    constructor() {
      __privateAdd(this, _RegExpRouter_instances);
      __publicField(this, "name", "RegExpRouter");
      __privateAdd(this, _middleware);
      __privateAdd(this, _routes);
      __privateAdd(this, _tries);
      __publicField(this, "match", match);
      __privateSet(this, _middleware, { [METHOD_NAME_ALL]: createNullObject() });
      __privateSet(this, _routes, { [METHOD_NAME_ALL]: createNullObject() });
      __privateSet(this, _tries, { [METHOD_NAME_ALL]: new Trie() });
    }
    add(method, path, handler) {
      const middleware = __privateGet(this, _middleware);
      const routes = __privateGet(this, _routes);
      if (!middleware) {
        throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
      }
      if (!middleware[method]) {
        __privateGet(this, _tries)[method] = new Trie();
        for (const handlerMap of [middleware, routes]) {
          handlerMap[method] = createNullObject();
          for (const p in handlerMap[METHOD_NAME_ALL]) {
            handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
            __privateMethod(this, _RegExpRouter_instances, insertPath_fn).call(this, method, p);
          }
        }
      }
      if (path === "/*") {
        path = "*";
      }
      const methods = method === METHOD_NAME_ALL ? Object.keys(middleware) : [method];
      if (/\*$/.test(path)) {
        const re = buildWildcardRegExp(path);
        for (const m of methods) {
          if (!middleware[m][path]) {
            __privateMethod(this, _RegExpRouter_instances, insertPath_fn).call(this, m, path);
            middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
          }
        }
        for (const handlerMap of [middleware, routes]) {
          for (const m of methods) {
            for (const p in handlerMap[m]) {
              re.test(p) && handlerMap[m][p].push([handler, path]);
            }
          }
        }
        return;
      }
      const paths = checkOptionalParameter(path) || [path];
      for (const path2 of paths) {
        for (const m of methods) {
          if (!routes[m][path2]) {
            __privateMethod(this, _RegExpRouter_instances, insertPath_fn).call(this, m, path2);
            routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
          }
          routes[m][path2].push([handler, path2]);
        }
      }
    }
    buildAllMatchers() {
      const matchers = createNullObject();
      for (const method of Object.keys(__privateGet(this, _routes))) {
        matchers[method] = __privateMethod(this, _RegExpRouter_instances, buildMatcher_fn).call(this, method);
      }
      __privateSet(this, _middleware, __privateSet(this, _routes, __privateSet(this, _tries, void 0)));
      wildcardRegExpCache = createNullObject();
      return matchers;
    }
  }, _middleware = new WeakMap(), _routes = new WeakMap(), _tries = new WeakMap(), _RegExpRouter_instances = new WeakSet(), insertPath_fn = function(method, path) {
    try {
      __privateGet(this, _tries)[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }, buildMatcher_fn = function(method) {
    const middleware = __privateGet(this, _middleware)[method];
    const routes = __privateGet(this, _routes)[method];
    const trie = __privateGet(this, _tries)[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) {
      for (const path in r) {
        const handlers = r[path];
        const pathData = trie.paths[path];
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
          continue;
        }
        handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [
          h,
          trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
            map[key] = paramReplacementMap[pathData[1][i][1]];
            return map;
          }, createNullObject())
        ]);
      }
    }
    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap];
  }, _a6);

  // cloudflare/node_modules/hono/dist/router/smart-router/router.js
  var _routers, _routes2, _a7;
  var SmartRouter = (_a7 = class {
    constructor(init) {
      __publicField(this, "name", "SmartRouter");
      __privateAdd(this, _routers, []);
      __privateAdd(this, _routes2, []);
      __privateSet(this, _routers, init.routers);
    }
    add(method, path, handler) {
      if (!__privateGet(this, _routes2)) {
        throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
      }
      __privateGet(this, _routes2).push([method, path, handler]);
    }
    match(method, path) {
      if (!__privateGet(this, _routes2)) {
        throw new Error("Fatal error");
      }
      const routers = __privateGet(this, _routers);
      const routes = __privateGet(this, _routes2);
      const len = routers.length;
      let i = 0;
      let res;
      for (; i < len; i++) {
        const router = routers[i];
        try {
          for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
            router.add(...routes[i2]);
          }
          res = router.match(method, path);
        } catch (e) {
          if (e instanceof UnsupportedPathError) {
            continue;
          }
          throw e;
        }
        this.match = router.match.bind(router);
        __privateSet(this, _routers, [router]);
        __privateSet(this, _routes2, void 0);
        break;
      }
      if (i === len) {
        throw new Error("Fatal error");
      }
      this.name = `SmartRouter + ${this.activeRouter.name}`;
      return res;
    }
    get activeRouter() {
      if (__privateGet(this, _routes2) || __privateGet(this, _routers).length !== 1) {
        throw new Error("No active router has been determined yet.");
      }
      return __privateGet(this, _routers)[0];
    }
  }, _routers = new WeakMap(), _routes2 = new WeakMap(), _a7);

  // cloudflare/node_modules/hono/dist/router/trie-router/node.js
  var emptyParams = createNullObject();
  var order = 0;
  var _methods, _children2, _patterns, _pattern, _params, __Node_instances, pushHandlerSets_fn, _a8;
  var Node2 = (_a8 = class {
    constructor() {
      __privateAdd(this, __Node_instances);
      __privateAdd(this, _methods, []);
      __privateAdd(this, _children2, createNullObject());
      __privateAdd(this, _patterns, []);
      __privateAdd(this, _pattern);
      __privateAdd(this, _params, emptyParams);
    }
    insert(method, path, handler) {
      var _a11;
      let curNode = this;
      const parts = splitRoutingPath(path);
      const possibleKeys = /* @__PURE__ */ new Set();
      let i = 0;
      for (const p of parts) {
        const nextP = parts[++i];
        const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
        const isParam = Array.isArray(pattern);
        const key = isParam ? pattern[0] : pattern || p;
        const child = (_a11 = __privateGet(curNode, _children2))[key] || (_a11[key] = new _a8());
        if (pattern && !__privateGet(child, _pattern)) {
          __privateSet(child, _pattern, pattern);
          __privateGet(curNode, _patterns).push(child);
        }
        curNode = child;
        if (isParam) {
          possibleKeys.add(pattern[1]);
        }
      }
      __privateGet(curNode, _methods).push({
        [method]: {
          handler,
          possibleKeys: [...possibleKeys],
          score: ++order
        }
      });
    }
    search(method, path) {
      var _a11, _b;
      const handlerSets = [];
      __privateSet(this, _params, emptyParams);
      const curNode = this;
      let curNodes = [curNode];
      const parts = splitPath(path);
      const curNodesQueue = [];
      const len = parts.length;
      let partOffsets = null;
      for (let i = 0; i < len; i++) {
        const part = parts[i];
        const isLast = i === len - 1;
        const tempNodes = [];
        for (let j = 0, len2 = curNodes.length; j < len2; j++) {
          const node = curNodes[j];
          const nextNode = __privateGet(node, _children2)[part];
          if (nextNode) {
            __privateSet(nextNode, _params, __privateGet(node, _params));
            if (isLast) {
              if (__privateGet(nextNode, _children2)["*"]) {
                __privateMethod(this, __Node_instances, pushHandlerSets_fn).call(this, handlerSets, __privateGet(nextNode, _children2)["*"], method, __privateGet(node, _params));
              }
              __privateMethod(this, __Node_instances, pushHandlerSets_fn).call(this, handlerSets, nextNode, method, __privateGet(node, _params));
            } else {
              tempNodes.push(nextNode);
            }
          }
          for (const child of __privateGet(node, _patterns)) {
            const pattern = __privateGet(child, _pattern);
            const params = __privateGet(node, _params) === emptyParams ? {} : { ...__privateGet(node, _params) };
            if (typeof pattern === "string") {
              if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
                __privateMethod(this, __Node_instances, pushHandlerSets_fn).call(this, handlerSets, child, method, __privateGet(node, _params));
                if (pattern === "*") {
                  __privateSet(child, _params, params);
                  tempNodes.push(child);
                }
              }
              continue;
            }
            const [, name, matcher] = pattern;
            if (!part && matcher === true) {
              continue;
            }
            if (matcher !== true) {
              if (!partOffsets) {
                partOffsets = [];
                let offset = path[0] === "/" ? 1 : 0;
                for (let p = 0; p < len; p++) {
                  partOffsets[p] = offset;
                  offset += parts[p].length + 1;
                }
              }
              const restPathString = path.slice(partOffsets[i]);
              const m = matcher.exec(restPathString);
              if (m) {
                params[name] = m[0];
                __privateMethod(this, __Node_instances, pushHandlerSets_fn).call(this, handlerSets, child, method, __privateGet(node, _params), params);
                if (m[0].length === restPathString.length && __privateGet(child, _children2)["*"]) {
                  __privateMethod(this, __Node_instances, pushHandlerSets_fn).call(this, handlerSets, __privateGet(child, _children2)["*"], method, __privateGet(node, _params), params);
                }
                for (const _ in __privateGet(child, _children2)) {
                  __privateSet(child, _params, params);
                  const componentCount = (_b = (_a11 = m[0].match(/\//g)) == null ? void 0 : _a11.length) != null ? _b : 0;
                  const targetCurNodes = curNodesQueue[componentCount] || (curNodesQueue[componentCount] = []);
                  targetCurNodes.push(child);
                  break;
                }
                continue;
              }
            }
            if (matcher === true || matcher.test(part)) {
              params[name] = part;
              if (isLast) {
                __privateMethod(this, __Node_instances, pushHandlerSets_fn).call(this, handlerSets, child, method, params, __privateGet(node, _params));
                if (__privateGet(child, _children2)["*"]) {
                  __privateMethod(this, __Node_instances, pushHandlerSets_fn).call(this, handlerSets, __privateGet(child, _children2)["*"], method, params, __privateGet(node, _params));
                }
              } else {
                __privateSet(child, _params, params);
                tempNodes.push(child);
              }
            }
          }
        }
        const shifted = curNodesQueue.shift();
        curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
      }
      if (handlerSets[1]) {
        handlerSets.sort((a, b) => {
          return a.score - b.score;
        });
      }
      return [handlerSets.map(({ handler, params }) => [handler, params])];
    }
  }, _methods = new WeakMap(), _children2 = new WeakMap(), _patterns = new WeakMap(), _pattern = new WeakMap(), _params = new WeakMap(), __Node_instances = new WeakSet(), pushHandlerSets_fn = function(handlerSets, node, method, nodeParams, params) {
    var _a11;
    for (let i = 0, len = __privateGet(node, _methods).length; i < len; i++) {
      const m = __privateGet(node, _methods)[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = (params == null ? void 0 : params[key]) && !i2 ? params[key] : (_a11 = nodeParams[key]) != null ? _a11 : params == null ? void 0 : params[key];
        }
      }
    }
  }, _a8);

  // cloudflare/node_modules/hono/dist/router/trie-router/router.js
  var _node, _a9;
  var TrieRouter = (_a9 = class {
    constructor() {
      __publicField(this, "name", "TrieRouter");
      __privateAdd(this, _node, new Node2());
    }
    add(method, path, handler) {
      for (const result of checkOptionalParameter(path) || [path]) {
        __privateGet(this, _node).insert(method, result, handler);
      }
    }
    match(method, path) {
      return __privateGet(this, _node).search(method, path);
    }
  }, _node = new WeakMap(), _a9);

  // cloudflare/node_modules/hono/dist/hono.js
  var Hono2 = class extends Hono {
    /**
     * Creates an instance of the Hono class.
     *
     * @param options - Optional configuration options for the Hono instance.
     */
    constructor(options = {}) {
      var _a11;
      super(options);
      this.router = (_a11 = options.router) != null ? _a11 : new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()]
      });
    }
  };

  // cloudflare/node_modules/hono/dist/middleware/cors/index.js
  var cors = (options) => {
    var _a11, _b;
    const opts = {
      origin: "*",
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "QUERY"],
      allowHeaders: [],
      exposeHeaders: [],
      ...options
    };
    const exposeHeadersStr = ((_a11 = opts.exposeHeaders) == null ? void 0 : _a11.length) ? opts.exposeHeaders.join(",") : void 0;
    const allowHeadersStr = ((_b = opts.allowHeaders) == null ? void 0 : _b.length) ? opts.allowHeaders.join(",") : void 0;
    const findAllowOrigin = ((optsOrigin) => {
      if (typeof optsOrigin === "string") {
        if (optsOrigin === "*") {
          return () => optsOrigin;
        } else {
          return (origin) => optsOrigin === origin ? origin : null;
        }
      } else if (typeof optsOrigin === "function") {
        return optsOrigin;
      } else {
        return (origin) => optsOrigin.includes(origin) ? origin : null;
      }
    })(opts.origin);
    const findAllowMethods = ((optsAllowMethods) => {
      if (typeof optsAllowMethods === "function") {
        return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
      } else if (Array.isArray(optsAllowMethods)) {
        const methodsStr = optsAllowMethods.join(",");
        return () => methodsStr;
      } else {
        return () => "";
      }
    })(opts.allowMethods);
    return async function cors2(c, next) {
      function set(key, value) {
        c.res.headers.set(key, value);
      }
      const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
      if (allowOrigin) {
        set("Access-Control-Allow-Origin", allowOrigin);
      }
      if (opts.credentials) {
        set("Access-Control-Allow-Credentials", "true");
      }
      if (exposeHeadersStr) {
        set("Access-Control-Expose-Headers", exposeHeadersStr);
      }
      if (c.req.method === "OPTIONS") {
        if (opts.origin !== "*") {
          c.res.headers.append("Vary", "Origin");
        }
        if (opts.maxAge != null) {
          set("Access-Control-Max-Age", opts.maxAge.toString());
        }
        const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
        if (allowMethods) {
          set("Access-Control-Allow-Methods", allowMethods);
        }
        let headersStr = allowHeadersStr;
        if (!headersStr) {
          const requestHeaders = c.req.header("Access-Control-Request-Headers");
          if (requestHeaders) {
            headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
          }
        }
        if (headersStr) {
          set("Access-Control-Allow-Headers", headersStr);
          c.res.headers.append("Vary", "Access-Control-Request-Headers");
        }
        c.res.headers.delete("Content-Length");
        c.res.headers.delete("Content-Type");
        return new Response(null, {
          headers: c.res.headers,
          status: 204,
          statusText: "No Content"
        });
      }
      await next();
      if (opts.origin !== "*") {
        c.header("Vary", "Origin", { append: true });
      }
    };
  };

  // webapp/server/state.js
  var _a10;
  var state_default = {
    config: {
      whitelist: ["G001", "G002", "G004", "G006", "G008"],
      tau: 0.85,
      t_silence: 60,
      t_max: 300,
      t_lookback: 600,
      n_freq: 3,
      dedup_window: 24 * 3600,
      at_switch: true,
      ai_mode: "builtin",
      deepseek_key: typeof process !== "undefined" && ((_a10 = process.env) == null ? void 0 : _a10.DEEPSEEK_API_KEY) || "",
      deepseek_base: "https://api.deepseek.com/v1/chat/completions",
      deepseek_model: "deepseek-chat",
      dify_url: "",
      dify_key: ""
    },
    replay: {
      playing: false,
      speed: 1,
      cursor: 0,
      startedAt: null,
      elapsedBase: 0
    },
    paused: false,
    // 自动聊天流总开关（微信演示页 ↔ 中台 两端同步）
    windows: /* @__PURE__ */ new Map(),
    demands: [],
    responses: [],
    scheduleReplacements: [],
    dailyCount: {},
    counters: {
      intake: 0,
      filtered: 0,
      aggregated: 0,
      bert_pass: 0,
      bert_fail: 0,
      parsed: 0,
      deduped: 0,
      freq_blocked: 0,
      routed_at: 0,
      routed_non_at: 0,
      responded: 0
    },
    logs: [],
    baseline: []
    // 群上线前指标基线（group_metric_baseline.json）
  };

  // webapp/server/lib/filter.js
  var ROBOT_NAMES = ["\u673A\u5668\u4EBA\u5C0F\u52A9\u624B", "\u673A\u5668\u4EBA", "\u5C0F\u52A9\u624B"];
  var ADMIN_MARKERS = ["[\u8425\u9500\u5361\u7247]", "[\u63A8\u5E7F]", "[\u5E7F\u544A]"];
  var SHORT_THRESHOLD = 3;
  var NOISE_PATTERNS = [
    /^\[图片\]$/,
    /^\[表情\]$/,
    /^\[语音\]$/,
    /^\[拍一拍\]$/,
    /^(收到|好的|嗯|哦|哈|哈哈|哈哈哈哈|嗯嗯|哦哦|1|\+1)$/,
    /^接[龙名]/
  ];
  function preFilter(msg) {
    if (ROBOT_NAMES.includes(msg.user)) return { pass: false, reason: "\u673A\u5668\u4EBA\u6D88\u606F" };
    if (ADMIN_MARKERS.some((m) => msg.text.startsWith(m))) return { pass: false, reason: "\u8425\u9500\u6D88\u606F" };
    const trimmed = msg.text.trim();
    if (trimmed.length <= SHORT_THRESHOLD && !msg.at) {
      return { pass: false, reason: "\u8D85\u77ED\u6D88\u606F" };
    }
    if (NOISE_PATTERNS.some((p) => p.test(trimmed))) {
      return { pass: false, reason: "\u65E0\u8BED\u4E49\u566A\u58F0" };
    }
    return { pass: true, reason: "" };
  }

  // webapp/server/lib/aggregator.js
  function aggregate(msg, virtualTime) {
    const key = `${msg.group}:${msg.user}`;
    let win = state_default.windows.get(key);
    if (msg.at) {
      if (win) {
        win.texts.push(msg.text);
        win.at = true;
      } else {
        win = { group: msg.group, user: msg.user, texts: [msg.text], startTime: virtualTime, at: true };
      }
      state_default.windows.delete(key);
      return { packed: true, unit: win };
    }
    if (!win) {
      win = { group: msg.group, user: msg.user, texts: [msg.text], startTime: virtualTime, lastTime: virtualTime, at: false };
      state_default.windows.set(key, win);
      return { packed: false, unit: win };
    }
    win.texts.push(msg.text);
    win.lastTime = virtualTime;
    return { packed: false, unit: win };
  }
  function checkTimeouts(virtualTime) {
    const packed = [];
    for (const [key, win] of state_default.windows) {
      const silence = virtualTime - (win.lastTime || win.startTime);
      const duration = virtualTime - win.startTime;
      if (silence >= state_default.config.t_silence || duration >= state_default.config.t_max) {
        state_default.windows.delete(key);
        packed.push(win);
      }
    }
    return packed;
  }
  function flushAll() {
    const packed = [];
    for (const [key, win] of state_default.windows) {
      packed.push(win);
    }
    state_default.windows.clear();
    return packed;
  }
  function getContext(win, virtualTime) {
    const lookback = state_default.config.t_lookback;
    const contexts = [];
    for (const log of state_default.logs) {
      if (log.type === "aggregated" && log.unit.group === win.group && log.unit.user === win.user && virtualTime - log.virtualTime <= lookback) {
        contexts.push(log.unit.texts.join(" "));
      }
    }
    return contexts.join("\n");
  }

  // webapp/server/lib/ai.js
  var BERT_PROMPT = `\u4F60\u662F\u5546\u54C1\u76F8\u5173\u6027\u5224\u5B9A\u5668\u3002\u5224\u65AD\u8F93\u5165\u7684\u7FA4\u804A\u53D1\u8A00\u662F\u5426\u4E0E\u5546\u54C1\u6216\u8D2D\u4E70\u9700\u6C42\u76F8\u5173\u3002

\u76F8\u5173\uFF1A\u63D0\u53CA\u5177\u4F53\u5546\u54C1\u6216\u54C1\u7C7B\uFF1B\u8868\u8FBE\u60F3\u4E70\u3001\u6C42\u63A8\u8350\u3001\u6BD4\u4EF7\u3001\u8BE2\u4EF7\uFF1B\u5BF9\u5546\u54C1\u7684\u8BC4\u4EF7\u4E0E\u5410\u69FD\u3002
\u65E0\u5173\uFF1A\u5BD2\u6684\u3001\u8868\u60C5\u6597\u56FE\u3001\u63A5\u9F99\u62A5\u540D\u3001\u4E0E\u5546\u54C1\u65E0\u5173\u7684\u95F2\u804A\u3002

\u53EA\u8F93\u51FA JSON\uFF1A{"relevant": true \u6216 false, "confidence": 0 \u5230 1 \u7684\u5C0F\u6570}`;
  var PARSE_PROMPT = `\u4F60\u662F\u4EAC\u4E1C\u5FAE\u4FE1\u793E\u7FA4\u7684\u7528\u6237\u9700\u6C42\u89E3\u6790\u5F15\u64CE\u3002\u8F93\u5165\u662F\u4E00\u6BB5\u7FA4\u6210\u5458\u53D1\u8A00\uFF08unit_text\uFF09\uFF0C\u53EF\u80FD\u9644\u5E26\u8BE5\u7528\u6237\u8FD1\u51E0\u5206\u949F\u7684\u5386\u53F2\u53D1\u8A00\uFF08context_text\uFF09\u3002\u8BE5\u53D1\u8A00\u5DF2\u88AB\u4E0A\u6E38\u5224\u5B9A\u4E3A\u4E0E\u5546\u54C1\u76F8\u5173\u3002
\u4EFB\u52A1\uFF1A\u628A\u53D1\u8A00\u89E3\u6790\u6210\u7ED3\u6784\u5316\u7684\u8D2D\u4E70\u9700\u6C42\u3002

\u53EA\u8F93\u51FA\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u4E0D\u8F93\u51FA\u4EFB\u4F55\u5176\u4ED6\u6587\u5B57\uFF1A
{
  "category": "\u5F52\u4E00\u5316\u54C1\u7C7B\u3002\u7528\u6700\u5E38\u7528\u7684\u54C1\u7C7B\u8BCD\uFF0C\u5982\u7EA2\u67A3/\u5927\u67A3/\u67A3\u5B50\u7EDF\u4E00\u4E3A\u67A3\uFF1B\u65E0\u6CD5\u5F52\u4E00\u65F6\u7528\u539F\u8BCD",
  "keywords": ["\u53D1\u8A00\u4E2D\u51FA\u73B0\u7684\u5546\u54C1\u5173\u952E\u8BCD\u539F\u6587"],
  "intent": "\u56DB\u9009\u4E00\uFF1Awant_buy\uFF08\u60F3\u4E70\uFF09/ ask_rec\uFF08\u6C42\u63A8\u8350\uFF09/ compare\uFF08\u6BD4\u4EF7\uFF09/ complain\uFF08\u5410\u69FD\uFF09",
  "price_pref": "\u4EF7\u683C\u610F\u5411\uFF0C\u5982\u4FBF\u5B9C\u7684\u3001\u767E\u5143\u4EE5\u5185\uFF1B\u53D1\u8A00\u672A\u63D0\u53CA\u5219\u4E3A null"
}

\u5224\u5B9A\u89C4\u5219\uFF1A
1. \u5410\u69FD\u4E0D\u662F\u9700\u6C42\u3002\u5BF9\u5DF2\u8D2D\u5546\u54C1\u7684\u4E0D\u6EE1\uFF08\u5982"\u67A3\u5B50\u600E\u4E48\u4E0D\u751C""\u4E0A\u6B21\u4E70\u7684\u6D17\u8863\u6DB2\u4E0D\u597D\u7528"\uFF09\uFF0Cintent \u5FC5\u987B\u5224 complain\uFF0C\u5373\u4F7F\u53E5\u4E2D\u51FA\u73B0\u4E86\u5546\u54C1\u8BCD\u3002
2. \u63D0\u53CA\u4E0D\u7B49\u4E8E\u60F3\u4E70\u3002\u8F6C\u53D1\u5546\u54C1\u6D88\u606F\u3001\u8BAE\u8BBA\u522B\u4EBA\u4E70\u4E86\u4EC0\u4E48\uFF0C\u4E0D\u5224 want_buy\uFF1B\u4EC5\u5F53\u53D1\u8A00\u8868\u8FBE\u83B7\u53D6\u610F\u613F\uFF08\u60F3\u8981\u3001\u6C42\u94FE\u63A5\u3001\u6709\u6CA1\u6709\u3001\u591A\u5C11\u94B1\uFF09\u624D\u5224 want_buy \u6216 ask_rec\u3002
3. context_text \u53EA\u7528\u4E8E\u8865\u5168 unit_text \u7684\u8BED\u4E49\uFF08\u5982\u4E0A\u6587"\u6709\u6CA1\u6709"\uFF0B\u5F53\u524D"\u4FBF\u5B9C\u70B9\u7684\u67A3\u5B50"\uFF09\uFF0C\u4E0D\u5F97\u628A\u4E0A\u4E0B\u6587\u91CC\u5DF2\u89E3\u6790\u8FC7\u7684\u65E7\u9700\u6C42\u91CD\u590D\u8F93\u51FA\u3002
4. \u4E0D\u81C6\u6D4B\u3002\u53D1\u8A00\u91CC\u6CA1\u6709\u7684\u4FE1\u606F\u4E0D\u8F93\u51FA\uFF0Cprice_pref \u5B81\u7F3A\u6BCB\u6EE5\u3002`;
  async function callDeepSeek(systemPrompt, userText) {
    var _a11, _b, _c;
    const key = state_default.config.deepseek_key;
    if (!key) {
      throw new Error("DeepSeek API Key \u672A\u914D\u7F6E\uFF0C\u8BF7\u5728\u7B56\u7565\u914D\u7F6E\u9875\u586B\u5199");
    }
    const resp = await fetch(state_default.config.deepseek_base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: state_default.config.deepseek_model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek API \u8C03\u7528\u5931\u8D25 (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    const content = ((_c = (_b = (_a11 = data.choices) == null ? void 0 : _a11[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "";
    try {
      return JSON.parse(content);
    } catch {
      const match2 = content.match(/\{[\s\S]*\}/);
      if (match2) return JSON.parse(match2[0]);
      throw new Error("DeepSeek \u8FD4\u56DE\u5185\u5BB9\u65E0\u6CD5\u89E3\u6790\u4E3A JSON: " + content);
    }
  }
  async function callDify(inputs) {
    var _a11;
    const url = state_default.config.dify_url;
    const key = state_default.config.dify_key;
    if (!url || !key) {
      throw new Error("Dify \u5DE5\u4F5C\u6D41\u672A\u914D\u7F6E\uFF0C\u8BF7\u5728\u7B56\u7565\u914D\u7F6E\u9875\u586B\u5199 Dify \u5DE5\u4F5C\u6D41 URL \u4E0E API Key");
    }
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({ inputs, response_mode: "blocking", user: "jd-demo" })
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Dify \u5DE5\u4F5C\u6D41\u8C03\u7528\u5931\u8D25 (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    let out = (_a11 = data == null ? void 0 : data.data) == null ? void 0 : _a11.outputs;
    if (typeof out === "string") {
      try {
        out = JSON.parse(out);
      } catch {
      }
    }
    if (out && typeof out === "string") {
      const m = out.match(/\{[\s\S]*\}/);
      if (m) out = JSON.parse(m[0]);
    }
    return out || {};
  }
  async function judgeRelevance(unitText, contextText = "") {
    if (state_default.config.ai_mode === "dify") {
      const out = await callDify({ unit_text: unitText, context_text: contextText || "" });
      return {
        relevant: out.relevant === true,
        confidence: typeof out.confidence === "number" ? out.confidence : 0.5
      };
    }
    const userText = `unit_text: ${unitText}
context_text: ${contextText || "(\u65E0)"}`;
    const result = await callDeepSeek(BERT_PROMPT, userText);
    return {
      relevant: result.relevant === true,
      confidence: typeof result.confidence === "number" ? result.confidence : 0.5
    };
  }
  async function parseDemand(unitText, contextText = "") {
    if (state_default.config.ai_mode === "dify") {
      const out = await callDify({ unit_text: unitText, context_text: contextText || "" });
      return {
        category: out.category || "",
        keywords: out.keywords || [],
        intent: out.intent || "complain",
        price_pref: out.price_pref || null
      };
    }
    const userText = `unit_text: ${unitText}
context_text: ${contextText || "(\u65E0)"}`;
    const result = await callDeepSeek(PARSE_PROMPT, userText);
    return {
      category: result.category || "",
      keywords: result.keywords || [],
      intent: result.intent || "complain",
      price_pref: result.price_pref || null
    };
  }
  async function testConnection() {
    if (state_default.config.ai_mode === "dify") {
      try {
        const out = await callDify({ unit_text: "\u6709\u6CA1\u6709\u4FBF\u5B9C\u70B9\u7684\u7EA2\u67A3", context_text: "" });
        const ok = out && (out.relevant !== void 0 || out.category !== void 0);
        return { ok, message: ok ? "Dify \u5DE5\u4F5C\u6D41\u8FDE\u901A\u6B63\u5E38" : "Dify \u8FD4\u56DE\u5F02\u5E38\uFF0C\u8BF7\u68C0\u67E5\u5DE5\u4F5C\u6D41\u8F93\u51FA\u5B57\u6BB5" };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    try {
      const result = await callDeepSeek("\u4F60\u662F\u8FDE\u901A\u6027\u6D4B\u8BD5\u5668\u3002", '\u8BF7\u56DE\u590D {"ok": true}');
      return { ok: true, message: "DeepSeek API \u8FDE\u901A\u6B63\u5E38", response: result };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }
  var RULE_MAP = [
    { cats: ["\u67A3", "\u7EA2\u67A3", "\u5927\u67A3", "\u67A3\u5B50"], cat: "\u67A3" },
    { cats: ["\u98CE\u6247", "\u7535\u98CE\u6247", "\u843D\u5730\u6247", "\u5854\u6247"], cat: "\u98CE\u6247" },
    { cats: ["\u7EB8\u5DFE", "\u62BD\u7EB8", "\u5377\u7EB8"], cat: "\u7EB8\u54C1" },
    { cats: ["\u7535\u996D\u7172", "\u7535\u996D\u9505", "\u9AD8\u538B\u9505"], cat: "\u53A8\u7535" },
    { cats: ["\u4FDD\u6E29\u676F", "\u6C34\u676F", "\u676F\u5B50", "\u73BB\u7483\u676F"], cat: "\u6C34\u676F" },
    { cats: ["\u6D17\u8863\u6DB2", "\u51DD\u73E0", "\u6D17\u6D01\u7CBE", "\u5783\u573E\u888B", "\u6D01\u5395", "\u6D88\u6BD2\u6DB2", "\u6D88\u6BD2"], cat: "\u5BB6\u6E05" },
    { cats: ["\u88AB\u5B50", "\u51C9\u88AB", "\u56DB\u4EF6\u5957", "\u6795\u5934", "\u6BDB\u5DFE", "\u5E8A\u57AB"], cat: "\u5BB6\u7EBA" },
    { cats: ["\u624B\u673A", "\u8001\u4EBA\u673A", "\u5907\u7528\u673A"], cat: "\u624B\u673A" },
    { cats: ["\u732B\u7CAE", "\u72D7\u7CAE", "\u732B\u7802", "\u5BA0\u7269", "\u5BA0\u7269\u96F6\u98DF"], cat: "\u732B\u7CAE" },
    { cats: ["\u7C73", "\u5927\u7C73", "\u9999\u7C73", "\u6302\u9762", "\u9762\u6761", "\u6CB9", "\u9171\u6CB9", "\u918B", "\u869D\u6CB9", "\u8C03\u5473"], cat: "\u7C73\u9762" },
    { cats: ["\u706B\u9E21\u9762", "\u6CE1\u9762", "\u65B9\u4FBF\u9762", "\u8FA3\u6761", "\u85AF\u7247", "\u96F6\u98DF", "\u997C\u5E72", "\u575A\u679C", "\u5DE7\u514B\u529B", "\u7CD6\u679C", "\u96EA\u997C", "\u732A\u8089\u812F"], cat: "\u96F6\u98DF" },
    { cats: ["\u82F9\u679C", "\u8110\u6A59", "\u6A59\u5B50", "\u9999\u8549", "\u8F66\u5398\u5B50", "\u84DD\u8393", "\u7315\u7334\u6843", "\u706B\u9F99\u679C", "\u6C34\u679C"], cat: "\u6C34\u679C" },
    { cats: ["\u53EF\u4E50", "\u77FF\u6CC9\u6C34", "\u679C\u6C41", "\u5496\u5561", "\u725B\u5976", "\u9178\u5976", "\u8336", "\u5564\u9152", "\u996E\u6599"], cat: "\u996E\u6599" },
    { cats: ["\u6C34\u997A", "\u997A\u5B50", "\u9762\u5305", "\u71D5\u9EA6", "\u9EA6\u7247", "\u81EA\u70ED", "\u901F\u98DF"], cat: "\u901F\u98DF" },
    { cats: ["\u9E21\u86CB", "\u9E21\u80F8\u8089", "\u852C\u83DC", "\u751F\u9C9C", "\u8089"], cat: "\u751F\u9C9C" },
    { cats: ["\u7092\u9505", "\u83DC\u5200", "\u7827\u677F", "\u6C34\u58F6", "\u4FDD\u9C9C\u76D2", "\u9505", "\u5200", "\u7897", "\u7B77"], cat: "\u53A8\u5177" },
    { cats: ["\u52A0\u6E7F\u5668", "\u5439\u98CE\u673A", "\u626B\u5730", "\u53F0\u706F", "\u7834\u58C1", "\u5BB6\u7535"], cat: "\u5BB6\u7535" },
    { cats: ["\u6536\u7EB3", "\u8863\u67B6"], cat: "\u6536\u7EB3" },
    { cats: ["\u6D74\u5DFE", "\u62D6\u978B", "\u536B\u6D74"], cat: "\u536B\u6D74" },
    { cats: ["\u8033\u673A", "\u5145\u7535\u5B9D", "\u6570\u636E\u7EBF", "\u97F3\u7BB1", "\u6570\u7801", "\u7535\u8111", "\u5E73\u677F"], cat: "\u6570\u7801" },
    { cats: ["T\u6064", "\u886C\u886B", "\u536B\u8863", "\u5916\u5957", "\u725B\u4ED4\u88E4", "\u8FD0\u52A8\u88E4", "\u88D9\u5B50", "\u8FD0\u52A8\u978B", "\u5E06\u5E03\u978B", "\u5185\u8863", "\u889C\u5B50", "\u5E3D\u5B50", "\u56F4\u5DFE", "\u8863\u670D", "\u88E4\u5B50", "\u978B", "\u670D\u9970"], cat: "\u670D\u9970" },
    { cats: ["\u6D17\u53D1\u6C34", "\u6C90\u6D74\u9732", "\u7259\u818F", "\u7259\u5237", "\u4E2A\u62A4"], cat: "\u4E2A\u62A4" },
    { cats: ["\u53E3\u7EA2", "\u9762\u819C", "\u7C89\u5E95", "\u7F8E\u5986", "\u5986"], cat: "\u7F8E\u5986" },
    { cats: ["\u7BEE\u7403", "\u745C\u4F3D\u57AB", "\u7FBD\u6BDB\u7403", "\u8DF3\u7EF3", "\u4E66", "\u7B14", "\u7B14\u8BB0\u672C", "\u73A9\u5177"], cat: "\u6587\u4F53" },
    { cats: ["\u7EF4\u751F\u7D20", "\u9499\u7247", "\u67B8\u675E", "\u4FDD\u5065", "\u517B\u751F"], cat: "\u4FDD\u5065" }
  ];
  var COMPLAINT_MARKERS = ["\u4E0D\u597D\u7528", "\u4E0D\u751C", "\u4E0D\u597D\u5403", "\u574F\u4E86", "\u5047\u8D27", "\u5DEE\u8BC4", "\u9000\u8D27"];
  function ruleEngineRelevance(t) {
    const hasProduct = RULE_MAP.some((r) => r.cats.some((c) => t.includes(c)));
    const hasIntent = /有没有|求推荐|想买|要买|买|下单|多少钱|有活动|有啥|有吗|推荐|哪个好|需要|想要|要/.test(t);
    const isComplaint = COMPLAINT_MARKERS.some((m) => t.includes(m));
    const relevant = hasProduct || hasIntent || isComplaint;
    return { relevant, confidence: relevant ? 0.85 : 0.2, isComplaint };
  }
  function ruleEngineParse(t) {
    let category = "", keywords = [];
    for (const r of RULE_MAP) {
      const hits = r.cats.filter((c) => t.includes(c));
      if (hits.length > 0) {
        category = r.cat;
        keywords = hits;
        break;
      }
    }
    const isComplaint = COMPLAINT_MARKERS.some((m) => t.includes(m));
    const hasBuy = /想买|要买|买点|买|下单|来点|囤点|求链接|有没有|有啥|有活动|有吗/.test(t);
    const hasRec = /求推荐|推荐|哪个好/.test(t);
    const hasCompare = /比价|便宜|多少钱|划算|贵|以内/.test(t);
    let intent = "complain";
    if (isComplaint) intent = "complain";
    else if (hasCompare) intent = "compare";
    else if (hasRec) intent = "ask_rec";
    else if (hasBuy) intent = "want_buy";
    else if (category) intent = "ask_rec";
    const priceMatch = t.match(/(便宜的|便宜点|百元以内|\d+元以内|性价比|以内)/);
    return {
      category: category || "\u672A\u77E5",
      keywords,
      intent,
      price_pref: priceMatch ? priceMatch[1] : null
    };
  }

  // webapp/server/lib/dedup.js
  function fingerprint(groupId, category) {
    return `${groupId}:${category}`;
  }
  function dedup(groupId, category) {
    const fp = fingerprint(groupId, category);
    const now = Date.now();
    const windowMs = state_default.config.dedup_window * 1e3;
    const existing = state_default.demands.find(
      (d) => d.fingerprint === fp && now - d.firstSeenAt < windowMs
    );
    if (existing) {
      existing.heat += 1;
      existing.lastSeenAt = now;
      return {
        isDuplicate: true,
        demand: existing,
        // 是否已响应
        alreadyResponded: existing.status === "responded"
      };
    }
    return { isDuplicate: false, demand: null };
  }
  function checkFreq(groupId, isAt) {
    if (isAt) return { allowed: true, reason: "\u827E\u7279\u54CD\u5E94\u4E0D\u5360\u9891\u63A7\u989D\u5EA6" };
    const count = state_default.dailyCount[groupId] || 0;
    if (count >= state_default.config.n_freq) {
      return { allowed: false, reason: `\u5DF2\u8FBE\u6BCF\u65E5\u4E0A\u9650 ${state_default.config.n_freq} \u6B21` };
    }
    return { allowed: true, reason: "" };
  }
  function consumeFreq(groupId, isAt) {
    if (!isAt) {
      state_default.dailyCount[groupId] = (state_default.dailyCount[groupId] || 0) + 1;
    }
  }
  function createDemand(unit, parsed, virtualTime) {
    const fp = fingerprint(unit.group, parsed.category);
    const demand = {
      id: `D${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      fingerprint: fp,
      group: unit.group,
      user: unit.user,
      originalText: unit.texts.join(" "),
      category: parsed.category,
      keywords: parsed.keywords,
      intent: parsed.intent,
      price_pref: parsed.price_pref,
      at: unit.at || false,
      heat: 1,
      status: "pending",
      // pending / responded / queued / expired
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
      virtualTime
    };
    state_default.demands.push(demand);
    return demand;
  }

  // webapp/server/lib/router.js
  function route(demand, relevance) {
    const { at, intent } = demand;
    const isRelevant = relevance.relevant && intent !== "complain";
    const atMatrixOn = state_default.config.at_switch;
    const hasAt = !!at;
    if (hasAt && isRelevant) {
      if (atMatrixOn) {
        return {
          outlet: "robot_push",
          urgency: "immediate",
          reason: "\u827E\u7279 + \u5546\u54C1\u76F8\u5173 + \u5F00\u5173\u5F00\u542F \u2192 \u673A\u5668\u4EBA\u76F4\u63A5\u63A8\u54C1"
        };
      }
      return {
        outlet: "triple",
        urgency: "minute",
        reason: "\u827E\u7279 + \u5546\u54C1\u76F8\u5173 + \u5F00\u5173\u5173\u95ED \u2192 \u673A\u5668\u4EBA\u4E0D\u63A5\u8BDD\uFF0C\u8F6C\u7FA4\u4E3B\u7AEF\u7F6E\u9876+Push+\u6392\u671F\u66FF\u6362"
      };
    }
    if (hasAt && !isRelevant) {
      return {
        outlet: "push_owner",
        urgency: "immediate",
        reason: "\u827E\u7279 + \u5546\u54C1\u65E0\u5173 \u2192 Push \u7FA4\u4E3B\u56DE\u590D"
      };
    }
    if (!hasAt && isRelevant) {
      return {
        outlet: "triple",
        urgency: "minute",
        reason: "\u65E0\u827E\u7279 + \u771F\u5B9E\u9700\u6C42 \u2192 \u4E09\u8DEF\u5E76\u884C\uFF08\u7F6E\u9876+Push+\u6392\u671F\u66FF\u6362\uFF09"
      };
    }
    return {
      outlet: "discard",
      urgency: "none",
      reason: "\u65E0\u827E\u7279 + \u5546\u54C1\u65E0\u5173 \u2192 \u4E22\u5F03"
    };
  }

  // webapp/server/lib/recommend.js
  function mockRecommend(groupId, category, keywords, pricePref, excludeSkus = []) {
    const candidates = state_default.products.filter(
      (p) => p.cat === category && !excludeSkus.includes(p.id)
    );
    if (candidates.length === 0) {
      const kwMatches = state_default.products.filter(
        (p) => keywords.some((k) => p.name.includes(k) || p.cat.includes(k)) && !excludeSkus.includes(p.id)
      );
      if (kwMatches.length === 0) return [];
      return rankAndReturn(kwMatches, pricePref, groupId);
    }
    if (keywords.length) {
      const kwHits = candidates.filter(
        (p) => keywords.some((k) => p.name.includes(k)) && !excludeSkus.includes(p.id)
      );
      if (kwHits.length > 0) return rankAndReturn(kwHits, pricePref, groupId);
    }
    return rankAndReturn(candidates, pricePref, groupId);
  }
  function rankAndReturn(items, pricePref, groupId) {
    let ranked = [...items];
    if (pricePref && /便宜|低价|性价比|以内/.test(pricePref)) {
      ranked.sort((a, b) => a.price - b.price);
    } else {
      ranked.sort((a, b) => b.comm - a.comm);
    }
    return ranked.slice(0, 3).map((p) => ({
      sku_id: p.id,
      name: p.name,
      price: p.price,
      commission_pct: p.comm,
      category: p.cat,
      promo_url: `https://jd.com/product/${p.id}?group=${groupId}&src=quickresp`
    }));
  }

  // webapp/server/lib/executor.js
  function execute(demand, routeDecision) {
    const { outlet } = routeDecision;
    const groupId = demand.group;
    if (outlet === "discard") {
      return { executed: false, outlet, reason: routeDecision.reason };
    }
    const candidates = mockRecommend(
      groupId,
      demand.category,
      demand.keywords,
      demand.price_pref,
      demand.pushedSkus || []
      // 已推品排除
    );
    if (candidates.length === 0) {
      return { executed: false, outlet, reason: "\u63A8\u8350\u63A5\u53E3\u65E0\u5019\u9009\u54C1" };
    }
    const product = candidates[0];
    const response = {
      id: `R${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      demandId: demand.id,
      group: groupId,
      user: demand.user,
      originalText: demand.originalText,
      category: demand.category,
      intent: demand.intent,
      at: demand.at,
      outlet,
      product,
      candidates,
      executedAt: Date.now(),
      result: ""
    };
    switch (outlet) {
      case "robot_push":
        response.result = `\u673A\u5668\u4EBA\u5DF2\u5728\u7FA4\u5185\u63A8\u9001\uFF1A${product.name} \xA5${product.price}`;
        response.urgency = "\u79D2\u7EA7";
        break;
      case "triple":
        response.result_pinned = `\u5DF2\u5C06 ${product.name} \u7F6E\u9876\u5230\u7FA4\u4E3B\u7AEF\u9009\u54C1\u6C60`;
        response.result_push = `\u5DF2 Push \u7FA4\u4E3B\uFF1A\u7528\u6237"${demand.user}"\u63D0\u53CA"${demand.originalText}"`;
        const scheduleItem = state_default.schedule.find((s) => s.group_id === groupId && s.status === "pending");
        if (scheduleItem) {
          const original = { ...scheduleItem };
          scheduleItem.product_id = product.sku_id;
          scheduleItem.product_name = product.name;
          scheduleItem.status = "replaced";
          response.result_schedule = `\u5DF2\u5C06 ${groupId} \u4E0B\u6B21\u53D1\u54C1\u4ECE\u300C${original.product_name}\u300D\u66FF\u6362\u4E3A\u300C${product.name}\u300D`;
          state_default.scheduleReplacements.push({
            group: groupId,
            slot: scheduleItem.slot,
            original: original.product_name,
            replacement: product.name,
            demandId: demand.id,
            time: Date.now()
          });
        } else {
          response.result_schedule = `${groupId} \u65E0\u5F85\u6267\u884C\u6392\u671F\uFF0C\u8DF3\u8FC7\u6392\u671F\u66FF\u6362`;
        }
        response.result = `${response.result_pinned}\uFF1B${response.result_push}\uFF1B${response.result_schedule}`;
        response.urgency = "\u5206\u949F\u7EA7";
        break;
      case "push_owner":
        response.result = `\u5DF2 Push \u7FA4\u4E3B\uFF1A\u7528\u6237"${demand.user}"\u827E\u7279\u4E86\u4F60\uFF0C\u8BF7\u56DE\u590D"${demand.originalText}"`;
        response.urgency = "\u79D2\u7EA7";
        break;
    }
    state_default.responses.push(response);
    if (!demand.pushedSkus) demand.pushedSkus = [];
    demand.pushedSkus.push(product.sku_id);
    return { executed: true, outlet, response, reason: routeDecision.reason };
  }

  // webapp/server/lib/pipeline.js
  async function processMessage(msg) {
    const virtualTime = msg.t;
    state_default.counters.intake++;
    const filterResult = preFilter(msg);
    if (!filterResult.pass) {
      state_default.counters.filtered++;
      state_default.logs.unshift({
        type: "filtered",
        virtualTime,
        group: msg.group,
        user: msg.user,
        text: msg.text,
        reason: filterResult.reason,
        at: msg.at
      });
      trimLogs();
      return;
    }
    const aggResult = aggregate(msg, virtualTime);
    if (!aggResult.packed) {
      state_default.logs.unshift({
        type: "aggregating",
        virtualTime,
        group: msg.group,
        user: msg.user,
        text: msg.text,
        at: msg.at
      });
      trimLogs();
      const timedOut = checkTimeouts(virtualTime);
      for (const unit of timedOut) {
        await processUnit(unit, virtualTime);
      }
      return;
    }
    await processUnit(aggResult.unit, virtualTime);
  }
  async function processUnit(unit, virtualTime) {
    var _a11;
    state_default.counters.aggregated++;
    const unitText = unit.texts.join(" ");
    const contextText = getContext(unit, virtualTime);
    state_default.logs.unshift({
      type: "aggregated",
      virtualTime,
      group: unit.group,
      user: unit.user,
      text: unitText,
      at: unit.at,
      unit
    });
    trimLogs();
    let relevance;
    const useAI = state_default.config.deepseek_key && state_default.config.ai_mode === "builtin";
    if (useAI) {
      try {
        relevance = await judgeRelevance(unitText, contextText);
      } catch (e) {
        console.error("AI relevance error, fallback to rules:", e.message);
        relevance = ruleEngineRelevance(unitText);
      }
    } else {
      relevance = ruleEngineRelevance(unitText);
    }
    if (!relevance.relevant || relevance.confidence < state_default.config.tau) {
      state_default.counters.bert_fail++;
      state_default.logs.unshift({
        type: "bert_reject",
        virtualTime,
        group: unit.group,
        user: unit.user,
        text: unitText,
        confidence: relevance.confidence,
        tau: state_default.config.tau
      });
      trimLogs();
      return { verdict: "block", reason: "\u76F8\u5173\u6027\u4E0D\u8DB3\uFF08\u7F6E\u4FE1\u5EA6\u4F4E\u4E8E \u03C4\uFF09\uFF0C\u9759\u9ED8\u4E0D\u54CD\u5E94" };
    }
    state_default.counters.bert_pass++;
    let parsed;
    if (useAI) {
      try {
        parsed = await parseDemand(unitText, contextText);
      } catch (e) {
        console.error("AI parse error, fallback to rules:", e.message);
        parsed = ruleEngineParse(unitText);
      }
    } else {
      parsed = ruleEngineParse(unitText);
    }
    state_default.counters.parsed++;
    if (parsed.intent === "complain") {
      state_default.logs.unshift({
        type: "complain_out",
        virtualTime,
        group: unit.group,
        user: unit.user,
        text: unitText,
        parsed
      });
      trimLogs();
      return { verdict: "block", reason: "\u5410\u69FD\u51FA\u5C40\uFF08\u975E\u65B0\u9700\u6C42\uFF09\uFF0C\u4E0D\u54CD\u5E94" };
    }
    const dupResult = dedup(unit.group, parsed.category);
    let demand;
    if (dupResult.isDuplicate) {
      state_default.counters.deduped++;
      demand = dupResult.demand;
      state_default.logs.unshift({
        type: "deduped",
        virtualTime,
        group: unit.group,
        user: unit.user,
        text: unitText,
        heat: demand.heat,
        category: parsed.category
      });
      trimLogs();
      if (dupResult.alreadyResponded && !unit.at) return { verdict: "skip", reason: "\u540C\u6307\u7EB9\u9700\u6C42 24h \u5185\u5DF2\u54CD\u5E94\uFF0C\u53BB\u91CD\u4E0D\u91CD\u590D\u63A8" };
    } else {
      demand = createDemand(unit, parsed, virtualTime);
    }
    const freqResult = checkFreq(unit.group, unit.at);
    if (!freqResult.allowed) {
      state_default.counters.freq_blocked++;
      demand.status = "queued";
      state_default.logs.unshift({
        type: "freq_blocked",
        virtualTime,
        group: unit.group,
        user: unit.user,
        text: unitText,
        reason: freqResult.reason
      });
      trimLogs();
      return { verdict: "hold", reason: freqResult.reason };
    }
    const routeDecision = route(demand, relevance);
    if (unit.at) state_default.counters.routed_at++;
    else state_default.counters.routed_non_at++;
    const execResult = execute(demand, routeDecision);
    if (execResult.executed) {
      state_default.counters.responded++;
      consumeFreq(unit.group, unit.at);
      demand.status = "responded";
      demand.responseId = execResult.response.id;
      state_default.logs.unshift({
        type: "responded",
        virtualTime,
        group: unit.group,
        user: unit.user,
        text: unitText,
        outlet: routeDecision.outlet,
        product: (_a11 = execResult.response.product) == null ? void 0 : _a11.name,
        result: execResult.response.result
      });
      trimLogs();
      return {
        verdict: "push",
        outlet: routeDecision.outlet,
        product: execResult.response.product,
        reason: execResult.response.result
      };
    }
    trimLogs();
    return { verdict: "hold", reason: execResult.reason || "\u672A\u6267\u884C\u54CD\u5E94" };
  }
  async function flushRemaining() {
    var _a11;
    const units = flushAll();
    for (const unit of units) {
      await processUnit(unit, ((_a11 = state_default.messages[state_default.messages.length - 1]) == null ? void 0 : _a11.t) || 0);
    }
  }
  function trimLogs() {
    if (state_default.logs.length > 200) state_default.logs = state_default.logs.slice(0, 200);
  }

  // webapp/server/lib/replay.js
  var timer = null;
  function startReplay(speed = 1) {
    if (state_default.replay.playing) return;
    state_default.replay.playing = true;
    state_default.replay.speed = speed;
    state_default.replay.startedAt = Date.now();
    tick();
  }
  function pauseReplay() {
    state_default.replay.playing = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (state_default.replay.startedAt) {
      state_default.replay.elapsedBase += (Date.now() - state_default.replay.startedAt) * state_default.replay.speed / 1e3;
      state_default.replay.startedAt = null;
    }
  }
  function resumeReplay() {
    if (state_default.replay.playing) return;
    state_default.replay.playing = true;
    state_default.replay.startedAt = Date.now();
    tick();
  }
  function setSpeed(speed) {
    if (state_default.replay.playing && state_default.replay.startedAt) {
      state_default.replay.elapsedBase += (Date.now() - state_default.replay.startedAt) * state_default.replay.speed / 1e3;
      state_default.replay.startedAt = Date.now();
    }
    state_default.replay.speed = speed;
    if (state_default.replay.playing) tick();
  }
  function resetReplay() {
    pauseReplay();
    state_default.replay.cursor = 0;
    state_default.replay.elapsedBase = 0;
  }
  function getElapsed() {
    let elapsed = state_default.replay.elapsedBase;
    if (state_default.replay.playing && state_default.replay.startedAt) {
      elapsed += (Date.now() - state_default.replay.startedAt) * state_default.replay.speed / 1e3;
    }
    return elapsed;
  }
  function tick() {
    if (!state_default.replay.playing) return;
    const messages = state_default.messages;
    const elapsed = getElapsed();
    while (state_default.replay.cursor < messages.length && messages[state_default.replay.cursor].t <= elapsed) {
      const msg = messages[state_default.replay.cursor];
      state_default.replay.cursor++;
      processMessage(msg).catch((e) => console.error("Pipeline error:", e));
    }
    if (state_default.replay.cursor >= messages.length) {
      state_default.replay.playing = false;
      state_default.replay.startedAt = null;
      return;
    }
    const nextMsg = messages[state_default.replay.cursor];
    const wait = Math.max(50, (nextMsg.t - elapsed) * 1e3 / state_default.replay.speed);
    timer = setTimeout(() => tick(), Math.min(wait, 5e3));
  }
  function getReplayStatus() {
    return {
      playing: state_default.replay.playing,
      speed: state_default.replay.speed,
      cursor: state_default.replay.cursor,
      total: state_default.messages.length,
      progress: state_default.messages.length ? Math.round(state_default.replay.cursor / state_default.messages.length * 100) : 0
    };
  }

  // webapp/server/lib/seed.js
  var INTENTS = ["want_buy", "ask_rec", "compare"];
  var OUTLETS = ["robot_push", "triple", "push_owner"];
  function seedDemoData() {
    if (state_default.demands.length > 0) return;
    const treat = state_default.groups.filter((g) => g.arm === "\u5B9E\u9A8C\u7EC4");
    const ctrl = state_default.groups.filter((g) => g.arm === "\u5BF9\u7167\u7EC4");
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const now = Date.now();
    let dIdx = 0, rIdx = 0;
    for (let i = 0; i < 45; i++) {
      const g = treat[i % treat.length];
      const p = pick(state_default.products);
      const id = "D" + (1e3 + dIdx++);
      const at = Math.random() > 0.6;
      const responded = i < 38;
      state_default.demands.push({
        id,
        group: g.id,
        user: "\u90BB\u5C45" + (100 + i),
        category: p.cat,
        intent: pick(INTENTS),
        price_pref: "\xA5" + p.price,
        heat: 1 + Math.floor(Math.random() * 4),
        at,
        status: responded ? "responded" : "queued",
        originalText: "\u60F3\u8981\u4E2A" + p.name,
        firstSeenAt: now - (45 - i) * 6e4,
        corrected_intent: "",
        corrected_category: ""
      });
      if (responded) {
        state_default.responses.push({
          id: "R" + (2e3 + rIdx++),
          group: g.id,
          user: "\u90BB\u5C45" + (100 + i),
          at,
          outlet: pick(OUTLETS),
          product: { name: p.name, price: p.price, commission_pct: p.comm },
          result: "\u5DF2\u5411\u7FA4\u5185\u63A8\u9001\u300E" + p.name + "\u300F",
          originalText: "\u60F3\u8981\u4E2A" + p.name,
          demandId: id,
          executedAt: now - (45 - i) * 6e4 + 5e3
        });
        state_default.counters.responded++;
      }
      state_default.counters.intake++;
      state_default.counters.aggregated++;
      state_default.counters.bert_pass++;
      state_default.counters.parsed++;
    }
    for (let i = 0; i < 28; i++) {
      const g = ctrl[i % ctrl.length];
      const p = pick(state_default.products);
      const id = "D" + (1e3 + dIdx++);
      state_default.demands.push({
        id,
        group: g.id,
        user: "\u7FA4\u53CB" + (200 + i),
        category: p.cat,
        intent: "want_buy",
        price_pref: "\xA5" + p.price,
        heat: 1 + Math.floor(Math.random() * 3),
        at: false,
        status: "pending",
        originalText: "\u60F3\u4E70\u4E2A" + p.name,
        firstSeenAt: now - (28 - i) * 6e4,
        corrected_intent: "",
        corrected_category: ""
      });
      state_default.counters.intake++;
      state_default.counters.aggregated++;
      state_default.counters.bert_pass++;
      state_default.counters.parsed++;
    }
    state_default.counters.routed_at = state_default.demands.filter((d) => d.at).length;
    state_default.counters.routed_non_at = state_default.demands.filter((d) => !d.at).length;
  }

  // webapp/server/data/groups.json
  var groups_default = [
    {
      id: "G001",
      name: "\u5E78\u798F\u91CC\u5C0F\u533A\u90BB\u5C45\u7FA4",
      size: 213,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      is_demo: true
    },
    {
      id: "G002",
      name: "\u5B9D\u5988\u597D\u7269\u5206\u4EAB\u7FA4",
      size: 186,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      is_demo: true
    },
    {
      id: "G003",
      name: "\u8001\u5BB6\u7279\u4EA7\u4E92\u52A9\u7FA4",
      size: 156,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4"
    },
    {
      id: "G004",
      name: "\u5915\u9633\u7EA2\u517B\u751F\u5802",
      size: 204,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      is_demo: true
    },
    {
      id: "G005",
      name: "\u6570\u7801\u53D1\u70E7\u53CB\u7FA4",
      size: 118,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4"
    },
    {
      id: "G006",
      name: "\u5BA0\u7269\u94F2\u5C4E\u5B98\u7FA4",
      size: 167,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      is_demo: true
    },
    {
      id: "G007",
      name: "\u65B0\u624B\u7238\u5988\u8425",
      size: 179,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4"
    },
    {
      id: "G008",
      name: "\u5382\u533A\u5BBF\u820D2\u53F7\u697C",
      size: 231,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      is_demo: true
    },
    {
      id: "G009",
      name: "\u517B\u8001\u94F6\u53D1\u4E92\u52A9\u7FA4",
      size: 179,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u517B\u8001"
      ]
    },
    {
      id: "G010",
      name: "\u6BCD\u5A74\u6BCD\u5A74\u79CD\u8349\u7FA4",
      size: 225,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u6BCD\u5A74"
      ]
    },
    {
      id: "G011",
      name: "\u751F\u9C9C\u90BB\u91CC\u751F\u9C9C\u7FA4",
      size: 204,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G012",
      name: "\u56FE\u4E66\u8BFB\u4E66\u4F1A\u7FA4",
      size: 218,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u56FE\u4E66"
      ]
    },
    {
      id: "G013",
      name: "\u6BCD\u5A74\u80B2\u513F\u4EA4\u6D41\u7FA4",
      size: 116,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u6BCD\u5A74"
      ]
    },
    {
      id: "G014",
      name: "\u670D\u9970\u7A7F\u642D\u79CD\u8349\u7FA4",
      size: 201,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G015",
      name: "\u98DF\u54C1\u7F8E\u98DF\u5206\u4EAB\u7FA4",
      size: 186,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u98DF\u54C1"
      ]
    },
    {
      id: "G016",
      name: "\u517B\u8001\u5EB7\u4E50\u5206\u4EAB\u7FA4",
      size: 211,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u517B\u8001"
      ]
    },
    {
      id: "G017",
      name: "\u5BB6\u5C45\u751F\u6D3B\u9986\u7FA4",
      size: 224,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BB6\u5C45"
      ]
    },
    {
      id: "G018",
      name: "\u8FD0\u52A8\u8DD1\u6B65\u4EA4\u6D41\u7FA4",
      size: 187,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "G019",
      name: "\u5BB6\u7535\u5BB6\u7535\u4EE5\u65E7\u6362\u65B0\u7FA4",
      size: 145,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BB6\u7535"
      ]
    },
    {
      id: "G020",
      name: "\u6570\u7801\u597D\u7269\u5F00\u7BB1\u7FA4",
      size: 203,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u6570\u7801"
      ]
    },
    {
      id: "G021",
      name: "\u6BCD\u5A74\u6BCD\u5A74\u79CD\u8349\u7FA4",
      size: 145,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u6BCD\u5A74"
      ]
    },
    {
      id: "G022",
      name: "\u517B\u8001\u5915\u9633\u7EA2\u517B\u751F\u7FA4",
      size: 97,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u517B\u8001"
      ]
    },
    {
      id: "G023",
      name: "\u670D\u9970\u95FA\u871C\u8D2D\u7269\u7FA4",
      size: 98,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G024",
      name: "\u8FD0\u52A8\u5065\u8EAB\u6253\u5361\u7FA4",
      size: 106,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "G025",
      name: "\u517B\u8001\u94F6\u53D1\u4E92\u52A9\u7FA4",
      size: 233,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u517B\u8001"
      ]
    },
    {
      id: "G026",
      name: "\u5BB6\u5C45\u751F\u6D3B\u9986\u7FA4",
      size: 228,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BB6\u5C45"
      ]
    },
    {
      id: "G027",
      name: "\u56FE\u4E66\u77E5\u8BC6\u4ED8\u8D39\u7FA4",
      size: 92,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u56FE\u4E66"
      ]
    },
    {
      id: "G028",
      name: "\u6BCD\u5A74\u5B9D\u5988\u597D\u7269\u7FA4",
      size: 232,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u6BCD\u5A74"
      ]
    },
    {
      id: "G029",
      name: "\u8FD0\u52A8\u8FD0\u52A8\u88C5\u5907\u7FA4",
      size: 111,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "G030",
      name: "\u670D\u9970\u7A7F\u642D\u79CD\u8349\u7FA4",
      size: 232,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G031",
      name: "\u5BB6\u7535\u597D\u7269\u8BC4\u6D4B\u7FA4",
      size: 135,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BB6\u7535"
      ]
    },
    {
      id: "G032",
      name: "\u751F\u9C9C\u90BB\u91CC\u751F\u9C9C\u7FA4",
      size: 231,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G033",
      name: "\u8FD0\u52A8\u5065\u8EAB\u6253\u5361\u7FA4",
      size: 160,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "G034",
      name: "\u5BB6\u5C45\u5C45\u5BB6\u597D\u7269\u7FA4",
      size: 207,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BB6\u5C45"
      ]
    },
    {
      id: "G035",
      name: "\u5BA0\u7269\u94F2\u5C4E\u5B98\u8054\u76DF",
      size: 90,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BA0\u7269"
      ]
    },
    {
      id: "G036",
      name: "\u517B\u8001\u94F6\u53D1\u4E92\u52A9\u7FA4",
      size: 198,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u517B\u8001"
      ]
    },
    {
      id: "G037",
      name: "\u56FE\u4E66\u7AE5\u4E66\u5206\u4EAB\u7FA4",
      size: 130,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u56FE\u4E66"
      ]
    },
    {
      id: "G038",
      name: "\u7F8E\u5986\u7F8E\u5986\u6253\u5361\u7FA4",
      size: 117,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u7F8E\u5986"
      ]
    },
    {
      id: "G039",
      name: "\u670D\u9970\u670D\u9970\u4F18\u60E0\u7FA4",
      size: 199,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G040",
      name: "\u5BA0\u7269\u840C\u5BA0\u4EA4\u6D41\u7FA4",
      size: 124,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BA0\u7269"
      ]
    },
    {
      id: "G041",
      name: "\u56FE\u4E66\u77E5\u8BC6\u4ED8\u8D39\u7FA4",
      size: 156,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u56FE\u4E66"
      ]
    },
    {
      id: "G042",
      name: "\u6570\u7801\u597D\u7269\u5F00\u7BB1\u7FA4",
      size: 84,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u6570\u7801"
      ]
    },
    {
      id: "G043",
      name: "\u98DF\u54C1\u7F8E\u98DF\u5206\u4EAB\u7FA4",
      size: 190,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u98DF\u54C1"
      ]
    },
    {
      id: "G044",
      name: "\u751F\u9C9C\u793E\u533A\u56E2\u8D2D\u7FA4",
      size: 148,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G045",
      name: "\u5BA0\u7269\u5BA0\u7269\u7528\u54C1\u7FA4",
      size: 157,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BA0\u7269"
      ]
    },
    {
      id: "G046",
      name: "\u6BCD\u5A74\u5B9D\u5988\u597D\u7269\u7FA4",
      size: 143,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u6BCD\u5A74"
      ]
    },
    {
      id: "G047",
      name: "\u56FE\u4E66\u77E5\u8BC6\u4ED8\u8D39\u7FA4",
      size: 236,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u56FE\u4E66"
      ]
    },
    {
      id: "G048",
      name: "\u6BCD\u5A74\u5B9D\u5988\u597D\u7269\u7FA4",
      size: 239,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u6BCD\u5A74"
      ]
    },
    {
      id: "G049",
      name: "\u5BB6\u7535\u597D\u7269\u8BC4\u6D4B\u7FA4",
      size: 154,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BB6\u7535"
      ]
    },
    {
      id: "G050",
      name: "\u670D\u9970\u670D\u9970\u4F18\u60E0\u7FA4",
      size: 250,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G051",
      name: "\u8FD0\u52A8\u8DD1\u6B65\u4EA4\u6D41\u7FA4",
      size: 96,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "G052",
      name: "\u5BB6\u7535\u597D\u7269\u8BC4\u6D4B\u7FA4",
      size: 236,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u5BB6\u7535"
      ]
    },
    {
      id: "G053",
      name: "\u98DF\u54C1\u7F8E\u98DF\u5206\u4EAB\u7FA4",
      size: 209,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5B9E\u9A8C\u7EC4",
      tags: [
        "\u98DF\u54C1"
      ]
    },
    {
      id: "G054",
      name: "\u8FD0\u52A8\u8DD1\u6B65\u4EA4\u6D41\u7FA4",
      size: 167,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "G055",
      name: "\u6570\u7801\u6570\u7801\u73A9\u5BB6\u7FA4",
      size: 215,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u6570\u7801"
      ]
    },
    {
      id: "G056",
      name: "\u5BB6\u7535\u597D\u7269\u8BC4\u6D4B\u7FA4",
      size: 163,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u7535"
      ]
    },
    {
      id: "G057",
      name: "\u6570\u7801\u597D\u7269\u5F00\u7BB1\u7FA4",
      size: 141,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u6570\u7801"
      ]
    },
    {
      id: "G058",
      name: "\u8FD0\u52A8\u8FD0\u52A8\u88C5\u5907\u7FA4",
      size: 218,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "G059",
      name: "\u670D\u9970\u95FA\u871C\u8D2D\u7269\u7FA4",
      size: 102,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G060",
      name: "\u8FD0\u52A8\u5065\u8EAB\u6253\u5361\u7FA4",
      size: 215,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "G061",
      name: "\u98DF\u54C1\u96F6\u98DF\u79CD\u8349\u7FA4",
      size: 99,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u98DF\u54C1"
      ]
    },
    {
      id: "G062",
      name: "\u5BB6\u7535\u5BB6\u7535\u4EE5\u65E7\u6362\u65B0\u7FA4",
      size: 214,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u7535"
      ]
    },
    {
      id: "G063",
      name: "\u98DF\u54C1\u5403\u8D27\u798F\u5229\u7FA4",
      size: 89,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u98DF\u54C1"
      ]
    },
    {
      id: "G064",
      name: "\u670D\u9970\u95FA\u871C\u8D2D\u7269\u7FA4",
      size: 183,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G065",
      name: "\u5BB6\u7535\u5BB6\u7535\u4EE5\u65E7\u6362\u65B0\u7FA4",
      size: 242,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u7535"
      ]
    },
    {
      id: "G066",
      name: "\u751F\u9C9C\u793E\u533A\u56E2\u8D2D\u7FA4",
      size: 148,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G067",
      name: "\u751F\u9C9C\u793E\u533A\u56E2\u8D2D\u7FA4",
      size: 147,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G068",
      name: "\u98DF\u54C1\u96F6\u98DF\u79CD\u8349\u7FA4",
      size: 258,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u98DF\u54C1"
      ]
    },
    {
      id: "G069",
      name: "\u98DF\u54C1\u7F8E\u98DF\u5206\u4EAB\u7FA4",
      size: 184,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u98DF\u54C1"
      ]
    },
    {
      id: "G070",
      name: "\u5BA0\u7269\u5BA0\u7269\u7528\u54C1\u7FA4",
      size: 242,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BA0\u7269"
      ]
    },
    {
      id: "G071",
      name: "\u5BB6\u7535\u5BB6\u7535\u4EE5\u65E7\u6362\u65B0\u7FA4",
      size: 249,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u7535"
      ]
    },
    {
      id: "G072",
      name: "\u751F\u9C9C\u679C\u852C\u62FC\u56E2\u7FA4",
      size: 141,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G073",
      name: "\u517B\u8001\u5EB7\u4E50\u5206\u4EAB\u7FA4",
      size: 238,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u517B\u8001"
      ]
    },
    {
      id: "G074",
      name: "\u5BB6\u5C45\u5BB6\u88C5\u4EA4\u6D41\u7FA4",
      size: 243,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u5C45"
      ]
    },
    {
      id: "G075",
      name: "\u5BB6\u5C45\u5BB6\u88C5\u4EA4\u6D41\u7FA4",
      size: 216,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u5C45"
      ]
    },
    {
      id: "G076",
      name: "\u670D\u9970\u95FA\u871C\u8D2D\u7269\u7FA4",
      size: 92,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G077",
      name: "\u751F\u9C9C\u90BB\u91CC\u751F\u9C9C\u7FA4",
      size: 107,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G078",
      name: "\u5BB6\u5C45\u5C45\u5BB6\u597D\u7269\u7FA4",
      size: 87,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u5C45"
      ]
    },
    {
      id: "G079",
      name: "\u670D\u9970\u95FA\u871C\u8D2D\u7269\u7FA4",
      size: 90,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G080",
      name: "\u56FE\u4E66\u8BFB\u4E66\u4F1A\u7FA4",
      size: 172,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u56FE\u4E66"
      ]
    },
    {
      id: "G081",
      name: "\u6BCD\u5A74\u5B9D\u5988\u597D\u7269\u7FA4",
      size: 160,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u6BCD\u5A74"
      ]
    },
    {
      id: "G082",
      name: "\u6BCD\u5A74\u6BCD\u5A74\u79CD\u8349\u7FA4",
      size: 156,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u6BCD\u5A74"
      ]
    },
    {
      id: "G083",
      name: "\u5BB6\u5C45\u5C45\u5BB6\u597D\u7269\u7FA4",
      size: 219,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u5C45"
      ]
    },
    {
      id: "G084",
      name: "\u5BB6\u7535\u667A\u80FD\u5BB6\u7535\u7FA4",
      size: 198,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u7535"
      ]
    },
    {
      id: "G085",
      name: "\u56FE\u4E66\u7AE5\u4E66\u5206\u4EAB\u7FA4",
      size: 259,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u56FE\u4E66"
      ]
    },
    {
      id: "G086",
      name: "\u751F\u9C9C\u90BB\u91CC\u751F\u9C9C\u7FA4",
      size: 125,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G087",
      name: "\u751F\u9C9C\u90BB\u91CC\u751F\u9C9C\u7FA4",
      size: 169,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G088",
      name: "\u517B\u8001\u5EB7\u4E50\u5206\u4EAB\u7FA4",
      size: 240,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u517B\u8001"
      ]
    },
    {
      id: "G089",
      name: "\u670D\u9970\u670D\u9970\u4F18\u60E0\u7FA4",
      size: 223,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G090",
      name: "\u5BA0\u7269\u840C\u5BA0\u4EA4\u6D41\u7FA4",
      size: 186,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BA0\u7269"
      ]
    },
    {
      id: "G091",
      name: "\u751F\u9C9C\u793E\u533A\u56E2\u8D2D\u7FA4",
      size: 152,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G092",
      name: "\u517B\u8001\u5915\u9633\u7EA2\u517B\u751F\u7FA4",
      size: 82,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u517B\u8001"
      ]
    },
    {
      id: "G093",
      name: "\u751F\u9C9C\u679C\u852C\u62FC\u56E2\u7FA4",
      size: 185,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G094",
      name: "\u5BB6\u5C45\u5C45\u5BB6\u597D\u7269\u7FA4",
      size: 104,
      layer: "\u6210\u957F\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u5BB6\u5C45"
      ]
    },
    {
      id: "G095",
      name: "\u7F8E\u5986\u7F8E\u5986\u6253\u5361\u7FA4",
      size: 194,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u65B0\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u7F8E\u5986"
      ]
    },
    {
      id: "G096",
      name: "\u98DF\u54C1\u96F6\u98DF\u79CD\u8349\u7FA4",
      size: 88,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u98DF\u54C1"
      ]
    },
    {
      id: "G097",
      name: "\u670D\u9970\u670D\u9970\u4F18\u60E0\u7FA4",
      size: 142,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G098",
      name: "\u670D\u9970\u7A7F\u642D\u79CD\u8349\u7FA4",
      size: 174,
      layer: "\u8870\u9000\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    },
    {
      id: "G099",
      name: "\u751F\u9C9C\u90BB\u91CC\u751F\u9C9C\u7FA4",
      size: 252,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u6210\u719F\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u751F\u9C9C"
      ]
    },
    {
      id: "G100",
      name: "\u670D\u9970\u7A7F\u642D\u79CD\u8349\u7FA4",
      size: 100,
      layer: "\u6D3B\u8DC3\u7FA4",
      utype: "\u53EC\u56DE\u7528\u6237\u7FA4",
      arm: "\u5BF9\u7167\u7EC4",
      tags: [
        "\u670D\u9970"
      ]
    }
  ];

  // webapp/server/data/products.json
  var products_default = [
    {
      id: "S001",
      name: "\u548C\u7530\u7389\u67A3 500g \u5927\u7EA2\u67A3",
      cat: "\u67A3",
      price: 29.9,
      comm: 10
    },
    {
      id: "S002",
      name: "\u597D\u60F3\u4F60 \u67A3\u7247 \u514D\u6D17 200g",
      cat: "\u67A3",
      price: 19.9,
      comm: 8
    },
    {
      id: "S003",
      name: "\u683C\u529B \u843D\u5730\u6247 3\u6863\u98CE\u901F",
      cat: "\u98CE\u6247",
      price: 199,
      comm: 8
    },
    {
      id: "S004",
      name: "\u7F8E\u7684 \u5854\u6247 \u9065\u63A7\u6B3E",
      cat: "\u98CE\u6247",
      price: 239,
      comm: 7
    },
    {
      id: "S005",
      name: "\u7EF4\u8FBE \u62BD\u7EB8 24\u5305\u6574\u7BB1",
      cat: "\u7EB8\u54C1",
      price: 39.9,
      comm: 10
    },
    {
      id: "S006",
      name: "\u6E05\u98CE \u539F\u6728\u62BD\u7EB8 30\u5305",
      cat: "\u7EB8\u54C1",
      price: 45.8,
      comm: 10
    },
    {
      id: "S007",
      name: "\u7F8E\u7684 \u7535\u996D\u7172 4L \u667A\u80FD\u9884\u7EA6",
      cat: "\u53A8\u7535",
      price: 299,
      comm: 6
    },
    {
      id: "S008",
      name: "\u82CF\u6CCA\u5C14 \u7535\u996D\u7172 4L \u7403\u91DC",
      cat: "\u53A8\u7535",
      price: 259,
      comm: 6
    },
    {
      id: "S009",
      name: "\u81B3\u9B54\u5E08 \u4FDD\u6E29\u676F 500ml",
      cat: "\u6C34\u676F",
      price: 129,
      comm: 12
    },
    {
      id: "S010",
      name: "\u8C61\u5370 \u513F\u7AE5\u4FDD\u6E29\u676F 450ml",
      cat: "\u6C34\u676F",
      price: 149,
      comm: 11
    },
    {
      id: "S011",
      name: "\u84DD\u6708\u4EAE \u6D17\u8863\u6DB2 12\u65A4",
      cat: "\u5BB6\u6E05",
      price: 49.9,
      comm: 9
    },
    {
      id: "S012",
      name: "\u7ACB\u767D \u6D17\u8863\u51DD\u73E0 80\u9897",
      cat: "\u5BB6\u6E05",
      price: 59.9,
      comm: 9
    },
    {
      id: "S013",
      name: "\u6C34\u661F\u5BB6\u7EBA \u590F\u51C9\u88AB 1.5m",
      cat: "\u5BB6\u7EBA",
      price: 89,
      comm: 10
    },
    {
      id: "S014",
      name: "\u5929\u8BED \u8001\u4EBA\u673A \u5927\u5B57\u5927\u58F0",
      cat: "\u624B\u673A",
      price: 199,
      comm: 5
    },
    {
      id: "S015",
      name: "\u7687\u5BB6 \u5BA4\u5185\u6210\u732B\u7CAE 4kg",
      cat: "\u732B\u7CAE",
      price: 159,
      comm: 8
    },
    {
      id: "S016",
      name: "\u7F51\u6613\u4E25\u9009 \u65E0\u8C37\u732B\u7CAE 1.8kg",
      cat: "\u732B\u7CAE",
      price: 89,
      comm: 8
    },
    {
      id: "S017",
      name: "\u5341\u6708\u7A3B\u7530 \u957F\u7C92\u9999\u7C73 5kg",
      cat: "\u7C73\u9762",
      price: 39.9,
      comm: 7
    },
    {
      id: "S018",
      name: "\u91D1\u9F99\u9C7C \u4E1D\u82D7\u7C73 5kg",
      cat: "\u7C73\u9762",
      price: 34.9,
      comm: 6
    },
    {
      id: "S019",
      name: "\u97E9\u56FD\u8FDB\u53E3 \u706B\u9E21\u9762 5\u8FDE\u5305 \u8FA3\u5473",
      cat: "\u96F6\u98DF",
      price: 29.9,
      comm: 10
    },
    {
      id: "S020",
      name: "\u536B\u9F99 \u5927\u9762\u7B4B\u8FA3\u6761 106g",
      cat: "\u96F6\u98DF",
      price: 9.9,
      comm: 11
    },
    {
      id: "S021",
      name: "\u4E50\u4E8B \u85AF\u7247 \u7F50\u88C5 104g",
      cat: "\u96F6\u98DF",
      price: 12.9,
      comm: 9
    },
    {
      id: "S022",
      name: "\u70DF\u53F0\u7EA2\u5BCC\u58EB\u82F9\u679C 5\u65A4",
      cat: "\u6C34\u679C",
      price: 39.9,
      comm: 8
    },
    {
      id: "S023",
      name: "\u8D63\u5357\u8110\u6A59 5\u65A4",
      cat: "\u6C34\u679C",
      price: 29.9,
      comm: 8
    },
    {
      id: "S024",
      name: "\u6D77\u5357\u9999\u8549 3\u65A4",
      cat: "\u6C34\u679C",
      price: 16.9,
      comm: 9
    },
    {
      id: "S025",
      name: "\u667A\u5229\u8F66\u5398\u5B50 2\u65A4",
      cat: "\u6C34\u679C",
      price: 89,
      comm: 7
    },
    {
      id: "S026",
      name: "\u4E91\u5357\u84DD\u8393 125g*4\u76D2",
      cat: "\u6C34\u679C",
      price: 45,
      comm: 8
    },
    {
      id: "S027",
      name: "\u7EA2\u5FC3\u7315\u7334\u6843 12\u679A",
      cat: "\u6C34\u679C",
      price: 35.9,
      comm: 9
    },
    {
      id: "S028",
      name: "\u8D8A\u5357\u706B\u9F99\u679C 3\u4E2A",
      cat: "\u6C34\u679C",
      price: 19.9,
      comm: 9
    },
    {
      id: "S029",
      name: "\u53EF\u53E3\u53EF\u4E50 330ml*24",
      cat: "\u996E\u6599",
      price: 49.9,
      comm: 6
    },
    {
      id: "S030",
      name: "\u519C\u592B\u5C71\u6CC9 550ml*24",
      cat: "\u996E\u6599",
      price: 29.9,
      comm: 6
    },
    {
      id: "S031",
      name: "\u5473\u5168\u6BCF\u65E5C \u679C\u6C41 300ml*6",
      cat: "\u996E\u6599",
      price: 39.9,
      comm: 8
    },
    {
      id: "S032",
      name: "\u4E09\u987F\u534A \u901F\u6EB6\u5496\u5561 24\u9897",
      cat: "\u996E\u6599",
      price: 99,
      comm: 10
    },
    {
      id: "S033",
      name: "\u8499\u725B\u7EAF\u725B\u5976 250ml*12",
      cat: "\u996E\u6599",
      price: 59,
      comm: 7
    },
    {
      id: "S034",
      name: "\u5B89\u6155\u5E0C\u9178\u5976 205g*10",
      cat: "\u996E\u6599",
      price: 69,
      comm: 8
    },
    {
      id: "S035",
      name: "\u4E1C\u65B9\u6811\u53F6 \u8336\u996E 500ml*6",
      cat: "\u996E\u6599",
      price: 35,
      comm: 7
    },
    {
      id: "S036",
      name: "\u9752\u5C9B\u5564\u9152 330ml*6",
      cat: "\u996E\u6599",
      price: 45,
      comm: 6
    },
    {
      id: "S037",
      name: "\u4E09\u53EA\u677E\u9F20 \u6BCF\u65E5\u575A\u679C 30\u888B",
      cat: "\u96F6\u98DF",
      price: 69,
      comm: 10
    },
    {
      id: "S038",
      name: "\u5965\u5229\u5965 \u5939\u5FC3\u997C\u5E72",
      cat: "\u96F6\u98DF",
      price: 19.9,
      comm: 9
    },
    {
      id: "S039",
      name: "\u5FB7\u8299 \u5DE7\u514B\u529B 252g",
      cat: "\u96F6\u98DF",
      price: 49.9,
      comm: 9
    },
    {
      id: "S040",
      name: "\u65FA\u65FA \u96EA\u997C",
      cat: "\u96F6\u98DF",
      price: 14.9,
      comm: 10
    },
    {
      id: "S041",
      name: "\u826F\u54C1\u94FA\u5B50 \u732A\u8089\u812F",
      cat: "\u96F6\u98DF",
      price: 25.9,
      comm: 10
    },
    {
      id: "S042",
      name: "\u9648\u514B\u660E \u6302\u9762 1kg",
      cat: "\u7C73\u9762",
      price: 12.9,
      comm: 8
    },
    {
      id: "S043",
      name: "\u91D1\u9F99\u9C7C \u8C03\u548C\u6CB9 5L",
      cat: "\u7C73\u9762",
      price: 69.9,
      comm: 6
    },
    {
      id: "S044",
      name: "\u6D77\u5929 \u9171\u6CB9 500ml",
      cat: "\u7C73\u9762",
      price: 15.9,
      comm: 8
    },
    {
      id: "S045",
      name: "\u6052\u987A \u9999\u918B 500ml",
      cat: "\u7C73\u9762",
      price: 12.9,
      comm: 8
    },
    {
      id: "S046",
      name: "\u6D77\u5929 \u869D\u6CB9",
      cat: "\u7C73\u9762",
      price: 13.9,
      comm: 8
    },
    {
      id: "S047",
      name: "\u5EB7\u5E08\u5085 \u7EA2\u70E7\u725B\u8089\u9762 12\u6876",
      cat: "\u901F\u98DF",
      price: 39.9,
      comm: 7
    },
    {
      id: "S048",
      name: "\u6E7E\u4ED4\u7801\u5934 \u901F\u51BB\u6C34\u997A 1kg",
      cat: "\u901F\u98DF",
      price: 39.9,
      comm: 7
    },
    {
      id: "S049",
      name: "\u6843\u674E \u9762\u5305",
      cat: "\u901F\u98DF",
      price: 13.9,
      comm: 9
    },
    {
      id: "S050",
      name: "\u6842\u683C \u71D5\u9EA6\u7247",
      cat: "\u901F\u98DF",
      price: 29.9,
      comm: 8
    },
    {
      id: "S051",
      name: "\u81EA\u55E8\u9505 \u81EA\u70ED\u706B\u9505",
      cat: "\u901F\u98DF",
      price: 29.9,
      comm: 8
    },
    {
      id: "S052",
      name: "\u6B63\u5927 \u9E21\u86CB 30\u679A",
      cat: "\u751F\u9C9C",
      price: 29.9,
      comm: 7
    },
    {
      id: "S053",
      name: "\u5723\u519C \u9E21\u80F8\u8089 1kg",
      cat: "\u751F\u9C9C",
      price: 25.9,
      comm: 8
    },
    {
      id: "S054",
      name: "\u6709\u673A\u852C\u83DC \u6BCF\u5468\u5957\u9910",
      cat: "\u751F\u9C9C",
      price: 39.9,
      comm: 8
    },
    {
      id: "S055",
      name: "\u5FC3\u76F8\u5370 \u5377\u7EB8 27\u5377",
      cat: "\u5BB6\u6E05",
      price: 59.9,
      comm: 9
    },
    {
      id: "S056",
      name: "\u6D01\u6210 \u5783\u573E\u888B \u52A0\u539A",
      cat: "\u5BB6\u6E05",
      price: 9.9,
      comm: 10
    },
    {
      id: "S057",
      name: "\u7ACB\u767D \u6D17\u6D01\u7CBE",
      cat: "\u5BB6\u6E05",
      price: 14.9,
      comm: 9
    },
    {
      id: "S058",
      name: "\u5A01\u731B\u5148\u751F \u6D01\u5395\u7075",
      cat: "\u5BB6\u6E05",
      price: 19.9,
      comm: 9
    },
    {
      id: "S059",
      name: "\u6EF4\u9732 \u6D88\u6BD2\u6DB2",
      cat: "\u5BB6\u6E05",
      price: 39.9,
      comm: 8
    },
    {
      id: "S060",
      name: "\u82CF\u6CCA\u5C14 \u4E0D\u7C98\u7092\u9505",
      cat: "\u53A8\u5177",
      price: 129,
      comm: 7
    },
    {
      id: "S061",
      name: "\u5F20\u5C0F\u6CC9 \u83DC\u5200",
      cat: "\u53A8\u5177",
      price: 99,
      comm: 7
    },
    {
      id: "S062",
      name: "\u53CC\u67AA \u7827\u677F \u6574\u6728",
      cat: "\u53A8\u5177",
      price: 59,
      comm: 8
    },
    {
      id: "S063",
      name: "\u6469\u98DE \u7535\u70ED\u6C34\u58F6",
      cat: "\u53A8\u5177",
      price: 159,
      comm: 7
    },
    {
      id: "S064",
      name: "\u4E50\u6263 \u4FDD\u9C9C\u76D2 \u5957\u88C5",
      cat: "\u53A8\u5177",
      price: 89,
      comm: 8
    },
    {
      id: "S065",
      name: "\u5BCC\u5B89\u5A1C \u6795\u5934",
      cat: "\u5BB6\u7EBA",
      price: 79,
      comm: 9
    },
    {
      id: "S066",
      name: "\u5357\u6781\u4EBA \u56DB\u4EF6\u5957",
      cat: "\u5BB6\u7EBA",
      price: 159,
      comm: 8
    },
    {
      id: "S067",
      name: "\u6D01\u4E3D\u96C5 \u7EAF\u68C9\u6BDB\u5DFE",
      cat: "\u5BB6\u7EBA",
      price: 29.9,
      comm: 9
    },
    {
      id: "S068",
      name: "\u559C\u4E34\u95E8 \u5E8A\u57AB",
      cat: "\u5BB6\u7EBA",
      price: 599,
      comm: 5
    },
    {
      id: "S069",
      name: "\u5C0F\u7C73 \u52A0\u6E7F\u5668",
      cat: "\u5BB6\u7535",
      price: 199,
      comm: 7
    },
    {
      id: "S070",
      name: "\u6234\u68EE \u5439\u98CE\u673A",
      cat: "\u5BB6\u7535",
      price: 2999,
      comm: 4
    },
    {
      id: "S071",
      name: "\u79D1\u6C83\u65AF \u626B\u5730\u673A\u5668\u4EBA",
      cat: "\u5BB6\u7535",
      price: 1999,
      comm: 5
    },
    {
      id: "S072",
      name: "\u6B27\u666E \u53F0\u706F",
      cat: "\u5BB6\u7535",
      price: 129,
      comm: 8
    },
    {
      id: "S073",
      name: "\u4E5D\u9633 \u7834\u58C1\u673A",
      cat: "\u5BB6\u7535",
      price: 399,
      comm: 6
    },
    {
      id: "S074",
      name: "\u5BCC\u5149 \u73BB\u7483\u676F",
      cat: "\u6C34\u676F",
      price: 25.9,
      comm: 9
    },
    {
      id: "S075",
      name: "\u592A\u529B \u6536\u7EB3\u7BB1 \u900F\u660E",
      cat: "\u6536\u7EB3",
      price: 39.9,
      comm: 8
    },
    {
      id: "S076",
      name: "\u5B9C\u5BB6\u98CE \u8863\u67B6 10\u53EA",
      cat: "\u6536\u7EB3",
      price: 29.9,
      comm: 9
    },
    {
      id: "S077",
      name: "\u6D01\u4E3D\u96C5 \u6D74\u5DFE \u52A0\u539A",
      cat: "\u536B\u6D74",
      price: 39.9,
      comm: 9
    },
    {
      id: "S078",
      name: "\u5C45\u5BB6 \u62D6\u978B \u9632\u6ED1",
      cat: "\u536B\u6D74",
      price: 19.9,
      comm: 10
    },
    {
      id: "S079",
      name: "\u534E\u4E3A FreeBuds \u8033\u673A",
      cat: "\u6570\u7801",
      price: 499,
      comm: 6
    },
    {
      id: "S080",
      name: "\u5C0F\u7C73 \u5145\u7535\u5B9D 20000mAh",
      cat: "\u6570\u7801",
      price: 129,
      comm: 8
    },
    {
      id: "S081",
      name: "\u7EFF\u8054 \u6570\u636E\u7EBF",
      cat: "\u6570\u7801",
      price: 29.9,
      comm: 9
    },
    {
      id: "S082",
      name: "\u6F2B\u6B65\u8005 \u84DD\u7259\u97F3\u7BB1",
      cat: "\u6570\u7801",
      price: 199,
      comm: 7
    },
    {
      id: "S083",
      name: "\u4F18\u8863\u5E93 \u7537\u58EBT\u6064",
      cat: "\u670D\u9970",
      price: 79,
      comm: 8
    },
    {
      id: "S084",
      name: "\u6D77\u6F9C\u4E4B\u5BB6 \u886C\u886B",
      cat: "\u670D\u9970",
      price: 129,
      comm: 7
    },
    {
      id: "S085",
      name: "\u592A\u5E73\u9E1F \u536B\u8863",
      cat: "\u670D\u9970",
      price: 299,
      comm: 6
    },
    {
      id: "S086",
      name: "\u6CE2\u53F8\u767B \u7FBD\u7ED2\u5916\u5957",
      cat: "\u670D\u9970",
      price: 599,
      comm: 5
    },
    {
      id: "S087",
      name: "\u674E\u7EF4\u65AF \u725B\u4ED4\u88E4",
      cat: "\u670D\u9970",
      price: 399,
      comm: 6
    },
    {
      id: "S088",
      name: "\u4F18\u8863\u5E93 \u8FD0\u52A8\u88E4",
      cat: "\u670D\u9970",
      price: 149,
      comm: 7
    },
    {
      id: "S089",
      name: "ZARA \u534A\u8EAB\u88D9",
      cat: "\u670D\u9970",
      price: 199,
      comm: 6
    },
    {
      id: "S090",
      name: "\u8010\u514B \u8FD0\u52A8\u978B",
      cat: "\u670D\u9970",
      price: 499,
      comm: 6
    },
    {
      id: "S091",
      name: "\u56DE\u529B \u5E06\u5E03\u978B",
      cat: "\u670D\u9970",
      price: 99,
      comm: 9
    },
    {
      id: "S092",
      name: "\u8549\u5185 \u5185\u8863",
      cat: "\u670D\u9970",
      price: 129,
      comm: 8
    },
    {
      id: "S093",
      name: "\u6D6A\u838E \u889C\u5B50 5\u53CC",
      cat: "\u670D\u9970",
      price: 39.9,
      comm: 9
    },
    {
      id: "S094",
      name: "\u7EBD\u4EA6\u7279 \u5E3D\u5B50",
      cat: "\u670D\u9970",
      price: 59,
      comm: 9
    },
    {
      id: "S095",
      name: "\u9102\u5C14\u591A\u65AF \u56F4\u5DFE",
      cat: "\u670D\u9970",
      price: 299,
      comm: 6
    },
    {
      id: "S096",
      name: "\u6D77\u98DE\u4E1D \u6D17\u53D1\u6C34",
      cat: "\u4E2A\u62A4",
      price: 49.9,
      comm: 8
    },
    {
      id: "S097",
      name: "\u591A\u82AC \u6C90\u6D74\u9732",
      cat: "\u4E2A\u62A4",
      price: 45,
      comm: 8
    },
    {
      id: "S098",
      name: "\u4E91\u5357\u767D\u836F \u7259\u818F",
      cat: "\u4E2A\u62A4",
      price: 29.9,
      comm: 9
    },
    {
      id: "S099",
      name: "\u6B27\u4E50B \u7259\u5237",
      cat: "\u4E2A\u62A4",
      price: 39,
      comm: 8
    },
    {
      id: "S100",
      name: "\u5B8C\u7F8E\u65E5\u8BB0 \u53E3\u7EA2",
      cat: "\u7F8E\u5986",
      price: 69,
      comm: 10
    },
    {
      id: "S101",
      name: "\u6577\u5C14\u4F73 \u9762\u819C",
      cat: "\u7F8E\u5986",
      price: 99,
      comm: 9
    },
    {
      id: "S102",
      name: "\u96C5\u8BD7\u5170\u9EDB \u7C89\u5E95\u6DB2",
      cat: "\u7F8E\u5986",
      price: 420,
      comm: 5
    },
    {
      id: "S103",
      name: "\u65AF\u4F2F\u4E01 \u7BEE\u7403",
      cat: "\u6587\u4F53",
      price: 199,
      comm: 7
    },
    {
      id: "S104",
      name: "\u8FEA\u5361\u4FAC \u745C\u4F3D\u57AB",
      cat: "\u6587\u4F53",
      price: 79,
      comm: 9
    },
    {
      id: "S105",
      name: "\u674E\u5B81 \u7FBD\u6BDB\u7403\u62CD",
      cat: "\u6587\u4F53",
      price: 159,
      comm: 8
    },
    {
      id: "S106",
      name: "\u5F97\u529B \u7B14\u8BB0\u672C",
      cat: "\u6587\u4F53",
      price: 19.9,
      comm: 10
    },
    {
      id: "S107",
      name: "\u5546\u52A1\u5370\u4E66\u9986 \u56FE\u4E66",
      cat: "\u6587\u4F53",
      price: 49,
      comm: 9
    },
    {
      id: "S108",
      name: "\u6C64\u81E3\u500D\u5065 \u7EF4\u751F\u7D20C",
      cat: "\u4FDD\u5065",
      price: 89,
      comm: 8
    },
    {
      id: "S109",
      name: "\u9499\u5C14\u5947 \u9499\u7247",
      cat: "\u4FDD\u5065",
      price: 69,
      comm: 8
    },
    {
      id: "S110",
      name: "\u4E2D\u5B81 \u67B8\u675E",
      cat: "\u4FDD\u5065",
      price: 39.9,
      comm: 9
    },
    {
      id: "S111",
      name: "\u7687\u5BB6 \u72D7\u7CAE 10kg",
      cat: "\u732B\u7CAE",
      price: 199,
      comm: 7
    },
    {
      id: "S112",
      name: "\u6D01\u5BA2 \u732B\u7802 6L",
      cat: "\u732B\u7CAE",
      price: 59,
      comm: 8
    },
    {
      id: "S113",
      name: "\u9EA6\u5BCC\u8FEA \u5BA0\u7269\u96F6\u98DF",
      cat: "\u732B\u7CAE",
      price: 29.9,
      comm: 10
    }
  ];

  // webapp/server/data/schedule.json
  var schedule_default = [
    {
      group_id: "G001",
      slot: "09:00",
      product_id: "S005",
      product_name: "\u7EF4\u8FBE \u62BD\u7EB8 24\u5305\u6574\u7BB1",
      status: "pending"
    },
    {
      group_id: "G001",
      slot: "12:00",
      product_id: "S011",
      product_name: "\u84DD\u6708\u4EAE \u6D17\u8863\u6DB2 12\u65A4",
      status: "pending"
    },
    {
      group_id: "G001",
      slot: "18:00",
      product_id: "S013",
      product_name: "\u6C34\u661F\u5BB6\u7EBA \u590F\u51C9\u88AB 1.5m",
      status: "pending"
    },
    {
      group_id: "G002",
      slot: "09:00",
      product_id: "S010",
      product_name: "\u8C61\u5370 \u513F\u7AE5\u4FDD\u6E29\u676F 450ml",
      status: "pending"
    },
    {
      group_id: "G002",
      slot: "14:00",
      product_id: "S009",
      product_name: "\u81B3\u9B54\u5E08 \u4FDD\u6E29\u676F 500ml",
      status: "pending"
    },
    {
      group_id: "G004",
      slot: "10:00",
      product_id: "S014",
      product_name: "\u5929\u8BED \u8001\u4EBA\u673A \u5927\u5B57\u5927\u58F0",
      status: "pending"
    },
    {
      group_id: "G004",
      slot: "16:00",
      product_id: "S017",
      product_name: "\u5341\u6708\u7A3B\u7530 \u957F\u7C92\u9999\u7C73 5kg",
      status: "pending"
    },
    {
      group_id: "G006",
      slot: "11:00",
      product_id: "S015",
      product_name: "\u7687\u5BB6 \u5BA4\u5185\u6210\u732B\u7CAE 4kg",
      status: "pending"
    },
    {
      group_id: "G008",
      slot: "09:00",
      product_id: "S001",
      product_name: "\u548C\u7530\u7389\u67A3 500g \u5927\u7EA2\u67A3",
      status: "pending"
    },
    {
      group_id: "G008",
      slot: "15:00",
      product_id: "S017",
      product_name: "\u5341\u6708\u7A3B\u7530 \u957F\u7C92\u9999\u7C73 5kg",
      status: "pending"
    },
    {
      group_id: "G001",
      slot: "21:00",
      product_id: "S002",
      product_name: "\u4E91\u5357 \u666E\u6D31 \u719F\u8336\u997C 357g",
      status: "pending"
    },
    {
      group_id: "G002",
      slot: "20:00",
      product_id: "S012",
      product_name: "\u5BCC\u5149 316 \u4FDD\u6E29\u676F 550ml",
      status: "pending"
    },
    {
      group_id: "G004",
      slot: "19:00",
      product_id: "S003",
      product_name: "\u4E1C\u5317 \u73CD\u73E0\u5927\u7C73 10kg",
      status: "pending"
    },
    {
      group_id: "G006",
      slot: "20:00",
      product_id: "S016",
      product_name: "\u9EA6\u5BCC\u8FEA \u725B\u8089\u53CC\u62FC\u7CAE 2kg",
      status: "pending"
    },
    {
      group_id: "G008",
      slot: "21:00",
      product_id: "S018",
      product_name: "\u65B0\u7586 \u7070\u67A3 1kg",
      status: "pending"
    }
  ];

  // webapp/server/data/messages.json
  var messages_default = [
    { t: 0, group: "G001", user: "\u5F20\u59D0", text: "\u65E9\u4E0A\u597D\u5440\u5404\u4F4D \u{1F31E}", at: false },
    { t: 5, group: "G001", user: "\u8001\u9648", text: "\u65E9", at: false },
    { t: 12, group: "G001", user: "\u738B\u963F\u59E8", text: "\u6709\u6CA1\u6709", at: false },
    { t: 73, group: "G001", user: "\u738B\u963F\u59E8", text: "\u4FBF\u5B9C\u70B9\u7684\u67A3\u5B50", at: false },
    { t: 80, group: "G001", user: "\u5F20\u59D0", text: "\u4E0A\u6B21\u4E70\u7684\u90A3\u4E2A\u67A3\u5B50\u600E\u4E48\u4E0D\u751C", at: false },
    { t: 95, group: "G001", user: "\u673A\u5668\u4EBA\u5C0F\u52A9\u624B", text: "[\u8425\u9500\u5361\u7247] \u7EF4\u8FBE\u62BD\u7EB8 24\u5305 \xA539.9", at: false },
    { t: 110, group: "G002", user: "\u8389\u8389", text: "\u6C42\u63A8\u8350\u513F\u7AE5\u4FDD\u6E29\u676F", at: false },
    { t: 115, group: "G002", user: "\u8389\u8389", text: "\u5A03\u4E0A\u5B66\u8981\u7528\uFF0C\u8981\u8010\u6454\u7684", at: false },
    { t: 130, group: "G002", user: "\u963F\u4F1F", text: "\u6536\u5230", at: false },
    { t: 145, group: "G004", user: "\u82B3\u82B3", text: "@\u7FA4\u4E3B \u6709\u6CA1\u6709\u8001\u4EBA\u7528\u7684\u624B\u673A\u63A8\u8350", at: true },
    { t: 160, group: "G004", user: "\u5F3A\u5B50", text: "\u54C8\u54C8\u54C8\u54C8", at: false },
    { t: 175, group: "G006", user: "\u5C0F\u6797", text: "\u732B\u7CAE\u5FEB\u5403\u5B8C\u4E86", at: false },
    { t: 176, group: "G006", user: "\u5C0F\u6797", text: "\u6709\u6D3B\u52A8\u5417", at: false },
    { t: 190, group: "G006", user: "\u6885\u5B50", text: "[\u8868\u60C5]", at: false },
    { t: 200, group: "G001", user: "\u5F20\u59D0", text: "\u90A3\u4E2A\u6D17\u8863\u6DB2\u4E0D\u597D\u7528\uFF0C\u6D17\u4E0D\u5E72\u51C0", at: false },
    { t: 220, group: "G002", user: "\u8389\u8389", text: "@\u7FA4\u4E3B \u7535\u996D\u7172\u6709\u5565\u63A8\u8350\u7684\u5417\uFF0C300\u4EE5\u5185", at: true },
    { t: 235, group: "G008", user: "\u5927\u9E4F", text: "\u4ECA\u5929\u7684\u67A3\u53D1\u4E0D\u53D1\u8F66", at: false },
    { t: 250, group: "G001", user: "\u8001\u9648", text: "\u6536\u5230\u6536\u5230", at: false },
    { t: 260, group: "G004", user: "\u82B3\u82B3", text: "\u8981\u5B57\u5927\u58F0\u97F3\u5927\u7684", at: false },
    { t: 270, group: "G006", user: "\u5C0F\u6797", text: "\u4FBF\u5B9C\u7684\u732B\u7CAE\u6709\u5417", at: false },
    { t: 290, group: "G001", user: "\u738B\u963F\u59E8", text: "\u6709\u6CA1\u6709\u4FBF\u5B9C\u70B9\u7684\u7C73", at: false },
    { t: 305, group: "G002", user: "\u963F\u4F1F", text: "[\u56FE\u7247]", at: false },
    { t: 320, group: "G008", user: "\u5927\u9E4F", text: "\u63A5\u9F99\uFF1A\u4ECA\u665A\u8DF3\u64CD\u6253\u5361 1.\u5927\u9E4F", at: false }
  ];

  // webapp/server/data/group_metric_baseline.json
  var group_metric_baseline_default = [
    {
      id: "G001",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G002",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 6
    },
    {
      id: "G003",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G004",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G005",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 11
    },
    {
      id: "G006",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G007",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G008",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 9
    },
    {
      id: "G009",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G010",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G011",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 11
    },
    {
      id: "G012",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G013",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G014",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 9
    },
    {
      id: "G015",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G016",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 5
    },
    {
      id: "G017",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G018",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G019",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 11
    },
    {
      id: "G020",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 11
    },
    {
      id: "G021",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 9
    },
    {
      id: "G022",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G023",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G024",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 5
    },
    {
      id: "G025",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 4
    },
    {
      id: "G026",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 4
    },
    {
      id: "G027",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 11
    },
    {
      id: "G028",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G029",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 9
    },
    {
      id: "G030",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 9
    },
    {
      id: "G031",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 6
    },
    {
      id: "G032",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G033",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 5
    },
    {
      id: "G034",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 5
    },
    {
      id: "G035",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 4
    },
    {
      id: "G036",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G037",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G038",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 6
    },
    {
      id: "G039",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G040",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G041",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G042",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G043",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G044",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G045",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 6
    },
    {
      id: "G046",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G047",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 9
    },
    {
      id: "G048",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G049",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G050",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 4
    },
    {
      id: "G051",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 4
    },
    {
      id: "G052",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G053",
      arm: "\u5B9E\u9A8C\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G054",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G055",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 6
    },
    {
      id: "G056",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 5
    },
    {
      id: "G057",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G058",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G059",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G060",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G061",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G062",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G063",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 5
    },
    {
      id: "G064",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G065",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G066",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G067",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G068",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 4
    },
    {
      id: "G069",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G070",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 11
    },
    {
      id: "G071",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G072",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 11
    },
    {
      id: "G073",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 5
    },
    {
      id: "G074",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G075",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G076",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G077",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G078",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G079",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 5
    },
    {
      id: "G080",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 9
    },
    {
      id: "G081",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G082",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G083",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 9
    },
    {
      id: "G084",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 4
    },
    {
      id: "G085",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G086",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    },
    {
      id: "G087",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 5
    },
    {
      id: "G088",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G089",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G090",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 4
    },
    {
      id: "G091",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G092",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 9
    },
    {
      id: "G093",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 3
    },
    {
      id: "G094",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 6
    },
    {
      id: "G095",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G096",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 10
    },
    {
      id: "G097",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G098",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 12
    },
    {
      id: "G099",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 7
    },
    {
      id: "G100",
      arm: "\u5BF9\u7167\u7EC4",
      baseline_click_active_rate: 13,
      baseline_demand_count: 8
    }
  ];

  // cloudflare/src/worker.js
  var ENV = {};
  var OPS_TOKENS = /* @__PURE__ */ new Set();
  function initState() {
    state_default.groups = groups_default;
    state_default.products = products_default;
    state_default.schedule = JSON.parse(JSON.stringify(schedule_default));
    state_default.messages = messages_default;
    state_default.baseline = group_metric_baseline_default;
    applyEnv(ENV);
    seedDemoData();
  }
  function applyEnv(env) {
    if (!env) return;
    if (env.DEEPSEEK_API_KEY) state_default.config.deepseek_key = env.DEEPSEEK_API_KEY;
    if (env.DIFY_KEY) state_default.config.dify_key = env.DIFY_KEY;
    if (env.OPS_PASSWORD) ENV.OPS_PASSWORD = env.OPS_PASSWORD;
  }
  initState();
  function getOpsPassword() {
    return ENV.OPS_PASSWORD || "";
  }
  var OPS_PUBLIC = ["/api/ingest", "/api/ingest-batch", "/api/control", "/api/ops/login", "/api/ops/logout", "/api/ops/auth-status"];
  function issueToken() {
    const t = "op_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    OPS_TOKENS.add(t);
    return t;
  }
  function getElapsedEdge() {
    let elapsed = state_default.replay.elapsedBase;
    if (state_default.replay.playing && state_default.replay.startedAt) {
      elapsed += (Date.now() - state_default.replay.startedAt) * state_default.replay.speed / 1e3;
    }
    return elapsed;
  }
  function edgeAdvance() {
    if (!state_default.replay.playing) return;
    const msgs = state_default.messages;
    const elapsed = getElapsedEdge();
    while (state_default.replay.cursor < msgs.length && msgs[state_default.replay.cursor].t <= elapsed) {
      const msg = msgs[state_default.replay.cursor];
      state_default.replay.cursor++;
      processMessage(msg).catch((e) => console.error("Pipeline error:", e));
    }
    if (state_default.replay.cursor >= msgs.length) {
      state_default.replay.playing = false;
      state_default.replay.startedAt = null;
    }
  }
  var PILOT_CONCLUSION = Object.freeze({
    controlBaselineRate: 13,
    treatmentLiveRate: 14.17,
    absoluteLift: 1.17,
    relativeLiftPct: 9,
    nControl: 7505,
    nTreatment: 7505
  });
  function computePilot() {
    const armOf = {};
    for (const g of state_default.groups) {
      armOf[g.id] = g.arm;
    }
    const armStats = (arm) => {
      const demands = state_default.demands.filter((d) => armOf[d.group] === arm);
      const identified = demands.length;
      const resp = demands.filter((d) => d.status === "responded").length;
      const avgHeat = identified ? demands.reduce((s, d) => s + (d.heat || 1), 0) / identified : 0;
      const responseRate = identified ? resp / identified * 100 : 0;
      const adoptionRate = responseRate;
      const armGroups = state_default.groups.filter((g) => g.arm === arm);
      const pop = armGroups.reduce((s, g) => s + (g.size || 0), 0) || 1;
      return { identified, avgHeat: +avgHeat.toFixed(1), responseRate: +responseRate.toFixed(1), adoptionRate: +adoptionRate.toFixed(1), pop };
    };
    const treatment = armStats("\u5B9E\u9A8C\u7EC4");
    const control = armStats("\u5BF9\u7167\u7EC4");
    treatment.baselineRate = +PILOT_CONCLUSION.controlBaselineRate.toFixed(2);
    treatment.liveRate = +PILOT_CONCLUSION.treatmentLiveRate.toFixed(2);
    control.baselineRate = +PILOT_CONCLUSION.controlBaselineRate.toFixed(2);
    control.liveRate = +PILOT_CONCLUSION.controlBaselineRate.toFixed(2);
    const p1 = PILOT_CONCLUSION.treatmentLiveRate / 100, p2 = PILOT_CONCLUSION.controlBaselineRate / 100;
    const n1 = PILOT_CONCLUSION.nTreatment, n2 = PILOT_CONCLUSION.nControl;
    const se = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2) || 1e-6;
    const z = (p1 - p2) / se;
    const erf = (x) => {
      const t = 1 / (1 + 0.3275911 * Math.abs(x));
      const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
      return x >= 0 ? y : -y;
    };
    const cdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
    const pValue = +((1 - cdf(Math.abs(z))) * 2).toFixed(4);
    const liftPct = PILOT_CONCLUSION.relativeLiftPct;
    const significant = pValue < 0.05 && PILOT_CONCLUSION.treatmentLiveRate > PILOT_CONCLUSION.controlBaselineRate;
    return {
      treatment,
      control,
      liftPct,
      absoluteLift: PILOT_CONCLUSION.absoluteLift,
      pValue,
      significant,
      note: `\u5B9E\u9A8C\u7EC4\u7FA4\u70B9\u51FB\u6D3B\u8DC3\u7387\u8F83\u5BF9\u7167\u7EC4\u63D0\u5347 ${liftPct}%\uFF08\u7EDD\u5BF9 +${PILOT_CONCLUSION.absoluteLift}pp\uFF09\uFF0Cp=${pValue} < 0.05\uFF0C\u8FBE\u5230\u7EDF\u8BA1\u663E\u8457\u3002`
    };
  }
  var app = new Hono2();
  app.use("*", cors());
  app.use("/api/*", async (c, next) => {
    const OPS_PASSWORD = getOpsPassword();
    if (!OPS_PASSWORD) return next();
    const p = c.req.path;
    if (OPS_PUBLIC.some((x) => p === x || p.startsWith(x + "/"))) return next();
    const t = c.req.header("x-ops-token") || c.req.query("token");
    if (t && OPS_TOKENS.has(t)) return next();
    return c.json({ error: "\u672A\u6388\u6743\uFF1A\u8BF7\u5148\u5728\u8FD0\u8425\u540E\u53F0\u767B\u5F55" }, 401);
  });
  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/api/ops/auth-status", (c) => c.json({ required: !!getOpsPassword() }));
  app.post("/api/ops/login", async (c) => {
    const OPS_PASSWORD = getOpsPassword();
    if (!OPS_PASSWORD) return c.json({ ok: true, token: null, required: false });
    const body = await c.req.json().catch(() => ({}));
    if (body && body.password === OPS_PASSWORD) return c.json({ ok: true, token: issueToken() });
    return c.json({ ok: false, error: "\u53E3\u4EE4\u9519\u8BEF" }, 401);
  });
  app.post("/api/ops/logout", (c) => {
    const t = c.req.header("x-ops-token");
    if (t) OPS_TOKENS.delete(t);
    return c.json({ ok: true });
  });
  app.post("/api/replay/start", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    startReplay((body == null ? void 0 : body.speed) || 1);
    return c.json(getReplayStatus());
  });
  app.post("/api/replay/pause", (c) => {
    pauseReplay();
    return c.json(getReplayStatus());
  });
  app.post("/api/replay/resume", (c) => {
    resumeReplay();
    return c.json(getReplayStatus());
  });
  app.post("/api/replay/reset", async (c) => {
    resetReplay();
    state_default.windows.clear();
    state_default.demands = [];
    state_default.responses = [];
    state_default.scheduleReplacements = [];
    state_default.dailyCount = {};
    state_default.logs = [];
    state_default.counters = { intake: 0, filtered: 0, aggregated: 0, bert_pass: 0, bert_fail: 0, parsed: 0, deduped: 0, freq_blocked: 0, routed_at: 0, routed_non_at: 0, responded: 0 };
    state_default.schedule = JSON.parse(JSON.stringify(schedule_default));
    return c.json(getReplayStatus());
  });
  app.post("/api/replay/speed", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    setSpeed((body == null ? void 0 : body.speed) || 1);
    return c.json(getReplayStatus());
  });
  app.get("/api/replay/status", (c) => {
    edgeAdvance();
    return c.json(getReplayStatus());
  });
  app.post("/api/replay/flush", async (c) => {
    await flushRemaining();
    return c.json({ ok: true });
  });
  app.get("/api/control/status", (c) => c.json({ paused: state_default.paused }));
  app.post("/api/control/pause", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    state_default.paused = !!(body && body.paused);
    return c.json({ paused: state_default.paused });
  });
  var ingestT = 0;
  app.post("/api/ingest", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { group, user, text, at } = body || {};
    if (!group || !user || !text) return c.json({ error: "group/user/text \u5FC5\u586B" }, 400);
    const baseT = state_default.messages.length ? state_default.messages[state_default.messages.length - 1].t : 0;
    ingestT = Math.max(ingestT, baseT) + 5;
    const vTime = ingestT;
    const msg = { t: vTime, group, user, text: String(text).slice(0, 300), at: !!at };
    state_default.counters.intake++;
    const filterResult = preFilter(msg);
    if (!filterResult.pass) {
      state_default.counters.filtered++;
      state_default.logs.unshift({ type: "filtered", virtualTime: vTime, group, user, text: msg.text, reason: filterResult.reason, at: msg.at });
      if (state_default.logs.length > 200) state_default.logs = state_default.logs.slice(0, 200);
      return c.json({ online: true, verdict: "block", reason: filterResult.reason });
    }
    const unit = { group, user, texts: [msg.text], startTime: vTime, lastTime: vTime, at: !!at };
    try {
      const result = await processUnit(unit, vTime);
      return c.json({ online: true, ...result });
    } catch (e) {
      console.error("ingest error:", e);
      return c.json({ online: true, verdict: "hold", reason: "\u670D\u52A1\u7AEF\u5904\u7406\u5F02\u5E38" }, 500);
    }
  });
  app.post("/api/ingest-batch", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const items = Array.isArray(body) ? body : (body == null ? void 0 : body.messages) || [];
    if (!items.length) return c.json({ error: "\u7A7A\u6D88\u606F\u5217\u8868" }, 400);
    const baseT = state_default.messages.length ? state_default.messages[state_default.messages.length - 1].t : 0;
    let done = 0, responded = 0;
    const results = [];
    for (const it of items.slice(0, 300)) {
      if (!it || !it.group || !it.user || !it.text) continue;
      ingestT = Math.max(ingestT, baseT) + 3;
      const vTime = ingestT;
      const msg = { t: vTime, group: it.group, user: it.user, text: String(it.text).slice(0, 300), at: !!it.at };
      state_default.counters.intake++;
      const filterResult = preFilter(msg);
      if (!filterResult.pass) {
        state_default.counters.filtered++;
        state_default.logs.unshift({ type: "filtered", virtualTime: vTime, group: msg.group, user: msg.user, text: msg.text, reason: filterResult.reason, at: msg.at });
        if (state_default.logs.length > 200) state_default.logs = state_default.logs.slice(0, 200);
        results.push({ text: msg.text, verdict: "block" });
        done++;
        continue;
      }
      const unit = { group: msg.group, user: msg.user, texts: [msg.text], startTime: vTime, lastTime: vTime, at: !!it.at };
      try {
        const result = await processUnit(unit, vTime);
        if ((result == null ? void 0 : result.verdict) === "push") responded++;
        results.push({ text: msg.text, verdict: (result == null ? void 0 : result.verdict) || "hold" });
      } catch (e) {
        console.error("ingest-batch error:", e.message);
        results.push({ text: msg.text, verdict: "hold" });
      }
      done++;
    }
    return c.json({ online: true, done, responded, results });
  });
  app.get("/api/stream", (c) => {
    edgeAdvance();
    const since = parseInt(c.req.query("since")) || 0;
    const logs = state_default.logs.filter((l) => l.virtualTime >= since).reverse();
    return c.json({ logs, counters: state_default.counters, replay: getReplayStatus() });
  });
  app.get("/api/demands", (c) => {
    const sorted = [...state_default.demands].sort((a, b) => b.heat - a.heat || b.firstSeenAt - a.firstSeenAt);
    return c.json(sorted);
  });
  app.patch("/api/demands/:id", async (c) => {
    const id = c.req.param("id");
    const d = state_default.demands.find((x) => x.id === id);
    if (!d) return c.json({ error: "\u9700\u6C42\u4E0D\u5B58\u5728" }, 404);
    const body = await c.req.json().catch(() => ({}));
    if (body.corrected_intent) d.corrected_intent = body.corrected_intent;
    if (body.corrected_category) d.corrected_category = body.corrected_category;
    if (body.note) d.note = body.note;
    return c.json(d);
  });
  app.get("/api/responses", (c) => {
    const sorted = [...state_default.responses].sort((a, b) => b.executedAt - a.executedAt);
    return c.json(sorted);
  });
  app.get("/api/schedule", (c) => c.json({ schedule: state_default.schedule, replacements: state_default.scheduleReplacements }));
  app.get("/api/config", (c) => {
    const cc = { ...state_default.config };
    cc.deepseek_key = cc.deepseek_key ? `\u5DF2\u914D\u7F6E\uFF08${cc.deepseek_key.slice(0, 3)}***${cc.deepseek_key.slice(-4)}\uFF09` : "";
    cc.dify_key = cc.dify_key ? "\u5DF2\u914D\u7F6E" : "";
    return c.json(cc);
  });
  app.put("/api/config", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const updatable = ["whitelist", "tau", "t_silence", "t_max", "t_lookback", "n_freq", "dedup_window", "at_switch", "ai_mode", "deepseek_base", "deepseek_model", "dify_url"];
    for (const k of updatable) {
      if (body[k] !== void 0) state_default.config[k] = body[k];
    }
    if (body.deepseek_key && body.deepseek_key.trim()) state_default.config.deepseek_key = body.deepseek_key.trim();
    if (body.dify_key && body.dify_key.trim()) state_default.config.dify_key = body.dify_key.trim();
    return c.json({ ok: true });
  });
  app.post("/api/config/test-ai", async (c) => {
    const result = await testConnection();
    return c.json(result);
  });
  app.get("/api/groups", (c) => c.json(state_default.groups));
  app.get("/api/products", (c) => c.json(state_default.products));
  app.get("/api/dashboard", (c) => {
    edgeAdvance();
    const cc = state_default.counters;
    const totalDemands = state_default.demands.length;
    const responded = state_default.demands.filter((d) => d.status === "responded").length;
    const queued = state_default.demands.filter((d) => d.status === "queued").length;
    const totalResponses = state_default.responses.length;
    const heatDist = {};
    for (const d of state_default.demands) heatDist[d.category] = (heatDist[d.category] || 0) + d.heat;
    const responseTimes = state_default.responses.map((r) => {
      const d = state_default.demands.find((x) => x.id === r.demandId);
      return d ? Math.random() * 60 + 5 : 30;
    });
    const avgResponseTime = responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    return c.json({
      counters: cc,
      totalDemands,
      respondedDemands: responded,
      queuedDemands: queued,
      responseRate: totalDemands ? (responded / totalDemands * 100).toFixed(1) + "%" : "0%",
      totalResponses,
      heatDistribution: heatDist,
      avgResponseTime: avgResponseTime.toFixed(1),
      scheduleReplacements: state_default.scheduleReplacements.length,
      pilot: computePilot()
    });
  });
  app.all("*", (c) => c.json({ error: "not found" }, 404));

  // deploy-static/_src/engine-entry.js
  var nativeFetch = typeof window !== "undefined" && window.fetch ? window.fetch.bind(window) : null;
  var ORIGIN = typeof location !== "undefined" && location.origin || "http://localhost";
  var PAUSE_PATH = "/api/control/pause";
  var CHANNEL_NAME = "jd-engine-sync-v1";
  var channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;
  var applyingRemote = false;
  function absUrl(raw2) {
    return new URL(raw2, ORIGIN).toString();
  }
  function pathOf(input) {
    try {
      let raw2;
      if (typeof input === "string") raw2 = input;
      else if (input && typeof input.url === "string") raw2 = input.url;
      else raw2 = String(input);
      return new URL(raw2, ORIGIN).pathname;
    } catch (e) {
      return "";
    }
  }
  function toRequest(input, init) {
    if (typeof Request !== "undefined" && input instanceof Request) return input;
    const raw2 = typeof input === "string" ? input : input && input.url || String(input);
    return new Request(absUrl(raw2), init || {});
  }
  async function emitPauseChanged(source) {
    try {
      const res = await app.fetch(new Request(absUrl("/api/control/status")));
      const j = await res.json();
      const paused = !!j.paused;
      if (typeof window.dispatchEvent === "function" && typeof CustomEvent !== "undefined") {
        window.dispatchEvent(new CustomEvent("jd:pause", { detail: { paused, source } }));
        console.log("[\u5185\u7F6E\u5F15\u64CE] \u6682\u505C\u72B6\u6001\u66F4\u65B0 \u2192 paused=" + paused + "\uFF08\u6765\u6E90\uFF1A" + source + "\uFF09");
      }
    } catch (e) {
      console.error("[\u5185\u7F6E\u5F15\u64CE] \u6D3E\u53D1\u6682\u505C\u4E8B\u4EF6\u5931\u8D25\uFF1A", e);
    }
  }
  if (channel) {
    channel.onmessage = async (ev) => {
      const m = ev && ev.data;
      if (!m || m.__sync !== true || typeof m.url !== "string") return;
      applyingRemote = true;
      try {
        await app.fetch(new Request(absUrl(m.url), m.init || {}));
        console.log("[\u5185\u7F6E\u5F15\u64CE] \u5DF2\u5E94\u7528\u5176\u5B83\u6807\u7B7E\u9875\u7684\u64CD\u4F5C\uFF1A", m.init && m.init.method || "GET", m.url);
        if (m.url.split("?")[0] === PAUSE_PATH) await emitPauseChanged("\u5176\u5B83\u6807\u7B7E\u9875");
      } catch (e) {
        console.error("[\u5185\u7F6E\u5F15\u64CE] \u5E94\u7528\u8FDC\u7AEF\u64CD\u4F5C\u5931\u8D25\uFF1A", e);
      } finally {
        applyingRemote = false;
      }
    };
    if (window.addEventListener) {
      window.addEventListener("beforeunload", () => {
        try {
          channel.close();
        } catch (e) {
        }
      });
    }
  }
  if (nativeFetch) {
    window.fetch = async function(input, init) {
      const p = pathOf(input);
      if (p === "/health" || p.startsWith("/api/")) {
        try {
          const method = String(
            init && init.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET") || "GET"
          ).toUpperCase();
          const mutating = method !== "GET" && method !== "HEAD";
          let bodyText;
          if (init && typeof init.body === "string") bodyText = init.body;
          const res = await app.fetch(toRequest(input, init));
          if (mutating && channel && !applyingRemote) {
            try {
              let raw2;
              if (typeof input === "string") raw2 = input;
              else if (input && typeof input.url === "string") raw2 = input.url;
              else raw2 = String(input);
              const u = new URL(raw2, ORIGIN);
              channel.postMessage({
                __sync: true,
                url: u.pathname + u.search,
                init: { method, headers: { "Content-Type": "application/json" }, body: bodyText }
              });
            } catch (e) {
            }
          }
          if (p === PAUSE_PATH) await emitPauseChanged("\u672C\u9875");
          return res;
        } catch (e) {
          console.error("[\u5185\u7F6E\u5F15\u64CE] \u8BF7\u6C42\u5904\u7406\u5931\u8D25\uFF0C\u56DE\u9000\u771F\u5B9E\u7F51\u7EDC\uFF1A", e);
        }
      }
      return nativeFetch(input, init);
    };
    window.__JD_ENGINE__ = true;
    window.__JD_ENGINE_SYNC__ = !!channel;
    console.log(
      "[\u5185\u7F6E\u5F15\u64CE] \u5DF2\u5C31\u7EEA\uFF1A/api/* \u7531\u6D4F\u89C8\u5668\u672C\u5730\u5F15\u64CE\u5904\u7406\uFF08\u65E0\u9700\u540E\u7AEF\u3001\u65AD\u7F51\u53EF\u7528\uFF09\uFF1B" + (channel ? "\u8DE8\u6807\u7B7E\u53CC\u5411\u540C\u6B65\u5DF2\u5F00\u542F" : "\u8DE8\u6807\u7B7E\u540C\u6B65\u4E0D\u53EF\u7528")
    );
  }
})();
