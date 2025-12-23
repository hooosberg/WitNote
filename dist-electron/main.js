"use strict";
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
var _validator, _encryptionKey, _options, _defaultValues, _isInMigration, _watcher, _watchFile, _debouncedChangeHandler, _Conf_instances, prepareOptions_fn, setupValidator_fn, captureSchemaDefaults_fn, applyDefaultValues_fn, configureSerialization_fn, resolvePath_fn, initializeStore_fn, runMigrations_fn;
const electron = require("electron");
const path = require("path");
const fs$1 = require("fs");
const process$1 = require("node:process");
const sp = require("node:path");
const node_util = require("node:util");
const fs = require("node:fs");
const crypto = require("node:crypto");
const assert = require("node:assert");
const os = require("node:os");
const node_events = require("node:events");
const node_stream = require("node:stream");
const promises = require("node:fs/promises");
const child_process = require("child_process");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const sp__namespace = /* @__PURE__ */ _interopNamespaceDefault(sp);
const isObject = (value) => {
  const type2 = typeof value;
  return value !== null && (type2 === "object" || type2 === "function");
};
const disallowedKeys = /* @__PURE__ */ new Set([
  "__proto__",
  "prototype",
  "constructor"
]);
const MAX_ARRAY_INDEX = 1e6;
const isDigit = (character) => character >= "0" && character <= "9";
function shouldCoerceToNumber(segment) {
  if (segment === "0") {
    return true;
  }
  if (/^[1-9]\d*$/.test(segment)) {
    const parsedNumber = Number.parseInt(segment, 10);
    return parsedNumber <= Number.MAX_SAFE_INTEGER && parsedNumber <= MAX_ARRAY_INDEX;
  }
  return false;
}
function processSegment(segment, parts) {
  if (disallowedKeys.has(segment)) {
    return false;
  }
  if (segment && shouldCoerceToNumber(segment)) {
    parts.push(Number.parseInt(segment, 10));
  } else {
    parts.push(segment);
  }
  return true;
}
function parsePath(path2) {
  if (typeof path2 !== "string") {
    throw new TypeError(`Expected a string, got ${typeof path2}`);
  }
  const parts = [];
  let currentSegment = "";
  let currentPart = "start";
  let isEscaping = false;
  let position = 0;
  for (const character of path2) {
    position++;
    if (isEscaping) {
      currentSegment += character;
      isEscaping = false;
      continue;
    }
    if (character === "\\") {
      if (currentPart === "index") {
        throw new Error(`Invalid character '${character}' in an index at position ${position}`);
      }
      if (currentPart === "indexEnd") {
        throw new Error(`Invalid character '${character}' after an index at position ${position}`);
      }
      isEscaping = true;
      currentPart = currentPart === "start" ? "property" : currentPart;
      continue;
    }
    switch (character) {
      case ".": {
        if (currentPart === "index") {
          throw new Error(`Invalid character '${character}' in an index at position ${position}`);
        }
        if (currentPart === "indexEnd") {
          currentPart = "property";
          break;
        }
        if (!processSegment(currentSegment, parts)) {
          return [];
        }
        currentSegment = "";
        currentPart = "property";
        break;
      }
      case "[": {
        if (currentPart === "index") {
          throw new Error(`Invalid character '${character}' in an index at position ${position}`);
        }
        if (currentPart === "indexEnd") {
          currentPart = "index";
          break;
        }
        if (currentPart === "property" || currentPart === "start") {
          if ((currentSegment || currentPart === "property") && !processSegment(currentSegment, parts)) {
            return [];
          }
          currentSegment = "";
        }
        currentPart = "index";
        break;
      }
      case "]": {
        if (currentPart === "index") {
          if (currentSegment === "") {
            const lastSegment = parts.pop() || "";
            currentSegment = lastSegment + "[]";
            currentPart = "property";
          } else {
            const parsedNumber = Number.parseInt(currentSegment, 10);
            const isValidInteger = !Number.isNaN(parsedNumber) && Number.isFinite(parsedNumber) && parsedNumber >= 0 && parsedNumber <= Number.MAX_SAFE_INTEGER && parsedNumber <= MAX_ARRAY_INDEX && currentSegment === String(parsedNumber);
            if (isValidInteger) {
              parts.push(parsedNumber);
            } else {
              parts.push(currentSegment);
            }
            currentSegment = "";
            currentPart = "indexEnd";
          }
          break;
        }
        if (currentPart === "indexEnd") {
          throw new Error(`Invalid character '${character}' after an index at position ${position}`);
        }
        currentSegment += character;
        break;
      }
      default: {
        if (currentPart === "index" && !isDigit(character)) {
          throw new Error(`Invalid character '${character}' in an index at position ${position}`);
        }
        if (currentPart === "indexEnd") {
          throw new Error(`Invalid character '${character}' after an index at position ${position}`);
        }
        if (currentPart === "start") {
          currentPart = "property";
        }
        currentSegment += character;
      }
    }
  }
  if (isEscaping) {
    currentSegment += "\\";
  }
  switch (currentPart) {
    case "property": {
      if (!processSegment(currentSegment, parts)) {
        return [];
      }
      break;
    }
    case "index": {
      throw new Error("Index was not closed");
    }
    case "start": {
      parts.push("");
      break;
    }
  }
  return parts;
}
function normalizePath$1(path2) {
  if (typeof path2 === "string") {
    return parsePath(path2);
  }
  if (Array.isArray(path2)) {
    const normalized = [];
    for (const [index, segment] of path2.entries()) {
      if (typeof segment !== "string" && typeof segment !== "number") {
        throw new TypeError(`Expected a string or number for path segment at index ${index}, got ${typeof segment}`);
      }
      if (typeof segment === "number" && !Number.isFinite(segment)) {
        throw new TypeError(`Path segment at index ${index} must be a finite number, got ${segment}`);
      }
      if (disallowedKeys.has(segment)) {
        return [];
      }
      if (typeof segment === "string" && shouldCoerceToNumber(segment)) {
        normalized.push(Number.parseInt(segment, 10));
      } else {
        normalized.push(segment);
      }
    }
    return normalized;
  }
  return [];
}
function getProperty(object, path2, value) {
  if (!isObject(object) || typeof path2 !== "string" && !Array.isArray(path2)) {
    return value === void 0 ? object : value;
  }
  const pathArray = normalizePath$1(path2);
  if (pathArray.length === 0) {
    return value;
  }
  for (let index = 0; index < pathArray.length; index++) {
    const key = pathArray[index];
    object = object[key];
    if (object === void 0 || object === null) {
      if (index !== pathArray.length - 1) {
        return value;
      }
      break;
    }
  }
  return object === void 0 ? value : object;
}
function setProperty(object, path2, value) {
  if (!isObject(object) || typeof path2 !== "string" && !Array.isArray(path2)) {
    return object;
  }
  const root = object;
  const pathArray = normalizePath$1(path2);
  if (pathArray.length === 0) {
    return object;
  }
  for (let index = 0; index < pathArray.length; index++) {
    const key = pathArray[index];
    if (index === pathArray.length - 1) {
      object[key] = value;
    } else if (!isObject(object[key])) {
      const nextKey = pathArray[index + 1];
      const shouldCreateArray = typeof nextKey === "number";
      object[key] = shouldCreateArray ? [] : {};
    }
    object = object[key];
  }
  return root;
}
function deleteProperty(object, path2) {
  if (!isObject(object) || typeof path2 !== "string" && !Array.isArray(path2)) {
    return false;
  }
  const pathArray = normalizePath$1(path2);
  if (pathArray.length === 0) {
    return false;
  }
  for (let index = 0; index < pathArray.length; index++) {
    const key = pathArray[index];
    if (index === pathArray.length - 1) {
      const existed = Object.hasOwn(object, key);
      if (!existed) {
        return false;
      }
      delete object[key];
      return true;
    }
    object = object[key];
    if (!isObject(object)) {
      return false;
    }
  }
}
function hasProperty(object, path2) {
  if (!isObject(object) || typeof path2 !== "string" && !Array.isArray(path2)) {
    return false;
  }
  const pathArray = normalizePath$1(path2);
  if (pathArray.length === 0) {
    return false;
  }
  for (const key of pathArray) {
    if (!isObject(object) || !(key in object)) {
      return false;
    }
    object = object[key];
  }
  return true;
}
const homedir = os.homedir();
const tmpdir = os.tmpdir();
const { env } = process$1;
const macos = (name) => {
  const library = sp.join(homedir, "Library");
  return {
    data: sp.join(library, "Application Support", name),
    config: sp.join(library, "Preferences", name),
    cache: sp.join(library, "Caches", name),
    log: sp.join(library, "Logs", name),
    temp: sp.join(tmpdir, name)
  };
};
const windows = (name) => {
  const appData = env.APPDATA || sp.join(homedir, "AppData", "Roaming");
  const localAppData = env.LOCALAPPDATA || sp.join(homedir, "AppData", "Local");
  return {
    // Data/config/cache/log are invented by me as Windows isn't opinionated about this
    data: sp.join(localAppData, name, "Data"),
    config: sp.join(appData, name, "Config"),
    cache: sp.join(localAppData, name, "Cache"),
    log: sp.join(localAppData, name, "Log"),
    temp: sp.join(tmpdir, name)
  };
};
const linux = (name) => {
  const username = sp.basename(homedir);
  return {
    data: sp.join(env.XDG_DATA_HOME || sp.join(homedir, ".local", "share"), name),
    config: sp.join(env.XDG_CONFIG_HOME || sp.join(homedir, ".config"), name),
    cache: sp.join(env.XDG_CACHE_HOME || sp.join(homedir, ".cache"), name),
    // https://wiki.debian.org/XDGBaseDirectorySpecification#state
    log: sp.join(env.XDG_STATE_HOME || sp.join(homedir, ".local", "state"), name),
    temp: sp.join(tmpdir, username, name)
  };
};
function envPaths(name, { suffix = "nodejs" } = {}) {
  if (typeof name !== "string") {
    throw new TypeError(`Expected a string, got ${typeof name}`);
  }
  if (suffix) {
    name += `-${suffix}`;
  }
  if (process$1.platform === "darwin") {
    return macos(name);
  }
  if (process$1.platform === "win32") {
    return windows(name);
  }
  return linux(name);
}
const attemptifyAsync = (fn, options) => {
  const { onError } = options;
  return function attemptified(...args) {
    return fn.apply(void 0, args).catch(onError);
  };
};
const attemptifySync = (fn, options) => {
  const { onError } = options;
  return function attemptified(...args) {
    try {
      return fn.apply(void 0, args);
    } catch (error2) {
      return onError(error2);
    }
  };
};
const RETRY_INTERVAL = 250;
const retryifyAsync = (fn, options) => {
  const { isRetriable } = options;
  return function retryified(options2) {
    const { timeout } = options2;
    const interval = options2.interval ?? RETRY_INTERVAL;
    const timestamp = Date.now() + timeout;
    return function attempt(...args) {
      return fn.apply(void 0, args).catch((error2) => {
        if (!isRetriable(error2))
          throw error2;
        if (Date.now() >= timestamp)
          throw error2;
        const delay = Math.round(interval * Math.random());
        if (delay > 0) {
          const delayPromise = new Promise((resolve2) => setTimeout(resolve2, delay));
          return delayPromise.then(() => attempt.apply(void 0, args));
        } else {
          return attempt.apply(void 0, args);
        }
      });
    };
  };
};
const retryifySync = (fn, options) => {
  const { isRetriable } = options;
  return function retryified(options2) {
    const { timeout } = options2;
    const timestamp = Date.now() + timeout;
    return function attempt(...args) {
      while (true) {
        try {
          return fn.apply(void 0, args);
        } catch (error2) {
          if (!isRetriable(error2))
            throw error2;
          if (Date.now() >= timestamp)
            throw error2;
          continue;
        }
      }
    };
  };
};
const Handlers = {
  /* API */
  isChangeErrorOk: (error2) => {
    if (!Handlers.isNodeError(error2))
      return false;
    const { code: code2 } = error2;
    if (code2 === "ENOSYS")
      return true;
    if (!IS_USER_ROOT && (code2 === "EINVAL" || code2 === "EPERM"))
      return true;
    return false;
  },
  isNodeError: (error2) => {
    return error2 instanceof Error;
  },
  isRetriableError: (error2) => {
    if (!Handlers.isNodeError(error2))
      return false;
    const { code: code2 } = error2;
    if (code2 === "EMFILE" || code2 === "ENFILE" || code2 === "EAGAIN" || code2 === "EBUSY" || code2 === "EACCESS" || code2 === "EACCES" || code2 === "EACCS" || code2 === "EPERM")
      return true;
    return false;
  },
  onChangeError: (error2) => {
    if (!Handlers.isNodeError(error2))
      throw error2;
    if (Handlers.isChangeErrorOk(error2))
      return;
    throw error2;
  }
};
const ATTEMPTIFY_CHANGE_ERROR_OPTIONS = {
  onError: Handlers.onChangeError
};
const ATTEMPTIFY_NOOP_OPTIONS = {
  onError: () => void 0
};
const IS_USER_ROOT = process$1.getuid ? !process$1.getuid() : false;
const RETRYIFY_OPTIONS = {
  isRetriable: Handlers.isRetriableError
};
const FS = {
  attempt: {
    /* ASYNC */
    chmod: attemptifyAsync(node_util.promisify(fs.chmod), ATTEMPTIFY_CHANGE_ERROR_OPTIONS),
    chown: attemptifyAsync(node_util.promisify(fs.chown), ATTEMPTIFY_CHANGE_ERROR_OPTIONS),
    close: attemptifyAsync(node_util.promisify(fs.close), ATTEMPTIFY_NOOP_OPTIONS),
    fsync: attemptifyAsync(node_util.promisify(fs.fsync), ATTEMPTIFY_NOOP_OPTIONS),
    mkdir: attemptifyAsync(node_util.promisify(fs.mkdir), ATTEMPTIFY_NOOP_OPTIONS),
    realpath: attemptifyAsync(node_util.promisify(fs.realpath), ATTEMPTIFY_NOOP_OPTIONS),
    stat: attemptifyAsync(node_util.promisify(fs.stat), ATTEMPTIFY_NOOP_OPTIONS),
    unlink: attemptifyAsync(node_util.promisify(fs.unlink), ATTEMPTIFY_NOOP_OPTIONS),
    /* SYNC */
    chmodSync: attemptifySync(fs.chmodSync, ATTEMPTIFY_CHANGE_ERROR_OPTIONS),
    chownSync: attemptifySync(fs.chownSync, ATTEMPTIFY_CHANGE_ERROR_OPTIONS),
    closeSync: attemptifySync(fs.closeSync, ATTEMPTIFY_NOOP_OPTIONS),
    existsSync: attemptifySync(fs.existsSync, ATTEMPTIFY_NOOP_OPTIONS),
    fsyncSync: attemptifySync(fs.fsync, ATTEMPTIFY_NOOP_OPTIONS),
    mkdirSync: attemptifySync(fs.mkdirSync, ATTEMPTIFY_NOOP_OPTIONS),
    realpathSync: attemptifySync(fs.realpathSync, ATTEMPTIFY_NOOP_OPTIONS),
    statSync: attemptifySync(fs.statSync, ATTEMPTIFY_NOOP_OPTIONS),
    unlinkSync: attemptifySync(fs.unlinkSync, ATTEMPTIFY_NOOP_OPTIONS)
  },
  retry: {
    /* ASYNC */
    close: retryifyAsync(node_util.promisify(fs.close), RETRYIFY_OPTIONS),
    fsync: retryifyAsync(node_util.promisify(fs.fsync), RETRYIFY_OPTIONS),
    open: retryifyAsync(node_util.promisify(fs.open), RETRYIFY_OPTIONS),
    readFile: retryifyAsync(node_util.promisify(fs.readFile), RETRYIFY_OPTIONS),
    rename: retryifyAsync(node_util.promisify(fs.rename), RETRYIFY_OPTIONS),
    stat: retryifyAsync(node_util.promisify(fs.stat), RETRYIFY_OPTIONS),
    write: retryifyAsync(node_util.promisify(fs.write), RETRYIFY_OPTIONS),
    writeFile: retryifyAsync(node_util.promisify(fs.writeFile), RETRYIFY_OPTIONS),
    /* SYNC */
    closeSync: retryifySync(fs.closeSync, RETRYIFY_OPTIONS),
    fsyncSync: retryifySync(fs.fsyncSync, RETRYIFY_OPTIONS),
    openSync: retryifySync(fs.openSync, RETRYIFY_OPTIONS),
    readFileSync: retryifySync(fs.readFileSync, RETRYIFY_OPTIONS),
    renameSync: retryifySync(fs.renameSync, RETRYIFY_OPTIONS),
    statSync: retryifySync(fs.statSync, RETRYIFY_OPTIONS),
    writeSync: retryifySync(fs.writeSync, RETRYIFY_OPTIONS),
    writeFileSync: retryifySync(fs.writeFileSync, RETRYIFY_OPTIONS)
  }
};
const DEFAULT_ENCODING = "utf8";
const DEFAULT_FILE_MODE = 438;
const DEFAULT_FOLDER_MODE = 511;
const DEFAULT_WRITE_OPTIONS = {};
const DEFAULT_USER_UID = process$1.geteuid ? process$1.geteuid() : -1;
const DEFAULT_USER_GID = process$1.getegid ? process$1.getegid() : -1;
const DEFAULT_TIMEOUT_SYNC = 1e3;
const IS_POSIX = !!process$1.getuid;
process$1.getuid ? !process$1.getuid() : false;
const LIMIT_BASENAME_LENGTH = 128;
const isException = (value) => {
  return value instanceof Error && "code" in value;
};
const isString = (value) => {
  return typeof value === "string";
};
const isUndefined = (value) => {
  return value === void 0;
};
const IS_LINUX = process$1.platform === "linux";
const IS_WINDOWS = process$1.platform === "win32";
const Signals = ["SIGHUP", "SIGINT", "SIGTERM"];
if (!IS_WINDOWS) {
  Signals.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
}
if (IS_LINUX) {
  Signals.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
}
class Interceptor {
  /* CONSTRUCTOR */
  constructor() {
    this.callbacks = /* @__PURE__ */ new Set();
    this.exited = false;
    this.exit = (signal) => {
      if (this.exited)
        return;
      this.exited = true;
      for (const callback of this.callbacks) {
        callback();
      }
      if (signal) {
        if (IS_WINDOWS && (signal !== "SIGINT" && signal !== "SIGTERM" && signal !== "SIGKILL")) {
          process$1.kill(process$1.pid, "SIGTERM");
        } else {
          process$1.kill(process$1.pid, signal);
        }
      }
    };
    this.hook = () => {
      process$1.once("exit", () => this.exit());
      for (const signal of Signals) {
        try {
          process$1.once(signal, () => this.exit(signal));
        } catch {
        }
      }
    };
    this.register = (callback) => {
      this.callbacks.add(callback);
      return () => {
        this.callbacks.delete(callback);
      };
    };
    this.hook();
  }
}
const Interceptor$1 = new Interceptor();
const whenExit = Interceptor$1.register;
const Temp = {
  /* VARIABLES */
  store: {},
  // filePath => purge
  /* API */
  create: (filePath) => {
    const randomness = `000000${Math.floor(Math.random() * 16777215).toString(16)}`.slice(-6);
    const timestamp = Date.now().toString().slice(-10);
    const prefix = "tmp-";
    const suffix = `.${prefix}${timestamp}${randomness}`;
    const tempPath = `${filePath}${suffix}`;
    return tempPath;
  },
  get: (filePath, creator, purge = true) => {
    const tempPath = Temp.truncate(creator(filePath));
    if (tempPath in Temp.store)
      return Temp.get(filePath, creator, purge);
    Temp.store[tempPath] = purge;
    const disposer = () => delete Temp.store[tempPath];
    return [tempPath, disposer];
  },
  purge: (filePath) => {
    if (!Temp.store[filePath])
      return;
    delete Temp.store[filePath];
    FS.attempt.unlink(filePath);
  },
  purgeSync: (filePath) => {
    if (!Temp.store[filePath])
      return;
    delete Temp.store[filePath];
    FS.attempt.unlinkSync(filePath);
  },
  purgeSyncAll: () => {
    for (const filePath in Temp.store) {
      Temp.purgeSync(filePath);
    }
  },
  truncate: (filePath) => {
    const basename = sp.basename(filePath);
    if (basename.length <= LIMIT_BASENAME_LENGTH)
      return filePath;
    const truncable = /^(\.?)(.*?)((?:\.[^.]+)?(?:\.tmp-\d{10}[a-f0-9]{6})?)$/.exec(basename);
    if (!truncable)
      return filePath;
    const truncationLength = basename.length - LIMIT_BASENAME_LENGTH;
    return `${filePath.slice(0, -basename.length)}${truncable[1]}${truncable[2].slice(0, -truncationLength)}${truncable[3]}`;
  }
};
whenExit(Temp.purgeSyncAll);
function writeFileSync(filePath, data, options = DEFAULT_WRITE_OPTIONS) {
  if (isString(options))
    return writeFileSync(filePath, data, { encoding: options });
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_SYNC;
  const retryOptions = { timeout };
  let tempDisposer = null;
  let tempPath = null;
  let fd = null;
  try {
    const filePathReal = FS.attempt.realpathSync(filePath);
    const filePathExists = !!filePathReal;
    filePath = filePathReal || filePath;
    [tempPath, tempDisposer] = Temp.get(filePath, options.tmpCreate || Temp.create, !(options.tmpPurge === false));
    const useStatChown = IS_POSIX && isUndefined(options.chown);
    const useStatMode = isUndefined(options.mode);
    if (filePathExists && (useStatChown || useStatMode)) {
      const stats = FS.attempt.statSync(filePath);
      if (stats) {
        options = { ...options };
        if (useStatChown) {
          options.chown = { uid: stats.uid, gid: stats.gid };
        }
        if (useStatMode) {
          options.mode = stats.mode;
        }
      }
    }
    if (!filePathExists) {
      const parentPath = sp.dirname(filePath);
      FS.attempt.mkdirSync(parentPath, {
        mode: DEFAULT_FOLDER_MODE,
        recursive: true
      });
    }
    fd = FS.retry.openSync(retryOptions)(tempPath, "w", options.mode || DEFAULT_FILE_MODE);
    if (options.tmpCreated) {
      options.tmpCreated(tempPath);
    }
    if (isString(data)) {
      FS.retry.writeSync(retryOptions)(fd, data, 0, options.encoding || DEFAULT_ENCODING);
    } else if (!isUndefined(data)) {
      FS.retry.writeSync(retryOptions)(fd, data, 0, data.length, 0);
    }
    if (options.fsync !== false) {
      if (options.fsyncWait !== false) {
        FS.retry.fsyncSync(retryOptions)(fd);
      } else {
        FS.attempt.fsync(fd);
      }
    }
    FS.retry.closeSync(retryOptions)(fd);
    fd = null;
    if (options.chown && (options.chown.uid !== DEFAULT_USER_UID || options.chown.gid !== DEFAULT_USER_GID)) {
      FS.attempt.chownSync(tempPath, options.chown.uid, options.chown.gid);
    }
    if (options.mode && options.mode !== DEFAULT_FILE_MODE) {
      FS.attempt.chmodSync(tempPath, options.mode);
    }
    try {
      FS.retry.renameSync(retryOptions)(tempPath, filePath);
    } catch (error2) {
      if (!isException(error2))
        throw error2;
      if (error2.code !== "ENAMETOOLONG")
        throw error2;
      FS.retry.renameSync(retryOptions)(tempPath, Temp.truncate(filePath));
    }
    tempDisposer();
    tempPath = null;
  } finally {
    if (fd)
      FS.attempt.closeSync(fd);
    if (tempPath)
      Temp.purge(tempPath);
  }
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var _2020 = { exports: {} };
var core$6 = {};
var validate$1 = {};
var boolSchema$1 = {};
var errors$1 = {};
var codegen$1 = {};
var code$3 = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.regexpCode = exports$1.getEsmExportName = exports$1.getProperty = exports$1.safeStringify = exports$1.stringify = exports$1.strConcat = exports$1.addCodeArg = exports$1.str = exports$1._ = exports$1.nil = exports$1._Code = exports$1.Name = exports$1.IDENTIFIER = exports$1._CodeOrName = void 0;
  class _CodeOrName {
  }
  exports$1._CodeOrName = _CodeOrName;
  exports$1.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class Name extends _CodeOrName {
    constructor(s) {
      super();
      if (!exports$1.IDENTIFIER.test(s))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = s;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return false;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  exports$1.Name = Name;
  class _Code extends _CodeOrName {
    constructor(code2) {
      super();
      this._items = typeof code2 === "string" ? [code2] : code2;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return false;
      const item = this._items[0];
      return item === "" || item === '""';
    }
    get str() {
      var _a;
      return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
    }
    get names() {
      var _a;
      return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names2, c) => {
        if (c instanceof Name)
          names2[c.str] = (names2[c.str] || 0) + 1;
        return names2;
      }, {});
    }
  }
  exports$1._Code = _Code;
  exports$1.nil = new _Code("");
  function _(strs, ...args) {
    const code2 = [strs[0]];
    let i = 0;
    while (i < args.length) {
      addCodeArg(code2, args[i]);
      code2.push(strs[++i]);
    }
    return new _Code(code2);
  }
  exports$1._ = _;
  const plus = new _Code("+");
  function str(strs, ...args) {
    const expr = [safeStringify(strs[0])];
    let i = 0;
    while (i < args.length) {
      expr.push(plus);
      addCodeArg(expr, args[i]);
      expr.push(plus, safeStringify(strs[++i]));
    }
    optimize(expr);
    return new _Code(expr);
  }
  exports$1.str = str;
  function addCodeArg(code2, arg) {
    if (arg instanceof _Code)
      code2.push(...arg._items);
    else if (arg instanceof Name)
      code2.push(arg);
    else
      code2.push(interpolate(arg));
  }
  exports$1.addCodeArg = addCodeArg;
  function optimize(expr) {
    let i = 1;
    while (i < expr.length - 1) {
      if (expr[i] === plus) {
        const res = mergeExprItems(expr[i - 1], expr[i + 1]);
        if (res !== void 0) {
          expr.splice(i - 1, 3, res);
          continue;
        }
        expr[i++] = "+";
      }
      i++;
    }
  }
  function mergeExprItems(a, b) {
    if (b === '""')
      return a;
    if (a === '""')
      return b;
    if (typeof a == "string") {
      if (b instanceof Name || a[a.length - 1] !== '"')
        return;
      if (typeof b != "string")
        return `${a.slice(0, -1)}${b}"`;
      if (b[0] === '"')
        return a.slice(0, -1) + b.slice(1);
      return;
    }
    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
      return `"${a}${b.slice(1)}`;
    return;
  }
  function strConcat(c1, c2) {
    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
  }
  exports$1.strConcat = strConcat;
  function interpolate(x) {
    return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
  }
  function stringify(x) {
    return new _Code(safeStringify(x));
  }
  exports$1.stringify = stringify;
  function safeStringify(x) {
    return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  exports$1.safeStringify = safeStringify;
  function getProperty2(key) {
    return typeof key == "string" && exports$1.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
  }
  exports$1.getProperty = getProperty2;
  function getEsmExportName(key) {
    if (typeof key == "string" && exports$1.IDENTIFIER.test(key)) {
      return new _Code(`${key}`);
    }
    throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
  }
  exports$1.getEsmExportName = getEsmExportName;
  function regexpCode(rx) {
    return new _Code(rx.toString());
  }
  exports$1.regexpCode = regexpCode;
})(code$3);
var scope$1 = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.ValueScope = exports$1.ValueScopeName = exports$1.Scope = exports$1.varKinds = exports$1.UsedValueState = void 0;
  const code_12 = code$3;
  class ValueError extends Error {
    constructor(name) {
      super(`CodeGen: "code" for ${name} not defined`);
      this.value = name.value;
    }
  }
  var UsedValueState;
  (function(UsedValueState2) {
    UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
    UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
  })(UsedValueState || (exports$1.UsedValueState = UsedValueState = {}));
  exports$1.varKinds = {
    const: new code_12.Name("const"),
    let: new code_12.Name("let"),
    var: new code_12.Name("var")
  };
  class Scope {
    constructor({ prefixes, parent } = {}) {
      this._names = {};
      this._prefixes = prefixes;
      this._parent = parent;
    }
    toName(nameOrPrefix) {
      return nameOrPrefix instanceof code_12.Name ? nameOrPrefix : this.name(nameOrPrefix);
    }
    name(prefix) {
      return new code_12.Name(this._newName(prefix));
    }
    _newName(prefix) {
      const ng = this._names[prefix] || this._nameGroup(prefix);
      return `${prefix}${ng.index++}`;
    }
    _nameGroup(prefix) {
      var _a, _b;
      if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
        throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
      }
      return this._names[prefix] = { prefix, index: 0 };
    }
  }
  exports$1.Scope = Scope;
  class ValueScopeName extends code_12.Name {
    constructor(prefix, nameStr) {
      super(nameStr);
      this.prefix = prefix;
    }
    setValue(value, { property, itemIndex }) {
      this.value = value;
      this.scopePath = (0, code_12._)`.${new code_12.Name(property)}[${itemIndex}]`;
    }
  }
  exports$1.ValueScopeName = ValueScopeName;
  const line = (0, code_12._)`\n`;
  class ValueScope extends Scope {
    constructor(opts) {
      super(opts);
      this._values = {};
      this._scope = opts.scope;
      this.opts = { ...opts, _n: opts.lines ? line : code_12.nil };
    }
    get() {
      return this._scope;
    }
    name(prefix) {
      return new ValueScopeName(prefix, this._newName(prefix));
    }
    value(nameOrPrefix, value) {
      var _a;
      if (value.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const name = this.toName(nameOrPrefix);
      const { prefix } = name;
      const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
      let vs = this._values[prefix];
      if (vs) {
        const _name = vs.get(valueKey);
        if (_name)
          return _name;
      } else {
        vs = this._values[prefix] = /* @__PURE__ */ new Map();
      }
      vs.set(valueKey, name);
      const s = this._scope[prefix] || (this._scope[prefix] = []);
      const itemIndex = s.length;
      s[itemIndex] = value.ref;
      name.setValue(value, { property: prefix, itemIndex });
      return name;
    }
    getValue(prefix, keyOrRef) {
      const vs = this._values[prefix];
      if (!vs)
        return;
      return vs.get(keyOrRef);
    }
    scopeRefs(scopeName, values = this._values) {
      return this._reduceValues(values, (name) => {
        if (name.scopePath === void 0)
          throw new Error(`CodeGen: name "${name}" has no value`);
        return (0, code_12._)`${scopeName}${name.scopePath}`;
      });
    }
    scopeCode(values = this._values, usedValues, getCode) {
      return this._reduceValues(values, (name) => {
        if (name.value === void 0)
          throw new Error(`CodeGen: name "${name}" has no value`);
        return name.value.code;
      }, usedValues, getCode);
    }
    _reduceValues(values, valueCode, usedValues = {}, getCode) {
      let code2 = code_12.nil;
      for (const prefix in values) {
        const vs = values[prefix];
        if (!vs)
          continue;
        const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
        vs.forEach((name) => {
          if (nameSet.has(name))
            return;
          nameSet.set(name, UsedValueState.Started);
          let c = valueCode(name);
          if (c) {
            const def2 = this.opts.es5 ? exports$1.varKinds.var : exports$1.varKinds.const;
            code2 = (0, code_12._)`${code2}${def2} ${name} = ${c};${this.opts._n}`;
          } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
            code2 = (0, code_12._)`${code2}${c}${this.opts._n}`;
          } else {
            throw new ValueError(name);
          }
          nameSet.set(name, UsedValueState.Completed);
        });
      }
      return code2;
    }
  }
  exports$1.ValueScope = ValueScope;
})(scope$1);
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.or = exports$1.and = exports$1.not = exports$1.CodeGen = exports$1.operators = exports$1.varKinds = exports$1.ValueScopeName = exports$1.ValueScope = exports$1.Scope = exports$1.Name = exports$1.regexpCode = exports$1.stringify = exports$1.getProperty = exports$1.nil = exports$1.strConcat = exports$1.str = exports$1._ = void 0;
  const code_12 = code$3;
  const scope_1 = scope$1;
  var code_2 = code$3;
  Object.defineProperty(exports$1, "_", { enumerable: true, get: function() {
    return code_2._;
  } });
  Object.defineProperty(exports$1, "str", { enumerable: true, get: function() {
    return code_2.str;
  } });
  Object.defineProperty(exports$1, "strConcat", { enumerable: true, get: function() {
    return code_2.strConcat;
  } });
  Object.defineProperty(exports$1, "nil", { enumerable: true, get: function() {
    return code_2.nil;
  } });
  Object.defineProperty(exports$1, "getProperty", { enumerable: true, get: function() {
    return code_2.getProperty;
  } });
  Object.defineProperty(exports$1, "stringify", { enumerable: true, get: function() {
    return code_2.stringify;
  } });
  Object.defineProperty(exports$1, "regexpCode", { enumerable: true, get: function() {
    return code_2.regexpCode;
  } });
  Object.defineProperty(exports$1, "Name", { enumerable: true, get: function() {
    return code_2.Name;
  } });
  var scope_2 = scope$1;
  Object.defineProperty(exports$1, "Scope", { enumerable: true, get: function() {
    return scope_2.Scope;
  } });
  Object.defineProperty(exports$1, "ValueScope", { enumerable: true, get: function() {
    return scope_2.ValueScope;
  } });
  Object.defineProperty(exports$1, "ValueScopeName", { enumerable: true, get: function() {
    return scope_2.ValueScopeName;
  } });
  Object.defineProperty(exports$1, "varKinds", { enumerable: true, get: function() {
    return scope_2.varKinds;
  } });
  exports$1.operators = {
    GT: new code_12._Code(">"),
    GTE: new code_12._Code(">="),
    LT: new code_12._Code("<"),
    LTE: new code_12._Code("<="),
    EQ: new code_12._Code("==="),
    NEQ: new code_12._Code("!=="),
    NOT: new code_12._Code("!"),
    OR: new code_12._Code("||"),
    AND: new code_12._Code("&&"),
    ADD: new code_12._Code("+")
  };
  class Node {
    optimizeNodes() {
      return this;
    }
    optimizeNames(_names, _constants) {
      return this;
    }
  }
  class Def extends Node {
    constructor(varKind, name, rhs) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.rhs = rhs;
    }
    render({ es5, _n }) {
      const varKind = es5 ? scope_1.varKinds.var : this.varKind;
      const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${varKind} ${this.name}${rhs};` + _n;
    }
    optimizeNames(names2, constants2) {
      if (!names2[this.name.str])
        return;
      if (this.rhs)
        this.rhs = optimizeExpr(this.rhs, names2, constants2);
      return this;
    }
    get names() {
      return this.rhs instanceof code_12._CodeOrName ? this.rhs.names : {};
    }
  }
  class Assign extends Node {
    constructor(lhs, rhs, sideEffects) {
      super();
      this.lhs = lhs;
      this.rhs = rhs;
      this.sideEffects = sideEffects;
    }
    render({ _n }) {
      return `${this.lhs} = ${this.rhs};` + _n;
    }
    optimizeNames(names2, constants2) {
      if (this.lhs instanceof code_12.Name && !names2[this.lhs.str] && !this.sideEffects)
        return;
      this.rhs = optimizeExpr(this.rhs, names2, constants2);
      return this;
    }
    get names() {
      const names2 = this.lhs instanceof code_12.Name ? {} : { ...this.lhs.names };
      return addExprNames(names2, this.rhs);
    }
  }
  class AssignOp extends Assign {
    constructor(lhs, op, rhs, sideEffects) {
      super(lhs, rhs, sideEffects);
      this.op = op;
    }
    render({ _n }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
    }
  }
  class Label extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `${this.label}:` + _n;
    }
  }
  class Break extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      const label = this.label ? ` ${this.label}` : "";
      return `break${label};` + _n;
    }
  }
  class Throw extends Node {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render({ _n }) {
      return `throw ${this.error};` + _n;
    }
    get names() {
      return this.error.names;
    }
  }
  class AnyCode extends Node {
    constructor(code2) {
      super();
      this.code = code2;
    }
    render({ _n }) {
      return `${this.code};` + _n;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(names2, constants2) {
      this.code = optimizeExpr(this.code, names2, constants2);
      return this;
    }
    get names() {
      return this.code instanceof code_12._CodeOrName ? this.code.names : {};
    }
  }
  class ParentNode extends Node {
    constructor(nodes = []) {
      super();
      this.nodes = nodes;
    }
    render(opts) {
      return this.nodes.reduce((code2, n) => code2 + n.render(opts), "");
    }
    optimizeNodes() {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i].optimizeNodes();
        if (Array.isArray(n))
          nodes.splice(i, 1, ...n);
        else if (n)
          nodes[i] = n;
        else
          nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    optimizeNames(names2, constants2) {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i];
        if (n.optimizeNames(names2, constants2))
          continue;
        subtractNames(names2, n.names);
        nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((names2, n) => addNames(names2, n.names), {});
    }
  }
  class BlockNode extends ParentNode {
    render(opts) {
      return "{" + opts._n + super.render(opts) + "}" + opts._n;
    }
  }
  class Root extends ParentNode {
  }
  class Else extends BlockNode {
  }
  Else.kind = "else";
  class If extends BlockNode {
    constructor(condition, nodes) {
      super(nodes);
      this.condition = condition;
    }
    render(opts) {
      let code2 = `if(${this.condition})` + super.render(opts);
      if (this.else)
        code2 += "else " + this.else.render(opts);
      return code2;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const cond = this.condition;
      if (cond === true)
        return this.nodes;
      let e = this.else;
      if (e) {
        const ns = e.optimizeNodes();
        e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
      }
      if (e) {
        if (cond === false)
          return e instanceof If ? e : e.nodes;
        if (this.nodes.length)
          return this;
        return new If(not2(cond), e instanceof If ? [e] : e.nodes);
      }
      if (cond === false || !this.nodes.length)
        return void 0;
      return this;
    }
    optimizeNames(names2, constants2) {
      var _a;
      this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants2);
      if (!(super.optimizeNames(names2, constants2) || this.else))
        return;
      this.condition = optimizeExpr(this.condition, names2, constants2);
      return this;
    }
    get names() {
      const names2 = super.names;
      addExprNames(names2, this.condition);
      if (this.else)
        addNames(names2, this.else.names);
      return names2;
    }
  }
  If.kind = "if";
  class For extends BlockNode {
  }
  For.kind = "for";
  class ForLoop extends For {
    constructor(iteration) {
      super();
      this.iteration = iteration;
    }
    render(opts) {
      return `for(${this.iteration})` + super.render(opts);
    }
    optimizeNames(names2, constants2) {
      if (!super.optimizeNames(names2, constants2))
        return;
      this.iteration = optimizeExpr(this.iteration, names2, constants2);
      return this;
    }
    get names() {
      return addNames(super.names, this.iteration.names);
    }
  }
  class ForRange extends For {
    constructor(varKind, name, from, to) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.from = from;
      this.to = to;
    }
    render(opts) {
      const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
      const { name, from, to } = this;
      return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
    }
    get names() {
      const names2 = addExprNames(super.names, this.from);
      return addExprNames(names2, this.to);
    }
  }
  class ForIter extends For {
    constructor(loop, varKind, name, iterable) {
      super();
      this.loop = loop;
      this.varKind = varKind;
      this.name = name;
      this.iterable = iterable;
    }
    render(opts) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
    }
    optimizeNames(names2, constants2) {
      if (!super.optimizeNames(names2, constants2))
        return;
      this.iterable = optimizeExpr(this.iterable, names2, constants2);
      return this;
    }
    get names() {
      return addNames(super.names, this.iterable.names);
    }
  }
  class Func extends BlockNode {
    constructor(name, args, async) {
      super();
      this.name = name;
      this.args = args;
      this.async = async;
    }
    render(opts) {
      const _async = this.async ? "async " : "";
      return `${_async}function ${this.name}(${this.args})` + super.render(opts);
    }
  }
  Func.kind = "func";
  class Return extends ParentNode {
    render(opts) {
      return "return " + super.render(opts);
    }
  }
  Return.kind = "return";
  class Try extends BlockNode {
    render(opts) {
      let code2 = "try" + super.render(opts);
      if (this.catch)
        code2 += this.catch.render(opts);
      if (this.finally)
        code2 += this.finally.render(opts);
      return code2;
    }
    optimizeNodes() {
      var _a, _b;
      super.optimizeNodes();
      (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
      (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
      return this;
    }
    optimizeNames(names2, constants2) {
      var _a, _b;
      super.optimizeNames(names2, constants2);
      (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants2);
      (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names2, constants2);
      return this;
    }
    get names() {
      const names2 = super.names;
      if (this.catch)
        addNames(names2, this.catch.names);
      if (this.finally)
        addNames(names2, this.finally.names);
      return names2;
    }
  }
  class Catch extends BlockNode {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render(opts) {
      return `catch(${this.error})` + super.render(opts);
    }
  }
  Catch.kind = "catch";
  class Finally extends BlockNode {
    render(opts) {
      return "finally" + super.render(opts);
    }
  }
  Finally.kind = "finally";
  class CodeGen {
    constructor(extScope, opts = {}) {
      this._values = {};
      this._blockStarts = [];
      this._constants = {};
      this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
      this._extScope = extScope;
      this._scope = new scope_1.Scope({ parent: extScope });
      this._nodes = [new Root()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    // returns unique name in the internal scope
    name(prefix) {
      return this._scope.name(prefix);
    }
    // reserves unique name in the external scope
    scopeName(prefix) {
      return this._extScope.name(prefix);
    }
    // reserves unique name in the external scope and assigns value to it
    scopeValue(prefixOrName, value) {
      const name = this._extScope.value(prefixOrName, value);
      const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
      vs.add(name);
      return name;
    }
    getScopeValue(prefix, keyOrRef) {
      return this._extScope.getValue(prefix, keyOrRef);
    }
    // return code that assigns values in the external scope to the names that are used internally
    // (same names that were returned by gen.scopeName or gen.scopeValue)
    scopeRefs(scopeName) {
      return this._extScope.scopeRefs(scopeName, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(varKind, nameOrPrefix, rhs, constant) {
      const name = this._scope.toName(nameOrPrefix);
      if (rhs !== void 0 && constant)
        this._constants[name.str] = rhs;
      this._leafNode(new Def(varKind, name, rhs));
      return name;
    }
    // `const` declaration (`var` in es5 mode)
    const(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
    }
    // `var` declaration with optional assignment
    var(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
    }
    // assignment code
    assign(lhs, rhs, sideEffects) {
      return this._leafNode(new Assign(lhs, rhs, sideEffects));
    }
    // `+=` code
    add(lhs, rhs) {
      return this._leafNode(new AssignOp(lhs, exports$1.operators.ADD, rhs));
    }
    // appends passed SafeExpr to code or executes Block
    code(c) {
      if (typeof c == "function")
        c();
      else if (c !== code_12.nil)
        this._leafNode(new AnyCode(c));
      return this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...keyValues) {
      const code2 = ["{"];
      for (const [key, value] of keyValues) {
        if (code2.length > 1)
          code2.push(",");
        code2.push(key);
        if (key !== value || this.opts.es5) {
          code2.push(":");
          (0, code_12.addCodeArg)(code2, value);
        }
      }
      code2.push("}");
      return new code_12._Code(code2);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(condition, thenBody, elseBody) {
      this._blockNode(new If(condition));
      if (thenBody && elseBody) {
        this.code(thenBody).else().code(elseBody).endIf();
      } else if (thenBody) {
        this.code(thenBody).endIf();
      } else if (elseBody) {
        throw new Error('CodeGen: "else" body without "then" body');
      }
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(condition) {
      return this._elseNode(new If(condition));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new Else());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(If, Else);
    }
    _for(node, forBody) {
      this._blockNode(node);
      if (forBody)
        this.code(forBody).endFor();
      return this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(iteration, forBody) {
      return this._for(new ForLoop(iteration), forBody);
    }
    // `for` statement for a range of values
    forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
      const name = this._scope.toName(nameOrPrefix);
      if (this.opts.es5) {
        const arr = iterable instanceof code_12.Name ? iterable : this.var("_arr", iterable);
        return this.forRange("_i", 0, (0, code_12._)`${arr}.length`, (i) => {
          this.var(name, (0, code_12._)`${arr}[${i}]`);
          forBody(name);
        });
      }
      return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
      if (this.opts.ownProperties) {
        return this.forOf(nameOrPrefix, (0, code_12._)`Object.keys(${obj})`, forBody);
      }
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(For);
    }
    // `label` statement
    label(label) {
      return this._leafNode(new Label(label));
    }
    // `break` statement
    break(label) {
      return this._leafNode(new Break(label));
    }
    // `return` statement
    return(value) {
      const node = new Return();
      this._blockNode(node);
      this.code(value);
      if (node.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(Return);
    }
    // `try` statement
    try(tryBody, catchCode, finallyCode) {
      if (!catchCode && !finallyCode)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const node = new Try();
      this._blockNode(node);
      this.code(tryBody);
      if (catchCode) {
        const error2 = this.name("e");
        this._currNode = node.catch = new Catch(error2);
        catchCode(error2);
      }
      if (finallyCode) {
        this._currNode = node.finally = new Finally();
        this.code(finallyCode);
      }
      return this._endBlockNode(Catch, Finally);
    }
    // `throw` statement
    throw(error2) {
      return this._leafNode(new Throw(error2));
    }
    // start self-balancing block
    block(body, nodeCount) {
      this._blockStarts.push(this._nodes.length);
      if (body)
        this.code(body).endBlock(nodeCount);
      return this;
    }
    // end the current self-balancing block
    endBlock(nodeCount) {
      const len = this._blockStarts.pop();
      if (len === void 0)
        throw new Error("CodeGen: not in self-balancing block");
      const toClose = this._nodes.length - len;
      if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
        throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
      }
      this._nodes.length = len;
      return this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(name, args = code_12.nil, async, funcBody) {
      this._blockNode(new Func(name, args, async));
      if (funcBody)
        this.code(funcBody).endFunc();
      return this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(Func);
    }
    optimize(n = 1) {
      while (n-- > 0) {
        this._root.optimizeNodes();
        this._root.optimizeNames(this._root.names, this._constants);
      }
    }
    _leafNode(node) {
      this._currNode.nodes.push(node);
      return this;
    }
    _blockNode(node) {
      this._currNode.nodes.push(node);
      this._nodes.push(node);
    }
    _endBlockNode(N1, N2) {
      const n = this._currNode;
      if (n instanceof N1 || N2 && n instanceof N2) {
        this._nodes.pop();
        return this;
      }
      throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
    }
    _elseNode(node) {
      const n = this._currNode;
      if (!(n instanceof If)) {
        throw new Error('CodeGen: "else" without "if"');
      }
      this._currNode = n.else = node;
      return this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const ns = this._nodes;
      return ns[ns.length - 1];
    }
    set _currNode(node) {
      const ns = this._nodes;
      ns[ns.length - 1] = node;
    }
  }
  exports$1.CodeGen = CodeGen;
  function addNames(names2, from) {
    for (const n in from)
      names2[n] = (names2[n] || 0) + (from[n] || 0);
    return names2;
  }
  function addExprNames(names2, from) {
    return from instanceof code_12._CodeOrName ? addNames(names2, from.names) : names2;
  }
  function optimizeExpr(expr, names2, constants2) {
    if (expr instanceof code_12.Name)
      return replaceName(expr);
    if (!canOptimize(expr))
      return expr;
    return new code_12._Code(expr._items.reduce((items2, c) => {
      if (c instanceof code_12.Name)
        c = replaceName(c);
      if (c instanceof code_12._Code)
        items2.push(...c._items);
      else
        items2.push(c);
      return items2;
    }, []));
    function replaceName(n) {
      const c = constants2[n.str];
      if (c === void 0 || names2[n.str] !== 1)
        return n;
      delete names2[n.str];
      return c;
    }
    function canOptimize(e) {
      return e instanceof code_12._Code && e._items.some((c) => c instanceof code_12.Name && names2[c.str] === 1 && constants2[c.str] !== void 0);
    }
  }
  function subtractNames(names2, from) {
    for (const n in from)
      names2[n] = (names2[n] || 0) - (from[n] || 0);
  }
  function not2(x) {
    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_12._)`!${par(x)}`;
  }
  exports$1.not = not2;
  const andCode = mappend(exports$1.operators.AND);
  function and(...args) {
    return args.reduce(andCode);
  }
  exports$1.and = and;
  const orCode = mappend(exports$1.operators.OR);
  function or(...args) {
    return args.reduce(orCode);
  }
  exports$1.or = or;
  function mappend(op) {
    return (x, y) => x === code_12.nil ? y : y === code_12.nil ? x : (0, code_12._)`${par(x)} ${op} ${par(y)}`;
  }
  function par(x) {
    return x instanceof code_12.Name ? x : (0, code_12._)`(${x})`;
  }
})(codegen$1);
var util$1 = {};
Object.defineProperty(util$1, "__esModule", { value: true });
util$1.checkStrictMode = util$1.getErrorPath = util$1.Type = util$1.useFunc = util$1.setEvaluated = util$1.evaluatedPropsToName = util$1.mergeEvaluated = util$1.eachItem = util$1.unescapeJsonPointer = util$1.escapeJsonPointer = util$1.escapeFragment = util$1.unescapeFragment = util$1.schemaRefOrVal = util$1.schemaHasRulesButRef = util$1.schemaHasRules = util$1.checkUnknownRules = util$1.alwaysValidSchema = util$1.toHash = void 0;
const codegen_1$Y = codegen$1;
const code_1$k = code$3;
function toHash$1(arr) {
  const hash = {};
  for (const item of arr)
    hash[item] = true;
  return hash;
}
util$1.toHash = toHash$1;
function alwaysValidSchema$1(it, schema) {
  if (typeof schema == "boolean")
    return schema;
  if (Object.keys(schema).length === 0)
    return true;
  checkUnknownRules$1(it, schema);
  return !schemaHasRules$1(schema, it.self.RULES.all);
}
util$1.alwaysValidSchema = alwaysValidSchema$1;
function checkUnknownRules$1(it, schema = it.schema) {
  const { opts, self } = it;
  if (!opts.strictSchema)
    return;
  if (typeof schema === "boolean")
    return;
  const rules2 = self.RULES.keywords;
  for (const key in schema) {
    if (!rules2[key])
      checkStrictMode$1(it, `unknown keyword: "${key}"`);
  }
}
util$1.checkUnknownRules = checkUnknownRules$1;
function schemaHasRules$1(schema, rules2) {
  if (typeof schema == "boolean")
    return !schema;
  for (const key in schema)
    if (rules2[key])
      return true;
  return false;
}
util$1.schemaHasRules = schemaHasRules$1;
function schemaHasRulesButRef$1(schema, RULES) {
  if (typeof schema == "boolean")
    return !schema;
  for (const key in schema)
    if (key !== "$ref" && RULES.all[key])
      return true;
  return false;
}
util$1.schemaHasRulesButRef = schemaHasRulesButRef$1;
function schemaRefOrVal$1({ topSchemaRef, schemaPath }, schema, keyword2, $data) {
  if (!$data) {
    if (typeof schema == "number" || typeof schema == "boolean")
      return schema;
    if (typeof schema == "string")
      return (0, codegen_1$Y._)`${schema}`;
  }
  return (0, codegen_1$Y._)`${topSchemaRef}${schemaPath}${(0, codegen_1$Y.getProperty)(keyword2)}`;
}
util$1.schemaRefOrVal = schemaRefOrVal$1;
function unescapeFragment$1(str) {
  return unescapeJsonPointer$1(decodeURIComponent(str));
}
util$1.unescapeFragment = unescapeFragment$1;
function escapeFragment$1(str) {
  return encodeURIComponent(escapeJsonPointer$1(str));
}
util$1.escapeFragment = escapeFragment$1;
function escapeJsonPointer$1(str) {
  if (typeof str == "number")
    return `${str}`;
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
util$1.escapeJsonPointer = escapeJsonPointer$1;
function unescapeJsonPointer$1(str) {
  return str.replace(/~1/g, "/").replace(/~0/g, "~");
}
util$1.unescapeJsonPointer = unescapeJsonPointer$1;
function eachItem$1(xs, f) {
  if (Array.isArray(xs)) {
    for (const x of xs)
      f(x);
  } else {
    f(xs);
  }
}
util$1.eachItem = eachItem$1;
function makeMergeEvaluated$1({ mergeNames, mergeToName, mergeValues, resultToName }) {
  return (gen, from, to, toName) => {
    const res = to === void 0 ? from : to instanceof codegen_1$Y.Name ? (from instanceof codegen_1$Y.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1$Y.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
    return toName === codegen_1$Y.Name && !(res instanceof codegen_1$Y.Name) ? resultToName(gen, res) : res;
  };
}
util$1.mergeEvaluated = {
  props: makeMergeEvaluated$1({
    mergeNames: (gen, from, to) => gen.if((0, codegen_1$Y._)`${to} !== true && ${from} !== undefined`, () => {
      gen.if((0, codegen_1$Y._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1$Y._)`${to} || {}`).code((0, codegen_1$Y._)`Object.assign(${to}, ${from})`));
    }),
    mergeToName: (gen, from, to) => gen.if((0, codegen_1$Y._)`${to} !== true`, () => {
      if (from === true) {
        gen.assign(to, true);
      } else {
        gen.assign(to, (0, codegen_1$Y._)`${to} || {}`);
        setEvaluated$1(gen, to, from);
      }
    }),
    mergeValues: (from, to) => from === true ? true : { ...from, ...to },
    resultToName: evaluatedPropsToName$1
  }),
  items: makeMergeEvaluated$1({
    mergeNames: (gen, from, to) => gen.if((0, codegen_1$Y._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1$Y._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
    mergeToName: (gen, from, to) => gen.if((0, codegen_1$Y._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1$Y._)`${to} > ${from} ? ${to} : ${from}`)),
    mergeValues: (from, to) => from === true ? true : Math.max(from, to),
    resultToName: (gen, items2) => gen.var("items", items2)
  })
};
function evaluatedPropsToName$1(gen, ps) {
  if (ps === true)
    return gen.var("props", true);
  const props = gen.var("props", (0, codegen_1$Y._)`{}`);
  if (ps !== void 0)
    setEvaluated$1(gen, props, ps);
  return props;
}
util$1.evaluatedPropsToName = evaluatedPropsToName$1;
function setEvaluated$1(gen, props, ps) {
  Object.keys(ps).forEach((p) => gen.assign((0, codegen_1$Y._)`${props}${(0, codegen_1$Y.getProperty)(p)}`, true));
}
util$1.setEvaluated = setEvaluated$1;
const snippets$1 = {};
function useFunc$1(gen, f) {
  return gen.scopeValue("func", {
    ref: f,
    code: snippets$1[f.code] || (snippets$1[f.code] = new code_1$k._Code(f.code))
  });
}
util$1.useFunc = useFunc$1;
var Type$1;
(function(Type2) {
  Type2[Type2["Num"] = 0] = "Num";
  Type2[Type2["Str"] = 1] = "Str";
})(Type$1 || (util$1.Type = Type$1 = {}));
function getErrorPath$1(dataProp, dataPropType, jsPropertySyntax) {
  if (dataProp instanceof codegen_1$Y.Name) {
    const isNumber = dataPropType === Type$1.Num;
    return jsPropertySyntax ? isNumber ? (0, codegen_1$Y._)`"[" + ${dataProp} + "]"` : (0, codegen_1$Y._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1$Y._)`"/" + ${dataProp}` : (0, codegen_1$Y._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return jsPropertySyntax ? (0, codegen_1$Y.getProperty)(dataProp).toString() : "/" + escapeJsonPointer$1(dataProp);
}
util$1.getErrorPath = getErrorPath$1;
function checkStrictMode$1(it, msg, mode = it.opts.strictSchema) {
  if (!mode)
    return;
  msg = `strict mode: ${msg}`;
  if (mode === true)
    throw new Error(msg);
  it.self.logger.warn(msg);
}
util$1.checkStrictMode = checkStrictMode$1;
var names$2 = {};
Object.defineProperty(names$2, "__esModule", { value: true });
const codegen_1$X = codegen$1;
const names$1 = {
  // validation function arguments
  data: new codegen_1$X.Name("data"),
  // data passed to validation function
  // args passed from referencing schema
  valCxt: new codegen_1$X.Name("valCxt"),
  // validation/data context - should not be used directly, it is destructured to the names below
  instancePath: new codegen_1$X.Name("instancePath"),
  parentData: new codegen_1$X.Name("parentData"),
  parentDataProperty: new codegen_1$X.Name("parentDataProperty"),
  rootData: new codegen_1$X.Name("rootData"),
  // root data - same as the data passed to the first/top validation function
  dynamicAnchors: new codegen_1$X.Name("dynamicAnchors"),
  // used to support recursiveRef and dynamicRef
  // function scoped variables
  vErrors: new codegen_1$X.Name("vErrors"),
  // null or array of validation errors
  errors: new codegen_1$X.Name("errors"),
  // counter of validation errors
  this: new codegen_1$X.Name("this"),
  // "globals"
  self: new codegen_1$X.Name("self"),
  scope: new codegen_1$X.Name("scope"),
  // JTD serialize/parse name for JSON string and position
  json: new codegen_1$X.Name("json"),
  jsonPos: new codegen_1$X.Name("jsonPos"),
  jsonLen: new codegen_1$X.Name("jsonLen"),
  jsonPart: new codegen_1$X.Name("jsonPart")
};
names$2.default = names$1;
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.extendErrors = exports$1.resetErrorsCount = exports$1.reportExtraError = exports$1.reportError = exports$1.keyword$DataError = exports$1.keywordError = void 0;
  const codegen_12 = codegen$1;
  const util_12 = util$1;
  const names_12 = names$2;
  exports$1.keywordError = {
    message: ({ keyword: keyword2 }) => (0, codegen_12.str)`must pass "${keyword2}" keyword validation`
  };
  exports$1.keyword$DataError = {
    message: ({ keyword: keyword2, schemaType }) => schemaType ? (0, codegen_12.str)`"${keyword2}" keyword must be ${schemaType} ($data)` : (0, codegen_12.str)`"${keyword2}" keyword is invalid ($data)`
  };
  function reportError(cxt, error2 = exports$1.keywordError, errorPaths, overrideAllErrors) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    const errObj = errorObjectCode(cxt, error2, errorPaths);
    if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
      addError(gen, errObj);
    } else {
      returnErrors(it, (0, codegen_12._)`[${errObj}]`);
    }
  }
  exports$1.reportError = reportError;
  function reportExtraError(cxt, error2 = exports$1.keywordError, errorPaths) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    const errObj = errorObjectCode(cxt, error2, errorPaths);
    addError(gen, errObj);
    if (!(compositeRule || allErrors)) {
      returnErrors(it, names_12.default.vErrors);
    }
  }
  exports$1.reportExtraError = reportExtraError;
  function resetErrorsCount(gen, errsCount) {
    gen.assign(names_12.default.errors, errsCount);
    gen.if((0, codegen_12._)`${names_12.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_12._)`${names_12.default.vErrors}.length`, errsCount), () => gen.assign(names_12.default.vErrors, null)));
  }
  exports$1.resetErrorsCount = resetErrorsCount;
  function extendErrors({ gen, keyword: keyword2, schemaValue, data, errsCount, it }) {
    if (errsCount === void 0)
      throw new Error("ajv implementation error");
    const err = gen.name("err");
    gen.forRange("i", errsCount, names_12.default.errors, (i) => {
      gen.const(err, (0, codegen_12._)`${names_12.default.vErrors}[${i}]`);
      gen.if((0, codegen_12._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_12._)`${err}.instancePath`, (0, codegen_12.strConcat)(names_12.default.instancePath, it.errorPath)));
      gen.assign((0, codegen_12._)`${err}.schemaPath`, (0, codegen_12.str)`${it.errSchemaPath}/${keyword2}`);
      if (it.opts.verbose) {
        gen.assign((0, codegen_12._)`${err}.schema`, schemaValue);
        gen.assign((0, codegen_12._)`${err}.data`, data);
      }
    });
  }
  exports$1.extendErrors = extendErrors;
  function addError(gen, errObj) {
    const err = gen.const("err", errObj);
    gen.if((0, codegen_12._)`${names_12.default.vErrors} === null`, () => gen.assign(names_12.default.vErrors, (0, codegen_12._)`[${err}]`), (0, codegen_12._)`${names_12.default.vErrors}.push(${err})`);
    gen.code((0, codegen_12._)`${names_12.default.errors}++`);
  }
  function returnErrors(it, errs) {
    const { gen, validateName, schemaEnv } = it;
    if (schemaEnv.$async) {
      gen.throw((0, codegen_12._)`new ${it.ValidationError}(${errs})`);
    } else {
      gen.assign((0, codegen_12._)`${validateName}.errors`, errs);
      gen.return(false);
    }
  }
  const E = {
    keyword: new codegen_12.Name("keyword"),
    schemaPath: new codegen_12.Name("schemaPath"),
    // also used in JTD errors
    params: new codegen_12.Name("params"),
    propertyName: new codegen_12.Name("propertyName"),
    message: new codegen_12.Name("message"),
    schema: new codegen_12.Name("schema"),
    parentSchema: new codegen_12.Name("parentSchema")
  };
  function errorObjectCode(cxt, error2, errorPaths) {
    const { createErrors } = cxt.it;
    if (createErrors === false)
      return (0, codegen_12._)`{}`;
    return errorObject(cxt, error2, errorPaths);
  }
  function errorObject(cxt, error2, errorPaths = {}) {
    const { gen, it } = cxt;
    const keyValues = [
      errorInstancePath(it, errorPaths),
      errorSchemaPath(cxt, errorPaths)
    ];
    extraErrorProps(cxt, error2, keyValues);
    return gen.object(...keyValues);
  }
  function errorInstancePath({ errorPath }, { instancePath }) {
    const instPath = instancePath ? (0, codegen_12.str)`${errorPath}${(0, util_12.getErrorPath)(instancePath, util_12.Type.Str)}` : errorPath;
    return [names_12.default.instancePath, (0, codegen_12.strConcat)(names_12.default.instancePath, instPath)];
  }
  function errorSchemaPath({ keyword: keyword2, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
    let schPath = parentSchema ? errSchemaPath : (0, codegen_12.str)`${errSchemaPath}/${keyword2}`;
    if (schemaPath) {
      schPath = (0, codegen_12.str)`${schPath}${(0, util_12.getErrorPath)(schemaPath, util_12.Type.Str)}`;
    }
    return [E.schemaPath, schPath];
  }
  function extraErrorProps(cxt, { params, message }, keyValues) {
    const { keyword: keyword2, data, schemaValue, it } = cxt;
    const { opts, propertyName, topSchemaRef, schemaPath } = it;
    keyValues.push([E.keyword, keyword2], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_12._)`{}`]);
    if (opts.messages) {
      keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
    }
    if (opts.verbose) {
      keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_12._)`${topSchemaRef}${schemaPath}`], [names_12.default.data, data]);
    }
    if (propertyName)
      keyValues.push([E.propertyName, propertyName]);
  }
})(errors$1);
Object.defineProperty(boolSchema$1, "__esModule", { value: true });
boolSchema$1.boolOrEmptySchema = boolSchema$1.topBoolOrEmptySchema = void 0;
const errors_1$4 = errors$1;
const codegen_1$W = codegen$1;
const names_1$c = names$2;
const boolError = {
  message: "boolean schema is false"
};
function topBoolOrEmptySchema(it) {
  const { gen, schema, validateName } = it;
  if (schema === false) {
    falseSchemaError(it, false);
  } else if (typeof schema == "object" && schema.$async === true) {
    gen.return(names_1$c.default.data);
  } else {
    gen.assign((0, codegen_1$W._)`${validateName}.errors`, null);
    gen.return(true);
  }
}
boolSchema$1.topBoolOrEmptySchema = topBoolOrEmptySchema;
function boolOrEmptySchema(it, valid2) {
  const { gen, schema } = it;
  if (schema === false) {
    gen.var(valid2, false);
    falseSchemaError(it);
  } else {
    gen.var(valid2, true);
  }
}
boolSchema$1.boolOrEmptySchema = boolOrEmptySchema;
function falseSchemaError(it, overrideAllErrors) {
  const { gen, data } = it;
  const cxt = {
    gen,
    keyword: "false schema",
    data,
    schema: false,
    schemaCode: false,
    schemaValue: false,
    params: {},
    it
  };
  (0, errors_1$4.reportError)(cxt, boolError, void 0, overrideAllErrors);
}
var dataType$1 = {};
var rules$1 = {};
Object.defineProperty(rules$1, "__esModule", { value: true });
rules$1.getRules = rules$1.isJSONType = void 0;
const _jsonTypes$1 = ["string", "number", "integer", "boolean", "null", "object", "array"];
const jsonTypes$1 = new Set(_jsonTypes$1);
function isJSONType$1(x) {
  return typeof x == "string" && jsonTypes$1.has(x);
}
rules$1.isJSONType = isJSONType$1;
function getRules$1() {
  const groups = {
    number: { type: "number", rules: [] },
    string: { type: "string", rules: [] },
    array: { type: "array", rules: [] },
    object: { type: "object", rules: [] }
  };
  return {
    types: { ...groups, integer: true, boolean: true, null: true },
    rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
    post: { rules: [] },
    all: {},
    keywords: {}
  };
}
rules$1.getRules = getRules$1;
var applicability$1 = {};
Object.defineProperty(applicability$1, "__esModule", { value: true });
applicability$1.shouldUseRule = applicability$1.shouldUseGroup = applicability$1.schemaHasRulesForType = void 0;
function schemaHasRulesForType({ schema, self }, type2) {
  const group = self.RULES.types[type2];
  return group && group !== true && shouldUseGroup(schema, group);
}
applicability$1.schemaHasRulesForType = schemaHasRulesForType;
function shouldUseGroup(schema, group) {
  return group.rules.some((rule) => shouldUseRule(schema, rule));
}
applicability$1.shouldUseGroup = shouldUseGroup;
function shouldUseRule(schema, rule) {
  var _a;
  return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
}
applicability$1.shouldUseRule = shouldUseRule;
Object.defineProperty(dataType$1, "__esModule", { value: true });
dataType$1.reportTypeError = dataType$1.checkDataTypes = dataType$1.checkDataType = dataType$1.coerceAndCheckDataType = dataType$1.getJSONTypes = dataType$1.getSchemaTypes = dataType$1.DataType = void 0;
const rules_1$1 = rules$1;
const applicability_1$2 = applicability$1;
const errors_1$3 = errors$1;
const codegen_1$V = codegen$1;
const util_1$R = util$1;
var DataType$1;
(function(DataType2) {
  DataType2[DataType2["Correct"] = 0] = "Correct";
  DataType2[DataType2["Wrong"] = 1] = "Wrong";
})(DataType$1 || (dataType$1.DataType = DataType$1 = {}));
function getSchemaTypes$1(schema) {
  const types2 = getJSONTypes$1(schema.type);
  const hasNull = types2.includes("null");
  if (hasNull) {
    if (schema.nullable === false)
      throw new Error("type: null contradicts nullable: false");
  } else {
    if (!types2.length && schema.nullable !== void 0) {
      throw new Error('"nullable" cannot be used without "type"');
    }
    if (schema.nullable === true)
      types2.push("null");
  }
  return types2;
}
dataType$1.getSchemaTypes = getSchemaTypes$1;
function getJSONTypes$1(ts) {
  const types2 = Array.isArray(ts) ? ts : ts ? [ts] : [];
  if (types2.every(rules_1$1.isJSONType))
    return types2;
  throw new Error("type must be JSONType or JSONType[]: " + types2.join(","));
}
dataType$1.getJSONTypes = getJSONTypes$1;
function coerceAndCheckDataType$1(it, types2) {
  const { gen, data, opts } = it;
  const coerceTo = coerceToTypes$1(types2, opts.coerceTypes);
  const checkTypes = types2.length > 0 && !(coerceTo.length === 0 && types2.length === 1 && (0, applicability_1$2.schemaHasRulesForType)(it, types2[0]));
  if (checkTypes) {
    const wrongType = checkDataTypes$1(types2, data, opts.strictNumbers, DataType$1.Wrong);
    gen.if(wrongType, () => {
      if (coerceTo.length)
        coerceData$1(it, types2, coerceTo);
      else
        reportTypeError$1(it);
    });
  }
  return checkTypes;
}
dataType$1.coerceAndCheckDataType = coerceAndCheckDataType$1;
const COERCIBLE$1 = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function coerceToTypes$1(types2, coerceTypes) {
  return coerceTypes ? types2.filter((t2) => COERCIBLE$1.has(t2) || coerceTypes === "array" && t2 === "array") : [];
}
function coerceData$1(it, types2, coerceTo) {
  const { gen, data, opts } = it;
  const dataType2 = gen.let("dataType", (0, codegen_1$V._)`typeof ${data}`);
  const coerced = gen.let("coerced", (0, codegen_1$V._)`undefined`);
  if (opts.coerceTypes === "array") {
    gen.if((0, codegen_1$V._)`${dataType2} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1$V._)`${data}[0]`).assign(dataType2, (0, codegen_1$V._)`typeof ${data}`).if(checkDataTypes$1(types2, data, opts.strictNumbers), () => gen.assign(coerced, data)));
  }
  gen.if((0, codegen_1$V._)`${coerced} !== undefined`);
  for (const t2 of coerceTo) {
    if (COERCIBLE$1.has(t2) || t2 === "array" && opts.coerceTypes === "array") {
      coerceSpecificType(t2);
    }
  }
  gen.else();
  reportTypeError$1(it);
  gen.endIf();
  gen.if((0, codegen_1$V._)`${coerced} !== undefined`, () => {
    gen.assign(data, coerced);
    assignParentData$1(it, coerced);
  });
  function coerceSpecificType(t2) {
    switch (t2) {
      case "string":
        gen.elseIf((0, codegen_1$V._)`${dataType2} == "number" || ${dataType2} == "boolean"`).assign(coerced, (0, codegen_1$V._)`"" + ${data}`).elseIf((0, codegen_1$V._)`${data} === null`).assign(coerced, (0, codegen_1$V._)`""`);
        return;
      case "number":
        gen.elseIf((0, codegen_1$V._)`${dataType2} == "boolean" || ${data} === null
              || (${dataType2} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1$V._)`+${data}`);
        return;
      case "integer":
        gen.elseIf((0, codegen_1$V._)`${dataType2} === "boolean" || ${data} === null
              || (${dataType2} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1$V._)`+${data}`);
        return;
      case "boolean":
        gen.elseIf((0, codegen_1$V._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1$V._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
        return;
      case "null":
        gen.elseIf((0, codegen_1$V._)`${data} === "" || ${data} === 0 || ${data} === false`);
        gen.assign(coerced, null);
        return;
      case "array":
        gen.elseIf((0, codegen_1$V._)`${dataType2} === "string" || ${dataType2} === "number"
              || ${dataType2} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1$V._)`[${data}]`);
    }
  }
}
function assignParentData$1({ gen, parentData, parentDataProperty }, expr) {
  gen.if((0, codegen_1$V._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1$V._)`${parentData}[${parentDataProperty}]`, expr));
}
function checkDataType$1(dataType2, data, strictNums, correct = DataType$1.Correct) {
  const EQ = correct === DataType$1.Correct ? codegen_1$V.operators.EQ : codegen_1$V.operators.NEQ;
  let cond;
  switch (dataType2) {
    case "null":
      return (0, codegen_1$V._)`${data} ${EQ} null`;
    case "array":
      cond = (0, codegen_1$V._)`Array.isArray(${data})`;
      break;
    case "object":
      cond = (0, codegen_1$V._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
      break;
    case "integer":
      cond = numCond((0, codegen_1$V._)`!(${data} % 1) && !isNaN(${data})`);
      break;
    case "number":
      cond = numCond();
      break;
    default:
      return (0, codegen_1$V._)`typeof ${data} ${EQ} ${dataType2}`;
  }
  return correct === DataType$1.Correct ? cond : (0, codegen_1$V.not)(cond);
  function numCond(_cond = codegen_1$V.nil) {
    return (0, codegen_1$V.and)((0, codegen_1$V._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1$V._)`isFinite(${data})` : codegen_1$V.nil);
  }
}
dataType$1.checkDataType = checkDataType$1;
function checkDataTypes$1(dataTypes, data, strictNums, correct) {
  if (dataTypes.length === 1) {
    return checkDataType$1(dataTypes[0], data, strictNums, correct);
  }
  let cond;
  const types2 = (0, util_1$R.toHash)(dataTypes);
  if (types2.array && types2.object) {
    const notObj = (0, codegen_1$V._)`typeof ${data} != "object"`;
    cond = types2.null ? notObj : (0, codegen_1$V._)`!${data} || ${notObj}`;
    delete types2.null;
    delete types2.array;
    delete types2.object;
  } else {
    cond = codegen_1$V.nil;
  }
  if (types2.number)
    delete types2.integer;
  for (const t2 in types2)
    cond = (0, codegen_1$V.and)(cond, checkDataType$1(t2, data, strictNums, correct));
  return cond;
}
dataType$1.checkDataTypes = checkDataTypes$1;
const typeError$1 = {
  message: ({ schema }) => `must be ${schema}`,
  params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1$V._)`{type: ${schema}}` : (0, codegen_1$V._)`{type: ${schemaValue}}`
};
function reportTypeError$1(it) {
  const cxt = getTypeErrorContext$1(it);
  (0, errors_1$3.reportError)(cxt, typeError$1);
}
dataType$1.reportTypeError = reportTypeError$1;
function getTypeErrorContext$1(it) {
  const { gen, data, schema } = it;
  const schemaCode = (0, util_1$R.schemaRefOrVal)(it, schema, "type");
  return {
    gen,
    keyword: "type",
    data,
    schema: schema.type,
    schemaCode,
    schemaValue: schemaCode,
    parentSchema: schema,
    params: {},
    it
  };
}
var defaults$1 = {};
Object.defineProperty(defaults$1, "__esModule", { value: true });
defaults$1.assignDefaults = void 0;
const codegen_1$U = codegen$1;
const util_1$Q = util$1;
function assignDefaults(it, ty) {
  const { properties: properties2, items: items2 } = it.schema;
  if (ty === "object" && properties2) {
    for (const key in properties2) {
      assignDefault(it, key, properties2[key].default);
    }
  } else if (ty === "array" && Array.isArray(items2)) {
    items2.forEach((sch, i) => assignDefault(it, i, sch.default));
  }
}
defaults$1.assignDefaults = assignDefaults;
function assignDefault(it, prop, defaultValue) {
  const { gen, compositeRule, data, opts } = it;
  if (defaultValue === void 0)
    return;
  const childData = (0, codegen_1$U._)`${data}${(0, codegen_1$U.getProperty)(prop)}`;
  if (compositeRule) {
    (0, util_1$Q.checkStrictMode)(it, `default is ignored for: ${childData}`);
    return;
  }
  let condition = (0, codegen_1$U._)`${childData} === undefined`;
  if (opts.useDefaults === "empty") {
    condition = (0, codegen_1$U._)`${condition} || ${childData} === null || ${childData} === ""`;
  }
  gen.if(condition, (0, codegen_1$U._)`${childData} = ${(0, codegen_1$U.stringify)(defaultValue)}`);
}
var keyword$1 = {};
var code$2 = {};
Object.defineProperty(code$2, "__esModule", { value: true });
code$2.validateUnion = code$2.validateArray = code$2.usePattern = code$2.callValidateCode = code$2.schemaProperties = code$2.allSchemaProperties = code$2.noPropertyInData = code$2.propertyInData = code$2.isOwnProperty = code$2.hasPropFunc = code$2.reportMissingProp = code$2.checkMissingProp = code$2.checkReportMissingProp = void 0;
const codegen_1$T = codegen$1;
const util_1$P = util$1;
const names_1$b = names$2;
const util_2$2 = util$1;
function checkReportMissingProp(cxt, prop) {
  const { gen, data, it } = cxt;
  gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
    cxt.setParams({ missingProperty: (0, codegen_1$T._)`${prop}` }, true);
    cxt.error();
  });
}
code$2.checkReportMissingProp = checkReportMissingProp;
function checkMissingProp({ gen, data, it: { opts } }, properties2, missing) {
  return (0, codegen_1$T.or)(...properties2.map((prop) => (0, codegen_1$T.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1$T._)`${missing} = ${prop}`)));
}
code$2.checkMissingProp = checkMissingProp;
function reportMissingProp(cxt, missing) {
  cxt.setParams({ missingProperty: missing }, true);
  cxt.error();
}
code$2.reportMissingProp = reportMissingProp;
function hasPropFunc(gen) {
  return gen.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, codegen_1$T._)`Object.prototype.hasOwnProperty`
  });
}
code$2.hasPropFunc = hasPropFunc;
function isOwnProperty(gen, data, property) {
  return (0, codegen_1$T._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
}
code$2.isOwnProperty = isOwnProperty;
function propertyInData(gen, data, property, ownProperties) {
  const cond = (0, codegen_1$T._)`${data}${(0, codegen_1$T.getProperty)(property)} !== undefined`;
  return ownProperties ? (0, codegen_1$T._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
}
code$2.propertyInData = propertyInData;
function noPropertyInData(gen, data, property, ownProperties) {
  const cond = (0, codegen_1$T._)`${data}${(0, codegen_1$T.getProperty)(property)} === undefined`;
  return ownProperties ? (0, codegen_1$T.or)(cond, (0, codegen_1$T.not)(isOwnProperty(gen, data, property))) : cond;
}
code$2.noPropertyInData = noPropertyInData;
function allSchemaProperties(schemaMap) {
  return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
}
code$2.allSchemaProperties = allSchemaProperties;
function schemaProperties(it, schemaMap) {
  return allSchemaProperties(schemaMap).filter((p) => !(0, util_1$P.alwaysValidSchema)(it, schemaMap[p]));
}
code$2.schemaProperties = schemaProperties;
function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
  const dataAndSchema = passSchema ? (0, codegen_1$T._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
  const valCxt = [
    [names_1$b.default.instancePath, (0, codegen_1$T.strConcat)(names_1$b.default.instancePath, errorPath)],
    [names_1$b.default.parentData, it.parentData],
    [names_1$b.default.parentDataProperty, it.parentDataProperty],
    [names_1$b.default.rootData, names_1$b.default.rootData]
  ];
  if (it.opts.dynamicRef)
    valCxt.push([names_1$b.default.dynamicAnchors, names_1$b.default.dynamicAnchors]);
  const args = (0, codegen_1$T._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
  return context !== codegen_1$T.nil ? (0, codegen_1$T._)`${func}.call(${context}, ${args})` : (0, codegen_1$T._)`${func}(${args})`;
}
code$2.callValidateCode = callValidateCode;
const newRegExp = (0, codegen_1$T._)`new RegExp`;
function usePattern({ gen, it: { opts } }, pattern2) {
  const u = opts.unicodeRegExp ? "u" : "";
  const { regExp } = opts.code;
  const rx = regExp(pattern2, u);
  return gen.scopeValue("pattern", {
    key: rx.toString(),
    ref: rx,
    code: (0, codegen_1$T._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2$2.useFunc)(gen, regExp)}(${pattern2}, ${u})`
  });
}
code$2.usePattern = usePattern;
function validateArray(cxt) {
  const { gen, data, keyword: keyword2, it } = cxt;
  const valid2 = gen.name("valid");
  if (it.allErrors) {
    const validArr = gen.let("valid", true);
    validateItems(() => gen.assign(validArr, false));
    return validArr;
  }
  gen.var(valid2, true);
  validateItems(() => gen.break());
  return valid2;
  function validateItems(notValid) {
    const len = gen.const("len", (0, codegen_1$T._)`${data}.length`);
    gen.forRange("i", 0, len, (i) => {
      cxt.subschema({
        keyword: keyword2,
        dataProp: i,
        dataPropType: util_1$P.Type.Num
      }, valid2);
      gen.if((0, codegen_1$T.not)(valid2), notValid);
    });
  }
}
code$2.validateArray = validateArray;
function validateUnion(cxt) {
  const { gen, schema, keyword: keyword2, it } = cxt;
  if (!Array.isArray(schema))
    throw new Error("ajv implementation error");
  const alwaysValid = schema.some((sch) => (0, util_1$P.alwaysValidSchema)(it, sch));
  if (alwaysValid && !it.opts.unevaluated)
    return;
  const valid2 = gen.let("valid", false);
  const schValid = gen.name("_valid");
  gen.block(() => schema.forEach((_sch, i) => {
    const schCxt = cxt.subschema({
      keyword: keyword2,
      schemaProp: i,
      compositeRule: true
    }, schValid);
    gen.assign(valid2, (0, codegen_1$T._)`${valid2} || ${schValid}`);
    const merged = cxt.mergeValidEvaluated(schCxt, schValid);
    if (!merged)
      gen.if((0, codegen_1$T.not)(valid2));
  }));
  cxt.result(valid2, () => cxt.reset(), () => cxt.error(true));
}
code$2.validateUnion = validateUnion;
Object.defineProperty(keyword$1, "__esModule", { value: true });
keyword$1.validateKeywordUsage = keyword$1.validSchemaType = keyword$1.funcKeywordCode = keyword$1.macroKeywordCode = void 0;
const codegen_1$S = codegen$1;
const names_1$a = names$2;
const code_1$j = code$2;
const errors_1$2 = errors$1;
function macroKeywordCode(cxt, def2) {
  const { gen, keyword: keyword2, schema, parentSchema, it } = cxt;
  const macroSchema = def2.macro.call(it.self, schema, parentSchema, it);
  const schemaRef = useKeyword(gen, keyword2, macroSchema);
  if (it.opts.validateSchema !== false)
    it.self.validateSchema(macroSchema, true);
  const valid2 = gen.name("valid");
  cxt.subschema({
    schema: macroSchema,
    schemaPath: codegen_1$S.nil,
    errSchemaPath: `${it.errSchemaPath}/${keyword2}`,
    topSchemaRef: schemaRef,
    compositeRule: true
  }, valid2);
  cxt.pass(valid2, () => cxt.error(true));
}
keyword$1.macroKeywordCode = macroKeywordCode;
function funcKeywordCode(cxt, def2) {
  var _a;
  const { gen, keyword: keyword2, schema, parentSchema, $data, it } = cxt;
  checkAsyncKeyword(it, def2);
  const validate2 = !$data && def2.compile ? def2.compile.call(it.self, schema, parentSchema, it) : def2.validate;
  const validateRef = useKeyword(gen, keyword2, validate2);
  const valid2 = gen.let("valid");
  cxt.block$data(valid2, validateKeyword);
  cxt.ok((_a = def2.valid) !== null && _a !== void 0 ? _a : valid2);
  function validateKeyword() {
    if (def2.errors === false) {
      assignValid();
      if (def2.modifying)
        modifyData(cxt);
      reportErrs(() => cxt.error());
    } else {
      const ruleErrs = def2.async ? validateAsync() : validateSync();
      if (def2.modifying)
        modifyData(cxt);
      reportErrs(() => addErrs(cxt, ruleErrs));
    }
  }
  function validateAsync() {
    const ruleErrs = gen.let("ruleErrs", null);
    gen.try(() => assignValid((0, codegen_1$S._)`await `), (e) => gen.assign(valid2, false).if((0, codegen_1$S._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1$S._)`${e}.errors`), () => gen.throw(e)));
    return ruleErrs;
  }
  function validateSync() {
    const validateErrs = (0, codegen_1$S._)`${validateRef}.errors`;
    gen.assign(validateErrs, null);
    assignValid(codegen_1$S.nil);
    return validateErrs;
  }
  function assignValid(_await = def2.async ? (0, codegen_1$S._)`await ` : codegen_1$S.nil) {
    const passCxt = it.opts.passContext ? names_1$a.default.this : names_1$a.default.self;
    const passSchema = !("compile" in def2 && !$data || def2.schema === false);
    gen.assign(valid2, (0, codegen_1$S._)`${_await}${(0, code_1$j.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def2.modifying);
  }
  function reportErrs(errors2) {
    var _a2;
    gen.if((0, codegen_1$S.not)((_a2 = def2.valid) !== null && _a2 !== void 0 ? _a2 : valid2), errors2);
  }
}
keyword$1.funcKeywordCode = funcKeywordCode;
function modifyData(cxt) {
  const { gen, data, it } = cxt;
  gen.if(it.parentData, () => gen.assign(data, (0, codegen_1$S._)`${it.parentData}[${it.parentDataProperty}]`));
}
function addErrs(cxt, errs) {
  const { gen } = cxt;
  gen.if((0, codegen_1$S._)`Array.isArray(${errs})`, () => {
    gen.assign(names_1$a.default.vErrors, (0, codegen_1$S._)`${names_1$a.default.vErrors} === null ? ${errs} : ${names_1$a.default.vErrors}.concat(${errs})`).assign(names_1$a.default.errors, (0, codegen_1$S._)`${names_1$a.default.vErrors}.length`);
    (0, errors_1$2.extendErrors)(cxt);
  }, () => cxt.error());
}
function checkAsyncKeyword({ schemaEnv }, def2) {
  if (def2.async && !schemaEnv.$async)
    throw new Error("async keyword in sync schema");
}
function useKeyword(gen, keyword2, result) {
  if (result === void 0)
    throw new Error(`keyword "${keyword2}" failed to compile`);
  return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1$S.stringify)(result) });
}
function validSchemaType(schema, schemaType, allowUndefined = false) {
  return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
}
keyword$1.validSchemaType = validSchemaType;
function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def2, keyword2) {
  if (Array.isArray(def2.keyword) ? !def2.keyword.includes(keyword2) : def2.keyword !== keyword2) {
    throw new Error("ajv implementation error");
  }
  const deps = def2.dependencies;
  if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
    throw new Error(`parent schema must have dependencies of ${keyword2}: ${deps.join(",")}`);
  }
  if (def2.validateSchema) {
    const valid2 = def2.validateSchema(schema[keyword2]);
    if (!valid2) {
      const msg = `keyword "${keyword2}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def2.validateSchema.errors);
      if (opts.validateSchema === "log")
        self.logger.error(msg);
      else
        throw new Error(msg);
    }
  }
}
keyword$1.validateKeywordUsage = validateKeywordUsage;
var subschema$1 = {};
Object.defineProperty(subschema$1, "__esModule", { value: true });
subschema$1.extendSubschemaMode = subschema$1.extendSubschemaData = subschema$1.getSubschema = void 0;
const codegen_1$R = codegen$1;
const util_1$O = util$1;
function getSubschema(it, { keyword: keyword2, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
  if (keyword2 !== void 0 && schema !== void 0) {
    throw new Error('both "keyword" and "schema" passed, only one allowed');
  }
  if (keyword2 !== void 0) {
    const sch = it.schema[keyword2];
    return schemaProp === void 0 ? {
      schema: sch,
      schemaPath: (0, codegen_1$R._)`${it.schemaPath}${(0, codegen_1$R.getProperty)(keyword2)}`,
      errSchemaPath: `${it.errSchemaPath}/${keyword2}`
    } : {
      schema: sch[schemaProp],
      schemaPath: (0, codegen_1$R._)`${it.schemaPath}${(0, codegen_1$R.getProperty)(keyword2)}${(0, codegen_1$R.getProperty)(schemaProp)}`,
      errSchemaPath: `${it.errSchemaPath}/${keyword2}/${(0, util_1$O.escapeFragment)(schemaProp)}`
    };
  }
  if (schema !== void 0) {
    if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
      throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
    }
    return {
      schema,
      schemaPath,
      topSchemaRef,
      errSchemaPath
    };
  }
  throw new Error('either "keyword" or "schema" must be passed');
}
subschema$1.getSubschema = getSubschema;
function extendSubschemaData(subschema2, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
  if (data !== void 0 && dataProp !== void 0) {
    throw new Error('both "data" and "dataProp" passed, only one allowed');
  }
  const { gen } = it;
  if (dataProp !== void 0) {
    const { errorPath, dataPathArr, opts } = it;
    const nextData = gen.let("data", (0, codegen_1$R._)`${it.data}${(0, codegen_1$R.getProperty)(dataProp)}`, true);
    dataContextProps(nextData);
    subschema2.errorPath = (0, codegen_1$R.str)`${errorPath}${(0, util_1$O.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
    subschema2.parentDataProperty = (0, codegen_1$R._)`${dataProp}`;
    subschema2.dataPathArr = [...dataPathArr, subschema2.parentDataProperty];
  }
  if (data !== void 0) {
    const nextData = data instanceof codegen_1$R.Name ? data : gen.let("data", data, true);
    dataContextProps(nextData);
    if (propertyName !== void 0)
      subschema2.propertyName = propertyName;
  }
  if (dataTypes)
    subschema2.dataTypes = dataTypes;
  function dataContextProps(_nextData) {
    subschema2.data = _nextData;
    subschema2.dataLevel = it.dataLevel + 1;
    subschema2.dataTypes = [];
    it.definedProperties = /* @__PURE__ */ new Set();
    subschema2.parentData = it.data;
    subschema2.dataNames = [...it.dataNames, _nextData];
  }
}
subschema$1.extendSubschemaData = extendSubschemaData;
function extendSubschemaMode(subschema2, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
  if (compositeRule !== void 0)
    subschema2.compositeRule = compositeRule;
  if (createErrors !== void 0)
    subschema2.createErrors = createErrors;
  if (allErrors !== void 0)
    subschema2.allErrors = allErrors;
  subschema2.jtdDiscriminator = jtdDiscriminator;
  subschema2.jtdMetadata = jtdMetadata;
}
subschema$1.extendSubschemaMode = extendSubschemaMode;
var resolve$4 = {};
var fastDeepEqual = function equal(a, b) {
  if (a === b) return true;
  if (a && b && typeof a == "object" && typeof b == "object") {
    if (a.constructor !== b.constructor) return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0; )
        if (!equal(a[i], b[i])) return false;
      return true;
    }
    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;
    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    for (i = length; i-- !== 0; ) {
      var key = keys[i];
      if (!equal(a[key], b[key])) return false;
    }
    return true;
  }
  return a !== a && b !== b;
};
var jsonSchemaTraverse$1 = { exports: {} };
var traverse$3 = jsonSchemaTraverse$1.exports = function(schema, opts, cb) {
  if (typeof opts == "function") {
    cb = opts;
    opts = {};
  }
  cb = opts.cb || cb;
  var pre = typeof cb == "function" ? cb : cb.pre || function() {
  };
  var post = cb.post || function() {
  };
  _traverse$1(opts, pre, post, schema, "", schema);
};
traverse$3.keywords = {
  additionalItems: true,
  items: true,
  contains: true,
  additionalProperties: true,
  propertyNames: true,
  not: true,
  if: true,
  then: true,
  else: true
};
traverse$3.arrayKeywords = {
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};
traverse$3.propsKeywords = {
  $defs: true,
  definitions: true,
  properties: true,
  patternProperties: true,
  dependencies: true
};
traverse$3.skipKeywords = {
  default: true,
  enum: true,
  const: true,
  required: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};
function _traverse$1(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
  if (schema && typeof schema == "object" && !Array.isArray(schema)) {
    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    for (var key in schema) {
      var sch = schema[key];
      if (Array.isArray(sch)) {
        if (key in traverse$3.arrayKeywords) {
          for (var i = 0; i < sch.length; i++)
            _traverse$1(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
        }
      } else if (key in traverse$3.propsKeywords) {
        if (sch && typeof sch == "object") {
          for (var prop in sch)
            _traverse$1(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr$1(prop), rootSchema, jsonPtr, key, schema, prop);
        }
      } else if (key in traverse$3.keywords || opts.allKeys && !(key in traverse$3.skipKeywords)) {
        _traverse$1(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
      }
    }
    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  }
}
function escapeJsonPtr$1(str) {
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
var jsonSchemaTraverseExports$1 = jsonSchemaTraverse$1.exports;
Object.defineProperty(resolve$4, "__esModule", { value: true });
resolve$4.getSchemaRefs = resolve$4.resolveUrl = resolve$4.normalizeId = resolve$4._getFullPath = resolve$4.getFullPath = resolve$4.inlineRef = void 0;
const util_1$N = util$1;
const equal$6 = fastDeepEqual;
const traverse$2 = jsonSchemaTraverseExports$1;
const SIMPLE_INLINED$1 = /* @__PURE__ */ new Set([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum",
  "const"
]);
function inlineRef$1(schema, limit2 = true) {
  if (typeof schema == "boolean")
    return true;
  if (limit2 === true)
    return !hasRef$1(schema);
  if (!limit2)
    return false;
  return countKeys$1(schema) <= limit2;
}
resolve$4.inlineRef = inlineRef$1;
const REF_KEYWORDS$1 = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function hasRef$1(schema) {
  for (const key in schema) {
    if (REF_KEYWORDS$1.has(key))
      return true;
    const sch = schema[key];
    if (Array.isArray(sch) && sch.some(hasRef$1))
      return true;
    if (typeof sch == "object" && hasRef$1(sch))
      return true;
  }
  return false;
}
function countKeys$1(schema) {
  let count = 0;
  for (const key in schema) {
    if (key === "$ref")
      return Infinity;
    count++;
    if (SIMPLE_INLINED$1.has(key))
      continue;
    if (typeof schema[key] == "object") {
      (0, util_1$N.eachItem)(schema[key], (sch) => count += countKeys$1(sch));
    }
    if (count === Infinity)
      return Infinity;
  }
  return count;
}
function getFullPath$1(resolver, id2 = "", normalize2) {
  if (normalize2 !== false)
    id2 = normalizeId$1(id2);
  const p = resolver.parse(id2);
  return _getFullPath$1(resolver, p);
}
resolve$4.getFullPath = getFullPath$1;
function _getFullPath$1(resolver, p) {
  const serialized = resolver.serialize(p);
  return serialized.split("#")[0] + "#";
}
resolve$4._getFullPath = _getFullPath$1;
const TRAILING_SLASH_HASH$1 = /#\/?$/;
function normalizeId$1(id2) {
  return id2 ? id2.replace(TRAILING_SLASH_HASH$1, "") : "";
}
resolve$4.normalizeId = normalizeId$1;
function resolveUrl$1(resolver, baseId, id2) {
  id2 = normalizeId$1(id2);
  return resolver.resolve(baseId, id2);
}
resolve$4.resolveUrl = resolveUrl$1;
const ANCHOR$1 = /^[a-z_][-a-z0-9._]*$/i;
function getSchemaRefs$1(schema, baseId) {
  if (typeof schema == "boolean")
    return {};
  const { schemaId, uriResolver } = this.opts;
  const schId = normalizeId$1(schema[schemaId] || baseId);
  const baseIds = { "": schId };
  const pathPrefix = getFullPath$1(uriResolver, schId, false);
  const localRefs = {};
  const schemaRefs = /* @__PURE__ */ new Set();
  traverse$2(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
    if (parentJsonPtr === void 0)
      return;
    const fullPath = pathPrefix + jsonPtr;
    let innerBaseId = baseIds[parentJsonPtr];
    if (typeof sch[schemaId] == "string")
      innerBaseId = addRef.call(this, sch[schemaId]);
    addAnchor.call(this, sch.$anchor);
    addAnchor.call(this, sch.$dynamicAnchor);
    baseIds[jsonPtr] = innerBaseId;
    function addRef(ref2) {
      const _resolve = this.opts.uriResolver.resolve;
      ref2 = normalizeId$1(innerBaseId ? _resolve(innerBaseId, ref2) : ref2);
      if (schemaRefs.has(ref2))
        throw ambiguos(ref2);
      schemaRefs.add(ref2);
      let schOrRef = this.refs[ref2];
      if (typeof schOrRef == "string")
        schOrRef = this.refs[schOrRef];
      if (typeof schOrRef == "object") {
        checkAmbiguosRef(sch, schOrRef.schema, ref2);
      } else if (ref2 !== normalizeId$1(fullPath)) {
        if (ref2[0] === "#") {
          checkAmbiguosRef(sch, localRefs[ref2], ref2);
          localRefs[ref2] = sch;
        } else {
          this.refs[ref2] = fullPath;
        }
      }
      return ref2;
    }
    function addAnchor(anchor) {
      if (typeof anchor == "string") {
        if (!ANCHOR$1.test(anchor))
          throw new Error(`invalid anchor "${anchor}"`);
        addRef.call(this, `#${anchor}`);
      }
    }
  });
  return localRefs;
  function checkAmbiguosRef(sch1, sch2, ref2) {
    if (sch2 !== void 0 && !equal$6(sch1, sch2))
      throw ambiguos(ref2);
  }
  function ambiguos(ref2) {
    return new Error(`reference "${ref2}" resolves to more than one schema`);
  }
}
resolve$4.getSchemaRefs = getSchemaRefs$1;
Object.defineProperty(validate$1, "__esModule", { value: true });
validate$1.getData = validate$1.KeywordCxt = validate$1.validateFunctionCode = void 0;
const boolSchema_1 = boolSchema$1;
const dataType_1$2 = dataType$1;
const applicability_1$1 = applicability$1;
const dataType_2 = dataType$1;
const defaults_1 = defaults$1;
const keyword_1 = keyword$1;
const subschema_1 = subschema$1;
const codegen_1$Q = codegen$1;
const names_1$9 = names$2;
const resolve_1$4 = resolve$4;
const util_1$M = util$1;
const errors_1$1 = errors$1;
function validateFunctionCode(it) {
  if (isSchemaObj(it)) {
    checkKeywords(it);
    if (schemaCxtHasRules(it)) {
      topSchemaObjCode(it);
      return;
    }
  }
  validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
}
validate$1.validateFunctionCode = validateFunctionCode;
function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
  if (opts.code.es5) {
    gen.func(validateName, (0, codegen_1$Q._)`${names_1$9.default.data}, ${names_1$9.default.valCxt}`, schemaEnv.$async, () => {
      gen.code((0, codegen_1$Q._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
      destructureValCxtES5(gen, opts);
      gen.code(body);
    });
  } else {
    gen.func(validateName, (0, codegen_1$Q._)`${names_1$9.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
  }
}
function destructureValCxt(opts) {
  return (0, codegen_1$Q._)`{${names_1$9.default.instancePath}="", ${names_1$9.default.parentData}, ${names_1$9.default.parentDataProperty}, ${names_1$9.default.rootData}=${names_1$9.default.data}${opts.dynamicRef ? (0, codegen_1$Q._)`, ${names_1$9.default.dynamicAnchors}={}` : codegen_1$Q.nil}}={}`;
}
function destructureValCxtES5(gen, opts) {
  gen.if(names_1$9.default.valCxt, () => {
    gen.var(names_1$9.default.instancePath, (0, codegen_1$Q._)`${names_1$9.default.valCxt}.${names_1$9.default.instancePath}`);
    gen.var(names_1$9.default.parentData, (0, codegen_1$Q._)`${names_1$9.default.valCxt}.${names_1$9.default.parentData}`);
    gen.var(names_1$9.default.parentDataProperty, (0, codegen_1$Q._)`${names_1$9.default.valCxt}.${names_1$9.default.parentDataProperty}`);
    gen.var(names_1$9.default.rootData, (0, codegen_1$Q._)`${names_1$9.default.valCxt}.${names_1$9.default.rootData}`);
    if (opts.dynamicRef)
      gen.var(names_1$9.default.dynamicAnchors, (0, codegen_1$Q._)`${names_1$9.default.valCxt}.${names_1$9.default.dynamicAnchors}`);
  }, () => {
    gen.var(names_1$9.default.instancePath, (0, codegen_1$Q._)`""`);
    gen.var(names_1$9.default.parentData, (0, codegen_1$Q._)`undefined`);
    gen.var(names_1$9.default.parentDataProperty, (0, codegen_1$Q._)`undefined`);
    gen.var(names_1$9.default.rootData, names_1$9.default.data);
    if (opts.dynamicRef)
      gen.var(names_1$9.default.dynamicAnchors, (0, codegen_1$Q._)`{}`);
  });
}
function topSchemaObjCode(it) {
  const { schema, opts, gen } = it;
  validateFunction(it, () => {
    if (opts.$comment && schema.$comment)
      commentKeyword(it);
    checkNoDefault(it);
    gen.let(names_1$9.default.vErrors, null);
    gen.let(names_1$9.default.errors, 0);
    if (opts.unevaluated)
      resetEvaluated(it);
    typeAndKeywords(it);
    returnResults(it);
  });
  return;
}
function resetEvaluated(it) {
  const { gen, validateName } = it;
  it.evaluated = gen.const("evaluated", (0, codegen_1$Q._)`${validateName}.evaluated`);
  gen.if((0, codegen_1$Q._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1$Q._)`${it.evaluated}.props`, (0, codegen_1$Q._)`undefined`));
  gen.if((0, codegen_1$Q._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1$Q._)`${it.evaluated}.items`, (0, codegen_1$Q._)`undefined`));
}
function funcSourceUrl(schema, opts) {
  const schId = typeof schema == "object" && schema[opts.schemaId];
  return schId && (opts.code.source || opts.code.process) ? (0, codegen_1$Q._)`/*# sourceURL=${schId} */` : codegen_1$Q.nil;
}
function subschemaCode(it, valid2) {
  if (isSchemaObj(it)) {
    checkKeywords(it);
    if (schemaCxtHasRules(it)) {
      subSchemaObjCode(it, valid2);
      return;
    }
  }
  (0, boolSchema_1.boolOrEmptySchema)(it, valid2);
}
function schemaCxtHasRules({ schema, self }) {
  if (typeof schema == "boolean")
    return !schema;
  for (const key in schema)
    if (self.RULES.all[key])
      return true;
  return false;
}
function isSchemaObj(it) {
  return typeof it.schema != "boolean";
}
function subSchemaObjCode(it, valid2) {
  const { schema, gen, opts } = it;
  if (opts.$comment && schema.$comment)
    commentKeyword(it);
  updateContext(it);
  checkAsyncSchema(it);
  const errsCount = gen.const("_errs", names_1$9.default.errors);
  typeAndKeywords(it, errsCount);
  gen.var(valid2, (0, codegen_1$Q._)`${errsCount} === ${names_1$9.default.errors}`);
}
function checkKeywords(it) {
  (0, util_1$M.checkUnknownRules)(it);
  checkRefsAndKeywords(it);
}
function typeAndKeywords(it, errsCount) {
  if (it.opts.jtd)
    return schemaKeywords(it, [], false, errsCount);
  const types2 = (0, dataType_1$2.getSchemaTypes)(it.schema);
  const checkedTypes = (0, dataType_1$2.coerceAndCheckDataType)(it, types2);
  schemaKeywords(it, types2, !checkedTypes, errsCount);
}
function checkRefsAndKeywords(it) {
  const { schema, errSchemaPath, opts, self } = it;
  if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1$M.schemaHasRulesButRef)(schema, self.RULES)) {
    self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
  }
}
function checkNoDefault(it) {
  const { schema, opts } = it;
  if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
    (0, util_1$M.checkStrictMode)(it, "default is ignored in the schema root");
  }
}
function updateContext(it) {
  const schId = it.schema[it.opts.schemaId];
  if (schId)
    it.baseId = (0, resolve_1$4.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
}
function checkAsyncSchema(it) {
  if (it.schema.$async && !it.schemaEnv.$async)
    throw new Error("async schema in sync schema");
}
function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
  const msg = schema.$comment;
  if (opts.$comment === true) {
    gen.code((0, codegen_1$Q._)`${names_1$9.default.self}.logger.log(${msg})`);
  } else if (typeof opts.$comment == "function") {
    const schemaPath = (0, codegen_1$Q.str)`${errSchemaPath}/$comment`;
    const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
    gen.code((0, codegen_1$Q._)`${names_1$9.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
  }
}
function returnResults(it) {
  const { gen, schemaEnv, validateName, ValidationError: ValidationError2, opts } = it;
  if (schemaEnv.$async) {
    gen.if((0, codegen_1$Q._)`${names_1$9.default.errors} === 0`, () => gen.return(names_1$9.default.data), () => gen.throw((0, codegen_1$Q._)`new ${ValidationError2}(${names_1$9.default.vErrors})`));
  } else {
    gen.assign((0, codegen_1$Q._)`${validateName}.errors`, names_1$9.default.vErrors);
    if (opts.unevaluated)
      assignEvaluated(it);
    gen.return((0, codegen_1$Q._)`${names_1$9.default.errors} === 0`);
  }
}
function assignEvaluated({ gen, evaluated, props, items: items2 }) {
  if (props instanceof codegen_1$Q.Name)
    gen.assign((0, codegen_1$Q._)`${evaluated}.props`, props);
  if (items2 instanceof codegen_1$Q.Name)
    gen.assign((0, codegen_1$Q._)`${evaluated}.items`, items2);
}
function schemaKeywords(it, types2, typeErrors, errsCount) {
  const { gen, schema, data, allErrors, opts, self } = it;
  const { RULES } = self;
  if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1$M.schemaHasRulesButRef)(schema, RULES))) {
    gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
    return;
  }
  if (!opts.jtd)
    checkStrictTypes(it, types2);
  gen.block(() => {
    for (const group of RULES.rules)
      groupKeywords(group);
    groupKeywords(RULES.post);
  });
  function groupKeywords(group) {
    if (!(0, applicability_1$1.shouldUseGroup)(schema, group))
      return;
    if (group.type) {
      gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
      iterateKeywords(it, group);
      if (types2.length === 1 && types2[0] === group.type && typeErrors) {
        gen.else();
        (0, dataType_2.reportTypeError)(it);
      }
      gen.endIf();
    } else {
      iterateKeywords(it, group);
    }
    if (!allErrors)
      gen.if((0, codegen_1$Q._)`${names_1$9.default.errors} === ${errsCount || 0}`);
  }
}
function iterateKeywords(it, group) {
  const { gen, schema, opts: { useDefaults } } = it;
  if (useDefaults)
    (0, defaults_1.assignDefaults)(it, group.type);
  gen.block(() => {
    for (const rule of group.rules) {
      if ((0, applicability_1$1.shouldUseRule)(schema, rule)) {
        keywordCode(it, rule.keyword, rule.definition, group.type);
      }
    }
  });
}
function checkStrictTypes(it, types2) {
  if (it.schemaEnv.meta || !it.opts.strictTypes)
    return;
  checkContextTypes(it, types2);
  if (!it.opts.allowUnionTypes)
    checkMultipleTypes(it, types2);
  checkKeywordTypes(it, it.dataTypes);
}
function checkContextTypes(it, types2) {
  if (!types2.length)
    return;
  if (!it.dataTypes.length) {
    it.dataTypes = types2;
    return;
  }
  types2.forEach((t2) => {
    if (!includesType(it.dataTypes, t2)) {
      strictTypesError(it, `type "${t2}" not allowed by context "${it.dataTypes.join(",")}"`);
    }
  });
  narrowSchemaTypes(it, types2);
}
function checkMultipleTypes(it, ts) {
  if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
    strictTypesError(it, "use allowUnionTypes to allow union type keyword");
  }
}
function checkKeywordTypes(it, ts) {
  const rules2 = it.self.RULES.all;
  for (const keyword2 in rules2) {
    const rule = rules2[keyword2];
    if (typeof rule == "object" && (0, applicability_1$1.shouldUseRule)(it.schema, rule)) {
      const { type: type2 } = rule.definition;
      if (type2.length && !type2.some((t2) => hasApplicableType(ts, t2))) {
        strictTypesError(it, `missing type "${type2.join(",")}" for keyword "${keyword2}"`);
      }
    }
  }
}
function hasApplicableType(schTs, kwdT) {
  return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
}
function includesType(ts, t2) {
  return ts.includes(t2) || t2 === "integer" && ts.includes("number");
}
function narrowSchemaTypes(it, withTypes) {
  const ts = [];
  for (const t2 of it.dataTypes) {
    if (includesType(withTypes, t2))
      ts.push(t2);
    else if (withTypes.includes("integer") && t2 === "number")
      ts.push("integer");
  }
  it.dataTypes = ts;
}
function strictTypesError(it, msg) {
  const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
  msg += ` at "${schemaPath}" (strictTypes)`;
  (0, util_1$M.checkStrictMode)(it, msg, it.opts.strictTypes);
}
class KeywordCxt {
  constructor(it, def2, keyword2) {
    (0, keyword_1.validateKeywordUsage)(it, def2, keyword2);
    this.gen = it.gen;
    this.allErrors = it.allErrors;
    this.keyword = keyword2;
    this.data = it.data;
    this.schema = it.schema[keyword2];
    this.$data = def2.$data && it.opts.$data && this.schema && this.schema.$data;
    this.schemaValue = (0, util_1$M.schemaRefOrVal)(it, this.schema, keyword2, this.$data);
    this.schemaType = def2.schemaType;
    this.parentSchema = it.schema;
    this.params = {};
    this.it = it;
    this.def = def2;
    if (this.$data) {
      this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
    } else {
      this.schemaCode = this.schemaValue;
      if (!(0, keyword_1.validSchemaType)(this.schema, def2.schemaType, def2.allowUndefined)) {
        throw new Error(`${keyword2} value must be ${JSON.stringify(def2.schemaType)}`);
      }
    }
    if ("code" in def2 ? def2.trackErrors : def2.errors !== false) {
      this.errsCount = it.gen.const("_errs", names_1$9.default.errors);
    }
  }
  result(condition, successAction, failAction) {
    this.failResult((0, codegen_1$Q.not)(condition), successAction, failAction);
  }
  failResult(condition, successAction, failAction) {
    this.gen.if(condition);
    if (failAction)
      failAction();
    else
      this.error();
    if (successAction) {
      this.gen.else();
      successAction();
      if (this.allErrors)
        this.gen.endIf();
    } else {
      if (this.allErrors)
        this.gen.endIf();
      else
        this.gen.else();
    }
  }
  pass(condition, failAction) {
    this.failResult((0, codegen_1$Q.not)(condition), void 0, failAction);
  }
  fail(condition) {
    if (condition === void 0) {
      this.error();
      if (!this.allErrors)
        this.gen.if(false);
      return;
    }
    this.gen.if(condition);
    this.error();
    if (this.allErrors)
      this.gen.endIf();
    else
      this.gen.else();
  }
  fail$data(condition) {
    if (!this.$data)
      return this.fail(condition);
    const { schemaCode } = this;
    this.fail((0, codegen_1$Q._)`${schemaCode} !== undefined && (${(0, codegen_1$Q.or)(this.invalid$data(), condition)})`);
  }
  error(append, errorParams, errorPaths) {
    if (errorParams) {
      this.setParams(errorParams);
      this._error(append, errorPaths);
      this.setParams({});
      return;
    }
    this._error(append, errorPaths);
  }
  _error(append, errorPaths) {
    (append ? errors_1$1.reportExtraError : errors_1$1.reportError)(this, this.def.error, errorPaths);
  }
  $dataError() {
    (0, errors_1$1.reportError)(this, this.def.$dataError || errors_1$1.keyword$DataError);
  }
  reset() {
    if (this.errsCount === void 0)
      throw new Error('add "trackErrors" to keyword definition');
    (0, errors_1$1.resetErrorsCount)(this.gen, this.errsCount);
  }
  ok(cond) {
    if (!this.allErrors)
      this.gen.if(cond);
  }
  setParams(obj, assign) {
    if (assign)
      Object.assign(this.params, obj);
    else
      this.params = obj;
  }
  block$data(valid2, codeBlock, $dataValid = codegen_1$Q.nil) {
    this.gen.block(() => {
      this.check$data(valid2, $dataValid);
      codeBlock();
    });
  }
  check$data(valid2 = codegen_1$Q.nil, $dataValid = codegen_1$Q.nil) {
    if (!this.$data)
      return;
    const { gen, schemaCode, schemaType, def: def2 } = this;
    gen.if((0, codegen_1$Q.or)((0, codegen_1$Q._)`${schemaCode} === undefined`, $dataValid));
    if (valid2 !== codegen_1$Q.nil)
      gen.assign(valid2, true);
    if (schemaType.length || def2.validateSchema) {
      gen.elseIf(this.invalid$data());
      this.$dataError();
      if (valid2 !== codegen_1$Q.nil)
        gen.assign(valid2, false);
    }
    gen.else();
  }
  invalid$data() {
    const { gen, schemaCode, schemaType, def: def2, it } = this;
    return (0, codegen_1$Q.or)(wrong$DataType(), invalid$DataSchema());
    function wrong$DataType() {
      if (schemaType.length) {
        if (!(schemaCode instanceof codegen_1$Q.Name))
          throw new Error("ajv implementation error");
        const st = Array.isArray(schemaType) ? schemaType : [schemaType];
        return (0, codegen_1$Q._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
      }
      return codegen_1$Q.nil;
    }
    function invalid$DataSchema() {
      if (def2.validateSchema) {
        const validateSchemaRef = gen.scopeValue("validate$data", { ref: def2.validateSchema });
        return (0, codegen_1$Q._)`!${validateSchemaRef}(${schemaCode})`;
      }
      return codegen_1$Q.nil;
    }
  }
  subschema(appl, valid2) {
    const subschema2 = (0, subschema_1.getSubschema)(this.it, appl);
    (0, subschema_1.extendSubschemaData)(subschema2, this.it, appl);
    (0, subschema_1.extendSubschemaMode)(subschema2, appl);
    const nextContext = { ...this.it, ...subschema2, items: void 0, props: void 0 };
    subschemaCode(nextContext, valid2);
    return nextContext;
  }
  mergeEvaluated(schemaCxt, toName) {
    const { it, gen } = this;
    if (!it.opts.unevaluated)
      return;
    if (it.props !== true && schemaCxt.props !== void 0) {
      it.props = util_1$M.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
    }
    if (it.items !== true && schemaCxt.items !== void 0) {
      it.items = util_1$M.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
    }
  }
  mergeValidEvaluated(schemaCxt, valid2) {
    const { it, gen } = this;
    if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
      gen.if(valid2, () => this.mergeEvaluated(schemaCxt, codegen_1$Q.Name));
      return true;
    }
  }
}
validate$1.KeywordCxt = KeywordCxt;
function keywordCode(it, keyword2, def2, ruleType) {
  const cxt = new KeywordCxt(it, def2, keyword2);
  if ("code" in def2) {
    def2.code(cxt, ruleType);
  } else if (cxt.$data && def2.validate) {
    (0, keyword_1.funcKeywordCode)(cxt, def2);
  } else if ("macro" in def2) {
    (0, keyword_1.macroKeywordCode)(cxt, def2);
  } else if (def2.compile || def2.validate) {
    (0, keyword_1.funcKeywordCode)(cxt, def2);
  }
}
const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
const RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function getData($data, { dataLevel, dataNames, dataPathArr }) {
  let jsonPointer;
  let data;
  if ($data === "")
    return names_1$9.default.rootData;
  if ($data[0] === "/") {
    if (!JSON_POINTER.test($data))
      throw new Error(`Invalid JSON-pointer: ${$data}`);
    jsonPointer = $data;
    data = names_1$9.default.rootData;
  } else {
    const matches = RELATIVE_JSON_POINTER.exec($data);
    if (!matches)
      throw new Error(`Invalid JSON-pointer: ${$data}`);
    const up = +matches[1];
    jsonPointer = matches[2];
    if (jsonPointer === "#") {
      if (up >= dataLevel)
        throw new Error(errorMsg("property/index", up));
      return dataPathArr[dataLevel - up];
    }
    if (up > dataLevel)
      throw new Error(errorMsg("data", up));
    data = dataNames[dataLevel - up];
    if (!jsonPointer)
      return data;
  }
  let expr = data;
  const segments = jsonPointer.split("/");
  for (const segment of segments) {
    if (segment) {
      data = (0, codegen_1$Q._)`${data}${(0, codegen_1$Q.getProperty)((0, util_1$M.unescapeJsonPointer)(segment))}`;
      expr = (0, codegen_1$Q._)`${expr} && ${data}`;
    }
  }
  return expr;
  function errorMsg(pointerType, up) {
    return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
  }
}
validate$1.getData = getData;
var validation_error$1 = {};
Object.defineProperty(validation_error$1, "__esModule", { value: true });
class ValidationError extends Error {
  constructor(errors2) {
    super("validation failed");
    this.errors = errors2;
    this.ajv = this.validation = true;
  }
}
validation_error$1.default = ValidationError;
var ref_error$1 = {};
Object.defineProperty(ref_error$1, "__esModule", { value: true });
const resolve_1$3 = resolve$4;
let MissingRefError$1 = class MissingRefError extends Error {
  constructor(resolver, baseId, ref2, msg) {
    super(msg || `can't resolve reference ${ref2} from id ${baseId}`);
    this.missingRef = (0, resolve_1$3.resolveUrl)(resolver, baseId, ref2);
    this.missingSchema = (0, resolve_1$3.normalizeId)((0, resolve_1$3.getFullPath)(resolver, this.missingRef));
  }
};
ref_error$1.default = MissingRefError$1;
var compile$1 = {};
Object.defineProperty(compile$1, "__esModule", { value: true });
compile$1.resolveSchema = compile$1.getCompilingSchema = compile$1.resolveRef = compile$1.compileSchema = compile$1.SchemaEnv = void 0;
const codegen_1$P = codegen$1;
const validation_error_1$1 = validation_error$1;
const names_1$8 = names$2;
const resolve_1$2 = resolve$4;
const util_1$L = util$1;
const validate_1$3 = validate$1;
let SchemaEnv$1 = class SchemaEnv {
  constructor(env2) {
    var _a;
    this.refs = {};
    this.dynamicAnchors = {};
    let schema;
    if (typeof env2.schema == "object")
      schema = env2.schema;
    this.schema = env2.schema;
    this.schemaId = env2.schemaId;
    this.root = env2.root || this;
    this.baseId = (_a = env2.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1$2.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env2.schemaId || "$id"]);
    this.schemaPath = env2.schemaPath;
    this.localRefs = env2.localRefs;
    this.meta = env2.meta;
    this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
    this.refs = {};
  }
};
compile$1.SchemaEnv = SchemaEnv$1;
function compileSchema$1(sch) {
  const _sch = getCompilingSchema$1.call(this, sch);
  if (_sch)
    return _sch;
  const rootId = (0, resolve_1$2.getFullPath)(this.opts.uriResolver, sch.root.baseId);
  const { es5, lines } = this.opts.code;
  const { ownProperties } = this.opts;
  const gen = new codegen_1$P.CodeGen(this.scope, { es5, lines, ownProperties });
  let _ValidationError;
  if (sch.$async) {
    _ValidationError = gen.scopeValue("Error", {
      ref: validation_error_1$1.default,
      code: (0, codegen_1$P._)`require("ajv/dist/runtime/validation_error").default`
    });
  }
  const validateName = gen.scopeName("validate");
  sch.validateName = validateName;
  const schemaCxt = {
    gen,
    allErrors: this.opts.allErrors,
    data: names_1$8.default.data,
    parentData: names_1$8.default.parentData,
    parentDataProperty: names_1$8.default.parentDataProperty,
    dataNames: [names_1$8.default.data],
    dataPathArr: [codegen_1$P.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1$P.stringify)(sch.schema) } : { ref: sch.schema }),
    validateName,
    ValidationError: _ValidationError,
    schema: sch.schema,
    schemaEnv: sch,
    rootId,
    baseId: sch.baseId || rootId,
    schemaPath: codegen_1$P.nil,
    errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, codegen_1$P._)`""`,
    opts: this.opts,
    self: this
  };
  let sourceCode;
  try {
    this._compilations.add(sch);
    (0, validate_1$3.validateFunctionCode)(schemaCxt);
    gen.optimize(this.opts.code.optimize);
    const validateCode = gen.toString();
    sourceCode = `${gen.scopeRefs(names_1$8.default.scope)}return ${validateCode}`;
    if (this.opts.code.process)
      sourceCode = this.opts.code.process(sourceCode, sch);
    const makeValidate = new Function(`${names_1$8.default.self}`, `${names_1$8.default.scope}`, sourceCode);
    const validate2 = makeValidate(this, this.scope.get());
    this.scope.value(validateName, { ref: validate2 });
    validate2.errors = null;
    validate2.schema = sch.schema;
    validate2.schemaEnv = sch;
    if (sch.$async)
      validate2.$async = true;
    if (this.opts.code.source === true) {
      validate2.source = { validateName, validateCode, scopeValues: gen._values };
    }
    if (this.opts.unevaluated) {
      const { props, items: items2 } = schemaCxt;
      validate2.evaluated = {
        props: props instanceof codegen_1$P.Name ? void 0 : props,
        items: items2 instanceof codegen_1$P.Name ? void 0 : items2,
        dynamicProps: props instanceof codegen_1$P.Name,
        dynamicItems: items2 instanceof codegen_1$P.Name
      };
      if (validate2.source)
        validate2.source.evaluated = (0, codegen_1$P.stringify)(validate2.evaluated);
    }
    sch.validate = validate2;
    return sch;
  } catch (e) {
    delete sch.validate;
    delete sch.validateName;
    if (sourceCode)
      this.logger.error("Error compiling schema, function code:", sourceCode);
    throw e;
  } finally {
    this._compilations.delete(sch);
  }
}
compile$1.compileSchema = compileSchema$1;
function resolveRef$1(root, baseId, ref2) {
  var _a;
  ref2 = (0, resolve_1$2.resolveUrl)(this.opts.uriResolver, baseId, ref2);
  const schOrFunc = root.refs[ref2];
  if (schOrFunc)
    return schOrFunc;
  let _sch = resolve$3.call(this, root, ref2);
  if (_sch === void 0) {
    const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref2];
    const { schemaId } = this.opts;
    if (schema)
      _sch = new SchemaEnv$1({ schema, schemaId, root, baseId });
  }
  if (_sch === void 0)
    return;
  return root.refs[ref2] = inlineOrCompile$1.call(this, _sch);
}
compile$1.resolveRef = resolveRef$1;
function inlineOrCompile$1(sch) {
  if ((0, resolve_1$2.inlineRef)(sch.schema, this.opts.inlineRefs))
    return sch.schema;
  return sch.validate ? sch : compileSchema$1.call(this, sch);
}
function getCompilingSchema$1(schEnv) {
  for (const sch of this._compilations) {
    if (sameSchemaEnv$1(sch, schEnv))
      return sch;
  }
}
compile$1.getCompilingSchema = getCompilingSchema$1;
function sameSchemaEnv$1(s1, s2) {
  return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
}
function resolve$3(root, ref2) {
  let sch;
  while (typeof (sch = this.refs[ref2]) == "string")
    ref2 = sch;
  return sch || this.schemas[ref2] || resolveSchema$1.call(this, root, ref2);
}
function resolveSchema$1(root, ref2) {
  const p = this.opts.uriResolver.parse(ref2);
  const refPath = (0, resolve_1$2._getFullPath)(this.opts.uriResolver, p);
  let baseId = (0, resolve_1$2.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
  if (Object.keys(root.schema).length > 0 && refPath === baseId) {
    return getJsonPointer$1.call(this, p, root);
  }
  const id2 = (0, resolve_1$2.normalizeId)(refPath);
  const schOrRef = this.refs[id2] || this.schemas[id2];
  if (typeof schOrRef == "string") {
    const sch = resolveSchema$1.call(this, root, schOrRef);
    if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
      return;
    return getJsonPointer$1.call(this, p, sch);
  }
  if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
    return;
  if (!schOrRef.validate)
    compileSchema$1.call(this, schOrRef);
  if (id2 === (0, resolve_1$2.normalizeId)(ref2)) {
    const { schema } = schOrRef;
    const { schemaId } = this.opts;
    const schId = schema[schemaId];
    if (schId)
      baseId = (0, resolve_1$2.resolveUrl)(this.opts.uriResolver, baseId, schId);
    return new SchemaEnv$1({ schema, schemaId, root, baseId });
  }
  return getJsonPointer$1.call(this, p, schOrRef);
}
compile$1.resolveSchema = resolveSchema$1;
const PREVENT_SCOPE_CHANGE$1 = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function getJsonPointer$1(parsedRef, { baseId, schema, root }) {
  var _a;
  if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
    return;
  for (const part of parsedRef.fragment.slice(1).split("/")) {
    if (typeof schema === "boolean")
      return;
    const partSchema = schema[(0, util_1$L.unescapeFragment)(part)];
    if (partSchema === void 0)
      return;
    schema = partSchema;
    const schId = typeof schema === "object" && schema[this.opts.schemaId];
    if (!PREVENT_SCOPE_CHANGE$1.has(part) && schId) {
      baseId = (0, resolve_1$2.resolveUrl)(this.opts.uriResolver, baseId, schId);
    }
  }
  let env2;
  if (typeof schema != "boolean" && schema.$ref && !(0, util_1$L.schemaHasRulesButRef)(schema, this.RULES)) {
    const $ref = (0, resolve_1$2.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
    env2 = resolveSchema$1.call(this, root, $ref);
  }
  const { schemaId } = this.opts;
  env2 = env2 || new SchemaEnv$1({ schema, schemaId, root, baseId });
  if (env2.schema !== env2.root.schema)
    return env2;
  return void 0;
}
const $id$a = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
const description$1 = "Meta-schema for $data reference (JSON AnySchema extension proposal)";
const type$a = "object";
const required$3 = [
  "$data"
];
const properties$c = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
};
const additionalProperties$3 = false;
const require$$9$1 = {
  $id: $id$a,
  description: description$1,
  type: type$a,
  required: required$3,
  properties: properties$c,
  additionalProperties: additionalProperties$3
};
var uri$3 = {};
var fastUri$1 = { exports: {} };
const isUUID$1 = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
const isIPv4$1 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
function stringArrayToHexStripped(input) {
  let acc = "";
  let code2 = 0;
  let i = 0;
  for (i = 0; i < input.length; i++) {
    code2 = input[i].charCodeAt(0);
    if (code2 === 48) {
      continue;
    }
    if (!(code2 >= 48 && code2 <= 57 || code2 >= 65 && code2 <= 70 || code2 >= 97 && code2 <= 102)) {
      return "";
    }
    acc += input[i];
    break;
  }
  for (i += 1; i < input.length; i++) {
    code2 = input[i].charCodeAt(0);
    if (!(code2 >= 48 && code2 <= 57 || code2 >= 65 && code2 <= 70 || code2 >= 97 && code2 <= 102)) {
      return "";
    }
    acc += input[i];
  }
  return acc;
}
const nonSimpleDomain$1 = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
function consumeIsZone(buffer) {
  buffer.length = 0;
  return true;
}
function consumeHextets(buffer, address, output) {
  if (buffer.length) {
    const hex = stringArrayToHexStripped(buffer);
    if (hex !== "") {
      address.push(hex);
    } else {
      output.error = true;
      return false;
    }
    buffer.length = 0;
  }
  return true;
}
function getIPV6(input) {
  let tokenCount = 0;
  const output = { error: false, address: "", zone: "" };
  const address = [];
  const buffer = [];
  let endipv6Encountered = false;
  let endIpv6 = false;
  let consume = consumeHextets;
  for (let i = 0; i < input.length; i++) {
    const cursor = input[i];
    if (cursor === "[" || cursor === "]") {
      continue;
    }
    if (cursor === ":") {
      if (endipv6Encountered === true) {
        endIpv6 = true;
      }
      if (!consume(buffer, address, output)) {
        break;
      }
      if (++tokenCount > 7) {
        output.error = true;
        break;
      }
      if (i > 0 && input[i - 1] === ":") {
        endipv6Encountered = true;
      }
      address.push(":");
      continue;
    } else if (cursor === "%") {
      if (!consume(buffer, address, output)) {
        break;
      }
      consume = consumeIsZone;
    } else {
      buffer.push(cursor);
      continue;
    }
  }
  if (buffer.length) {
    if (consume === consumeIsZone) {
      output.zone = buffer.join("");
    } else if (endIpv6) {
      address.push(buffer.join(""));
    } else {
      address.push(stringArrayToHexStripped(buffer));
    }
  }
  output.address = address.join("");
  return output;
}
function normalizeIPv6$1(host) {
  if (findToken(host, ":") < 2) {
    return { host, isIPV6: false };
  }
  const ipv6 = getIPV6(host);
  if (!ipv6.error) {
    let newHost = ipv6.address;
    let escapedHost = ipv6.address;
    if (ipv6.zone) {
      newHost += "%" + ipv6.zone;
      escapedHost += "%25" + ipv6.zone;
    }
    return { host: newHost, isIPV6: true, escapedHost };
  } else {
    return { host, isIPV6: false };
  }
}
function findToken(str, token) {
  let ind = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === token) ind++;
  }
  return ind;
}
function removeDotSegments$1(path2) {
  let input = path2;
  const output = [];
  let nextSlash = -1;
  let len = 0;
  while (len = input.length) {
    if (len === 1) {
      if (input === ".") {
        break;
      } else if (input === "/") {
        output.push("/");
        break;
      } else {
        output.push(input);
        break;
      }
    } else if (len === 2) {
      if (input[0] === ".") {
        if (input[1] === ".") {
          break;
        } else if (input[1] === "/") {
          input = input.slice(2);
          continue;
        }
      } else if (input[0] === "/") {
        if (input[1] === "." || input[1] === "/") {
          output.push("/");
          break;
        }
      }
    } else if (len === 3) {
      if (input === "/..") {
        if (output.length !== 0) {
          output.pop();
        }
        output.push("/");
        break;
      }
    }
    if (input[0] === ".") {
      if (input[1] === ".") {
        if (input[2] === "/") {
          input = input.slice(3);
          continue;
        }
      } else if (input[1] === "/") {
        input = input.slice(2);
        continue;
      }
    } else if (input[0] === "/") {
      if (input[1] === ".") {
        if (input[2] === "/") {
          input = input.slice(2);
          continue;
        } else if (input[2] === ".") {
          if (input[3] === "/") {
            input = input.slice(3);
            if (output.length !== 0) {
              output.pop();
            }
            continue;
          }
        }
      }
    }
    if ((nextSlash = input.indexOf("/", 1)) === -1) {
      output.push(input);
      break;
    } else {
      output.push(input.slice(0, nextSlash));
      input = input.slice(nextSlash);
    }
  }
  return output.join("");
}
function normalizeComponentEncoding$1(component, esc) {
  const func = esc !== true ? escape : unescape;
  if (component.scheme !== void 0) {
    component.scheme = func(component.scheme);
  }
  if (component.userinfo !== void 0) {
    component.userinfo = func(component.userinfo);
  }
  if (component.host !== void 0) {
    component.host = func(component.host);
  }
  if (component.path !== void 0) {
    component.path = func(component.path);
  }
  if (component.query !== void 0) {
    component.query = func(component.query);
  }
  if (component.fragment !== void 0) {
    component.fragment = func(component.fragment);
  }
  return component;
}
function recomposeAuthority$1(component) {
  const uriTokens = [];
  if (component.userinfo !== void 0) {
    uriTokens.push(component.userinfo);
    uriTokens.push("@");
  }
  if (component.host !== void 0) {
    let host = unescape(component.host);
    if (!isIPv4$1(host)) {
      const ipV6res = normalizeIPv6$1(host);
      if (ipV6res.isIPV6 === true) {
        host = `[${ipV6res.escapedHost}]`;
      } else {
        host = component.host;
      }
    }
    uriTokens.push(host);
  }
  if (typeof component.port === "number" || typeof component.port === "string") {
    uriTokens.push(":");
    uriTokens.push(String(component.port));
  }
  return uriTokens.length ? uriTokens.join("") : void 0;
}
var utils = {
  nonSimpleDomain: nonSimpleDomain$1,
  recomposeAuthority: recomposeAuthority$1,
  normalizeComponentEncoding: normalizeComponentEncoding$1,
  removeDotSegments: removeDotSegments$1,
  isIPv4: isIPv4$1,
  isUUID: isUUID$1,
  normalizeIPv6: normalizeIPv6$1
};
const { isUUID } = utils;
const URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
function wsIsSecure(wsComponent) {
  if (wsComponent.secure === true) {
    return true;
  } else if (wsComponent.secure === false) {
    return false;
  } else if (wsComponent.scheme) {
    return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
  } else {
    return false;
  }
}
function httpParse(component) {
  if (!component.host) {
    component.error = component.error || "HTTP URIs must have a host.";
  }
  return component;
}
function httpSerialize(component) {
  const secure = String(component.scheme).toLowerCase() === "https";
  if (component.port === (secure ? 443 : 80) || component.port === "") {
    component.port = void 0;
  }
  if (!component.path) {
    component.path = "/";
  }
  return component;
}
function wsParse(wsComponent) {
  wsComponent.secure = wsIsSecure(wsComponent);
  wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
  wsComponent.path = void 0;
  wsComponent.query = void 0;
  return wsComponent;
}
function wsSerialize(wsComponent) {
  if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") {
    wsComponent.port = void 0;
  }
  if (typeof wsComponent.secure === "boolean") {
    wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
    wsComponent.secure = void 0;
  }
  if (wsComponent.resourceName) {
    const [path2, query] = wsComponent.resourceName.split("?");
    wsComponent.path = path2 && path2 !== "/" ? path2 : void 0;
    wsComponent.query = query;
    wsComponent.resourceName = void 0;
  }
  wsComponent.fragment = void 0;
  return wsComponent;
}
function urnParse(urnComponent, options) {
  if (!urnComponent.path) {
    urnComponent.error = "URN can not be parsed";
    return urnComponent;
  }
  const matches = urnComponent.path.match(URN_REG);
  if (matches) {
    const scheme = options.scheme || urnComponent.scheme || "urn";
    urnComponent.nid = matches[1].toLowerCase();
    urnComponent.nss = matches[2];
    const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
    const schemeHandler = getSchemeHandler$1(urnScheme);
    urnComponent.path = void 0;
    if (schemeHandler) {
      urnComponent = schemeHandler.parse(urnComponent, options);
    }
  } else {
    urnComponent.error = urnComponent.error || "URN can not be parsed.";
  }
  return urnComponent;
}
function urnSerialize(urnComponent, options) {
  if (urnComponent.nid === void 0) {
    throw new Error("URN without nid cannot be serialized");
  }
  const scheme = options.scheme || urnComponent.scheme || "urn";
  const nid = urnComponent.nid.toLowerCase();
  const urnScheme = `${scheme}:${options.nid || nid}`;
  const schemeHandler = getSchemeHandler$1(urnScheme);
  if (schemeHandler) {
    urnComponent = schemeHandler.serialize(urnComponent, options);
  }
  const uriComponent = urnComponent;
  const nss = urnComponent.nss;
  uriComponent.path = `${nid || options.nid}:${nss}`;
  options.skipEscape = true;
  return uriComponent;
}
function urnuuidParse(urnComponent, options) {
  const uuidComponent = urnComponent;
  uuidComponent.uuid = uuidComponent.nss;
  uuidComponent.nss = void 0;
  if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
    uuidComponent.error = uuidComponent.error || "UUID is not valid.";
  }
  return uuidComponent;
}
function urnuuidSerialize(uuidComponent) {
  const urnComponent = uuidComponent;
  urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
  return urnComponent;
}
const http = (
  /** @type {SchemeHandler} */
  {
    scheme: "http",
    domainHost: true,
    parse: httpParse,
    serialize: httpSerialize
  }
);
const https = (
  /** @type {SchemeHandler} */
  {
    scheme: "https",
    domainHost: http.domainHost,
    parse: httpParse,
    serialize: httpSerialize
  }
);
const ws = (
  /** @type {SchemeHandler} */
  {
    scheme: "ws",
    domainHost: true,
    parse: wsParse,
    serialize: wsSerialize
  }
);
const wss = (
  /** @type {SchemeHandler} */
  {
    scheme: "wss",
    domainHost: ws.domainHost,
    parse: ws.parse,
    serialize: ws.serialize
  }
);
const urn = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn",
    parse: urnParse,
    serialize: urnSerialize,
    skipNormalize: true
  }
);
const urnuuid = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn:uuid",
    parse: urnuuidParse,
    serialize: urnuuidSerialize,
    skipNormalize: true
  }
);
const SCHEMES$1 = (
  /** @type {Record<SchemeName, SchemeHandler>} */
  {
    http,
    https,
    ws,
    wss,
    urn,
    "urn:uuid": urnuuid
  }
);
Object.setPrototypeOf(SCHEMES$1, null);
function getSchemeHandler$1(scheme) {
  return scheme && (SCHEMES$1[
    /** @type {SchemeName} */
    scheme
  ] || SCHEMES$1[
    /** @type {SchemeName} */
    scheme.toLowerCase()
  ]) || void 0;
}
var schemes = {
  SCHEMES: SCHEMES$1,
  getSchemeHandler: getSchemeHandler$1
};
const { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizeComponentEncoding, isIPv4, nonSimpleDomain } = utils;
const { SCHEMES, getSchemeHandler } = schemes;
function normalize(uri2, options) {
  if (typeof uri2 === "string") {
    uri2 = /** @type {T} */
    serialize(parse$7(uri2, options), options);
  } else if (typeof uri2 === "object") {
    uri2 = /** @type {T} */
    parse$7(serialize(uri2, options), options);
  }
  return uri2;
}
function resolve$2(baseURI, relativeURI, options) {
  const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
  const resolved = resolveComponent(parse$7(baseURI, schemelessOptions), parse$7(relativeURI, schemelessOptions), schemelessOptions, true);
  schemelessOptions.skipEscape = true;
  return serialize(resolved, schemelessOptions);
}
function resolveComponent(base, relative, options, skipNormalization) {
  const target = {};
  if (!skipNormalization) {
    base = parse$7(serialize(base, options), options);
    relative = parse$7(serialize(relative, options), options);
  }
  options = options || {};
  if (!options.tolerant && relative.scheme) {
    target.scheme = relative.scheme;
    target.userinfo = relative.userinfo;
    target.host = relative.host;
    target.port = relative.port;
    target.path = removeDotSegments(relative.path || "");
    target.query = relative.query;
  } else {
    if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
      target.userinfo = relative.userinfo;
      target.host = relative.host;
      target.port = relative.port;
      target.path = removeDotSegments(relative.path || "");
      target.query = relative.query;
    } else {
      if (!relative.path) {
        target.path = base.path;
        if (relative.query !== void 0) {
          target.query = relative.query;
        } else {
          target.query = base.query;
        }
      } else {
        if (relative.path[0] === "/") {
          target.path = removeDotSegments(relative.path);
        } else {
          if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
            target.path = "/" + relative.path;
          } else if (!base.path) {
            target.path = relative.path;
          } else {
            target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
          }
          target.path = removeDotSegments(target.path);
        }
        target.query = relative.query;
      }
      target.userinfo = base.userinfo;
      target.host = base.host;
      target.port = base.port;
    }
    target.scheme = base.scheme;
  }
  target.fragment = relative.fragment;
  return target;
}
function equal$5(uriA, uriB, options) {
  if (typeof uriA === "string") {
    uriA = unescape(uriA);
    uriA = serialize(normalizeComponentEncoding(parse$7(uriA, options), true), { ...options, skipEscape: true });
  } else if (typeof uriA === "object") {
    uriA = serialize(normalizeComponentEncoding(uriA, true), { ...options, skipEscape: true });
  }
  if (typeof uriB === "string") {
    uriB = unescape(uriB);
    uriB = serialize(normalizeComponentEncoding(parse$7(uriB, options), true), { ...options, skipEscape: true });
  } else if (typeof uriB === "object") {
    uriB = serialize(normalizeComponentEncoding(uriB, true), { ...options, skipEscape: true });
  }
  return uriA.toLowerCase() === uriB.toLowerCase();
}
function serialize(cmpts, opts) {
  const component = {
    host: cmpts.host,
    scheme: cmpts.scheme,
    userinfo: cmpts.userinfo,
    port: cmpts.port,
    path: cmpts.path,
    query: cmpts.query,
    nid: cmpts.nid,
    nss: cmpts.nss,
    uuid: cmpts.uuid,
    fragment: cmpts.fragment,
    reference: cmpts.reference,
    resourceName: cmpts.resourceName,
    secure: cmpts.secure,
    error: ""
  };
  const options = Object.assign({}, opts);
  const uriTokens = [];
  const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
  if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
  if (component.path !== void 0) {
    if (!options.skipEscape) {
      component.path = escape(component.path);
      if (component.scheme !== void 0) {
        component.path = component.path.split("%3A").join(":");
      }
    } else {
      component.path = unescape(component.path);
    }
  }
  if (options.reference !== "suffix" && component.scheme) {
    uriTokens.push(component.scheme, ":");
  }
  const authority = recomposeAuthority(component);
  if (authority !== void 0) {
    if (options.reference !== "suffix") {
      uriTokens.push("//");
    }
    uriTokens.push(authority);
    if (component.path && component.path[0] !== "/") {
      uriTokens.push("/");
    }
  }
  if (component.path !== void 0) {
    let s = component.path;
    if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
      s = removeDotSegments(s);
    }
    if (authority === void 0 && s[0] === "/" && s[1] === "/") {
      s = "/%2F" + s.slice(2);
    }
    uriTokens.push(s);
  }
  if (component.query !== void 0) {
    uriTokens.push("?", component.query);
  }
  if (component.fragment !== void 0) {
    uriTokens.push("#", component.fragment);
  }
  return uriTokens.join("");
}
const URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
function parse$7(uri2, opts) {
  const options = Object.assign({}, opts);
  const parsed = {
    scheme: void 0,
    userinfo: void 0,
    host: "",
    port: void 0,
    path: "",
    query: void 0,
    fragment: void 0
  };
  let isIP = false;
  if (options.reference === "suffix") {
    if (options.scheme) {
      uri2 = options.scheme + ":" + uri2;
    } else {
      uri2 = "//" + uri2;
    }
  }
  const matches = uri2.match(URI_PARSE);
  if (matches) {
    parsed.scheme = matches[1];
    parsed.userinfo = matches[3];
    parsed.host = matches[4];
    parsed.port = parseInt(matches[5], 10);
    parsed.path = matches[6] || "";
    parsed.query = matches[7];
    parsed.fragment = matches[8];
    if (isNaN(parsed.port)) {
      parsed.port = matches[5];
    }
    if (parsed.host) {
      const ipv4result = isIPv4(parsed.host);
      if (ipv4result === false) {
        const ipv6result = normalizeIPv6(parsed.host);
        parsed.host = ipv6result.host.toLowerCase();
        isIP = ipv6result.isIPV6;
      } else {
        isIP = true;
      }
    }
    if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) {
      parsed.reference = "same-document";
    } else if (parsed.scheme === void 0) {
      parsed.reference = "relative";
    } else if (parsed.fragment === void 0) {
      parsed.reference = "absolute";
    } else {
      parsed.reference = "uri";
    }
    if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
      parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
    }
    const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
    if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
      if (parsed.host && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
        try {
          parsed.host = URL.domainToASCII(parsed.host.toLowerCase());
        } catch (e) {
          parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
        }
      }
    }
    if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
      if (uri2.indexOf("%") !== -1) {
        if (parsed.scheme !== void 0) {
          parsed.scheme = unescape(parsed.scheme);
        }
        if (parsed.host !== void 0) {
          parsed.host = unescape(parsed.host);
        }
      }
      if (parsed.path) {
        parsed.path = escape(unescape(parsed.path));
      }
      if (parsed.fragment) {
        parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
      }
    }
    if (schemeHandler && schemeHandler.parse) {
      schemeHandler.parse(parsed, options);
    }
  } else {
    parsed.error = parsed.error || "URI can not be parsed.";
  }
  return parsed;
}
const fastUri = {
  SCHEMES,
  normalize,
  resolve: resolve$2,
  resolveComponent,
  equal: equal$5,
  serialize,
  parse: parse$7
};
fastUri$1.exports = fastUri;
fastUri$1.exports.default = fastUri;
fastUri$1.exports.fastUri = fastUri;
var fastUriExports = fastUri$1.exports;
Object.defineProperty(uri$3, "__esModule", { value: true });
const uri$2 = fastUriExports;
uri$2.code = 'require("ajv/dist/runtime/uri").default';
uri$3.default = uri$2;
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.CodeGen = exports$1.Name = exports$1.nil = exports$1.stringify = exports$1.str = exports$1._ = exports$1.KeywordCxt = void 0;
  var validate_12 = validate$1;
  Object.defineProperty(exports$1, "KeywordCxt", { enumerable: true, get: function() {
    return validate_12.KeywordCxt;
  } });
  var codegen_12 = codegen$1;
  Object.defineProperty(exports$1, "_", { enumerable: true, get: function() {
    return codegen_12._;
  } });
  Object.defineProperty(exports$1, "str", { enumerable: true, get: function() {
    return codegen_12.str;
  } });
  Object.defineProperty(exports$1, "stringify", { enumerable: true, get: function() {
    return codegen_12.stringify;
  } });
  Object.defineProperty(exports$1, "nil", { enumerable: true, get: function() {
    return codegen_12.nil;
  } });
  Object.defineProperty(exports$1, "Name", { enumerable: true, get: function() {
    return codegen_12.Name;
  } });
  Object.defineProperty(exports$1, "CodeGen", { enumerable: true, get: function() {
    return codegen_12.CodeGen;
  } });
  const validation_error_12 = validation_error$1;
  const ref_error_12 = ref_error$1;
  const rules_12 = rules$1;
  const compile_12 = compile$1;
  const codegen_2 = codegen$1;
  const resolve_12 = resolve$4;
  const dataType_12 = dataType$1;
  const util_12 = util$1;
  const $dataRefSchema = require$$9$1;
  const uri_1 = uri$3;
  const defaultRegExp = (str, flags) => new RegExp(str, flags);
  defaultRegExp.code = "new RegExp";
  const META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
  const EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]);
  const removedOptions = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now."
  };
  const deprecatedOptions = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  };
  const MAX_EXPRESSION = 200;
  function requiredOptions(o) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    const s = o.strict;
    const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
    const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
    const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
    const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
    return {
      strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
      strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
      strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
      strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
      strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
      code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
      loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
      loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
      meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
      messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
      inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
      schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
      addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
      validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
      validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
      unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
      int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
      uriResolver
    };
  }
  class Ajv {
    constructor(opts = {}) {
      this.schemas = {};
      this.refs = {};
      this.formats = {};
      this._compilations = /* @__PURE__ */ new Set();
      this._loading = {};
      this._cache = /* @__PURE__ */ new Map();
      opts = this.opts = { ...opts, ...requiredOptions(opts) };
      const { es5, lines } = this.opts.code;
      this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
      this.logger = getLogger(opts.logger);
      const formatOpt = opts.validateFormats;
      opts.validateFormats = false;
      this.RULES = (0, rules_12.getRules)();
      checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
      checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
      this._metaOpts = getMetaSchemaOptions.call(this);
      if (opts.formats)
        addInitialFormats.call(this);
      this._addVocabularies();
      this._addDefaultMetaSchema();
      if (opts.keywords)
        addInitialKeywords.call(this, opts.keywords);
      if (typeof opts.meta == "object")
        this.addMetaSchema(opts.meta);
      addInitialSchemas.call(this);
      opts.validateFormats = formatOpt;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data, meta, schemaId } = this.opts;
      let _dataRefSchema = $dataRefSchema;
      if (schemaId === "id") {
        _dataRefSchema = { ...$dataRefSchema };
        _dataRefSchema.id = _dataRefSchema.$id;
        delete _dataRefSchema.$id;
      }
      if (meta && $data)
        this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
    }
    defaultMeta() {
      const { meta, schemaId } = this.opts;
      return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
    }
    validate(schemaKeyRef, data) {
      let v;
      if (typeof schemaKeyRef == "string") {
        v = this.getSchema(schemaKeyRef);
        if (!v)
          throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
      } else {
        v = this.compile(schemaKeyRef);
      }
      const valid2 = v(data);
      if (!("$async" in v))
        this.errors = v.errors;
      return valid2;
    }
    compile(schema, _meta) {
      const sch = this._addSchema(schema, _meta);
      return sch.validate || this._compileSchemaEnv(sch);
    }
    compileAsync(schema, meta) {
      if (typeof this.opts.loadSchema != "function") {
        throw new Error("options.loadSchema should be a function");
      }
      const { loadSchema } = this.opts;
      return runCompileAsync.call(this, schema, meta);
      async function runCompileAsync(_schema, _meta) {
        await loadMetaSchema.call(this, _schema.$schema);
        const sch = this._addSchema(_schema, _meta);
        return sch.validate || _compileAsync.call(this, sch);
      }
      async function loadMetaSchema($ref) {
        if ($ref && !this.getSchema($ref)) {
          await runCompileAsync.call(this, { $ref }, true);
        }
      }
      async function _compileAsync(sch) {
        try {
          return this._compileSchemaEnv(sch);
        } catch (e) {
          if (!(e instanceof ref_error_12.default))
            throw e;
          checkLoaded.call(this, e);
          await loadMissingSchema.call(this, e.missingSchema);
          return _compileAsync.call(this, sch);
        }
      }
      function checkLoaded({ missingSchema: ref2, missingRef }) {
        if (this.refs[ref2]) {
          throw new Error(`AnySchema ${ref2} is loaded but ${missingRef} cannot be resolved`);
        }
      }
      async function loadMissingSchema(ref2) {
        const _schema = await _loadSchema.call(this, ref2);
        if (!this.refs[ref2])
          await loadMetaSchema.call(this, _schema.$schema);
        if (!this.refs[ref2])
          this.addSchema(_schema, ref2, meta);
      }
      async function _loadSchema(ref2) {
        const p = this._loading[ref2];
        if (p)
          return p;
        try {
          return await (this._loading[ref2] = loadSchema(ref2));
        } finally {
          delete this._loading[ref2];
        }
      }
    }
    // Adds schema to the instance
    addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
      if (Array.isArray(schema)) {
        for (const sch of schema)
          this.addSchema(sch, void 0, _meta, _validateSchema);
        return this;
      }
      let id2;
      if (typeof schema === "object") {
        const { schemaId } = this.opts;
        id2 = schema[schemaId];
        if (id2 !== void 0 && typeof id2 != "string") {
          throw new Error(`schema ${schemaId} must be string`);
        }
      }
      key = (0, resolve_12.normalizeId)(key || id2);
      this._checkUnique(key);
      this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
      return this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
      this.addSchema(schema, key, true, _validateSchema);
      return this;
    }
    //  Validate schema against its meta-schema
    validateSchema(schema, throwOrLogError) {
      if (typeof schema == "boolean")
        return true;
      let $schema2;
      $schema2 = schema.$schema;
      if ($schema2 !== void 0 && typeof $schema2 != "string") {
        throw new Error("$schema must be a string");
      }
      $schema2 = $schema2 || this.opts.defaultMeta || this.defaultMeta();
      if (!$schema2) {
        this.logger.warn("meta-schema not available");
        this.errors = null;
        return true;
      }
      const valid2 = this.validate($schema2, schema);
      if (!valid2 && throwOrLogError) {
        const message = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log")
          this.logger.error(message);
        else
          throw new Error(message);
      }
      return valid2;
    }
    // Get compiled schema by `key` or `ref`.
    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
    getSchema(keyRef) {
      let sch;
      while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
        keyRef = sch;
      if (sch === void 0) {
        const { schemaId } = this.opts;
        const root = new compile_12.SchemaEnv({ schema: {}, schemaId });
        sch = compile_12.resolveSchema.call(this, root, keyRef);
        if (!sch)
          return;
        this.refs[keyRef] = sch;
      }
      return sch.validate || this._compileSchemaEnv(sch);
    }
    // Remove cached schema(s).
    // If no parameter is passed all schemas but meta-schemas are removed.
    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
    removeSchema(schemaKeyRef) {
      if (schemaKeyRef instanceof RegExp) {
        this._removeAllSchemas(this.schemas, schemaKeyRef);
        this._removeAllSchemas(this.refs, schemaKeyRef);
        return this;
      }
      switch (typeof schemaKeyRef) {
        case "undefined":
          this._removeAllSchemas(this.schemas);
          this._removeAllSchemas(this.refs);
          this._cache.clear();
          return this;
        case "string": {
          const sch = getSchEnv.call(this, schemaKeyRef);
          if (typeof sch == "object")
            this._cache.delete(sch.schema);
          delete this.schemas[schemaKeyRef];
          delete this.refs[schemaKeyRef];
          return this;
        }
        case "object": {
          const cacheKey = schemaKeyRef;
          this._cache.delete(cacheKey);
          let id2 = schemaKeyRef[this.opts.schemaId];
          if (id2) {
            id2 = (0, resolve_12.normalizeId)(id2);
            delete this.schemas[id2];
            delete this.refs[id2];
          }
          return this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(definitions2) {
      for (const def2 of definitions2)
        this.addKeyword(def2);
      return this;
    }
    addKeyword(kwdOrDef, def2) {
      let keyword2;
      if (typeof kwdOrDef == "string") {
        keyword2 = kwdOrDef;
        if (typeof def2 == "object") {
          this.logger.warn("these parameters are deprecated, see docs for addKeyword");
          def2.keyword = keyword2;
        }
      } else if (typeof kwdOrDef == "object" && def2 === void 0) {
        def2 = kwdOrDef;
        keyword2 = def2.keyword;
        if (Array.isArray(keyword2) && !keyword2.length) {
          throw new Error("addKeywords: keyword must be string or non-empty array");
        }
      } else {
        throw new Error("invalid addKeywords parameters");
      }
      checkKeyword.call(this, keyword2, def2);
      if (!def2) {
        (0, util_12.eachItem)(keyword2, (kwd) => addRule.call(this, kwd));
        return this;
      }
      keywordMetaschema.call(this, def2);
      const definition = {
        ...def2,
        type: (0, dataType_12.getJSONTypes)(def2.type),
        schemaType: (0, dataType_12.getJSONTypes)(def2.schemaType)
      };
      (0, util_12.eachItem)(keyword2, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t2) => addRule.call(this, k, definition, t2)));
      return this;
    }
    getKeyword(keyword2) {
      const rule = this.RULES.all[keyword2];
      return typeof rule == "object" ? rule.definition : !!rule;
    }
    // Remove keyword
    removeKeyword(keyword2) {
      const { RULES } = this;
      delete RULES.keywords[keyword2];
      delete RULES.all[keyword2];
      for (const group of RULES.rules) {
        const i = group.rules.findIndex((rule) => rule.keyword === keyword2);
        if (i >= 0)
          group.rules.splice(i, 1);
      }
      return this;
    }
    // Add format
    addFormat(name, format2) {
      if (typeof format2 == "string")
        format2 = new RegExp(format2);
      this.formats[name] = format2;
      return this;
    }
    errorsText(errors2 = this.errors, { separator = ", ", dataVar = "data" } = {}) {
      if (!errors2 || errors2.length === 0)
        return "No errors";
      return errors2.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
    }
    $dataMetaSchema(metaSchema2, keywordsJsonPointers) {
      const rules2 = this.RULES.all;
      metaSchema2 = JSON.parse(JSON.stringify(metaSchema2));
      for (const jsonPointer of keywordsJsonPointers) {
        const segments = jsonPointer.split("/").slice(1);
        let keywords = metaSchema2;
        for (const seg of segments)
          keywords = keywords[seg];
        for (const key in rules2) {
          const rule = rules2[key];
          if (typeof rule != "object")
            continue;
          const { $data } = rule.definition;
          const schema = keywords[key];
          if ($data && schema)
            keywords[key] = schemaOrData(schema);
        }
      }
      return metaSchema2;
    }
    _removeAllSchemas(schemas, regex) {
      for (const keyRef in schemas) {
        const sch = schemas[keyRef];
        if (!regex || regex.test(keyRef)) {
          if (typeof sch == "string") {
            delete schemas[keyRef];
          } else if (sch && !sch.meta) {
            this._cache.delete(sch.schema);
            delete schemas[keyRef];
          }
        }
      }
    }
    _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
      let id2;
      const { schemaId } = this.opts;
      if (typeof schema == "object") {
        id2 = schema[schemaId];
      } else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        else if (typeof schema != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let sch = this._cache.get(schema);
      if (sch !== void 0)
        return sch;
      baseId = (0, resolve_12.normalizeId)(id2 || baseId);
      const localRefs = resolve_12.getSchemaRefs.call(this, schema, baseId);
      sch = new compile_12.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
      this._cache.set(sch.schema, sch);
      if (addSchema && !baseId.startsWith("#")) {
        if (baseId)
          this._checkUnique(baseId);
        this.refs[baseId] = sch;
      }
      if (validateSchema)
        this.validateSchema(schema, true);
      return sch;
    }
    _checkUnique(id2) {
      if (this.schemas[id2] || this.refs[id2]) {
        throw new Error(`schema with key or id "${id2}" already exists`);
      }
    }
    _compileSchemaEnv(sch) {
      if (sch.meta)
        this._compileMetaSchema(sch);
      else
        compile_12.compileSchema.call(this, sch);
      if (!sch.validate)
        throw new Error("ajv implementation error");
      return sch.validate;
    }
    _compileMetaSchema(sch) {
      const currentOpts = this.opts;
      this.opts = this._metaOpts;
      try {
        compile_12.compileSchema.call(this, sch);
      } finally {
        this.opts = currentOpts;
      }
    }
  }
  Ajv.ValidationError = validation_error_12.default;
  Ajv.MissingRefError = ref_error_12.default;
  exports$1.default = Ajv;
  function checkOptions(checkOpts, options, msg, log = "error") {
    for (const key in checkOpts) {
      const opt = key;
      if (opt in options)
        this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
    }
  }
  function getSchEnv(keyRef) {
    keyRef = (0, resolve_12.normalizeId)(keyRef);
    return this.schemas[keyRef] || this.refs[keyRef];
  }
  function addInitialSchemas() {
    const optsSchemas = this.opts.schemas;
    if (!optsSchemas)
      return;
    if (Array.isArray(optsSchemas))
      this.addSchema(optsSchemas);
    else
      for (const key in optsSchemas)
        this.addSchema(optsSchemas[key], key);
  }
  function addInitialFormats() {
    for (const name in this.opts.formats) {
      const format2 = this.opts.formats[name];
      if (format2)
        this.addFormat(name, format2);
    }
  }
  function addInitialKeywords(defs) {
    if (Array.isArray(defs)) {
      this.addVocabulary(defs);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const keyword2 in defs) {
      const def2 = defs[keyword2];
      if (!def2.keyword)
        def2.keyword = keyword2;
      this.addKeyword(def2);
    }
  }
  function getMetaSchemaOptions() {
    const metaOpts = { ...this.opts };
    for (const opt of META_IGNORE_OPTIONS)
      delete metaOpts[opt];
    return metaOpts;
  }
  const noLogs = { log() {
  }, warn() {
  }, error() {
  } };
  function getLogger(logger) {
    if (logger === false)
      return noLogs;
    if (logger === void 0)
      return console;
    if (logger.log && logger.warn && logger.error)
      return logger;
    throw new Error("logger must implement log, warn and error methods");
  }
  const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
  function checkKeyword(keyword2, def2) {
    const { RULES } = this;
    (0, util_12.eachItem)(keyword2, (kwd) => {
      if (RULES.keywords[kwd])
        throw new Error(`Keyword ${kwd} is already defined`);
      if (!KEYWORD_NAME.test(kwd))
        throw new Error(`Keyword ${kwd} has invalid name`);
    });
    if (!def2)
      return;
    if (def2.$data && !("code" in def2 || "validate" in def2)) {
      throw new Error('$data keyword must have "code" or "validate" function');
    }
  }
  function addRule(keyword2, definition, dataType2) {
    var _a;
    const post = definition === null || definition === void 0 ? void 0 : definition.post;
    if (dataType2 && post)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES } = this;
    let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t2 }) => t2 === dataType2);
    if (!ruleGroup) {
      ruleGroup = { type: dataType2, rules: [] };
      RULES.rules.push(ruleGroup);
    }
    RULES.keywords[keyword2] = true;
    if (!definition)
      return;
    const rule = {
      keyword: keyword2,
      definition: {
        ...definition,
        type: (0, dataType_12.getJSONTypes)(definition.type),
        schemaType: (0, dataType_12.getJSONTypes)(definition.schemaType)
      }
    };
    if (definition.before)
      addBeforeRule.call(this, ruleGroup, rule, definition.before);
    else
      ruleGroup.rules.push(rule);
    RULES.all[keyword2] = rule;
    (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
  }
  function addBeforeRule(ruleGroup, rule, before) {
    const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
    if (i >= 0) {
      ruleGroup.rules.splice(i, 0, rule);
    } else {
      ruleGroup.rules.push(rule);
      this.logger.warn(`rule ${before} is not defined`);
    }
  }
  function keywordMetaschema(def2) {
    let { metaSchema: metaSchema2 } = def2;
    if (metaSchema2 === void 0)
      return;
    if (def2.$data && this.opts.$data)
      metaSchema2 = schemaOrData(metaSchema2);
    def2.validateSchema = this.compile(metaSchema2, true);
  }
  const $dataRef = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function schemaOrData(schema) {
    return { anyOf: [schema, $dataRef] };
  }
})(core$6);
var draft2020 = {};
var core$5 = {};
var id$1 = {};
Object.defineProperty(id$1, "__esModule", { value: true });
const def$12 = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
id$1.default = def$12;
var ref$1 = {};
Object.defineProperty(ref$1, "__esModule", { value: true });
ref$1.callRef = ref$1.getValidate = void 0;
const ref_error_1$3 = ref_error$1;
const code_1$i = code$2;
const codegen_1$O = codegen$1;
const names_1$7 = names$2;
const compile_1$4 = compile$1;
const util_1$K = util$1;
const def$11 = {
  keyword: "$ref",
  schemaType: "string",
  code(cxt) {
    const { gen, schema: $ref, it } = cxt;
    const { baseId, schemaEnv: env2, validateName, opts, self } = it;
    const { root } = env2;
    if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
      return callRootRef();
    const schOrEnv = compile_1$4.resolveRef.call(self, root, baseId, $ref);
    if (schOrEnv === void 0)
      throw new ref_error_1$3.default(it.opts.uriResolver, baseId, $ref);
    if (schOrEnv instanceof compile_1$4.SchemaEnv)
      return callValidate(schOrEnv);
    return inlineRefSchema(schOrEnv);
    function callRootRef() {
      if (env2 === root)
        return callRef$1(cxt, validateName, env2, env2.$async);
      const rootName = gen.scopeValue("root", { ref: root });
      return callRef$1(cxt, (0, codegen_1$O._)`${rootName}.validate`, root, root.$async);
    }
    function callValidate(sch) {
      const v = getValidate$1(cxt, sch);
      callRef$1(cxt, v, sch, sch.$async);
    }
    function inlineRefSchema(sch) {
      const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1$O.stringify)(sch) } : { ref: sch });
      const valid2 = gen.name("valid");
      const schCxt = cxt.subschema({
        schema: sch,
        dataTypes: [],
        schemaPath: codegen_1$O.nil,
        topSchemaRef: schName,
        errSchemaPath: $ref
      }, valid2);
      cxt.mergeEvaluated(schCxt);
      cxt.ok(valid2);
    }
  }
};
function getValidate$1(cxt, sch) {
  const { gen } = cxt;
  return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1$O._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
}
ref$1.getValidate = getValidate$1;
function callRef$1(cxt, v, sch, $async) {
  const { gen, it } = cxt;
  const { allErrors, schemaEnv: env2, opts } = it;
  const passCxt = opts.passContext ? names_1$7.default.this : codegen_1$O.nil;
  if ($async)
    callAsyncRef();
  else
    callSyncRef();
  function callAsyncRef() {
    if (!env2.$async)
      throw new Error("async schema referenced by sync schema");
    const valid2 = gen.let("valid");
    gen.try(() => {
      gen.code((0, codegen_1$O._)`await ${(0, code_1$i.callValidateCode)(cxt, v, passCxt)}`);
      addEvaluatedFrom(v);
      if (!allErrors)
        gen.assign(valid2, true);
    }, (e) => {
      gen.if((0, codegen_1$O._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
      addErrorsFrom(e);
      if (!allErrors)
        gen.assign(valid2, false);
    });
    cxt.ok(valid2);
  }
  function callSyncRef() {
    cxt.result((0, code_1$i.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
  }
  function addErrorsFrom(source) {
    const errs = (0, codegen_1$O._)`${source}.errors`;
    gen.assign(names_1$7.default.vErrors, (0, codegen_1$O._)`${names_1$7.default.vErrors} === null ? ${errs} : ${names_1$7.default.vErrors}.concat(${errs})`);
    gen.assign(names_1$7.default.errors, (0, codegen_1$O._)`${names_1$7.default.vErrors}.length`);
  }
  function addEvaluatedFrom(source) {
    var _a;
    if (!it.opts.unevaluated)
      return;
    const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
    if (it.props !== true) {
      if (schEvaluated && !schEvaluated.dynamicProps) {
        if (schEvaluated.props !== void 0) {
          it.props = util_1$K.mergeEvaluated.props(gen, schEvaluated.props, it.props);
        }
      } else {
        const props = gen.var("props", (0, codegen_1$O._)`${source}.evaluated.props`);
        it.props = util_1$K.mergeEvaluated.props(gen, props, it.props, codegen_1$O.Name);
      }
    }
    if (it.items !== true) {
      if (schEvaluated && !schEvaluated.dynamicItems) {
        if (schEvaluated.items !== void 0) {
          it.items = util_1$K.mergeEvaluated.items(gen, schEvaluated.items, it.items);
        }
      } else {
        const items2 = gen.var("items", (0, codegen_1$O._)`${source}.evaluated.items`);
        it.items = util_1$K.mergeEvaluated.items(gen, items2, it.items, codegen_1$O.Name);
      }
    }
  }
}
ref$1.callRef = callRef$1;
ref$1.default = def$11;
Object.defineProperty(core$5, "__esModule", { value: true });
const id_1$1 = id$1;
const ref_1$3 = ref$1;
const core$4 = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  id_1$1.default,
  ref_1$3.default
];
core$5.default = core$4;
var validation$4 = {};
var limitNumber$1 = {};
Object.defineProperty(limitNumber$1, "__esModule", { value: true });
const codegen_1$N = codegen$1;
const ops$1 = codegen_1$N.operators;
const KWDs$1 = {
  maximum: { okStr: "<=", ok: ops$1.LTE, fail: ops$1.GT },
  minimum: { okStr: ">=", ok: ops$1.GTE, fail: ops$1.LT },
  exclusiveMaximum: { okStr: "<", ok: ops$1.LT, fail: ops$1.GTE },
  exclusiveMinimum: { okStr: ">", ok: ops$1.GT, fail: ops$1.LTE }
};
const error$D = {
  message: ({ keyword: keyword2, schemaCode }) => (0, codegen_1$N.str)`must be ${KWDs$1[keyword2].okStr} ${schemaCode}`,
  params: ({ keyword: keyword2, schemaCode }) => (0, codegen_1$N._)`{comparison: ${KWDs$1[keyword2].okStr}, limit: ${schemaCode}}`
};
const def$10 = {
  keyword: Object.keys(KWDs$1),
  type: "number",
  schemaType: "number",
  $data: true,
  error: error$D,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    cxt.fail$data((0, codegen_1$N._)`${data} ${KWDs$1[keyword2].fail} ${schemaCode} || isNaN(${data})`);
  }
};
limitNumber$1.default = def$10;
var multipleOf$1 = {};
Object.defineProperty(multipleOf$1, "__esModule", { value: true });
const codegen_1$M = codegen$1;
const error$C = {
  message: ({ schemaCode }) => (0, codegen_1$M.str)`must be multiple of ${schemaCode}`,
  params: ({ schemaCode }) => (0, codegen_1$M._)`{multipleOf: ${schemaCode}}`
};
const def$$ = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: true,
  error: error$C,
  code(cxt) {
    const { gen, data, schemaCode, it } = cxt;
    const prec = it.opts.multipleOfPrecision;
    const res = gen.let("res");
    const invalid = prec ? (0, codegen_1$M._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1$M._)`${res} !== parseInt(${res})`;
    cxt.fail$data((0, codegen_1$M._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
  }
};
multipleOf$1.default = def$$;
var limitLength$1 = {};
var ucs2length$3 = {};
Object.defineProperty(ucs2length$3, "__esModule", { value: true });
function ucs2length$2(str) {
  const len = str.length;
  let length = 0;
  let pos = 0;
  let value;
  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);
    if (value >= 55296 && value <= 56319 && pos < len) {
      value = str.charCodeAt(pos);
      if ((value & 64512) === 56320)
        pos++;
    }
  }
  return length;
}
ucs2length$3.default = ucs2length$2;
ucs2length$2.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(limitLength$1, "__esModule", { value: true });
const codegen_1$L = codegen$1;
const util_1$J = util$1;
const ucs2length_1$1 = ucs2length$3;
const error$B = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxLength" ? "more" : "fewer";
    return (0, codegen_1$L.str)`must NOT have ${comp} than ${schemaCode} characters`;
  },
  params: ({ schemaCode }) => (0, codegen_1$L._)`{limit: ${schemaCode}}`
};
const def$_ = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: true,
  error: error$B,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode, it } = cxt;
    const op = keyword2 === "maxLength" ? codegen_1$L.operators.GT : codegen_1$L.operators.LT;
    const len = it.opts.unicode === false ? (0, codegen_1$L._)`${data}.length` : (0, codegen_1$L._)`${(0, util_1$J.useFunc)(cxt.gen, ucs2length_1$1.default)}(${data})`;
    cxt.fail$data((0, codegen_1$L._)`${len} ${op} ${schemaCode}`);
  }
};
limitLength$1.default = def$_;
var pattern$1 = {};
Object.defineProperty(pattern$1, "__esModule", { value: true });
const code_1$h = code$2;
const codegen_1$K = codegen$1;
const error$A = {
  message: ({ schemaCode }) => (0, codegen_1$K.str)`must match pattern "${schemaCode}"`,
  params: ({ schemaCode }) => (0, codegen_1$K._)`{pattern: ${schemaCode}}`
};
const def$Z = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: true,
  error: error$A,
  code(cxt) {
    const { data, $data, schema, schemaCode, it } = cxt;
    const u = it.opts.unicodeRegExp ? "u" : "";
    const regExp = $data ? (0, codegen_1$K._)`(new RegExp(${schemaCode}, ${u}))` : (0, code_1$h.usePattern)(cxt, schema);
    cxt.fail$data((0, codegen_1$K._)`!${regExp}.test(${data})`);
  }
};
pattern$1.default = def$Z;
var limitProperties$1 = {};
Object.defineProperty(limitProperties$1, "__esModule", { value: true });
const codegen_1$J = codegen$1;
const error$z = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxProperties" ? "more" : "fewer";
    return (0, codegen_1$J.str)`must NOT have ${comp} than ${schemaCode} properties`;
  },
  params: ({ schemaCode }) => (0, codegen_1$J._)`{limit: ${schemaCode}}`
};
const def$Y = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: true,
  error: error$z,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    const op = keyword2 === "maxProperties" ? codegen_1$J.operators.GT : codegen_1$J.operators.LT;
    cxt.fail$data((0, codegen_1$J._)`Object.keys(${data}).length ${op} ${schemaCode}`);
  }
};
limitProperties$1.default = def$Y;
var required$2 = {};
Object.defineProperty(required$2, "__esModule", { value: true });
const code_1$g = code$2;
const codegen_1$I = codegen$1;
const util_1$I = util$1;
const error$y = {
  message: ({ params: { missingProperty } }) => (0, codegen_1$I.str)`must have required property '${missingProperty}'`,
  params: ({ params: { missingProperty } }) => (0, codegen_1$I._)`{missingProperty: ${missingProperty}}`
};
const def$X = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: true,
  error: error$y,
  code(cxt) {
    const { gen, schema, schemaCode, data, $data, it } = cxt;
    const { opts } = it;
    if (!$data && schema.length === 0)
      return;
    const useLoop = schema.length >= opts.loopRequired;
    if (it.allErrors)
      allErrorsMode();
    else
      exitOnErrorMode();
    if (opts.strictRequired) {
      const props = cxt.parentSchema.properties;
      const { definedProperties } = cxt.it;
      for (const requiredKey of schema) {
        if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
          const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
          const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
          (0, util_1$I.checkStrictMode)(it, msg, it.opts.strictRequired);
        }
      }
    }
    function allErrorsMode() {
      if (useLoop || $data) {
        cxt.block$data(codegen_1$I.nil, loopAllRequired);
      } else {
        for (const prop of schema) {
          (0, code_1$g.checkReportMissingProp)(cxt, prop);
        }
      }
    }
    function exitOnErrorMode() {
      const missing = gen.let("missing");
      if (useLoop || $data) {
        const valid2 = gen.let("valid", true);
        cxt.block$data(valid2, () => loopUntilMissing(missing, valid2));
        cxt.ok(valid2);
      } else {
        gen.if((0, code_1$g.checkMissingProp)(cxt, schema, missing));
        (0, code_1$g.reportMissingProp)(cxt, missing);
        gen.else();
      }
    }
    function loopAllRequired() {
      gen.forOf("prop", schemaCode, (prop) => {
        cxt.setParams({ missingProperty: prop });
        gen.if((0, code_1$g.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
      });
    }
    function loopUntilMissing(missing, valid2) {
      cxt.setParams({ missingProperty: missing });
      gen.forOf(missing, schemaCode, () => {
        gen.assign(valid2, (0, code_1$g.propertyInData)(gen, data, missing, opts.ownProperties));
        gen.if((0, codegen_1$I.not)(valid2), () => {
          cxt.error();
          gen.break();
        });
      }, codegen_1$I.nil);
    }
  }
};
required$2.default = def$X;
var limitItems$1 = {};
Object.defineProperty(limitItems$1, "__esModule", { value: true });
const codegen_1$H = codegen$1;
const error$x = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxItems" ? "more" : "fewer";
    return (0, codegen_1$H.str)`must NOT have ${comp} than ${schemaCode} items`;
  },
  params: ({ schemaCode }) => (0, codegen_1$H._)`{limit: ${schemaCode}}`
};
const def$W = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: true,
  error: error$x,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    const op = keyword2 === "maxItems" ? codegen_1$H.operators.GT : codegen_1$H.operators.LT;
    cxt.fail$data((0, codegen_1$H._)`${data}.length ${op} ${schemaCode}`);
  }
};
limitItems$1.default = def$W;
var uniqueItems$1 = {};
var equal$4 = {};
Object.defineProperty(equal$4, "__esModule", { value: true });
const equal$3 = fastDeepEqual;
equal$3.code = 'require("ajv/dist/runtime/equal").default';
equal$4.default = equal$3;
Object.defineProperty(uniqueItems$1, "__esModule", { value: true });
const dataType_1$1 = dataType$1;
const codegen_1$G = codegen$1;
const util_1$H = util$1;
const equal_1$5 = equal$4;
const error$w = {
  message: ({ params: { i, j } }) => (0, codegen_1$G.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
  params: ({ params: { i, j } }) => (0, codegen_1$G._)`{i: ${i}, j: ${j}}`
};
const def$V = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: true,
  error: error$w,
  code(cxt) {
    const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
    if (!$data && !schema)
      return;
    const valid2 = gen.let("valid");
    const itemTypes = parentSchema.items ? (0, dataType_1$1.getSchemaTypes)(parentSchema.items) : [];
    cxt.block$data(valid2, validateUniqueItems, (0, codegen_1$G._)`${schemaCode} === false`);
    cxt.ok(valid2);
    function validateUniqueItems() {
      const i = gen.let("i", (0, codegen_1$G._)`${data}.length`);
      const j = gen.let("j");
      cxt.setParams({ i, j });
      gen.assign(valid2, true);
      gen.if((0, codegen_1$G._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
    }
    function canOptimize() {
      return itemTypes.length > 0 && !itemTypes.some((t2) => t2 === "object" || t2 === "array");
    }
    function loopN(i, j) {
      const item = gen.name("item");
      const wrongType = (0, dataType_1$1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1$1.DataType.Wrong);
      const indices = gen.const("indices", (0, codegen_1$G._)`{}`);
      gen.for((0, codegen_1$G._)`;${i}--;`, () => {
        gen.let(item, (0, codegen_1$G._)`${data}[${i}]`);
        gen.if(wrongType, (0, codegen_1$G._)`continue`);
        if (itemTypes.length > 1)
          gen.if((0, codegen_1$G._)`typeof ${item} == "string"`, (0, codegen_1$G._)`${item} += "_"`);
        gen.if((0, codegen_1$G._)`typeof ${indices}[${item}] == "number"`, () => {
          gen.assign(j, (0, codegen_1$G._)`${indices}[${item}]`);
          cxt.error();
          gen.assign(valid2, false).break();
        }).code((0, codegen_1$G._)`${indices}[${item}] = ${i}`);
      });
    }
    function loopN2(i, j) {
      const eql = (0, util_1$H.useFunc)(gen, equal_1$5.default);
      const outer = gen.name("outer");
      gen.label(outer).for((0, codegen_1$G._)`;${i}--;`, () => gen.for((0, codegen_1$G._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1$G._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
        cxt.error();
        gen.assign(valid2, false).break(outer);
      })));
    }
  }
};
uniqueItems$1.default = def$V;
var _const$1 = {};
Object.defineProperty(_const$1, "__esModule", { value: true });
const codegen_1$F = codegen$1;
const util_1$G = util$1;
const equal_1$4 = equal$4;
const error$v = {
  message: "must be equal to constant",
  params: ({ schemaCode }) => (0, codegen_1$F._)`{allowedValue: ${schemaCode}}`
};
const def$U = {
  keyword: "const",
  $data: true,
  error: error$v,
  code(cxt) {
    const { gen, data, $data, schemaCode, schema } = cxt;
    if ($data || schema && typeof schema == "object") {
      cxt.fail$data((0, codegen_1$F._)`!${(0, util_1$G.useFunc)(gen, equal_1$4.default)}(${data}, ${schemaCode})`);
    } else {
      cxt.fail((0, codegen_1$F._)`${schema} !== ${data}`);
    }
  }
};
_const$1.default = def$U;
var _enum$1 = {};
Object.defineProperty(_enum$1, "__esModule", { value: true });
const codegen_1$E = codegen$1;
const util_1$F = util$1;
const equal_1$3 = equal$4;
const error$u = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode }) => (0, codegen_1$E._)`{allowedValues: ${schemaCode}}`
};
const def$T = {
  keyword: "enum",
  schemaType: "array",
  $data: true,
  error: error$u,
  code(cxt) {
    const { gen, data, $data, schema, schemaCode, it } = cxt;
    if (!$data && schema.length === 0)
      throw new Error("enum must have non-empty array");
    const useLoop = schema.length >= it.opts.loopEnum;
    let eql;
    const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1$F.useFunc)(gen, equal_1$3.default);
    let valid2;
    if (useLoop || $data) {
      valid2 = gen.let("valid");
      cxt.block$data(valid2, loopEnum);
    } else {
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const vSchema = gen.const("vSchema", schemaCode);
      valid2 = (0, codegen_1$E.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
    }
    cxt.pass(valid2);
    function loopEnum() {
      gen.assign(valid2, false);
      gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1$E._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid2, true).break()));
    }
    function equalCode(vSchema, i) {
      const sch = schema[i];
      return typeof sch === "object" && sch !== null ? (0, codegen_1$E._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1$E._)`${data} === ${sch}`;
    }
  }
};
_enum$1.default = def$T;
Object.defineProperty(validation$4, "__esModule", { value: true });
const limitNumber_1$1 = limitNumber$1;
const multipleOf_1$1 = multipleOf$1;
const limitLength_1$1 = limitLength$1;
const pattern_1$1 = pattern$1;
const limitProperties_1$1 = limitProperties$1;
const required_1$1 = required$2;
const limitItems_1$1 = limitItems$1;
const uniqueItems_1$1 = uniqueItems$1;
const const_1$1 = _const$1;
const enum_1$1 = _enum$1;
const validation$3 = [
  // number
  limitNumber_1$1.default,
  multipleOf_1$1.default,
  // string
  limitLength_1$1.default,
  pattern_1$1.default,
  // object
  limitProperties_1$1.default,
  required_1$1.default,
  // array
  limitItems_1$1.default,
  uniqueItems_1$1.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  const_1$1.default,
  enum_1$1.default
];
validation$4.default = validation$3;
var applicator$2 = {};
var additionalItems$1 = {};
Object.defineProperty(additionalItems$1, "__esModule", { value: true });
additionalItems$1.validateAdditionalItems = void 0;
const codegen_1$D = codegen$1;
const util_1$E = util$1;
const error$t = {
  message: ({ params: { len } }) => (0, codegen_1$D.str)`must NOT have more than ${len} items`,
  params: ({ params: { len } }) => (0, codegen_1$D._)`{limit: ${len}}`
};
const def$S = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: error$t,
  code(cxt) {
    const { parentSchema, it } = cxt;
    const { items: items2 } = parentSchema;
    if (!Array.isArray(items2)) {
      (0, util_1$E.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    validateAdditionalItems$1(cxt, items2);
  }
};
function validateAdditionalItems$1(cxt, items2) {
  const { gen, schema, data, keyword: keyword2, it } = cxt;
  it.items = true;
  const len = gen.const("len", (0, codegen_1$D._)`${data}.length`);
  if (schema === false) {
    cxt.setParams({ len: items2.length });
    cxt.pass((0, codegen_1$D._)`${len} <= ${items2.length}`);
  } else if (typeof schema == "object" && !(0, util_1$E.alwaysValidSchema)(it, schema)) {
    const valid2 = gen.var("valid", (0, codegen_1$D._)`${len} <= ${items2.length}`);
    gen.if((0, codegen_1$D.not)(valid2), () => validateItems(valid2));
    cxt.ok(valid2);
  }
  function validateItems(valid2) {
    gen.forRange("i", items2.length, len, (i) => {
      cxt.subschema({ keyword: keyword2, dataProp: i, dataPropType: util_1$E.Type.Num }, valid2);
      if (!it.allErrors)
        gen.if((0, codegen_1$D.not)(valid2), () => gen.break());
    });
  }
}
additionalItems$1.validateAdditionalItems = validateAdditionalItems$1;
additionalItems$1.default = def$S;
var prefixItems$1 = {};
var items$1 = {};
Object.defineProperty(items$1, "__esModule", { value: true });
items$1.validateTuple = void 0;
const codegen_1$C = codegen$1;
const util_1$D = util$1;
const code_1$f = code$2;
const def$R = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(cxt) {
    const { schema, it } = cxt;
    if (Array.isArray(schema))
      return validateTuple$1(cxt, "additionalItems", schema);
    it.items = true;
    if ((0, util_1$D.alwaysValidSchema)(it, schema))
      return;
    cxt.ok((0, code_1$f.validateArray)(cxt));
  }
};
function validateTuple$1(cxt, extraItems, schArr = cxt.schema) {
  const { gen, parentSchema, data, keyword: keyword2, it } = cxt;
  checkStrictTuple(parentSchema);
  if (it.opts.unevaluated && schArr.length && it.items !== true) {
    it.items = util_1$D.mergeEvaluated.items(gen, schArr.length, it.items);
  }
  const valid2 = gen.name("valid");
  const len = gen.const("len", (0, codegen_1$C._)`${data}.length`);
  schArr.forEach((sch, i) => {
    if ((0, util_1$D.alwaysValidSchema)(it, sch))
      return;
    gen.if((0, codegen_1$C._)`${len} > ${i}`, () => cxt.subschema({
      keyword: keyword2,
      schemaProp: i,
      dataProp: i
    }, valid2));
    cxt.ok(valid2);
  });
  function checkStrictTuple(sch) {
    const { opts, errSchemaPath } = it;
    const l = schArr.length;
    const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
    if (opts.strictTuples && !fullTuple) {
      const msg = `"${keyword2}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
      (0, util_1$D.checkStrictMode)(it, msg, opts.strictTuples);
    }
  }
}
items$1.validateTuple = validateTuple$1;
items$1.default = def$R;
Object.defineProperty(prefixItems$1, "__esModule", { value: true });
const items_1$3 = items$1;
const def$Q = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (cxt) => (0, items_1$3.validateTuple)(cxt, "items")
};
prefixItems$1.default = def$Q;
var items2020$1 = {};
Object.defineProperty(items2020$1, "__esModule", { value: true });
const codegen_1$B = codegen$1;
const util_1$C = util$1;
const code_1$e = code$2;
const additionalItems_1$3 = additionalItems$1;
const error$s = {
  message: ({ params: { len } }) => (0, codegen_1$B.str)`must NOT have more than ${len} items`,
  params: ({ params: { len } }) => (0, codegen_1$B._)`{limit: ${len}}`
};
const def$P = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: error$s,
  code(cxt) {
    const { schema, parentSchema, it } = cxt;
    const { prefixItems: prefixItems2 } = parentSchema;
    it.items = true;
    if ((0, util_1$C.alwaysValidSchema)(it, schema))
      return;
    if (prefixItems2)
      (0, additionalItems_1$3.validateAdditionalItems)(cxt, prefixItems2);
    else
      cxt.ok((0, code_1$e.validateArray)(cxt));
  }
};
items2020$1.default = def$P;
var contains$1 = {};
Object.defineProperty(contains$1, "__esModule", { value: true });
const codegen_1$A = codegen$1;
const util_1$B = util$1;
const error$r = {
  message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1$A.str)`must contain at least ${min} valid item(s)` : (0, codegen_1$A.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
  params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1$A._)`{minContains: ${min}}` : (0, codegen_1$A._)`{minContains: ${min}, maxContains: ${max}}`
};
const def$O = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: true,
  error: error$r,
  code(cxt) {
    const { gen, schema, parentSchema, data, it } = cxt;
    let min;
    let max;
    const { minContains, maxContains } = parentSchema;
    if (it.opts.next) {
      min = minContains === void 0 ? 1 : minContains;
      max = maxContains;
    } else {
      min = 1;
    }
    const len = gen.const("len", (0, codegen_1$A._)`${data}.length`);
    cxt.setParams({ min, max });
    if (max === void 0 && min === 0) {
      (0, util_1$B.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
      return;
    }
    if (max !== void 0 && min > max) {
      (0, util_1$B.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
      cxt.fail();
      return;
    }
    if ((0, util_1$B.alwaysValidSchema)(it, schema)) {
      let cond = (0, codegen_1$A._)`${len} >= ${min}`;
      if (max !== void 0)
        cond = (0, codegen_1$A._)`${cond} && ${len} <= ${max}`;
      cxt.pass(cond);
      return;
    }
    it.items = true;
    const valid2 = gen.name("valid");
    if (max === void 0 && min === 1) {
      validateItems(valid2, () => gen.if(valid2, () => gen.break()));
    } else if (min === 0) {
      gen.let(valid2, true);
      if (max !== void 0)
        gen.if((0, codegen_1$A._)`${data}.length > 0`, validateItemsWithCount);
    } else {
      gen.let(valid2, false);
      validateItemsWithCount();
    }
    cxt.result(valid2, () => cxt.reset());
    function validateItemsWithCount() {
      const schValid = gen.name("_valid");
      const count = gen.let("count", 0);
      validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
    }
    function validateItems(_valid, block) {
      gen.forRange("i", 0, len, (i) => {
        cxt.subschema({
          keyword: "contains",
          dataProp: i,
          dataPropType: util_1$B.Type.Num,
          compositeRule: true
        }, _valid);
        block();
      });
    }
    function checkLimits(count) {
      gen.code((0, codegen_1$A._)`${count}++`);
      if (max === void 0) {
        gen.if((0, codegen_1$A._)`${count} >= ${min}`, () => gen.assign(valid2, true).break());
      } else {
        gen.if((0, codegen_1$A._)`${count} > ${max}`, () => gen.assign(valid2, false).break());
        if (min === 1)
          gen.assign(valid2, true);
        else
          gen.if((0, codegen_1$A._)`${count} >= ${min}`, () => gen.assign(valid2, true));
      }
    }
  }
};
contains$1.default = def$O;
var dependencies$1 = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.validateSchemaDeps = exports$1.validatePropertyDeps = exports$1.error = void 0;
  const codegen_12 = codegen$1;
  const util_12 = util$1;
  const code_12 = code$2;
  exports$1.error = {
    message: ({ params: { property, depsCount, deps } }) => {
      const property_ies = depsCount === 1 ? "property" : "properties";
      return (0, codegen_12.str)`must have ${property_ies} ${deps} when property ${property} is present`;
    },
    params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_12._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
    // TODO change to reference
  };
  const def2 = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: exports$1.error,
    code(cxt) {
      const [propDeps, schDeps] = splitDependencies(cxt);
      validatePropertyDeps(cxt, propDeps);
      validateSchemaDeps(cxt, schDeps);
    }
  };
  function splitDependencies({ schema }) {
    const propertyDeps = {};
    const schemaDeps = {};
    for (const key in schema) {
      if (key === "__proto__")
        continue;
      const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
      deps[key] = schema[key];
    }
    return [propertyDeps, schemaDeps];
  }
  function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
    const { gen, data, it } = cxt;
    if (Object.keys(propertyDeps).length === 0)
      return;
    const missing = gen.let("missing");
    for (const prop in propertyDeps) {
      const deps = propertyDeps[prop];
      if (deps.length === 0)
        continue;
      const hasProperty2 = (0, code_12.propertyInData)(gen, data, prop, it.opts.ownProperties);
      cxt.setParams({
        property: prop,
        depsCount: deps.length,
        deps: deps.join(", ")
      });
      if (it.allErrors) {
        gen.if(hasProperty2, () => {
          for (const depProp of deps) {
            (0, code_12.checkReportMissingProp)(cxt, depProp);
          }
        });
      } else {
        gen.if((0, codegen_12._)`${hasProperty2} && (${(0, code_12.checkMissingProp)(cxt, deps, missing)})`);
        (0, code_12.reportMissingProp)(cxt, missing);
        gen.else();
      }
    }
  }
  exports$1.validatePropertyDeps = validatePropertyDeps;
  function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
    const { gen, data, keyword: keyword2, it } = cxt;
    const valid2 = gen.name("valid");
    for (const prop in schemaDeps) {
      if ((0, util_12.alwaysValidSchema)(it, schemaDeps[prop]))
        continue;
      gen.if(
        (0, code_12.propertyInData)(gen, data, prop, it.opts.ownProperties),
        () => {
          const schCxt = cxt.subschema({ keyword: keyword2, schemaProp: prop }, valid2);
          cxt.mergeValidEvaluated(schCxt, valid2);
        },
        () => gen.var(valid2, true)
        // TODO var
      );
      cxt.ok(valid2);
    }
  }
  exports$1.validateSchemaDeps = validateSchemaDeps;
  exports$1.default = def2;
})(dependencies$1);
var propertyNames$1 = {};
Object.defineProperty(propertyNames$1, "__esModule", { value: true });
const codegen_1$z = codegen$1;
const util_1$A = util$1;
const error$q = {
  message: "property name must be valid",
  params: ({ params }) => (0, codegen_1$z._)`{propertyName: ${params.propertyName}}`
};
const def$N = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: error$q,
  code(cxt) {
    const { gen, schema, data, it } = cxt;
    if ((0, util_1$A.alwaysValidSchema)(it, schema))
      return;
    const valid2 = gen.name("valid");
    gen.forIn("key", data, (key) => {
      cxt.setParams({ propertyName: key });
      cxt.subschema({
        keyword: "propertyNames",
        data: key,
        dataTypes: ["string"],
        propertyName: key,
        compositeRule: true
      }, valid2);
      gen.if((0, codegen_1$z.not)(valid2), () => {
        cxt.error(true);
        if (!it.allErrors)
          gen.break();
      });
    });
    cxt.ok(valid2);
  }
};
propertyNames$1.default = def$N;
var additionalProperties$2 = {};
Object.defineProperty(additionalProperties$2, "__esModule", { value: true });
const code_1$d = code$2;
const codegen_1$y = codegen$1;
const names_1$6 = names$2;
const util_1$z = util$1;
const error$p = {
  message: "must NOT have additional properties",
  params: ({ params }) => (0, codegen_1$y._)`{additionalProperty: ${params.additionalProperty}}`
};
const def$M = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: true,
  trackErrors: true,
  error: error$p,
  code(cxt) {
    const { gen, schema, parentSchema, data, errsCount, it } = cxt;
    if (!errsCount)
      throw new Error("ajv implementation error");
    const { allErrors, opts } = it;
    it.props = true;
    if (opts.removeAdditional !== "all" && (0, util_1$z.alwaysValidSchema)(it, schema))
      return;
    const props = (0, code_1$d.allSchemaProperties)(parentSchema.properties);
    const patProps = (0, code_1$d.allSchemaProperties)(parentSchema.patternProperties);
    checkAdditionalProperties();
    cxt.ok((0, codegen_1$y._)`${errsCount} === ${names_1$6.default.errors}`);
    function checkAdditionalProperties() {
      gen.forIn("key", data, (key) => {
        if (!props.length && !patProps.length)
          additionalPropertyCode(key);
        else
          gen.if(isAdditional(key), () => additionalPropertyCode(key));
      });
    }
    function isAdditional(key) {
      let definedProp;
      if (props.length > 8) {
        const propsSchema = (0, util_1$z.schemaRefOrVal)(it, parentSchema.properties, "properties");
        definedProp = (0, code_1$d.isOwnProperty)(gen, propsSchema, key);
      } else if (props.length) {
        definedProp = (0, codegen_1$y.or)(...props.map((p) => (0, codegen_1$y._)`${key} === ${p}`));
      } else {
        definedProp = codegen_1$y.nil;
      }
      if (patProps.length) {
        definedProp = (0, codegen_1$y.or)(definedProp, ...patProps.map((p) => (0, codegen_1$y._)`${(0, code_1$d.usePattern)(cxt, p)}.test(${key})`));
      }
      return (0, codegen_1$y.not)(definedProp);
    }
    function deleteAdditional(key) {
      gen.code((0, codegen_1$y._)`delete ${data}[${key}]`);
    }
    function additionalPropertyCode(key) {
      if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
        deleteAdditional(key);
        return;
      }
      if (schema === false) {
        cxt.setParams({ additionalProperty: key });
        cxt.error();
        if (!allErrors)
          gen.break();
        return;
      }
      if (typeof schema == "object" && !(0, util_1$z.alwaysValidSchema)(it, schema)) {
        const valid2 = gen.name("valid");
        if (opts.removeAdditional === "failing") {
          applyAdditionalSchema(key, valid2, false);
          gen.if((0, codegen_1$y.not)(valid2), () => {
            cxt.reset();
            deleteAdditional(key);
          });
        } else {
          applyAdditionalSchema(key, valid2);
          if (!allErrors)
            gen.if((0, codegen_1$y.not)(valid2), () => gen.break());
        }
      }
    }
    function applyAdditionalSchema(key, valid2, errors2) {
      const subschema2 = {
        keyword: "additionalProperties",
        dataProp: key,
        dataPropType: util_1$z.Type.Str
      };
      if (errors2 === false) {
        Object.assign(subschema2, {
          compositeRule: true,
          createErrors: false,
          allErrors: false
        });
      }
      cxt.subschema(subschema2, valid2);
    }
  }
};
additionalProperties$2.default = def$M;
var properties$b = {};
Object.defineProperty(properties$b, "__esModule", { value: true });
const validate_1$2 = validate$1;
const code_1$c = code$2;
const util_1$y = util$1;
const additionalProperties_1$3 = additionalProperties$2;
const def$L = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(cxt) {
    const { gen, schema, parentSchema, data, it } = cxt;
    if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
      additionalProperties_1$3.default.code(new validate_1$2.KeywordCxt(it, additionalProperties_1$3.default, "additionalProperties"));
    }
    const allProps = (0, code_1$c.allSchemaProperties)(schema);
    for (const prop of allProps) {
      it.definedProperties.add(prop);
    }
    if (it.opts.unevaluated && allProps.length && it.props !== true) {
      it.props = util_1$y.mergeEvaluated.props(gen, (0, util_1$y.toHash)(allProps), it.props);
    }
    const properties2 = allProps.filter((p) => !(0, util_1$y.alwaysValidSchema)(it, schema[p]));
    if (properties2.length === 0)
      return;
    const valid2 = gen.name("valid");
    for (const prop of properties2) {
      if (hasDefault(prop)) {
        applyPropertySchema(prop);
      } else {
        gen.if((0, code_1$c.propertyInData)(gen, data, prop, it.opts.ownProperties));
        applyPropertySchema(prop);
        if (!it.allErrors)
          gen.else().var(valid2, true);
        gen.endIf();
      }
      cxt.it.definedProperties.add(prop);
      cxt.ok(valid2);
    }
    function hasDefault(prop) {
      return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
    }
    function applyPropertySchema(prop) {
      cxt.subschema({
        keyword: "properties",
        schemaProp: prop,
        dataProp: prop
      }, valid2);
    }
  }
};
properties$b.default = def$L;
var patternProperties$1 = {};
Object.defineProperty(patternProperties$1, "__esModule", { value: true });
const code_1$b = code$2;
const codegen_1$x = codegen$1;
const util_1$x = util$1;
const util_2$1 = util$1;
const def$K = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(cxt) {
    const { gen, schema, data, parentSchema, it } = cxt;
    const { opts } = it;
    const patterns = (0, code_1$b.allSchemaProperties)(schema);
    const alwaysValidPatterns = patterns.filter((p) => (0, util_1$x.alwaysValidSchema)(it, schema[p]));
    if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
      return;
    }
    const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
    const valid2 = gen.name("valid");
    if (it.props !== true && !(it.props instanceof codegen_1$x.Name)) {
      it.props = (0, util_2$1.evaluatedPropsToName)(gen, it.props);
    }
    const { props } = it;
    validatePatternProperties();
    function validatePatternProperties() {
      for (const pat of patterns) {
        if (checkProperties)
          checkMatchingProperties(pat);
        if (it.allErrors) {
          validateProperties(pat);
        } else {
          gen.var(valid2, true);
          validateProperties(pat);
          gen.if(valid2);
        }
      }
    }
    function checkMatchingProperties(pat) {
      for (const prop in checkProperties) {
        if (new RegExp(pat).test(prop)) {
          (0, util_1$x.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
        }
      }
    }
    function validateProperties(pat) {
      gen.forIn("key", data, (key) => {
        gen.if((0, codegen_1$x._)`${(0, code_1$b.usePattern)(cxt, pat)}.test(${key})`, () => {
          const alwaysValid = alwaysValidPatterns.includes(pat);
          if (!alwaysValid) {
            cxt.subschema({
              keyword: "patternProperties",
              schemaProp: pat,
              dataProp: key,
              dataPropType: util_2$1.Type.Str
            }, valid2);
          }
          if (it.opts.unevaluated && props !== true) {
            gen.assign((0, codegen_1$x._)`${props}[${key}]`, true);
          } else if (!alwaysValid && !it.allErrors) {
            gen.if((0, codegen_1$x.not)(valid2), () => gen.break());
          }
        });
      });
    }
  }
};
patternProperties$1.default = def$K;
var not$1 = {};
Object.defineProperty(not$1, "__esModule", { value: true });
const util_1$w = util$1;
const def$J = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: true,
  code(cxt) {
    const { gen, schema, it } = cxt;
    if ((0, util_1$w.alwaysValidSchema)(it, schema)) {
      cxt.fail();
      return;
    }
    const valid2 = gen.name("valid");
    cxt.subschema({
      keyword: "not",
      compositeRule: true,
      createErrors: false,
      allErrors: false
    }, valid2);
    cxt.failResult(valid2, () => cxt.reset(), () => cxt.error());
  },
  error: { message: "must NOT be valid" }
};
not$1.default = def$J;
var anyOf$1 = {};
Object.defineProperty(anyOf$1, "__esModule", { value: true });
const code_1$a = code$2;
const def$I = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: true,
  code: code_1$a.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
anyOf$1.default = def$I;
var oneOf$1 = {};
Object.defineProperty(oneOf$1, "__esModule", { value: true });
const codegen_1$w = codegen$1;
const util_1$v = util$1;
const error$o = {
  message: "must match exactly one schema in oneOf",
  params: ({ params }) => (0, codegen_1$w._)`{passingSchemas: ${params.passing}}`
};
const def$H = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: true,
  error: error$o,
  code(cxt) {
    const { gen, schema, parentSchema, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    if (it.opts.discriminator && parentSchema.discriminator)
      return;
    const schArr = schema;
    const valid2 = gen.let("valid", false);
    const passing = gen.let("passing", null);
    const schValid = gen.name("_valid");
    cxt.setParams({ passing });
    gen.block(validateOneOf);
    cxt.result(valid2, () => cxt.reset(), () => cxt.error(true));
    function validateOneOf() {
      schArr.forEach((sch, i) => {
        let schCxt;
        if ((0, util_1$v.alwaysValidSchema)(it, sch)) {
          gen.var(schValid, true);
        } else {
          schCxt = cxt.subschema({
            keyword: "oneOf",
            schemaProp: i,
            compositeRule: true
          }, schValid);
        }
        if (i > 0) {
          gen.if((0, codegen_1$w._)`${schValid} && ${valid2}`).assign(valid2, false).assign(passing, (0, codegen_1$w._)`[${passing}, ${i}]`).else();
        }
        gen.if(schValid, () => {
          gen.assign(valid2, true);
          gen.assign(passing, i);
          if (schCxt)
            cxt.mergeEvaluated(schCxt, codegen_1$w.Name);
        });
      });
    }
  }
};
oneOf$1.default = def$H;
var allOf$2 = {};
Object.defineProperty(allOf$2, "__esModule", { value: true });
const util_1$u = util$1;
const def$G = {
  keyword: "allOf",
  schemaType: "array",
  code(cxt) {
    const { gen, schema, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    const valid2 = gen.name("valid");
    schema.forEach((sch, i) => {
      if ((0, util_1$u.alwaysValidSchema)(it, sch))
        return;
      const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid2);
      cxt.ok(valid2);
      cxt.mergeEvaluated(schCxt);
    });
  }
};
allOf$2.default = def$G;
var _if$1 = {};
Object.defineProperty(_if$1, "__esModule", { value: true });
const codegen_1$v = codegen$1;
const util_1$t = util$1;
const error$n = {
  message: ({ params }) => (0, codegen_1$v.str)`must match "${params.ifClause}" schema`,
  params: ({ params }) => (0, codegen_1$v._)`{failingKeyword: ${params.ifClause}}`
};
const def$F = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: true,
  error: error$n,
  code(cxt) {
    const { gen, parentSchema, it } = cxt;
    if (parentSchema.then === void 0 && parentSchema.else === void 0) {
      (0, util_1$t.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
    }
    const hasThen = hasSchema$1(it, "then");
    const hasElse = hasSchema$1(it, "else");
    if (!hasThen && !hasElse)
      return;
    const valid2 = gen.let("valid", true);
    const schValid = gen.name("_valid");
    validateIf();
    cxt.reset();
    if (hasThen && hasElse) {
      const ifClause = gen.let("ifClause");
      cxt.setParams({ ifClause });
      gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
    } else if (hasThen) {
      gen.if(schValid, validateClause("then"));
    } else {
      gen.if((0, codegen_1$v.not)(schValid), validateClause("else"));
    }
    cxt.pass(valid2, () => cxt.error(true));
    function validateIf() {
      const schCxt = cxt.subschema({
        keyword: "if",
        compositeRule: true,
        createErrors: false,
        allErrors: false
      }, schValid);
      cxt.mergeEvaluated(schCxt);
    }
    function validateClause(keyword2, ifClause) {
      return () => {
        const schCxt = cxt.subschema({ keyword: keyword2 }, schValid);
        gen.assign(valid2, schValid);
        cxt.mergeValidEvaluated(schCxt, valid2);
        if (ifClause)
          gen.assign(ifClause, (0, codegen_1$v._)`${keyword2}`);
        else
          cxt.setParams({ ifClause: keyword2 });
      };
    }
  }
};
function hasSchema$1(it, keyword2) {
  const schema = it.schema[keyword2];
  return schema !== void 0 && !(0, util_1$t.alwaysValidSchema)(it, schema);
}
_if$1.default = def$F;
var thenElse$1 = {};
Object.defineProperty(thenElse$1, "__esModule", { value: true });
const util_1$s = util$1;
const def$E = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: keyword2, parentSchema, it }) {
    if (parentSchema.if === void 0)
      (0, util_1$s.checkStrictMode)(it, `"${keyword2}" without "if" is ignored`);
  }
};
thenElse$1.default = def$E;
Object.defineProperty(applicator$2, "__esModule", { value: true });
const additionalItems_1$2 = additionalItems$1;
const prefixItems_1$1 = prefixItems$1;
const items_1$2 = items$1;
const items2020_1$1 = items2020$1;
const contains_1$1 = contains$1;
const dependencies_1$3 = dependencies$1;
const propertyNames_1$1 = propertyNames$1;
const additionalProperties_1$2 = additionalProperties$2;
const properties_1$1 = properties$b;
const patternProperties_1$1 = patternProperties$1;
const not_1$1 = not$1;
const anyOf_1$1 = anyOf$1;
const oneOf_1$1 = oneOf$1;
const allOf_1$1 = allOf$2;
const if_1$1 = _if$1;
const thenElse_1$1 = thenElse$1;
function getApplicator$1(draft20202 = false) {
  const applicator2 = [
    // any
    not_1$1.default,
    anyOf_1$1.default,
    oneOf_1$1.default,
    allOf_1$1.default,
    if_1$1.default,
    thenElse_1$1.default,
    // object
    propertyNames_1$1.default,
    additionalProperties_1$2.default,
    dependencies_1$3.default,
    properties_1$1.default,
    patternProperties_1$1.default
  ];
  if (draft20202)
    applicator2.push(prefixItems_1$1.default, items2020_1$1.default);
  else
    applicator2.push(additionalItems_1$2.default, items_1$2.default);
  applicator2.push(contains_1$1.default);
  return applicator2;
}
applicator$2.default = getApplicator$1;
var dynamic$1 = {};
var dynamicAnchor$1 = {};
Object.defineProperty(dynamicAnchor$1, "__esModule", { value: true });
dynamicAnchor$1.dynamicAnchor = void 0;
const codegen_1$u = codegen$1;
const names_1$5 = names$2;
const compile_1$3 = compile$1;
const ref_1$2 = ref$1;
const def$D = {
  keyword: "$dynamicAnchor",
  schemaType: "string",
  code: (cxt) => dynamicAnchor(cxt, cxt.schema)
};
function dynamicAnchor(cxt, anchor) {
  const { gen, it } = cxt;
  it.schemaEnv.root.dynamicAnchors[anchor] = true;
  const v = (0, codegen_1$u._)`${names_1$5.default.dynamicAnchors}${(0, codegen_1$u.getProperty)(anchor)}`;
  const validate2 = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
  gen.if((0, codegen_1$u._)`!${v}`, () => gen.assign(v, validate2));
}
dynamicAnchor$1.dynamicAnchor = dynamicAnchor;
function _getValidate(cxt) {
  const { schemaEnv, schema, self } = cxt.it;
  const { root, baseId, localRefs, meta } = schemaEnv.root;
  const { schemaId } = self.opts;
  const sch = new compile_1$3.SchemaEnv({ schema, schemaId, root, baseId, localRefs, meta });
  compile_1$3.compileSchema.call(self, sch);
  return (0, ref_1$2.getValidate)(cxt, sch);
}
dynamicAnchor$1.default = def$D;
var dynamicRef$1 = {};
Object.defineProperty(dynamicRef$1, "__esModule", { value: true });
dynamicRef$1.dynamicRef = void 0;
const codegen_1$t = codegen$1;
const names_1$4 = names$2;
const ref_1$1 = ref$1;
const def$C = {
  keyword: "$dynamicRef",
  schemaType: "string",
  code: (cxt) => dynamicRef(cxt, cxt.schema)
};
function dynamicRef(cxt, ref2) {
  const { gen, keyword: keyword2, it } = cxt;
  if (ref2[0] !== "#")
    throw new Error(`"${keyword2}" only supports hash fragment reference`);
  const anchor = ref2.slice(1);
  if (it.allErrors) {
    _dynamicRef();
  } else {
    const valid2 = gen.let("valid", false);
    _dynamicRef(valid2);
    cxt.ok(valid2);
  }
  function _dynamicRef(valid2) {
    if (it.schemaEnv.root.dynamicAnchors[anchor]) {
      const v = gen.let("_v", (0, codegen_1$t._)`${names_1$4.default.dynamicAnchors}${(0, codegen_1$t.getProperty)(anchor)}`);
      gen.if(v, _callRef(v, valid2), _callRef(it.validateName, valid2));
    } else {
      _callRef(it.validateName, valid2)();
    }
  }
  function _callRef(validate2, valid2) {
    return valid2 ? () => gen.block(() => {
      (0, ref_1$1.callRef)(cxt, validate2);
      gen.let(valid2, true);
    }) : () => (0, ref_1$1.callRef)(cxt, validate2);
  }
}
dynamicRef$1.dynamicRef = dynamicRef;
dynamicRef$1.default = def$C;
var recursiveAnchor = {};
Object.defineProperty(recursiveAnchor, "__esModule", { value: true });
const dynamicAnchor_1$1 = dynamicAnchor$1;
const util_1$r = util$1;
const def$B = {
  keyword: "$recursiveAnchor",
  schemaType: "boolean",
  code(cxt) {
    if (cxt.schema)
      (0, dynamicAnchor_1$1.dynamicAnchor)(cxt, "");
    else
      (0, util_1$r.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
  }
};
recursiveAnchor.default = def$B;
var recursiveRef = {};
Object.defineProperty(recursiveRef, "__esModule", { value: true });
const dynamicRef_1$1 = dynamicRef$1;
const def$A = {
  keyword: "$recursiveRef",
  schemaType: "string",
  code: (cxt) => (0, dynamicRef_1$1.dynamicRef)(cxt, cxt.schema)
};
recursiveRef.default = def$A;
Object.defineProperty(dynamic$1, "__esModule", { value: true });
const dynamicAnchor_1 = dynamicAnchor$1;
const dynamicRef_1 = dynamicRef$1;
const recursiveAnchor_1 = recursiveAnchor;
const recursiveRef_1 = recursiveRef;
const dynamic = [dynamicAnchor_1.default, dynamicRef_1.default, recursiveAnchor_1.default, recursiveRef_1.default];
dynamic$1.default = dynamic;
var next$1 = {};
var dependentRequired = {};
Object.defineProperty(dependentRequired, "__esModule", { value: true });
const dependencies_1$2 = dependencies$1;
const def$z = {
  keyword: "dependentRequired",
  type: "object",
  schemaType: "object",
  error: dependencies_1$2.error,
  code: (cxt) => (0, dependencies_1$2.validatePropertyDeps)(cxt)
};
dependentRequired.default = def$z;
var dependentSchemas = {};
Object.defineProperty(dependentSchemas, "__esModule", { value: true });
const dependencies_1$1 = dependencies$1;
const def$y = {
  keyword: "dependentSchemas",
  type: "object",
  schemaType: "object",
  code: (cxt) => (0, dependencies_1$1.validateSchemaDeps)(cxt)
};
dependentSchemas.default = def$y;
var limitContains = {};
Object.defineProperty(limitContains, "__esModule", { value: true });
const util_1$q = util$1;
const def$x = {
  keyword: ["maxContains", "minContains"],
  type: "array",
  schemaType: "number",
  code({ keyword: keyword2, parentSchema, it }) {
    if (parentSchema.contains === void 0) {
      (0, util_1$q.checkStrictMode)(it, `"${keyword2}" without "contains" is ignored`);
    }
  }
};
limitContains.default = def$x;
Object.defineProperty(next$1, "__esModule", { value: true });
const dependentRequired_1 = dependentRequired;
const dependentSchemas_1 = dependentSchemas;
const limitContains_1 = limitContains;
const next = [dependentRequired_1.default, dependentSchemas_1.default, limitContains_1.default];
next$1.default = next;
var unevaluated$2 = {};
var unevaluatedProperties = {};
Object.defineProperty(unevaluatedProperties, "__esModule", { value: true });
const codegen_1$s = codegen$1;
const util_1$p = util$1;
const names_1$3 = names$2;
const error$m = {
  message: "must NOT have unevaluated properties",
  params: ({ params }) => (0, codegen_1$s._)`{unevaluatedProperty: ${params.unevaluatedProperty}}`
};
const def$w = {
  keyword: "unevaluatedProperties",
  type: "object",
  schemaType: ["boolean", "object"],
  trackErrors: true,
  error: error$m,
  code(cxt) {
    const { gen, schema, data, errsCount, it } = cxt;
    if (!errsCount)
      throw new Error("ajv implementation error");
    const { allErrors, props } = it;
    if (props instanceof codegen_1$s.Name) {
      gen.if((0, codegen_1$s._)`${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
    } else if (props !== true) {
      gen.forIn("key", data, (key) => props === void 0 ? unevaluatedPropCode(key) : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
    }
    it.props = true;
    cxt.ok((0, codegen_1$s._)`${errsCount} === ${names_1$3.default.errors}`);
    function unevaluatedPropCode(key) {
      if (schema === false) {
        cxt.setParams({ unevaluatedProperty: key });
        cxt.error();
        if (!allErrors)
          gen.break();
        return;
      }
      if (!(0, util_1$p.alwaysValidSchema)(it, schema)) {
        const valid2 = gen.name("valid");
        cxt.subschema({
          keyword: "unevaluatedProperties",
          dataProp: key,
          dataPropType: util_1$p.Type.Str
        }, valid2);
        if (!allErrors)
          gen.if((0, codegen_1$s.not)(valid2), () => gen.break());
      }
    }
    function unevaluatedDynamic(evaluatedProps, key) {
      return (0, codegen_1$s._)`!${evaluatedProps} || !${evaluatedProps}[${key}]`;
    }
    function unevaluatedStatic(evaluatedProps, key) {
      const ps = [];
      for (const p in evaluatedProps) {
        if (evaluatedProps[p] === true)
          ps.push((0, codegen_1$s._)`${key} !== ${p}`);
      }
      return (0, codegen_1$s.and)(...ps);
    }
  }
};
unevaluatedProperties.default = def$w;
var unevaluatedItems = {};
Object.defineProperty(unevaluatedItems, "__esModule", { value: true });
const codegen_1$r = codegen$1;
const util_1$o = util$1;
const error$l = {
  message: ({ params: { len } }) => (0, codegen_1$r.str)`must NOT have more than ${len} items`,
  params: ({ params: { len } }) => (0, codegen_1$r._)`{limit: ${len}}`
};
const def$v = {
  keyword: "unevaluatedItems",
  type: "array",
  schemaType: ["boolean", "object"],
  error: error$l,
  code(cxt) {
    const { gen, schema, data, it } = cxt;
    const items2 = it.items || 0;
    if (items2 === true)
      return;
    const len = gen.const("len", (0, codegen_1$r._)`${data}.length`);
    if (schema === false) {
      cxt.setParams({ len: items2 });
      cxt.fail((0, codegen_1$r._)`${len} > ${items2}`);
    } else if (typeof schema == "object" && !(0, util_1$o.alwaysValidSchema)(it, schema)) {
      const valid2 = gen.var("valid", (0, codegen_1$r._)`${len} <= ${items2}`);
      gen.if((0, codegen_1$r.not)(valid2), () => validateItems(valid2, items2));
      cxt.ok(valid2);
    }
    it.items = true;
    function validateItems(valid2, from) {
      gen.forRange("i", from, len, (i) => {
        cxt.subschema({ keyword: "unevaluatedItems", dataProp: i, dataPropType: util_1$o.Type.Num }, valid2);
        if (!it.allErrors)
          gen.if((0, codegen_1$r.not)(valid2), () => gen.break());
      });
    }
  }
};
unevaluatedItems.default = def$v;
Object.defineProperty(unevaluated$2, "__esModule", { value: true });
const unevaluatedProperties_1 = unevaluatedProperties;
const unevaluatedItems_1 = unevaluatedItems;
const unevaluated$1 = [unevaluatedProperties_1.default, unevaluatedItems_1.default];
unevaluated$2.default = unevaluated$1;
var format$6 = {};
var format$5 = {};
Object.defineProperty(format$5, "__esModule", { value: true });
const codegen_1$q = codegen$1;
const error$k = {
  message: ({ schemaCode }) => (0, codegen_1$q.str)`must match format "${schemaCode}"`,
  params: ({ schemaCode }) => (0, codegen_1$q._)`{format: ${schemaCode}}`
};
const def$u = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: true,
  error: error$k,
  code(cxt, ruleType) {
    const { gen, data, $data, schema, schemaCode, it } = cxt;
    const { opts, errSchemaPath, schemaEnv, self } = it;
    if (!opts.validateFormats)
      return;
    if ($data)
      validate$DataFormat();
    else
      validateFormat();
    function validate$DataFormat() {
      const fmts = gen.scopeValue("formats", {
        ref: self.formats,
        code: opts.code.formats
      });
      const fDef = gen.const("fDef", (0, codegen_1$q._)`${fmts}[${schemaCode}]`);
      const fType = gen.let("fType");
      const format2 = gen.let("format");
      gen.if((0, codegen_1$q._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1$q._)`${fDef}.type || "string"`).assign(format2, (0, codegen_1$q._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1$q._)`"string"`).assign(format2, fDef));
      cxt.fail$data((0, codegen_1$q.or)(unknownFmt(), invalidFmt()));
      function unknownFmt() {
        if (opts.strictSchema === false)
          return codegen_1$q.nil;
        return (0, codegen_1$q._)`${schemaCode} && !${format2}`;
      }
      function invalidFmt() {
        const callFormat = schemaEnv.$async ? (0, codegen_1$q._)`(${fDef}.async ? await ${format2}(${data}) : ${format2}(${data}))` : (0, codegen_1$q._)`${format2}(${data})`;
        const validData = (0, codegen_1$q._)`(typeof ${format2} == "function" ? ${callFormat} : ${format2}.test(${data}))`;
        return (0, codegen_1$q._)`${format2} && ${format2} !== true && ${fType} === ${ruleType} && !${validData}`;
      }
    }
    function validateFormat() {
      const formatDef = self.formats[schema];
      if (!formatDef) {
        unknownFormat();
        return;
      }
      if (formatDef === true)
        return;
      const [fmtType, format2, fmtRef] = getFormat(formatDef);
      if (fmtType === ruleType)
        cxt.pass(validCondition());
      function unknownFormat() {
        if (opts.strictSchema === false) {
          self.logger.warn(unknownMsg());
          return;
        }
        throw new Error(unknownMsg());
        function unknownMsg() {
          return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
        }
      }
      function getFormat(fmtDef) {
        const code2 = fmtDef instanceof RegExp ? (0, codegen_1$q.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1$q._)`${opts.code.formats}${(0, codegen_1$q.getProperty)(schema)}` : void 0;
        const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code: code2 });
        if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
          return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1$q._)`${fmt}.validate`];
        }
        return ["string", fmtDef, fmt];
      }
      function validCondition() {
        if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
          if (!schemaEnv.$async)
            throw new Error("async format in sync schema");
          return (0, codegen_1$q._)`await ${fmtRef}(${data})`;
        }
        return typeof format2 == "function" ? (0, codegen_1$q._)`${fmtRef}(${data})` : (0, codegen_1$q._)`${fmtRef}.test(${data})`;
      }
    }
  }
};
format$5.default = def$u;
Object.defineProperty(format$6, "__esModule", { value: true });
const format_1$3 = format$5;
const format$4 = [format_1$3.default];
format$6.default = format$4;
var metadata$2 = {};
Object.defineProperty(metadata$2, "__esModule", { value: true });
metadata$2.contentVocabulary = metadata$2.metadataVocabulary = void 0;
metadata$2.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
metadata$2.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(draft2020, "__esModule", { value: true });
const core_1$1 = core$5;
const validation_1$1 = validation$4;
const applicator_1$1 = applicator$2;
const dynamic_1 = dynamic$1;
const next_1 = next$1;
const unevaluated_1 = unevaluated$2;
const format_1$2 = format$6;
const metadata_1$1 = metadata$2;
const draft2020Vocabularies = [
  dynamic_1.default,
  core_1$1.default,
  validation_1$1.default,
  (0, applicator_1$1.default)(true),
  format_1$2.default,
  metadata_1$1.metadataVocabulary,
  metadata_1$1.contentVocabulary,
  next_1.default,
  unevaluated_1.default
];
draft2020.default = draft2020Vocabularies;
var discriminator$1 = {};
var types$1 = {};
Object.defineProperty(types$1, "__esModule", { value: true });
types$1.DiscrError = void 0;
var DiscrError$1;
(function(DiscrError2) {
  DiscrError2["Tag"] = "tag";
  DiscrError2["Mapping"] = "mapping";
})(DiscrError$1 || (types$1.DiscrError = DiscrError$1 = {}));
Object.defineProperty(discriminator$1, "__esModule", { value: true });
const codegen_1$p = codegen$1;
const types_1$1 = types$1;
const compile_1$2 = compile$1;
const ref_error_1$2 = ref_error$1;
const util_1$n = util$1;
const error$j = {
  message: ({ params: { discrError, tagName } }) => discrError === types_1$1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
  params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1$p._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
};
const def$t = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: error$j,
  code(cxt) {
    const { gen, data, schema, parentSchema, it } = cxt;
    const { oneOf: oneOf2 } = parentSchema;
    if (!it.opts.discriminator) {
      throw new Error("discriminator: requires discriminator option");
    }
    const tagName = schema.propertyName;
    if (typeof tagName != "string")
      throw new Error("discriminator: requires propertyName");
    if (schema.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!oneOf2)
      throw new Error("discriminator: requires oneOf keyword");
    const valid2 = gen.let("valid", false);
    const tag = gen.const("tag", (0, codegen_1$p._)`${data}${(0, codegen_1$p.getProperty)(tagName)}`);
    gen.if((0, codegen_1$p._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1$1.DiscrError.Tag, tag, tagName }));
    cxt.ok(valid2);
    function validateMapping() {
      const mapping = getMapping();
      gen.if(false);
      for (const tagValue in mapping) {
        gen.elseIf((0, codegen_1$p._)`${tag} === ${tagValue}`);
        gen.assign(valid2, applyTagSchema(mapping[tagValue]));
      }
      gen.else();
      cxt.error(false, { discrError: types_1$1.DiscrError.Mapping, tag, tagName });
      gen.endIf();
    }
    function applyTagSchema(schemaProp) {
      const _valid = gen.name("valid");
      const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
      cxt.mergeEvaluated(schCxt, codegen_1$p.Name);
      return _valid;
    }
    function getMapping() {
      var _a;
      const oneOfMapping = {};
      const topRequired = hasRequired(parentSchema);
      let tagRequired = true;
      for (let i = 0; i < oneOf2.length; i++) {
        let sch = oneOf2[i];
        if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1$n.schemaHasRulesButRef)(sch, it.self.RULES)) {
          const ref2 = sch.$ref;
          sch = compile_1$2.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref2);
          if (sch instanceof compile_1$2.SchemaEnv)
            sch = sch.schema;
          if (sch === void 0)
            throw new ref_error_1$2.default(it.opts.uriResolver, it.baseId, ref2);
        }
        const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
        if (typeof propSch != "object") {
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
        }
        tagRequired = tagRequired && (topRequired || hasRequired(sch));
        addMappings(propSch, i);
      }
      if (!tagRequired)
        throw new Error(`discriminator: "${tagName}" must be required`);
      return oneOfMapping;
      function hasRequired({ required: required2 }) {
        return Array.isArray(required2) && required2.includes(tagName);
      }
      function addMappings(sch, i) {
        if (sch.const) {
          addMapping(sch.const, i);
        } else if (sch.enum) {
          for (const tagValue of sch.enum) {
            addMapping(tagValue, i);
          }
        } else {
          throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
        }
      }
      function addMapping(tagValue, i) {
        if (typeof tagValue != "string" || tagValue in oneOfMapping) {
          throw new Error(`discriminator: "${tagName}" values must be unique strings`);
        }
        oneOfMapping[tagValue] = i;
      }
    }
  }
};
discriminator$1.default = def$t;
var jsonSchema202012 = {};
const $schema$8 = "https://json-schema.org/draft/2020-12/schema";
const $id$9 = "https://json-schema.org/draft/2020-12/schema";
const $vocabulary$7 = {
  "https://json-schema.org/draft/2020-12/vocab/core": true,
  "https://json-schema.org/draft/2020-12/vocab/applicator": true,
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
  "https://json-schema.org/draft/2020-12/vocab/validation": true,
  "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
  "https://json-schema.org/draft/2020-12/vocab/content": true
};
const $dynamicAnchor$7 = "meta";
const title$8 = "Core and Validation specifications meta-schema";
const allOf$1 = [
  {
    $ref: "meta/core"
  },
  {
    $ref: "meta/applicator"
  },
  {
    $ref: "meta/unevaluated"
  },
  {
    $ref: "meta/validation"
  },
  {
    $ref: "meta/meta-data"
  },
  {
    $ref: "meta/format-annotation"
  },
  {
    $ref: "meta/content"
  }
];
const type$9 = [
  "object",
  "boolean"
];
const $comment = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.";
const properties$a = {
  definitions: {
    $comment: '"definitions" has been replaced by "$defs".',
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    deprecated: true,
    "default": {}
  },
  dependencies: {
    $comment: '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $dynamicRef: "#meta"
        },
        {
          $ref: "meta/validation#/$defs/stringArray"
        }
      ]
    },
    deprecated: true,
    "default": {}
  },
  $recursiveAnchor: {
    $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
    $ref: "meta/core#/$defs/anchorString",
    deprecated: true
  },
  $recursiveRef: {
    $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
    $ref: "meta/core#/$defs/uriReferenceString",
    deprecated: true
  }
};
const require$$0 = {
  $schema: $schema$8,
  $id: $id$9,
  $vocabulary: $vocabulary$7,
  $dynamicAnchor: $dynamicAnchor$7,
  title: title$8,
  allOf: allOf$1,
  type: type$9,
  $comment,
  properties: properties$a
};
const $schema$7 = "https://json-schema.org/draft/2020-12/schema";
const $id$8 = "https://json-schema.org/draft/2020-12/meta/applicator";
const $vocabulary$6 = {
  "https://json-schema.org/draft/2020-12/vocab/applicator": true
};
const $dynamicAnchor$6 = "meta";
const title$7 = "Applicator vocabulary meta-schema";
const type$8 = [
  "object",
  "boolean"
];
const properties$9 = {
  prefixItems: {
    $ref: "#/$defs/schemaArray"
  },
  items: {
    $dynamicRef: "#meta"
  },
  contains: {
    $dynamicRef: "#meta"
  },
  additionalProperties: {
    $dynamicRef: "#meta"
  },
  properties: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    "default": {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    propertyNames: {
      format: "regex"
    },
    "default": {}
  },
  dependentSchemas: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    "default": {}
  },
  propertyNames: {
    $dynamicRef: "#meta"
  },
  "if": {
    $dynamicRef: "#meta"
  },
  then: {
    $dynamicRef: "#meta"
  },
  "else": {
    $dynamicRef: "#meta"
  },
  allOf: {
    $ref: "#/$defs/schemaArray"
  },
  anyOf: {
    $ref: "#/$defs/schemaArray"
  },
  oneOf: {
    $ref: "#/$defs/schemaArray"
  },
  not: {
    $dynamicRef: "#meta"
  }
};
const $defs$2 = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $dynamicRef: "#meta"
    }
  }
};
const require$$1 = {
  $schema: $schema$7,
  $id: $id$8,
  $vocabulary: $vocabulary$6,
  $dynamicAnchor: $dynamicAnchor$6,
  title: title$7,
  type: type$8,
  properties: properties$9,
  $defs: $defs$2
};
const $schema$6 = "https://json-schema.org/draft/2020-12/schema";
const $id$7 = "https://json-schema.org/draft/2020-12/meta/unevaluated";
const $vocabulary$5 = {
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": true
};
const $dynamicAnchor$5 = "meta";
const title$6 = "Unevaluated applicator vocabulary meta-schema";
const type$7 = [
  "object",
  "boolean"
];
const properties$8 = {
  unevaluatedItems: {
    $dynamicRef: "#meta"
  },
  unevaluatedProperties: {
    $dynamicRef: "#meta"
  }
};
const require$$2 = {
  $schema: $schema$6,
  $id: $id$7,
  $vocabulary: $vocabulary$5,
  $dynamicAnchor: $dynamicAnchor$5,
  title: title$6,
  type: type$7,
  properties: properties$8
};
const $schema$5 = "https://json-schema.org/draft/2020-12/schema";
const $id$6 = "https://json-schema.org/draft/2020-12/meta/content";
const $vocabulary$4 = {
  "https://json-schema.org/draft/2020-12/vocab/content": true
};
const $dynamicAnchor$4 = "meta";
const title$5 = "Content vocabulary meta-schema";
const type$6 = [
  "object",
  "boolean"
];
const properties$7 = {
  contentEncoding: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentSchema: {
    $dynamicRef: "#meta"
  }
};
const require$$3$1 = {
  $schema: $schema$5,
  $id: $id$6,
  $vocabulary: $vocabulary$4,
  $dynamicAnchor: $dynamicAnchor$4,
  title: title$5,
  type: type$6,
  properties: properties$7
};
const $schema$4 = "https://json-schema.org/draft/2020-12/schema";
const $id$5 = "https://json-schema.org/draft/2020-12/meta/core";
const $vocabulary$3 = {
  "https://json-schema.org/draft/2020-12/vocab/core": true
};
const $dynamicAnchor$3 = "meta";
const title$4 = "Core vocabulary meta-schema";
const type$5 = [
  "object",
  "boolean"
];
const properties$6 = {
  $id: {
    $ref: "#/$defs/uriReferenceString",
    $comment: "Non-empty fragments not allowed.",
    pattern: "^[^#]*#?$"
  },
  $schema: {
    $ref: "#/$defs/uriString"
  },
  $ref: {
    $ref: "#/$defs/uriReferenceString"
  },
  $anchor: {
    $ref: "#/$defs/anchorString"
  },
  $dynamicRef: {
    $ref: "#/$defs/uriReferenceString"
  },
  $dynamicAnchor: {
    $ref: "#/$defs/anchorString"
  },
  $vocabulary: {
    type: "object",
    propertyNames: {
      $ref: "#/$defs/uriString"
    },
    additionalProperties: {
      type: "boolean"
    }
  },
  $comment: {
    type: "string"
  },
  $defs: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    }
  }
};
const $defs$1 = {
  anchorString: {
    type: "string",
    pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
  },
  uriString: {
    type: "string",
    format: "uri"
  },
  uriReferenceString: {
    type: "string",
    format: "uri-reference"
  }
};
const require$$4 = {
  $schema: $schema$4,
  $id: $id$5,
  $vocabulary: $vocabulary$3,
  $dynamicAnchor: $dynamicAnchor$3,
  title: title$4,
  type: type$5,
  properties: properties$6,
  $defs: $defs$1
};
const $schema$3 = "https://json-schema.org/draft/2020-12/schema";
const $id$4 = "https://json-schema.org/draft/2020-12/meta/format-annotation";
const $vocabulary$2 = {
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": true
};
const $dynamicAnchor$2 = "meta";
const title$3 = "Format vocabulary meta-schema for annotation results";
const type$4 = [
  "object",
  "boolean"
];
const properties$5 = {
  format: {
    type: "string"
  }
};
const require$$5 = {
  $schema: $schema$3,
  $id: $id$4,
  $vocabulary: $vocabulary$2,
  $dynamicAnchor: $dynamicAnchor$2,
  title: title$3,
  type: type$4,
  properties: properties$5
};
const $schema$2 = "https://json-schema.org/draft/2020-12/schema";
const $id$3 = "https://json-schema.org/draft/2020-12/meta/meta-data";
const $vocabulary$1 = {
  "https://json-schema.org/draft/2020-12/vocab/meta-data": true
};
const $dynamicAnchor$1 = "meta";
const title$2 = "Meta-data vocabulary meta-schema";
const type$3 = [
  "object",
  "boolean"
];
const properties$4 = {
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  "default": true,
  deprecated: {
    type: "boolean",
    "default": false
  },
  readOnly: {
    type: "boolean",
    "default": false
  },
  writeOnly: {
    type: "boolean",
    "default": false
  },
  examples: {
    type: "array",
    items: true
  }
};
const require$$6 = {
  $schema: $schema$2,
  $id: $id$3,
  $vocabulary: $vocabulary$1,
  $dynamicAnchor: $dynamicAnchor$1,
  title: title$2,
  type: type$3,
  properties: properties$4
};
const $schema$1 = "https://json-schema.org/draft/2020-12/schema";
const $id$2 = "https://json-schema.org/draft/2020-12/meta/validation";
const $vocabulary = {
  "https://json-schema.org/draft/2020-12/vocab/validation": true
};
const $dynamicAnchor = "meta";
const title$1 = "Validation vocabulary meta-schema";
const type$2 = [
  "object",
  "boolean"
];
const properties$3 = {
  type: {
    anyOf: [
      {
        $ref: "#/$defs/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/$defs/simpleTypes"
        },
        minItems: 1,
        uniqueItems: true
      }
    ]
  },
  "const": true,
  "enum": {
    type: "array",
    items: true
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/$defs/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  maxItems: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/$defs/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    "default": false
  },
  maxContains: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minContains: {
    $ref: "#/$defs/nonNegativeInteger",
    "default": 1
  },
  maxProperties: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/$defs/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/$defs/stringArray"
  },
  dependentRequired: {
    type: "object",
    additionalProperties: {
      $ref: "#/$defs/stringArray"
    }
  }
};
const $defs = {
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    $ref: "#/$defs/nonNegativeInteger",
    "default": 0
  },
  simpleTypes: {
    "enum": [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: true,
    "default": []
  }
};
const require$$7 = {
  $schema: $schema$1,
  $id: $id$2,
  $vocabulary,
  $dynamicAnchor,
  title: title$1,
  type: type$2,
  properties: properties$3,
  $defs
};
Object.defineProperty(jsonSchema202012, "__esModule", { value: true });
const metaSchema = require$$0;
const applicator$1 = require$$1;
const unevaluated = require$$2;
const content = require$$3$1;
const core$3 = require$$4;
const format$3 = require$$5;
const metadata$1 = require$$6;
const validation$2 = require$$7;
const META_SUPPORT_DATA = ["/properties"];
function addMetaSchema2020($data) {
  [
    metaSchema,
    applicator$1,
    unevaluated,
    content,
    core$3,
    with$data(this, format$3),
    metadata$1,
    with$data(this, validation$2)
  ].forEach((sch) => this.addMetaSchema(sch, void 0, false));
  return this;
  function with$data(ajv2, sch) {
    return $data ? ajv2.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
  }
}
jsonSchema202012.default = addMetaSchema2020;
(function(module2, exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.MissingRefError = exports$1.ValidationError = exports$1.CodeGen = exports$1.Name = exports$1.nil = exports$1.stringify = exports$1.str = exports$1._ = exports$1.KeywordCxt = exports$1.Ajv2020 = void 0;
  const core_12 = core$6;
  const draft2020_1 = draft2020;
  const discriminator_1 = discriminator$1;
  const json_schema_2020_12_1 = jsonSchema202012;
  const META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
  class Ajv2020 extends core_12.default {
    constructor(opts = {}) {
      super({
        ...opts,
        dynamicRef: true,
        next: true,
        unevaluated: true
      });
    }
    _addVocabularies() {
      super._addVocabularies();
      draft2020_1.default.forEach((v) => this.addVocabulary(v));
      if (this.opts.discriminator)
        this.addKeyword(discriminator_1.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      const { $data, meta } = this.opts;
      if (!meta)
        return;
      json_schema_2020_12_1.default.call(this, $data);
      this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
    }
  }
  exports$1.Ajv2020 = Ajv2020;
  module2.exports = exports$1 = Ajv2020;
  module2.exports.Ajv2020 = Ajv2020;
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.default = Ajv2020;
  var validate_12 = validate$1;
  Object.defineProperty(exports$1, "KeywordCxt", { enumerable: true, get: function() {
    return validate_12.KeywordCxt;
  } });
  var codegen_12 = codegen$1;
  Object.defineProperty(exports$1, "_", { enumerable: true, get: function() {
    return codegen_12._;
  } });
  Object.defineProperty(exports$1, "str", { enumerable: true, get: function() {
    return codegen_12.str;
  } });
  Object.defineProperty(exports$1, "stringify", { enumerable: true, get: function() {
    return codegen_12.stringify;
  } });
  Object.defineProperty(exports$1, "nil", { enumerable: true, get: function() {
    return codegen_12.nil;
  } });
  Object.defineProperty(exports$1, "Name", { enumerable: true, get: function() {
    return codegen_12.Name;
  } });
  Object.defineProperty(exports$1, "CodeGen", { enumerable: true, get: function() {
    return codegen_12.CodeGen;
  } });
  var validation_error_12 = validation_error$1;
  Object.defineProperty(exports$1, "ValidationError", { enumerable: true, get: function() {
    return validation_error_12.default;
  } });
  var ref_error_12 = ref_error$1;
  Object.defineProperty(exports$1, "MissingRefError", { enumerable: true, get: function() {
    return ref_error_12.default;
  } });
})(_2020, _2020.exports);
var _2020Exports = _2020.exports;
var dist = { exports: {} };
var formats = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.formatNames = exports$1.fastFormats = exports$1.fullFormats = void 0;
  function fmtDef(validate2, compare2) {
    return { validate: validate2, compare: compare2 };
  }
  exports$1.fullFormats = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: fmtDef(date, compareDate),
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: fmtDef(getTime(true), compareTime),
    "date-time": fmtDef(getDateTime(true), compareDateTime),
    "iso-time": fmtDef(getTime(), compareIsoTime),
    "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
    // duration: https://tools.ietf.org/html/rfc3339#appendix-A
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri: uri2,
    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    // uri-template: https://tools.ietf.org/html/rfc6570
    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    // For the source: https://gist.github.com/dperini/729294
    // For test cases: https://mathiasbynens.be/demo/url-regex
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex,
    // uuid: http://tools.ietf.org/html/rfc4122
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
    // byte: https://github.com/miguelmota/is-base64
    byte,
    // signed 32 bit integer
    int32: { type: "number", validate: validateInt32 },
    // signed 64 bit integer
    int64: { type: "number", validate: validateInt64 },
    // C-type float
    float: { type: "number", validate: validateNumber },
    // C-type double
    double: { type: "number", validate: validateNumber },
    // hint to the UI to hide input strings
    password: true,
    // unchecked string payload
    binary: true
  };
  exports$1.fastFormats = {
    ...exports$1.fullFormats,
    date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
    time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
    "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
    "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
    "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
  };
  exports$1.formatNames = Object.keys(exports$1.fullFormats);
  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
  const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function date(str) {
    const matches = DATE.exec(str);
    if (!matches)
      return false;
    const year = +matches[1];
    const month = +matches[2];
    const day = +matches[3];
    return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
  }
  function compareDate(d1, d2) {
    if (!(d1 && d2))
      return void 0;
    if (d1 > d2)
      return 1;
    if (d1 < d2)
      return -1;
    return 0;
  }
  const TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function getTime(strictTimeZone) {
    return function time(str) {
      const matches = TIME.exec(str);
      if (!matches)
        return false;
      const hr = +matches[1];
      const min = +matches[2];
      const sec = +matches[3];
      const tz = matches[4];
      const tzSign = matches[5] === "-" ? -1 : 1;
      const tzH = +(matches[6] || 0);
      const tzM = +(matches[7] || 0);
      if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
        return false;
      if (hr <= 23 && min <= 59 && sec < 60)
        return true;
      const utcMin = min - tzM * tzSign;
      const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
      return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
    };
  }
  function compareTime(s1, s2) {
    if (!(s1 && s2))
      return void 0;
    const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
    const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
    if (!(t1 && t2))
      return void 0;
    return t1 - t2;
  }
  function compareIsoTime(t1, t2) {
    if (!(t1 && t2))
      return void 0;
    const a1 = TIME.exec(t1);
    const a2 = TIME.exec(t2);
    if (!(a1 && a2))
      return void 0;
    t1 = a1[1] + a1[2] + a1[3];
    t2 = a2[1] + a2[2] + a2[3];
    if (t1 > t2)
      return 1;
    if (t1 < t2)
      return -1;
    return 0;
  }
  const DATE_TIME_SEPARATOR = /t|\s/i;
  function getDateTime(strictTimeZone) {
    const time = getTime(strictTimeZone);
    return function date_time(str) {
      const dateTime = str.split(DATE_TIME_SEPARATOR);
      return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
    };
  }
  function compareDateTime(dt1, dt2) {
    if (!(dt1 && dt2))
      return void 0;
    const d1 = new Date(dt1).valueOf();
    const d2 = new Date(dt2).valueOf();
    if (!(d1 && d2))
      return void 0;
    return d1 - d2;
  }
  function compareIsoDateTime(dt1, dt2) {
    if (!(dt1 && dt2))
      return void 0;
    const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
    const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
    const res = compareDate(d1, d2);
    if (res === void 0)
      return void 0;
    return res || compareTime(t1, t2);
  }
  const NOT_URI_FRAGMENT = /\/|:/;
  const URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function uri2(str) {
    return NOT_URI_FRAGMENT.test(str) && URI.test(str);
  }
  const BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function byte(str) {
    BYTE.lastIndex = 0;
    return BYTE.test(str);
  }
  const MIN_INT32 = -2147483648;
  const MAX_INT32 = 2 ** 31 - 1;
  function validateInt32(value) {
    return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
  }
  function validateInt64(value) {
    return Number.isInteger(value);
  }
  function validateNumber() {
    return true;
  }
  const Z_ANCHOR = /[^\\]\\Z/;
  function regex(str) {
    if (Z_ANCHOR.test(str))
      return false;
    try {
      new RegExp(str);
      return true;
    } catch (e) {
      return false;
    }
  }
})(formats);
var limit = {};
var ajv = { exports: {} };
var core$2 = {};
var validate = {};
var boolSchema = {};
var errors = {};
var codegen = {};
var code$1 = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.regexpCode = exports$1.getEsmExportName = exports$1.getProperty = exports$1.safeStringify = exports$1.stringify = exports$1.strConcat = exports$1.addCodeArg = exports$1.str = exports$1._ = exports$1.nil = exports$1._Code = exports$1.Name = exports$1.IDENTIFIER = exports$1._CodeOrName = void 0;
  class _CodeOrName {
  }
  exports$1._CodeOrName = _CodeOrName;
  exports$1.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class Name extends _CodeOrName {
    constructor(s) {
      super();
      if (!exports$1.IDENTIFIER.test(s))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = s;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return false;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  exports$1.Name = Name;
  class _Code extends _CodeOrName {
    constructor(code2) {
      super();
      this._items = typeof code2 === "string" ? [code2] : code2;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return false;
      const item = this._items[0];
      return item === "" || item === '""';
    }
    get str() {
      var _a;
      return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
    }
    get names() {
      var _a;
      return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names2, c) => {
        if (c instanceof Name)
          names2[c.str] = (names2[c.str] || 0) + 1;
        return names2;
      }, {});
    }
  }
  exports$1._Code = _Code;
  exports$1.nil = new _Code("");
  function _(strs, ...args) {
    const code2 = [strs[0]];
    let i = 0;
    while (i < args.length) {
      addCodeArg(code2, args[i]);
      code2.push(strs[++i]);
    }
    return new _Code(code2);
  }
  exports$1._ = _;
  const plus = new _Code("+");
  function str(strs, ...args) {
    const expr = [safeStringify(strs[0])];
    let i = 0;
    while (i < args.length) {
      expr.push(plus);
      addCodeArg(expr, args[i]);
      expr.push(plus, safeStringify(strs[++i]));
    }
    optimize(expr);
    return new _Code(expr);
  }
  exports$1.str = str;
  function addCodeArg(code2, arg) {
    if (arg instanceof _Code)
      code2.push(...arg._items);
    else if (arg instanceof Name)
      code2.push(arg);
    else
      code2.push(interpolate(arg));
  }
  exports$1.addCodeArg = addCodeArg;
  function optimize(expr) {
    let i = 1;
    while (i < expr.length - 1) {
      if (expr[i] === plus) {
        const res = mergeExprItems(expr[i - 1], expr[i + 1]);
        if (res !== void 0) {
          expr.splice(i - 1, 3, res);
          continue;
        }
        expr[i++] = "+";
      }
      i++;
    }
  }
  function mergeExprItems(a, b) {
    if (b === '""')
      return a;
    if (a === '""')
      return b;
    if (typeof a == "string") {
      if (b instanceof Name || a[a.length - 1] !== '"')
        return;
      if (typeof b != "string")
        return `${a.slice(0, -1)}${b}"`;
      if (b[0] === '"')
        return a.slice(0, -1) + b.slice(1);
      return;
    }
    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
      return `"${a}${b.slice(1)}`;
    return;
  }
  function strConcat(c1, c2) {
    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
  }
  exports$1.strConcat = strConcat;
  function interpolate(x) {
    return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
  }
  function stringify(x) {
    return new _Code(safeStringify(x));
  }
  exports$1.stringify = stringify;
  function safeStringify(x) {
    return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  exports$1.safeStringify = safeStringify;
  function getProperty2(key) {
    return typeof key == "string" && exports$1.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
  }
  exports$1.getProperty = getProperty2;
  function getEsmExportName(key) {
    if (typeof key == "string" && exports$1.IDENTIFIER.test(key)) {
      return new _Code(`${key}`);
    }
    throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
  }
  exports$1.getEsmExportName = getEsmExportName;
  function regexpCode(rx) {
    return new _Code(rx.toString());
  }
  exports$1.regexpCode = regexpCode;
})(code$1);
var scope = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.ValueScope = exports$1.ValueScopeName = exports$1.Scope = exports$1.varKinds = exports$1.UsedValueState = void 0;
  const code_12 = code$1;
  class ValueError extends Error {
    constructor(name) {
      super(`CodeGen: "code" for ${name} not defined`);
      this.value = name.value;
    }
  }
  var UsedValueState;
  (function(UsedValueState2) {
    UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
    UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
  })(UsedValueState || (exports$1.UsedValueState = UsedValueState = {}));
  exports$1.varKinds = {
    const: new code_12.Name("const"),
    let: new code_12.Name("let"),
    var: new code_12.Name("var")
  };
  class Scope {
    constructor({ prefixes, parent } = {}) {
      this._names = {};
      this._prefixes = prefixes;
      this._parent = parent;
    }
    toName(nameOrPrefix) {
      return nameOrPrefix instanceof code_12.Name ? nameOrPrefix : this.name(nameOrPrefix);
    }
    name(prefix) {
      return new code_12.Name(this._newName(prefix));
    }
    _newName(prefix) {
      const ng = this._names[prefix] || this._nameGroup(prefix);
      return `${prefix}${ng.index++}`;
    }
    _nameGroup(prefix) {
      var _a, _b;
      if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
        throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
      }
      return this._names[prefix] = { prefix, index: 0 };
    }
  }
  exports$1.Scope = Scope;
  class ValueScopeName extends code_12.Name {
    constructor(prefix, nameStr) {
      super(nameStr);
      this.prefix = prefix;
    }
    setValue(value, { property, itemIndex }) {
      this.value = value;
      this.scopePath = (0, code_12._)`.${new code_12.Name(property)}[${itemIndex}]`;
    }
  }
  exports$1.ValueScopeName = ValueScopeName;
  const line = (0, code_12._)`\n`;
  class ValueScope extends Scope {
    constructor(opts) {
      super(opts);
      this._values = {};
      this._scope = opts.scope;
      this.opts = { ...opts, _n: opts.lines ? line : code_12.nil };
    }
    get() {
      return this._scope;
    }
    name(prefix) {
      return new ValueScopeName(prefix, this._newName(prefix));
    }
    value(nameOrPrefix, value) {
      var _a;
      if (value.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const name = this.toName(nameOrPrefix);
      const { prefix } = name;
      const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
      let vs = this._values[prefix];
      if (vs) {
        const _name = vs.get(valueKey);
        if (_name)
          return _name;
      } else {
        vs = this._values[prefix] = /* @__PURE__ */ new Map();
      }
      vs.set(valueKey, name);
      const s = this._scope[prefix] || (this._scope[prefix] = []);
      const itemIndex = s.length;
      s[itemIndex] = value.ref;
      name.setValue(value, { property: prefix, itemIndex });
      return name;
    }
    getValue(prefix, keyOrRef) {
      const vs = this._values[prefix];
      if (!vs)
        return;
      return vs.get(keyOrRef);
    }
    scopeRefs(scopeName, values = this._values) {
      return this._reduceValues(values, (name) => {
        if (name.scopePath === void 0)
          throw new Error(`CodeGen: name "${name}" has no value`);
        return (0, code_12._)`${scopeName}${name.scopePath}`;
      });
    }
    scopeCode(values = this._values, usedValues, getCode) {
      return this._reduceValues(values, (name) => {
        if (name.value === void 0)
          throw new Error(`CodeGen: name "${name}" has no value`);
        return name.value.code;
      }, usedValues, getCode);
    }
    _reduceValues(values, valueCode, usedValues = {}, getCode) {
      let code2 = code_12.nil;
      for (const prefix in values) {
        const vs = values[prefix];
        if (!vs)
          continue;
        const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
        vs.forEach((name) => {
          if (nameSet.has(name))
            return;
          nameSet.set(name, UsedValueState.Started);
          let c = valueCode(name);
          if (c) {
            const def2 = this.opts.es5 ? exports$1.varKinds.var : exports$1.varKinds.const;
            code2 = (0, code_12._)`${code2}${def2} ${name} = ${c};${this.opts._n}`;
          } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
            code2 = (0, code_12._)`${code2}${c}${this.opts._n}`;
          } else {
            throw new ValueError(name);
          }
          nameSet.set(name, UsedValueState.Completed);
        });
      }
      return code2;
    }
  }
  exports$1.ValueScope = ValueScope;
})(scope);
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.or = exports$1.and = exports$1.not = exports$1.CodeGen = exports$1.operators = exports$1.varKinds = exports$1.ValueScopeName = exports$1.ValueScope = exports$1.Scope = exports$1.Name = exports$1.regexpCode = exports$1.stringify = exports$1.getProperty = exports$1.nil = exports$1.strConcat = exports$1.str = exports$1._ = void 0;
  const code_12 = code$1;
  const scope_1 = scope;
  var code_2 = code$1;
  Object.defineProperty(exports$1, "_", { enumerable: true, get: function() {
    return code_2._;
  } });
  Object.defineProperty(exports$1, "str", { enumerable: true, get: function() {
    return code_2.str;
  } });
  Object.defineProperty(exports$1, "strConcat", { enumerable: true, get: function() {
    return code_2.strConcat;
  } });
  Object.defineProperty(exports$1, "nil", { enumerable: true, get: function() {
    return code_2.nil;
  } });
  Object.defineProperty(exports$1, "getProperty", { enumerable: true, get: function() {
    return code_2.getProperty;
  } });
  Object.defineProperty(exports$1, "stringify", { enumerable: true, get: function() {
    return code_2.stringify;
  } });
  Object.defineProperty(exports$1, "regexpCode", { enumerable: true, get: function() {
    return code_2.regexpCode;
  } });
  Object.defineProperty(exports$1, "Name", { enumerable: true, get: function() {
    return code_2.Name;
  } });
  var scope_2 = scope;
  Object.defineProperty(exports$1, "Scope", { enumerable: true, get: function() {
    return scope_2.Scope;
  } });
  Object.defineProperty(exports$1, "ValueScope", { enumerable: true, get: function() {
    return scope_2.ValueScope;
  } });
  Object.defineProperty(exports$1, "ValueScopeName", { enumerable: true, get: function() {
    return scope_2.ValueScopeName;
  } });
  Object.defineProperty(exports$1, "varKinds", { enumerable: true, get: function() {
    return scope_2.varKinds;
  } });
  exports$1.operators = {
    GT: new code_12._Code(">"),
    GTE: new code_12._Code(">="),
    LT: new code_12._Code("<"),
    LTE: new code_12._Code("<="),
    EQ: new code_12._Code("==="),
    NEQ: new code_12._Code("!=="),
    NOT: new code_12._Code("!"),
    OR: new code_12._Code("||"),
    AND: new code_12._Code("&&"),
    ADD: new code_12._Code("+")
  };
  class Node {
    optimizeNodes() {
      return this;
    }
    optimizeNames(_names, _constants) {
      return this;
    }
  }
  class Def extends Node {
    constructor(varKind, name, rhs) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.rhs = rhs;
    }
    render({ es5, _n }) {
      const varKind = es5 ? scope_1.varKinds.var : this.varKind;
      const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${varKind} ${this.name}${rhs};` + _n;
    }
    optimizeNames(names2, constants2) {
      if (!names2[this.name.str])
        return;
      if (this.rhs)
        this.rhs = optimizeExpr(this.rhs, names2, constants2);
      return this;
    }
    get names() {
      return this.rhs instanceof code_12._CodeOrName ? this.rhs.names : {};
    }
  }
  class Assign extends Node {
    constructor(lhs, rhs, sideEffects) {
      super();
      this.lhs = lhs;
      this.rhs = rhs;
      this.sideEffects = sideEffects;
    }
    render({ _n }) {
      return `${this.lhs} = ${this.rhs};` + _n;
    }
    optimizeNames(names2, constants2) {
      if (this.lhs instanceof code_12.Name && !names2[this.lhs.str] && !this.sideEffects)
        return;
      this.rhs = optimizeExpr(this.rhs, names2, constants2);
      return this;
    }
    get names() {
      const names2 = this.lhs instanceof code_12.Name ? {} : { ...this.lhs.names };
      return addExprNames(names2, this.rhs);
    }
  }
  class AssignOp extends Assign {
    constructor(lhs, op, rhs, sideEffects) {
      super(lhs, rhs, sideEffects);
      this.op = op;
    }
    render({ _n }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
    }
  }
  class Label extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `${this.label}:` + _n;
    }
  }
  class Break extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      const label = this.label ? ` ${this.label}` : "";
      return `break${label};` + _n;
    }
  }
  class Throw extends Node {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render({ _n }) {
      return `throw ${this.error};` + _n;
    }
    get names() {
      return this.error.names;
    }
  }
  class AnyCode extends Node {
    constructor(code2) {
      super();
      this.code = code2;
    }
    render({ _n }) {
      return `${this.code};` + _n;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(names2, constants2) {
      this.code = optimizeExpr(this.code, names2, constants2);
      return this;
    }
    get names() {
      return this.code instanceof code_12._CodeOrName ? this.code.names : {};
    }
  }
  class ParentNode extends Node {
    constructor(nodes = []) {
      super();
      this.nodes = nodes;
    }
    render(opts) {
      return this.nodes.reduce((code2, n) => code2 + n.render(opts), "");
    }
    optimizeNodes() {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i].optimizeNodes();
        if (Array.isArray(n))
          nodes.splice(i, 1, ...n);
        else if (n)
          nodes[i] = n;
        else
          nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    optimizeNames(names2, constants2) {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i];
        if (n.optimizeNames(names2, constants2))
          continue;
        subtractNames(names2, n.names);
        nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((names2, n) => addNames(names2, n.names), {});
    }
  }
  class BlockNode extends ParentNode {
    render(opts) {
      return "{" + opts._n + super.render(opts) + "}" + opts._n;
    }
  }
  class Root extends ParentNode {
  }
  class Else extends BlockNode {
  }
  Else.kind = "else";
  class If extends BlockNode {
    constructor(condition, nodes) {
      super(nodes);
      this.condition = condition;
    }
    render(opts) {
      let code2 = `if(${this.condition})` + super.render(opts);
      if (this.else)
        code2 += "else " + this.else.render(opts);
      return code2;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const cond = this.condition;
      if (cond === true)
        return this.nodes;
      let e = this.else;
      if (e) {
        const ns = e.optimizeNodes();
        e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
      }
      if (e) {
        if (cond === false)
          return e instanceof If ? e : e.nodes;
        if (this.nodes.length)
          return this;
        return new If(not2(cond), e instanceof If ? [e] : e.nodes);
      }
      if (cond === false || !this.nodes.length)
        return void 0;
      return this;
    }
    optimizeNames(names2, constants2) {
      var _a;
      this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants2);
      if (!(super.optimizeNames(names2, constants2) || this.else))
        return;
      this.condition = optimizeExpr(this.condition, names2, constants2);
      return this;
    }
    get names() {
      const names2 = super.names;
      addExprNames(names2, this.condition);
      if (this.else)
        addNames(names2, this.else.names);
      return names2;
    }
  }
  If.kind = "if";
  class For extends BlockNode {
  }
  For.kind = "for";
  class ForLoop extends For {
    constructor(iteration) {
      super();
      this.iteration = iteration;
    }
    render(opts) {
      return `for(${this.iteration})` + super.render(opts);
    }
    optimizeNames(names2, constants2) {
      if (!super.optimizeNames(names2, constants2))
        return;
      this.iteration = optimizeExpr(this.iteration, names2, constants2);
      return this;
    }
    get names() {
      return addNames(super.names, this.iteration.names);
    }
  }
  class ForRange extends For {
    constructor(varKind, name, from, to) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.from = from;
      this.to = to;
    }
    render(opts) {
      const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
      const { name, from, to } = this;
      return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
    }
    get names() {
      const names2 = addExprNames(super.names, this.from);
      return addExprNames(names2, this.to);
    }
  }
  class ForIter extends For {
    constructor(loop, varKind, name, iterable) {
      super();
      this.loop = loop;
      this.varKind = varKind;
      this.name = name;
      this.iterable = iterable;
    }
    render(opts) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
    }
    optimizeNames(names2, constants2) {
      if (!super.optimizeNames(names2, constants2))
        return;
      this.iterable = optimizeExpr(this.iterable, names2, constants2);
      return this;
    }
    get names() {
      return addNames(super.names, this.iterable.names);
    }
  }
  class Func extends BlockNode {
    constructor(name, args, async) {
      super();
      this.name = name;
      this.args = args;
      this.async = async;
    }
    render(opts) {
      const _async = this.async ? "async " : "";
      return `${_async}function ${this.name}(${this.args})` + super.render(opts);
    }
  }
  Func.kind = "func";
  class Return extends ParentNode {
    render(opts) {
      return "return " + super.render(opts);
    }
  }
  Return.kind = "return";
  class Try extends BlockNode {
    render(opts) {
      let code2 = "try" + super.render(opts);
      if (this.catch)
        code2 += this.catch.render(opts);
      if (this.finally)
        code2 += this.finally.render(opts);
      return code2;
    }
    optimizeNodes() {
      var _a, _b;
      super.optimizeNodes();
      (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
      (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
      return this;
    }
    optimizeNames(names2, constants2) {
      var _a, _b;
      super.optimizeNames(names2, constants2);
      (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants2);
      (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names2, constants2);
      return this;
    }
    get names() {
      const names2 = super.names;
      if (this.catch)
        addNames(names2, this.catch.names);
      if (this.finally)
        addNames(names2, this.finally.names);
      return names2;
    }
  }
  class Catch extends BlockNode {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render(opts) {
      return `catch(${this.error})` + super.render(opts);
    }
  }
  Catch.kind = "catch";
  class Finally extends BlockNode {
    render(opts) {
      return "finally" + super.render(opts);
    }
  }
  Finally.kind = "finally";
  class CodeGen {
    constructor(extScope, opts = {}) {
      this._values = {};
      this._blockStarts = [];
      this._constants = {};
      this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
      this._extScope = extScope;
      this._scope = new scope_1.Scope({ parent: extScope });
      this._nodes = [new Root()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    // returns unique name in the internal scope
    name(prefix) {
      return this._scope.name(prefix);
    }
    // reserves unique name in the external scope
    scopeName(prefix) {
      return this._extScope.name(prefix);
    }
    // reserves unique name in the external scope and assigns value to it
    scopeValue(prefixOrName, value) {
      const name = this._extScope.value(prefixOrName, value);
      const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
      vs.add(name);
      return name;
    }
    getScopeValue(prefix, keyOrRef) {
      return this._extScope.getValue(prefix, keyOrRef);
    }
    // return code that assigns values in the external scope to the names that are used internally
    // (same names that were returned by gen.scopeName or gen.scopeValue)
    scopeRefs(scopeName) {
      return this._extScope.scopeRefs(scopeName, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(varKind, nameOrPrefix, rhs, constant) {
      const name = this._scope.toName(nameOrPrefix);
      if (rhs !== void 0 && constant)
        this._constants[name.str] = rhs;
      this._leafNode(new Def(varKind, name, rhs));
      return name;
    }
    // `const` declaration (`var` in es5 mode)
    const(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
    }
    // `var` declaration with optional assignment
    var(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
    }
    // assignment code
    assign(lhs, rhs, sideEffects) {
      return this._leafNode(new Assign(lhs, rhs, sideEffects));
    }
    // `+=` code
    add(lhs, rhs) {
      return this._leafNode(new AssignOp(lhs, exports$1.operators.ADD, rhs));
    }
    // appends passed SafeExpr to code or executes Block
    code(c) {
      if (typeof c == "function")
        c();
      else if (c !== code_12.nil)
        this._leafNode(new AnyCode(c));
      return this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...keyValues) {
      const code2 = ["{"];
      for (const [key, value] of keyValues) {
        if (code2.length > 1)
          code2.push(",");
        code2.push(key);
        if (key !== value || this.opts.es5) {
          code2.push(":");
          (0, code_12.addCodeArg)(code2, value);
        }
      }
      code2.push("}");
      return new code_12._Code(code2);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(condition, thenBody, elseBody) {
      this._blockNode(new If(condition));
      if (thenBody && elseBody) {
        this.code(thenBody).else().code(elseBody).endIf();
      } else if (thenBody) {
        this.code(thenBody).endIf();
      } else if (elseBody) {
        throw new Error('CodeGen: "else" body without "then" body');
      }
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(condition) {
      return this._elseNode(new If(condition));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new Else());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(If, Else);
    }
    _for(node, forBody) {
      this._blockNode(node);
      if (forBody)
        this.code(forBody).endFor();
      return this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(iteration, forBody) {
      return this._for(new ForLoop(iteration), forBody);
    }
    // `for` statement for a range of values
    forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
      const name = this._scope.toName(nameOrPrefix);
      if (this.opts.es5) {
        const arr = iterable instanceof code_12.Name ? iterable : this.var("_arr", iterable);
        return this.forRange("_i", 0, (0, code_12._)`${arr}.length`, (i) => {
          this.var(name, (0, code_12._)`${arr}[${i}]`);
          forBody(name);
        });
      }
      return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
      if (this.opts.ownProperties) {
        return this.forOf(nameOrPrefix, (0, code_12._)`Object.keys(${obj})`, forBody);
      }
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(For);
    }
    // `label` statement
    label(label) {
      return this._leafNode(new Label(label));
    }
    // `break` statement
    break(label) {
      return this._leafNode(new Break(label));
    }
    // `return` statement
    return(value) {
      const node = new Return();
      this._blockNode(node);
      this.code(value);
      if (node.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(Return);
    }
    // `try` statement
    try(tryBody, catchCode, finallyCode) {
      if (!catchCode && !finallyCode)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const node = new Try();
      this._blockNode(node);
      this.code(tryBody);
      if (catchCode) {
        const error2 = this.name("e");
        this._currNode = node.catch = new Catch(error2);
        catchCode(error2);
      }
      if (finallyCode) {
        this._currNode = node.finally = new Finally();
        this.code(finallyCode);
      }
      return this._endBlockNode(Catch, Finally);
    }
    // `throw` statement
    throw(error2) {
      return this._leafNode(new Throw(error2));
    }
    // start self-balancing block
    block(body, nodeCount) {
      this._blockStarts.push(this._nodes.length);
      if (body)
        this.code(body).endBlock(nodeCount);
      return this;
    }
    // end the current self-balancing block
    endBlock(nodeCount) {
      const len = this._blockStarts.pop();
      if (len === void 0)
        throw new Error("CodeGen: not in self-balancing block");
      const toClose = this._nodes.length - len;
      if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
        throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
      }
      this._nodes.length = len;
      return this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(name, args = code_12.nil, async, funcBody) {
      this._blockNode(new Func(name, args, async));
      if (funcBody)
        this.code(funcBody).endFunc();
      return this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(Func);
    }
    optimize(n = 1) {
      while (n-- > 0) {
        this._root.optimizeNodes();
        this._root.optimizeNames(this._root.names, this._constants);
      }
    }
    _leafNode(node) {
      this._currNode.nodes.push(node);
      return this;
    }
    _blockNode(node) {
      this._currNode.nodes.push(node);
      this._nodes.push(node);
    }
    _endBlockNode(N1, N2) {
      const n = this._currNode;
      if (n instanceof N1 || N2 && n instanceof N2) {
        this._nodes.pop();
        return this;
      }
      throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
    }
    _elseNode(node) {
      const n = this._currNode;
      if (!(n instanceof If)) {
        throw new Error('CodeGen: "else" without "if"');
      }
      this._currNode = n.else = node;
      return this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const ns = this._nodes;
      return ns[ns.length - 1];
    }
    set _currNode(node) {
      const ns = this._nodes;
      ns[ns.length - 1] = node;
    }
  }
  exports$1.CodeGen = CodeGen;
  function addNames(names2, from) {
    for (const n in from)
      names2[n] = (names2[n] || 0) + (from[n] || 0);
    return names2;
  }
  function addExprNames(names2, from) {
    return from instanceof code_12._CodeOrName ? addNames(names2, from.names) : names2;
  }
  function optimizeExpr(expr, names2, constants2) {
    if (expr instanceof code_12.Name)
      return replaceName(expr);
    if (!canOptimize(expr))
      return expr;
    return new code_12._Code(expr._items.reduce((items2, c) => {
      if (c instanceof code_12.Name)
        c = replaceName(c);
      if (c instanceof code_12._Code)
        items2.push(...c._items);
      else
        items2.push(c);
      return items2;
    }, []));
    function replaceName(n) {
      const c = constants2[n.str];
      if (c === void 0 || names2[n.str] !== 1)
        return n;
      delete names2[n.str];
      return c;
    }
    function canOptimize(e) {
      return e instanceof code_12._Code && e._items.some((c) => c instanceof code_12.Name && names2[c.str] === 1 && constants2[c.str] !== void 0);
    }
  }
  function subtractNames(names2, from) {
    for (const n in from)
      names2[n] = (names2[n] || 0) - (from[n] || 0);
  }
  function not2(x) {
    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_12._)`!${par(x)}`;
  }
  exports$1.not = not2;
  const andCode = mappend(exports$1.operators.AND);
  function and(...args) {
    return args.reduce(andCode);
  }
  exports$1.and = and;
  const orCode = mappend(exports$1.operators.OR);
  function or(...args) {
    return args.reduce(orCode);
  }
  exports$1.or = or;
  function mappend(op) {
    return (x, y) => x === code_12.nil ? y : y === code_12.nil ? x : (0, code_12._)`${par(x)} ${op} ${par(y)}`;
  }
  function par(x) {
    return x instanceof code_12.Name ? x : (0, code_12._)`(${x})`;
  }
})(codegen);
var util = {};
Object.defineProperty(util, "__esModule", { value: true });
util.checkStrictMode = util.getErrorPath = util.Type = util.useFunc = util.setEvaluated = util.evaluatedPropsToName = util.mergeEvaluated = util.eachItem = util.unescapeJsonPointer = util.escapeJsonPointer = util.escapeFragment = util.unescapeFragment = util.schemaRefOrVal = util.schemaHasRulesButRef = util.schemaHasRules = util.checkUnknownRules = util.alwaysValidSchema = util.toHash = void 0;
const codegen_1$o = codegen;
const code_1$9 = code$1;
function toHash(arr) {
  const hash = {};
  for (const item of arr)
    hash[item] = true;
  return hash;
}
util.toHash = toHash;
function alwaysValidSchema(it, schema) {
  if (typeof schema == "boolean")
    return schema;
  if (Object.keys(schema).length === 0)
    return true;
  checkUnknownRules(it, schema);
  return !schemaHasRules(schema, it.self.RULES.all);
}
util.alwaysValidSchema = alwaysValidSchema;
function checkUnknownRules(it, schema = it.schema) {
  const { opts, self } = it;
  if (!opts.strictSchema)
    return;
  if (typeof schema === "boolean")
    return;
  const rules2 = self.RULES.keywords;
  for (const key in schema) {
    if (!rules2[key])
      checkStrictMode(it, `unknown keyword: "${key}"`);
  }
}
util.checkUnknownRules = checkUnknownRules;
function schemaHasRules(schema, rules2) {
  if (typeof schema == "boolean")
    return !schema;
  for (const key in schema)
    if (rules2[key])
      return true;
  return false;
}
util.schemaHasRules = schemaHasRules;
function schemaHasRulesButRef(schema, RULES) {
  if (typeof schema == "boolean")
    return !schema;
  for (const key in schema)
    if (key !== "$ref" && RULES.all[key])
      return true;
  return false;
}
util.schemaHasRulesButRef = schemaHasRulesButRef;
function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword2, $data) {
  if (!$data) {
    if (typeof schema == "number" || typeof schema == "boolean")
      return schema;
    if (typeof schema == "string")
      return (0, codegen_1$o._)`${schema}`;
  }
  return (0, codegen_1$o._)`${topSchemaRef}${schemaPath}${(0, codegen_1$o.getProperty)(keyword2)}`;
}
util.schemaRefOrVal = schemaRefOrVal;
function unescapeFragment(str) {
  return unescapeJsonPointer(decodeURIComponent(str));
}
util.unescapeFragment = unescapeFragment;
function escapeFragment(str) {
  return encodeURIComponent(escapeJsonPointer(str));
}
util.escapeFragment = escapeFragment;
function escapeJsonPointer(str) {
  if (typeof str == "number")
    return `${str}`;
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
util.escapeJsonPointer = escapeJsonPointer;
function unescapeJsonPointer(str) {
  return str.replace(/~1/g, "/").replace(/~0/g, "~");
}
util.unescapeJsonPointer = unescapeJsonPointer;
function eachItem(xs, f) {
  if (Array.isArray(xs)) {
    for (const x of xs)
      f(x);
  } else {
    f(xs);
  }
}
util.eachItem = eachItem;
function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
  return (gen, from, to, toName) => {
    const res = to === void 0 ? from : to instanceof codegen_1$o.Name ? (from instanceof codegen_1$o.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1$o.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
    return toName === codegen_1$o.Name && !(res instanceof codegen_1$o.Name) ? resultToName(gen, res) : res;
  };
}
util.mergeEvaluated = {
  props: makeMergeEvaluated({
    mergeNames: (gen, from, to) => gen.if((0, codegen_1$o._)`${to} !== true && ${from} !== undefined`, () => {
      gen.if((0, codegen_1$o._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1$o._)`${to} || {}`).code((0, codegen_1$o._)`Object.assign(${to}, ${from})`));
    }),
    mergeToName: (gen, from, to) => gen.if((0, codegen_1$o._)`${to} !== true`, () => {
      if (from === true) {
        gen.assign(to, true);
      } else {
        gen.assign(to, (0, codegen_1$o._)`${to} || {}`);
        setEvaluated(gen, to, from);
      }
    }),
    mergeValues: (from, to) => from === true ? true : { ...from, ...to },
    resultToName: evaluatedPropsToName
  }),
  items: makeMergeEvaluated({
    mergeNames: (gen, from, to) => gen.if((0, codegen_1$o._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1$o._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
    mergeToName: (gen, from, to) => gen.if((0, codegen_1$o._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1$o._)`${to} > ${from} ? ${to} : ${from}`)),
    mergeValues: (from, to) => from === true ? true : Math.max(from, to),
    resultToName: (gen, items2) => gen.var("items", items2)
  })
};
function evaluatedPropsToName(gen, ps) {
  if (ps === true)
    return gen.var("props", true);
  const props = gen.var("props", (0, codegen_1$o._)`{}`);
  if (ps !== void 0)
    setEvaluated(gen, props, ps);
  return props;
}
util.evaluatedPropsToName = evaluatedPropsToName;
function setEvaluated(gen, props, ps) {
  Object.keys(ps).forEach((p) => gen.assign((0, codegen_1$o._)`${props}${(0, codegen_1$o.getProperty)(p)}`, true));
}
util.setEvaluated = setEvaluated;
const snippets = {};
function useFunc(gen, f) {
  return gen.scopeValue("func", {
    ref: f,
    code: snippets[f.code] || (snippets[f.code] = new code_1$9._Code(f.code))
  });
}
util.useFunc = useFunc;
var Type;
(function(Type2) {
  Type2[Type2["Num"] = 0] = "Num";
  Type2[Type2["Str"] = 1] = "Str";
})(Type || (util.Type = Type = {}));
function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
  if (dataProp instanceof codegen_1$o.Name) {
    const isNumber = dataPropType === Type.Num;
    return jsPropertySyntax ? isNumber ? (0, codegen_1$o._)`"[" + ${dataProp} + "]"` : (0, codegen_1$o._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1$o._)`"/" + ${dataProp}` : (0, codegen_1$o._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return jsPropertySyntax ? (0, codegen_1$o.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
}
util.getErrorPath = getErrorPath;
function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
  if (!mode)
    return;
  msg = `strict mode: ${msg}`;
  if (mode === true)
    throw new Error(msg);
  it.self.logger.warn(msg);
}
util.checkStrictMode = checkStrictMode;
var names = {};
var hasRequiredNames;
function requireNames() {
  if (hasRequiredNames) return names;
  hasRequiredNames = 1;
  Object.defineProperty(names, "__esModule", { value: true });
  const codegen_12 = codegen;
  const names$12 = {
    // validation function arguments
    data: new codegen_12.Name("data"),
    // data passed to validation function
    // args passed from referencing schema
    valCxt: new codegen_12.Name("valCxt"),
    // validation/data context - should not be used directly, it is destructured to the names below
    instancePath: new codegen_12.Name("instancePath"),
    parentData: new codegen_12.Name("parentData"),
    parentDataProperty: new codegen_12.Name("parentDataProperty"),
    rootData: new codegen_12.Name("rootData"),
    // root data - same as the data passed to the first/top validation function
    dynamicAnchors: new codegen_12.Name("dynamicAnchors"),
    // used to support recursiveRef and dynamicRef
    // function scoped variables
    vErrors: new codegen_12.Name("vErrors"),
    // null or array of validation errors
    errors: new codegen_12.Name("errors"),
    // counter of validation errors
    this: new codegen_12.Name("this"),
    // "globals"
    self: new codegen_12.Name("self"),
    scope: new codegen_12.Name("scope"),
    // JTD serialize/parse name for JSON string and position
    json: new codegen_12.Name("json"),
    jsonPos: new codegen_12.Name("jsonPos"),
    jsonLen: new codegen_12.Name("jsonLen"),
    jsonPart: new codegen_12.Name("jsonPart")
  };
  names.default = names$12;
  return names;
}
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.extendErrors = exports$1.resetErrorsCount = exports$1.reportExtraError = exports$1.reportError = exports$1.keyword$DataError = exports$1.keywordError = void 0;
  const codegen_12 = codegen;
  const util_12 = util;
  const names_12 = requireNames();
  exports$1.keywordError = {
    message: ({ keyword: keyword2 }) => (0, codegen_12.str)`must pass "${keyword2}" keyword validation`
  };
  exports$1.keyword$DataError = {
    message: ({ keyword: keyword2, schemaType }) => schemaType ? (0, codegen_12.str)`"${keyword2}" keyword must be ${schemaType} ($data)` : (0, codegen_12.str)`"${keyword2}" keyword is invalid ($data)`
  };
  function reportError(cxt, error2 = exports$1.keywordError, errorPaths, overrideAllErrors) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    const errObj = errorObjectCode(cxt, error2, errorPaths);
    if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
      addError(gen, errObj);
    } else {
      returnErrors(it, (0, codegen_12._)`[${errObj}]`);
    }
  }
  exports$1.reportError = reportError;
  function reportExtraError(cxt, error2 = exports$1.keywordError, errorPaths) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    const errObj = errorObjectCode(cxt, error2, errorPaths);
    addError(gen, errObj);
    if (!(compositeRule || allErrors)) {
      returnErrors(it, names_12.default.vErrors);
    }
  }
  exports$1.reportExtraError = reportExtraError;
  function resetErrorsCount(gen, errsCount) {
    gen.assign(names_12.default.errors, errsCount);
    gen.if((0, codegen_12._)`${names_12.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_12._)`${names_12.default.vErrors}.length`, errsCount), () => gen.assign(names_12.default.vErrors, null)));
  }
  exports$1.resetErrorsCount = resetErrorsCount;
  function extendErrors({ gen, keyword: keyword2, schemaValue, data, errsCount, it }) {
    if (errsCount === void 0)
      throw new Error("ajv implementation error");
    const err = gen.name("err");
    gen.forRange("i", errsCount, names_12.default.errors, (i) => {
      gen.const(err, (0, codegen_12._)`${names_12.default.vErrors}[${i}]`);
      gen.if((0, codegen_12._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_12._)`${err}.instancePath`, (0, codegen_12.strConcat)(names_12.default.instancePath, it.errorPath)));
      gen.assign((0, codegen_12._)`${err}.schemaPath`, (0, codegen_12.str)`${it.errSchemaPath}/${keyword2}`);
      if (it.opts.verbose) {
        gen.assign((0, codegen_12._)`${err}.schema`, schemaValue);
        gen.assign((0, codegen_12._)`${err}.data`, data);
      }
    });
  }
  exports$1.extendErrors = extendErrors;
  function addError(gen, errObj) {
    const err = gen.const("err", errObj);
    gen.if((0, codegen_12._)`${names_12.default.vErrors} === null`, () => gen.assign(names_12.default.vErrors, (0, codegen_12._)`[${err}]`), (0, codegen_12._)`${names_12.default.vErrors}.push(${err})`);
    gen.code((0, codegen_12._)`${names_12.default.errors}++`);
  }
  function returnErrors(it, errs) {
    const { gen, validateName, schemaEnv } = it;
    if (schemaEnv.$async) {
      gen.throw((0, codegen_12._)`new ${it.ValidationError}(${errs})`);
    } else {
      gen.assign((0, codegen_12._)`${validateName}.errors`, errs);
      gen.return(false);
    }
  }
  const E = {
    keyword: new codegen_12.Name("keyword"),
    schemaPath: new codegen_12.Name("schemaPath"),
    // also used in JTD errors
    params: new codegen_12.Name("params"),
    propertyName: new codegen_12.Name("propertyName"),
    message: new codegen_12.Name("message"),
    schema: new codegen_12.Name("schema"),
    parentSchema: new codegen_12.Name("parentSchema")
  };
  function errorObjectCode(cxt, error2, errorPaths) {
    const { createErrors } = cxt.it;
    if (createErrors === false)
      return (0, codegen_12._)`{}`;
    return errorObject(cxt, error2, errorPaths);
  }
  function errorObject(cxt, error2, errorPaths = {}) {
    const { gen, it } = cxt;
    const keyValues = [
      errorInstancePath(it, errorPaths),
      errorSchemaPath(cxt, errorPaths)
    ];
    extraErrorProps(cxt, error2, keyValues);
    return gen.object(...keyValues);
  }
  function errorInstancePath({ errorPath }, { instancePath }) {
    const instPath = instancePath ? (0, codegen_12.str)`${errorPath}${(0, util_12.getErrorPath)(instancePath, util_12.Type.Str)}` : errorPath;
    return [names_12.default.instancePath, (0, codegen_12.strConcat)(names_12.default.instancePath, instPath)];
  }
  function errorSchemaPath({ keyword: keyword2, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
    let schPath = parentSchema ? errSchemaPath : (0, codegen_12.str)`${errSchemaPath}/${keyword2}`;
    if (schemaPath) {
      schPath = (0, codegen_12.str)`${schPath}${(0, util_12.getErrorPath)(schemaPath, util_12.Type.Str)}`;
    }
    return [E.schemaPath, schPath];
  }
  function extraErrorProps(cxt, { params, message }, keyValues) {
    const { keyword: keyword2, data, schemaValue, it } = cxt;
    const { opts, propertyName, topSchemaRef, schemaPath } = it;
    keyValues.push([E.keyword, keyword2], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_12._)`{}`]);
    if (opts.messages) {
      keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
    }
    if (opts.verbose) {
      keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_12._)`${topSchemaRef}${schemaPath}`], [names_12.default.data, data]);
    }
    if (propertyName)
      keyValues.push([E.propertyName, propertyName]);
  }
})(errors);
var hasRequiredBoolSchema;
function requireBoolSchema() {
  if (hasRequiredBoolSchema) return boolSchema;
  hasRequiredBoolSchema = 1;
  Object.defineProperty(boolSchema, "__esModule", { value: true });
  boolSchema.boolOrEmptySchema = boolSchema.topBoolOrEmptySchema = void 0;
  const errors_12 = errors;
  const codegen_12 = codegen;
  const names_12 = requireNames();
  const boolError2 = {
    message: "boolean schema is false"
  };
  function topBoolOrEmptySchema2(it) {
    const { gen, schema, validateName } = it;
    if (schema === false) {
      falseSchemaError2(it, false);
    } else if (typeof schema == "object" && schema.$async === true) {
      gen.return(names_12.default.data);
    } else {
      gen.assign((0, codegen_12._)`${validateName}.errors`, null);
      gen.return(true);
    }
  }
  boolSchema.topBoolOrEmptySchema = topBoolOrEmptySchema2;
  function boolOrEmptySchema2(it, valid2) {
    const { gen, schema } = it;
    if (schema === false) {
      gen.var(valid2, false);
      falseSchemaError2(it);
    } else {
      gen.var(valid2, true);
    }
  }
  boolSchema.boolOrEmptySchema = boolOrEmptySchema2;
  function falseSchemaError2(it, overrideAllErrors) {
    const { gen, data } = it;
    const cxt = {
      gen,
      keyword: "false schema",
      data,
      schema: false,
      schemaCode: false,
      schemaValue: false,
      params: {},
      it
    };
    (0, errors_12.reportError)(cxt, boolError2, void 0, overrideAllErrors);
  }
  return boolSchema;
}
var dataType = {};
var rules = {};
Object.defineProperty(rules, "__esModule", { value: true });
rules.getRules = rules.isJSONType = void 0;
const _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
const jsonTypes = new Set(_jsonTypes);
function isJSONType(x) {
  return typeof x == "string" && jsonTypes.has(x);
}
rules.isJSONType = isJSONType;
function getRules() {
  const groups = {
    number: { type: "number", rules: [] },
    string: { type: "string", rules: [] },
    array: { type: "array", rules: [] },
    object: { type: "object", rules: [] }
  };
  return {
    types: { ...groups, integer: true, boolean: true, null: true },
    rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
    post: { rules: [] },
    all: {},
    keywords: {}
  };
}
rules.getRules = getRules;
var applicability = {};
var hasRequiredApplicability;
function requireApplicability() {
  if (hasRequiredApplicability) return applicability;
  hasRequiredApplicability = 1;
  Object.defineProperty(applicability, "__esModule", { value: true });
  applicability.shouldUseRule = applicability.shouldUseGroup = applicability.schemaHasRulesForType = void 0;
  function schemaHasRulesForType2({ schema, self }, type2) {
    const group = self.RULES.types[type2];
    return group && group !== true && shouldUseGroup2(schema, group);
  }
  applicability.schemaHasRulesForType = schemaHasRulesForType2;
  function shouldUseGroup2(schema, group) {
    return group.rules.some((rule) => shouldUseRule2(schema, rule));
  }
  applicability.shouldUseGroup = shouldUseGroup2;
  function shouldUseRule2(schema, rule) {
    var _a;
    return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
  }
  applicability.shouldUseRule = shouldUseRule2;
  return applicability;
}
Object.defineProperty(dataType, "__esModule", { value: true });
dataType.reportTypeError = dataType.checkDataTypes = dataType.checkDataType = dataType.coerceAndCheckDataType = dataType.getJSONTypes = dataType.getSchemaTypes = dataType.DataType = void 0;
const rules_1 = rules;
const applicability_1 = requireApplicability();
const errors_1 = errors;
const codegen_1$n = codegen;
const util_1$m = util;
var DataType;
(function(DataType2) {
  DataType2[DataType2["Correct"] = 0] = "Correct";
  DataType2[DataType2["Wrong"] = 1] = "Wrong";
})(DataType || (dataType.DataType = DataType = {}));
function getSchemaTypes(schema) {
  const types2 = getJSONTypes(schema.type);
  const hasNull = types2.includes("null");
  if (hasNull) {
    if (schema.nullable === false)
      throw new Error("type: null contradicts nullable: false");
  } else {
    if (!types2.length && schema.nullable !== void 0) {
      throw new Error('"nullable" cannot be used without "type"');
    }
    if (schema.nullable === true)
      types2.push("null");
  }
  return types2;
}
dataType.getSchemaTypes = getSchemaTypes;
function getJSONTypes(ts) {
  const types2 = Array.isArray(ts) ? ts : ts ? [ts] : [];
  if (types2.every(rules_1.isJSONType))
    return types2;
  throw new Error("type must be JSONType or JSONType[]: " + types2.join(","));
}
dataType.getJSONTypes = getJSONTypes;
function coerceAndCheckDataType(it, types2) {
  const { gen, data, opts } = it;
  const coerceTo = coerceToTypes(types2, opts.coerceTypes);
  const checkTypes = types2.length > 0 && !(coerceTo.length === 0 && types2.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types2[0]));
  if (checkTypes) {
    const wrongType = checkDataTypes(types2, data, opts.strictNumbers, DataType.Wrong);
    gen.if(wrongType, () => {
      if (coerceTo.length)
        coerceData(it, types2, coerceTo);
      else
        reportTypeError(it);
    });
  }
  return checkTypes;
}
dataType.coerceAndCheckDataType = coerceAndCheckDataType;
const COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function coerceToTypes(types2, coerceTypes) {
  return coerceTypes ? types2.filter((t2) => COERCIBLE.has(t2) || coerceTypes === "array" && t2 === "array") : [];
}
function coerceData(it, types2, coerceTo) {
  const { gen, data, opts } = it;
  const dataType2 = gen.let("dataType", (0, codegen_1$n._)`typeof ${data}`);
  const coerced = gen.let("coerced", (0, codegen_1$n._)`undefined`);
  if (opts.coerceTypes === "array") {
    gen.if((0, codegen_1$n._)`${dataType2} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1$n._)`${data}[0]`).assign(dataType2, (0, codegen_1$n._)`typeof ${data}`).if(checkDataTypes(types2, data, opts.strictNumbers), () => gen.assign(coerced, data)));
  }
  gen.if((0, codegen_1$n._)`${coerced} !== undefined`);
  for (const t2 of coerceTo) {
    if (COERCIBLE.has(t2) || t2 === "array" && opts.coerceTypes === "array") {
      coerceSpecificType(t2);
    }
  }
  gen.else();
  reportTypeError(it);
  gen.endIf();
  gen.if((0, codegen_1$n._)`${coerced} !== undefined`, () => {
    gen.assign(data, coerced);
    assignParentData(it, coerced);
  });
  function coerceSpecificType(t2) {
    switch (t2) {
      case "string":
        gen.elseIf((0, codegen_1$n._)`${dataType2} == "number" || ${dataType2} == "boolean"`).assign(coerced, (0, codegen_1$n._)`"" + ${data}`).elseIf((0, codegen_1$n._)`${data} === null`).assign(coerced, (0, codegen_1$n._)`""`);
        return;
      case "number":
        gen.elseIf((0, codegen_1$n._)`${dataType2} == "boolean" || ${data} === null
              || (${dataType2} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1$n._)`+${data}`);
        return;
      case "integer":
        gen.elseIf((0, codegen_1$n._)`${dataType2} === "boolean" || ${data} === null
              || (${dataType2} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1$n._)`+${data}`);
        return;
      case "boolean":
        gen.elseIf((0, codegen_1$n._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1$n._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
        return;
      case "null":
        gen.elseIf((0, codegen_1$n._)`${data} === "" || ${data} === 0 || ${data} === false`);
        gen.assign(coerced, null);
        return;
      case "array":
        gen.elseIf((0, codegen_1$n._)`${dataType2} === "string" || ${dataType2} === "number"
              || ${dataType2} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1$n._)`[${data}]`);
    }
  }
}
function assignParentData({ gen, parentData, parentDataProperty }, expr) {
  gen.if((0, codegen_1$n._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1$n._)`${parentData}[${parentDataProperty}]`, expr));
}
function checkDataType(dataType2, data, strictNums, correct = DataType.Correct) {
  const EQ = correct === DataType.Correct ? codegen_1$n.operators.EQ : codegen_1$n.operators.NEQ;
  let cond;
  switch (dataType2) {
    case "null":
      return (0, codegen_1$n._)`${data} ${EQ} null`;
    case "array":
      cond = (0, codegen_1$n._)`Array.isArray(${data})`;
      break;
    case "object":
      cond = (0, codegen_1$n._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
      break;
    case "integer":
      cond = numCond((0, codegen_1$n._)`!(${data} % 1) && !isNaN(${data})`);
      break;
    case "number":
      cond = numCond();
      break;
    default:
      return (0, codegen_1$n._)`typeof ${data} ${EQ} ${dataType2}`;
  }
  return correct === DataType.Correct ? cond : (0, codegen_1$n.not)(cond);
  function numCond(_cond = codegen_1$n.nil) {
    return (0, codegen_1$n.and)((0, codegen_1$n._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1$n._)`isFinite(${data})` : codegen_1$n.nil);
  }
}
dataType.checkDataType = checkDataType;
function checkDataTypes(dataTypes, data, strictNums, correct) {
  if (dataTypes.length === 1) {
    return checkDataType(dataTypes[0], data, strictNums, correct);
  }
  let cond;
  const types2 = (0, util_1$m.toHash)(dataTypes);
  if (types2.array && types2.object) {
    const notObj = (0, codegen_1$n._)`typeof ${data} != "object"`;
    cond = types2.null ? notObj : (0, codegen_1$n._)`!${data} || ${notObj}`;
    delete types2.null;
    delete types2.array;
    delete types2.object;
  } else {
    cond = codegen_1$n.nil;
  }
  if (types2.number)
    delete types2.integer;
  for (const t2 in types2)
    cond = (0, codegen_1$n.and)(cond, checkDataType(t2, data, strictNums, correct));
  return cond;
}
dataType.checkDataTypes = checkDataTypes;
const typeError = {
  message: ({ schema }) => `must be ${schema}`,
  params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1$n._)`{type: ${schema}}` : (0, codegen_1$n._)`{type: ${schemaValue}}`
};
function reportTypeError(it) {
  const cxt = getTypeErrorContext(it);
  (0, errors_1.reportError)(cxt, typeError);
}
dataType.reportTypeError = reportTypeError;
function getTypeErrorContext(it) {
  const { gen, data, schema } = it;
  const schemaCode = (0, util_1$m.schemaRefOrVal)(it, schema, "type");
  return {
    gen,
    keyword: "type",
    data,
    schema: schema.type,
    schemaCode,
    schemaValue: schemaCode,
    parentSchema: schema,
    params: {},
    it
  };
}
var defaults = {};
var hasRequiredDefaults;
function requireDefaults() {
  if (hasRequiredDefaults) return defaults;
  hasRequiredDefaults = 1;
  Object.defineProperty(defaults, "__esModule", { value: true });
  defaults.assignDefaults = void 0;
  const codegen_12 = codegen;
  const util_12 = util;
  function assignDefaults2(it, ty) {
    const { properties: properties2, items: items2 } = it.schema;
    if (ty === "object" && properties2) {
      for (const key in properties2) {
        assignDefault2(it, key, properties2[key].default);
      }
    } else if (ty === "array" && Array.isArray(items2)) {
      items2.forEach((sch, i) => assignDefault2(it, i, sch.default));
    }
  }
  defaults.assignDefaults = assignDefaults2;
  function assignDefault2(it, prop, defaultValue) {
    const { gen, compositeRule, data, opts } = it;
    if (defaultValue === void 0)
      return;
    const childData = (0, codegen_12._)`${data}${(0, codegen_12.getProperty)(prop)}`;
    if (compositeRule) {
      (0, util_12.checkStrictMode)(it, `default is ignored for: ${childData}`);
      return;
    }
    let condition = (0, codegen_12._)`${childData} === undefined`;
    if (opts.useDefaults === "empty") {
      condition = (0, codegen_12._)`${condition} || ${childData} === null || ${childData} === ""`;
    }
    gen.if(condition, (0, codegen_12._)`${childData} = ${(0, codegen_12.stringify)(defaultValue)}`);
  }
  return defaults;
}
var keyword = {};
var code = {};
var hasRequiredCode;
function requireCode() {
  if (hasRequiredCode) return code;
  hasRequiredCode = 1;
  Object.defineProperty(code, "__esModule", { value: true });
  code.validateUnion = code.validateArray = code.usePattern = code.callValidateCode = code.schemaProperties = code.allSchemaProperties = code.noPropertyInData = code.propertyInData = code.isOwnProperty = code.hasPropFunc = code.reportMissingProp = code.checkMissingProp = code.checkReportMissingProp = void 0;
  const codegen_12 = codegen;
  const util_12 = util;
  const names_12 = requireNames();
  const util_22 = util;
  function checkReportMissingProp2(cxt, prop) {
    const { gen, data, it } = cxt;
    gen.if(noPropertyInData2(gen, data, prop, it.opts.ownProperties), () => {
      cxt.setParams({ missingProperty: (0, codegen_12._)`${prop}` }, true);
      cxt.error();
    });
  }
  code.checkReportMissingProp = checkReportMissingProp2;
  function checkMissingProp2({ gen, data, it: { opts } }, properties2, missing) {
    return (0, codegen_12.or)(...properties2.map((prop) => (0, codegen_12.and)(noPropertyInData2(gen, data, prop, opts.ownProperties), (0, codegen_12._)`${missing} = ${prop}`)));
  }
  code.checkMissingProp = checkMissingProp2;
  function reportMissingProp2(cxt, missing) {
    cxt.setParams({ missingProperty: missing }, true);
    cxt.error();
  }
  code.reportMissingProp = reportMissingProp2;
  function hasPropFunc2(gen) {
    return gen.scopeValue("func", {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      ref: Object.prototype.hasOwnProperty,
      code: (0, codegen_12._)`Object.prototype.hasOwnProperty`
    });
  }
  code.hasPropFunc = hasPropFunc2;
  function isOwnProperty2(gen, data, property) {
    return (0, codegen_12._)`${hasPropFunc2(gen)}.call(${data}, ${property})`;
  }
  code.isOwnProperty = isOwnProperty2;
  function propertyInData2(gen, data, property, ownProperties) {
    const cond = (0, codegen_12._)`${data}${(0, codegen_12.getProperty)(property)} !== undefined`;
    return ownProperties ? (0, codegen_12._)`${cond} && ${isOwnProperty2(gen, data, property)}` : cond;
  }
  code.propertyInData = propertyInData2;
  function noPropertyInData2(gen, data, property, ownProperties) {
    const cond = (0, codegen_12._)`${data}${(0, codegen_12.getProperty)(property)} === undefined`;
    return ownProperties ? (0, codegen_12.or)(cond, (0, codegen_12.not)(isOwnProperty2(gen, data, property))) : cond;
  }
  code.noPropertyInData = noPropertyInData2;
  function allSchemaProperties2(schemaMap) {
    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
  }
  code.allSchemaProperties = allSchemaProperties2;
  function schemaProperties2(it, schemaMap) {
    return allSchemaProperties2(schemaMap).filter((p) => !(0, util_12.alwaysValidSchema)(it, schemaMap[p]));
  }
  code.schemaProperties = schemaProperties2;
  function callValidateCode2({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
    const dataAndSchema = passSchema ? (0, codegen_12._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
    const valCxt = [
      [names_12.default.instancePath, (0, codegen_12.strConcat)(names_12.default.instancePath, errorPath)],
      [names_12.default.parentData, it.parentData],
      [names_12.default.parentDataProperty, it.parentDataProperty],
      [names_12.default.rootData, names_12.default.rootData]
    ];
    if (it.opts.dynamicRef)
      valCxt.push([names_12.default.dynamicAnchors, names_12.default.dynamicAnchors]);
    const args = (0, codegen_12._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
    return context !== codegen_12.nil ? (0, codegen_12._)`${func}.call(${context}, ${args})` : (0, codegen_12._)`${func}(${args})`;
  }
  code.callValidateCode = callValidateCode2;
  const newRegExp2 = (0, codegen_12._)`new RegExp`;
  function usePattern2({ gen, it: { opts } }, pattern2) {
    const u = opts.unicodeRegExp ? "u" : "";
    const { regExp } = opts.code;
    const rx = regExp(pattern2, u);
    return gen.scopeValue("pattern", {
      key: rx.toString(),
      ref: rx,
      code: (0, codegen_12._)`${regExp.code === "new RegExp" ? newRegExp2 : (0, util_22.useFunc)(gen, regExp)}(${pattern2}, ${u})`
    });
  }
  code.usePattern = usePattern2;
  function validateArray2(cxt) {
    const { gen, data, keyword: keyword2, it } = cxt;
    const valid2 = gen.name("valid");
    if (it.allErrors) {
      const validArr = gen.let("valid", true);
      validateItems(() => gen.assign(validArr, false));
      return validArr;
    }
    gen.var(valid2, true);
    validateItems(() => gen.break());
    return valid2;
    function validateItems(notValid) {
      const len = gen.const("len", (0, codegen_12._)`${data}.length`);
      gen.forRange("i", 0, len, (i) => {
        cxt.subschema({
          keyword: keyword2,
          dataProp: i,
          dataPropType: util_12.Type.Num
        }, valid2);
        gen.if((0, codegen_12.not)(valid2), notValid);
      });
    }
  }
  code.validateArray = validateArray2;
  function validateUnion2(cxt) {
    const { gen, schema, keyword: keyword2, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    const alwaysValid = schema.some((sch) => (0, util_12.alwaysValidSchema)(it, sch));
    if (alwaysValid && !it.opts.unevaluated)
      return;
    const valid2 = gen.let("valid", false);
    const schValid = gen.name("_valid");
    gen.block(() => schema.forEach((_sch, i) => {
      const schCxt = cxt.subschema({
        keyword: keyword2,
        schemaProp: i,
        compositeRule: true
      }, schValid);
      gen.assign(valid2, (0, codegen_12._)`${valid2} || ${schValid}`);
      const merged = cxt.mergeValidEvaluated(schCxt, schValid);
      if (!merged)
        gen.if((0, codegen_12.not)(valid2));
    }));
    cxt.result(valid2, () => cxt.reset(), () => cxt.error(true));
  }
  code.validateUnion = validateUnion2;
  return code;
}
var hasRequiredKeyword;
function requireKeyword() {
  if (hasRequiredKeyword) return keyword;
  hasRequiredKeyword = 1;
  Object.defineProperty(keyword, "__esModule", { value: true });
  keyword.validateKeywordUsage = keyword.validSchemaType = keyword.funcKeywordCode = keyword.macroKeywordCode = void 0;
  const codegen_12 = codegen;
  const names_12 = requireNames();
  const code_12 = requireCode();
  const errors_12 = errors;
  function macroKeywordCode2(cxt, def2) {
    const { gen, keyword: keyword2, schema, parentSchema, it } = cxt;
    const macroSchema = def2.macro.call(it.self, schema, parentSchema, it);
    const schemaRef = useKeyword2(gen, keyword2, macroSchema);
    if (it.opts.validateSchema !== false)
      it.self.validateSchema(macroSchema, true);
    const valid2 = gen.name("valid");
    cxt.subschema({
      schema: macroSchema,
      schemaPath: codegen_12.nil,
      errSchemaPath: `${it.errSchemaPath}/${keyword2}`,
      topSchemaRef: schemaRef,
      compositeRule: true
    }, valid2);
    cxt.pass(valid2, () => cxt.error(true));
  }
  keyword.macroKeywordCode = macroKeywordCode2;
  function funcKeywordCode2(cxt, def2) {
    var _a;
    const { gen, keyword: keyword2, schema, parentSchema, $data, it } = cxt;
    checkAsyncKeyword2(it, def2);
    const validate2 = !$data && def2.compile ? def2.compile.call(it.self, schema, parentSchema, it) : def2.validate;
    const validateRef = useKeyword2(gen, keyword2, validate2);
    const valid2 = gen.let("valid");
    cxt.block$data(valid2, validateKeyword);
    cxt.ok((_a = def2.valid) !== null && _a !== void 0 ? _a : valid2);
    function validateKeyword() {
      if (def2.errors === false) {
        assignValid();
        if (def2.modifying)
          modifyData2(cxt);
        reportErrs(() => cxt.error());
      } else {
        const ruleErrs = def2.async ? validateAsync() : validateSync();
        if (def2.modifying)
          modifyData2(cxt);
        reportErrs(() => addErrs2(cxt, ruleErrs));
      }
    }
    function validateAsync() {
      const ruleErrs = gen.let("ruleErrs", null);
      gen.try(() => assignValid((0, codegen_12._)`await `), (e) => gen.assign(valid2, false).if((0, codegen_12._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_12._)`${e}.errors`), () => gen.throw(e)));
      return ruleErrs;
    }
    function validateSync() {
      const validateErrs = (0, codegen_12._)`${validateRef}.errors`;
      gen.assign(validateErrs, null);
      assignValid(codegen_12.nil);
      return validateErrs;
    }
    function assignValid(_await = def2.async ? (0, codegen_12._)`await ` : codegen_12.nil) {
      const passCxt = it.opts.passContext ? names_12.default.this : names_12.default.self;
      const passSchema = !("compile" in def2 && !$data || def2.schema === false);
      gen.assign(valid2, (0, codegen_12._)`${_await}${(0, code_12.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def2.modifying);
    }
    function reportErrs(errors2) {
      var _a2;
      gen.if((0, codegen_12.not)((_a2 = def2.valid) !== null && _a2 !== void 0 ? _a2 : valid2), errors2);
    }
  }
  keyword.funcKeywordCode = funcKeywordCode2;
  function modifyData2(cxt) {
    const { gen, data, it } = cxt;
    gen.if(it.parentData, () => gen.assign(data, (0, codegen_12._)`${it.parentData}[${it.parentDataProperty}]`));
  }
  function addErrs2(cxt, errs) {
    const { gen } = cxt;
    gen.if((0, codegen_12._)`Array.isArray(${errs})`, () => {
      gen.assign(names_12.default.vErrors, (0, codegen_12._)`${names_12.default.vErrors} === null ? ${errs} : ${names_12.default.vErrors}.concat(${errs})`).assign(names_12.default.errors, (0, codegen_12._)`${names_12.default.vErrors}.length`);
      (0, errors_12.extendErrors)(cxt);
    }, () => cxt.error());
  }
  function checkAsyncKeyword2({ schemaEnv }, def2) {
    if (def2.async && !schemaEnv.$async)
      throw new Error("async keyword in sync schema");
  }
  function useKeyword2(gen, keyword2, result) {
    if (result === void 0)
      throw new Error(`keyword "${keyword2}" failed to compile`);
    return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_12.stringify)(result) });
  }
  function validSchemaType2(schema, schemaType, allowUndefined = false) {
    return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
  }
  keyword.validSchemaType = validSchemaType2;
  function validateKeywordUsage2({ schema, opts, self, errSchemaPath }, def2, keyword2) {
    if (Array.isArray(def2.keyword) ? !def2.keyword.includes(keyword2) : def2.keyword !== keyword2) {
      throw new Error("ajv implementation error");
    }
    const deps = def2.dependencies;
    if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
      throw new Error(`parent schema must have dependencies of ${keyword2}: ${deps.join(",")}`);
    }
    if (def2.validateSchema) {
      const valid2 = def2.validateSchema(schema[keyword2]);
      if (!valid2) {
        const msg = `keyword "${keyword2}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def2.validateSchema.errors);
        if (opts.validateSchema === "log")
          self.logger.error(msg);
        else
          throw new Error(msg);
      }
    }
  }
  keyword.validateKeywordUsage = validateKeywordUsage2;
  return keyword;
}
var subschema = {};
var hasRequiredSubschema;
function requireSubschema() {
  if (hasRequiredSubschema) return subschema;
  hasRequiredSubschema = 1;
  Object.defineProperty(subschema, "__esModule", { value: true });
  subschema.extendSubschemaMode = subschema.extendSubschemaData = subschema.getSubschema = void 0;
  const codegen_12 = codegen;
  const util_12 = util;
  function getSubschema2(it, { keyword: keyword2, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
    if (keyword2 !== void 0 && schema !== void 0) {
      throw new Error('both "keyword" and "schema" passed, only one allowed');
    }
    if (keyword2 !== void 0) {
      const sch = it.schema[keyword2];
      return schemaProp === void 0 ? {
        schema: sch,
        schemaPath: (0, codegen_12._)`${it.schemaPath}${(0, codegen_12.getProperty)(keyword2)}`,
        errSchemaPath: `${it.errSchemaPath}/${keyword2}`
      } : {
        schema: sch[schemaProp],
        schemaPath: (0, codegen_12._)`${it.schemaPath}${(0, codegen_12.getProperty)(keyword2)}${(0, codegen_12.getProperty)(schemaProp)}`,
        errSchemaPath: `${it.errSchemaPath}/${keyword2}/${(0, util_12.escapeFragment)(schemaProp)}`
      };
    }
    if (schema !== void 0) {
      if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
        throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
      }
      return {
        schema,
        schemaPath,
        topSchemaRef,
        errSchemaPath
      };
    }
    throw new Error('either "keyword" or "schema" must be passed');
  }
  subschema.getSubschema = getSubschema2;
  function extendSubschemaData2(subschema2, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
    if (data !== void 0 && dataProp !== void 0) {
      throw new Error('both "data" and "dataProp" passed, only one allowed');
    }
    const { gen } = it;
    if (dataProp !== void 0) {
      const { errorPath, dataPathArr, opts } = it;
      const nextData = gen.let("data", (0, codegen_12._)`${it.data}${(0, codegen_12.getProperty)(dataProp)}`, true);
      dataContextProps(nextData);
      subschema2.errorPath = (0, codegen_12.str)`${errorPath}${(0, util_12.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
      subschema2.parentDataProperty = (0, codegen_12._)`${dataProp}`;
      subschema2.dataPathArr = [...dataPathArr, subschema2.parentDataProperty];
    }
    if (data !== void 0) {
      const nextData = data instanceof codegen_12.Name ? data : gen.let("data", data, true);
      dataContextProps(nextData);
      if (propertyName !== void 0)
        subschema2.propertyName = propertyName;
    }
    if (dataTypes)
      subschema2.dataTypes = dataTypes;
    function dataContextProps(_nextData) {
      subschema2.data = _nextData;
      subschema2.dataLevel = it.dataLevel + 1;
      subschema2.dataTypes = [];
      it.definedProperties = /* @__PURE__ */ new Set();
      subschema2.parentData = it.data;
      subschema2.dataNames = [...it.dataNames, _nextData];
    }
  }
  subschema.extendSubschemaData = extendSubschemaData2;
  function extendSubschemaMode2(subschema2, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
    if (compositeRule !== void 0)
      subschema2.compositeRule = compositeRule;
    if (createErrors !== void 0)
      subschema2.createErrors = createErrors;
    if (allErrors !== void 0)
      subschema2.allErrors = allErrors;
    subschema2.jtdDiscriminator = jtdDiscriminator;
    subschema2.jtdMetadata = jtdMetadata;
  }
  subschema.extendSubschemaMode = extendSubschemaMode2;
  return subschema;
}
var resolve$1 = {};
var jsonSchemaTraverse = { exports: {} };
var traverse$1 = jsonSchemaTraverse.exports = function(schema, opts, cb) {
  if (typeof opts == "function") {
    cb = opts;
    opts = {};
  }
  cb = opts.cb || cb;
  var pre = typeof cb == "function" ? cb : cb.pre || function() {
  };
  var post = cb.post || function() {
  };
  _traverse(opts, pre, post, schema, "", schema);
};
traverse$1.keywords = {
  additionalItems: true,
  items: true,
  contains: true,
  additionalProperties: true,
  propertyNames: true,
  not: true,
  if: true,
  then: true,
  else: true
};
traverse$1.arrayKeywords = {
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};
traverse$1.propsKeywords = {
  $defs: true,
  definitions: true,
  properties: true,
  patternProperties: true,
  dependencies: true
};
traverse$1.skipKeywords = {
  default: true,
  enum: true,
  const: true,
  required: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};
function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
  if (schema && typeof schema == "object" && !Array.isArray(schema)) {
    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    for (var key in schema) {
      var sch = schema[key];
      if (Array.isArray(sch)) {
        if (key in traverse$1.arrayKeywords) {
          for (var i = 0; i < sch.length; i++)
            _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
        }
      } else if (key in traverse$1.propsKeywords) {
        if (sch && typeof sch == "object") {
          for (var prop in sch)
            _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
        }
      } else if (key in traverse$1.keywords || opts.allKeys && !(key in traverse$1.skipKeywords)) {
        _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
      }
    }
    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  }
}
function escapeJsonPtr(str) {
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
var jsonSchemaTraverseExports = jsonSchemaTraverse.exports;
Object.defineProperty(resolve$1, "__esModule", { value: true });
resolve$1.getSchemaRefs = resolve$1.resolveUrl = resolve$1.normalizeId = resolve$1._getFullPath = resolve$1.getFullPath = resolve$1.inlineRef = void 0;
const util_1$l = util;
const equal$2 = fastDeepEqual;
const traverse = jsonSchemaTraverseExports;
const SIMPLE_INLINED = /* @__PURE__ */ new Set([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum",
  "const"
]);
function inlineRef(schema, limit2 = true) {
  if (typeof schema == "boolean")
    return true;
  if (limit2 === true)
    return !hasRef(schema);
  if (!limit2)
    return false;
  return countKeys(schema) <= limit2;
}
resolve$1.inlineRef = inlineRef;
const REF_KEYWORDS = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function hasRef(schema) {
  for (const key in schema) {
    if (REF_KEYWORDS.has(key))
      return true;
    const sch = schema[key];
    if (Array.isArray(sch) && sch.some(hasRef))
      return true;
    if (typeof sch == "object" && hasRef(sch))
      return true;
  }
  return false;
}
function countKeys(schema) {
  let count = 0;
  for (const key in schema) {
    if (key === "$ref")
      return Infinity;
    count++;
    if (SIMPLE_INLINED.has(key))
      continue;
    if (typeof schema[key] == "object") {
      (0, util_1$l.eachItem)(schema[key], (sch) => count += countKeys(sch));
    }
    if (count === Infinity)
      return Infinity;
  }
  return count;
}
function getFullPath(resolver, id2 = "", normalize2) {
  if (normalize2 !== false)
    id2 = normalizeId(id2);
  const p = resolver.parse(id2);
  return _getFullPath(resolver, p);
}
resolve$1.getFullPath = getFullPath;
function _getFullPath(resolver, p) {
  const serialized = resolver.serialize(p);
  return serialized.split("#")[0] + "#";
}
resolve$1._getFullPath = _getFullPath;
const TRAILING_SLASH_HASH = /#\/?$/;
function normalizeId(id2) {
  return id2 ? id2.replace(TRAILING_SLASH_HASH, "") : "";
}
resolve$1.normalizeId = normalizeId;
function resolveUrl(resolver, baseId, id2) {
  id2 = normalizeId(id2);
  return resolver.resolve(baseId, id2);
}
resolve$1.resolveUrl = resolveUrl;
const ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
function getSchemaRefs(schema, baseId) {
  if (typeof schema == "boolean")
    return {};
  const { schemaId, uriResolver } = this.opts;
  const schId = normalizeId(schema[schemaId] || baseId);
  const baseIds = { "": schId };
  const pathPrefix = getFullPath(uriResolver, schId, false);
  const localRefs = {};
  const schemaRefs = /* @__PURE__ */ new Set();
  traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
    if (parentJsonPtr === void 0)
      return;
    const fullPath = pathPrefix + jsonPtr;
    let innerBaseId = baseIds[parentJsonPtr];
    if (typeof sch[schemaId] == "string")
      innerBaseId = addRef.call(this, sch[schemaId]);
    addAnchor.call(this, sch.$anchor);
    addAnchor.call(this, sch.$dynamicAnchor);
    baseIds[jsonPtr] = innerBaseId;
    function addRef(ref2) {
      const _resolve = this.opts.uriResolver.resolve;
      ref2 = normalizeId(innerBaseId ? _resolve(innerBaseId, ref2) : ref2);
      if (schemaRefs.has(ref2))
        throw ambiguos(ref2);
      schemaRefs.add(ref2);
      let schOrRef = this.refs[ref2];
      if (typeof schOrRef == "string")
        schOrRef = this.refs[schOrRef];
      if (typeof schOrRef == "object") {
        checkAmbiguosRef(sch, schOrRef.schema, ref2);
      } else if (ref2 !== normalizeId(fullPath)) {
        if (ref2[0] === "#") {
          checkAmbiguosRef(sch, localRefs[ref2], ref2);
          localRefs[ref2] = sch;
        } else {
          this.refs[ref2] = fullPath;
        }
      }
      return ref2;
    }
    function addAnchor(anchor) {
      if (typeof anchor == "string") {
        if (!ANCHOR.test(anchor))
          throw new Error(`invalid anchor "${anchor}"`);
        addRef.call(this, `#${anchor}`);
      }
    }
  });
  return localRefs;
  function checkAmbiguosRef(sch1, sch2, ref2) {
    if (sch2 !== void 0 && !equal$2(sch1, sch2))
      throw ambiguos(ref2);
  }
  function ambiguos(ref2) {
    return new Error(`reference "${ref2}" resolves to more than one schema`);
  }
}
resolve$1.getSchemaRefs = getSchemaRefs;
var hasRequiredValidate;
function requireValidate() {
  if (hasRequiredValidate) return validate;
  hasRequiredValidate = 1;
  Object.defineProperty(validate, "__esModule", { value: true });
  validate.getData = validate.KeywordCxt = validate.validateFunctionCode = void 0;
  const boolSchema_12 = requireBoolSchema();
  const dataType_12 = dataType;
  const applicability_12 = requireApplicability();
  const dataType_22 = dataType;
  const defaults_12 = requireDefaults();
  const keyword_12 = requireKeyword();
  const subschema_12 = requireSubschema();
  const codegen_12 = codegen;
  const names_12 = requireNames();
  const resolve_12 = resolve$1;
  const util_12 = util;
  const errors_12 = errors;
  function validateFunctionCode2(it) {
    if (isSchemaObj2(it)) {
      checkKeywords2(it);
      if (schemaCxtHasRules2(it)) {
        topSchemaObjCode2(it);
        return;
      }
    }
    validateFunction2(it, () => (0, boolSchema_12.topBoolOrEmptySchema)(it));
  }
  validate.validateFunctionCode = validateFunctionCode2;
  function validateFunction2({ gen, validateName, schema, schemaEnv, opts }, body) {
    if (opts.code.es5) {
      gen.func(validateName, (0, codegen_12._)`${names_12.default.data}, ${names_12.default.valCxt}`, schemaEnv.$async, () => {
        gen.code((0, codegen_12._)`"use strict"; ${funcSourceUrl2(schema, opts)}`);
        destructureValCxtES52(gen, opts);
        gen.code(body);
      });
    } else {
      gen.func(validateName, (0, codegen_12._)`${names_12.default.data}, ${destructureValCxt2(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl2(schema, opts)).code(body));
    }
  }
  function destructureValCxt2(opts) {
    return (0, codegen_12._)`{${names_12.default.instancePath}="", ${names_12.default.parentData}, ${names_12.default.parentDataProperty}, ${names_12.default.rootData}=${names_12.default.data}${opts.dynamicRef ? (0, codegen_12._)`, ${names_12.default.dynamicAnchors}={}` : codegen_12.nil}}={}`;
  }
  function destructureValCxtES52(gen, opts) {
    gen.if(names_12.default.valCxt, () => {
      gen.var(names_12.default.instancePath, (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.instancePath}`);
      gen.var(names_12.default.parentData, (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.parentData}`);
      gen.var(names_12.default.parentDataProperty, (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.parentDataProperty}`);
      gen.var(names_12.default.rootData, (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.rootData}`);
      if (opts.dynamicRef)
        gen.var(names_12.default.dynamicAnchors, (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.dynamicAnchors}`);
    }, () => {
      gen.var(names_12.default.instancePath, (0, codegen_12._)`""`);
      gen.var(names_12.default.parentData, (0, codegen_12._)`undefined`);
      gen.var(names_12.default.parentDataProperty, (0, codegen_12._)`undefined`);
      gen.var(names_12.default.rootData, names_12.default.data);
      if (opts.dynamicRef)
        gen.var(names_12.default.dynamicAnchors, (0, codegen_12._)`{}`);
    });
  }
  function topSchemaObjCode2(it) {
    const { schema, opts, gen } = it;
    validateFunction2(it, () => {
      if (opts.$comment && schema.$comment)
        commentKeyword2(it);
      checkNoDefault2(it);
      gen.let(names_12.default.vErrors, null);
      gen.let(names_12.default.errors, 0);
      if (opts.unevaluated)
        resetEvaluated2(it);
      typeAndKeywords2(it);
      returnResults2(it);
    });
    return;
  }
  function resetEvaluated2(it) {
    const { gen, validateName } = it;
    it.evaluated = gen.const("evaluated", (0, codegen_12._)`${validateName}.evaluated`);
    gen.if((0, codegen_12._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_12._)`${it.evaluated}.props`, (0, codegen_12._)`undefined`));
    gen.if((0, codegen_12._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_12._)`${it.evaluated}.items`, (0, codegen_12._)`undefined`));
  }
  function funcSourceUrl2(schema, opts) {
    const schId = typeof schema == "object" && schema[opts.schemaId];
    return schId && (opts.code.source || opts.code.process) ? (0, codegen_12._)`/*# sourceURL=${schId} */` : codegen_12.nil;
  }
  function subschemaCode2(it, valid2) {
    if (isSchemaObj2(it)) {
      checkKeywords2(it);
      if (schemaCxtHasRules2(it)) {
        subSchemaObjCode2(it, valid2);
        return;
      }
    }
    (0, boolSchema_12.boolOrEmptySchema)(it, valid2);
  }
  function schemaCxtHasRules2({ schema, self }) {
    if (typeof schema == "boolean")
      return !schema;
    for (const key in schema)
      if (self.RULES.all[key])
        return true;
    return false;
  }
  function isSchemaObj2(it) {
    return typeof it.schema != "boolean";
  }
  function subSchemaObjCode2(it, valid2) {
    const { schema, gen, opts } = it;
    if (opts.$comment && schema.$comment)
      commentKeyword2(it);
    updateContext2(it);
    checkAsyncSchema2(it);
    const errsCount = gen.const("_errs", names_12.default.errors);
    typeAndKeywords2(it, errsCount);
    gen.var(valid2, (0, codegen_12._)`${errsCount} === ${names_12.default.errors}`);
  }
  function checkKeywords2(it) {
    (0, util_12.checkUnknownRules)(it);
    checkRefsAndKeywords2(it);
  }
  function typeAndKeywords2(it, errsCount) {
    if (it.opts.jtd)
      return schemaKeywords2(it, [], false, errsCount);
    const types2 = (0, dataType_12.getSchemaTypes)(it.schema);
    const checkedTypes = (0, dataType_12.coerceAndCheckDataType)(it, types2);
    schemaKeywords2(it, types2, !checkedTypes, errsCount);
  }
  function checkRefsAndKeywords2(it) {
    const { schema, errSchemaPath, opts, self } = it;
    if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_12.schemaHasRulesButRef)(schema, self.RULES)) {
      self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
    }
  }
  function checkNoDefault2(it) {
    const { schema, opts } = it;
    if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
      (0, util_12.checkStrictMode)(it, "default is ignored in the schema root");
    }
  }
  function updateContext2(it) {
    const schId = it.schema[it.opts.schemaId];
    if (schId)
      it.baseId = (0, resolve_12.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
  }
  function checkAsyncSchema2(it) {
    if (it.schema.$async && !it.schemaEnv.$async)
      throw new Error("async schema in sync schema");
  }
  function commentKeyword2({ gen, schemaEnv, schema, errSchemaPath, opts }) {
    const msg = schema.$comment;
    if (opts.$comment === true) {
      gen.code((0, codegen_12._)`${names_12.default.self}.logger.log(${msg})`);
    } else if (typeof opts.$comment == "function") {
      const schemaPath = (0, codegen_12.str)`${errSchemaPath}/$comment`;
      const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
      gen.code((0, codegen_12._)`${names_12.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
    }
  }
  function returnResults2(it) {
    const { gen, schemaEnv, validateName, ValidationError: ValidationError2, opts } = it;
    if (schemaEnv.$async) {
      gen.if((0, codegen_12._)`${names_12.default.errors} === 0`, () => gen.return(names_12.default.data), () => gen.throw((0, codegen_12._)`new ${ValidationError2}(${names_12.default.vErrors})`));
    } else {
      gen.assign((0, codegen_12._)`${validateName}.errors`, names_12.default.vErrors);
      if (opts.unevaluated)
        assignEvaluated2(it);
      gen.return((0, codegen_12._)`${names_12.default.errors} === 0`);
    }
  }
  function assignEvaluated2({ gen, evaluated, props, items: items2 }) {
    if (props instanceof codegen_12.Name)
      gen.assign((0, codegen_12._)`${evaluated}.props`, props);
    if (items2 instanceof codegen_12.Name)
      gen.assign((0, codegen_12._)`${evaluated}.items`, items2);
  }
  function schemaKeywords2(it, types2, typeErrors, errsCount) {
    const { gen, schema, data, allErrors, opts, self } = it;
    const { RULES } = self;
    if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_12.schemaHasRulesButRef)(schema, RULES))) {
      gen.block(() => keywordCode2(it, "$ref", RULES.all.$ref.definition));
      return;
    }
    if (!opts.jtd)
      checkStrictTypes2(it, types2);
    gen.block(() => {
      for (const group of RULES.rules)
        groupKeywords(group);
      groupKeywords(RULES.post);
    });
    function groupKeywords(group) {
      if (!(0, applicability_12.shouldUseGroup)(schema, group))
        return;
      if (group.type) {
        gen.if((0, dataType_22.checkDataType)(group.type, data, opts.strictNumbers));
        iterateKeywords2(it, group);
        if (types2.length === 1 && types2[0] === group.type && typeErrors) {
          gen.else();
          (0, dataType_22.reportTypeError)(it);
        }
        gen.endIf();
      } else {
        iterateKeywords2(it, group);
      }
      if (!allErrors)
        gen.if((0, codegen_12._)`${names_12.default.errors} === ${errsCount || 0}`);
    }
  }
  function iterateKeywords2(it, group) {
    const { gen, schema, opts: { useDefaults } } = it;
    if (useDefaults)
      (0, defaults_12.assignDefaults)(it, group.type);
    gen.block(() => {
      for (const rule of group.rules) {
        if ((0, applicability_12.shouldUseRule)(schema, rule)) {
          keywordCode2(it, rule.keyword, rule.definition, group.type);
        }
      }
    });
  }
  function checkStrictTypes2(it, types2) {
    if (it.schemaEnv.meta || !it.opts.strictTypes)
      return;
    checkContextTypes2(it, types2);
    if (!it.opts.allowUnionTypes)
      checkMultipleTypes2(it, types2);
    checkKeywordTypes2(it, it.dataTypes);
  }
  function checkContextTypes2(it, types2) {
    if (!types2.length)
      return;
    if (!it.dataTypes.length) {
      it.dataTypes = types2;
      return;
    }
    types2.forEach((t2) => {
      if (!includesType2(it.dataTypes, t2)) {
        strictTypesError2(it, `type "${t2}" not allowed by context "${it.dataTypes.join(",")}"`);
      }
    });
    narrowSchemaTypes2(it, types2);
  }
  function checkMultipleTypes2(it, ts) {
    if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
      strictTypesError2(it, "use allowUnionTypes to allow union type keyword");
    }
  }
  function checkKeywordTypes2(it, ts) {
    const rules2 = it.self.RULES.all;
    for (const keyword2 in rules2) {
      const rule = rules2[keyword2];
      if (typeof rule == "object" && (0, applicability_12.shouldUseRule)(it.schema, rule)) {
        const { type: type2 } = rule.definition;
        if (type2.length && !type2.some((t2) => hasApplicableType2(ts, t2))) {
          strictTypesError2(it, `missing type "${type2.join(",")}" for keyword "${keyword2}"`);
        }
      }
    }
  }
  function hasApplicableType2(schTs, kwdT) {
    return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
  }
  function includesType2(ts, t2) {
    return ts.includes(t2) || t2 === "integer" && ts.includes("number");
  }
  function narrowSchemaTypes2(it, withTypes) {
    const ts = [];
    for (const t2 of it.dataTypes) {
      if (includesType2(withTypes, t2))
        ts.push(t2);
      else if (withTypes.includes("integer") && t2 === "number")
        ts.push("integer");
    }
    it.dataTypes = ts;
  }
  function strictTypesError2(it, msg) {
    const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
    msg += ` at "${schemaPath}" (strictTypes)`;
    (0, util_12.checkStrictMode)(it, msg, it.opts.strictTypes);
  }
  class KeywordCxt2 {
    constructor(it, def2, keyword2) {
      (0, keyword_12.validateKeywordUsage)(it, def2, keyword2);
      this.gen = it.gen;
      this.allErrors = it.allErrors;
      this.keyword = keyword2;
      this.data = it.data;
      this.schema = it.schema[keyword2];
      this.$data = def2.$data && it.opts.$data && this.schema && this.schema.$data;
      this.schemaValue = (0, util_12.schemaRefOrVal)(it, this.schema, keyword2, this.$data);
      this.schemaType = def2.schemaType;
      this.parentSchema = it.schema;
      this.params = {};
      this.it = it;
      this.def = def2;
      if (this.$data) {
        this.schemaCode = it.gen.const("vSchema", getData2(this.$data, it));
      } else {
        this.schemaCode = this.schemaValue;
        if (!(0, keyword_12.validSchemaType)(this.schema, def2.schemaType, def2.allowUndefined)) {
          throw new Error(`${keyword2} value must be ${JSON.stringify(def2.schemaType)}`);
        }
      }
      if ("code" in def2 ? def2.trackErrors : def2.errors !== false) {
        this.errsCount = it.gen.const("_errs", names_12.default.errors);
      }
    }
    result(condition, successAction, failAction) {
      this.failResult((0, codegen_12.not)(condition), successAction, failAction);
    }
    failResult(condition, successAction, failAction) {
      this.gen.if(condition);
      if (failAction)
        failAction();
      else
        this.error();
      if (successAction) {
        this.gen.else();
        successAction();
        if (this.allErrors)
          this.gen.endIf();
      } else {
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
    }
    pass(condition, failAction) {
      this.failResult((0, codegen_12.not)(condition), void 0, failAction);
    }
    fail(condition) {
      if (condition === void 0) {
        this.error();
        if (!this.allErrors)
          this.gen.if(false);
        return;
      }
      this.gen.if(condition);
      this.error();
      if (this.allErrors)
        this.gen.endIf();
      else
        this.gen.else();
    }
    fail$data(condition) {
      if (!this.$data)
        return this.fail(condition);
      const { schemaCode } = this;
      this.fail((0, codegen_12._)`${schemaCode} !== undefined && (${(0, codegen_12.or)(this.invalid$data(), condition)})`);
    }
    error(append, errorParams, errorPaths) {
      if (errorParams) {
        this.setParams(errorParams);
        this._error(append, errorPaths);
        this.setParams({});
        return;
      }
      this._error(append, errorPaths);
    }
    _error(append, errorPaths) {
      (append ? errors_12.reportExtraError : errors_12.reportError)(this, this.def.error, errorPaths);
    }
    $dataError() {
      (0, errors_12.reportError)(this, this.def.$dataError || errors_12.keyword$DataError);
    }
    reset() {
      if (this.errsCount === void 0)
        throw new Error('add "trackErrors" to keyword definition');
      (0, errors_12.resetErrorsCount)(this.gen, this.errsCount);
    }
    ok(cond) {
      if (!this.allErrors)
        this.gen.if(cond);
    }
    setParams(obj, assign) {
      if (assign)
        Object.assign(this.params, obj);
      else
        this.params = obj;
    }
    block$data(valid2, codeBlock, $dataValid = codegen_12.nil) {
      this.gen.block(() => {
        this.check$data(valid2, $dataValid);
        codeBlock();
      });
    }
    check$data(valid2 = codegen_12.nil, $dataValid = codegen_12.nil) {
      if (!this.$data)
        return;
      const { gen, schemaCode, schemaType, def: def2 } = this;
      gen.if((0, codegen_12.or)((0, codegen_12._)`${schemaCode} === undefined`, $dataValid));
      if (valid2 !== codegen_12.nil)
        gen.assign(valid2, true);
      if (schemaType.length || def2.validateSchema) {
        gen.elseIf(this.invalid$data());
        this.$dataError();
        if (valid2 !== codegen_12.nil)
          gen.assign(valid2, false);
      }
      gen.else();
    }
    invalid$data() {
      const { gen, schemaCode, schemaType, def: def2, it } = this;
      return (0, codegen_12.or)(wrong$DataType(), invalid$DataSchema());
      function wrong$DataType() {
        if (schemaType.length) {
          if (!(schemaCode instanceof codegen_12.Name))
            throw new Error("ajv implementation error");
          const st = Array.isArray(schemaType) ? schemaType : [schemaType];
          return (0, codegen_12._)`${(0, dataType_22.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_22.DataType.Wrong)}`;
        }
        return codegen_12.nil;
      }
      function invalid$DataSchema() {
        if (def2.validateSchema) {
          const validateSchemaRef = gen.scopeValue("validate$data", { ref: def2.validateSchema });
          return (0, codegen_12._)`!${validateSchemaRef}(${schemaCode})`;
        }
        return codegen_12.nil;
      }
    }
    subschema(appl, valid2) {
      const subschema2 = (0, subschema_12.getSubschema)(this.it, appl);
      (0, subschema_12.extendSubschemaData)(subschema2, this.it, appl);
      (0, subschema_12.extendSubschemaMode)(subschema2, appl);
      const nextContext = { ...this.it, ...subschema2, items: void 0, props: void 0 };
      subschemaCode2(nextContext, valid2);
      return nextContext;
    }
    mergeEvaluated(schemaCxt, toName) {
      const { it, gen } = this;
      if (!it.opts.unevaluated)
        return;
      if (it.props !== true && schemaCxt.props !== void 0) {
        it.props = util_12.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
      }
      if (it.items !== true && schemaCxt.items !== void 0) {
        it.items = util_12.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
      }
    }
    mergeValidEvaluated(schemaCxt, valid2) {
      const { it, gen } = this;
      if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
        gen.if(valid2, () => this.mergeEvaluated(schemaCxt, codegen_12.Name));
        return true;
      }
    }
  }
  validate.KeywordCxt = KeywordCxt2;
  function keywordCode2(it, keyword2, def2, ruleType) {
    const cxt = new KeywordCxt2(it, def2, keyword2);
    if ("code" in def2) {
      def2.code(cxt, ruleType);
    } else if (cxt.$data && def2.validate) {
      (0, keyword_12.funcKeywordCode)(cxt, def2);
    } else if ("macro" in def2) {
      (0, keyword_12.macroKeywordCode)(cxt, def2);
    } else if (def2.compile || def2.validate) {
      (0, keyword_12.funcKeywordCode)(cxt, def2);
    }
  }
  const JSON_POINTER2 = /^\/(?:[^~]|~0|~1)*$/;
  const RELATIVE_JSON_POINTER2 = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function getData2($data, { dataLevel, dataNames, dataPathArr }) {
    let jsonPointer;
    let data;
    if ($data === "")
      return names_12.default.rootData;
    if ($data[0] === "/") {
      if (!JSON_POINTER2.test($data))
        throw new Error(`Invalid JSON-pointer: ${$data}`);
      jsonPointer = $data;
      data = names_12.default.rootData;
    } else {
      const matches = RELATIVE_JSON_POINTER2.exec($data);
      if (!matches)
        throw new Error(`Invalid JSON-pointer: ${$data}`);
      const up = +matches[1];
      jsonPointer = matches[2];
      if (jsonPointer === "#") {
        if (up >= dataLevel)
          throw new Error(errorMsg("property/index", up));
        return dataPathArr[dataLevel - up];
      }
      if (up > dataLevel)
        throw new Error(errorMsg("data", up));
      data = dataNames[dataLevel - up];
      if (!jsonPointer)
        return data;
    }
    let expr = data;
    const segments = jsonPointer.split("/");
    for (const segment of segments) {
      if (segment) {
        data = (0, codegen_12._)`${data}${(0, codegen_12.getProperty)((0, util_12.unescapeJsonPointer)(segment))}`;
        expr = (0, codegen_12._)`${expr} && ${data}`;
      }
    }
    return expr;
    function errorMsg(pointerType, up) {
      return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
    }
  }
  validate.getData = getData2;
  return validate;
}
var validation_error = {};
var hasRequiredValidation_error;
function requireValidation_error() {
  if (hasRequiredValidation_error) return validation_error;
  hasRequiredValidation_error = 1;
  Object.defineProperty(validation_error, "__esModule", { value: true });
  class ValidationError2 extends Error {
    constructor(errors2) {
      super("validation failed");
      this.errors = errors2;
      this.ajv = this.validation = true;
    }
  }
  validation_error.default = ValidationError2;
  return validation_error;
}
var ref_error = {};
Object.defineProperty(ref_error, "__esModule", { value: true });
const resolve_1$1 = resolve$1;
class MissingRefError2 extends Error {
  constructor(resolver, baseId, ref2, msg) {
    super(msg || `can't resolve reference ${ref2} from id ${baseId}`);
    this.missingRef = (0, resolve_1$1.resolveUrl)(resolver, baseId, ref2);
    this.missingSchema = (0, resolve_1$1.normalizeId)((0, resolve_1$1.getFullPath)(resolver, this.missingRef));
  }
}
ref_error.default = MissingRefError2;
var compile = {};
Object.defineProperty(compile, "__esModule", { value: true });
compile.resolveSchema = compile.getCompilingSchema = compile.resolveRef = compile.compileSchema = compile.SchemaEnv = void 0;
const codegen_1$m = codegen;
const validation_error_1 = requireValidation_error();
const names_1$2 = requireNames();
const resolve_1 = resolve$1;
const util_1$k = util;
const validate_1$1 = requireValidate();
class SchemaEnv2 {
  constructor(env2) {
    var _a;
    this.refs = {};
    this.dynamicAnchors = {};
    let schema;
    if (typeof env2.schema == "object")
      schema = env2.schema;
    this.schema = env2.schema;
    this.schemaId = env2.schemaId;
    this.root = env2.root || this;
    this.baseId = (_a = env2.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env2.schemaId || "$id"]);
    this.schemaPath = env2.schemaPath;
    this.localRefs = env2.localRefs;
    this.meta = env2.meta;
    this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
    this.refs = {};
  }
}
compile.SchemaEnv = SchemaEnv2;
function compileSchema(sch) {
  const _sch = getCompilingSchema.call(this, sch);
  if (_sch)
    return _sch;
  const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
  const { es5, lines } = this.opts.code;
  const { ownProperties } = this.opts;
  const gen = new codegen_1$m.CodeGen(this.scope, { es5, lines, ownProperties });
  let _ValidationError;
  if (sch.$async) {
    _ValidationError = gen.scopeValue("Error", {
      ref: validation_error_1.default,
      code: (0, codegen_1$m._)`require("ajv/dist/runtime/validation_error").default`
    });
  }
  const validateName = gen.scopeName("validate");
  sch.validateName = validateName;
  const schemaCxt = {
    gen,
    allErrors: this.opts.allErrors,
    data: names_1$2.default.data,
    parentData: names_1$2.default.parentData,
    parentDataProperty: names_1$2.default.parentDataProperty,
    dataNames: [names_1$2.default.data],
    dataPathArr: [codegen_1$m.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1$m.stringify)(sch.schema) } : { ref: sch.schema }),
    validateName,
    ValidationError: _ValidationError,
    schema: sch.schema,
    schemaEnv: sch,
    rootId,
    baseId: sch.baseId || rootId,
    schemaPath: codegen_1$m.nil,
    errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, codegen_1$m._)`""`,
    opts: this.opts,
    self: this
  };
  let sourceCode;
  try {
    this._compilations.add(sch);
    (0, validate_1$1.validateFunctionCode)(schemaCxt);
    gen.optimize(this.opts.code.optimize);
    const validateCode = gen.toString();
    sourceCode = `${gen.scopeRefs(names_1$2.default.scope)}return ${validateCode}`;
    if (this.opts.code.process)
      sourceCode = this.opts.code.process(sourceCode, sch);
    const makeValidate = new Function(`${names_1$2.default.self}`, `${names_1$2.default.scope}`, sourceCode);
    const validate2 = makeValidate(this, this.scope.get());
    this.scope.value(validateName, { ref: validate2 });
    validate2.errors = null;
    validate2.schema = sch.schema;
    validate2.schemaEnv = sch;
    if (sch.$async)
      validate2.$async = true;
    if (this.opts.code.source === true) {
      validate2.source = { validateName, validateCode, scopeValues: gen._values };
    }
    if (this.opts.unevaluated) {
      const { props, items: items2 } = schemaCxt;
      validate2.evaluated = {
        props: props instanceof codegen_1$m.Name ? void 0 : props,
        items: items2 instanceof codegen_1$m.Name ? void 0 : items2,
        dynamicProps: props instanceof codegen_1$m.Name,
        dynamicItems: items2 instanceof codegen_1$m.Name
      };
      if (validate2.source)
        validate2.source.evaluated = (0, codegen_1$m.stringify)(validate2.evaluated);
    }
    sch.validate = validate2;
    return sch;
  } catch (e) {
    delete sch.validate;
    delete sch.validateName;
    if (sourceCode)
      this.logger.error("Error compiling schema, function code:", sourceCode);
    throw e;
  } finally {
    this._compilations.delete(sch);
  }
}
compile.compileSchema = compileSchema;
function resolveRef(root, baseId, ref2) {
  var _a;
  ref2 = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref2);
  const schOrFunc = root.refs[ref2];
  if (schOrFunc)
    return schOrFunc;
  let _sch = resolve.call(this, root, ref2);
  if (_sch === void 0) {
    const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref2];
    const { schemaId } = this.opts;
    if (schema)
      _sch = new SchemaEnv2({ schema, schemaId, root, baseId });
  }
  if (_sch === void 0)
    return;
  return root.refs[ref2] = inlineOrCompile.call(this, _sch);
}
compile.resolveRef = resolveRef;
function inlineOrCompile(sch) {
  if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
    return sch.schema;
  return sch.validate ? sch : compileSchema.call(this, sch);
}
function getCompilingSchema(schEnv) {
  for (const sch of this._compilations) {
    if (sameSchemaEnv(sch, schEnv))
      return sch;
  }
}
compile.getCompilingSchema = getCompilingSchema;
function sameSchemaEnv(s1, s2) {
  return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
}
function resolve(root, ref2) {
  let sch;
  while (typeof (sch = this.refs[ref2]) == "string")
    ref2 = sch;
  return sch || this.schemas[ref2] || resolveSchema.call(this, root, ref2);
}
function resolveSchema(root, ref2) {
  const p = this.opts.uriResolver.parse(ref2);
  const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
  let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
  if (Object.keys(root.schema).length > 0 && refPath === baseId) {
    return getJsonPointer.call(this, p, root);
  }
  const id2 = (0, resolve_1.normalizeId)(refPath);
  const schOrRef = this.refs[id2] || this.schemas[id2];
  if (typeof schOrRef == "string") {
    const sch = resolveSchema.call(this, root, schOrRef);
    if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
      return;
    return getJsonPointer.call(this, p, sch);
  }
  if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
    return;
  if (!schOrRef.validate)
    compileSchema.call(this, schOrRef);
  if (id2 === (0, resolve_1.normalizeId)(ref2)) {
    const { schema } = schOrRef;
    const { schemaId } = this.opts;
    const schId = schema[schemaId];
    if (schId)
      baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
    return new SchemaEnv2({ schema, schemaId, root, baseId });
  }
  return getJsonPointer.call(this, p, schOrRef);
}
compile.resolveSchema = resolveSchema;
const PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function getJsonPointer(parsedRef, { baseId, schema, root }) {
  var _a;
  if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
    return;
  for (const part of parsedRef.fragment.slice(1).split("/")) {
    if (typeof schema === "boolean")
      return;
    const partSchema = schema[(0, util_1$k.unescapeFragment)(part)];
    if (partSchema === void 0)
      return;
    schema = partSchema;
    const schId = typeof schema === "object" && schema[this.opts.schemaId];
    if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
      baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
    }
  }
  let env2;
  if (typeof schema != "boolean" && schema.$ref && !(0, util_1$k.schemaHasRulesButRef)(schema, this.RULES)) {
    const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
    env2 = resolveSchema.call(this, root, $ref);
  }
  const { schemaId } = this.opts;
  env2 = env2 || new SchemaEnv2({ schema, schemaId, root, baseId });
  if (env2.schema !== env2.root.schema)
    return env2;
  return void 0;
}
const $id$1 = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
const description = "Meta-schema for $data reference (JSON AnySchema extension proposal)";
const type$1 = "object";
const required$1 = [
  "$data"
];
const properties$2 = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
};
const additionalProperties$1 = false;
const require$$9 = {
  $id: $id$1,
  description,
  type: type$1,
  required: required$1,
  properties: properties$2,
  additionalProperties: additionalProperties$1
};
var uri$1 = {};
Object.defineProperty(uri$1, "__esModule", { value: true });
const uri = fastUriExports;
uri.code = 'require("ajv/dist/runtime/uri").default';
uri$1.default = uri;
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.CodeGen = exports$1.Name = exports$1.nil = exports$1.stringify = exports$1.str = exports$1._ = exports$1.KeywordCxt = void 0;
  var validate_12 = requireValidate();
  Object.defineProperty(exports$1, "KeywordCxt", { enumerable: true, get: function() {
    return validate_12.KeywordCxt;
  } });
  var codegen_12 = codegen;
  Object.defineProperty(exports$1, "_", { enumerable: true, get: function() {
    return codegen_12._;
  } });
  Object.defineProperty(exports$1, "str", { enumerable: true, get: function() {
    return codegen_12.str;
  } });
  Object.defineProperty(exports$1, "stringify", { enumerable: true, get: function() {
    return codegen_12.stringify;
  } });
  Object.defineProperty(exports$1, "nil", { enumerable: true, get: function() {
    return codegen_12.nil;
  } });
  Object.defineProperty(exports$1, "Name", { enumerable: true, get: function() {
    return codegen_12.Name;
  } });
  Object.defineProperty(exports$1, "CodeGen", { enumerable: true, get: function() {
    return codegen_12.CodeGen;
  } });
  const validation_error_12 = requireValidation_error();
  const ref_error_12 = ref_error;
  const rules_12 = rules;
  const compile_12 = compile;
  const codegen_2 = codegen;
  const resolve_12 = resolve$1;
  const dataType_12 = dataType;
  const util_12 = util;
  const $dataRefSchema = require$$9;
  const uri_1 = uri$1;
  const defaultRegExp = (str, flags) => new RegExp(str, flags);
  defaultRegExp.code = "new RegExp";
  const META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
  const EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]);
  const removedOptions = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now."
  };
  const deprecatedOptions = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  };
  const MAX_EXPRESSION = 200;
  function requiredOptions(o) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    const s = o.strict;
    const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
    const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
    const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
    const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
    return {
      strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
      strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
      strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
      strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
      strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
      code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
      loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
      loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
      meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
      messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
      inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
      schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
      addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
      validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
      validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
      unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
      int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
      uriResolver
    };
  }
  class Ajv {
    constructor(opts = {}) {
      this.schemas = {};
      this.refs = {};
      this.formats = {};
      this._compilations = /* @__PURE__ */ new Set();
      this._loading = {};
      this._cache = /* @__PURE__ */ new Map();
      opts = this.opts = { ...opts, ...requiredOptions(opts) };
      const { es5, lines } = this.opts.code;
      this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
      this.logger = getLogger(opts.logger);
      const formatOpt = opts.validateFormats;
      opts.validateFormats = false;
      this.RULES = (0, rules_12.getRules)();
      checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
      checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
      this._metaOpts = getMetaSchemaOptions.call(this);
      if (opts.formats)
        addInitialFormats.call(this);
      this._addVocabularies();
      this._addDefaultMetaSchema();
      if (opts.keywords)
        addInitialKeywords.call(this, opts.keywords);
      if (typeof opts.meta == "object")
        this.addMetaSchema(opts.meta);
      addInitialSchemas.call(this);
      opts.validateFormats = formatOpt;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data, meta, schemaId } = this.opts;
      let _dataRefSchema = $dataRefSchema;
      if (schemaId === "id") {
        _dataRefSchema = { ...$dataRefSchema };
        _dataRefSchema.id = _dataRefSchema.$id;
        delete _dataRefSchema.$id;
      }
      if (meta && $data)
        this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
    }
    defaultMeta() {
      const { meta, schemaId } = this.opts;
      return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
    }
    validate(schemaKeyRef, data) {
      let v;
      if (typeof schemaKeyRef == "string") {
        v = this.getSchema(schemaKeyRef);
        if (!v)
          throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
      } else {
        v = this.compile(schemaKeyRef);
      }
      const valid2 = v(data);
      if (!("$async" in v))
        this.errors = v.errors;
      return valid2;
    }
    compile(schema, _meta) {
      const sch = this._addSchema(schema, _meta);
      return sch.validate || this._compileSchemaEnv(sch);
    }
    compileAsync(schema, meta) {
      if (typeof this.opts.loadSchema != "function") {
        throw new Error("options.loadSchema should be a function");
      }
      const { loadSchema } = this.opts;
      return runCompileAsync.call(this, schema, meta);
      async function runCompileAsync(_schema, _meta) {
        await loadMetaSchema.call(this, _schema.$schema);
        const sch = this._addSchema(_schema, _meta);
        return sch.validate || _compileAsync.call(this, sch);
      }
      async function loadMetaSchema($ref) {
        if ($ref && !this.getSchema($ref)) {
          await runCompileAsync.call(this, { $ref }, true);
        }
      }
      async function _compileAsync(sch) {
        try {
          return this._compileSchemaEnv(sch);
        } catch (e) {
          if (!(e instanceof ref_error_12.default))
            throw e;
          checkLoaded.call(this, e);
          await loadMissingSchema.call(this, e.missingSchema);
          return _compileAsync.call(this, sch);
        }
      }
      function checkLoaded({ missingSchema: ref2, missingRef }) {
        if (this.refs[ref2]) {
          throw new Error(`AnySchema ${ref2} is loaded but ${missingRef} cannot be resolved`);
        }
      }
      async function loadMissingSchema(ref2) {
        const _schema = await _loadSchema.call(this, ref2);
        if (!this.refs[ref2])
          await loadMetaSchema.call(this, _schema.$schema);
        if (!this.refs[ref2])
          this.addSchema(_schema, ref2, meta);
      }
      async function _loadSchema(ref2) {
        const p = this._loading[ref2];
        if (p)
          return p;
        try {
          return await (this._loading[ref2] = loadSchema(ref2));
        } finally {
          delete this._loading[ref2];
        }
      }
    }
    // Adds schema to the instance
    addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
      if (Array.isArray(schema)) {
        for (const sch of schema)
          this.addSchema(sch, void 0, _meta, _validateSchema);
        return this;
      }
      let id2;
      if (typeof schema === "object") {
        const { schemaId } = this.opts;
        id2 = schema[schemaId];
        if (id2 !== void 0 && typeof id2 != "string") {
          throw new Error(`schema ${schemaId} must be string`);
        }
      }
      key = (0, resolve_12.normalizeId)(key || id2);
      this._checkUnique(key);
      this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
      return this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
      this.addSchema(schema, key, true, _validateSchema);
      return this;
    }
    //  Validate schema against its meta-schema
    validateSchema(schema, throwOrLogError) {
      if (typeof schema == "boolean")
        return true;
      let $schema2;
      $schema2 = schema.$schema;
      if ($schema2 !== void 0 && typeof $schema2 != "string") {
        throw new Error("$schema must be a string");
      }
      $schema2 = $schema2 || this.opts.defaultMeta || this.defaultMeta();
      if (!$schema2) {
        this.logger.warn("meta-schema not available");
        this.errors = null;
        return true;
      }
      const valid2 = this.validate($schema2, schema);
      if (!valid2 && throwOrLogError) {
        const message = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log")
          this.logger.error(message);
        else
          throw new Error(message);
      }
      return valid2;
    }
    // Get compiled schema by `key` or `ref`.
    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
    getSchema(keyRef) {
      let sch;
      while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
        keyRef = sch;
      if (sch === void 0) {
        const { schemaId } = this.opts;
        const root = new compile_12.SchemaEnv({ schema: {}, schemaId });
        sch = compile_12.resolveSchema.call(this, root, keyRef);
        if (!sch)
          return;
        this.refs[keyRef] = sch;
      }
      return sch.validate || this._compileSchemaEnv(sch);
    }
    // Remove cached schema(s).
    // If no parameter is passed all schemas but meta-schemas are removed.
    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
    removeSchema(schemaKeyRef) {
      if (schemaKeyRef instanceof RegExp) {
        this._removeAllSchemas(this.schemas, schemaKeyRef);
        this._removeAllSchemas(this.refs, schemaKeyRef);
        return this;
      }
      switch (typeof schemaKeyRef) {
        case "undefined":
          this._removeAllSchemas(this.schemas);
          this._removeAllSchemas(this.refs);
          this._cache.clear();
          return this;
        case "string": {
          const sch = getSchEnv.call(this, schemaKeyRef);
          if (typeof sch == "object")
            this._cache.delete(sch.schema);
          delete this.schemas[schemaKeyRef];
          delete this.refs[schemaKeyRef];
          return this;
        }
        case "object": {
          const cacheKey = schemaKeyRef;
          this._cache.delete(cacheKey);
          let id2 = schemaKeyRef[this.opts.schemaId];
          if (id2) {
            id2 = (0, resolve_12.normalizeId)(id2);
            delete this.schemas[id2];
            delete this.refs[id2];
          }
          return this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(definitions2) {
      for (const def2 of definitions2)
        this.addKeyword(def2);
      return this;
    }
    addKeyword(kwdOrDef, def2) {
      let keyword2;
      if (typeof kwdOrDef == "string") {
        keyword2 = kwdOrDef;
        if (typeof def2 == "object") {
          this.logger.warn("these parameters are deprecated, see docs for addKeyword");
          def2.keyword = keyword2;
        }
      } else if (typeof kwdOrDef == "object" && def2 === void 0) {
        def2 = kwdOrDef;
        keyword2 = def2.keyword;
        if (Array.isArray(keyword2) && !keyword2.length) {
          throw new Error("addKeywords: keyword must be string or non-empty array");
        }
      } else {
        throw new Error("invalid addKeywords parameters");
      }
      checkKeyword.call(this, keyword2, def2);
      if (!def2) {
        (0, util_12.eachItem)(keyword2, (kwd) => addRule.call(this, kwd));
        return this;
      }
      keywordMetaschema.call(this, def2);
      const definition = {
        ...def2,
        type: (0, dataType_12.getJSONTypes)(def2.type),
        schemaType: (0, dataType_12.getJSONTypes)(def2.schemaType)
      };
      (0, util_12.eachItem)(keyword2, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t2) => addRule.call(this, k, definition, t2)));
      return this;
    }
    getKeyword(keyword2) {
      const rule = this.RULES.all[keyword2];
      return typeof rule == "object" ? rule.definition : !!rule;
    }
    // Remove keyword
    removeKeyword(keyword2) {
      const { RULES } = this;
      delete RULES.keywords[keyword2];
      delete RULES.all[keyword2];
      for (const group of RULES.rules) {
        const i = group.rules.findIndex((rule) => rule.keyword === keyword2);
        if (i >= 0)
          group.rules.splice(i, 1);
      }
      return this;
    }
    // Add format
    addFormat(name, format2) {
      if (typeof format2 == "string")
        format2 = new RegExp(format2);
      this.formats[name] = format2;
      return this;
    }
    errorsText(errors2 = this.errors, { separator = ", ", dataVar = "data" } = {}) {
      if (!errors2 || errors2.length === 0)
        return "No errors";
      return errors2.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
    }
    $dataMetaSchema(metaSchema2, keywordsJsonPointers) {
      const rules2 = this.RULES.all;
      metaSchema2 = JSON.parse(JSON.stringify(metaSchema2));
      for (const jsonPointer of keywordsJsonPointers) {
        const segments = jsonPointer.split("/").slice(1);
        let keywords = metaSchema2;
        for (const seg of segments)
          keywords = keywords[seg];
        for (const key in rules2) {
          const rule = rules2[key];
          if (typeof rule != "object")
            continue;
          const { $data } = rule.definition;
          const schema = keywords[key];
          if ($data && schema)
            keywords[key] = schemaOrData(schema);
        }
      }
      return metaSchema2;
    }
    _removeAllSchemas(schemas, regex) {
      for (const keyRef in schemas) {
        const sch = schemas[keyRef];
        if (!regex || regex.test(keyRef)) {
          if (typeof sch == "string") {
            delete schemas[keyRef];
          } else if (sch && !sch.meta) {
            this._cache.delete(sch.schema);
            delete schemas[keyRef];
          }
        }
      }
    }
    _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
      let id2;
      const { schemaId } = this.opts;
      if (typeof schema == "object") {
        id2 = schema[schemaId];
      } else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        else if (typeof schema != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let sch = this._cache.get(schema);
      if (sch !== void 0)
        return sch;
      baseId = (0, resolve_12.normalizeId)(id2 || baseId);
      const localRefs = resolve_12.getSchemaRefs.call(this, schema, baseId);
      sch = new compile_12.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
      this._cache.set(sch.schema, sch);
      if (addSchema && !baseId.startsWith("#")) {
        if (baseId)
          this._checkUnique(baseId);
        this.refs[baseId] = sch;
      }
      if (validateSchema)
        this.validateSchema(schema, true);
      return sch;
    }
    _checkUnique(id2) {
      if (this.schemas[id2] || this.refs[id2]) {
        throw new Error(`schema with key or id "${id2}" already exists`);
      }
    }
    _compileSchemaEnv(sch) {
      if (sch.meta)
        this._compileMetaSchema(sch);
      else
        compile_12.compileSchema.call(this, sch);
      if (!sch.validate)
        throw new Error("ajv implementation error");
      return sch.validate;
    }
    _compileMetaSchema(sch) {
      const currentOpts = this.opts;
      this.opts = this._metaOpts;
      try {
        compile_12.compileSchema.call(this, sch);
      } finally {
        this.opts = currentOpts;
      }
    }
  }
  Ajv.ValidationError = validation_error_12.default;
  Ajv.MissingRefError = ref_error_12.default;
  exports$1.default = Ajv;
  function checkOptions(checkOpts, options, msg, log = "error") {
    for (const key in checkOpts) {
      const opt = key;
      if (opt in options)
        this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
    }
  }
  function getSchEnv(keyRef) {
    keyRef = (0, resolve_12.normalizeId)(keyRef);
    return this.schemas[keyRef] || this.refs[keyRef];
  }
  function addInitialSchemas() {
    const optsSchemas = this.opts.schemas;
    if (!optsSchemas)
      return;
    if (Array.isArray(optsSchemas))
      this.addSchema(optsSchemas);
    else
      for (const key in optsSchemas)
        this.addSchema(optsSchemas[key], key);
  }
  function addInitialFormats() {
    for (const name in this.opts.formats) {
      const format2 = this.opts.formats[name];
      if (format2)
        this.addFormat(name, format2);
    }
  }
  function addInitialKeywords(defs) {
    if (Array.isArray(defs)) {
      this.addVocabulary(defs);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const keyword2 in defs) {
      const def2 = defs[keyword2];
      if (!def2.keyword)
        def2.keyword = keyword2;
      this.addKeyword(def2);
    }
  }
  function getMetaSchemaOptions() {
    const metaOpts = { ...this.opts };
    for (const opt of META_IGNORE_OPTIONS)
      delete metaOpts[opt];
    return metaOpts;
  }
  const noLogs = { log() {
  }, warn() {
  }, error() {
  } };
  function getLogger(logger) {
    if (logger === false)
      return noLogs;
    if (logger === void 0)
      return console;
    if (logger.log && logger.warn && logger.error)
      return logger;
    throw new Error("logger must implement log, warn and error methods");
  }
  const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
  function checkKeyword(keyword2, def2) {
    const { RULES } = this;
    (0, util_12.eachItem)(keyword2, (kwd) => {
      if (RULES.keywords[kwd])
        throw new Error(`Keyword ${kwd} is already defined`);
      if (!KEYWORD_NAME.test(kwd))
        throw new Error(`Keyword ${kwd} has invalid name`);
    });
    if (!def2)
      return;
    if (def2.$data && !("code" in def2 || "validate" in def2)) {
      throw new Error('$data keyword must have "code" or "validate" function');
    }
  }
  function addRule(keyword2, definition, dataType2) {
    var _a;
    const post = definition === null || definition === void 0 ? void 0 : definition.post;
    if (dataType2 && post)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES } = this;
    let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t2 }) => t2 === dataType2);
    if (!ruleGroup) {
      ruleGroup = { type: dataType2, rules: [] };
      RULES.rules.push(ruleGroup);
    }
    RULES.keywords[keyword2] = true;
    if (!definition)
      return;
    const rule = {
      keyword: keyword2,
      definition: {
        ...definition,
        type: (0, dataType_12.getJSONTypes)(definition.type),
        schemaType: (0, dataType_12.getJSONTypes)(definition.schemaType)
      }
    };
    if (definition.before)
      addBeforeRule.call(this, ruleGroup, rule, definition.before);
    else
      ruleGroup.rules.push(rule);
    RULES.all[keyword2] = rule;
    (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
  }
  function addBeforeRule(ruleGroup, rule, before) {
    const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
    if (i >= 0) {
      ruleGroup.rules.splice(i, 0, rule);
    } else {
      ruleGroup.rules.push(rule);
      this.logger.warn(`rule ${before} is not defined`);
    }
  }
  function keywordMetaschema(def2) {
    let { metaSchema: metaSchema2 } = def2;
    if (metaSchema2 === void 0)
      return;
    if (def2.$data && this.opts.$data)
      metaSchema2 = schemaOrData(metaSchema2);
    def2.validateSchema = this.compile(metaSchema2, true);
  }
  const $dataRef = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function schemaOrData(schema) {
    return { anyOf: [schema, $dataRef] };
  }
})(core$2);
var draft7 = {};
var core$1 = {};
var id = {};
Object.defineProperty(id, "__esModule", { value: true });
const def$s = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
id.default = def$s;
var ref = {};
Object.defineProperty(ref, "__esModule", { value: true });
ref.callRef = ref.getValidate = void 0;
const ref_error_1$1 = ref_error;
const code_1$8 = requireCode();
const codegen_1$l = codegen;
const names_1$1 = requireNames();
const compile_1$1 = compile;
const util_1$j = util;
const def$r = {
  keyword: "$ref",
  schemaType: "string",
  code(cxt) {
    const { gen, schema: $ref, it } = cxt;
    const { baseId, schemaEnv: env2, validateName, opts, self } = it;
    const { root } = env2;
    if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
      return callRootRef();
    const schOrEnv = compile_1$1.resolveRef.call(self, root, baseId, $ref);
    if (schOrEnv === void 0)
      throw new ref_error_1$1.default(it.opts.uriResolver, baseId, $ref);
    if (schOrEnv instanceof compile_1$1.SchemaEnv)
      return callValidate(schOrEnv);
    return inlineRefSchema(schOrEnv);
    function callRootRef() {
      if (env2 === root)
        return callRef(cxt, validateName, env2, env2.$async);
      const rootName = gen.scopeValue("root", { ref: root });
      return callRef(cxt, (0, codegen_1$l._)`${rootName}.validate`, root, root.$async);
    }
    function callValidate(sch) {
      const v = getValidate(cxt, sch);
      callRef(cxt, v, sch, sch.$async);
    }
    function inlineRefSchema(sch) {
      const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1$l.stringify)(sch) } : { ref: sch });
      const valid2 = gen.name("valid");
      const schCxt = cxt.subschema({
        schema: sch,
        dataTypes: [],
        schemaPath: codegen_1$l.nil,
        topSchemaRef: schName,
        errSchemaPath: $ref
      }, valid2);
      cxt.mergeEvaluated(schCxt);
      cxt.ok(valid2);
    }
  }
};
function getValidate(cxt, sch) {
  const { gen } = cxt;
  return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1$l._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
}
ref.getValidate = getValidate;
function callRef(cxt, v, sch, $async) {
  const { gen, it } = cxt;
  const { allErrors, schemaEnv: env2, opts } = it;
  const passCxt = opts.passContext ? names_1$1.default.this : codegen_1$l.nil;
  if ($async)
    callAsyncRef();
  else
    callSyncRef();
  function callAsyncRef() {
    if (!env2.$async)
      throw new Error("async schema referenced by sync schema");
    const valid2 = gen.let("valid");
    gen.try(() => {
      gen.code((0, codegen_1$l._)`await ${(0, code_1$8.callValidateCode)(cxt, v, passCxt)}`);
      addEvaluatedFrom(v);
      if (!allErrors)
        gen.assign(valid2, true);
    }, (e) => {
      gen.if((0, codegen_1$l._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
      addErrorsFrom(e);
      if (!allErrors)
        gen.assign(valid2, false);
    });
    cxt.ok(valid2);
  }
  function callSyncRef() {
    cxt.result((0, code_1$8.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
  }
  function addErrorsFrom(source) {
    const errs = (0, codegen_1$l._)`${source}.errors`;
    gen.assign(names_1$1.default.vErrors, (0, codegen_1$l._)`${names_1$1.default.vErrors} === null ? ${errs} : ${names_1$1.default.vErrors}.concat(${errs})`);
    gen.assign(names_1$1.default.errors, (0, codegen_1$l._)`${names_1$1.default.vErrors}.length`);
  }
  function addEvaluatedFrom(source) {
    var _a;
    if (!it.opts.unevaluated)
      return;
    const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
    if (it.props !== true) {
      if (schEvaluated && !schEvaluated.dynamicProps) {
        if (schEvaluated.props !== void 0) {
          it.props = util_1$j.mergeEvaluated.props(gen, schEvaluated.props, it.props);
        }
      } else {
        const props = gen.var("props", (0, codegen_1$l._)`${source}.evaluated.props`);
        it.props = util_1$j.mergeEvaluated.props(gen, props, it.props, codegen_1$l.Name);
      }
    }
    if (it.items !== true) {
      if (schEvaluated && !schEvaluated.dynamicItems) {
        if (schEvaluated.items !== void 0) {
          it.items = util_1$j.mergeEvaluated.items(gen, schEvaluated.items, it.items);
        }
      } else {
        const items2 = gen.var("items", (0, codegen_1$l._)`${source}.evaluated.items`);
        it.items = util_1$j.mergeEvaluated.items(gen, items2, it.items, codegen_1$l.Name);
      }
    }
  }
}
ref.callRef = callRef;
ref.default = def$r;
Object.defineProperty(core$1, "__esModule", { value: true });
const id_1 = id;
const ref_1 = ref;
const core = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  id_1.default,
  ref_1.default
];
core$1.default = core;
var validation$1 = {};
var limitNumber = {};
Object.defineProperty(limitNumber, "__esModule", { value: true });
const codegen_1$k = codegen;
const ops = codegen_1$k.operators;
const KWDs = {
  maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
  minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
  exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
  exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
};
const error$i = {
  message: ({ keyword: keyword2, schemaCode }) => (0, codegen_1$k.str)`must be ${KWDs[keyword2].okStr} ${schemaCode}`,
  params: ({ keyword: keyword2, schemaCode }) => (0, codegen_1$k._)`{comparison: ${KWDs[keyword2].okStr}, limit: ${schemaCode}}`
};
const def$q = {
  keyword: Object.keys(KWDs),
  type: "number",
  schemaType: "number",
  $data: true,
  error: error$i,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    cxt.fail$data((0, codegen_1$k._)`${data} ${KWDs[keyword2].fail} ${schemaCode} || isNaN(${data})`);
  }
};
limitNumber.default = def$q;
var multipleOf = {};
Object.defineProperty(multipleOf, "__esModule", { value: true });
const codegen_1$j = codegen;
const error$h = {
  message: ({ schemaCode }) => (0, codegen_1$j.str)`must be multiple of ${schemaCode}`,
  params: ({ schemaCode }) => (0, codegen_1$j._)`{multipleOf: ${schemaCode}}`
};
const def$p = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: true,
  error: error$h,
  code(cxt) {
    const { gen, data, schemaCode, it } = cxt;
    const prec = it.opts.multipleOfPrecision;
    const res = gen.let("res");
    const invalid = prec ? (0, codegen_1$j._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1$j._)`${res} !== parseInt(${res})`;
    cxt.fail$data((0, codegen_1$j._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
  }
};
multipleOf.default = def$p;
var limitLength = {};
var ucs2length$1 = {};
Object.defineProperty(ucs2length$1, "__esModule", { value: true });
function ucs2length(str) {
  const len = str.length;
  let length = 0;
  let pos = 0;
  let value;
  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);
    if (value >= 55296 && value <= 56319 && pos < len) {
      value = str.charCodeAt(pos);
      if ((value & 64512) === 56320)
        pos++;
    }
  }
  return length;
}
ucs2length$1.default = ucs2length;
ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(limitLength, "__esModule", { value: true });
const codegen_1$i = codegen;
const util_1$i = util;
const ucs2length_1 = ucs2length$1;
const error$g = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxLength" ? "more" : "fewer";
    return (0, codegen_1$i.str)`must NOT have ${comp} than ${schemaCode} characters`;
  },
  params: ({ schemaCode }) => (0, codegen_1$i._)`{limit: ${schemaCode}}`
};
const def$o = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: true,
  error: error$g,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode, it } = cxt;
    const op = keyword2 === "maxLength" ? codegen_1$i.operators.GT : codegen_1$i.operators.LT;
    const len = it.opts.unicode === false ? (0, codegen_1$i._)`${data}.length` : (0, codegen_1$i._)`${(0, util_1$i.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
    cxt.fail$data((0, codegen_1$i._)`${len} ${op} ${schemaCode}`);
  }
};
limitLength.default = def$o;
var pattern = {};
Object.defineProperty(pattern, "__esModule", { value: true });
const code_1$7 = requireCode();
const codegen_1$h = codegen;
const error$f = {
  message: ({ schemaCode }) => (0, codegen_1$h.str)`must match pattern "${schemaCode}"`,
  params: ({ schemaCode }) => (0, codegen_1$h._)`{pattern: ${schemaCode}}`
};
const def$n = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: true,
  error: error$f,
  code(cxt) {
    const { data, $data, schema, schemaCode, it } = cxt;
    const u = it.opts.unicodeRegExp ? "u" : "";
    const regExp = $data ? (0, codegen_1$h._)`(new RegExp(${schemaCode}, ${u}))` : (0, code_1$7.usePattern)(cxt, schema);
    cxt.fail$data((0, codegen_1$h._)`!${regExp}.test(${data})`);
  }
};
pattern.default = def$n;
var limitProperties = {};
Object.defineProperty(limitProperties, "__esModule", { value: true });
const codegen_1$g = codegen;
const error$e = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxProperties" ? "more" : "fewer";
    return (0, codegen_1$g.str)`must NOT have ${comp} than ${schemaCode} properties`;
  },
  params: ({ schemaCode }) => (0, codegen_1$g._)`{limit: ${schemaCode}}`
};
const def$m = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: true,
  error: error$e,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    const op = keyword2 === "maxProperties" ? codegen_1$g.operators.GT : codegen_1$g.operators.LT;
    cxt.fail$data((0, codegen_1$g._)`Object.keys(${data}).length ${op} ${schemaCode}`);
  }
};
limitProperties.default = def$m;
var required = {};
Object.defineProperty(required, "__esModule", { value: true });
const code_1$6 = requireCode();
const codegen_1$f = codegen;
const util_1$h = util;
const error$d = {
  message: ({ params: { missingProperty } }) => (0, codegen_1$f.str)`must have required property '${missingProperty}'`,
  params: ({ params: { missingProperty } }) => (0, codegen_1$f._)`{missingProperty: ${missingProperty}}`
};
const def$l = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: true,
  error: error$d,
  code(cxt) {
    const { gen, schema, schemaCode, data, $data, it } = cxt;
    const { opts } = it;
    if (!$data && schema.length === 0)
      return;
    const useLoop = schema.length >= opts.loopRequired;
    if (it.allErrors)
      allErrorsMode();
    else
      exitOnErrorMode();
    if (opts.strictRequired) {
      const props = cxt.parentSchema.properties;
      const { definedProperties } = cxt.it;
      for (const requiredKey of schema) {
        if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
          const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
          const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
          (0, util_1$h.checkStrictMode)(it, msg, it.opts.strictRequired);
        }
      }
    }
    function allErrorsMode() {
      if (useLoop || $data) {
        cxt.block$data(codegen_1$f.nil, loopAllRequired);
      } else {
        for (const prop of schema) {
          (0, code_1$6.checkReportMissingProp)(cxt, prop);
        }
      }
    }
    function exitOnErrorMode() {
      const missing = gen.let("missing");
      if (useLoop || $data) {
        const valid2 = gen.let("valid", true);
        cxt.block$data(valid2, () => loopUntilMissing(missing, valid2));
        cxt.ok(valid2);
      } else {
        gen.if((0, code_1$6.checkMissingProp)(cxt, schema, missing));
        (0, code_1$6.reportMissingProp)(cxt, missing);
        gen.else();
      }
    }
    function loopAllRequired() {
      gen.forOf("prop", schemaCode, (prop) => {
        cxt.setParams({ missingProperty: prop });
        gen.if((0, code_1$6.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
      });
    }
    function loopUntilMissing(missing, valid2) {
      cxt.setParams({ missingProperty: missing });
      gen.forOf(missing, schemaCode, () => {
        gen.assign(valid2, (0, code_1$6.propertyInData)(gen, data, missing, opts.ownProperties));
        gen.if((0, codegen_1$f.not)(valid2), () => {
          cxt.error();
          gen.break();
        });
      }, codegen_1$f.nil);
    }
  }
};
required.default = def$l;
var limitItems = {};
Object.defineProperty(limitItems, "__esModule", { value: true });
const codegen_1$e = codegen;
const error$c = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxItems" ? "more" : "fewer";
    return (0, codegen_1$e.str)`must NOT have ${comp} than ${schemaCode} items`;
  },
  params: ({ schemaCode }) => (0, codegen_1$e._)`{limit: ${schemaCode}}`
};
const def$k = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: true,
  error: error$c,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    const op = keyword2 === "maxItems" ? codegen_1$e.operators.GT : codegen_1$e.operators.LT;
    cxt.fail$data((0, codegen_1$e._)`${data}.length ${op} ${schemaCode}`);
  }
};
limitItems.default = def$k;
var uniqueItems = {};
var equal$1 = {};
Object.defineProperty(equal$1, "__esModule", { value: true });
const equal2 = fastDeepEqual;
equal2.code = 'require("ajv/dist/runtime/equal").default';
equal$1.default = equal2;
Object.defineProperty(uniqueItems, "__esModule", { value: true });
const dataType_1 = dataType;
const codegen_1$d = codegen;
const util_1$g = util;
const equal_1$2 = equal$1;
const error$b = {
  message: ({ params: { i, j } }) => (0, codegen_1$d.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
  params: ({ params: { i, j } }) => (0, codegen_1$d._)`{i: ${i}, j: ${j}}`
};
const def$j = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: true,
  error: error$b,
  code(cxt) {
    const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
    if (!$data && !schema)
      return;
    const valid2 = gen.let("valid");
    const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
    cxt.block$data(valid2, validateUniqueItems, (0, codegen_1$d._)`${schemaCode} === false`);
    cxt.ok(valid2);
    function validateUniqueItems() {
      const i = gen.let("i", (0, codegen_1$d._)`${data}.length`);
      const j = gen.let("j");
      cxt.setParams({ i, j });
      gen.assign(valid2, true);
      gen.if((0, codegen_1$d._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
    }
    function canOptimize() {
      return itemTypes.length > 0 && !itemTypes.some((t2) => t2 === "object" || t2 === "array");
    }
    function loopN(i, j) {
      const item = gen.name("item");
      const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
      const indices = gen.const("indices", (0, codegen_1$d._)`{}`);
      gen.for((0, codegen_1$d._)`;${i}--;`, () => {
        gen.let(item, (0, codegen_1$d._)`${data}[${i}]`);
        gen.if(wrongType, (0, codegen_1$d._)`continue`);
        if (itemTypes.length > 1)
          gen.if((0, codegen_1$d._)`typeof ${item} == "string"`, (0, codegen_1$d._)`${item} += "_"`);
        gen.if((0, codegen_1$d._)`typeof ${indices}[${item}] == "number"`, () => {
          gen.assign(j, (0, codegen_1$d._)`${indices}[${item}]`);
          cxt.error();
          gen.assign(valid2, false).break();
        }).code((0, codegen_1$d._)`${indices}[${item}] = ${i}`);
      });
    }
    function loopN2(i, j) {
      const eql = (0, util_1$g.useFunc)(gen, equal_1$2.default);
      const outer = gen.name("outer");
      gen.label(outer).for((0, codegen_1$d._)`;${i}--;`, () => gen.for((0, codegen_1$d._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1$d._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
        cxt.error();
        gen.assign(valid2, false).break(outer);
      })));
    }
  }
};
uniqueItems.default = def$j;
var _const = {};
Object.defineProperty(_const, "__esModule", { value: true });
const codegen_1$c = codegen;
const util_1$f = util;
const equal_1$1 = equal$1;
const error$a = {
  message: "must be equal to constant",
  params: ({ schemaCode }) => (0, codegen_1$c._)`{allowedValue: ${schemaCode}}`
};
const def$i = {
  keyword: "const",
  $data: true,
  error: error$a,
  code(cxt) {
    const { gen, data, $data, schemaCode, schema } = cxt;
    if ($data || schema && typeof schema == "object") {
      cxt.fail$data((0, codegen_1$c._)`!${(0, util_1$f.useFunc)(gen, equal_1$1.default)}(${data}, ${schemaCode})`);
    } else {
      cxt.fail((0, codegen_1$c._)`${schema} !== ${data}`);
    }
  }
};
_const.default = def$i;
var _enum = {};
Object.defineProperty(_enum, "__esModule", { value: true });
const codegen_1$b = codegen;
const util_1$e = util;
const equal_1 = equal$1;
const error$9 = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode }) => (0, codegen_1$b._)`{allowedValues: ${schemaCode}}`
};
const def$h = {
  keyword: "enum",
  schemaType: "array",
  $data: true,
  error: error$9,
  code(cxt) {
    const { gen, data, $data, schema, schemaCode, it } = cxt;
    if (!$data && schema.length === 0)
      throw new Error("enum must have non-empty array");
    const useLoop = schema.length >= it.opts.loopEnum;
    let eql;
    const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1$e.useFunc)(gen, equal_1.default);
    let valid2;
    if (useLoop || $data) {
      valid2 = gen.let("valid");
      cxt.block$data(valid2, loopEnum);
    } else {
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const vSchema = gen.const("vSchema", schemaCode);
      valid2 = (0, codegen_1$b.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
    }
    cxt.pass(valid2);
    function loopEnum() {
      gen.assign(valid2, false);
      gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1$b._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid2, true).break()));
    }
    function equalCode(vSchema, i) {
      const sch = schema[i];
      return typeof sch === "object" && sch !== null ? (0, codegen_1$b._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1$b._)`${data} === ${sch}`;
    }
  }
};
_enum.default = def$h;
Object.defineProperty(validation$1, "__esModule", { value: true });
const limitNumber_1 = limitNumber;
const multipleOf_1 = multipleOf;
const limitLength_1 = limitLength;
const pattern_1 = pattern;
const limitProperties_1 = limitProperties;
const required_1 = required;
const limitItems_1 = limitItems;
const uniqueItems_1 = uniqueItems;
const const_1 = _const;
const enum_1 = _enum;
const validation = [
  // number
  limitNumber_1.default,
  multipleOf_1.default,
  // string
  limitLength_1.default,
  pattern_1.default,
  // object
  limitProperties_1.default,
  required_1.default,
  // array
  limitItems_1.default,
  uniqueItems_1.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  const_1.default,
  enum_1.default
];
validation$1.default = validation;
var applicator = {};
var additionalItems = {};
Object.defineProperty(additionalItems, "__esModule", { value: true });
additionalItems.validateAdditionalItems = void 0;
const codegen_1$a = codegen;
const util_1$d = util;
const error$8 = {
  message: ({ params: { len } }) => (0, codegen_1$a.str)`must NOT have more than ${len} items`,
  params: ({ params: { len } }) => (0, codegen_1$a._)`{limit: ${len}}`
};
const def$g = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: error$8,
  code(cxt) {
    const { parentSchema, it } = cxt;
    const { items: items2 } = parentSchema;
    if (!Array.isArray(items2)) {
      (0, util_1$d.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    validateAdditionalItems(cxt, items2);
  }
};
function validateAdditionalItems(cxt, items2) {
  const { gen, schema, data, keyword: keyword2, it } = cxt;
  it.items = true;
  const len = gen.const("len", (0, codegen_1$a._)`${data}.length`);
  if (schema === false) {
    cxt.setParams({ len: items2.length });
    cxt.pass((0, codegen_1$a._)`${len} <= ${items2.length}`);
  } else if (typeof schema == "object" && !(0, util_1$d.alwaysValidSchema)(it, schema)) {
    const valid2 = gen.var("valid", (0, codegen_1$a._)`${len} <= ${items2.length}`);
    gen.if((0, codegen_1$a.not)(valid2), () => validateItems(valid2));
    cxt.ok(valid2);
  }
  function validateItems(valid2) {
    gen.forRange("i", items2.length, len, (i) => {
      cxt.subschema({ keyword: keyword2, dataProp: i, dataPropType: util_1$d.Type.Num }, valid2);
      if (!it.allErrors)
        gen.if((0, codegen_1$a.not)(valid2), () => gen.break());
    });
  }
}
additionalItems.validateAdditionalItems = validateAdditionalItems;
additionalItems.default = def$g;
var prefixItems = {};
var items = {};
Object.defineProperty(items, "__esModule", { value: true });
items.validateTuple = void 0;
const codegen_1$9 = codegen;
const util_1$c = util;
const code_1$5 = requireCode();
const def$f = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(cxt) {
    const { schema, it } = cxt;
    if (Array.isArray(schema))
      return validateTuple(cxt, "additionalItems", schema);
    it.items = true;
    if ((0, util_1$c.alwaysValidSchema)(it, schema))
      return;
    cxt.ok((0, code_1$5.validateArray)(cxt));
  }
};
function validateTuple(cxt, extraItems, schArr = cxt.schema) {
  const { gen, parentSchema, data, keyword: keyword2, it } = cxt;
  checkStrictTuple(parentSchema);
  if (it.opts.unevaluated && schArr.length && it.items !== true) {
    it.items = util_1$c.mergeEvaluated.items(gen, schArr.length, it.items);
  }
  const valid2 = gen.name("valid");
  const len = gen.const("len", (0, codegen_1$9._)`${data}.length`);
  schArr.forEach((sch, i) => {
    if ((0, util_1$c.alwaysValidSchema)(it, sch))
      return;
    gen.if((0, codegen_1$9._)`${len} > ${i}`, () => cxt.subschema({
      keyword: keyword2,
      schemaProp: i,
      dataProp: i
    }, valid2));
    cxt.ok(valid2);
  });
  function checkStrictTuple(sch) {
    const { opts, errSchemaPath } = it;
    const l = schArr.length;
    const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
    if (opts.strictTuples && !fullTuple) {
      const msg = `"${keyword2}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
      (0, util_1$c.checkStrictMode)(it, msg, opts.strictTuples);
    }
  }
}
items.validateTuple = validateTuple;
items.default = def$f;
Object.defineProperty(prefixItems, "__esModule", { value: true });
const items_1$1 = items;
const def$e = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (cxt) => (0, items_1$1.validateTuple)(cxt, "items")
};
prefixItems.default = def$e;
var items2020 = {};
Object.defineProperty(items2020, "__esModule", { value: true });
const codegen_1$8 = codegen;
const util_1$b = util;
const code_1$4 = requireCode();
const additionalItems_1$1 = additionalItems;
const error$7 = {
  message: ({ params: { len } }) => (0, codegen_1$8.str)`must NOT have more than ${len} items`,
  params: ({ params: { len } }) => (0, codegen_1$8._)`{limit: ${len}}`
};
const def$d = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: error$7,
  code(cxt) {
    const { schema, parentSchema, it } = cxt;
    const { prefixItems: prefixItems2 } = parentSchema;
    it.items = true;
    if ((0, util_1$b.alwaysValidSchema)(it, schema))
      return;
    if (prefixItems2)
      (0, additionalItems_1$1.validateAdditionalItems)(cxt, prefixItems2);
    else
      cxt.ok((0, code_1$4.validateArray)(cxt));
  }
};
items2020.default = def$d;
var contains = {};
Object.defineProperty(contains, "__esModule", { value: true });
const codegen_1$7 = codegen;
const util_1$a = util;
const error$6 = {
  message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1$7.str)`must contain at least ${min} valid item(s)` : (0, codegen_1$7.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
  params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1$7._)`{minContains: ${min}}` : (0, codegen_1$7._)`{minContains: ${min}, maxContains: ${max}}`
};
const def$c = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: true,
  error: error$6,
  code(cxt) {
    const { gen, schema, parentSchema, data, it } = cxt;
    let min;
    let max;
    const { minContains, maxContains } = parentSchema;
    if (it.opts.next) {
      min = minContains === void 0 ? 1 : minContains;
      max = maxContains;
    } else {
      min = 1;
    }
    const len = gen.const("len", (0, codegen_1$7._)`${data}.length`);
    cxt.setParams({ min, max });
    if (max === void 0 && min === 0) {
      (0, util_1$a.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
      return;
    }
    if (max !== void 0 && min > max) {
      (0, util_1$a.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
      cxt.fail();
      return;
    }
    if ((0, util_1$a.alwaysValidSchema)(it, schema)) {
      let cond = (0, codegen_1$7._)`${len} >= ${min}`;
      if (max !== void 0)
        cond = (0, codegen_1$7._)`${cond} && ${len} <= ${max}`;
      cxt.pass(cond);
      return;
    }
    it.items = true;
    const valid2 = gen.name("valid");
    if (max === void 0 && min === 1) {
      validateItems(valid2, () => gen.if(valid2, () => gen.break()));
    } else if (min === 0) {
      gen.let(valid2, true);
      if (max !== void 0)
        gen.if((0, codegen_1$7._)`${data}.length > 0`, validateItemsWithCount);
    } else {
      gen.let(valid2, false);
      validateItemsWithCount();
    }
    cxt.result(valid2, () => cxt.reset());
    function validateItemsWithCount() {
      const schValid = gen.name("_valid");
      const count = gen.let("count", 0);
      validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
    }
    function validateItems(_valid, block) {
      gen.forRange("i", 0, len, (i) => {
        cxt.subschema({
          keyword: "contains",
          dataProp: i,
          dataPropType: util_1$a.Type.Num,
          compositeRule: true
        }, _valid);
        block();
      });
    }
    function checkLimits(count) {
      gen.code((0, codegen_1$7._)`${count}++`);
      if (max === void 0) {
        gen.if((0, codegen_1$7._)`${count} >= ${min}`, () => gen.assign(valid2, true).break());
      } else {
        gen.if((0, codegen_1$7._)`${count} > ${max}`, () => gen.assign(valid2, false).break());
        if (min === 1)
          gen.assign(valid2, true);
        else
          gen.if((0, codegen_1$7._)`${count} >= ${min}`, () => gen.assign(valid2, true));
      }
    }
  }
};
contains.default = def$c;
var dependencies = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.validateSchemaDeps = exports$1.validatePropertyDeps = exports$1.error = void 0;
  const codegen_12 = codegen;
  const util_12 = util;
  const code_12 = requireCode();
  exports$1.error = {
    message: ({ params: { property, depsCount, deps } }) => {
      const property_ies = depsCount === 1 ? "property" : "properties";
      return (0, codegen_12.str)`must have ${property_ies} ${deps} when property ${property} is present`;
    },
    params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_12._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
    // TODO change to reference
  };
  const def2 = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: exports$1.error,
    code(cxt) {
      const [propDeps, schDeps] = splitDependencies(cxt);
      validatePropertyDeps(cxt, propDeps);
      validateSchemaDeps(cxt, schDeps);
    }
  };
  function splitDependencies({ schema }) {
    const propertyDeps = {};
    const schemaDeps = {};
    for (const key in schema) {
      if (key === "__proto__")
        continue;
      const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
      deps[key] = schema[key];
    }
    return [propertyDeps, schemaDeps];
  }
  function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
    const { gen, data, it } = cxt;
    if (Object.keys(propertyDeps).length === 0)
      return;
    const missing = gen.let("missing");
    for (const prop in propertyDeps) {
      const deps = propertyDeps[prop];
      if (deps.length === 0)
        continue;
      const hasProperty2 = (0, code_12.propertyInData)(gen, data, prop, it.opts.ownProperties);
      cxt.setParams({
        property: prop,
        depsCount: deps.length,
        deps: deps.join(", ")
      });
      if (it.allErrors) {
        gen.if(hasProperty2, () => {
          for (const depProp of deps) {
            (0, code_12.checkReportMissingProp)(cxt, depProp);
          }
        });
      } else {
        gen.if((0, codegen_12._)`${hasProperty2} && (${(0, code_12.checkMissingProp)(cxt, deps, missing)})`);
        (0, code_12.reportMissingProp)(cxt, missing);
        gen.else();
      }
    }
  }
  exports$1.validatePropertyDeps = validatePropertyDeps;
  function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
    const { gen, data, keyword: keyword2, it } = cxt;
    const valid2 = gen.name("valid");
    for (const prop in schemaDeps) {
      if ((0, util_12.alwaysValidSchema)(it, schemaDeps[prop]))
        continue;
      gen.if(
        (0, code_12.propertyInData)(gen, data, prop, it.opts.ownProperties),
        () => {
          const schCxt = cxt.subschema({ keyword: keyword2, schemaProp: prop }, valid2);
          cxt.mergeValidEvaluated(schCxt, valid2);
        },
        () => gen.var(valid2, true)
        // TODO var
      );
      cxt.ok(valid2);
    }
  }
  exports$1.validateSchemaDeps = validateSchemaDeps;
  exports$1.default = def2;
})(dependencies);
var propertyNames = {};
Object.defineProperty(propertyNames, "__esModule", { value: true });
const codegen_1$6 = codegen;
const util_1$9 = util;
const error$5 = {
  message: "property name must be valid",
  params: ({ params }) => (0, codegen_1$6._)`{propertyName: ${params.propertyName}}`
};
const def$b = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: error$5,
  code(cxt) {
    const { gen, schema, data, it } = cxt;
    if ((0, util_1$9.alwaysValidSchema)(it, schema))
      return;
    const valid2 = gen.name("valid");
    gen.forIn("key", data, (key) => {
      cxt.setParams({ propertyName: key });
      cxt.subschema({
        keyword: "propertyNames",
        data: key,
        dataTypes: ["string"],
        propertyName: key,
        compositeRule: true
      }, valid2);
      gen.if((0, codegen_1$6.not)(valid2), () => {
        cxt.error(true);
        if (!it.allErrors)
          gen.break();
      });
    });
    cxt.ok(valid2);
  }
};
propertyNames.default = def$b;
var additionalProperties = {};
Object.defineProperty(additionalProperties, "__esModule", { value: true });
const code_1$3 = requireCode();
const codegen_1$5 = codegen;
const names_1 = requireNames();
const util_1$8 = util;
const error$4 = {
  message: "must NOT have additional properties",
  params: ({ params }) => (0, codegen_1$5._)`{additionalProperty: ${params.additionalProperty}}`
};
const def$a = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: true,
  trackErrors: true,
  error: error$4,
  code(cxt) {
    const { gen, schema, parentSchema, data, errsCount, it } = cxt;
    if (!errsCount)
      throw new Error("ajv implementation error");
    const { allErrors, opts } = it;
    it.props = true;
    if (opts.removeAdditional !== "all" && (0, util_1$8.alwaysValidSchema)(it, schema))
      return;
    const props = (0, code_1$3.allSchemaProperties)(parentSchema.properties);
    const patProps = (0, code_1$3.allSchemaProperties)(parentSchema.patternProperties);
    checkAdditionalProperties();
    cxt.ok((0, codegen_1$5._)`${errsCount} === ${names_1.default.errors}`);
    function checkAdditionalProperties() {
      gen.forIn("key", data, (key) => {
        if (!props.length && !patProps.length)
          additionalPropertyCode(key);
        else
          gen.if(isAdditional(key), () => additionalPropertyCode(key));
      });
    }
    function isAdditional(key) {
      let definedProp;
      if (props.length > 8) {
        const propsSchema = (0, util_1$8.schemaRefOrVal)(it, parentSchema.properties, "properties");
        definedProp = (0, code_1$3.isOwnProperty)(gen, propsSchema, key);
      } else if (props.length) {
        definedProp = (0, codegen_1$5.or)(...props.map((p) => (0, codegen_1$5._)`${key} === ${p}`));
      } else {
        definedProp = codegen_1$5.nil;
      }
      if (patProps.length) {
        definedProp = (0, codegen_1$5.or)(definedProp, ...patProps.map((p) => (0, codegen_1$5._)`${(0, code_1$3.usePattern)(cxt, p)}.test(${key})`));
      }
      return (0, codegen_1$5.not)(definedProp);
    }
    function deleteAdditional(key) {
      gen.code((0, codegen_1$5._)`delete ${data}[${key}]`);
    }
    function additionalPropertyCode(key) {
      if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
        deleteAdditional(key);
        return;
      }
      if (schema === false) {
        cxt.setParams({ additionalProperty: key });
        cxt.error();
        if (!allErrors)
          gen.break();
        return;
      }
      if (typeof schema == "object" && !(0, util_1$8.alwaysValidSchema)(it, schema)) {
        const valid2 = gen.name("valid");
        if (opts.removeAdditional === "failing") {
          applyAdditionalSchema(key, valid2, false);
          gen.if((0, codegen_1$5.not)(valid2), () => {
            cxt.reset();
            deleteAdditional(key);
          });
        } else {
          applyAdditionalSchema(key, valid2);
          if (!allErrors)
            gen.if((0, codegen_1$5.not)(valid2), () => gen.break());
        }
      }
    }
    function applyAdditionalSchema(key, valid2, errors2) {
      const subschema2 = {
        keyword: "additionalProperties",
        dataProp: key,
        dataPropType: util_1$8.Type.Str
      };
      if (errors2 === false) {
        Object.assign(subschema2, {
          compositeRule: true,
          createErrors: false,
          allErrors: false
        });
      }
      cxt.subschema(subschema2, valid2);
    }
  }
};
additionalProperties.default = def$a;
var properties$1 = {};
Object.defineProperty(properties$1, "__esModule", { value: true });
const validate_1 = requireValidate();
const code_1$2 = requireCode();
const util_1$7 = util;
const additionalProperties_1$1 = additionalProperties;
const def$9 = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(cxt) {
    const { gen, schema, parentSchema, data, it } = cxt;
    if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
      additionalProperties_1$1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1$1.default, "additionalProperties"));
    }
    const allProps = (0, code_1$2.allSchemaProperties)(schema);
    for (const prop of allProps) {
      it.definedProperties.add(prop);
    }
    if (it.opts.unevaluated && allProps.length && it.props !== true) {
      it.props = util_1$7.mergeEvaluated.props(gen, (0, util_1$7.toHash)(allProps), it.props);
    }
    const properties2 = allProps.filter((p) => !(0, util_1$7.alwaysValidSchema)(it, schema[p]));
    if (properties2.length === 0)
      return;
    const valid2 = gen.name("valid");
    for (const prop of properties2) {
      if (hasDefault(prop)) {
        applyPropertySchema(prop);
      } else {
        gen.if((0, code_1$2.propertyInData)(gen, data, prop, it.opts.ownProperties));
        applyPropertySchema(prop);
        if (!it.allErrors)
          gen.else().var(valid2, true);
        gen.endIf();
      }
      cxt.it.definedProperties.add(prop);
      cxt.ok(valid2);
    }
    function hasDefault(prop) {
      return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
    }
    function applyPropertySchema(prop) {
      cxt.subschema({
        keyword: "properties",
        schemaProp: prop,
        dataProp: prop
      }, valid2);
    }
  }
};
properties$1.default = def$9;
var patternProperties = {};
Object.defineProperty(patternProperties, "__esModule", { value: true });
const code_1$1 = requireCode();
const codegen_1$4 = codegen;
const util_1$6 = util;
const util_2 = util;
const def$8 = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(cxt) {
    const { gen, schema, data, parentSchema, it } = cxt;
    const { opts } = it;
    const patterns = (0, code_1$1.allSchemaProperties)(schema);
    const alwaysValidPatterns = patterns.filter((p) => (0, util_1$6.alwaysValidSchema)(it, schema[p]));
    if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
      return;
    }
    const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
    const valid2 = gen.name("valid");
    if (it.props !== true && !(it.props instanceof codegen_1$4.Name)) {
      it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
    }
    const { props } = it;
    validatePatternProperties();
    function validatePatternProperties() {
      for (const pat of patterns) {
        if (checkProperties)
          checkMatchingProperties(pat);
        if (it.allErrors) {
          validateProperties(pat);
        } else {
          gen.var(valid2, true);
          validateProperties(pat);
          gen.if(valid2);
        }
      }
    }
    function checkMatchingProperties(pat) {
      for (const prop in checkProperties) {
        if (new RegExp(pat).test(prop)) {
          (0, util_1$6.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
        }
      }
    }
    function validateProperties(pat) {
      gen.forIn("key", data, (key) => {
        gen.if((0, codegen_1$4._)`${(0, code_1$1.usePattern)(cxt, pat)}.test(${key})`, () => {
          const alwaysValid = alwaysValidPatterns.includes(pat);
          if (!alwaysValid) {
            cxt.subschema({
              keyword: "patternProperties",
              schemaProp: pat,
              dataProp: key,
              dataPropType: util_2.Type.Str
            }, valid2);
          }
          if (it.opts.unevaluated && props !== true) {
            gen.assign((0, codegen_1$4._)`${props}[${key}]`, true);
          } else if (!alwaysValid && !it.allErrors) {
            gen.if((0, codegen_1$4.not)(valid2), () => gen.break());
          }
        });
      });
    }
  }
};
patternProperties.default = def$8;
var not = {};
Object.defineProperty(not, "__esModule", { value: true });
const util_1$5 = util;
const def$7 = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: true,
  code(cxt) {
    const { gen, schema, it } = cxt;
    if ((0, util_1$5.alwaysValidSchema)(it, schema)) {
      cxt.fail();
      return;
    }
    const valid2 = gen.name("valid");
    cxt.subschema({
      keyword: "not",
      compositeRule: true,
      createErrors: false,
      allErrors: false
    }, valid2);
    cxt.failResult(valid2, () => cxt.reset(), () => cxt.error());
  },
  error: { message: "must NOT be valid" }
};
not.default = def$7;
var anyOf = {};
Object.defineProperty(anyOf, "__esModule", { value: true });
const code_1 = requireCode();
const def$6 = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: true,
  code: code_1.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
anyOf.default = def$6;
var oneOf = {};
Object.defineProperty(oneOf, "__esModule", { value: true });
const codegen_1$3 = codegen;
const util_1$4 = util;
const error$3 = {
  message: "must match exactly one schema in oneOf",
  params: ({ params }) => (0, codegen_1$3._)`{passingSchemas: ${params.passing}}`
};
const def$5 = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: true,
  error: error$3,
  code(cxt) {
    const { gen, schema, parentSchema, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    if (it.opts.discriminator && parentSchema.discriminator)
      return;
    const schArr = schema;
    const valid2 = gen.let("valid", false);
    const passing = gen.let("passing", null);
    const schValid = gen.name("_valid");
    cxt.setParams({ passing });
    gen.block(validateOneOf);
    cxt.result(valid2, () => cxt.reset(), () => cxt.error(true));
    function validateOneOf() {
      schArr.forEach((sch, i) => {
        let schCxt;
        if ((0, util_1$4.alwaysValidSchema)(it, sch)) {
          gen.var(schValid, true);
        } else {
          schCxt = cxt.subschema({
            keyword: "oneOf",
            schemaProp: i,
            compositeRule: true
          }, schValid);
        }
        if (i > 0) {
          gen.if((0, codegen_1$3._)`${schValid} && ${valid2}`).assign(valid2, false).assign(passing, (0, codegen_1$3._)`[${passing}, ${i}]`).else();
        }
        gen.if(schValid, () => {
          gen.assign(valid2, true);
          gen.assign(passing, i);
          if (schCxt)
            cxt.mergeEvaluated(schCxt, codegen_1$3.Name);
        });
      });
    }
  }
};
oneOf.default = def$5;
var allOf = {};
Object.defineProperty(allOf, "__esModule", { value: true });
const util_1$3 = util;
const def$4 = {
  keyword: "allOf",
  schemaType: "array",
  code(cxt) {
    const { gen, schema, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    const valid2 = gen.name("valid");
    schema.forEach((sch, i) => {
      if ((0, util_1$3.alwaysValidSchema)(it, sch))
        return;
      const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid2);
      cxt.ok(valid2);
      cxt.mergeEvaluated(schCxt);
    });
  }
};
allOf.default = def$4;
var _if = {};
Object.defineProperty(_if, "__esModule", { value: true });
const codegen_1$2 = codegen;
const util_1$2 = util;
const error$2 = {
  message: ({ params }) => (0, codegen_1$2.str)`must match "${params.ifClause}" schema`,
  params: ({ params }) => (0, codegen_1$2._)`{failingKeyword: ${params.ifClause}}`
};
const def$3 = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: true,
  error: error$2,
  code(cxt) {
    const { gen, parentSchema, it } = cxt;
    if (parentSchema.then === void 0 && parentSchema.else === void 0) {
      (0, util_1$2.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
    }
    const hasThen = hasSchema(it, "then");
    const hasElse = hasSchema(it, "else");
    if (!hasThen && !hasElse)
      return;
    const valid2 = gen.let("valid", true);
    const schValid = gen.name("_valid");
    validateIf();
    cxt.reset();
    if (hasThen && hasElse) {
      const ifClause = gen.let("ifClause");
      cxt.setParams({ ifClause });
      gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
    } else if (hasThen) {
      gen.if(schValid, validateClause("then"));
    } else {
      gen.if((0, codegen_1$2.not)(schValid), validateClause("else"));
    }
    cxt.pass(valid2, () => cxt.error(true));
    function validateIf() {
      const schCxt = cxt.subschema({
        keyword: "if",
        compositeRule: true,
        createErrors: false,
        allErrors: false
      }, schValid);
      cxt.mergeEvaluated(schCxt);
    }
    function validateClause(keyword2, ifClause) {
      return () => {
        const schCxt = cxt.subschema({ keyword: keyword2 }, schValid);
        gen.assign(valid2, schValid);
        cxt.mergeValidEvaluated(schCxt, valid2);
        if (ifClause)
          gen.assign(ifClause, (0, codegen_1$2._)`${keyword2}`);
        else
          cxt.setParams({ ifClause: keyword2 });
      };
    }
  }
};
function hasSchema(it, keyword2) {
  const schema = it.schema[keyword2];
  return schema !== void 0 && !(0, util_1$2.alwaysValidSchema)(it, schema);
}
_if.default = def$3;
var thenElse = {};
Object.defineProperty(thenElse, "__esModule", { value: true });
const util_1$1 = util;
const def$2 = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: keyword2, parentSchema, it }) {
    if (parentSchema.if === void 0)
      (0, util_1$1.checkStrictMode)(it, `"${keyword2}" without "if" is ignored`);
  }
};
thenElse.default = def$2;
Object.defineProperty(applicator, "__esModule", { value: true });
const additionalItems_1 = additionalItems;
const prefixItems_1 = prefixItems;
const items_1 = items;
const items2020_1 = items2020;
const contains_1 = contains;
const dependencies_1 = dependencies;
const propertyNames_1 = propertyNames;
const additionalProperties_1 = additionalProperties;
const properties_1 = properties$1;
const patternProperties_1 = patternProperties;
const not_1 = not;
const anyOf_1 = anyOf;
const oneOf_1 = oneOf;
const allOf_1 = allOf;
const if_1 = _if;
const thenElse_1 = thenElse;
function getApplicator(draft20202 = false) {
  const applicator2 = [
    // any
    not_1.default,
    anyOf_1.default,
    oneOf_1.default,
    allOf_1.default,
    if_1.default,
    thenElse_1.default,
    // object
    propertyNames_1.default,
    additionalProperties_1.default,
    dependencies_1.default,
    properties_1.default,
    patternProperties_1.default
  ];
  if (draft20202)
    applicator2.push(prefixItems_1.default, items2020_1.default);
  else
    applicator2.push(additionalItems_1.default, items_1.default);
  applicator2.push(contains_1.default);
  return applicator2;
}
applicator.default = getApplicator;
var format$2 = {};
var format$1 = {};
Object.defineProperty(format$1, "__esModule", { value: true });
const codegen_1$1 = codegen;
const error$1 = {
  message: ({ schemaCode }) => (0, codegen_1$1.str)`must match format "${schemaCode}"`,
  params: ({ schemaCode }) => (0, codegen_1$1._)`{format: ${schemaCode}}`
};
const def$1 = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: true,
  error: error$1,
  code(cxt, ruleType) {
    const { gen, data, $data, schema, schemaCode, it } = cxt;
    const { opts, errSchemaPath, schemaEnv, self } = it;
    if (!opts.validateFormats)
      return;
    if ($data)
      validate$DataFormat();
    else
      validateFormat();
    function validate$DataFormat() {
      const fmts = gen.scopeValue("formats", {
        ref: self.formats,
        code: opts.code.formats
      });
      const fDef = gen.const("fDef", (0, codegen_1$1._)`${fmts}[${schemaCode}]`);
      const fType = gen.let("fType");
      const format2 = gen.let("format");
      gen.if((0, codegen_1$1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1$1._)`${fDef}.type || "string"`).assign(format2, (0, codegen_1$1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1$1._)`"string"`).assign(format2, fDef));
      cxt.fail$data((0, codegen_1$1.or)(unknownFmt(), invalidFmt()));
      function unknownFmt() {
        if (opts.strictSchema === false)
          return codegen_1$1.nil;
        return (0, codegen_1$1._)`${schemaCode} && !${format2}`;
      }
      function invalidFmt() {
        const callFormat = schemaEnv.$async ? (0, codegen_1$1._)`(${fDef}.async ? await ${format2}(${data}) : ${format2}(${data}))` : (0, codegen_1$1._)`${format2}(${data})`;
        const validData = (0, codegen_1$1._)`(typeof ${format2} == "function" ? ${callFormat} : ${format2}.test(${data}))`;
        return (0, codegen_1$1._)`${format2} && ${format2} !== true && ${fType} === ${ruleType} && !${validData}`;
      }
    }
    function validateFormat() {
      const formatDef = self.formats[schema];
      if (!formatDef) {
        unknownFormat();
        return;
      }
      if (formatDef === true)
        return;
      const [fmtType, format2, fmtRef] = getFormat(formatDef);
      if (fmtType === ruleType)
        cxt.pass(validCondition());
      function unknownFormat() {
        if (opts.strictSchema === false) {
          self.logger.warn(unknownMsg());
          return;
        }
        throw new Error(unknownMsg());
        function unknownMsg() {
          return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
        }
      }
      function getFormat(fmtDef) {
        const code2 = fmtDef instanceof RegExp ? (0, codegen_1$1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1$1._)`${opts.code.formats}${(0, codegen_1$1.getProperty)(schema)}` : void 0;
        const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code: code2 });
        if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
          return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1$1._)`${fmt}.validate`];
        }
        return ["string", fmtDef, fmt];
      }
      function validCondition() {
        if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
          if (!schemaEnv.$async)
            throw new Error("async format in sync schema");
          return (0, codegen_1$1._)`await ${fmtRef}(${data})`;
        }
        return typeof format2 == "function" ? (0, codegen_1$1._)`${fmtRef}(${data})` : (0, codegen_1$1._)`${fmtRef}.test(${data})`;
      }
    }
  }
};
format$1.default = def$1;
Object.defineProperty(format$2, "__esModule", { value: true });
const format_1$1 = format$1;
const format = [format_1$1.default];
format$2.default = format;
var metadata = {};
Object.defineProperty(metadata, "__esModule", { value: true });
metadata.contentVocabulary = metadata.metadataVocabulary = void 0;
metadata.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
metadata.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(draft7, "__esModule", { value: true });
const core_1 = core$1;
const validation_1 = validation$1;
const applicator_1 = applicator;
const format_1 = format$2;
const metadata_1 = metadata;
const draft7Vocabularies = [
  core_1.default,
  validation_1.default,
  (0, applicator_1.default)(),
  format_1.default,
  metadata_1.metadataVocabulary,
  metadata_1.contentVocabulary
];
draft7.default = draft7Vocabularies;
var discriminator = {};
var types = {};
Object.defineProperty(types, "__esModule", { value: true });
types.DiscrError = void 0;
var DiscrError;
(function(DiscrError2) {
  DiscrError2["Tag"] = "tag";
  DiscrError2["Mapping"] = "mapping";
})(DiscrError || (types.DiscrError = DiscrError = {}));
Object.defineProperty(discriminator, "__esModule", { value: true });
const codegen_1 = codegen;
const types_1 = types;
const compile_1 = compile;
const ref_error_1 = ref_error;
const util_1 = util;
const error = {
  message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
  params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
};
const def = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error,
  code(cxt) {
    const { gen, data, schema, parentSchema, it } = cxt;
    const { oneOf: oneOf2 } = parentSchema;
    if (!it.opts.discriminator) {
      throw new Error("discriminator: requires discriminator option");
    }
    const tagName = schema.propertyName;
    if (typeof tagName != "string")
      throw new Error("discriminator: requires propertyName");
    if (schema.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!oneOf2)
      throw new Error("discriminator: requires oneOf keyword");
    const valid2 = gen.let("valid", false);
    const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
    gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
    cxt.ok(valid2);
    function validateMapping() {
      const mapping = getMapping();
      gen.if(false);
      for (const tagValue in mapping) {
        gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
        gen.assign(valid2, applyTagSchema(mapping[tagValue]));
      }
      gen.else();
      cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
      gen.endIf();
    }
    function applyTagSchema(schemaProp) {
      const _valid = gen.name("valid");
      const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
      cxt.mergeEvaluated(schCxt, codegen_1.Name);
      return _valid;
    }
    function getMapping() {
      var _a;
      const oneOfMapping = {};
      const topRequired = hasRequired(parentSchema);
      let tagRequired = true;
      for (let i = 0; i < oneOf2.length; i++) {
        let sch = oneOf2[i];
        if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
          const ref2 = sch.$ref;
          sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref2);
          if (sch instanceof compile_1.SchemaEnv)
            sch = sch.schema;
          if (sch === void 0)
            throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref2);
        }
        const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
        if (typeof propSch != "object") {
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
        }
        tagRequired = tagRequired && (topRequired || hasRequired(sch));
        addMappings(propSch, i);
      }
      if (!tagRequired)
        throw new Error(`discriminator: "${tagName}" must be required`);
      return oneOfMapping;
      function hasRequired({ required: required2 }) {
        return Array.isArray(required2) && required2.includes(tagName);
      }
      function addMappings(sch, i) {
        if (sch.const) {
          addMapping(sch.const, i);
        } else if (sch.enum) {
          for (const tagValue of sch.enum) {
            addMapping(tagValue, i);
          }
        } else {
          throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
        }
      }
      function addMapping(tagValue, i) {
        if (typeof tagValue != "string" || tagValue in oneOfMapping) {
          throw new Error(`discriminator: "${tagName}" values must be unique strings`);
        }
        oneOfMapping[tagValue] = i;
      }
    }
  }
};
discriminator.default = def;
const $schema = "http://json-schema.org/draft-07/schema#";
const $id = "http://json-schema.org/draft-07/schema#";
const title = "Core schema meta-schema";
const definitions = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $ref: "#"
    }
  },
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    allOf: [
      {
        $ref: "#/definitions/nonNegativeInteger"
      },
      {
        "default": 0
      }
    ]
  },
  simpleTypes: {
    "enum": [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: true,
    "default": []
  }
};
const type = [
  "object",
  "boolean"
];
const properties = {
  $id: {
    type: "string",
    format: "uri-reference"
  },
  $schema: {
    type: "string",
    format: "uri"
  },
  $ref: {
    type: "string",
    format: "uri-reference"
  },
  $comment: {
    type: "string"
  },
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  "default": true,
  readOnly: {
    type: "boolean",
    "default": false
  },
  examples: {
    type: "array",
    items: true
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  additionalItems: {
    $ref: "#"
  },
  items: {
    anyOf: [
      {
        $ref: "#"
      },
      {
        $ref: "#/definitions/schemaArray"
      }
    ],
    "default": true
  },
  maxItems: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    "default": false
  },
  contains: {
    $ref: "#"
  },
  maxProperties: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/definitions/stringArray"
  },
  additionalProperties: {
    $ref: "#"
  },
  definitions: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    "default": {}
  },
  properties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    "default": {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    propertyNames: {
      format: "regex"
    },
    "default": {}
  },
  dependencies: {
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $ref: "#"
        },
        {
          $ref: "#/definitions/stringArray"
        }
      ]
    }
  },
  propertyNames: {
    $ref: "#"
  },
  "const": true,
  "enum": {
    type: "array",
    items: true,
    minItems: 1,
    uniqueItems: true
  },
  type: {
    anyOf: [
      {
        $ref: "#/definitions/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/definitions/simpleTypes"
        },
        minItems: 1,
        uniqueItems: true
      }
    ]
  },
  format: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentEncoding: {
    type: "string"
  },
  "if": {
    $ref: "#"
  },
  then: {
    $ref: "#"
  },
  "else": {
    $ref: "#"
  },
  allOf: {
    $ref: "#/definitions/schemaArray"
  },
  anyOf: {
    $ref: "#/definitions/schemaArray"
  },
  oneOf: {
    $ref: "#/definitions/schemaArray"
  },
  not: {
    $ref: "#"
  }
};
const require$$3 = {
  $schema,
  $id,
  title,
  definitions,
  type,
  properties,
  "default": true
};
(function(module2, exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.MissingRefError = exports$1.ValidationError = exports$1.CodeGen = exports$1.Name = exports$1.nil = exports$1.stringify = exports$1.str = exports$1._ = exports$1.KeywordCxt = exports$1.Ajv = void 0;
  const core_12 = core$2;
  const draft7_1 = draft7;
  const discriminator_1 = discriminator;
  const draft7MetaSchema = require$$3;
  const META_SUPPORT_DATA2 = ["/properties"];
  const META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
  class Ajv extends core_12.default {
    _addVocabularies() {
      super._addVocabularies();
      draft7_1.default.forEach((v) => this.addVocabulary(v));
      if (this.opts.discriminator)
        this.addKeyword(discriminator_1.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      if (!this.opts.meta)
        return;
      const metaSchema2 = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA2) : draft7MetaSchema;
      this.addMetaSchema(metaSchema2, META_SCHEMA_ID, false);
      this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
    }
  }
  exports$1.Ajv = Ajv;
  module2.exports = exports$1 = Ajv;
  module2.exports.Ajv = Ajv;
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.default = Ajv;
  var validate_12 = requireValidate();
  Object.defineProperty(exports$1, "KeywordCxt", { enumerable: true, get: function() {
    return validate_12.KeywordCxt;
  } });
  var codegen_12 = codegen;
  Object.defineProperty(exports$1, "_", { enumerable: true, get: function() {
    return codegen_12._;
  } });
  Object.defineProperty(exports$1, "str", { enumerable: true, get: function() {
    return codegen_12.str;
  } });
  Object.defineProperty(exports$1, "stringify", { enumerable: true, get: function() {
    return codegen_12.stringify;
  } });
  Object.defineProperty(exports$1, "nil", { enumerable: true, get: function() {
    return codegen_12.nil;
  } });
  Object.defineProperty(exports$1, "Name", { enumerable: true, get: function() {
    return codegen_12.Name;
  } });
  Object.defineProperty(exports$1, "CodeGen", { enumerable: true, get: function() {
    return codegen_12.CodeGen;
  } });
  var validation_error_12 = requireValidation_error();
  Object.defineProperty(exports$1, "ValidationError", { enumerable: true, get: function() {
    return validation_error_12.default;
  } });
  var ref_error_12 = ref_error;
  Object.defineProperty(exports$1, "MissingRefError", { enumerable: true, get: function() {
    return ref_error_12.default;
  } });
})(ajv, ajv.exports);
var ajvExports = ajv.exports;
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.formatLimitDefinition = void 0;
  const ajv_1 = ajvExports;
  const codegen_12 = codegen;
  const ops2 = codegen_12.operators;
  const KWDs2 = {
    formatMaximum: { okStr: "<=", ok: ops2.LTE, fail: ops2.GT },
    formatMinimum: { okStr: ">=", ok: ops2.GTE, fail: ops2.LT },
    formatExclusiveMaximum: { okStr: "<", ok: ops2.LT, fail: ops2.GTE },
    formatExclusiveMinimum: { okStr: ">", ok: ops2.GT, fail: ops2.LTE }
  };
  const error2 = {
    message: ({ keyword: keyword2, schemaCode }) => (0, codegen_12.str)`should be ${KWDs2[keyword2].okStr} ${schemaCode}`,
    params: ({ keyword: keyword2, schemaCode }) => (0, codegen_12._)`{comparison: ${KWDs2[keyword2].okStr}, limit: ${schemaCode}}`
  };
  exports$1.formatLimitDefinition = {
    keyword: Object.keys(KWDs2),
    type: "string",
    schemaType: "string",
    $data: true,
    error: error2,
    code(cxt) {
      const { gen, data, schemaCode, keyword: keyword2, it } = cxt;
      const { opts, self } = it;
      if (!opts.validateFormats)
        return;
      const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
      if (fCxt.$data)
        validate$DataFormat();
      else
        validateFormat();
      function validate$DataFormat() {
        const fmts = gen.scopeValue("formats", {
          ref: self.formats,
          code: opts.code.formats
        });
        const fmt = gen.const("fmt", (0, codegen_12._)`${fmts}[${fCxt.schemaCode}]`);
        cxt.fail$data((0, codegen_12.or)((0, codegen_12._)`typeof ${fmt} != "object"`, (0, codegen_12._)`${fmt} instanceof RegExp`, (0, codegen_12._)`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
      }
      function validateFormat() {
        const format2 = fCxt.schema;
        const fmtDef = self.formats[format2];
        if (!fmtDef || fmtDef === true)
          return;
        if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
          throw new Error(`"${keyword2}": format "${format2}" does not define "compare" function`);
        }
        const fmt = gen.scopeValue("formats", {
          key: format2,
          ref: fmtDef,
          code: opts.code.formats ? (0, codegen_12._)`${opts.code.formats}${(0, codegen_12.getProperty)(format2)}` : void 0
        });
        cxt.fail$data(compareCode(fmt));
      }
      function compareCode(fmt) {
        return (0, codegen_12._)`${fmt}.compare(${data}, ${schemaCode}) ${KWDs2[keyword2].fail} 0`;
      }
    },
    dependencies: ["format"]
  };
  const formatLimitPlugin = (ajv2) => {
    ajv2.addKeyword(exports$1.formatLimitDefinition);
    return ajv2;
  };
  exports$1.default = formatLimitPlugin;
})(limit);
(function(module2, exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  const formats_1 = formats;
  const limit_1 = limit;
  const codegen_12 = codegen;
  const fullName = new codegen_12.Name("fullFormats");
  const fastName = new codegen_12.Name("fastFormats");
  const formatsPlugin = (ajv2, opts = { keywords: true }) => {
    if (Array.isArray(opts)) {
      addFormats(ajv2, opts, formats_1.fullFormats, fullName);
      return ajv2;
    }
    const [formats2, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
    const list = opts.formats || formats_1.formatNames;
    addFormats(ajv2, list, formats2, exportName);
    if (opts.keywords)
      (0, limit_1.default)(ajv2);
    return ajv2;
  };
  formatsPlugin.get = (name, mode = "full") => {
    const formats2 = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
    const f = formats2[name];
    if (!f)
      throw new Error(`Unknown format "${name}"`);
    return f;
  };
  function addFormats(ajv2, list, fs2, exportName) {
    var _a;
    var _b;
    (_a = (_b = ajv2.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = (0, codegen_12._)`require("ajv-formats/dist/formats").${exportName}`;
    for (const f of list)
      ajv2.addFormat(f, fs2[f]);
  }
  module2.exports = exports$1 = formatsPlugin;
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.default = formatsPlugin;
})(dist, dist.exports);
var distExports = dist.exports;
const ajvFormatsModule = /* @__PURE__ */ getDefaultExportFromCjs(distExports);
const copyProperty = (to, from, property, ignoreNonConfigurable) => {
  if (property === "length" || property === "prototype") {
    return;
  }
  if (property === "arguments" || property === "caller") {
    return;
  }
  const toDescriptor = Object.getOwnPropertyDescriptor(to, property);
  const fromDescriptor = Object.getOwnPropertyDescriptor(from, property);
  if (!canCopyProperty(toDescriptor, fromDescriptor) && ignoreNonConfigurable) {
    return;
  }
  Object.defineProperty(to, property, fromDescriptor);
};
const canCopyProperty = function(toDescriptor, fromDescriptor) {
  return toDescriptor === void 0 || toDescriptor.configurable || toDescriptor.writable === fromDescriptor.writable && toDescriptor.enumerable === fromDescriptor.enumerable && toDescriptor.configurable === fromDescriptor.configurable && (toDescriptor.writable || toDescriptor.value === fromDescriptor.value);
};
const changePrototype = (to, from) => {
  const fromPrototype = Object.getPrototypeOf(from);
  if (fromPrototype === Object.getPrototypeOf(to)) {
    return;
  }
  Object.setPrototypeOf(to, fromPrototype);
};
const wrappedToString = (withName, fromBody) => `/* Wrapped ${withName}*/
${fromBody}`;
const toStringDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, "toString");
const toStringName = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name");
const changeToString = (to, from, name) => {
  const withName = name === "" ? "" : `with ${name.trim()}() `;
  const newToString = wrappedToString.bind(null, withName, from.toString());
  Object.defineProperty(newToString, "name", toStringName);
  const { writable, enumerable, configurable } = toStringDescriptor;
  Object.defineProperty(to, "toString", { value: newToString, writable, enumerable, configurable });
};
function mimicFunction(to, from, { ignoreNonConfigurable = false } = {}) {
  const { name } = to;
  for (const property of Reflect.ownKeys(from)) {
    copyProperty(to, from, property, ignoreNonConfigurable);
  }
  changePrototype(to, from);
  changeToString(to, from, name);
  return to;
}
const debounceFunction = (inputFunction, options = {}) => {
  if (typeof inputFunction !== "function") {
    throw new TypeError(`Expected the first argument to be a function, got \`${typeof inputFunction}\``);
  }
  const {
    wait = 0,
    maxWait = Number.POSITIVE_INFINITY,
    before = false,
    after = true
  } = options;
  if (wait < 0 || maxWait < 0) {
    throw new RangeError("`wait` and `maxWait` must not be negative.");
  }
  if (!before && !after) {
    throw new Error("Both `before` and `after` are false, function wouldn't be called.");
  }
  let timeout;
  let maxTimeout;
  let result;
  const debouncedFunction = function(...arguments_) {
    const context = this;
    const later = () => {
      timeout = void 0;
      if (maxTimeout) {
        clearTimeout(maxTimeout);
        maxTimeout = void 0;
      }
      if (after) {
        result = inputFunction.apply(context, arguments_);
      }
    };
    const maxLater = () => {
      maxTimeout = void 0;
      if (timeout) {
        clearTimeout(timeout);
        timeout = void 0;
      }
      if (after) {
        result = inputFunction.apply(context, arguments_);
      }
    };
    const shouldCallNow = before && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (maxWait > 0 && maxWait !== Number.POSITIVE_INFINITY && !maxTimeout) {
      maxTimeout = setTimeout(maxLater, maxWait);
    }
    if (shouldCallNow) {
      result = inputFunction.apply(context, arguments_);
    }
    return result;
  };
  mimicFunction(debouncedFunction, inputFunction);
  debouncedFunction.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = void 0;
    }
    if (maxTimeout) {
      clearTimeout(maxTimeout);
      maxTimeout = void 0;
    }
  };
  return debouncedFunction;
};
var re$2 = { exports: {} };
const SEMVER_SPEC_VERSION = "2.0.0";
const MAX_LENGTH$1 = 256;
const MAX_SAFE_INTEGER$1 = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
9007199254740991;
const MAX_SAFE_COMPONENT_LENGTH = 16;
const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH$1 - 6;
const RELEASE_TYPES = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease"
];
var constants$1 = {
  MAX_LENGTH: MAX_LENGTH$1,
  MAX_SAFE_COMPONENT_LENGTH,
  MAX_SAFE_BUILD_LENGTH,
  MAX_SAFE_INTEGER: MAX_SAFE_INTEGER$1,
  RELEASE_TYPES,
  SEMVER_SPEC_VERSION,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};
const debug$1 = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
};
var debug_1 = debug$1;
(function(module2, exports$1) {
  const {
    MAX_SAFE_COMPONENT_LENGTH: MAX_SAFE_COMPONENT_LENGTH2,
    MAX_SAFE_BUILD_LENGTH: MAX_SAFE_BUILD_LENGTH2,
    MAX_LENGTH: MAX_LENGTH2
  } = constants$1;
  const debug2 = debug_1;
  exports$1 = module2.exports = {};
  const re2 = exports$1.re = [];
  const safeRe = exports$1.safeRe = [];
  const src = exports$1.src = [];
  const safeSrc = exports$1.safeSrc = [];
  const t2 = exports$1.t = {};
  let R = 0;
  const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
  const safeRegexReplacements = [
    ["\\s", 1],
    ["\\d", MAX_LENGTH2],
    [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH2]
  ];
  const makeSafeRegex = (value) => {
    for (const [token, max] of safeRegexReplacements) {
      value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
    }
    return value;
  };
  const createToken = (name, value, isGlobal) => {
    const safe = makeSafeRegex(value);
    const index = R++;
    debug2(name, index, value);
    t2[name] = index;
    src[index] = value;
    safeSrc[index] = safe;
    re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
    safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
  };
  createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
  createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
  createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
  createToken("MAINVERSION", `(${src[t2.NUMERICIDENTIFIER]})\\.(${src[t2.NUMERICIDENTIFIER]})\\.(${src[t2.NUMERICIDENTIFIER]})`);
  createToken("MAINVERSIONLOOSE", `(${src[t2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t2.NUMERICIDENTIFIERLOOSE]})`);
  createToken("PRERELEASEIDENTIFIER", `(?:${src[t2.NONNUMERICIDENTIFIER]}|${src[t2.NUMERICIDENTIFIER]})`);
  createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t2.NONNUMERICIDENTIFIER]}|${src[t2.NUMERICIDENTIFIERLOOSE]})`);
  createToken("PRERELEASE", `(?:-(${src[t2.PRERELEASEIDENTIFIER]}(?:\\.${src[t2.PRERELEASEIDENTIFIER]})*))`);
  createToken("PRERELEASELOOSE", `(?:-?(${src[t2.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t2.PRERELEASEIDENTIFIERLOOSE]})*))`);
  createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
  createToken("BUILD", `(?:\\+(${src[t2.BUILDIDENTIFIER]}(?:\\.${src[t2.BUILDIDENTIFIER]})*))`);
  createToken("FULLPLAIN", `v?${src[t2.MAINVERSION]}${src[t2.PRERELEASE]}?${src[t2.BUILD]}?`);
  createToken("FULL", `^${src[t2.FULLPLAIN]}$`);
  createToken("LOOSEPLAIN", `[v=\\s]*${src[t2.MAINVERSIONLOOSE]}${src[t2.PRERELEASELOOSE]}?${src[t2.BUILD]}?`);
  createToken("LOOSE", `^${src[t2.LOOSEPLAIN]}$`);
  createToken("GTLT", "((?:<|>)?=?)");
  createToken("XRANGEIDENTIFIERLOOSE", `${src[t2.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
  createToken("XRANGEIDENTIFIER", `${src[t2.NUMERICIDENTIFIER]}|x|X|\\*`);
  createToken("XRANGEPLAIN", `[v=\\s]*(${src[t2.XRANGEIDENTIFIER]})(?:\\.(${src[t2.XRANGEIDENTIFIER]})(?:\\.(${src[t2.XRANGEIDENTIFIER]})(?:${src[t2.PRERELEASE]})?${src[t2.BUILD]}?)?)?`);
  createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:${src[t2.PRERELEASELOOSE]})?${src[t2.BUILD]}?)?)?`);
  createToken("XRANGE", `^${src[t2.GTLT]}\\s*${src[t2.XRANGEPLAIN]}$`);
  createToken("XRANGELOOSE", `^${src[t2.GTLT]}\\s*${src[t2.XRANGEPLAINLOOSE]}$`);
  createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH2}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH2}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH2}}))?`);
  createToken("COERCE", `${src[t2.COERCEPLAIN]}(?:$|[^\\d])`);
  createToken("COERCEFULL", src[t2.COERCEPLAIN] + `(?:${src[t2.PRERELEASE]})?(?:${src[t2.BUILD]})?(?:$|[^\\d])`);
  createToken("COERCERTL", src[t2.COERCE], true);
  createToken("COERCERTLFULL", src[t2.COERCEFULL], true);
  createToken("LONETILDE", "(?:~>?)");
  createToken("TILDETRIM", `(\\s*)${src[t2.LONETILDE]}\\s+`, true);
  exports$1.tildeTrimReplace = "$1~";
  createToken("TILDE", `^${src[t2.LONETILDE]}${src[t2.XRANGEPLAIN]}$`);
  createToken("TILDELOOSE", `^${src[t2.LONETILDE]}${src[t2.XRANGEPLAINLOOSE]}$`);
  createToken("LONECARET", "(?:\\^)");
  createToken("CARETTRIM", `(\\s*)${src[t2.LONECARET]}\\s+`, true);
  exports$1.caretTrimReplace = "$1^";
  createToken("CARET", `^${src[t2.LONECARET]}${src[t2.XRANGEPLAIN]}$`);
  createToken("CARETLOOSE", `^${src[t2.LONECARET]}${src[t2.XRANGEPLAINLOOSE]}$`);
  createToken("COMPARATORLOOSE", `^${src[t2.GTLT]}\\s*(${src[t2.LOOSEPLAIN]})$|^$`);
  createToken("COMPARATOR", `^${src[t2.GTLT]}\\s*(${src[t2.FULLPLAIN]})$|^$`);
  createToken("COMPARATORTRIM", `(\\s*)${src[t2.GTLT]}\\s*(${src[t2.LOOSEPLAIN]}|${src[t2.XRANGEPLAIN]})`, true);
  exports$1.comparatorTrimReplace = "$1$2$3";
  createToken("HYPHENRANGE", `^\\s*(${src[t2.XRANGEPLAIN]})\\s+-\\s+(${src[t2.XRANGEPLAIN]})\\s*$`);
  createToken("HYPHENRANGELOOSE", `^\\s*(${src[t2.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t2.XRANGEPLAINLOOSE]})\\s*$`);
  createToken("STAR", "(<|>)?=?\\s*\\*");
  createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
  createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})(re$2, re$2.exports);
var reExports = re$2.exports;
const looseOption = Object.freeze({ loose: true });
const emptyOpts = Object.freeze({});
const parseOptions$1 = (options) => {
  if (!options) {
    return emptyOpts;
  }
  if (typeof options !== "object") {
    return looseOption;
  }
  return options;
};
var parseOptions_1 = parseOptions$1;
const numeric = /^[0-9]+$/;
const compareIdentifiers$1 = (a, b) => {
  if (typeof a === "number" && typeof b === "number") {
    return a === b ? 0 : a < b ? -1 : 1;
  }
  const anum = numeric.test(a);
  const bnum = numeric.test(b);
  if (anum && bnum) {
    a = +a;
    b = +b;
  }
  return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
};
const rcompareIdentifiers = (a, b) => compareIdentifiers$1(b, a);
var identifiers$1 = {
  compareIdentifiers: compareIdentifiers$1,
  rcompareIdentifiers
};
const debug = debug_1;
const { MAX_LENGTH, MAX_SAFE_INTEGER } = constants$1;
const { safeRe: re$1, t: t$1 } = reExports;
const parseOptions = parseOptions_1;
const { compareIdentifiers } = identifiers$1;
let SemVer$d = class SemVer {
  constructor(version, options) {
    options = parseOptions(options);
    if (version instanceof SemVer) {
      if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
        return version;
      } else {
        version = version.version;
      }
    } else if (typeof version !== "string") {
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
    }
    if (version.length > MAX_LENGTH) {
      throw new TypeError(
        `version is longer than ${MAX_LENGTH} characters`
      );
    }
    debug("SemVer", version, options);
    this.options = options;
    this.loose = !!options.loose;
    this.includePrerelease = !!options.includePrerelease;
    const m = version.trim().match(options.loose ? re$1[t$1.LOOSE] : re$1[t$1.FULL]);
    if (!m) {
      throw new TypeError(`Invalid Version: ${version}`);
    }
    this.raw = version;
    this.major = +m[1];
    this.minor = +m[2];
    this.patch = +m[3];
    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
      throw new TypeError("Invalid major version");
    }
    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
      throw new TypeError("Invalid minor version");
    }
    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
      throw new TypeError("Invalid patch version");
    }
    if (!m[4]) {
      this.prerelease = [];
    } else {
      this.prerelease = m[4].split(".").map((id2) => {
        if (/^[0-9]+$/.test(id2)) {
          const num = +id2;
          if (num >= 0 && num < MAX_SAFE_INTEGER) {
            return num;
          }
        }
        return id2;
      });
    }
    this.build = m[5] ? m[5].split(".") : [];
    this.format();
  }
  format() {
    this.version = `${this.major}.${this.minor}.${this.patch}`;
    if (this.prerelease.length) {
      this.version += `-${this.prerelease.join(".")}`;
    }
    return this.version;
  }
  toString() {
    return this.version;
  }
  compare(other) {
    debug("SemVer.compare", this.version, this.options, other);
    if (!(other instanceof SemVer)) {
      if (typeof other === "string" && other === this.version) {
        return 0;
      }
      other = new SemVer(other, this.options);
    }
    if (other.version === this.version) {
      return 0;
    }
    return this.compareMain(other) || this.comparePre(other);
  }
  compareMain(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    if (this.major < other.major) {
      return -1;
    }
    if (this.major > other.major) {
      return 1;
    }
    if (this.minor < other.minor) {
      return -1;
    }
    if (this.minor > other.minor) {
      return 1;
    }
    if (this.patch < other.patch) {
      return -1;
    }
    if (this.patch > other.patch) {
      return 1;
    }
    return 0;
  }
  comparePre(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    if (this.prerelease.length && !other.prerelease.length) {
      return -1;
    } else if (!this.prerelease.length && other.prerelease.length) {
      return 1;
    } else if (!this.prerelease.length && !other.prerelease.length) {
      return 0;
    }
    let i = 0;
    do {
      const a = this.prerelease[i];
      const b = other.prerelease[i];
      debug("prerelease compare", i, a, b);
      if (a === void 0 && b === void 0) {
        return 0;
      } else if (b === void 0) {
        return 1;
      } else if (a === void 0) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers(a, b);
      }
    } while (++i);
  }
  compareBuild(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    let i = 0;
    do {
      const a = this.build[i];
      const b = other.build[i];
      debug("build compare", i, a, b);
      if (a === void 0 && b === void 0) {
        return 0;
      } else if (b === void 0) {
        return 1;
      } else if (a === void 0) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers(a, b);
      }
    } while (++i);
  }
  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc(release, identifier, identifierBase) {
    if (release.startsWith("pre")) {
      if (!identifier && identifierBase === false) {
        throw new Error("invalid increment argument: identifier is empty");
      }
      if (identifier) {
        const match = `-${identifier}`.match(this.options.loose ? re$1[t$1.PRERELEASELOOSE] : re$1[t$1.PRERELEASE]);
        if (!match || match[1] !== identifier) {
          throw new Error(`invalid identifier: ${identifier}`);
        }
      }
    }
    switch (release) {
      case "premajor":
        this.prerelease.length = 0;
        this.patch = 0;
        this.minor = 0;
        this.major++;
        this.inc("pre", identifier, identifierBase);
        break;
      case "preminor":
        this.prerelease.length = 0;
        this.patch = 0;
        this.minor++;
        this.inc("pre", identifier, identifierBase);
        break;
      case "prepatch":
        this.prerelease.length = 0;
        this.inc("patch", identifier, identifierBase);
        this.inc("pre", identifier, identifierBase);
        break;
      case "prerelease":
        if (this.prerelease.length === 0) {
          this.inc("patch", identifier, identifierBase);
        }
        this.inc("pre", identifier, identifierBase);
        break;
      case "release":
        if (this.prerelease.length === 0) {
          throw new Error(`version ${this.raw} is not a prerelease`);
        }
        this.prerelease.length = 0;
        break;
      case "major":
        if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
          this.major++;
        }
        this.minor = 0;
        this.patch = 0;
        this.prerelease = [];
        break;
      case "minor":
        if (this.patch !== 0 || this.prerelease.length === 0) {
          this.minor++;
        }
        this.patch = 0;
        this.prerelease = [];
        break;
      case "patch":
        if (this.prerelease.length === 0) {
          this.patch++;
        }
        this.prerelease = [];
        break;
      case "pre": {
        const base = Number(identifierBase) ? 1 : 0;
        if (this.prerelease.length === 0) {
          this.prerelease = [base];
        } else {
          let i = this.prerelease.length;
          while (--i >= 0) {
            if (typeof this.prerelease[i] === "number") {
              this.prerelease[i]++;
              i = -2;
            }
          }
          if (i === -1) {
            if (identifier === this.prerelease.join(".") && identifierBase === false) {
              throw new Error("invalid increment argument: identifier already exists");
            }
            this.prerelease.push(base);
          }
        }
        if (identifier) {
          let prerelease2 = [identifier, base];
          if (identifierBase === false) {
            prerelease2 = [identifier];
          }
          if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
            if (isNaN(this.prerelease[1])) {
              this.prerelease = prerelease2;
            }
          } else {
            this.prerelease = prerelease2;
          }
        }
        break;
      }
      default:
        throw new Error(`invalid increment argument: ${release}`);
    }
    this.raw = this.format();
    if (this.build.length) {
      this.raw += `+${this.build.join(".")}`;
    }
    return this;
  }
};
var semver$2 = SemVer$d;
const SemVer$c = semver$2;
const parse$6 = (version, options, throwErrors = false) => {
  if (version instanceof SemVer$c) {
    return version;
  }
  try {
    return new SemVer$c(version, options);
  } catch (er) {
    if (!throwErrors) {
      return null;
    }
    throw er;
  }
};
var parse_1 = parse$6;
const parse$5 = parse_1;
const valid$2 = (version, options) => {
  const v = parse$5(version, options);
  return v ? v.version : null;
};
var valid_1 = valid$2;
const parse$4 = parse_1;
const clean$1 = (version, options) => {
  const s = parse$4(version.trim().replace(/^[=v]+/, ""), options);
  return s ? s.version : null;
};
var clean_1 = clean$1;
const SemVer$b = semver$2;
const inc$1 = (version, release, options, identifier, identifierBase) => {
  if (typeof options === "string") {
    identifierBase = identifier;
    identifier = options;
    options = void 0;
  }
  try {
    return new SemVer$b(
      version instanceof SemVer$b ? version.version : version,
      options
    ).inc(release, identifier, identifierBase).version;
  } catch (er) {
    return null;
  }
};
var inc_1 = inc$1;
const parse$3 = parse_1;
const diff$1 = (version1, version2) => {
  const v1 = parse$3(version1, null, true);
  const v2 = parse$3(version2, null, true);
  const comparison = v1.compare(v2);
  if (comparison === 0) {
    return null;
  }
  const v1Higher = comparison > 0;
  const highVersion = v1Higher ? v1 : v2;
  const lowVersion = v1Higher ? v2 : v1;
  const highHasPre = !!highVersion.prerelease.length;
  const lowHasPre = !!lowVersion.prerelease.length;
  if (lowHasPre && !highHasPre) {
    if (!lowVersion.patch && !lowVersion.minor) {
      return "major";
    }
    if (lowVersion.compareMain(highVersion) === 0) {
      if (lowVersion.minor && !lowVersion.patch) {
        return "minor";
      }
      return "patch";
    }
  }
  const prefix = highHasPre ? "pre" : "";
  if (v1.major !== v2.major) {
    return prefix + "major";
  }
  if (v1.minor !== v2.minor) {
    return prefix + "minor";
  }
  if (v1.patch !== v2.patch) {
    return prefix + "patch";
  }
  return "prerelease";
};
var diff_1 = diff$1;
const SemVer$a = semver$2;
const major$1 = (a, loose) => new SemVer$a(a, loose).major;
var major_1 = major$1;
const SemVer$9 = semver$2;
const minor$1 = (a, loose) => new SemVer$9(a, loose).minor;
var minor_1 = minor$1;
const SemVer$8 = semver$2;
const patch$1 = (a, loose) => new SemVer$8(a, loose).patch;
var patch_1 = patch$1;
const parse$2 = parse_1;
const prerelease$1 = (version, options) => {
  const parsed = parse$2(version, options);
  return parsed && parsed.prerelease.length ? parsed.prerelease : null;
};
var prerelease_1 = prerelease$1;
const SemVer$7 = semver$2;
const compare$b = (a, b, loose) => new SemVer$7(a, loose).compare(new SemVer$7(b, loose));
var compare_1 = compare$b;
const compare$a = compare_1;
const rcompare$1 = (a, b, loose) => compare$a(b, a, loose);
var rcompare_1 = rcompare$1;
const compare$9 = compare_1;
const compareLoose$1 = (a, b) => compare$9(a, b, true);
var compareLoose_1 = compareLoose$1;
const SemVer$6 = semver$2;
const compareBuild$3 = (a, b, loose) => {
  const versionA = new SemVer$6(a, loose);
  const versionB = new SemVer$6(b, loose);
  return versionA.compare(versionB) || versionA.compareBuild(versionB);
};
var compareBuild_1 = compareBuild$3;
const compareBuild$2 = compareBuild_1;
const sort$1 = (list, loose) => list.sort((a, b) => compareBuild$2(a, b, loose));
var sort_1 = sort$1;
const compareBuild$1 = compareBuild_1;
const rsort$1 = (list, loose) => list.sort((a, b) => compareBuild$1(b, a, loose));
var rsort_1 = rsort$1;
const compare$8 = compare_1;
const gt$4 = (a, b, loose) => compare$8(a, b, loose) > 0;
var gt_1 = gt$4;
const compare$7 = compare_1;
const lt$3 = (a, b, loose) => compare$7(a, b, loose) < 0;
var lt_1 = lt$3;
const compare$6 = compare_1;
const eq$2 = (a, b, loose) => compare$6(a, b, loose) === 0;
var eq_1 = eq$2;
const compare$5 = compare_1;
const neq$2 = (a, b, loose) => compare$5(a, b, loose) !== 0;
var neq_1 = neq$2;
const compare$4 = compare_1;
const gte$3 = (a, b, loose) => compare$4(a, b, loose) >= 0;
var gte_1 = gte$3;
const compare$3 = compare_1;
const lte$3 = (a, b, loose) => compare$3(a, b, loose) <= 0;
var lte_1 = lte$3;
const eq$1 = eq_1;
const neq$1 = neq_1;
const gt$3 = gt_1;
const gte$2 = gte_1;
const lt$2 = lt_1;
const lte$2 = lte_1;
const cmp$1 = (a, op, b, loose) => {
  switch (op) {
    case "===":
      if (typeof a === "object") {
        a = a.version;
      }
      if (typeof b === "object") {
        b = b.version;
      }
      return a === b;
    case "!==":
      if (typeof a === "object") {
        a = a.version;
      }
      if (typeof b === "object") {
        b = b.version;
      }
      return a !== b;
    case "":
    case "=":
    case "==":
      return eq$1(a, b, loose);
    case "!=":
      return neq$1(a, b, loose);
    case ">":
      return gt$3(a, b, loose);
    case ">=":
      return gte$2(a, b, loose);
    case "<":
      return lt$2(a, b, loose);
    case "<=":
      return lte$2(a, b, loose);
    default:
      throw new TypeError(`Invalid operator: ${op}`);
  }
};
var cmp_1 = cmp$1;
const SemVer$5 = semver$2;
const parse$1 = parse_1;
const { safeRe: re, t } = reExports;
const coerce$1 = (version, options) => {
  if (version instanceof SemVer$5) {
    return version;
  }
  if (typeof version === "number") {
    version = String(version);
  }
  if (typeof version !== "string") {
    return null;
  }
  options = options || {};
  let match = null;
  if (!options.rtl) {
    match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
  } else {
    const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
    let next2;
    while ((next2 = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
      if (!match || next2.index + next2[0].length !== match.index + match[0].length) {
        match = next2;
      }
      coerceRtlRegex.lastIndex = next2.index + next2[1].length + next2[2].length;
    }
    coerceRtlRegex.lastIndex = -1;
  }
  if (match === null) {
    return null;
  }
  const major2 = match[2];
  const minor2 = match[3] || "0";
  const patch2 = match[4] || "0";
  const prerelease2 = options.includePrerelease && match[5] ? `-${match[5]}` : "";
  const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
  return parse$1(`${major2}.${minor2}.${patch2}${prerelease2}${build}`, options);
};
var coerce_1 = coerce$1;
class LRUCache {
  constructor() {
    this.max = 1e3;
    this.map = /* @__PURE__ */ new Map();
  }
  get(key) {
    const value = this.map.get(key);
    if (value === void 0) {
      return void 0;
    } else {
      this.map.delete(key);
      this.map.set(key, value);
      return value;
    }
  }
  delete(key) {
    return this.map.delete(key);
  }
  set(key, value) {
    const deleted = this.delete(key);
    if (!deleted && value !== void 0) {
      if (this.map.size >= this.max) {
        const firstKey = this.map.keys().next().value;
        this.delete(firstKey);
      }
      this.map.set(key, value);
    }
    return this;
  }
}
var lrucache = LRUCache;
var range;
var hasRequiredRange;
function requireRange() {
  if (hasRequiredRange) return range;
  hasRequiredRange = 1;
  const SPACE_CHARACTERS = /\s+/g;
  class Range2 {
    constructor(range2, options) {
      options = parseOptions2(options);
      if (range2 instanceof Range2) {
        if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) {
          return range2;
        } else {
          return new Range2(range2.raw, options);
        }
      }
      if (range2 instanceof Comparator2) {
        this.raw = range2.value;
        this.set = [[range2]];
        this.formatted = void 0;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range2.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
      if (!this.set.length) {
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      }
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) {
          this.set = [first];
        } else if (this.set.length > 1) {
          for (const c of this.set) {
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
          }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) {
            this.formatted += "||";
          }
          const comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) {
              this.formatted += " ";
            }
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range2) {
      const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
      const memoKey = memoOpts + ":" + range2;
      const cached = cache.get(memoKey);
      if (cached) {
        return cached;
      }
      const loose = this.options.loose;
      const hr = loose ? re2[t2.HYPHENRANGELOOSE] : re2[t2.HYPHENRANGE];
      range2 = range2.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug2("hyphen replace", range2);
      range2 = range2.replace(re2[t2.COMPARATORTRIM], comparatorTrimReplace);
      debug2("comparator trim", range2);
      range2 = range2.replace(re2[t2.TILDETRIM], tildeTrimReplace);
      debug2("tilde trim", range2);
      range2 = range2.replace(re2[t2.CARETTRIM], caretTrimReplace);
      debug2("caret trim", range2);
      let rangeList = range2.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
      if (loose) {
        rangeList = rangeList.filter((comp) => {
          debug2("loose invalid filter", comp, this.options);
          return !!comp.match(re2[t2.COMPARATORLOOSE]);
        });
      }
      debug2("range list", rangeList);
      const rangeMap = /* @__PURE__ */ new Map();
      const comparators = rangeList.map((comp) => new Comparator2(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) {
          return [comp];
        }
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) {
        rangeMap.delete("");
      }
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range2, options) {
      if (!(range2 instanceof Range2)) {
        throw new TypeError("a Range is required");
      }
      return this.set.some((thisComparators) => {
        return isSatisfiable(thisComparators, options) && range2.set.some((rangeComparators) => {
          return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
            return rangeComparators.every((rangeComparator) => {
              return thisComparator.intersects(rangeComparator, options);
            });
          });
        });
      });
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(version) {
      if (!version) {
        return false;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer3(version, this.options);
        } catch (er) {
          return false;
        }
      }
      for (let i = 0; i < this.set.length; i++) {
        if (testSet(this.set[i], version, this.options)) {
          return true;
        }
      }
      return false;
    }
  }
  range = Range2;
  const LRU = lrucache;
  const cache = new LRU();
  const parseOptions2 = parseOptions_1;
  const Comparator2 = requireComparator();
  const debug2 = debug_1;
  const SemVer3 = semver$2;
  const {
    safeRe: re2,
    t: t2,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace
  } = reExports;
  const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = constants$1;
  const isNullSet = (c) => c.value === "<0.0.0-0";
  const isAny = (c) => c.value === "";
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    comp = comp.replace(re2[t2.BUILD], "");
    debug2("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug2("caret", comp);
    comp = replaceTildes(comp, options);
    debug2("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug2("xrange", comp);
    comp = replaceStars(comp, options);
    debug2("stars", comp);
    return comp;
  };
  const isX = (id2) => !id2 || id2.toLowerCase() === "x" || id2 === "*";
  const replaceTildes = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
  };
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re2[t2.TILDELOOSE] : re2[t2.TILDE];
    return comp.replace(r, (_, M, m, p, pr) => {
      debug2("tilde", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
      } else if (pr) {
        debug2("replaceTilde pr", pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else {
        ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      }
      debug2("tilde return", ret);
      return ret;
    });
  };
  const replaceCarets = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
  };
  const replaceCaret = (comp, options) => {
    debug2("caret", comp, options);
    const r = options.loose ? re2[t2.CARETLOOSE] : re2[t2.CARET];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug2("caret", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        if (M === "0") {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
        }
      } else if (pr) {
        debug2("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
        }
      } else {
        debug2("no pr");
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
        }
      }
      debug2("caret return", ret);
      return ret;
    });
  };
  const replaceXRanges = (comp, options) => {
    debug2("replaceXRanges", comp, options);
    return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re2[t2.XRANGELOOSE] : re2[t2.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
      debug2("xRange", comp, ret, gtlt, M, m, p, pr);
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) {
        gtlt = "";
      }
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") {
          ret = "<0.0.0-0";
        } else {
          ret = "*";
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) {
            M = +M + 1;
          } else {
            m = +m + 1;
          }
        }
        if (gtlt === "<") {
          pr = "-0";
        }
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) {
        ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      } else if (xp) {
        ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      }
      debug2("xRange return", ret);
      return ret;
    });
  };
  const replaceStars = (comp, options) => {
    debug2("replaceStars", comp, options);
    return comp.trim().replace(re2[t2.STAR], "");
  };
  const replaceGTE0 = (comp, options) => {
    debug2("replaceGTE0", comp, options);
    return comp.trim().replace(re2[options.includePrerelease ? t2.GTE0PRE : t2.GTE0], "");
  };
  const hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) {
      from = "";
    } else if (isX(fm)) {
      from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    } else if (isX(fp)) {
      from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    } else if (fpr) {
      from = `>=${from}`;
    } else {
      from = `>=${from}${incPr ? "-0" : ""}`;
    }
    if (isX(tM)) {
      to = "";
    } else if (isX(tm)) {
      to = `<${+tM + 1}.0.0-0`;
    } else if (isX(tp)) {
      to = `<${tM}.${+tm + 1}.0-0`;
    } else if (tpr) {
      to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else if (incPr) {
      to = `<${tM}.${tm}.${+tp + 1}-0`;
    } else {
      to = `<=${to}`;
    }
    return `${from} ${to}`.trim();
  };
  const testSet = (set, version, options) => {
    for (let i = 0; i < set.length; i++) {
      if (!set[i].test(version)) {
        return false;
      }
    }
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug2(set[i].semver);
        if (set[i].semver === Comparator2.ANY) {
          continue;
        }
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  };
  return range;
}
var comparator;
var hasRequiredComparator;
function requireComparator() {
  if (hasRequiredComparator) return comparator;
  hasRequiredComparator = 1;
  const ANY2 = Symbol("SemVer ANY");
  class Comparator2 {
    static get ANY() {
      return ANY2;
    }
    constructor(comp, options) {
      options = parseOptions2(options);
      if (comp instanceof Comparator2) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug2("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY2) {
        this.value = "";
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug2("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re2[t2.COMPARATORLOOSE] : re2[t2.COMPARATOR];
      const m = comp.match(r);
      if (!m) {
        throw new TypeError(`Invalid comparator: ${comp}`);
      }
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") {
        this.operator = "";
      }
      if (!m[2]) {
        this.semver = ANY2;
      } else {
        this.semver = new SemVer3(m[2], this.options.loose);
      }
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug2("Comparator.test", version, this.options.loose);
      if (this.semver === ANY2 || version === ANY2) {
        return true;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer3(version, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp2(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator2)) {
        throw new TypeError("a Comparator is required");
      }
      if (this.operator === "") {
        if (this.value === "") {
          return true;
        }
        return new Range2(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") {
          return true;
        }
        return new Range2(this.value, options).test(comp.semver);
      }
      options = parseOptions2(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
        return false;
      }
      if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
        return false;
      }
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
        return true;
      }
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
        return true;
      }
      if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
        return true;
      }
      if (cmp2(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
        return true;
      }
      if (cmp2(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
        return true;
      }
      return false;
    }
  }
  comparator = Comparator2;
  const parseOptions2 = parseOptions_1;
  const { safeRe: re2, t: t2 } = reExports;
  const cmp2 = cmp_1;
  const debug2 = debug_1;
  const SemVer3 = semver$2;
  const Range2 = requireRange();
  return comparator;
}
const Range$9 = requireRange();
const satisfies$4 = (version, range2, options) => {
  try {
    range2 = new Range$9(range2, options);
  } catch (er) {
    return false;
  }
  return range2.test(version);
};
var satisfies_1 = satisfies$4;
const Range$8 = requireRange();
const toComparators$1 = (range2, options) => new Range$8(range2, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
var toComparators_1 = toComparators$1;
const SemVer$4 = semver$2;
const Range$7 = requireRange();
const maxSatisfying$1 = (versions, range2, options) => {
  let max = null;
  let maxSV = null;
  let rangeObj = null;
  try {
    rangeObj = new Range$7(range2, options);
  } catch (er) {
    return null;
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      if (!max || maxSV.compare(v) === -1) {
        max = v;
        maxSV = new SemVer$4(max, options);
      }
    }
  });
  return max;
};
var maxSatisfying_1 = maxSatisfying$1;
const SemVer$3 = semver$2;
const Range$6 = requireRange();
const minSatisfying$1 = (versions, range2, options) => {
  let min = null;
  let minSV = null;
  let rangeObj = null;
  try {
    rangeObj = new Range$6(range2, options);
  } catch (er) {
    return null;
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      if (!min || minSV.compare(v) === 1) {
        min = v;
        minSV = new SemVer$3(min, options);
      }
    }
  });
  return min;
};
var minSatisfying_1 = minSatisfying$1;
const SemVer$2 = semver$2;
const Range$5 = requireRange();
const gt$2 = gt_1;
const minVersion$1 = (range2, loose) => {
  range2 = new Range$5(range2, loose);
  let minver = new SemVer$2("0.0.0");
  if (range2.test(minver)) {
    return minver;
  }
  minver = new SemVer$2("0.0.0-0");
  if (range2.test(minver)) {
    return minver;
  }
  minver = null;
  for (let i = 0; i < range2.set.length; ++i) {
    const comparators = range2.set[i];
    let setMin = null;
    comparators.forEach((comparator2) => {
      const compver = new SemVer$2(comparator2.semver.version);
      switch (comparator2.operator) {
        case ">":
          if (compver.prerelease.length === 0) {
            compver.patch++;
          } else {
            compver.prerelease.push(0);
          }
          compver.raw = compver.format();
        case "":
        case ">=":
          if (!setMin || gt$2(compver, setMin)) {
            setMin = compver;
          }
          break;
        case "<":
        case "<=":
          break;
        default:
          throw new Error(`Unexpected operation: ${comparator2.operator}`);
      }
    });
    if (setMin && (!minver || gt$2(minver, setMin))) {
      minver = setMin;
    }
  }
  if (minver && range2.test(minver)) {
    return minver;
  }
  return null;
};
var minVersion_1 = minVersion$1;
const Range$4 = requireRange();
const validRange$1 = (range2, options) => {
  try {
    return new Range$4(range2, options).range || "*";
  } catch (er) {
    return null;
  }
};
var valid$1 = validRange$1;
const SemVer$1 = semver$2;
const Comparator$2 = requireComparator();
const { ANY: ANY$1 } = Comparator$2;
const Range$3 = requireRange();
const satisfies$3 = satisfies_1;
const gt$1 = gt_1;
const lt$1 = lt_1;
const lte$1 = lte_1;
const gte$1 = gte_1;
const outside$3 = (version, range2, hilo, options) => {
  version = new SemVer$1(version, options);
  range2 = new Range$3(range2, options);
  let gtfn, ltefn, ltfn, comp, ecomp;
  switch (hilo) {
    case ">":
      gtfn = gt$1;
      ltefn = lte$1;
      ltfn = lt$1;
      comp = ">";
      ecomp = ">=";
      break;
    case "<":
      gtfn = lt$1;
      ltefn = gte$1;
      ltfn = gt$1;
      comp = "<";
      ecomp = "<=";
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (satisfies$3(version, range2, options)) {
    return false;
  }
  for (let i = 0; i < range2.set.length; ++i) {
    const comparators = range2.set[i];
    let high = null;
    let low = null;
    comparators.forEach((comparator2) => {
      if (comparator2.semver === ANY$1) {
        comparator2 = new Comparator$2(">=0.0.0");
      }
      high = high || comparator2;
      low = low || comparator2;
      if (gtfn(comparator2.semver, high.semver, options)) {
        high = comparator2;
      } else if (ltfn(comparator2.semver, low.semver, options)) {
        low = comparator2;
      }
    });
    if (high.operator === comp || high.operator === ecomp) {
      return false;
    }
    if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
      return false;
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false;
    }
  }
  return true;
};
var outside_1 = outside$3;
const outside$2 = outside_1;
const gtr$1 = (version, range2, options) => outside$2(version, range2, ">", options);
var gtr_1 = gtr$1;
const outside$1 = outside_1;
const ltr$1 = (version, range2, options) => outside$1(version, range2, "<", options);
var ltr_1 = ltr$1;
const Range$2 = requireRange();
const intersects$1 = (r1, r2, options) => {
  r1 = new Range$2(r1, options);
  r2 = new Range$2(r2, options);
  return r1.intersects(r2, options);
};
var intersects_1 = intersects$1;
const satisfies$2 = satisfies_1;
const compare$2 = compare_1;
var simplify = (versions, range2, options) => {
  const set = [];
  let first = null;
  let prev = null;
  const v = versions.sort((a, b) => compare$2(a, b, options));
  for (const version of v) {
    const included = satisfies$2(version, range2, options);
    if (included) {
      prev = version;
      if (!first) {
        first = version;
      }
    } else {
      if (prev) {
        set.push([first, prev]);
      }
      prev = null;
      first = null;
    }
  }
  if (first) {
    set.push([first, null]);
  }
  const ranges = [];
  for (const [min, max] of set) {
    if (min === max) {
      ranges.push(min);
    } else if (!max && min === v[0]) {
      ranges.push("*");
    } else if (!max) {
      ranges.push(`>=${min}`);
    } else if (min === v[0]) {
      ranges.push(`<=${max}`);
    } else {
      ranges.push(`${min} - ${max}`);
    }
  }
  const simplified = ranges.join(" || ");
  const original = typeof range2.raw === "string" ? range2.raw : String(range2);
  return simplified.length < original.length ? simplified : range2;
};
const Range$1 = requireRange();
const Comparator$1 = requireComparator();
const { ANY } = Comparator$1;
const satisfies$1 = satisfies_1;
const compare$1 = compare_1;
const subset$1 = (sub, dom, options = {}) => {
  if (sub === dom) {
    return true;
  }
  sub = new Range$1(sub, options);
  dom = new Range$1(dom, options);
  let sawNonNull = false;
  OUTER: for (const simpleSub of sub.set) {
    for (const simpleDom of dom.set) {
      const isSub = simpleSubset(simpleSub, simpleDom, options);
      sawNonNull = sawNonNull || isSub !== null;
      if (isSub) {
        continue OUTER;
      }
    }
    if (sawNonNull) {
      return false;
    }
  }
  return true;
};
const minimumVersionWithPreRelease = [new Comparator$1(">=0.0.0-0")];
const minimumVersion = [new Comparator$1(">=0.0.0")];
const simpleSubset = (sub, dom, options) => {
  if (sub === dom) {
    return true;
  }
  if (sub.length === 1 && sub[0].semver === ANY) {
    if (dom.length === 1 && dom[0].semver === ANY) {
      return true;
    } else if (options.includePrerelease) {
      sub = minimumVersionWithPreRelease;
    } else {
      sub = minimumVersion;
    }
  }
  if (dom.length === 1 && dom[0].semver === ANY) {
    if (options.includePrerelease) {
      return true;
    } else {
      dom = minimumVersion;
    }
  }
  const eqSet = /* @__PURE__ */ new Set();
  let gt2, lt2;
  for (const c of sub) {
    if (c.operator === ">" || c.operator === ">=") {
      gt2 = higherGT(gt2, c, options);
    } else if (c.operator === "<" || c.operator === "<=") {
      lt2 = lowerLT(lt2, c, options);
    } else {
      eqSet.add(c.semver);
    }
  }
  if (eqSet.size > 1) {
    return null;
  }
  let gtltComp;
  if (gt2 && lt2) {
    gtltComp = compare$1(gt2.semver, lt2.semver, options);
    if (gtltComp > 0) {
      return null;
    } else if (gtltComp === 0 && (gt2.operator !== ">=" || lt2.operator !== "<=")) {
      return null;
    }
  }
  for (const eq2 of eqSet) {
    if (gt2 && !satisfies$1(eq2, String(gt2), options)) {
      return null;
    }
    if (lt2 && !satisfies$1(eq2, String(lt2), options)) {
      return null;
    }
    for (const c of dom) {
      if (!satisfies$1(eq2, String(c), options)) {
        return false;
      }
    }
    return true;
  }
  let higher, lower;
  let hasDomLT, hasDomGT;
  let needDomLTPre = lt2 && !options.includePrerelease && lt2.semver.prerelease.length ? lt2.semver : false;
  let needDomGTPre = gt2 && !options.includePrerelease && gt2.semver.prerelease.length ? gt2.semver : false;
  if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt2.operator === "<" && needDomLTPre.prerelease[0] === 0) {
    needDomLTPre = false;
  }
  for (const c of dom) {
    hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
    hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
    if (gt2) {
      if (needDomGTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
          needDomGTPre = false;
        }
      }
      if (c.operator === ">" || c.operator === ">=") {
        higher = higherGT(gt2, c, options);
        if (higher === c && higher !== gt2) {
          return false;
        }
      } else if (gt2.operator === ">=" && !satisfies$1(gt2.semver, String(c), options)) {
        return false;
      }
    }
    if (lt2) {
      if (needDomLTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
          needDomLTPre = false;
        }
      }
      if (c.operator === "<" || c.operator === "<=") {
        lower = lowerLT(lt2, c, options);
        if (lower === c && lower !== lt2) {
          return false;
        }
      } else if (lt2.operator === "<=" && !satisfies$1(lt2.semver, String(c), options)) {
        return false;
      }
    }
    if (!c.operator && (lt2 || gt2) && gtltComp !== 0) {
      return false;
    }
  }
  if (gt2 && hasDomLT && !lt2 && gtltComp !== 0) {
    return false;
  }
  if (lt2 && hasDomGT && !gt2 && gtltComp !== 0) {
    return false;
  }
  if (needDomGTPre || needDomLTPre) {
    return false;
  }
  return true;
};
const higherGT = (a, b, options) => {
  if (!a) {
    return b;
  }
  const comp = compare$1(a.semver, b.semver, options);
  return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
};
const lowerLT = (a, b, options) => {
  if (!a) {
    return b;
  }
  const comp = compare$1(a.semver, b.semver, options);
  return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
};
var subset_1 = subset$1;
const internalRe = reExports;
const constants = constants$1;
const SemVer2 = semver$2;
const identifiers = identifiers$1;
const parse = parse_1;
const valid = valid_1;
const clean = clean_1;
const inc = inc_1;
const diff = diff_1;
const major = major_1;
const minor = minor_1;
const patch = patch_1;
const prerelease = prerelease_1;
const compare = compare_1;
const rcompare = rcompare_1;
const compareLoose = compareLoose_1;
const compareBuild = compareBuild_1;
const sort = sort_1;
const rsort = rsort_1;
const gt = gt_1;
const lt = lt_1;
const eq = eq_1;
const neq = neq_1;
const gte = gte_1;
const lte = lte_1;
const cmp = cmp_1;
const coerce = coerce_1;
const Comparator = requireComparator();
const Range = requireRange();
const satisfies = satisfies_1;
const toComparators = toComparators_1;
const maxSatisfying = maxSatisfying_1;
const minSatisfying = minSatisfying_1;
const minVersion = minVersion_1;
const validRange = valid$1;
const outside = outside_1;
const gtr = gtr_1;
const ltr = ltr_1;
const intersects = intersects_1;
const simplifyRange = simplify;
const subset = subset_1;
var semver = {
  parse,
  valid,
  clean,
  inc,
  diff,
  major,
  minor,
  patch,
  prerelease,
  compare,
  rcompare,
  compareLoose,
  compareBuild,
  sort,
  rsort,
  gt,
  lt,
  eq,
  neq,
  gte,
  lte,
  cmp,
  coerce,
  Comparator,
  Range,
  satisfies,
  toComparators,
  maxSatisfying,
  minSatisfying,
  minVersion,
  validRange,
  outside,
  gtr,
  ltr,
  intersects,
  simplifyRange,
  subset,
  SemVer: SemVer2,
  re: internalRe.re,
  src: internalRe.src,
  tokens: internalRe.t,
  SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: constants.RELEASE_TYPES,
  compareIdentifiers: identifiers.compareIdentifiers,
  rcompareIdentifiers: identifiers.rcompareIdentifiers
};
const semver$1 = /* @__PURE__ */ getDefaultExportFromCjs(semver);
const objectToString = Object.prototype.toString;
const uint8ArrayStringified = "[object Uint8Array]";
const arrayBufferStringified = "[object ArrayBuffer]";
function isType(value, typeConstructor, typeStringified) {
  if (!value) {
    return false;
  }
  if (value.constructor === typeConstructor) {
    return true;
  }
  return objectToString.call(value) === typeStringified;
}
function isUint8Array(value) {
  return isType(value, Uint8Array, uint8ArrayStringified);
}
function isArrayBuffer(value) {
  return isType(value, ArrayBuffer, arrayBufferStringified);
}
function isUint8ArrayOrArrayBuffer(value) {
  return isUint8Array(value) || isArrayBuffer(value);
}
function assertUint8Array(value) {
  if (!isUint8Array(value)) {
    throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof value}\``);
  }
}
function assertUint8ArrayOrArrayBuffer(value) {
  if (!isUint8ArrayOrArrayBuffer(value)) {
    throw new TypeError(`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof value}\``);
  }
}
function concatUint8Arrays(arrays, totalLength) {
  if (arrays.length === 0) {
    return new Uint8Array(0);
  }
  totalLength ?? (totalLength = arrays.reduce((accumulator, currentValue) => accumulator + currentValue.length, 0));
  const returnValue = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of arrays) {
    assertUint8Array(array);
    returnValue.set(array, offset);
    offset += array.length;
  }
  return returnValue;
}
const cachedDecoders = {
  utf8: new globalThis.TextDecoder("utf8")
};
function uint8ArrayToString(array, encoding = "utf8") {
  assertUint8ArrayOrArrayBuffer(array);
  cachedDecoders[encoding] ?? (cachedDecoders[encoding] = new globalThis.TextDecoder(encoding));
  return cachedDecoders[encoding].decode(array);
}
function assertString(value) {
  if (typeof value !== "string") {
    throw new TypeError(`Expected \`string\`, got \`${typeof value}\``);
  }
}
const cachedEncoder = new globalThis.TextEncoder();
function stringToUint8Array(string) {
  assertString(string);
  return cachedEncoder.encode(string);
}
Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, "0"));
const encryptionAlgorithm = "aes-256-cbc";
const createPlainObject = () => /* @__PURE__ */ Object.create(null);
const isExist = (data) => data !== void 0;
const checkValueType = (key, value) => {
  const nonJsonTypes = /* @__PURE__ */ new Set([
    "undefined",
    "symbol",
    "function"
  ]);
  const type2 = typeof value;
  if (nonJsonTypes.has(type2)) {
    throw new TypeError(`Setting a value of type \`${type2}\` for key \`${key}\` is not allowed as it's not supported by JSON`);
  }
};
const INTERNAL_KEY = "__internal__";
const MIGRATION_KEY = `${INTERNAL_KEY}.migrations.version`;
class Conf {
  constructor(partialOptions = {}) {
    __privateAdd(this, _Conf_instances);
    __publicField(this, "path");
    __publicField(this, "events");
    __privateAdd(this, _validator);
    __privateAdd(this, _encryptionKey);
    __privateAdd(this, _options);
    __privateAdd(this, _defaultValues, {});
    __privateAdd(this, _isInMigration, false);
    __privateAdd(this, _watcher);
    __privateAdd(this, _watchFile);
    __privateAdd(this, _debouncedChangeHandler);
    __publicField(this, "_deserialize", (value) => JSON.parse(value));
    __publicField(this, "_serialize", (value) => JSON.stringify(value, void 0, "	"));
    const options = __privateMethod(this, _Conf_instances, prepareOptions_fn).call(this, partialOptions);
    __privateSet(this, _options, options);
    __privateMethod(this, _Conf_instances, setupValidator_fn).call(this, options);
    __privateMethod(this, _Conf_instances, applyDefaultValues_fn).call(this, options);
    __privateMethod(this, _Conf_instances, configureSerialization_fn).call(this, options);
    this.events = new EventTarget();
    __privateSet(this, _encryptionKey, options.encryptionKey);
    this.path = __privateMethod(this, _Conf_instances, resolvePath_fn).call(this, options);
    __privateMethod(this, _Conf_instances, initializeStore_fn).call(this, options);
    if (options.watch) {
      this._watch();
    }
  }
  get(key, defaultValue) {
    if (__privateGet(this, _options).accessPropertiesByDotNotation) {
      return this._get(key, defaultValue);
    }
    const { store: store2 } = this;
    return key in store2 ? store2[key] : defaultValue;
  }
  set(key, value) {
    if (typeof key !== "string" && typeof key !== "object") {
      throw new TypeError(`Expected \`key\` to be of type \`string\` or \`object\`, got ${typeof key}`);
    }
    if (typeof key !== "object" && value === void 0) {
      throw new TypeError("Use `delete()` to clear values");
    }
    if (this._containsReservedKey(key)) {
      throw new TypeError(`Please don't use the ${INTERNAL_KEY} key, as it's used to manage this module internal operations.`);
    }
    const { store: store2 } = this;
    const set = (key2, value2) => {
      checkValueType(key2, value2);
      if (__privateGet(this, _options).accessPropertiesByDotNotation) {
        setProperty(store2, key2, value2);
      } else {
        if (key2 === "__proto__" || key2 === "constructor" || key2 === "prototype") {
          return;
        }
        store2[key2] = value2;
      }
    };
    if (typeof key === "object") {
      const object = key;
      for (const [key2, value2] of Object.entries(object)) {
        set(key2, value2);
      }
    } else {
      set(key, value);
    }
    this.store = store2;
  }
  has(key) {
    if (__privateGet(this, _options).accessPropertiesByDotNotation) {
      return hasProperty(this.store, key);
    }
    return key in this.store;
  }
  appendToArray(key, value) {
    checkValueType(key, value);
    const array = __privateGet(this, _options).accessPropertiesByDotNotation ? this._get(key, []) : key in this.store ? this.store[key] : [];
    if (!Array.isArray(array)) {
      throw new TypeError(`The key \`${key}\` is already set to a non-array value`);
    }
    this.set(key, [...array, value]);
  }
  /**
      Reset items to their default values, as defined by the `defaults` or `schema` option.
  
      @see `clear()` to reset all items.
  
      @param keys - The keys of the items to reset.
      */
  reset(...keys) {
    for (const key of keys) {
      if (isExist(__privateGet(this, _defaultValues)[key])) {
        this.set(key, __privateGet(this, _defaultValues)[key]);
      }
    }
  }
  delete(key) {
    const { store: store2 } = this;
    if (__privateGet(this, _options).accessPropertiesByDotNotation) {
      deleteProperty(store2, key);
    } else {
      delete store2[key];
    }
    this.store = store2;
  }
  /**
      Delete all items.
  
      This resets known items to their default values, if defined by the `defaults` or `schema` option.
      */
  clear() {
    const newStore = createPlainObject();
    for (const key of Object.keys(__privateGet(this, _defaultValues))) {
      if (isExist(__privateGet(this, _defaultValues)[key])) {
        checkValueType(key, __privateGet(this, _defaultValues)[key]);
        if (__privateGet(this, _options).accessPropertiesByDotNotation) {
          setProperty(newStore, key, __privateGet(this, _defaultValues)[key]);
        } else {
          newStore[key] = __privateGet(this, _defaultValues)[key];
        }
      }
    }
    this.store = newStore;
  }
  onDidChange(key, callback) {
    if (typeof key !== "string") {
      throw new TypeError(`Expected \`key\` to be of type \`string\`, got ${typeof key}`);
    }
    if (typeof callback !== "function") {
      throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof callback}`);
    }
    return this._handleValueChange(() => this.get(key), callback);
  }
  /**
      Watches the whole config object, calling `callback` on any changes.
  
      @param callback - A callback function that is called on any changes. When a `key` is first set `oldValue` will be `undefined`, and when a key is deleted `newValue` will be `undefined`.
      @returns A function, that when called, will unsubscribe.
      */
  onDidAnyChange(callback) {
    if (typeof callback !== "function") {
      throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof callback}`);
    }
    return this._handleStoreChange(callback);
  }
  get size() {
    const entries = Object.keys(this.store);
    return entries.filter((key) => !this._isReservedKeyPath(key)).length;
  }
  /**
      Get all the config as an object or replace the current config with an object.
  
      @example
      ```
      console.log(config.store);
      //=> {name: 'John', age: 30}
      ```
  
      @example
      ```
      config.store = {
          hello: 'world'
      };
      ```
      */
  get store() {
    var _a;
    try {
      const data = fs.readFileSync(this.path, __privateGet(this, _encryptionKey) ? null : "utf8");
      const dataString = this._decryptData(data);
      const deserializedData = this._deserialize(dataString);
      if (!__privateGet(this, _isInMigration)) {
        this._validate(deserializedData);
      }
      return Object.assign(createPlainObject(), deserializedData);
    } catch (error2) {
      if ((error2 == null ? void 0 : error2.code) === "ENOENT") {
        this._ensureDirectory();
        return createPlainObject();
      }
      if (__privateGet(this, _options).clearInvalidConfig) {
        const errorInstance = error2;
        if (errorInstance.name === "SyntaxError") {
          return createPlainObject();
        }
        if ((_a = errorInstance.message) == null ? void 0 : _a.startsWith("Config schema violation:")) {
          return createPlainObject();
        }
      }
      throw error2;
    }
  }
  set store(value) {
    this._ensureDirectory();
    if (!hasProperty(value, INTERNAL_KEY)) {
      try {
        const data = fs.readFileSync(this.path, __privateGet(this, _encryptionKey) ? null : "utf8");
        const dataString = this._decryptData(data);
        const currentStore = this._deserialize(dataString);
        if (hasProperty(currentStore, INTERNAL_KEY)) {
          setProperty(value, INTERNAL_KEY, getProperty(currentStore, INTERNAL_KEY));
        }
      } catch {
      }
    }
    if (!__privateGet(this, _isInMigration)) {
      this._validate(value);
    }
    this._write(value);
    this.events.dispatchEvent(new Event("change"));
  }
  *[Symbol.iterator]() {
    for (const [key, value] of Object.entries(this.store)) {
      if (!this._isReservedKeyPath(key)) {
        yield [key, value];
      }
    }
  }
  /**
  Close the file watcher if one exists. This is useful in tests to prevent the process from hanging.
  */
  _closeWatcher() {
    if (__privateGet(this, _watcher)) {
      __privateGet(this, _watcher).close();
      __privateSet(this, _watcher, void 0);
    }
    if (__privateGet(this, _watchFile)) {
      fs.unwatchFile(this.path);
      __privateSet(this, _watchFile, false);
    }
    __privateSet(this, _debouncedChangeHandler, void 0);
  }
  _decryptData(data) {
    if (!__privateGet(this, _encryptionKey)) {
      return typeof data === "string" ? data : uint8ArrayToString(data);
    }
    try {
      const initializationVector = data.slice(0, 16);
      const password = crypto.pbkdf2Sync(__privateGet(this, _encryptionKey), initializationVector, 1e4, 32, "sha512");
      const decipher = crypto.createDecipheriv(encryptionAlgorithm, password, initializationVector);
      const slice = data.slice(17);
      const dataUpdate = typeof slice === "string" ? stringToUint8Array(slice) : slice;
      return uint8ArrayToString(concatUint8Arrays([decipher.update(dataUpdate), decipher.final()]));
    } catch {
      try {
        const initializationVector = data.slice(0, 16);
        const password = crypto.pbkdf2Sync(__privateGet(this, _encryptionKey), initializationVector.toString(), 1e4, 32, "sha512");
        const decipher = crypto.createDecipheriv(encryptionAlgorithm, password, initializationVector);
        const slice = data.slice(17);
        const dataUpdate = typeof slice === "string" ? stringToUint8Array(slice) : slice;
        return uint8ArrayToString(concatUint8Arrays([decipher.update(dataUpdate), decipher.final()]));
      } catch {
      }
    }
    return typeof data === "string" ? data : uint8ArrayToString(data);
  }
  _handleStoreChange(callback) {
    let currentValue = this.store;
    const onChange = () => {
      const oldValue = currentValue;
      const newValue = this.store;
      if (node_util.isDeepStrictEqual(newValue, oldValue)) {
        return;
      }
      currentValue = newValue;
      callback.call(this, newValue, oldValue);
    };
    this.events.addEventListener("change", onChange);
    return () => {
      this.events.removeEventListener("change", onChange);
    };
  }
  _handleValueChange(getter, callback) {
    let currentValue = getter();
    const onChange = () => {
      const oldValue = currentValue;
      const newValue = getter();
      if (node_util.isDeepStrictEqual(newValue, oldValue)) {
        return;
      }
      currentValue = newValue;
      callback.call(this, newValue, oldValue);
    };
    this.events.addEventListener("change", onChange);
    return () => {
      this.events.removeEventListener("change", onChange);
    };
  }
  _validate(data) {
    if (!__privateGet(this, _validator)) {
      return;
    }
    const valid2 = __privateGet(this, _validator).call(this, data);
    if (valid2 || !__privateGet(this, _validator).errors) {
      return;
    }
    const errors2 = __privateGet(this, _validator).errors.map(({ instancePath, message = "" }) => `\`${instancePath.slice(1)}\` ${message}`);
    throw new Error("Config schema violation: " + errors2.join("; "));
  }
  _ensureDirectory() {
    fs.mkdirSync(sp.dirname(this.path), { recursive: true });
  }
  _write(value) {
    let data = this._serialize(value);
    if (__privateGet(this, _encryptionKey)) {
      const initializationVector = crypto.randomBytes(16);
      const password = crypto.pbkdf2Sync(__privateGet(this, _encryptionKey), initializationVector, 1e4, 32, "sha512");
      const cipher = crypto.createCipheriv(encryptionAlgorithm, password, initializationVector);
      data = concatUint8Arrays([initializationVector, stringToUint8Array(":"), cipher.update(stringToUint8Array(data)), cipher.final()]);
    }
    if (process$1.env.SNAP) {
      fs.writeFileSync(this.path, data, { mode: __privateGet(this, _options).configFileMode });
    } else {
      try {
        writeFileSync(this.path, data, { mode: __privateGet(this, _options).configFileMode });
      } catch (error2) {
        if ((error2 == null ? void 0 : error2.code) === "EXDEV") {
          fs.writeFileSync(this.path, data, { mode: __privateGet(this, _options).configFileMode });
          return;
        }
        throw error2;
      }
    }
  }
  _watch() {
    this._ensureDirectory();
    if (!fs.existsSync(this.path)) {
      this._write(createPlainObject());
    }
    if (process$1.platform === "win32" || process$1.platform === "darwin") {
      __privateGet(this, _debouncedChangeHandler) ?? __privateSet(this, _debouncedChangeHandler, debounceFunction(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 100 }));
      const directory = sp.dirname(this.path);
      const basename = sp.basename(this.path);
      __privateSet(this, _watcher, fs.watch(directory, { persistent: false, encoding: "utf8" }, (_eventType, filename) => {
        if (filename && filename !== basename) {
          return;
        }
        if (typeof __privateGet(this, _debouncedChangeHandler) === "function") {
          __privateGet(this, _debouncedChangeHandler).call(this);
        }
      }));
    } else {
      __privateGet(this, _debouncedChangeHandler) ?? __privateSet(this, _debouncedChangeHandler, debounceFunction(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 1e3 }));
      fs.watchFile(this.path, { persistent: false }, (_current, _previous) => {
        if (typeof __privateGet(this, _debouncedChangeHandler) === "function") {
          __privateGet(this, _debouncedChangeHandler).call(this);
        }
      });
      __privateSet(this, _watchFile, true);
    }
  }
  _migrate(migrations, versionToMigrate, beforeEachMigration) {
    let previousMigratedVersion = this._get(MIGRATION_KEY, "0.0.0");
    const newerVersions = Object.keys(migrations).filter((candidateVersion) => this._shouldPerformMigration(candidateVersion, previousMigratedVersion, versionToMigrate));
    let storeBackup = structuredClone(this.store);
    for (const version of newerVersions) {
      try {
        if (beforeEachMigration) {
          beforeEachMigration(this, {
            fromVersion: previousMigratedVersion,
            toVersion: version,
            finalVersion: versionToMigrate,
            versions: newerVersions
          });
        }
        const migration = migrations[version];
        migration == null ? void 0 : migration(this);
        this._set(MIGRATION_KEY, version);
        previousMigratedVersion = version;
        storeBackup = structuredClone(this.store);
      } catch (error2) {
        this.store = storeBackup;
        try {
          this._write(storeBackup);
        } catch {
        }
        const errorMessage = error2 instanceof Error ? error2.message : String(error2);
        throw new Error(`Something went wrong during the migration! Changes applied to the store until this failed migration will be restored. ${errorMessage}`);
      }
    }
    if (this._isVersionInRangeFormat(previousMigratedVersion) || !semver$1.eq(previousMigratedVersion, versionToMigrate)) {
      this._set(MIGRATION_KEY, versionToMigrate);
    }
  }
  _containsReservedKey(key) {
    if (typeof key === "string") {
      return this._isReservedKeyPath(key);
    }
    if (!key || typeof key !== "object") {
      return false;
    }
    return this._objectContainsReservedKey(key);
  }
  _objectContainsReservedKey(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    for (const [candidateKey, candidateValue] of Object.entries(value)) {
      if (this._isReservedKeyPath(candidateKey)) {
        return true;
      }
      if (this._objectContainsReservedKey(candidateValue)) {
        return true;
      }
    }
    return false;
  }
  _isReservedKeyPath(candidate) {
    return candidate === INTERNAL_KEY || candidate.startsWith(`${INTERNAL_KEY}.`);
  }
  _isVersionInRangeFormat(version) {
    return semver$1.clean(version) === null;
  }
  _shouldPerformMigration(candidateVersion, previousMigratedVersion, versionToMigrate) {
    if (this._isVersionInRangeFormat(candidateVersion)) {
      if (previousMigratedVersion !== "0.0.0" && semver$1.satisfies(previousMigratedVersion, candidateVersion)) {
        return false;
      }
      return semver$1.satisfies(versionToMigrate, candidateVersion);
    }
    if (semver$1.lte(candidateVersion, previousMigratedVersion)) {
      return false;
    }
    if (semver$1.gt(candidateVersion, versionToMigrate)) {
      return false;
    }
    return true;
  }
  _get(key, defaultValue) {
    return getProperty(this.store, key, defaultValue);
  }
  _set(key, value) {
    const { store: store2 } = this;
    setProperty(store2, key, value);
    this.store = store2;
  }
}
_validator = new WeakMap();
_encryptionKey = new WeakMap();
_options = new WeakMap();
_defaultValues = new WeakMap();
_isInMigration = new WeakMap();
_watcher = new WeakMap();
_watchFile = new WeakMap();
_debouncedChangeHandler = new WeakMap();
_Conf_instances = new WeakSet();
prepareOptions_fn = function(partialOptions) {
  const options = {
    configName: "config",
    fileExtension: "json",
    projectSuffix: "nodejs",
    clearInvalidConfig: false,
    accessPropertiesByDotNotation: true,
    configFileMode: 438,
    ...partialOptions
  };
  if (!options.cwd) {
    if (!options.projectName) {
      throw new Error("Please specify the `projectName` option.");
    }
    options.cwd = envPaths(options.projectName, { suffix: options.projectSuffix }).config;
  }
  if (typeof options.fileExtension === "string") {
    options.fileExtension = options.fileExtension.replace(/^\.+/, "");
  }
  return options;
};
setupValidator_fn = function(options) {
  if (!(options.schema ?? options.ajvOptions ?? options.rootSchema)) {
    return;
  }
  if (options.schema && typeof options.schema !== "object") {
    throw new TypeError("The `schema` option must be an object.");
  }
  const ajvFormats = ajvFormatsModule.default;
  const ajv2 = new _2020Exports.Ajv2020({
    allErrors: true,
    useDefaults: true,
    ...options.ajvOptions
  });
  ajvFormats(ajv2);
  const schema = {
    ...options.rootSchema,
    type: "object",
    properties: options.schema
  };
  __privateSet(this, _validator, ajv2.compile(schema));
  __privateMethod(this, _Conf_instances, captureSchemaDefaults_fn).call(this, options.schema);
};
captureSchemaDefaults_fn = function(schemaConfig) {
  const schemaEntries = Object.entries(schemaConfig ?? {});
  for (const [key, schemaDefinition] of schemaEntries) {
    if (!schemaDefinition || typeof schemaDefinition !== "object") {
      continue;
    }
    if (!Object.hasOwn(schemaDefinition, "default")) {
      continue;
    }
    const { default: defaultValue } = schemaDefinition;
    if (defaultValue === void 0) {
      continue;
    }
    __privateGet(this, _defaultValues)[key] = defaultValue;
  }
};
applyDefaultValues_fn = function(options) {
  if (options.defaults) {
    Object.assign(__privateGet(this, _defaultValues), options.defaults);
  }
};
configureSerialization_fn = function(options) {
  if (options.serialize) {
    this._serialize = options.serialize;
  }
  if (options.deserialize) {
    this._deserialize = options.deserialize;
  }
};
resolvePath_fn = function(options) {
  const normalizedFileExtension = typeof options.fileExtension === "string" ? options.fileExtension : void 0;
  const fileExtension = normalizedFileExtension ? `.${normalizedFileExtension}` : "";
  return sp.resolve(options.cwd, `${options.configName ?? "config"}${fileExtension}`);
};
initializeStore_fn = function(options) {
  if (options.migrations) {
    __privateMethod(this, _Conf_instances, runMigrations_fn).call(this, options);
    this._validate(this.store);
    return;
  }
  const fileStore = this.store;
  const storeWithDefaults = Object.assign(createPlainObject(), options.defaults ?? {}, fileStore);
  this._validate(storeWithDefaults);
  try {
    assert.deepEqual(fileStore, storeWithDefaults);
  } catch {
    this.store = storeWithDefaults;
  }
};
runMigrations_fn = function(options) {
  const { migrations, projectVersion } = options;
  if (!migrations) {
    return;
  }
  if (!projectVersion) {
    throw new Error("Please specify the `projectVersion` option.");
  }
  __privateSet(this, _isInMigration, true);
  try {
    const fileStore = this.store;
    const storeWithDefaults = Object.assign(createPlainObject(), options.defaults ?? {}, fileStore);
    try {
      assert.deepEqual(fileStore, storeWithDefaults);
    } catch {
      this._write(storeWithDefaults);
    }
    this._migrate(migrations, projectVersion, options.beforeEachMigration);
  } finally {
    __privateSet(this, _isInMigration, false);
  }
};
const { app, ipcMain, shell } = electron;
let isInitialized = false;
const initDataListener = () => {
  if (!ipcMain || !app) {
    throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
  }
  const appData = {
    defaultCwd: app.getPath("userData"),
    appVersion: app.getVersion()
  };
  if (isInitialized) {
    return appData;
  }
  ipcMain.on("electron-store-get-data", (event) => {
    event.returnValue = appData;
  });
  isInitialized = true;
  return appData;
};
class ElectronStore extends Conf {
  constructor(options) {
    let defaultCwd;
    let appVersion;
    if (process$1.type === "renderer") {
      const appData = electron.ipcRenderer.sendSync("electron-store-get-data");
      if (!appData) {
        throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
      }
      ({ defaultCwd, appVersion } = appData);
    } else if (ipcMain && app) {
      ({ defaultCwd, appVersion } = initDataListener());
    }
    options = {
      name: "config",
      ...options
    };
    options.projectVersion || (options.projectVersion = appVersion);
    if (options.cwd) {
      options.cwd = sp.isAbsolute(options.cwd) ? options.cwd : sp.join(defaultCwd, options.cwd);
    } else {
      options.cwd = defaultCwd;
    }
    options.configName = options.name;
    delete options.name;
    super(options);
  }
  static initRenderer() {
    initDataListener();
  }
  async openInEditor() {
    const error2 = await shell.openPath(this.path);
    if (error2) {
      throw new Error(error2);
    }
  }
}
const EntryTypes = {
  FILE_TYPE: "files",
  DIR_TYPE: "directories",
  FILE_DIR_TYPE: "files_directories",
  EVERYTHING_TYPE: "all"
};
const defaultOptions = {
  root: ".",
  fileFilter: (_entryInfo) => true,
  directoryFilter: (_entryInfo) => true,
  type: EntryTypes.FILE_TYPE,
  lstat: false,
  depth: 2147483648,
  alwaysStat: false,
  highWaterMark: 4096
};
Object.freeze(defaultOptions);
const RECURSIVE_ERROR_CODE = "READDIRP_RECURSIVE_ERROR";
const NORMAL_FLOW_ERRORS = /* @__PURE__ */ new Set(["ENOENT", "EPERM", "EACCES", "ELOOP", RECURSIVE_ERROR_CODE]);
const ALL_TYPES = [
  EntryTypes.DIR_TYPE,
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE,
  EntryTypes.FILE_TYPE
];
const DIR_TYPES = /* @__PURE__ */ new Set([
  EntryTypes.DIR_TYPE,
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE
]);
const FILE_TYPES = /* @__PURE__ */ new Set([
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE,
  EntryTypes.FILE_TYPE
]);
const isNormalFlowError = (error2) => NORMAL_FLOW_ERRORS.has(error2.code);
const wantBigintFsStats = process.platform === "win32";
const emptyFn = (_entryInfo) => true;
const normalizeFilter = (filter) => {
  if (filter === void 0)
    return emptyFn;
  if (typeof filter === "function")
    return filter;
  if (typeof filter === "string") {
    const fl = filter.trim();
    return (entry) => entry.basename === fl;
  }
  if (Array.isArray(filter)) {
    const trItems = filter.map((item) => item.trim());
    return (entry) => trItems.some((f) => entry.basename === f);
  }
  return emptyFn;
};
class ReaddirpStream extends node_stream.Readable {
  constructor(options = {}) {
    super({
      objectMode: true,
      autoDestroy: true,
      highWaterMark: options.highWaterMark
    });
    __publicField(this, "parents");
    __publicField(this, "reading");
    __publicField(this, "parent");
    __publicField(this, "_stat");
    __publicField(this, "_maxDepth");
    __publicField(this, "_wantsDir");
    __publicField(this, "_wantsFile");
    __publicField(this, "_wantsEverything");
    __publicField(this, "_root");
    __publicField(this, "_isDirent");
    __publicField(this, "_statsProp");
    __publicField(this, "_rdOptions");
    __publicField(this, "_fileFilter");
    __publicField(this, "_directoryFilter");
    const opts = { ...defaultOptions, ...options };
    const { root, type: type2 } = opts;
    this._fileFilter = normalizeFilter(opts.fileFilter);
    this._directoryFilter = normalizeFilter(opts.directoryFilter);
    const statMethod = opts.lstat ? promises.lstat : promises.stat;
    if (wantBigintFsStats) {
      this._stat = (path2) => statMethod(path2, { bigint: true });
    } else {
      this._stat = statMethod;
    }
    this._maxDepth = opts.depth != null && Number.isSafeInteger(opts.depth) ? opts.depth : defaultOptions.depth;
    this._wantsDir = type2 ? DIR_TYPES.has(type2) : false;
    this._wantsFile = type2 ? FILE_TYPES.has(type2) : false;
    this._wantsEverything = type2 === EntryTypes.EVERYTHING_TYPE;
    this._root = sp.resolve(root);
    this._isDirent = !opts.alwaysStat;
    this._statsProp = this._isDirent ? "dirent" : "stats";
    this._rdOptions = { encoding: "utf8", withFileTypes: this._isDirent };
    this.parents = [this._exploreDir(root, 1)];
    this.reading = false;
    this.parent = void 0;
  }
  async _read(batch) {
    if (this.reading)
      return;
    this.reading = true;
    try {
      while (!this.destroyed && batch > 0) {
        const par = this.parent;
        const fil = par && par.files;
        if (fil && fil.length > 0) {
          const { path: path2, depth } = par;
          const slice = fil.splice(0, batch).map((dirent) => this._formatEntry(dirent, path2));
          const awaited = await Promise.all(slice);
          for (const entry of awaited) {
            if (!entry)
              continue;
            if (this.destroyed)
              return;
            const entryType = await this._getEntryType(entry);
            if (entryType === "directory" && this._directoryFilter(entry)) {
              if (depth <= this._maxDepth) {
                this.parents.push(this._exploreDir(entry.fullPath, depth + 1));
              }
              if (this._wantsDir) {
                this.push(entry);
                batch--;
              }
            } else if ((entryType === "file" || this._includeAsFile(entry)) && this._fileFilter(entry)) {
              if (this._wantsFile) {
                this.push(entry);
                batch--;
              }
            }
          }
        } else {
          const parent = this.parents.pop();
          if (!parent) {
            this.push(null);
            break;
          }
          this.parent = await parent;
          if (this.destroyed)
            return;
        }
      }
    } catch (error2) {
      this.destroy(error2);
    } finally {
      this.reading = false;
    }
  }
  async _exploreDir(path2, depth) {
    let files;
    try {
      files = await promises.readdir(path2, this._rdOptions);
    } catch (error2) {
      this._onError(error2);
    }
    return { files, depth, path: path2 };
  }
  async _formatEntry(dirent, path2) {
    let entry;
    const basename = this._isDirent ? dirent.name : dirent;
    try {
      const fullPath = sp.resolve(sp.join(path2, basename));
      entry = { path: sp.relative(this._root, fullPath), fullPath, basename };
      entry[this._statsProp] = this._isDirent ? dirent : await this._stat(fullPath);
    } catch (err) {
      this._onError(err);
      return;
    }
    return entry;
  }
  _onError(err) {
    if (isNormalFlowError(err) && !this.destroyed) {
      this.emit("warn", err);
    } else {
      this.destroy(err);
    }
  }
  async _getEntryType(entry) {
    if (!entry && this._statsProp in entry) {
      return "";
    }
    const stats = entry[this._statsProp];
    if (stats.isFile())
      return "file";
    if (stats.isDirectory())
      return "directory";
    if (stats && stats.isSymbolicLink()) {
      const full = entry.fullPath;
      try {
        const entryRealPath = await promises.realpath(full);
        const entryRealPathStats = await promises.lstat(entryRealPath);
        if (entryRealPathStats.isFile()) {
          return "file";
        }
        if (entryRealPathStats.isDirectory()) {
          const len = entryRealPath.length;
          if (full.startsWith(entryRealPath) && full.substr(len, 1) === sp.sep) {
            const recursiveError = new Error(`Circular symlink detected: "${full}" points to "${entryRealPath}"`);
            recursiveError.code = RECURSIVE_ERROR_CODE;
            return this._onError(recursiveError);
          }
          return "directory";
        }
      } catch (error2) {
        this._onError(error2);
        return "";
      }
    }
  }
  _includeAsFile(entry) {
    const stats = entry && entry[this._statsProp];
    return stats && this._wantsEverything && !stats.isDirectory();
  }
}
function readdirp(root, options = {}) {
  let type2 = options.entryType || options.type;
  if (type2 === "both")
    type2 = EntryTypes.FILE_DIR_TYPE;
  if (type2)
    options.type = type2;
  if (!root) {
    throw new Error("readdirp: root argument is required. Usage: readdirp(root, options)");
  } else if (typeof root !== "string") {
    throw new TypeError("readdirp: root argument must be a string. Usage: readdirp(root, options)");
  } else if (type2 && !ALL_TYPES.includes(type2)) {
    throw new Error(`readdirp: Invalid type passed. Use one of ${ALL_TYPES.join(", ")}`);
  }
  options.root = root;
  return new ReaddirpStream(options);
}
const STR_DATA = "data";
const STR_END = "end";
const STR_CLOSE = "close";
const EMPTY_FN = () => {
};
const pl = process.platform;
const isWindows = pl === "win32";
const isMacos = pl === "darwin";
const isLinux = pl === "linux";
const isFreeBSD = pl === "freebsd";
const isIBMi = os.type() === "OS400";
const EVENTS = {
  ALL: "all",
  READY: "ready",
  ADD: "add",
  CHANGE: "change",
  ADD_DIR: "addDir",
  UNLINK: "unlink",
  UNLINK_DIR: "unlinkDir",
  RAW: "raw",
  ERROR: "error"
};
const EV = EVENTS;
const THROTTLE_MODE_WATCH = "watch";
const statMethods = { lstat: promises.lstat, stat: promises.stat };
const KEY_LISTENERS = "listeners";
const KEY_ERR = "errHandlers";
const KEY_RAW = "rawEmitters";
const HANDLER_KEYS = [KEY_LISTENERS, KEY_ERR, KEY_RAW];
const binaryExtensions = /* @__PURE__ */ new Set([
  "3dm",
  "3ds",
  "3g2",
  "3gp",
  "7z",
  "a",
  "aac",
  "adp",
  "afdesign",
  "afphoto",
  "afpub",
  "ai",
  "aif",
  "aiff",
  "alz",
  "ape",
  "apk",
  "appimage",
  "ar",
  "arj",
  "asf",
  "au",
  "avi",
  "bak",
  "baml",
  "bh",
  "bin",
  "bk",
  "bmp",
  "btif",
  "bz2",
  "bzip2",
  "cab",
  "caf",
  "cgm",
  "class",
  "cmx",
  "cpio",
  "cr2",
  "cur",
  "dat",
  "dcm",
  "deb",
  "dex",
  "djvu",
  "dll",
  "dmg",
  "dng",
  "doc",
  "docm",
  "docx",
  "dot",
  "dotm",
  "dra",
  "DS_Store",
  "dsk",
  "dts",
  "dtshd",
  "dvb",
  "dwg",
  "dxf",
  "ecelp4800",
  "ecelp7470",
  "ecelp9600",
  "egg",
  "eol",
  "eot",
  "epub",
  "exe",
  "f4v",
  "fbs",
  "fh",
  "fla",
  "flac",
  "flatpak",
  "fli",
  "flv",
  "fpx",
  "fst",
  "fvt",
  "g3",
  "gh",
  "gif",
  "graffle",
  "gz",
  "gzip",
  "h261",
  "h263",
  "h264",
  "icns",
  "ico",
  "ief",
  "img",
  "ipa",
  "iso",
  "jar",
  "jpeg",
  "jpg",
  "jpgv",
  "jpm",
  "jxr",
  "key",
  "ktx",
  "lha",
  "lib",
  "lvp",
  "lz",
  "lzh",
  "lzma",
  "lzo",
  "m3u",
  "m4a",
  "m4v",
  "mar",
  "mdi",
  "mht",
  "mid",
  "midi",
  "mj2",
  "mka",
  "mkv",
  "mmr",
  "mng",
  "mobi",
  "mov",
  "movie",
  "mp3",
  "mp4",
  "mp4a",
  "mpeg",
  "mpg",
  "mpga",
  "mxu",
  "nef",
  "npx",
  "numbers",
  "nupkg",
  "o",
  "odp",
  "ods",
  "odt",
  "oga",
  "ogg",
  "ogv",
  "otf",
  "ott",
  "pages",
  "pbm",
  "pcx",
  "pdb",
  "pdf",
  "pea",
  "pgm",
  "pic",
  "png",
  "pnm",
  "pot",
  "potm",
  "potx",
  "ppa",
  "ppam",
  "ppm",
  "pps",
  "ppsm",
  "ppsx",
  "ppt",
  "pptm",
  "pptx",
  "psd",
  "pya",
  "pyc",
  "pyo",
  "pyv",
  "qt",
  "rar",
  "ras",
  "raw",
  "resources",
  "rgb",
  "rip",
  "rlc",
  "rmf",
  "rmvb",
  "rpm",
  "rtf",
  "rz",
  "s3m",
  "s7z",
  "scpt",
  "sgi",
  "shar",
  "snap",
  "sil",
  "sketch",
  "slk",
  "smv",
  "snk",
  "so",
  "stl",
  "suo",
  "sub",
  "swf",
  "tar",
  "tbz",
  "tbz2",
  "tga",
  "tgz",
  "thmx",
  "tif",
  "tiff",
  "tlz",
  "ttc",
  "ttf",
  "txz",
  "udf",
  "uvh",
  "uvi",
  "uvm",
  "uvp",
  "uvs",
  "uvu",
  "viv",
  "vob",
  "war",
  "wav",
  "wax",
  "wbmp",
  "wdp",
  "weba",
  "webm",
  "webp",
  "whl",
  "wim",
  "wm",
  "wma",
  "wmv",
  "wmx",
  "woff",
  "woff2",
  "wrm",
  "wvx",
  "xbm",
  "xif",
  "xla",
  "xlam",
  "xls",
  "xlsb",
  "xlsm",
  "xlsx",
  "xlt",
  "xltm",
  "xltx",
  "xm",
  "xmind",
  "xpi",
  "xpm",
  "xwd",
  "xz",
  "z",
  "zip",
  "zipx"
]);
const isBinaryPath = (filePath) => binaryExtensions.has(sp__namespace.extname(filePath).slice(1).toLowerCase());
const foreach = (val, fn) => {
  if (val instanceof Set) {
    val.forEach(fn);
  } else {
    fn(val);
  }
};
const addAndConvert = (main, prop, item) => {
  let container = main[prop];
  if (!(container instanceof Set)) {
    main[prop] = container = /* @__PURE__ */ new Set([container]);
  }
  container.add(item);
};
const clearItem = (cont) => (key) => {
  const set = cont[key];
  if (set instanceof Set) {
    set.clear();
  } else {
    delete cont[key];
  }
};
const delFromSet = (main, prop, item) => {
  const container = main[prop];
  if (container instanceof Set) {
    container.delete(item);
  } else if (container === item) {
    delete main[prop];
  }
};
const isEmptySet = (val) => val instanceof Set ? val.size === 0 : !val;
const FsWatchInstances = /* @__PURE__ */ new Map();
function createFsWatchInstance(path2, options, listener, errHandler, emitRaw) {
  const handleEvent = (rawEvent, evPath) => {
    listener(path2);
    emitRaw(rawEvent, evPath, { watchedPath: path2 });
    if (evPath && path2 !== evPath) {
      fsWatchBroadcast(sp__namespace.resolve(path2, evPath), KEY_LISTENERS, sp__namespace.join(path2, evPath));
    }
  };
  try {
    return fs.watch(path2, {
      persistent: options.persistent
    }, handleEvent);
  } catch (error2) {
    errHandler(error2);
    return void 0;
  }
}
const fsWatchBroadcast = (fullPath, listenerType, val1, val2, val3) => {
  const cont = FsWatchInstances.get(fullPath);
  if (!cont)
    return;
  foreach(cont[listenerType], (listener) => {
    listener(val1, val2, val3);
  });
};
const setFsWatchListener = (path2, fullPath, options, handlers) => {
  const { listener, errHandler, rawEmitter } = handlers;
  let cont = FsWatchInstances.get(fullPath);
  let watcher2;
  if (!options.persistent) {
    watcher2 = createFsWatchInstance(path2, options, listener, errHandler, rawEmitter);
    if (!watcher2)
      return;
    return watcher2.close.bind(watcher2);
  }
  if (cont) {
    addAndConvert(cont, KEY_LISTENERS, listener);
    addAndConvert(cont, KEY_ERR, errHandler);
    addAndConvert(cont, KEY_RAW, rawEmitter);
  } else {
    watcher2 = createFsWatchInstance(
      path2,
      options,
      fsWatchBroadcast.bind(null, fullPath, KEY_LISTENERS),
      errHandler,
      // no need to use broadcast here
      fsWatchBroadcast.bind(null, fullPath, KEY_RAW)
    );
    if (!watcher2)
      return;
    watcher2.on(EV.ERROR, async (error2) => {
      const broadcastErr = fsWatchBroadcast.bind(null, fullPath, KEY_ERR);
      if (cont)
        cont.watcherUnusable = true;
      if (isWindows && error2.code === "EPERM") {
        try {
          const fd = await promises.open(path2, "r");
          await fd.close();
          broadcastErr(error2);
        } catch (err) {
        }
      } else {
        broadcastErr(error2);
      }
    });
    cont = {
      listeners: listener,
      errHandlers: errHandler,
      rawEmitters: rawEmitter,
      watcher: watcher2
    };
    FsWatchInstances.set(fullPath, cont);
  }
  return () => {
    delFromSet(cont, KEY_LISTENERS, listener);
    delFromSet(cont, KEY_ERR, errHandler);
    delFromSet(cont, KEY_RAW, rawEmitter);
    if (isEmptySet(cont.listeners)) {
      cont.watcher.close();
      FsWatchInstances.delete(fullPath);
      HANDLER_KEYS.forEach(clearItem(cont));
      cont.watcher = void 0;
      Object.freeze(cont);
    }
  };
};
const FsWatchFileInstances = /* @__PURE__ */ new Map();
const setFsWatchFileListener = (path2, fullPath, options, handlers) => {
  const { listener, rawEmitter } = handlers;
  let cont = FsWatchFileInstances.get(fullPath);
  const copts = cont && cont.options;
  if (copts && (copts.persistent < options.persistent || copts.interval > options.interval)) {
    fs.unwatchFile(fullPath);
    cont = void 0;
  }
  if (cont) {
    addAndConvert(cont, KEY_LISTENERS, listener);
    addAndConvert(cont, KEY_RAW, rawEmitter);
  } else {
    cont = {
      listeners: listener,
      rawEmitters: rawEmitter,
      options,
      watcher: fs.watchFile(fullPath, options, (curr, prev) => {
        foreach(cont.rawEmitters, (rawEmitter2) => {
          rawEmitter2(EV.CHANGE, fullPath, { curr, prev });
        });
        const currmtime = curr.mtimeMs;
        if (curr.size !== prev.size || currmtime > prev.mtimeMs || currmtime === 0) {
          foreach(cont.listeners, (listener2) => listener2(path2, curr));
        }
      })
    };
    FsWatchFileInstances.set(fullPath, cont);
  }
  return () => {
    delFromSet(cont, KEY_LISTENERS, listener);
    delFromSet(cont, KEY_RAW, rawEmitter);
    if (isEmptySet(cont.listeners)) {
      FsWatchFileInstances.delete(fullPath);
      fs.unwatchFile(fullPath);
      cont.options = cont.watcher = void 0;
      Object.freeze(cont);
    }
  };
};
class NodeFsHandler {
  constructor(fsW) {
    __publicField(this, "fsw");
    __publicField(this, "_boundHandleError");
    this.fsw = fsW;
    this._boundHandleError = (error2) => fsW._handleError(error2);
  }
  /**
   * Watch file for changes with fs_watchFile or fs_watch.
   * @param path to file or dir
   * @param listener on fs change
   * @returns closer for the watcher instance
   */
  _watchWithNodeFs(path2, listener) {
    const opts = this.fsw.options;
    const directory = sp__namespace.dirname(path2);
    const basename = sp__namespace.basename(path2);
    const parent = this.fsw._getWatchedDir(directory);
    parent.add(basename);
    const absolutePath = sp__namespace.resolve(path2);
    const options = {
      persistent: opts.persistent
    };
    if (!listener)
      listener = EMPTY_FN;
    let closer;
    if (opts.usePolling) {
      const enableBin = opts.interval !== opts.binaryInterval;
      options.interval = enableBin && isBinaryPath(basename) ? opts.binaryInterval : opts.interval;
      closer = setFsWatchFileListener(path2, absolutePath, options, {
        listener,
        rawEmitter: this.fsw._emitRaw
      });
    } else {
      closer = setFsWatchListener(path2, absolutePath, options, {
        listener,
        errHandler: this._boundHandleError,
        rawEmitter: this.fsw._emitRaw
      });
    }
    return closer;
  }
  /**
   * Watch a file and emit add event if warranted.
   * @returns closer for the watcher instance
   */
  _handleFile(file, stats, initialAdd) {
    if (this.fsw.closed) {
      return;
    }
    const dirname = sp__namespace.dirname(file);
    const basename = sp__namespace.basename(file);
    const parent = this.fsw._getWatchedDir(dirname);
    let prevStats = stats;
    if (parent.has(basename))
      return;
    const listener = async (path2, newStats) => {
      if (!this.fsw._throttle(THROTTLE_MODE_WATCH, file, 5))
        return;
      if (!newStats || newStats.mtimeMs === 0) {
        try {
          const newStats2 = await promises.stat(file);
          if (this.fsw.closed)
            return;
          const at = newStats2.atimeMs;
          const mt = newStats2.mtimeMs;
          if (!at || at <= mt || mt !== prevStats.mtimeMs) {
            this.fsw._emit(EV.CHANGE, file, newStats2);
          }
          if ((isMacos || isLinux || isFreeBSD) && prevStats.ino !== newStats2.ino) {
            this.fsw._closeFile(path2);
            prevStats = newStats2;
            const closer2 = this._watchWithNodeFs(file, listener);
            if (closer2)
              this.fsw._addPathCloser(path2, closer2);
          } else {
            prevStats = newStats2;
          }
        } catch (error2) {
          this.fsw._remove(dirname, basename);
        }
      } else if (parent.has(basename)) {
        const at = newStats.atimeMs;
        const mt = newStats.mtimeMs;
        if (!at || at <= mt || mt !== prevStats.mtimeMs) {
          this.fsw._emit(EV.CHANGE, file, newStats);
        }
        prevStats = newStats;
      }
    };
    const closer = this._watchWithNodeFs(file, listener);
    if (!(initialAdd && this.fsw.options.ignoreInitial) && this.fsw._isntIgnored(file)) {
      if (!this.fsw._throttle(EV.ADD, file, 0))
        return;
      this.fsw._emit(EV.ADD, file, stats);
    }
    return closer;
  }
  /**
   * Handle symlinks encountered while reading a dir.
   * @param entry returned by readdirp
   * @param directory path of dir being read
   * @param path of this item
   * @param item basename of this item
   * @returns true if no more processing is needed for this entry.
   */
  async _handleSymlink(entry, directory, path2, item) {
    if (this.fsw.closed) {
      return;
    }
    const full = entry.fullPath;
    const dir = this.fsw._getWatchedDir(directory);
    if (!this.fsw.options.followSymlinks) {
      this.fsw._incrReadyCount();
      let linkPath;
      try {
        linkPath = await promises.realpath(path2);
      } catch (e) {
        this.fsw._emitReady();
        return true;
      }
      if (this.fsw.closed)
        return;
      if (dir.has(item)) {
        if (this.fsw._symlinkPaths.get(full) !== linkPath) {
          this.fsw._symlinkPaths.set(full, linkPath);
          this.fsw._emit(EV.CHANGE, path2, entry.stats);
        }
      } else {
        dir.add(item);
        this.fsw._symlinkPaths.set(full, linkPath);
        this.fsw._emit(EV.ADD, path2, entry.stats);
      }
      this.fsw._emitReady();
      return true;
    }
    if (this.fsw._symlinkPaths.has(full)) {
      return true;
    }
    this.fsw._symlinkPaths.set(full, true);
  }
  _handleRead(directory, initialAdd, wh, target, dir, depth, throttler) {
    directory = sp__namespace.join(directory, "");
    const throttleKey = target ? `${directory}:${target}` : directory;
    throttler = this.fsw._throttle("readdir", throttleKey, 1e3);
    if (!throttler)
      return;
    const previous = this.fsw._getWatchedDir(wh.path);
    const current = /* @__PURE__ */ new Set();
    let stream = this.fsw._readdirp(directory, {
      fileFilter: (entry) => wh.filterPath(entry),
      directoryFilter: (entry) => wh.filterDir(entry)
    });
    if (!stream)
      return;
    stream.on(STR_DATA, async (entry) => {
      if (this.fsw.closed) {
        stream = void 0;
        return;
      }
      const item = entry.path;
      let path2 = sp__namespace.join(directory, item);
      current.add(item);
      if (entry.stats.isSymbolicLink() && await this._handleSymlink(entry, directory, path2, item)) {
        return;
      }
      if (this.fsw.closed) {
        stream = void 0;
        return;
      }
      if (item === target || !target && !previous.has(item)) {
        this.fsw._incrReadyCount();
        path2 = sp__namespace.join(dir, sp__namespace.relative(dir, path2));
        this._addToNodeFs(path2, initialAdd, wh, depth + 1);
      }
    }).on(EV.ERROR, this._boundHandleError);
    return new Promise((resolve2, reject) => {
      if (!stream)
        return reject();
      stream.once(STR_END, () => {
        if (this.fsw.closed) {
          stream = void 0;
          return;
        }
        const wasThrottled = throttler ? throttler.clear() : false;
        resolve2(void 0);
        previous.getChildren().filter((item) => {
          return item !== directory && !current.has(item);
        }).forEach((item) => {
          this.fsw._remove(directory, item);
        });
        stream = void 0;
        if (wasThrottled)
          this._handleRead(directory, false, wh, target, dir, depth, throttler);
      });
    });
  }
  /**
   * Read directory to add / remove files from `@watched` list and re-read it on change.
   * @param dir fs path
   * @param stats
   * @param initialAdd
   * @param depth relative to user-supplied path
   * @param target child path targeted for watch
   * @param wh Common watch helpers for this path
   * @param realpath
   * @returns closer for the watcher instance.
   */
  async _handleDir(dir, stats, initialAdd, depth, target, wh, realpath) {
    const parentDir = this.fsw._getWatchedDir(sp__namespace.dirname(dir));
    const tracked = parentDir.has(sp__namespace.basename(dir));
    if (!(initialAdd && this.fsw.options.ignoreInitial) && !target && !tracked) {
      this.fsw._emit(EV.ADD_DIR, dir, stats);
    }
    parentDir.add(sp__namespace.basename(dir));
    this.fsw._getWatchedDir(dir);
    let throttler;
    let closer;
    const oDepth = this.fsw.options.depth;
    if ((oDepth == null || depth <= oDepth) && !this.fsw._symlinkPaths.has(realpath)) {
      if (!target) {
        await this._handleRead(dir, initialAdd, wh, target, dir, depth, throttler);
        if (this.fsw.closed)
          return;
      }
      closer = this._watchWithNodeFs(dir, (dirPath, stats2) => {
        if (stats2 && stats2.mtimeMs === 0)
          return;
        this._handleRead(dirPath, false, wh, target, dir, depth, throttler);
      });
    }
    return closer;
  }
  /**
   * Handle added file, directory, or glob pattern.
   * Delegates call to _handleFile / _handleDir after checks.
   * @param path to file or ir
   * @param initialAdd was the file added at watch instantiation?
   * @param priorWh depth relative to user-supplied path
   * @param depth Child path actually targeted for watch
   * @param target Child path actually targeted for watch
   */
  async _addToNodeFs(path2, initialAdd, priorWh, depth, target) {
    const ready = this.fsw._emitReady;
    if (this.fsw._isIgnored(path2) || this.fsw.closed) {
      ready();
      return false;
    }
    const wh = this.fsw._getWatchHelpers(path2);
    if (priorWh) {
      wh.filterPath = (entry) => priorWh.filterPath(entry);
      wh.filterDir = (entry) => priorWh.filterDir(entry);
    }
    try {
      const stats = await statMethods[wh.statMethod](wh.watchPath);
      if (this.fsw.closed)
        return;
      if (this.fsw._isIgnored(wh.watchPath, stats)) {
        ready();
        return false;
      }
      const follow = this.fsw.options.followSymlinks;
      let closer;
      if (stats.isDirectory()) {
        const absPath = sp__namespace.resolve(path2);
        const targetPath = follow ? await promises.realpath(path2) : path2;
        if (this.fsw.closed)
          return;
        closer = await this._handleDir(wh.watchPath, stats, initialAdd, depth, target, wh, targetPath);
        if (this.fsw.closed)
          return;
        if (absPath !== targetPath && targetPath !== void 0) {
          this.fsw._symlinkPaths.set(absPath, targetPath);
        }
      } else if (stats.isSymbolicLink()) {
        const targetPath = follow ? await promises.realpath(path2) : path2;
        if (this.fsw.closed)
          return;
        const parent = sp__namespace.dirname(wh.watchPath);
        this.fsw._getWatchedDir(parent).add(wh.watchPath);
        this.fsw._emit(EV.ADD, wh.watchPath, stats);
        closer = await this._handleDir(parent, stats, initialAdd, depth, path2, wh, targetPath);
        if (this.fsw.closed)
          return;
        if (targetPath !== void 0) {
          this.fsw._symlinkPaths.set(sp__namespace.resolve(path2), targetPath);
        }
      } else {
        closer = this._handleFile(wh.watchPath, stats, initialAdd);
      }
      ready();
      if (closer)
        this.fsw._addPathCloser(path2, closer);
      return false;
    } catch (error2) {
      if (this.fsw._handleError(error2)) {
        ready();
        return path2;
      }
    }
  }
}
/*! chokidar - MIT License (c) 2012 Paul Miller (paulmillr.com) */
const SLASH = "/";
const SLASH_SLASH = "//";
const ONE_DOT = ".";
const TWO_DOTS = "..";
const STRING_TYPE = "string";
const BACK_SLASH_RE = /\\/g;
const DOUBLE_SLASH_RE = /\/\//g;
const DOT_RE = /\..*\.(sw[px])$|~$|\.subl.*\.tmp/;
const REPLACER_RE = /^\.[/\\]/;
function arrify(item) {
  return Array.isArray(item) ? item : [item];
}
const isMatcherObject = (matcher) => typeof matcher === "object" && matcher !== null && !(matcher instanceof RegExp);
function createPattern(matcher) {
  if (typeof matcher === "function")
    return matcher;
  if (typeof matcher === "string")
    return (string) => matcher === string;
  if (matcher instanceof RegExp)
    return (string) => matcher.test(string);
  if (typeof matcher === "object" && matcher !== null) {
    return (string) => {
      if (matcher.path === string)
        return true;
      if (matcher.recursive) {
        const relative = sp__namespace.relative(matcher.path, string);
        if (!relative) {
          return false;
        }
        return !relative.startsWith("..") && !sp__namespace.isAbsolute(relative);
      }
      return false;
    };
  }
  return () => false;
}
function normalizePath(path2) {
  if (typeof path2 !== "string")
    throw new Error("string expected");
  path2 = sp__namespace.normalize(path2);
  path2 = path2.replace(/\\/g, "/");
  let prepend = false;
  if (path2.startsWith("//"))
    prepend = true;
  path2 = path2.replace(DOUBLE_SLASH_RE, "/");
  if (prepend)
    path2 = "/" + path2;
  return path2;
}
function matchPatterns(patterns, testString, stats) {
  const path2 = normalizePath(testString);
  for (let index = 0; index < patterns.length; index++) {
    const pattern2 = patterns[index];
    if (pattern2(path2, stats)) {
      return true;
    }
  }
  return false;
}
function anymatch(matchers, testString) {
  if (matchers == null) {
    throw new TypeError("anymatch: specify first argument");
  }
  const matchersArray = arrify(matchers);
  const patterns = matchersArray.map((matcher) => createPattern(matcher));
  {
    return (testString2, stats) => {
      return matchPatterns(patterns, testString2, stats);
    };
  }
}
const unifyPaths = (paths_) => {
  const paths = arrify(paths_).flat();
  if (!paths.every((p) => typeof p === STRING_TYPE)) {
    throw new TypeError(`Non-string provided as watch path: ${paths}`);
  }
  return paths.map(normalizePathToUnix);
};
const toUnix = (string) => {
  let str = string.replace(BACK_SLASH_RE, SLASH);
  let prepend = false;
  if (str.startsWith(SLASH_SLASH)) {
    prepend = true;
  }
  str = str.replace(DOUBLE_SLASH_RE, SLASH);
  if (prepend) {
    str = SLASH + str;
  }
  return str;
};
const normalizePathToUnix = (path2) => toUnix(sp__namespace.normalize(toUnix(path2)));
const normalizeIgnored = (cwd = "") => (path2) => {
  if (typeof path2 === "string") {
    return normalizePathToUnix(sp__namespace.isAbsolute(path2) ? path2 : sp__namespace.join(cwd, path2));
  } else {
    return path2;
  }
};
const getAbsolutePath = (path2, cwd) => {
  if (sp__namespace.isAbsolute(path2)) {
    return path2;
  }
  return sp__namespace.join(cwd, path2);
};
const EMPTY_SET = Object.freeze(/* @__PURE__ */ new Set());
class DirEntry {
  constructor(dir, removeWatcher) {
    __publicField(this, "path");
    __publicField(this, "_removeWatcher");
    __publicField(this, "items");
    this.path = dir;
    this._removeWatcher = removeWatcher;
    this.items = /* @__PURE__ */ new Set();
  }
  add(item) {
    const { items: items2 } = this;
    if (!items2)
      return;
    if (item !== ONE_DOT && item !== TWO_DOTS)
      items2.add(item);
  }
  async remove(item) {
    const { items: items2 } = this;
    if (!items2)
      return;
    items2.delete(item);
    if (items2.size > 0)
      return;
    const dir = this.path;
    try {
      await promises.readdir(dir);
    } catch (err) {
      if (this._removeWatcher) {
        this._removeWatcher(sp__namespace.dirname(dir), sp__namespace.basename(dir));
      }
    }
  }
  has(item) {
    const { items: items2 } = this;
    if (!items2)
      return;
    return items2.has(item);
  }
  getChildren() {
    const { items: items2 } = this;
    if (!items2)
      return [];
    return [...items2.values()];
  }
  dispose() {
    this.items.clear();
    this.path = "";
    this._removeWatcher = EMPTY_FN;
    this.items = EMPTY_SET;
    Object.freeze(this);
  }
}
const STAT_METHOD_F = "stat";
const STAT_METHOD_L = "lstat";
class WatchHelper {
  constructor(path2, follow, fsw) {
    __publicField(this, "fsw");
    __publicField(this, "path");
    __publicField(this, "watchPath");
    __publicField(this, "fullWatchPath");
    __publicField(this, "dirParts");
    __publicField(this, "followSymlinks");
    __publicField(this, "statMethod");
    this.fsw = fsw;
    const watchPath = path2;
    this.path = path2 = path2.replace(REPLACER_RE, "");
    this.watchPath = watchPath;
    this.fullWatchPath = sp__namespace.resolve(watchPath);
    this.dirParts = [];
    this.dirParts.forEach((parts) => {
      if (parts.length > 1)
        parts.pop();
    });
    this.followSymlinks = follow;
    this.statMethod = follow ? STAT_METHOD_F : STAT_METHOD_L;
  }
  entryPath(entry) {
    return sp__namespace.join(this.watchPath, sp__namespace.relative(this.watchPath, entry.fullPath));
  }
  filterPath(entry) {
    const { stats } = entry;
    if (stats && stats.isSymbolicLink())
      return this.filterDir(entry);
    const resolvedPath = this.entryPath(entry);
    return this.fsw._isntIgnored(resolvedPath, stats) && this.fsw._hasReadPermissions(stats);
  }
  filterDir(entry) {
    return this.fsw._isntIgnored(this.entryPath(entry), entry.stats);
  }
}
class FSWatcher extends node_events.EventEmitter {
  // Not indenting methods for history sake; for now.
  constructor(_opts = {}) {
    super();
    __publicField(this, "closed");
    __publicField(this, "options");
    __publicField(this, "_closers");
    __publicField(this, "_ignoredPaths");
    __publicField(this, "_throttled");
    __publicField(this, "_streams");
    __publicField(this, "_symlinkPaths");
    __publicField(this, "_watched");
    __publicField(this, "_pendingWrites");
    __publicField(this, "_pendingUnlinks");
    __publicField(this, "_readyCount");
    __publicField(this, "_emitReady");
    __publicField(this, "_closePromise");
    __publicField(this, "_userIgnored");
    __publicField(this, "_readyEmitted");
    __publicField(this, "_emitRaw");
    __publicField(this, "_boundRemove");
    __publicField(this, "_nodeFsHandler");
    this.closed = false;
    this._closers = /* @__PURE__ */ new Map();
    this._ignoredPaths = /* @__PURE__ */ new Set();
    this._throttled = /* @__PURE__ */ new Map();
    this._streams = /* @__PURE__ */ new Set();
    this._symlinkPaths = /* @__PURE__ */ new Map();
    this._watched = /* @__PURE__ */ new Map();
    this._pendingWrites = /* @__PURE__ */ new Map();
    this._pendingUnlinks = /* @__PURE__ */ new Map();
    this._readyCount = 0;
    this._readyEmitted = false;
    const awf = _opts.awaitWriteFinish;
    const DEF_AWF = { stabilityThreshold: 2e3, pollInterval: 100 };
    const opts = {
      // Defaults
      persistent: true,
      ignoreInitial: false,
      ignorePermissionErrors: false,
      interval: 100,
      binaryInterval: 300,
      followSymlinks: true,
      usePolling: false,
      // useAsync: false,
      atomic: true,
      // NOTE: overwritten later (depends on usePolling)
      ..._opts,
      // Change format
      ignored: _opts.ignored ? arrify(_opts.ignored) : arrify([]),
      awaitWriteFinish: awf === true ? DEF_AWF : typeof awf === "object" ? { ...DEF_AWF, ...awf } : false
    };
    if (isIBMi)
      opts.usePolling = true;
    if (opts.atomic === void 0)
      opts.atomic = !opts.usePolling;
    const envPoll = process.env.CHOKIDAR_USEPOLLING;
    if (envPoll !== void 0) {
      const envLower = envPoll.toLowerCase();
      if (envLower === "false" || envLower === "0")
        opts.usePolling = false;
      else if (envLower === "true" || envLower === "1")
        opts.usePolling = true;
      else
        opts.usePolling = !!envLower;
    }
    const envInterval = process.env.CHOKIDAR_INTERVAL;
    if (envInterval)
      opts.interval = Number.parseInt(envInterval, 10);
    let readyCalls = 0;
    this._emitReady = () => {
      readyCalls++;
      if (readyCalls >= this._readyCount) {
        this._emitReady = EMPTY_FN;
        this._readyEmitted = true;
        process.nextTick(() => this.emit(EVENTS.READY));
      }
    };
    this._emitRaw = (...args) => this.emit(EVENTS.RAW, ...args);
    this._boundRemove = this._remove.bind(this);
    this.options = opts;
    this._nodeFsHandler = new NodeFsHandler(this);
    Object.freeze(opts);
  }
  _addIgnoredPath(matcher) {
    if (isMatcherObject(matcher)) {
      for (const ignored of this._ignoredPaths) {
        if (isMatcherObject(ignored) && ignored.path === matcher.path && ignored.recursive === matcher.recursive) {
          return;
        }
      }
    }
    this._ignoredPaths.add(matcher);
  }
  _removeIgnoredPath(matcher) {
    this._ignoredPaths.delete(matcher);
    if (typeof matcher === "string") {
      for (const ignored of this._ignoredPaths) {
        if (isMatcherObject(ignored) && ignored.path === matcher) {
          this._ignoredPaths.delete(ignored);
        }
      }
    }
  }
  // Public methods
  /**
   * Adds paths to be watched on an existing FSWatcher instance.
   * @param paths_ file or file list. Other arguments are unused
   */
  add(paths_, _origAdd, _internal) {
    const { cwd } = this.options;
    this.closed = false;
    this._closePromise = void 0;
    let paths = unifyPaths(paths_);
    if (cwd) {
      paths = paths.map((path2) => {
        const absPath = getAbsolutePath(path2, cwd);
        return absPath;
      });
    }
    paths.forEach((path2) => {
      this._removeIgnoredPath(path2);
    });
    this._userIgnored = void 0;
    if (!this._readyCount)
      this._readyCount = 0;
    this._readyCount += paths.length;
    Promise.all(paths.map(async (path2) => {
      const res = await this._nodeFsHandler._addToNodeFs(path2, !_internal, void 0, 0, _origAdd);
      if (res)
        this._emitReady();
      return res;
    })).then((results) => {
      if (this.closed)
        return;
      results.forEach((item) => {
        if (item)
          this.add(sp__namespace.dirname(item), sp__namespace.basename(_origAdd || item));
      });
    });
    return this;
  }
  /**
   * Close watchers or start ignoring events from specified paths.
   */
  unwatch(paths_) {
    if (this.closed)
      return this;
    const paths = unifyPaths(paths_);
    const { cwd } = this.options;
    paths.forEach((path2) => {
      if (!sp__namespace.isAbsolute(path2) && !this._closers.has(path2)) {
        if (cwd)
          path2 = sp__namespace.join(cwd, path2);
        path2 = sp__namespace.resolve(path2);
      }
      this._closePath(path2);
      this._addIgnoredPath(path2);
      if (this._watched.has(path2)) {
        this._addIgnoredPath({
          path: path2,
          recursive: true
        });
      }
      this._userIgnored = void 0;
    });
    return this;
  }
  /**
   * Close watchers and remove all listeners from watched paths.
   */
  close() {
    if (this._closePromise) {
      return this._closePromise;
    }
    this.closed = true;
    this.removeAllListeners();
    const closers = [];
    this._closers.forEach((closerList) => closerList.forEach((closer) => {
      const promise = closer();
      if (promise instanceof Promise)
        closers.push(promise);
    }));
    this._streams.forEach((stream) => stream.destroy());
    this._userIgnored = void 0;
    this._readyCount = 0;
    this._readyEmitted = false;
    this._watched.forEach((dirent) => dirent.dispose());
    this._closers.clear();
    this._watched.clear();
    this._streams.clear();
    this._symlinkPaths.clear();
    this._throttled.clear();
    this._closePromise = closers.length ? Promise.all(closers).then(() => void 0) : Promise.resolve();
    return this._closePromise;
  }
  /**
   * Expose list of watched paths
   * @returns for chaining
   */
  getWatched() {
    const watchList = {};
    this._watched.forEach((entry, dir) => {
      const key = this.options.cwd ? sp__namespace.relative(this.options.cwd, dir) : dir;
      const index = key || ONE_DOT;
      watchList[index] = entry.getChildren().sort();
    });
    return watchList;
  }
  emitWithAll(event, args) {
    this.emit(event, ...args);
    if (event !== EVENTS.ERROR)
      this.emit(EVENTS.ALL, event, ...args);
  }
  // Common helpers
  // --------------
  /**
   * Normalize and emit events.
   * Calling _emit DOES NOT MEAN emit() would be called!
   * @param event Type of event
   * @param path File or directory path
   * @param stats arguments to be passed with event
   * @returns the error if defined, otherwise the value of the FSWatcher instance's `closed` flag
   */
  async _emit(event, path2, stats) {
    if (this.closed)
      return;
    const opts = this.options;
    if (isWindows)
      path2 = sp__namespace.normalize(path2);
    if (opts.cwd)
      path2 = sp__namespace.relative(opts.cwd, path2);
    const args = [path2];
    if (stats != null)
      args.push(stats);
    const awf = opts.awaitWriteFinish;
    let pw;
    if (awf && (pw = this._pendingWrites.get(path2))) {
      pw.lastChange = /* @__PURE__ */ new Date();
      return this;
    }
    if (opts.atomic) {
      if (event === EVENTS.UNLINK) {
        this._pendingUnlinks.set(path2, [event, ...args]);
        setTimeout(() => {
          this._pendingUnlinks.forEach((entry, path22) => {
            this.emit(...entry);
            this.emit(EVENTS.ALL, ...entry);
            this._pendingUnlinks.delete(path22);
          });
        }, typeof opts.atomic === "number" ? opts.atomic : 100);
        return this;
      }
      if (event === EVENTS.ADD && this._pendingUnlinks.has(path2)) {
        event = EVENTS.CHANGE;
        this._pendingUnlinks.delete(path2);
      }
    }
    if (awf && (event === EVENTS.ADD || event === EVENTS.CHANGE) && this._readyEmitted) {
      const awfEmit = (err, stats2) => {
        if (err) {
          event = EVENTS.ERROR;
          args[0] = err;
          this.emitWithAll(event, args);
        } else if (stats2) {
          if (args.length > 1) {
            args[1] = stats2;
          } else {
            args.push(stats2);
          }
          this.emitWithAll(event, args);
        }
      };
      this._awaitWriteFinish(path2, awf.stabilityThreshold, event, awfEmit);
      return this;
    }
    if (event === EVENTS.CHANGE) {
      const isThrottled = !this._throttle(EVENTS.CHANGE, path2, 50);
      if (isThrottled)
        return this;
    }
    if (opts.alwaysStat && stats === void 0 && (event === EVENTS.ADD || event === EVENTS.ADD_DIR || event === EVENTS.CHANGE)) {
      const fullPath = opts.cwd ? sp__namespace.join(opts.cwd, path2) : path2;
      let stats2;
      try {
        stats2 = await promises.stat(fullPath);
      } catch (err) {
      }
      if (!stats2 || this.closed)
        return;
      args.push(stats2);
    }
    this.emitWithAll(event, args);
    return this;
  }
  /**
   * Common handler for errors
   * @returns The error if defined, otherwise the value of the FSWatcher instance's `closed` flag
   */
  _handleError(error2) {
    const code2 = error2 && error2.code;
    if (error2 && code2 !== "ENOENT" && code2 !== "ENOTDIR" && (!this.options.ignorePermissionErrors || code2 !== "EPERM" && code2 !== "EACCES")) {
      this.emit(EVENTS.ERROR, error2);
    }
    return error2 || this.closed;
  }
  /**
   * Helper utility for throttling
   * @param actionType type being throttled
   * @param path being acted upon
   * @param timeout duration of time to suppress duplicate actions
   * @returns tracking object or false if action should be suppressed
   */
  _throttle(actionType, path2, timeout) {
    if (!this._throttled.has(actionType)) {
      this._throttled.set(actionType, /* @__PURE__ */ new Map());
    }
    const action = this._throttled.get(actionType);
    if (!action)
      throw new Error("invalid throttle");
    const actionPath = action.get(path2);
    if (actionPath) {
      actionPath.count++;
      return false;
    }
    let timeoutObject;
    const clear = () => {
      const item = action.get(path2);
      const count = item ? item.count : 0;
      action.delete(path2);
      clearTimeout(timeoutObject);
      if (item)
        clearTimeout(item.timeoutObject);
      return count;
    };
    timeoutObject = setTimeout(clear, timeout);
    const thr = { timeoutObject, clear, count: 0 };
    action.set(path2, thr);
    return thr;
  }
  _incrReadyCount() {
    return this._readyCount++;
  }
  /**
   * Awaits write operation to finish.
   * Polls a newly created file for size variations. When files size does not change for 'threshold' milliseconds calls callback.
   * @param path being acted upon
   * @param threshold Time in milliseconds a file size must be fixed before acknowledging write OP is finished
   * @param event
   * @param awfEmit Callback to be called when ready for event to be emitted.
   */
  _awaitWriteFinish(path2, threshold, event, awfEmit) {
    const awf = this.options.awaitWriteFinish;
    if (typeof awf !== "object")
      return;
    const pollInterval = awf.pollInterval;
    let timeoutHandler;
    let fullPath = path2;
    if (this.options.cwd && !sp__namespace.isAbsolute(path2)) {
      fullPath = sp__namespace.join(this.options.cwd, path2);
    }
    const now = /* @__PURE__ */ new Date();
    const writes = this._pendingWrites;
    function awaitWriteFinishFn(prevStat) {
      fs.stat(fullPath, (err, curStat) => {
        if (err || !writes.has(path2)) {
          if (err && err.code !== "ENOENT")
            awfEmit(err);
          return;
        }
        const now2 = Number(/* @__PURE__ */ new Date());
        if (prevStat && curStat.size !== prevStat.size) {
          writes.get(path2).lastChange = now2;
        }
        const pw = writes.get(path2);
        const df = now2 - pw.lastChange;
        if (df >= threshold) {
          writes.delete(path2);
          awfEmit(void 0, curStat);
        } else {
          timeoutHandler = setTimeout(awaitWriteFinishFn, pollInterval, curStat);
        }
      });
    }
    if (!writes.has(path2)) {
      writes.set(path2, {
        lastChange: now,
        cancelWait: () => {
          writes.delete(path2);
          clearTimeout(timeoutHandler);
          return event;
        }
      });
      timeoutHandler = setTimeout(awaitWriteFinishFn, pollInterval);
    }
  }
  /**
   * Determines whether user has asked to ignore this path.
   */
  _isIgnored(path2, stats) {
    if (this.options.atomic && DOT_RE.test(path2))
      return true;
    if (!this._userIgnored) {
      const { cwd } = this.options;
      const ign = this.options.ignored;
      const ignored = (ign || []).map(normalizeIgnored(cwd));
      const ignoredPaths = [...this._ignoredPaths];
      const list = [...ignoredPaths.map(normalizeIgnored(cwd)), ...ignored];
      this._userIgnored = anymatch(list);
    }
    return this._userIgnored(path2, stats);
  }
  _isntIgnored(path2, stat2) {
    return !this._isIgnored(path2, stat2);
  }
  /**
   * Provides a set of common helpers and properties relating to symlink handling.
   * @param path file or directory pattern being watched
   */
  _getWatchHelpers(path2) {
    return new WatchHelper(path2, this.options.followSymlinks, this);
  }
  // Directory helpers
  // -----------------
  /**
   * Provides directory tracking objects
   * @param directory path of the directory
   */
  _getWatchedDir(directory) {
    const dir = sp__namespace.resolve(directory);
    if (!this._watched.has(dir))
      this._watched.set(dir, new DirEntry(dir, this._boundRemove));
    return this._watched.get(dir);
  }
  // File helpers
  // ------------
  /**
   * Check for read permissions: https://stackoverflow.com/a/11781404/1358405
   */
  _hasReadPermissions(stats) {
    if (this.options.ignorePermissionErrors)
      return true;
    return Boolean(Number(stats.mode) & 256);
  }
  /**
   * Handles emitting unlink events for
   * files and directories, and via recursion, for
   * files and directories within directories that are unlinked
   * @param directory within which the following item is located
   * @param item      base path of item/directory
   */
  _remove(directory, item, isDirectory) {
    const path2 = sp__namespace.join(directory, item);
    const fullPath = sp__namespace.resolve(path2);
    isDirectory = isDirectory != null ? isDirectory : this._watched.has(path2) || this._watched.has(fullPath);
    if (!this._throttle("remove", path2, 100))
      return;
    if (!isDirectory && this._watched.size === 1) {
      this.add(directory, item, true);
    }
    const wp = this._getWatchedDir(path2);
    const nestedDirectoryChildren = wp.getChildren();
    nestedDirectoryChildren.forEach((nested) => this._remove(path2, nested));
    const parent = this._getWatchedDir(directory);
    const wasTracked = parent.has(item);
    parent.remove(item);
    if (this._symlinkPaths.has(fullPath)) {
      this._symlinkPaths.delete(fullPath);
    }
    let relPath = path2;
    if (this.options.cwd)
      relPath = sp__namespace.relative(this.options.cwd, path2);
    if (this.options.awaitWriteFinish && this._pendingWrites.has(relPath)) {
      const event = this._pendingWrites.get(relPath).cancelWait();
      if (event === EVENTS.ADD)
        return;
    }
    this._watched.delete(path2);
    this._watched.delete(fullPath);
    const eventName = isDirectory ? EVENTS.UNLINK_DIR : EVENTS.UNLINK;
    if (wasTracked && !this._isIgnored(path2))
      this._emit(eventName, path2);
    this._closePath(path2);
  }
  /**
   * Closes all watchers for a path
   */
  _closePath(path2) {
    this._closeFile(path2);
    const dir = sp__namespace.dirname(path2);
    this._getWatchedDir(dir).remove(sp__namespace.basename(path2));
  }
  /**
   * Closes only file-specific watchers
   */
  _closeFile(path2) {
    const closers = this._closers.get(path2);
    if (!closers)
      return;
    closers.forEach((closer) => closer());
    this._closers.delete(path2);
  }
  _addPathCloser(path2, closer) {
    if (!closer)
      return;
    let list = this._closers.get(path2);
    if (!list) {
      list = [];
      this._closers.set(path2, list);
    }
    list.push(closer);
  }
  _readdirp(root, opts) {
    if (this.closed)
      return;
    const options = { type: EVENTS.ALL, alwaysStat: true, lstat: true, ...opts, depth: 0 };
    let stream = readdirp(root, options);
    this._streams.add(stream);
    stream.once(STR_CLOSE, () => {
      stream = void 0;
    });
    stream.once(STR_END, () => {
      if (stream) {
        this._streams.delete(stream);
        stream = void 0;
      }
    });
    return stream;
  }
}
function watch(paths, options = {}) {
  const watcher2 = new FSWatcher(options);
  watcher2.add(paths);
  return watcher2;
}
electron.app.commandLine.appendSwitch("enable-features", "Vulkan");
electron.app.commandLine.appendSwitch("use-vulkan");
electron.app.commandLine.appendSwitch("enable-unsafe-webgpu");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const store = new ElectronStore({
  defaults: { vaultPath: null }
});
const settingsStore = new ElectronStore({
  name: "settings",
  defaults: {
    theme: "light",
    fontFamily: "system",
    fontSize: 17,
    ollamaBaseUrl: "http://localhost:11434",
    ollamaEnabled: true,
    preferredEngine: "ollama",
    autoFallback: true,
    customSystemPrompt: "",
    promptTemplates: [],
    defaultFormat: "md",
    smartFormatConversion: true
  }
});
let watcher = null;
const IGNORED_PATTERNS = [
  ".DS_Store",
  ".git",
  "node_modules",
  ".zennote",
  "*.swp",
  "*.swo",
  "*~"
];
let mainWindow = null;
function shouldIgnore(name) {
  if (name.startsWith(".")) return true;
  return IGNORED_PATTERNS.some((pattern2) => {
    if (pattern2.includes("*")) {
      const regex = new RegExp("^" + pattern2.replace(/\*/g, ".*") + "$");
      return regex.test(name);
    }
    return name === pattern2;
  });
}
async function readDirectoryTree(dirPath, rootPath) {
  const entries = await fs$1.promises.readdir(dirPath, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries) {
    if (shouldIgnore(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);
    const stat = await fs$1.promises.stat(fullPath);
    if (entry.isDirectory()) {
      const children = await readDirectoryTree(fullPath, rootPath);
      nodes.push({
        name: entry.name,
        path: relativePath,
        isDirectory: true,
        children,
        modifiedAt: stat.mtimeMs
      });
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if ([".txt", ".md", ".markdown"].includes(ext)) {
        nodes.push({
          name: entry.name,
          path: relativePath,
          isDirectory: false,
          extension: ext,
          modifiedAt: stat.mtimeMs
        });
      }
    }
  }
  return nodes.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    if (a.isDirectory && b.isDirectory) {
      return a.name.localeCompare(b.name, "zh-CN");
    }
    return (b.modifiedAt || 0) - (a.modifiedAt || 0);
  });
}
function ensureZenNoteDir(vaultPath) {
  const zennotePath = path.join(vaultPath, ".zennote");
  const chatsPath = path.join(zennotePath, "chats");
  if (!fs$1.existsSync(zennotePath)) {
    fs$1.mkdirSync(zennotePath, { recursive: true });
  }
  if (!fs$1.existsSync(chatsPath)) {
    fs$1.mkdirSync(chatsPath, { recursive: true });
  }
}
function setupIpcHandlers() {
  electron.ipcMain.handle("fs:getVaultPath", () => {
    const vaultPath = store.get("vaultPath");
    if (vaultPath) {
      if (!fs$1.existsSync(vaultPath)) {
        console.log("⚠️ Vault 文件夹不存在，自动清除配置:", vaultPath);
        store.set("vaultPath", null);
        return null;
      }
    }
    return vaultPath;
  });
  electron.ipcMain.handle("fs:setVaultPath", (_event, path2) => {
    store.set("vaultPath", path2);
    ensureZenNoteDir(path2);
    return true;
  });
  electron.ipcMain.handle("fs:selectDirectory", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "createDirectory"],
      title: "选择笔记存储目录",
      buttonLabel: "选择此文件夹"
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const selectedPath = result.filePaths[0];
    store.set("vaultPath", selectedPath);
    ensureZenNoteDir(selectedPath);
    return selectedPath;
  });
  electron.ipcMain.handle("fs:disconnectVault", async () => {
    store.delete("vaultPath");
    return true;
  });
  electron.ipcMain.handle("fs:readDirectory", async (_event, path2) => {
    const vaultPath = path2 || store.get("vaultPath");
    if (!vaultPath) return [];
    try {
      return await readDirectoryTree(vaultPath, vaultPath);
    } catch (error2) {
      console.error("读取目录失败:", error2);
      return [];
    }
  });
  electron.ipcMain.handle("fs:readFile", async (_event, relativePath) => {
    const vaultPath = store.get("vaultPath");
    if (!vaultPath) throw new Error("未设置 Vault 路径");
    const fullPath = path.join(vaultPath, relativePath);
    return await fs$1.promises.readFile(fullPath, "utf-8");
  });
  electron.ipcMain.handle("fs:writeFile", async (_event, relativePath, content2) => {
    const vaultPath = store.get("vaultPath");
    if (!vaultPath) throw new Error("未设置 Vault 路径");
    const fullPath = path.join(vaultPath, relativePath);
    await fs$1.promises.writeFile(fullPath, content2, "utf-8");
    return true;
  });
  electron.ipcMain.handle("fs:createFile", async (_event, relativePath) => {
    const vaultPath = store.get("vaultPath");
    if (!vaultPath) throw new Error("未设置 Vault 路径");
    const fullPath = path.join(vaultPath, relativePath);
    await fs$1.promises.writeFile(fullPath, "", "utf-8");
    return true;
  });
  electron.ipcMain.handle("fs:createDirectory", async (_event, relativePath) => {
    const vaultPath = store.get("vaultPath");
    if (!vaultPath) throw new Error("未设置 Vault 路径");
    const fullPath = path.join(vaultPath, relativePath);
    await fs$1.promises.mkdir(fullPath, { recursive: true });
    return true;
  });
  electron.ipcMain.handle("fs:deleteFile", async (_event, relativePath) => {
    const vaultPath = store.get("vaultPath");
    if (!vaultPath) throw new Error("未设置 Vault 路径");
    const fullPath = path.join(vaultPath, relativePath);
    const stat = await fs$1.promises.stat(fullPath);
    if (stat.isDirectory()) {
      await fs$1.promises.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs$1.promises.unlink(fullPath);
    }
    return true;
  });
  electron.ipcMain.handle("fs:renameFile", async (_event, oldPath, newPath) => {
    const vaultPath = store.get("vaultPath");
    if (!vaultPath) throw new Error("未设置 Vault 路径");
    const fullOldPath = path.join(vaultPath, oldPath);
    const fullNewPath = path.join(vaultPath, newPath);
    await fs$1.promises.rename(fullOldPath, fullNewPath);
    return true;
  });
  electron.ipcMain.handle("chat:load", async (_event, filePath) => {
    const vaultPath = store.get("vaultPath");
    if (!vaultPath) return [];
    const chatKey = Buffer.from(filePath).toString("base64").replace(/[\/+=]/g, "_");
    const chatPath = path.join(vaultPath, ".zennote", "chats", `${chatKey}.json`);
    try {
      const content2 = await fs$1.promises.readFile(chatPath, "utf-8");
      return JSON.parse(content2);
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("chat:save", async (_event, filePath, messages) => {
    const vaultPath = store.get("vaultPath");
    if (!vaultPath) return false;
    ensureZenNoteDir(vaultPath);
    const chatKey = Buffer.from(filePath).toString("base64").replace(/[\/+=]/g, "_");
    const chatPath = path.join(vaultPath, ".zennote", "chats", `${chatKey}.json`);
    await fs$1.promises.writeFile(chatPath, JSON.stringify(messages, null, 2), "utf-8");
    return true;
  });
  electron.ipcMain.handle("fs:watch", (_event, path$1) => {
    const vaultPath = path$1 || store.get("vaultPath");
    if (!vaultPath) return false;
    if (watcher) {
      watcher.close();
    }
    watcher = watch(vaultPath, {
      ignored: (filePath) => {
        const name = path.basename(filePath);
        return shouldIgnore(name);
      },
      persistent: true,
      ignoreInitial: true,
      depth: 10
    });
    watcher.on("add", (filePath) => {
      const relativePath = path.relative(vaultPath, filePath);
      mainWindow == null ? void 0 : mainWindow.webContents.send("fs:change", { type: "add", path: relativePath });
    });
    watcher.on("unlink", (filePath) => {
      const relativePath = path.relative(vaultPath, filePath);
      mainWindow == null ? void 0 : mainWindow.webContents.send("fs:change", { type: "unlink", path: relativePath });
    });
    watcher.on("change", (filePath) => {
      const relativePath = path.relative(vaultPath, filePath);
      mainWindow == null ? void 0 : mainWindow.webContents.send("fs:change", { type: "change", path: relativePath });
    });
    watcher.on("addDir", (filePath) => {
      const relativePath = path.relative(vaultPath, filePath);
      mainWindow == null ? void 0 : mainWindow.webContents.send("fs:change", { type: "addDir", path: relativePath });
    });
    watcher.on("unlinkDir", (filePath) => {
      const relativePath = path.relative(vaultPath, filePath);
      mainWindow == null ? void 0 : mainWindow.webContents.send("fs:change", { type: "unlinkDir", path: relativePath });
    });
    console.log("📂 开始监听目录:", vaultPath);
    return true;
  });
  electron.ipcMain.handle("fs:unwatch", () => {
    if (watcher) {
      watcher.close();
      watcher = null;
      console.log("📂 停止监听目录");
    }
    return true;
  });
  electron.ipcMain.handle("window:setWidth", (_event, width) => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({ ...bounds, width });
      return true;
    }
    return false;
  });
  electron.ipcMain.handle("app:getVersion", () => {
    return electron.app.getVersion();
  });
  electron.ipcMain.handle("settings:get", () => {
    return settingsStore.store;
  });
  electron.ipcMain.handle("settings:set", (_event, key, value) => {
    settingsStore.set(key, value);
    return true;
  });
  electron.ipcMain.handle("settings:reset", () => {
    settingsStore.clear();
    return true;
  });
  const ollamaEnv = {
    ...process.env,
    OLLAMA_HOST: "127.0.0.1:11434"
  };
  electron.ipcMain.handle("ollama:listModels", async () => {
    try {
      return new Promise((resolve2) => {
        const cmd = child_process.spawn("ollama", ["list"], { env: ollamaEnv });
        let output = "";
        cmd.stdout.on("data", (data) => {
          output += data.toString();
        });
        cmd.on("close", (code2) => {
          if (code2 === 0) {
            try {
              const lines = output.trim().split("\n").slice(1);
              const models = lines.map((line) => {
                const parts = line.split(/\s{2,}/);
                if (parts.length >= 3) {
                  return {
                    name: parts[0],
                    id: parts[1],
                    size: parts[2],
                    modified: parts[3] || ""
                  };
                }
                return null;
              }).filter((m) => m !== null);
              resolve2({ success: true, models });
            } catch {
              resolve2({ success: false, error: "解析模型列表失败" });
            }
          } else {
            resolve2({ success: false, error: "获取模型列表失败" });
          }
        });
        cmd.on("error", (err) => {
          resolve2({ success: false, error: err.message });
        });
      });
    } catch (error2) {
      return { success: false, error: error2 instanceof Error ? error2.message : "Unknown error" };
    }
  });
  const pullProcesses = /* @__PURE__ */ new Map();
  electron.ipcMain.handle("ollama:pullModel", async (_event, modelName) => {
    return new Promise((resolve2, reject) => {
      var _a, _b;
      const pullProcess = child_process.spawn("ollama", ["pull", modelName], { env: ollamaEnv });
      pullProcesses.set(modelName, pullProcess);
      let output = "";
      (_a = pullProcess.stdout) == null ? void 0 : _a.on("data", (data) => {
        const text = data.toString();
        output += text;
        mainWindow == null ? void 0 : mainWindow.webContents.send("ollama:pullProgress", { model: modelName, output: text });
      });
      (_b = pullProcess.stderr) == null ? void 0 : _b.on("data", (data) => {
        const text = data.toString();
        output += text;
        mainWindow == null ? void 0 : mainWindow.webContents.send("ollama:pullProgress", { model: modelName, output: text });
      });
      pullProcess.on("close", (code2) => {
        pullProcesses.delete(modelName);
        if (code2 === 0) {
          resolve2({ success: true, output });
        } else {
          reject(new Error(`下载失败，退出码: ${code2}`));
        }
      });
      pullProcess.on("error", (error2) => {
        pullProcesses.delete(modelName);
        reject(error2);
      });
    });
  });
  electron.ipcMain.handle("ollama:cancelPull", async (_event, modelName) => {
    if (modelName && pullProcesses.has(modelName)) {
      console.log(`🛑 取消下载: ${modelName}`);
      const process2 = pullProcesses.get(modelName);
      process2.kill("SIGTERM");
      pullProcesses.delete(modelName);
      try {
        child_process.spawn("ollama", ["rm", modelName], { env: ollamaEnv });
        console.log(`🗑️ 已清理未完成的模型: ${modelName}`);
      } catch (e) {
        console.log("清理未完成模型失败:", e);
      }
      return { success: true, cancelled: modelName };
    }
    if (pullProcesses.size > 0) {
      const cancelledModels = [];
      Array.from(pullProcesses.entries()).forEach(([name, proc]) => {
        console.log(`🛑 取消下载: ${name}`);
        proc.kill("SIGTERM");
        cancelledModels.push(name);
        try {
          child_process.spawn("ollama", ["rm", name], { env: ollamaEnv });
          console.log(`🗑️ 已清理未完成的模型: ${name}`);
        } catch (e) {
          console.log("清理未完成模型失败:", e);
        }
      });
      pullProcesses.clear();
      return { success: true, cancelled: cancelledModels.join(", ") };
    }
    return { success: false, error: "没有正在进行的下载" };
  });
  electron.ipcMain.handle("ollama:deleteModel", async (_event, modelName) => {
    return new Promise((resolve2, reject) => {
      const deleteProcess = child_process.spawn("ollama", ["rm", modelName], { env: ollamaEnv });
      deleteProcess.on("close", (code2) => {
        if (code2 === 0) {
          resolve2({ success: true });
        } else {
          reject(new Error(`删除失败，退出码: ${code2}`));
        }
      });
      deleteProcess.on("error", (error2) => reject(error2));
    });
  });
}
function createWindow() {
  const isMac = process.platform === "darwin";
  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 400,
    // 允许更小的窗口（触发专注模式）
    minHeight: 300,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      experimentalFeatures: true
    }
  };
  if (isMac) {
    Object.assign(windowOptions, {
      vibrancy: "sidebar",
      visualEffectState: "active",
      transparent: true,
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 20, y: 18 },
      frame: false
    });
  } else {
    Object.assign(windowOptions, {
      frame: true,
      transparent: false
    });
  }
  mainWindow = new electron.BrowserWindow(windowOptions);
  if (!isMac) {
    electron.Menu.setApplicationMenu(null);
  }
  if (VITE_DEV_SERVER_URL) {
    console.log("🔗 开发模式: 连接到", VITE_DEV_SERVER_URL);
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(electron.app.getAppPath(), "dist", "index.html");
    console.log("📦 生产模式: 加载", indexPath);
    mainWindow.loadFile(indexPath);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("✅ 页面加载完成");
  });
}
electron.app.whenReady().then(async () => {
  setupIpcHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (watcher) {
    watcher.close();
  }
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
console.log("🧘 智简笔记本启动中...");
console.log("📊 VITE_DEV_SERVER_URL:", VITE_DEV_SERVER_URL || "未设置 (生产模式)");
