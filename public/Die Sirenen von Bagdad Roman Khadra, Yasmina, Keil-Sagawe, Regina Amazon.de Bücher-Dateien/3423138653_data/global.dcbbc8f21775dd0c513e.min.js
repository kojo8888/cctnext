// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2017 Kris Kowal under the terms of the MIT
 * license found at https://github.com/kriskowal/q/blob/v1/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
        // Prefer window over self for add-on scripts. Use self for
        // non-windowed contexts.
        var global = typeof window !== "undefined" ? window : self;

        // Get the `window` object, save the previous Q global
        // and initialize Q as a global.
        var previousQ = global.Q;
        global.Q = definition();

        // Add a noConflict function so Q can be removed from the
        // global namespace.
        global.Q.noConflict = function () {
            global.Q = previousQ;
            return this;
        };

    } else {
        throw new Error("This environment was not anticipated by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.toString()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_defineProperty = Object.defineProperty || function (obj, prop, descriptor) {
    obj[prop] = descriptor.value;
    return obj;
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack && (!error.__minimumStackCounter__ || error.__minimumStackCounter__ > p.stackCounter)) {
                object_defineProperty(error, "__minimumStackCounter__", {value: p.stackCounter, configurable: true});
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        var stack = filterStackString(concatedStacks);
        object_defineProperty(error, "stack", {value: stack, configurable: true});
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * The counter is used to determine the stopping point for building
 * long stack traces. In makeStackTraceLong we walk backwards through
 * the linked list of promises, only stacks which were created before
 * the rejection are concatenated.
 */
var longStackCounter = 1;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
            promise.stackCounter = longStackCounter++;
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;

        if (Q.longStackSupport && hasStacks) {
            // Only hold a reference to the new promise if long stacks
            // are enabled to reduce memory usage
            promise.source = newPromise;
        }

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Q can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected(err) {
            pendingCount--;
            if (pendingCount === 0) {
                var rejection = err || new Error("" + err);

                rejection.message = ("Q can't get fulfillment value from any promise, all " +
                    "promises were rejected. Last error message: " + rejection.message);

                deferred.reject(rejection);
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    if (!callback || typeof callback.apply !== "function") {
        throw new Error("Q can't apply finally callback");
    }
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    if (callback === undefined) {
        throw new Error("Q can't wrap an undefined function");
    }
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

/*!
 * jQuery JavaScript Library v3.4.1
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2019-05-01T21:04Z
 */
( function( global, factory ) {

	"use strict";

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var document = window.document;

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};

var isFunction = function isFunction( obj ) {

      // Support: Chrome <=57, Firefox <=52
      // In some browsers, typeof returns "function" for HTML <object> elements
      // (i.e., `typeof document.createElement( "object" ) === "function"`).
      // We don't want to classify *any* DOM node as a function.
      return typeof obj === "function" && typeof obj.nodeType !== "number";
  };


var isWindow = function isWindow( obj ) {
		return obj != null && obj === obj.window;
	};




	var preservedScriptAttributes = {
		type: true,
		src: true,
		nonce: true,
		noModule: true
	};

	function DOMEval( code, node, doc ) {
		doc = doc || document;

		var i, val,
			script = doc.createElement( "script" );

		script.text = code;
		if ( node ) {
			for ( i in preservedScriptAttributes ) {

				// Support: Firefox 64+, Edge 18+
				// Some browsers don't support the "nonce" property on scripts.
				// On the other hand, just using `getAttribute` is not enough as
				// the `nonce` attribute is reset to an empty string whenever it
				// becomes browsing-context connected.
				// See https://github.com/whatwg/html/issues/2369
				// See https://html.spec.whatwg.org/#nonce-attributes
				// The `node.getAttribute` check was added for the sake of
				// `jQuery.globalEval` so that it can fake a nonce-containing node
				// via an object.
				val = node[ i ] || node.getAttribute && node.getAttribute( i );
				if ( val ) {
					script.setAttribute( i, val );
				}
			}
		}
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}


function toType( obj ) {
	if ( obj == null ) {
		return obj + "";
	}

	// Support: Android <=2.3 only (functionish RegExp)
	return typeof obj === "object" || typeof obj === "function" ?
		class2type[ toString.call( obj ) ] || "object" :
		typeof obj;
}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.4.1",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android <=4.0 only
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				copy = options[ name ];

				// Prevent Object.prototype pollution
				// Prevent never-ending loop
				if ( name === "__proto__" || target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = Array.isArray( copy ) ) ) ) {
					src = target[ name ];

					// Ensure proper type for the source value
					if ( copyIsArray && !Array.isArray( src ) ) {
						clone = [];
					} else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
						clone = {};
					} else {
						clone = src;
					}
					copyIsArray = false;

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	// Evaluates a script in a global context
	globalEval: function( code, options ) {
		DOMEval( code, { nonce: options && options.nonce } );
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// Support: Android <=4.0 only
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
function( i, name ) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = toType( obj );

	if ( isFunction( obj ) || isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.4
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://js.foundation/
 *
 * Date: 2019-04-08
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	nonnativeSelectorCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),
	rdescend = new RegExp( whitespace + "|>" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rhtml = /HTML$/i,
	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" + ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	inDisabledFieldset = addCombinator(
		function( elem ) {
			return elem.disabled === true && elem.nodeName.toLowerCase() === "fieldset";
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {

		if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
			setDocument( context );
		}
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

				// ID selector
				if ( (m = match[1]) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( (elem = context.getElementById( m )) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && (elem = newContext.getElementById( m )) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[2] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( (m = match[3]) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!nonnativeSelectorCache[ selector + " " ] &&
				(!rbuggyQSA || !rbuggyQSA.test( selector )) &&

				// Support: IE 8 only
				// Exclude object elements
				(nodeType !== 1 || context.nodeName.toLowerCase() !== "object") ) {

				newSelector = selector;
				newContext = context;

				// qSA considers elements outside a scoping root when evaluating child or
				// descendant combinators, which is not what we want.
				// In such cases, we work around the behavior by prefixing every selector in the
				// list with an ID selector referencing the scope context.
				// Thanks to Andrew Dupont for this technique.
				if ( nodeType === 1 && rdescend.test( selector ) ) {

					// Capture the context ID, setting it first if necessary
					if ( (nid = context.getAttribute( "id" )) ) {
						nid = nid.replace( rcssescape, fcssescape );
					} else {
						context.setAttribute( "id", (nid = expando) );
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[i] = "#" + nid + " " + toSelector( groups[i] );
					}
					newSelector = groups.join( "," );

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;
				}

				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch ( qsaError ) {
					nonnativeSelectorCache( selector, true );
				} finally {
					if ( nid === expando ) {
						context.removeAttribute( "id" );
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement("fieldset");

	try {
		return !!fn( el );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}
		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
						inDisabledFieldset( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	var namespace = elem.namespaceURI,
		docElem = (elem.ownerDocument || elem).documentElement;

	// Support: IE <=8
	// Assume HTML when documentElement doesn't yet exist, such as inside loading iframes
	// https://bugs.jquery.com/ticket/4833
	return !rhtml.test( namespace || docElem && docElem.nodeName || "HTML" );
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9-11, Edge
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	if ( preferredDoc !== document &&
		(subWindow = document.defaultView) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( el ) {
		el.className = "i";
		return !el.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( el ) {
		el.appendChild( document.createComment("") );
		return !el.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	});

	// ID filter and find
	if ( support.getById ) {
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode("id");
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( (elem = elems[i++]) ) {
						node = elem.getAttributeNode("id");
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( el ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement("input");
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll(":enabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll(":disabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( el ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === document ? -1 :
				b === document ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	if ( support.matchesSelector && documentIsHTML &&
		!nonnativeSelectorCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {
			nonnativeSelectorCache( expr, true );
		}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return (sel + "").replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || (node[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								(outerCache[ node.uniqueID ] = {});

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {
							// Use previously-cached element index if available
							if ( useCache ) {
								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {
								// Use the same loop as above to seek `elem` from the start
								while ( (node = ++nodeIndex && node && node[ dir ] ||
									(diff = nodeIndex = 0) || start.pop()) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] || (node[ expando ] = {});

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												(outerCache[ node.uniqueID ] = {});

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ?
				argument + length :
				argument > length ?
					length :
					argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( (oldCache = uniqueCache[ key ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context === document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					if ( !context && elem.ownerDocument !== document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context || document, xml) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( el ) {
	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement("fieldset") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( el ) {
	return el.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;



function nodeName( elem, name ) {

  return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

};
var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Filtered directly for both simple and complex selectors
	return jQuery.filter( qualifier, elements, not );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
		if ( typeof elem.contentDocument !== "undefined" ) {
			return elem.contentDocument;
		}

		// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
		// Treat the template element as a regular one in browsers that
		// don't support it.
		if ( nodeName( elem, "template" ) ) {
			elem = elem.content || elem;
		}

		return jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = locked || options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && toType( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject, noValue ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
			// * false: [ value ].slice( 0 ) => resolve( value )
			// * true: [ value ].slice( 1 ) => resolve()
			resolve.apply( undefined, [ value ].slice( noValue ) );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.apply( undefined, [ value ] );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// rejected_handlers.disable
					// fulfilled_handlers.disable
					tuples[ 3 - i ][ 3 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock,

					// progress_handlers.lock
					tuples[ 0 ][ 3 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the master Deferred
			master = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						master.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, master.done( updateFunc( i ) ).resolve, master.reject,
				!remaining );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( master.state() === "pending" ||
				isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return master.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), master.reject );
		}

		return master.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( toType( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
					value :
					value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};


// Matches dashed string for camelizing
var rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g;

// Used by camelCase as callback to replace()
function fcamelCase( all, letter ) {
	return letter.toUpperCase();
}

// Convert dashed to camelCase; used by the css and data modules
// Support: IE <=9 - 11, Edge 12 - 15
// Microsoft forgot to hump their vendor prefix (#9572)
function camelCase( string ) {
	return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
}
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( Array.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( camelCase );
			} else {
				key = camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || Array.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var documentElement = document.documentElement;



	var isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem );
		},
		composed = { composed: true };

	// Support: IE 9 - 11+, Edge 12 - 18+, iOS 10.0 - 10.2 only
	// Check attachment across shadow DOM boundaries when possible (gh-3504)
	// Support: iOS 10.0-10.2 only
	// Early iOS 10 versions support `attachShadow` but not `getRootNode`,
	// leading to errors. We need to check for `getRootNode`.
	if ( documentElement.getRootNode ) {
		isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem ) ||
				elem.getRootNode( composed ) === elem.ownerDocument;
		};
	}
var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			isAttached( elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};

var swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};




function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted, scale,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = elem.nodeType &&
			( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Support: Firefox <=54
		// Halve the iteration target value to prevent interference from CSS upper bounds (gh-2144)
		initial = initial / 2;

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		while ( maxIterations-- ) {

			// Evaluate and update our best guess (doubling guesses that zero out).
			// Finish if the scale equals or crosses 1 (making the old*new product non-positive).
			jQuery.style( elem, prop, initialInUnit + unit );
			if ( ( 1 - scale ) * ( 1 - ( scale = currentValue() / initial || 0.5 ) ) <= 0 ) {
				maxIterations = 0;
			}
			initialInUnit = initialInUnit / scale;

		}

		initialInUnit = initialInUnit * 2;
		jQuery.style( elem, prop, initialInUnit + unit );

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]*)/i );

var rscriptType = ( /^$|^module$|\/(?:java|ecma)script/i );



// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// Support: IE <=9 only
	option: [ 1, "<select multiple='multiple'>", "</select>" ],

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

// Support: IE <=9 only
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, attached, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( toType( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		attached = isAttached( elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( attached ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
} )();


var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 - 11+
// focus() and blur() are asynchronous, except when they are no-op.
// So expect focus to be synchronous when the element is already active,
// and blur to be synchronous when the element is not already active.
// (focus and blur are always synchronous in other supported browsers,
// this just defines when we can count on it).
function expectSync( elem, type ) {
	return ( elem === safeActiveElement() ) === ( type === "focus" );
}

// Support: IE <=9 only
// Accessing document.activeElement can throw unexpectedly
// https://bugs.jquery.com/ticket/13393
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = {};
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		// Make a writable jQuery.Event from the native event object
		var event = jQuery.event.fix( nativeEvent );

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),
			handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// If the event is namespaced, then each handler is only invoked if it is
				// specially universal or its namespaces are a superset of the event's.
				if ( !event.rnamespace || handleObj.namespace === false ||
					event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
							return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
							return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		click: {

			// Utilize native event to ensure correct state for checkable inputs
			setup: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Claim the first handler
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					// dataPriv.set( el, "click", ... )
					leverageNative( el, "click", returnTrue );
				}

				// Return false to allow normal processing in the caller
				return false;
			},
			trigger: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Force setup before triggering a click
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					leverageNative( el, "click" );
				}

				// Return non-false to allow normal event-path propagation
				return true;
			},

			// For cross-browser consistency, suppress native .click() on links
			// Also prevent it if we're currently inside a leveraged native-event stack
			_default: function( event ) {
				var target = event.target;
				return rcheckableType.test( target.type ) &&
					target.click && nodeName( target, "input" ) &&
					dataPriv.get( target, "click" ) ||
					nodeName( target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

// Ensure the presence of an event listener that handles manually-triggered
// synthetic events by interrupting progress until reinvoked in response to
// *native* events that it fires directly, ensuring that state changes have
// already occurred before other listeners are invoked.
function leverageNative( el, type, expectSync ) {

	// Missing expectSync indicates a trigger call, which must force setup through jQuery.event.add
	if ( !expectSync ) {
		if ( dataPriv.get( el, type ) === undefined ) {
			jQuery.event.add( el, type, returnTrue );
		}
		return;
	}

	// Register the controller as a special universal handler for all event namespaces
	dataPriv.set( el, type, false );
	jQuery.event.add( el, type, {
		namespace: false,
		handler: function( event ) {
			var notAsync, result,
				saved = dataPriv.get( this, type );

			if ( ( event.isTrigger & 1 ) && this[ type ] ) {

				// Interrupt processing of the outer synthetic .trigger()ed event
				// Saved data should be false in such cases, but might be a leftover capture object
				// from an async native handler (gh-4350)
				if ( !saved.length ) {

					// Store arguments for use when handling the inner native event
					// There will always be at least one argument (an event object), so this array
					// will not be confused with a leftover capture object.
					saved = slice.call( arguments );
					dataPriv.set( this, type, saved );

					// Trigger the native event and capture its result
					// Support: IE <=9 - 11+
					// focus() and blur() are asynchronous
					notAsync = expectSync( this, type );
					this[ type ]();
					result = dataPriv.get( this, type );
					if ( saved !== result || notAsync ) {
						dataPriv.set( this, type, false );
					} else {
						result = {};
					}
					if ( saved !== result ) {

						// Cancel the outer synthetic event
						event.stopImmediatePropagation();
						event.preventDefault();
						return result.value;
					}

				// If this is an inner synthetic event for an event with a bubbling surrogate
				// (focus or blur), assume that the surrogate already propagated from triggering the
				// native event and prevent that from happening again here.
				// This technically gets the ordering wrong w.r.t. to `.trigger()` (in which the
				// bubbling surrogate propagates *after* the non-bubbling base), but that seems
				// less bad than duplication.
				} else if ( ( jQuery.event.special[ type ] || {} ).delegateType ) {
					event.stopPropagation();
				}

			// If this is a native event triggered above, everything is now in order
			// Fire an inner synthetic event with the original arguments
			} else if ( saved.length ) {

				// ...and capture the result
				dataPriv.set( this, type, {
					value: jQuery.event.trigger(

						// Support: IE <=9 - 11+
						// Extend with the prototype to reset the above stopImmediatePropagation()
						jQuery.extend( saved[ 0 ], jQuery.Event.prototype ),
						saved.slice( 1 ),
						this
					)
				} );

				// Abort handling of the native event
				event.stopImmediatePropagation();
			}
		}
	} );
}

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || Date.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	code: true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,

	which: function( event ) {
		var button = event.button;

		// Add which for key events
		if ( event.which == null && rkeyEvent.test( event.type ) ) {
			return event.charCode != null ? event.charCode : event.keyCode;
		}

		// Add which for click: 1 === left; 2 === middle; 3 === right
		if ( !event.which && button !== undefined && rmouseEvent.test( event.type ) ) {
			if ( button & 1 ) {
				return 1;
			}

			if ( button & 2 ) {
				return 3;
			}

			if ( button & 4 ) {
				return 2;
			}

			return 0;
		}

		return event.which;
	}
}, jQuery.event.addProp );

jQuery.each( { focus: "focusin", blur: "focusout" }, function( type, delegateType ) {
	jQuery.event.special[ type ] = {

		// Utilize native event if possible so blur/focus sequence is correct
		setup: function() {

			// Claim the first handler
			// dataPriv.set( this, "focus", ... )
			// dataPriv.set( this, "blur", ... )
			leverageNative( this, type, expectSync );

			// Return false to allow normal processing in the caller
			return false;
		},
		trigger: function() {

			// Force setup before trigger
			leverageNative( this, type );

			// Return non-false to allow normal event-path propagation
			return true;
		},

		delegateType: delegateType
	};
} );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	/* eslint-disable max-len */

	// See https://github.com/eslint/eslint/issues/3229
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,

	/* eslint-enable */

	// Support: IE <=10 - 11, Edge 12 - 13 only
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

// Prefer a tbody over its parent table for containing new rows
function manipulationTarget( elem, content ) {
	if ( nodeName( elem, "table" ) &&
		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return jQuery( elem ).children( "tbody" )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	if ( ( elem.type || "" ).slice( 0, 5 ) === "true/" ) {
		elem.type = elem.type.slice( 5 );
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.access( src );
		pdataCur = dataPriv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = concat.apply( [], args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		valueIsFunction = isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( valueIsFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( valueIsFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src && ( node.type || "" ).toLowerCase()  !== "module" ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl && !node.noModule ) {
								jQuery._evalUrl( node.src, {
									nonce: node.nonce || node.getAttribute( "nonce" )
								} );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && isAttached( node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html.replace( rxhtmlTag, "<$1></$2>" );
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = isAttached( elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};

var rboxStyle = new RegExp( cssExpand.join( "|" ), "i" );



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		container.style.cssText = "position:absolute;left:-11111px;width:60px;" +
			"margin-top:1px;padding:0;border:0";
		div.style.cssText =
			"position:relative;display:block;box-sizing:border-box;overflow:scroll;" +
			"margin:auto;border:1px;padding:1px;" +
			"width:60%;top:1%";
		documentElement.appendChild( container ).appendChild( div );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = roundPixelMeasures( divStyle.marginLeft ) === 12;

		// Support: Android 4.0 - 4.3 only, Safari <=9.1 - 10.1, iOS <=7.0 - 9.3
		// Some styles come back with percentage values, even though they shouldn't
		div.style.right = "60%";
		pixelBoxStylesVal = roundPixelMeasures( divStyle.right ) === 36;

		// Support: IE 9 - 11 only
		// Detect misreporting of content dimensions for box-sizing:border-box elements
		boxSizingReliableVal = roundPixelMeasures( divStyle.width ) === 36;

		// Support: IE 9 only
		// Detect overflow:scroll screwiness (gh-3699)
		// Support: Chrome <=64
		// Don't get tricked when zoom affects offsetWidth (gh-4029)
		div.style.position = "absolute";
		scrollboxSizeVal = roundPixelMeasures( div.offsetWidth / 3 ) === 12;

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	function roundPixelMeasures( measure ) {
		return Math.round( parseFloat( measure ) );
	}

	var pixelPositionVal, boxSizingReliableVal, scrollboxSizeVal, pixelBoxStylesVal,
		reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	jQuery.extend( support, {
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelBoxStyles: function() {
			computeStyleTests();
			return pixelBoxStylesVal;
		},
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		},
		scrollboxSize: function() {
			computeStyleTests();
			return scrollboxSizeVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,

		// Support: Firefox 51+
		// Retrieving style before computed somehow
		// fixes an issue with getting wrong values
		// on detached elements
		style = elem.style;

	computed = computed || getStyles( elem );

	// getPropertyValue is needed for:
	//   .css('filter') (IE 9 only, #12537)
	//   .css('--customProperty) (#3144)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !isAttached( elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelBoxStyles() && rnumnonpx.test( ret ) && rboxStyle.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style,
	vendorProps = {};

// Return a vendor-prefixed property or undefined
function vendorPropName( name ) {

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

// Return a potentially-mapped jQuery.cssProps or vendor prefixed property
function finalPropName( name ) {
	var final = jQuery.cssProps[ name ] || vendorProps[ name ];

	if ( final ) {
		return final;
	}
	if ( name in emptyStyle ) {
		return name;
	}
	return vendorProps[ name ] = vendorPropName( name ) || name;
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rcustomProp = /^--/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	};

function setPositiveNumber( elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function boxModelAdjustment( elem, dimension, box, isBorderBox, styles, computedVal ) {
	var i = dimension === "width" ? 1 : 0,
		extra = 0,
		delta = 0;

	// Adjustment may not be necessary
	if ( box === ( isBorderBox ? "border" : "content" ) ) {
		return 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin
		if ( box === "margin" ) {
			delta += jQuery.css( elem, box + cssExpand[ i ], true, styles );
		}

		// If we get here with a content-box, we're seeking "padding" or "border" or "margin"
		if ( !isBorderBox ) {

			// Add padding
			delta += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// For "border" or "margin", add border
			if ( box !== "padding" ) {
				delta += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );

			// But still keep track of it otherwise
			} else {
				extra += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}

		// If we get here with a border-box (content + padding + border), we're seeking "content" or
		// "padding" or "margin"
		} else {

			// For "content", subtract padding
			if ( box === "content" ) {
				delta -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// For "content" or "padding", subtract border
			if ( box !== "margin" ) {
				delta -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	// Account for positive content-box scroll gutter when requested by providing computedVal
	if ( !isBorderBox && computedVal >= 0 ) {

		// offsetWidth/offsetHeight is a rounded sum of content, padding, scroll gutter, and border
		// Assuming integer scroll gutter, subtract the rest and round down
		delta += Math.max( 0, Math.ceil(
			elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
			computedVal -
			delta -
			extra -
			0.5

		// If offsetWidth/offsetHeight is unknown, then we can't determine content-box scroll gutter
		// Use an explicit zero to avoid NaN (gh-3964)
		) ) || 0;
	}

	return delta;
}

function getWidthOrHeight( elem, dimension, extra ) {

	// Start with computed style
	var styles = getStyles( elem ),

		// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-4322).
		// Fake content-box until we know it's needed to know the true value.
		boxSizingNeeded = !support.boxSizingReliable() || extra,
		isBorderBox = boxSizingNeeded &&
			jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
		valueIsBorderBox = isBorderBox,

		val = curCSS( elem, dimension, styles ),
		offsetProp = "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 );

	// Support: Firefox <=54
	// Return a confounding non-pixel value or feign ignorance, as appropriate.
	if ( rnumnonpx.test( val ) ) {
		if ( !extra ) {
			return val;
		}
		val = "auto";
	}


	// Fall back to offsetWidth/offsetHeight when value is "auto"
	// This happens for inline elements with no explicit setting (gh-3571)
	// Support: Android <=4.1 - 4.3 only
	// Also use offsetWidth/offsetHeight for misreported inline dimensions (gh-3602)
	// Support: IE 9-11 only
	// Also use offsetWidth/offsetHeight for when box sizing is unreliable
	// We use getClientRects() to check for hidden/disconnected.
	// In those cases, the computed value can be trusted to be border-box
	if ( ( !support.boxSizingReliable() && isBorderBox ||
		val === "auto" ||
		!parseFloat( val ) && jQuery.css( elem, "display", false, styles ) === "inline" ) &&
		elem.getClientRects().length ) {

		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

		// Where available, offsetWidth/offsetHeight approximate border box dimensions.
		// Where not available (e.g., SVG), assume unreliable box-sizing and interpret the
		// retrieved value as a content box dimension.
		valueIsBorderBox = offsetProp in elem;
		if ( valueIsBorderBox ) {
			val = elem[ offsetProp ];
		}
	}

	// Normalize "" and auto
	val = parseFloat( val ) || 0;

	// Adjust for the element's box model
	return ( val +
		boxModelAdjustment(
			elem,
			dimension,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles,

			// Provide the current computed size to request scroll gutter calculation (gh-3589)
			val
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"gridArea": true,
		"gridColumn": true,
		"gridColumnEnd": true,
		"gridColumnStart": true,
		"gridRow": true,
		"gridRowEnd": true,
		"gridRowStart": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name ),
			style = elem.style;

		// Make sure that we're working with the right name. We don't
		// want to query the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			// The isCustomProp check can be removed in jQuery 4.0 when we only auto-append
			// "px" to a few hardcoded values.
			if ( type === "number" && !isCustomProp ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				if ( isCustomProp ) {
					style.setProperty( name, value );
				} else {
					style[ name ] = value;
				}
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name );

		// Make sure that we're working with the right name. We don't
		// want to modify the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}

		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( i, dimension ) {
	jQuery.cssHooks[ dimension ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
						swap( elem, cssShow, function() {
							return getWidthOrHeight( elem, dimension, extra );
						} ) :
						getWidthOrHeight( elem, dimension, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = getStyles( elem ),

				// Only read styles.position if the test has a chance to fail
				// to avoid forcing a reflow.
				scrollboxSizeBuggy = !support.scrollboxSize() &&
					styles.position === "absolute",

				// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-3991)
				boxSizingNeeded = scrollboxSizeBuggy || extra,
				isBorderBox = boxSizingNeeded &&
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
				subtract = extra ?
					boxModelAdjustment(
						elem,
						dimension,
						extra,
						isBorderBox,
						styles
					) :
					0;

			// Account for unreliable border-box dimensions by comparing offset* to computed and
			// faking a content-box to get border and padding (gh-3699)
			if ( isBorderBox && scrollboxSizeBuggy ) {
				subtract -= Math.ceil(
					elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
					parseFloat( styles[ dimension ] ) -
					boxModelAdjustment( elem, dimension, "border", false, styles ) -
					0.5
				);
			}

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ dimension ] = value;
				value = jQuery.css( elem, dimension );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
				) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( prefix !== "margin" ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( Array.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 && (
					jQuery.cssHooks[ tween.prop ] ||
					tween.elem.style[ finalPropName( tween.prop ) ] != null ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, inProgress,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function schedule() {
	if ( inProgress ) {
		if ( document.hidden === false && window.requestAnimationFrame ) {
			window.requestAnimationFrame( schedule );
		} else {
			window.setTimeout( schedule, jQuery.fx.interval );
		}

		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = Date.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 15
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY and Edge just mirrors
		// the overflowX value there.
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

			/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( Array.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			// If there's more to do, yield
			if ( percent < 1 && length ) {
				return remaining;
			}

			// If this was an empty animation, synthesize a final progress notification
			if ( !length ) {
				deferred.notifyWith( elem, [ animation, 1, 0 ] );
			}

			// Resolve the animation and report its conclusion
			deferred.resolveWith( elem, [ animation ] );
			return false;
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					result.stop.bind( result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	// Attach callbacks from options
	animation
		.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	return animation;
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !isFunction( easing ) && easing
	};

	// Go to the end state if fx are off
	if ( jQuery.fx.off ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = Date.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Run the timer and safely remove it when done (allowing for external removal)
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	jQuery.fx.start();
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( inProgress ) {
		return;
	}

	inProgress = true;
	schedule();
};

jQuery.fx.stop = function() {
	inProgress = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

function classesToArray( value ) {
	if ( Array.isArray( value ) ) {
		return value;
	}
	if ( typeof value === "string" ) {
		return value.match( rnothtmlwhite ) || [];
	}
	return [];
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isValidValue = type === "string" || Array.isArray( value );

		if ( typeof stateVal === "boolean" && isValidValue ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( isValidValue ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = classesToArray( value );

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
						"" :
						dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
					return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, valueIsFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		valueIsFunction = isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( valueIsFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( Array.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( Array.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


support.focusin = "onfocusin" in window;


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	stopPropagationCallback = function( e ) {
		e.stopPropagation();
	};

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special, lastElement,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = lastElement = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {
			lastElement = cur;
			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && isFunction( elem[ type ] ) && !isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;

					if ( event.isPropagationStopped() ) {
						lastElement.addEventListener( type, stopPropagationCallback );
					}

					elem[ type ]();

					if ( event.isPropagationStopped() ) {
						lastElement.removeEventListener( type, stopPropagationCallback );
					}

					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = Date.now();

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( Array.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && toType( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	if ( a == null ) {
		return "";
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} )
		.filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} )
		.map( function( i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( Array.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );
	originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
					jQuery( callbackContext ) :
					jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() + " " ] =
									( responseHeaders[ match[ 1 ].toLowerCase() + " " ] || [] )
										.concat( match[ 2 ] );
							}
						}
						match = responseHeaders[ key.toLowerCase() + " " ];
					}
					return match == null ? null : match.join( ", " );
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 15
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available and should be processed, append data to url
			if ( s.data && ( s.processData || typeof s.data === "string" ) ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce++ ) + uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );


jQuery._evalUrl = function( url, options ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,

		// Only evaluate the response if it is successful (gh-4126)
		// dataFilter is not invoked for failure responses, so using it instead
		// of the default converter is kludgy but it works.
		converters: {
			"text script": function() {}
		},
		dataFilter: function( response ) {
			jQuery.globalEval( response, options );
		}
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var htmlIsFunction = isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( htmlIsFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.ontimeout =
									xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = xhr.ontimeout = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain or forced-by-attrs requests
	if ( s.crossDomain || s.scriptAttrs ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" )
					.attr( s.scriptAttrs || {} )
					.prop( { charset: s.scriptCharset, src: s.url } )
					.on( "load error", callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					} );

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




// Attach a bunch of functions for handling common AJAX events
jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {

	// offset() relates an element's border box to the document origin
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var rect, win,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		// Get document-relative position by adding viewport scroll to viewport-relative gBCR
		rect = elem.getBoundingClientRect();
		win = elem.ownerDocument.defaultView;
		return {
			top: rect.top + win.pageYOffset,
			left: rect.left + win.pageXOffset
		};
	},

	// position() relates an element's margin box to its offset parent's padding box
	// This corresponds to the behavior of CSS absolute positioning
	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset, doc,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// position:fixed elements are offset from the viewport, which itself always has zero offset
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume position:fixed implies availability of getBoundingClientRect
			offset = elem.getBoundingClientRect();

		} else {
			offset = this.offset();

			// Account for the *real* offset parent, which can be the document or its root element
			// when a statically positioned element is identified
			doc = elem.ownerDocument;
			offsetParent = elem.offsetParent || doc.documentElement;
			while ( offsetParent &&
				( offsetParent === doc.body || offsetParent === doc.documentElement ) &&
				jQuery.css( offsetParent, "position" ) === "static" ) {

				offsetParent = offsetParent.parentNode;
			}
			if ( offsetParent && offsetParent !== elem && offsetParent.nodeType === 1 ) {

				// Incorporate borders into its offset, since they are outside its content origin
				parentOffset = jQuery( offsetParent ).offset();
				parentOffset.top += jQuery.css( offsetParent, "borderTopWidth", true );
				parentOffset.left += jQuery.css( offsetParent, "borderLeftWidth", true );
			}
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {

			// Coalesce documents and windows
			var win;
			if ( isWindow( elem ) ) {
				win = elem;
			} else if ( elem.nodeType === 9 ) {
				win = elem.defaultView;
			}

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
		function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.each( ( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
} );

jQuery.fn.extend( {
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );




jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	}
} );

// Bind a function to a context, optionally partially applying any
// arguments.
// jQuery.proxy is deprecated to promote standards (specifically Function#bind)
// However, it is not slated for removal any time soon
jQuery.proxy = function( fn, context ) {
	var tmp, args, proxy;

	if ( typeof context === "string" ) {
		tmp = fn[ context ];
		context = fn;
		fn = tmp;
	}

	// Quick check to determine if target is callable, in the spec
	// this throws a TypeError, but we will just return undefined.
	if ( !isFunction( fn ) ) {
		return undefined;
	}

	// Simulated bind
	args = slice.call( arguments, 2 );
	proxy = function() {
		return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
	};

	// Set the guid of unique handler to the same of original handler, so it can be removed
	proxy.guid = fn.guid = fn.guid || jQuery.guid++;

	return proxy;
};

jQuery.holdReady = function( hold ) {
	if ( hold ) {
		jQuery.readyWait++;
	} else {
		jQuery.ready( true );
	}
};
jQuery.isArray = Array.isArray;
jQuery.parseJSON = JSON.parse;
jQuery.nodeName = nodeName;
jQuery.isFunction = isFunction;
jQuery.isWindow = isWindow;
jQuery.camelCase = camelCase;
jQuery.type = toType;

jQuery.now = Date.now;

jQuery.isNumeric = function( obj ) {

	// As of jQuery 3.0, isNumeric is limited to
	// strings and numbers (primitives or objects)
	// that can be coerced to finite numbers (gh-2662)
	var type = jQuery.type( obj );
	return ( type === "number" || type === "string" ) &&

		// parseFloat NaNs numeric-cast false positives ("")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		!isNaN( obj - parseFloat( obj ) );
};




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( !noGlobal ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;
} );

/*
 * =======================================================================
 * KindleBookResourceUrlTranslator
 *
 * This class creates a resource url translator.  This translator can
 * convert urls to dataURIs.
 *
 * SkeletonBuilder API:
 *
 * Copyright (c) 2010-2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * =======================================================================
 */


function KindleBookResourceUrlTranslator(resourceManager, manifest) {
  var that = {};
  that.resourceManger =  resourceManager;
  that.compositeResourceMap = {};

  var compositeResourceManifest;
  if (manifest) {
    that.resourceManifest = manifest.resourceManifest;
    compositeResourceManifest = manifest.compositeResourceManifest;
  } else {
    that.resourceManifest = {};
    compositeResourceManifest = {};
  }
  for (var resourceId in compositeResourceManifest) {
    that.resourceManifest[resourceId] = compositeResourceManifest[resourceId];
    var parentName = compositeResourceManifest[resourceId].parent;
    if (!that.compositeResourceMap[parentName]) {
      that.compositeResourceMap[parentName] = [];
    }
    that.compositeResourceMap[parentName].push(resourceId);
  }

  // reverse lookup stores resources keyed by their name and have the value be the resource Id.
  // eg. {"dir/file0":0, "dir/file1":1, ...}.
  that.reverseLookup = {};
  for (resourceId in that.resourceManifest) {
    that.reverseLookup[that.resourceManifest[resourceId].name] = resourceId;
  }

  /**
   * This function is used to get a set of resources from the resource manager.
   * @param resources an array of resources specified by their names, eg. ["dir/file0", "dir/file1", ...]
   * @param successCallback the function to call when we have the dataURI for the resource name. The parameter
   * it expects is a key value pair of the resource and the data URI. eg. {"dir/file0" : "data:..."}
   * @param errorCallback the function to call in the case of an error. This function may be called
   * back with a text message explaining the error.
   */
  that.getResourceUrls = function(resources, successCallback, errorCallback) {
    // Collects the resources.  When they and the skeleton are ready, calls process...
    function resourceHandler(resource) {
      var resourceName = resourceManifest[resource.metadata.id].name;
      var result = {};
      result[resourceName] = resource.data;
      successCallback(result);
    }

    var resourceIds = [];
    for (var idx=0; idx<resources.length; idx++) {
      var resourceId = this.reverseLookup[resources[idx]];
      if (resourceId !== undefined) {
        resourceIds.push(resourceId);
      }
    }

    var resourceManifest = this.resourceManifest;

    if (resourceIds.length !== resources.length) {
      errorCallback();
    }

    if (resourceIds.length > 0) {
      this.resourceManger.getPieces(resourceIds, resourceHandler, errorCallback);
    } else {
      successCallback({});
    }
  };

  return that;
}

/**
 * =======================================================================
 * KindleCompression
 * Compression and decompression library.
 *
 * Revision: $Revision: $
 * Last Changed: $Date: ${TIME} $
 * Changed By: $Author: billeva $
 *
 * Copyright (c) 2010-2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * =======================================================================
 */

var KindleCompression = (function() {
  /*

   We don't use the default dictionary, and this string is HUGE.  Comment it out, so that minification will remove it.

  var defaultDictionaryString = 'data:image/png;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAALCAD/ATQBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APqmiiiiiiiiiiiiiiiiiqGtazpuh2f2vWL63srbcEEk8gQFicADPUn0q/RWJ4r8U6P4VsBda3eLAGISKJQXlmc9EjQfMzH0AqXwtql1rOiwX1/pN1pE8hbNpdFTIihiFJxwMjBx2zjtWtRXLeOfH3hzwRaed4g1GOGUjMdsnzzSf7qDn8Tge9eQJ8StX+KqyaZ4dvYPCWntcLE95JdI946HAAWJeQScjOQBx83avdPC+jp4f8O6dpMVxPcpZwrCJrht0kmB1Y+talFFFFFFFFFFFFFFFFFFFFFFFFFFFcX4z8cLpGow6FoFmdZ8U3K7orGN9qwr/wA9Z3/5Zp+p7Cs7RPhx9uvLfWfiJdr4i12M74kKlbOzPpDF07DLNknHau81G+tNMs5LvULmG1tYhl5ZnCIo9yeK81n8ceIfGcstp8M9ORLAEo3iLUlK23oTBH1lPvwvHcVoeC/hXpehav8A29rF3deIPE7ctqV8clCevlp0QfmR616HXDePfip4U8EqyatqKy3o6WVriWb8RnC/iRXzx49/aP1/WBLa+FrZNFtG489iJLkj2P3U/AE+9eH3l1cX13LdXs8txcyndJNM5d3PqSeTUuk3K2moQzSNIiKwLNDt8wDP8JIIBr600D9o/wAHlbe0u7fW7dI1EZublEkyAAN7lWzk8knFe429zBcxpJbypKjjcrIcgj1zU1FFFFFFFFFFFFFFFFFFFFFFFFIzBVLMQFAySTgAV5F4r8Z+IvFmoR6H8MrWdrB5PKvfEiqPJgGcOIC+FkYDPzDIz055He+C/COmeEdPkt9NWSS4nbzbq9uHMk91J3eRzyT7dB2rM8T/ABC0vSdQOkaXHNrfiI8LpunjzHQ5xmVvuxKCeSxFcjZfDLV/GepR6v8AFu+ju1jbdbaDZOwtLf0Lnq7ev8yOK9et4YraCOG3jSKGNQiIgAVVAwAB2Fec+P8A4z+EfByywSXo1LU1UlbOyIc57B3Hyp+Jz7V82ePPjz4u8UK9vZTLodg2QYrJj5jA9mkPP/fIWvJjySxySTkk9SfeiiiprK7uLC6jurKTy7mI7kfAOD+NfRvhD4/Wlnr2h6LY6TDY6AZEguby6kLSBSOoA4VVdj1LfL6Uv7T3xH1rT/EdnovhrWmtrE2gmnaylG5nLnALDkYC9Aec816P8FfFGp32jaRHrlxNcz31uZ/NklWb5sn5cjBXgqxBHG7A4Fet0UUUUUUUUUUUUUUUUUUUUVgeNfF2j+DdIOoa5c+WhOyKFBulnc9EjTqzH/8AXXC6Zonif4jt9t8crLonhpnD2+gQPiS4TqPtTjkg8fIMe/v3eva9oPgzSIm1G4t9PtEAit7eNfmfHASKNRlj6BRXEzL468fTOsckng3wuzYVtudTuk+h4gz/AN9Cu18G+EdF8HaYbLQbNYEZt8sjHdLM/dnc8sT71w/xF+OfhXwe8tpbSHWNVTINvaMCsbejydB9Bk+1fM3xB+Mfi3xp5kFxef2dprcfYrIlFYf7bfeb8Tj2rzgAAYAAFLRRRRRRTnd3VFd2ZUXaoJztGScD0GST+Nek/CvxRqU/i3w/p80glRL+1ZCVwIo4xtPII424znOcZPv91IwdFZTlSMg0tFFFFFFFFFFFFFFFFFFFef8AjH4jRWGpt4e8J2b694rdTttYCDFbHs1xJnCL3x147ZpfDngOKHX/APhLvFtz/aPiEwIB5pDW+nkKN4gGBtGcncecfiTX1Hxrq3iaWbT/AIaWkdyFYxza7dgiygI4Pl952H+z8vqav+Cfhzp3h2/k1i/urnXPEk64l1O/bc49RGvSNfYfTNUfiL8YfCvgcyW91dG+1VQcWNoQ7qfRz0T8efY18t/Eb40eKvGoltTcDS9JYkfY7Niu9fSR+rfTge1eZAADgUtFFFFFFFFFWtLnmt9RtpLeSSKQSKA0ed3J5wB1+nev0N8B6y2v+FbHUJSgmkUrKiRtGEdTtZdrfMMEHrW/RRRRRRRRRRRRRRRRRVfUL2102ymvNQuYbW0hXdJNM4REHqSeBXnc2p698RS9t4ca60HwqxIk1ll2XN6vpbIeUU8/vGGcfdHeo7nV/C/wtso/DnhLSZNQ12Yb00yxHmXEzH/lpPIc7R6s5+lWNN8JeIPFVuk3xMvITbli40LTyVtgOyzvnM2P7v3fY1v+L/GfhnwDpUbazeW9lEqYgtIgPMcDgKkY5x29B7V8t/Ez4/6/4n86y8PB9E0psqWjb/SZV/2nH3B7L+ZrxY8kkkkk5JPOTRRRRRRRRRRRRU+nSxwahazTKWijlR3A6lQwJ/SvsT9lvX/7Z8K6ssr3DzpqEj5lcsNrKhwPQZJOPc9ete10UUUUUUUUUUUUUUUVxfjv4hab4Xmi023il1XxJcjFppNp80shPQt/cTuWPbPWueudGYxRa/8AF7VLeXbIr2uiW+TZwyfwqE5a4lz6g89B3rZA8UeLWdNtx4U0HgKy7TqFwv6rbj/vp/8AdNZWs+JvAHwdspoAUTUJj5klvCTPeXLf35GY5OfVzj0rw/xr+0j4k1ZZLfw3aQaJbtwJiRNPj6kbV/AH614pqeoXuq38t9ql1PeXkpzJNO5d2/E1VoooooooooooooqS3/4+Iv3XnfMP3fPz8/d4556cV9cfskLZN4FuyZEF4+oyyCDfyFCRqDjOSBjgnpn3r3qiiiiiiiiiiiiiiivINR8YeI/GVreyeFZbTw34VgkeC58Q6iw8w7G2uYY84GCCNz4rK8E2f2aCZ/hPpAv7i6bZeeLdedsTn+JkB+eUZ9NqZHU10eq6j4T+G8y6t42146j4lkjJWacB5tvdYIV4iQ+wGe7GvEPiH+0ZrutCW08KQ/2LYnj7QxD3Lj6/dT8Mn3rwyeaW4nknuJZJp5GLPJIxZnPqSeSaZRRRRRRRRRRRRRRRUltNJb3Ec0EhjljYMjjqpHQ13XwQvLvRvidoV7bzGCNmcTMVJEkAB8wY7jg/QjPavviiiiiiiiiiiiiiiivljWPAhm+N1h4G1nUbi88N35vNY+yoDbrG0vmNgEMd5DKvJ9+OtesL8ILeyjX+wfF3i7TJI0CRhNRMsaADAGxwRj2r4q8TSXsniHUv7UvJr69juHiluZmLNIUYrnJ57dO1ZtFTSWlzHHFJJbzLHMMxsUIDj2PfofyqGiiiiiiiiiiiiiiivQPhzYyWpe7ubd9k8X7koA0jqyXKFk5yOUK47nHtX3lbyCSFXGcNzyMEexqSiiiiiiiiiiiiiivDPFbs37WPg5QMbNJl565BWevc6/O34lxLD8RvFMceNq6nc4x/10aubq9okEdzqtrFcbRbhw8xY4AjXls8jsDXQa1pl5DpKa9pMV2vh9pV8hmmYGwnznyiCeSMna2MEHPXNck7F3Z3JLMSST3NJRRRRRRRRRRRRRRXo2kS6g3g61itZ0D+VE8a/wAQC3NwTgf7vmZ+or7e8PyrNpiOhDRl3KFUCAruJGAOnH4+taVFFFFFFFFFFFFFFeM+JkEf7U3g+Xr5ui3CYAJxjzOf1r2avzw+J8bR/ErxVG7ZYapcAk8f8tDU03hGFU8NrbarHdT6tJIsqwxNi3RGA8wZwXUjcc4Gdhxkc1o+BdNtLibxL/Z1zrF7aW9hJKRZhLZpowRtD7tzfe2naoPTJPFZvhzw1qPi7TLu5ttXtpLyKeOM2t3diMlCCTMzSMAEXGOMnJ6Vqaf4E0xPF2i6Zc+KtE1BZ76C3u47GRz5au2DiQqFbpjKnjIp2oeF4Lbx1DpWjWR1KXUZ/N09ZEkSOOLzZFKyQsN7hQjHORkLnmtHQPDegz+J72XxZpmoaNo+oXsVtpQktZo0Y+enmKD1U+XkDdkDf/s15xrdtDZ61qFrayGW3guJIo5CMblViAfyFU6KKKKKKKKKKK9R+HTboNPWO5MU0bWwTYw3qWnuG3AH+7jkeje9fbWmJGltiIq2Tl2B+8xAJOO2etW6KKKKKKKKKKKKKK878Q+Gryb4z+FvE8UMbafa2VxZ3EvmAMjMCUypPI5YcZOTz7ehhlZmCsCVOCAen1r8+fjHC0PxV8WpIpUnUZm5GOGbcP0NWovG2p67MIfEvie+07Toki8uKwtFYAx8IERSgUjH3s1HYX/g7SDLcWp1++vi2I5XSGAxqQwZlOXwx+XBKkjnBzg1xLKp4Ayo6ZqzYXTWVwJkhtpiFK7LiJZE5GM7Txn0NdzoFl4h8XX2lW1sLKwuNk7215aRxxTMwhZgkhQhsMEIBb1PWs7NnJ4Z12C4iuJb6y8gpdX0zAxHLCREjLjBLEYyrHAbIGeOP680UUUUUU5Y3dGdEdkXqwUkD6mm0UUUV6D8FZlfxfY6d9nRpLm5SVZm6oI45SVx3ByPyr7tsE8u1jTByoAJYYLYAGasUUUUUUUUUUUUVmeJNe0zw1o8+qa5eR2djDjfK+epOAAByST2HNfMfxR+NGueKfEc/hnwBdQ2+mSN5Qv4n2PONuXbzGwI0HOW44Gc4rmfh98PNK1v4nXXhvWPETappljYtdz3dhOViEoKZCu2QQN3LcZr0Y6n8Pvh/qf9r+GvHk97qkBVLizmvftK3sCjHlZVcb1UfIxPBABODxb8T6D8N/jRrL3fh/XYE8R/ZpN0ahke4bYBGXVsEhMfw9utfKd/aXGn3k9pexGG5gdo5EbsynBGe/I617H8JPgPq3i+KPU/EDzaRozfNGpTE9wPVQfur/tHr2HevZoP2evAtjI9xcJcPDHHwJ5ztXHV25wf0HtVD4j/AAL8L63o13F4Mt7Sw8SWyJIqRylY5AegdMkKGAOGA6j6189eLdD8Q/Di5bStS0820pSRFv4Xk8q4WRcEqeAWAIHYjHT12bDUdd8Ui11caxZw6jcMYdRuVjt1khijjwjsz4bfIEk5yFJC5xmvP5NP1G/8Qz2VyR/ajTOkv2udIz5gJBDOxC5yMdee1Taz4X1XR7hre7hhe4j3ebHbXEdw0O1gpDiNjtO5gMHHWqv9i6oL+KxfT7qK7l+5DNEY2b5d38WOwzVO0glvLiG3tInmnmYJHHGNzOxOAAO5NP1CzudOvp7K/gkt7uBzHLDIMMjDqCPWoKTqK968QeIIl+DttcxoHvZtNtLd4fP2pDHJvhkYIDjLC3UjI4MrMO5ryDw1okWri7kutRh062thGGmkjaQF5H2IuF565JPYA9elbf8AwrjWkTTmuFEaXeoz6a0gRnjhaJgpZnXggtuAA5O04rLsPCt3qt6INGngvo2uBapOoeNGkMbSY+cAjhGHIHSudU5AI70taXhrV7jQNds9UspGjurV98brjKnGOhBB4JGD619h/s6fEe/8d6RqMWvTI+q2kowY4RGjREDBGO+ev4V7DRRRRRRRRRRRRXj/AMdbWSbWPC0/iGAzeALa4Z9V8sEmOQqVieTBz5YLckdDz6V4v8SvBugP8a/Den6dHbW3hTVordUlsJBsZASjtuGQDkLkn1BPWvR/DvwC8PWHi/W7DUkuLjR57GMWJkvNsrtyJiVTbkKfLIyCBkdam8Q/D3xFc6HZ+FdWl8JWXhlJYkl1iOLyLqaJWBWMJjasjYGSDg/jitTUvC3hXw/8R/B0+mtaraS3kiRabbug8m5MTFZ1A+YrhSGXO3LBsdcvtNC0W3+NPibVvGFvboba2tZtHnuhtt4rcLskKk/JuEhGc8jcCOtdF8aPH8vgbwoLnSrU32r3YZbSJVLqAq7nlYD+BRgn6ivB9Qk8afFzxde6DcyG6tNJs0iu7e1uzZQvMQMu4Ktk78grg/c4xXW/B/RvEmkfG24g8R6v/aGqR6QY79Y0by4o1MYtxvIAYkbjwOMNnnNe1yaBJrmiajpvjMWOpW13K5EEcJRI4s/IuSclhgHdxz0xgV8W/GrwZH8PfGX9k6fqTXVlJF9pgRm/eQKxI2P78de45ridPguJ7y3mEFzcKbmNGMali7s2QoP984OB3r1+08T2Gs6/5x8NahNebvOkvLa2ka5RFvzNIpRfkbau1S2M54zWVYeMonvNUsIbTUPEMN1cNqmYg8MtvJHH99N7SOAoVt2WwVYjjArj/CWsWnhqEX0ljdtqzyJ9mug/lpBEPvvHkHc5+7k8BSe54peNbsX/AIy128WSKRbi+mlV4mDIwZyQQe4waxqK9G8M2lp4l0v7BceIb6JILWOCaG20bztsSyFkJKvuba7t8wU4B9DXO6Fqn9n3VrEmtiKCQNDO0tj9ohhQOWRlRs7vmwwwoIJ+tdJLrTTada6bH4w0SWGzbck1zb3UUkytN5xjf5DkeZ83Y89cU+1t9U1C4v7+08aeEobme++2ujXjQMZNjoGXeg42yMOv15rgrfTle7vLV7iMNbxSurxnzEkMYJwrA9CAcNVq38O3s+lfble2XdG00ds8wE80S53SIndRhvf5SQCAayYfLMsYmYpEWAZh1AzyR+FfaP7Ong/TfDumXt5pkgvVuki/045DSEjcyhT91QCnHUnnPQD2Oiiiiiiiiiiiiq7SWl21zaM8E5Rdk8BIbAYdGX0I9eor5x+I/wAHdFHje3ttPRNAtdUjCadcwBjb/axktBMhPAdeV27ejDB4rv8A4broXhrXZrLVrC+0jxTdgQhtRupLmK4UHIS1nckFM87OG9RxXSa/b+IPEUd1pzaRocOlOxjL6k7XLSDkbhEgAHHIy+RWf8L9B0TTJb20j0nRYte0eQWk95ZWqRtKrIrI+RypZSNwyeQe2KzbvVPEXjlPEM3hg6bJodlN9igtb2DcuqPH/rxvPCxtkxggHkE8VyHw/lMuqzab4O1bUvC+uWg3SeEteXz7ULn5hEx+cIeCCh464xV/7TqGheJ7qfQrbT/DviPWHhhvtJvofNiuXMpX7XbSIy+ZjzGZl64HIU9e5+KviS08B+D9U1uJrOHWrhEhicookuJAQowvVyoZmC9Pwr5Y8ZatHaeFNO1i28SXOp+K9buDd3V1DcyQvYIEXMBRWxyx9BjbgDFeY3VxPd3MlxdzSzzyHc8srl2Y+pJ5NegeCPGsmiaJZ6Jo2lvqF7cXDXLgRbnS53oI2iAyWKxI4HTBkJ7Vr6V4jhsNa1EjSNem/s661GeS1hV4JYLeaSF13sMmLBRs8dxzzTLfxRpHh3xTrdxeWWrXMuv3UhlupIPsksVlMMny4yDuYlzkDAPlrg4JqvZeINJbxF4SafVi+i2UttFJYX1oxji8qLynkyQRtbCkqM/e5Hyiq2iWVtaeF/FaW1zp2psjW8sd3a6WbsfOswaIeYqmIZAJbHGARmvOYY3lYJEjO56KoyTXc+A/CWnanrniHRPFU82lXVjYzXC3C/vPs8kJBcMi53jbnIHPHFQa3pM3gnSvs9xI6a7fSrLBc2kh8sWYDcrIOvmEg7eoCrnBOK4uu38PeK4dM8GvpTTyCQveTBVi5DvCiRKH6435c84BRaPEmo6dLpmtvbS6bO95qLSwL5IadY2wc7iuV6DBB7uCOhrGgudIfQLC3Y3Njqcc9wLi7jhDrLC6DYp+YHIYFcejk9sVvPe6Z9q07WNK1u2W9OmJZfYZUdGt5PI8lyzBduzBZgQcnIGOtXPArRSfD/VI9P8ADljfa3Jdx2KXpcrJbxSAtvfLbcZQKDgdwTzz9e/Cme5u/CMV1d24tmlmlxGgAQ4kbLqB0DHJwTnGK7GiiiiiiiiiiiuV+IPihvDunW9vp0SXXiDUpPsumWZbHmykfeb0RB8zHsB7infD7w7Y+HtFEcEkF3qchJ1K/UhpLm5zmRnbr94nAPQcVseINGstf0e50zVIRNaXC7WGcEHsynqGBwQRyCAa8zHiS9smu/BPiLRpvE2u25RtPcwDy76D+CeVyNkbIRh29QCoJOK8U8QeHNZm+Leq+ELSw0431zA9zBKkMsSrIYt5dJN5YDcSoc7huAyBk49gm1i0Tw54S8JeCbeDS73xKHW4MUe17OJEIuXOOfNBBQE5+YH0r1rRdLs9E0m003S4Et7K1jEUUS9FUf569680+K3wesfFdzJr2g3Euk+LIsSRXcUhCyOo+UMO3QDcOR79KyvhV47Txpps3hf4kafbrrMEzWZFxGNlzIo5GOiSjGccZ+8vQ4ztR1K3sPGepeFNPv8ASLbxPbSQW2l6rrjNPNHbvGH2ISpDOrMVGWBYEZJI584/aC8QaJqs91a3Oo2+o+JLJktEFjp7W8NuFcmXc7uxdieMDj614dXReFbyfw/eSX93Yal/Z81vJazTWxaCREkGNyS4wG6deCCQetb+oeNUvrC8ivdO1eOzk+zpb3MN3smdIYjGiTyFCJVP3u3OccdIF8aWc2uPf3VtqIRwZvKa5FwsNwZo5SYlYDahMeCMkgN1OOd7UPG+navp+jKl61hqltcQzn7TG01sQGdAhxgxlVclmUHfnOQQBXI+I7lp/GmoLoWpyxQ3RCtI10EVjsG9WkXAdQdwDH73BPJNY0M0GnwpNZXVz/aLIjxzQOYvs5O4SRtxljjbgqQOT1rtPhj4qvo/GGn7bLT5r1knDX0lv5ly/wC5f7zseenXGcd65zQ/FU0VlPputo2qaNeSedNBK58yOU9Z4XP3JPfo3Rgaig8LatqNldaloWmajqOkRXDQC4ityzAgAjeq52naQfTnrVMaDrJZlGj6nuX7w+yScfXis48HB7V1PgLWtftdWtNJ0LXLjSo765VWZDlAx43sO+B+QrS13Wbibw5dWuv3t22syCOaF/Lt2iuoJGyDuCb+mTu3cfdx1x2HwUivdcj0fSjZeH9QtpLmaAxXGmB7iCBVDtOZ0KuuHkVVJOcnjpX2NaW8Vpaw21uuyGFBGi56KBgD8qlooooooooooorgbjZ/wvaz+0Rqx/4R6Q2zEAlWFwvmY9CQUqDXIh4T+JeianYqkGm+IZG07UIlwqNc7S8M2P752uhPfK56CvRaK+W/j74ql0P9oDwveWNyIX063gWYnIASSVt6tjqChr0b4W6dFrPxP8beLfLhW3trptHsVRMAbCGmk+ru2Se/NevVFdXMFnbyXF3NFBBGNzySuFVR6kngV4v4zstF1DxrZa9plsfEHh7WIH0/WU0jNyRKg328/wC7JIdSpUOMEcc15B448JrL5eqNrd5cWWpBr3TNX1De0rTQx4+xzjICSYTCuRklcV5ZbaNqWr6fqGtW8UBtIHZ7hmuY0KE/N9123HrxjOenWu6+Dfw/k8U6nGDAzXLILiHzVxDDFu2/aHBH70bgwVF6svzEDr7B4vXTNEnuD4e8OQXumaHNFbXmpTI13Ik23c+yNjsLKoXLHgO2MDkjwz4yeK9W1/xVd2N9q8t/p+nzNFbAKscRxkbwigAEg+/1xXA0UUVd0O8vtP1izutJkePUI5VMDJgneeAMHg5zjB4Oa19S8Ojw9rFpB4rW7t4Lm1W6xZohlXcMhdrEAYPB/TNbr28GhXOnJaavqGmxf2NNqe63vdkryOXMKYU7VcqIQy98H2o8d+IfFNr9kgHi/VtS0S6hjurSX7cW3fKMq+DkMj7lw3pmuAkd5ZHklYvI7FmZjksSckmn2txNaTebbSNFIFZNy9cMpVh+IJH41Ld6hdXdpZ211M0sNmhit1bH7tCSxUe2ST+Nd/8AAjx6vgTxY8ktg11BqCrbSPCu6aMbgRsHRuccflX3Lp95Df2cV1bMWhlXcpIxxViiiiiiiiiiiivMtYk/4yI8OIM/8gG7J/GVP8KrftCeJNJ0fwxaw3N0g1uO7t9QsbZUMjsYZlZm2jooXdknHevQtF8QaTrdhbXml39vcQXHEZVxktjJUjqGA6qeR3qj438VW/hbToZDC95qV3KLexsIj+8uZj0UeijqzdFHNeHal8P7uT4sxeIfifZW1zpl/wDuJJbMM9oHZEiiRwTvjO4/e+7kLyM8eh/s9QW0fhDV57CNYrO51u9khjUkhIxJsUZPJ4TqfWvUKgvbO2vrcwXtvDcwN1jmQOp/A8VyF3oWnaD418P32i2Vrp5vWlsbpbaIRidPKeRNwUAEq0fB6jJHen/EDwDpvirwHqHhyCKKyWZjcQNGuBHPuLhyB1yxOfXJr5w/Zy8LR2nxf1PRPF2lWbX1lau6w3kQdllV1w0eeD8pJyOo5r0Xx5b23gLxVNdWzpaxpu13SwDt2lGUX1oP9iRGDhem7JHQVyj/ABp8GX2q3p/sfW9H+0SO/wBttrjzEdj1aS3J2MrcZBBznnnmvAvEmpS6z4g1DUrh43lupmlZokKJz02qeQoGAB2GKzqKKKVdu5d4LLkZAOMiugmNjr3iPT7bT7fVvs7pHapDLcRzTnAIVFbaqhRwBkcD8q1bDwFcaul/daWt7HZQ3U8CLNaO7hY4TLucqOCfkXGBy47ZrF8Q+G5tBtrJ7u9s2uLmCKd7NWYTweYm9Q6kD+EjkE/ex61ixo0kiogy7EKoHcnpXaxfDLxD/Z8VzdxW1o9zA89pDNcIrz7JAjrywCkAlueoHqa463tbi6SZ7aCSVYI/NlKKT5aZA3H0GSOfeksrqe0vYLmykaO7gkWWJk+8rqcgj6ECvs79nPxK+s6dqtqhmmtY5zdRyuw2xeb8xiACgAA7jxx16dK9joooooooooooryzxfd2uifHPwtqeqyiCzudJurKGVmwvnCRH2/Ujp6muNsjN4c8DX3jOSSe68TeL79bWzu7hd72ttLIREBxwFjy+AAM7Rjil+GPwb8M+IfDUOvX0epwfa55p7FIr+RWity2Eyc/eYDcT33e1d74a0L4deF/FscWm3lkPEe0wxx3OptPOobqqq7kgnHYAmsh9KfxN488SQWeqztaiSOHUdOnu2KqpVkYBASEyvlSxsADuDA9Ti9+zc5k+FlqzZyb286nP/Ld69Qoryf42+IhpfiD4e2NtKBeT69BIUGc+Vho2/A78V6xXlvxu+Hknieyh17QLh7HxVo6mazniGGk2/N5ZI5yccHoM+hNfIPjzxvrnjjUIrvXr2Wby0AjhwFjiOBu2qOBkj3Pqa5miiiiiirujXVrZX6Tahp0WpW21le2kkaMNkYyGXkEHkfStNPFmoq1/vkeSK5smsEiaVtsEZVUG0Z5IRQuTnirHiXV4Lzwzounrql1qt3bs8sktzAU+zKyqBAjFiWUEE9gD06msCwtFvHkQ3VtbFU3L55YBzn7owDz9cDitfULu71XTtC0m8tDC2nQvDb3HlyfNAzs/KBSThi3zAexHGa2/h3Nb+HvGy6pb30Oo2Gm2Ut3eLHC6ieLbteDa4GSd4GSMVqfGPVrjTPEx0/w9dW9p4bkggvNPTToFtgYXXcm9lAZmB3DLE9K9f/ZXn1B5NSm1eV4jLBDbxxXHySSspkfeF6ldrfeI5wcZxX0RRRRRRRRRRRRXlHjGFNY+PHhXTJcPBb6PfXEyEngSbYwR6HjrWr478BT6n8LYfC2gXrxS2UcQtpLl9xk8ofIrtj1C9u3Ss3w38Jymg2Vj4k8Q6/dLboIfstvqbxWzIvCfKgUj5QMjJwe5qP4h+DJbDwba+HfAvhmA6fcTA301u0QuIY1IbfGZGG6Yno5OVIz6VzHh3426Npmn/wBnR6Z4i1XUltpLuW5lS2WWZV3MzttfHygHjGQF6V2X7Oi2w+GFr9gaRrY3VyUMjKzH962SSvHJyeO2K9Noryz43eB9Y8Y3fhqTw99ltrvTpprj7dKBvhYR5jUc5IZwM46YB7V2Pw+8SJ4r8JWGqhRHcOpjuoe8M6HbIh+jA/hiuir8/fjPow0H4peI7GO3FvB9qM0MajACOA4x7c1xdFFFFFFFFFS2knlXUMhkliCuCZIvvrz1Xkc+nIra03WXstVuJrfVL+NWt5UjuGyJA5+deFY4zIq9++ag0HWjY6417qERvoLkSRXsLNtM8cgw43dm5yD2YA10txb+G57Gw1cazcTW1mjWy6fewq8ysGZoYzsYbo8ZJYcDIX6e2fsz3upa1PqWq6q8moahdTb0upWTbAiYXaF6jPmSAADaOa+jaKKKKKKKKKKK8f8AiAmq+D/ihb/EA2EmpeHl0w6ffJaLuntVD7/N2k/MueuOgzmvQ/DHi3QfE9lBc6HqlpdLMgcRpKPMX2ZOoI9CK3aK+ffBXwem0zx58QNQubVksZY7i20v5sbxOhZyPoGCZ9d3pXQ/srXpuvhWkMrE3FpezQShhhg3DYPr96vYarahf22nRRyXkoijklSBWIJBd2CqOOmSQPxqzXmvg7TB4M+IPiS2vJjHaeJLv7fp/wAwEXmbf3sWD0kJ+bHQr0+6a9Kr5E/bD0r7L450jU0Qhb2xMbN2Lxuf6OteCUUUUUUUUUUUUUV9Xfse3Mknh/Vrc+WIYJgVARQxZsliW6kYCj/9VfRFFFFFFFFFFFFQahax31hc2k4zDcRtE4HdWGD+hr5M8CfC/wAN69q+peFNVmu9E8aaHIyLNbvtW+gDZSXaf4sFc7SOCD646j/hG/jl4Xvnh8P6qNU05SPLF3dRznHoTKA3bse/euxI+KtvpC3fiTxT4S0G3wPOl+yNI0JJAxlmCEmtyw8I65qFnDff8LJ1u480CaGW2t7aOFlIyCE8s5B+vSq/wH0u20bRvEenwxgXNrrl1FcSd5TlWViOg+Rl4H/169NrM8TaTHr2gX2mTO0YuYiiyL1jfqrj3VgCPcVwE/xTOleG7sX2mT3viXSvKh1C0tSGjSRiVD7xn5GIJwAXGcba5rRbbxf8Qrv+2JWigtpVU6fqJRok04c7mtoy2+WRuAXkCDAIwVJU9fYeO28M6Rqtp46uVm1nSG5a1hw9/Cw3RyxxjvjIYDhSjcgVxf7Weiy614c8Ky2qAXB1IWqeYduDMhwGPblRXgmofBv4gWMcskvhi7kSM4PkPHKT7gKxJH0FcJdW81pcvb3cMsE6Ha8UqFGU+hB5FR0UUUUUUUUUUV9Z/sg6zbT+Fb/STKft1rcM/lkdYW5DA9wG3gjtuHrX0HRRRRRRRRRRRRXiX7SWinTbLTPHmgq0HiXSbqGNZkxiWN227JB3GWx9GI6Hj1vw3f3GqaDY3t7Zy2N3NErTWsow0Mn8S++DnnuOa8Z/ag8TyS+HL/wnpCmS7FqNS1FtuVhtUcYB/wBpn28egPrXtmiypPo9hNFjy5II3XAwMFQRx2rzPw1qdlovjj4sasZxJY2jW889vFlpVaO2zIwUkdenuV616L4Y1q28ReHtO1ix3fZr6BJ4w3UBhnB9x0NadeGwWEVz461my1fUH0zWbcPcW+sQbYnikjCbmPG0pJC0DMjfKWSQ8dRp2R8W6H4ctLDQhaavFa3huZ71bhLY3Z+0yNNbRRtwhB45O0KCAcnjmm0vW7S08U6t4shmN5BpNxaXF/IvySeZcl0SM55VU44wOcHkcdF+1JLdr8O7FNMiklvpdWthAsS7nLjcy7R3OVHFRXfin4u6Hawz3XhLSPEFoUVjJp0rxykEA8xtkg+wBrMvPif8OPFTix+I3h6XSdQA8spq1kSUz2WVRuHXr8tOuf2d/AeuWzXegalfwRTLmJ7a5SeIZ5BGQSRz03Vweufswa9brI+i65YXuGwkc8bQsV9SRuGa8p8T/Dnxf4YEj6zoF7DAnLTxp5sQGcZLpkD8cVyQII4IP0paKKKKKKK+jf2NbG4l1rxBflx9lt4EgCZ6u7BiR+EY/MV9U0UUUUUUUUUUUV5h+0tx8FvETD7yiFlPofOTFd74avDqHhzSr1vvXNpFMfqyA/1r50+L2p3Nto/xUvzaQPNc6ja6LIzg5S1FuGUoR0O5t3PHNfQngpVTwboKo5kVbCABz/EPLXmvItW8FaX8QPiz45tw9zpn2SwtbOS7sJPLaaSQOz+YOjjbsUgj+Gs/4ar8QvDfhvUPDWhRaTqr6NcvbTWl3K9tcQ7surROMq0bhtyk4IJI5xW/4R8dfESZLrRLrwba3Wt6UsSXLy6tHEz7lJWQgKQd2Oo4znp0HOeJdQ1pfGi6z4q0GPR2ht7WeWBLlbpZYRO1tMSVAx+7ujxz0FdevgbVL3wENNunjjnS6aeJ5nwQj2pjJPHXc7EitrxRp9h/whPieyu9Stlm1q3kPl7gcTmAIdgHLcoG4HrXF6h4Y8X/ABK0HwlcavdaNJ4dElpeSWtu0iXEiFAHYy9NwDP8qgfXNbSfDvxZ4ShlPw+8XzPbIP3Ok60vnwKP7qyfeUemKq33ivxKbU2HxF+GFxf2jHDzaUUvY25GD5ZO4c+9cpaeGvhlqGq7/CXibVvA+uNgrbGWSzOfTy5gN30U4rs7fTfi74eCNZ63oXiyzA/1d7EbWYj2dcg/U1dsvipd2scn/CZeCfEWipEdk1ykH2u3U9zuTnb77SKgu/DPwq+KMO+0Gk3NztwJdPlENwn1VcH8GBrhPEX7LtnIWfw54hng9Ib6ISD/AL7XB/Q15F4g+Cfj3RrueEaHLqEUQDCexYSo4Jx8o4bPtjNeeXME1rO0F1DJBOpw0cqFGB9weajoooq5o+m3es6pbadp0LTXdzIsUaDuScDPoK+6/gz8ObX4d+Gjah1uNUuiJby5Cbdx7IOT8q5IH1J7139FFFFFFFFFFFFea/tHxGX4L+JAMfLHE/PtMhqz8AdVOr/CHw3O7FpIrc2zE+sbFP5KK888W20d1B8c9NufLgVUt76MMwwzG2GDz6sg/GvYPhtqMWq/D7w5ewEFJdPhP0IQAj8CCK4T9nJ7fUbDxjr8K7ZNU1+5dhnOEXG0fkxP4066NzpP7TVoLIqLXW9EJu0Yn5mhZgrD/aAwPoTWh8QSnhr4i+E/FMbxwxXkh0XUAePNjkIMR9Mo/PrgmtH4hfDe18a3wubjVL+xP2M2TC12jcplSXJyD3jAx71y/wAVfAeiReFbq51K51TV9YuAljYG/v5WU3MjbIyI1KpkFtxwuMKa6nRPhN4K0zTbK2Ph7Tbia3iVGuZYFaSRguCzHuTyT9a7LTbC00ywgstOt4ra0gXZFDEoVUX0AHSrNFZ+taLpeuWjWus6faX9uwwY7iJZB+o4riJ/hJpdtJG/hfWdf8NhDuEOnXzeQTzyY33L+A49qfJYfEnRIZzYaxo/iVduY49QtzaShvQPHlSOnUD6iuX1ybwfq0Yl+J3gm40PVI1DS3q2ztGmcfMLqEcD/eIxWpofhzUTp8d98NPiHNd6e33YNTK6jBj0D5Ein23VrDxB460OJf7f8LW+sQp9+60K5y5Hr5EuDnrwrGqdz4w+HHi+T+z/ABLHZwXoX/j0160+zSqPbzQP/HTWXr37P3gLXIVm0yGfTCwBWSwn3Iw9drbh+WK8w8Sfsw6zbebJ4d1uzvo1GUiukMMh9twyv8q8v8S/Czxt4bjaXVPD135CjLTW4E6D6lCcfjXFDkHHbg+1fW37I+gQJ4Rn1uWFftEk8kMcnB3KNuT6ggjGO3Pqa+gKKKKKKKKKKKKKK4z4zWZvvhT4rgUEsdOmcAeqru/pV34ZG1b4eeHJLCGCCCWwhlCQqFUMyAtwOOSST715zDZ2Gs/HP4jaDqkfn2d/otoZom77QBx7jcCD61ofsvX41D4RWts7eYLG5ntOeu0OWGR24cVH8BIrXSNc+Ifhuwj8m107WTJBDknZHIgwBnnHyVN4una1/aK8CtcGNLafTryCFuQWkxkqe3QLj8fapP2jYYj4Q0a7mBKWmt2UrYJHymTaQcfX0NerV5d4zil1z41+DtHmZxp2m20utFUH35lby03H0BPH1NeiSatp8erxaVJeQJqUsRmjtmcCR0BwWA6kVW0rVmv9Z1mzEG2PTpY4RKGzvZo1cjHbAZfzrWoqhbavZznaZRDIZ3tlSf8Ads7qTkKD14GRjqOav0UyaKOaF4pkWSKRSro4yGB4II7ivP8AV/hD4Yu9Yt9U0yK50O+jmWR30qZrYTAEEqyrgcjuMGrV9pvjXRJFl8Papba5ZjG6x1ceXLjvsuEHX/eU9OtcRqfxK8K6ozWHxT8G3Wjbj5UcupWX2iF8HkLIFyORnp71dtfhfpdxDHq3wu8XX+hwyruUWdwbm1fPIyjNj8PfpWnaz/FTw6pF9aaN4tt15320v2K5x9GGwn2/WtfTvibocl1DZ66l54c1GUhUttYhMG8k4wknKN+DVb8T/Dvwl4qjZtU0WzklkGRcwr5cvPRg64OfzrjfD/wUfwvcTSeF/GWt6anm+bFEAkkZ9RKp4kHA7KfevRPCMfiGHTXi8Vzafc3qSsEuLJWRZY/4SyN91uxAJHHWtyiiiiiiiiiiiiorq3iu7Wa2uY1lgmQxyIwyGUjBB/A1U0DR7LQNGtNK0qIw2NogjhjLFtqjoMnk159DokkP7RV7qcoCw3fh7bEVYZdlmUPkewKfnWN+ylpz2HgbWfORklfWLhGUnONgVfp1B6UsTnw1+1DNGok+y+JtLVmLDCiaLOMHv8sZ/wC+/pWl8Y9LvJvHPwz1axtp5haauYZmhQtsjkUZLY6D5Tyat/tHQzzfCTVTaxebNHLbSIB1BE6YOO/0r0i2Lm2iMn3yg3cY5x6VwGtTXVn8ZrGWC2E5m8O3SwIHC+bKk0bbCT0HIwfc1JZRy6x4mXU9W0XVtObfaQxI207JYlndizISPL/ebdwOCSB61gfDnxnHaXOvz+I5rWwsdSupNR0x2bL3MRkeLjuzYjjwqgnDL61z3xM8e69rCajaaPDc6Vo9pAbmVxn7VeIkgWQYU7ooxh9xB3fKR8tdZLoNnZeM9BgkOox6bq9jKktumoT7GuU2uCx37nynmDBPbOOtJ4cna3vvDt1CJLqKbUL/AE2C3nDGWK2ErMsg3/MNnlKDn+FwOoAr1SiiiioL20tr63aC9t4biB+GjlQOp+oPFcT/AMKt0Kyvpr3w3Lf+H7qVhI/9m3DRxO4JILRHKN16Y6cUrv470Ozkd47HxKsOCqxEWtxKM89fkBA7d/UdK1LTUI/Eem21t4g8MXtuLtAZLW+gSaNDjkMQWX25wfas6y+G2naPqIuvDGp6voafxWlrc77Vuc/6qQMq9x8uOtdzRRRRRRRRRRRRRRRRXMX2h3T/ABG0nXrcRG2j0+4srkscMNzxvHt455Vs1a8G+GrbwppEmn2U080b3M10XmILFpXLnoB3Nc344+Hz65468L+K9NvVttR0idVlSYF45bfJ3KB2f5jg+/sK9BrnPiJo174g8F6rpmlzRQ6hNEDbvKMoJFYMueDxlRW/bGU28RuAom2jeFOQGxzg+ma4nx5LNY+NPAuoR2080H22aymeJC3liaLClsdF3KvNdrdxNPazRJIY2kQqHHVSRjNUtF0e30zR9LsAkco0+BIYpCgyNqBdw9CQP1rF0TwJpmjXv2m0uL1t6PDNHPIJEliYswjII4VS7EYxncd27NdUEVVVVVQq/dAHT6VH9kt/tv2vyY/tXl+V5u0btmc7c+mecVNRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRXmviW08Q6L4S8Qalfa07zi2/ci3dlETtMzMRn0DIi+gT3NdN481y80DS7G50+0a7lm1C2tWjXbkpJKFbG5gM4OBz1I7ZrnPh/4kELf2Tc2N/GLrU9Sjt71whikkW4mcoPm3cKDgkYO0ipbXx/BZ6LppFrrOsSPpX9qSziKFHEAOGdxuVd3favXtUeheJLVfiRrtlbie8uNQ+xzQxQjPlweQMzPkgKnIGepJAAJrs9R1q30/V9LsLlJVOos8cM2B5fmKu7YTnhioYj12n2zz8Hj63vljOjaRqmpsyNcFbdYwRAJGRZcs4BDlGKAHcwGcCpz480htL1DUIBczWtnZQX7MqAF45d+0AEg7hsOQcYrU8Wa/beGtGfUbyOSWMSJEqIVXLOwVcsxCqMkZZiAK4vUvFX9j+Nb/U5tM1Ka0OhWlzcCLYTax+bOWZwXwSAei7idpxnFdBqfji0sbm+26fqFzp2nuI77UIUQw2xIDHILBmChgWKqdoPscWf+EvsC2PKuP+Qr/ZGdo/1uM7uv3ffr7VyngbxObLwhpGn2+m6lql4to1zcC1CnyYjI6qzF2GSSrYUZJ2nipLWRj+zt5u99x8OM24k7v+Pc8+ua0YfH9lp+nGTXNP1LS447H7ZC1yif6RGu0HaFY4fLp8rYPzD3xp+EPGNj4muLy1gje3vbRUeWB5YpfkfO1g0TspHysMZyCOR0zQ1H4gQWeqXFlHourXPlXo00TRLHse5aNZFQZcHBVvvEADuali8cwXVvZDTtJ1K81G5WZmsYxGskAikMchdmcIMOCowx3HpkZILfx7YXd3ZwWdlfSrNbNdzSsixraRpIY5PN3MCGVlIKgE8HGcUzwn8Q9J8S6nFY20csEtxA1za+ZJE3nRAjJwjsUPzKdrhTg9OuE8VfEbSPDeqT2V2ksptYlnu5EkiUQI2cHa7hnOASQgYgfUA3B41sG8QJoiW942pySL5cSoCHgK7vtIbOPKHQnru+XGSKp6P4+tdVOnyf2Vqlrp+oStb217cIgjeUbvlwGLDO04YgA+vIzgeBvE1to/hfSGv7u+dINBtZzbJErq7PIY1Kn77SM2F29OnvXTza/cSyaR9rs9V0aWXUBbiB0hf7RmGRwCwZgE+XqCGDKB0zVfwrrt74j+G8up6jbNa3UkNwpXgAhSwBGGOBx65yDWP4R8e2Om+CrH+2bO/sRZ6NbXavMqH7TGVWMFMMeS5Aw2D8wPfjQg+JumzWsxjsbyS+iuYLY2cMkMzlpyRGQ6SFCCVYH5uMHNLcfE3SLXV/sF1DND5c0VrcytLDiCeTbhCu/e2C6gsqlQT14OOh8R3wsrnRENzcwfab9YAIURhKTHI2x93Rflzlecge9Zfh/wAc2us6ja2yadqFrFeeeLW4nVAkzQsVkAAYsOmQSACAcVf1jxPbaZ4j0vRWtria7vwzqUKKqICASdzDdgsMhdxAycYrkrH4nCC0ZdX06Yag97eRQwLLBFughmKb9zyBePlXGclgcDHNa0XxEtL5ohoek6rqyvYxaiWtUQBYXLgffdcvlGGwcnHFXfFXiY2vw5vvEmhAXWLL7XbZXhgQCCQSOMHJHB49ahXx9pcawLqEN1YXcmpJpTW04XfHMyhlJ2kjaVKncDj5hR/wnVtPN9n0rTNQ1G6aWdI4oBGu9IXCSS7mYKE3kqCTliDgY5rc0jVotc0Rb/S9ymQOqpcKUaORSVZHHUFWBB+lcxZ+CtTkiH9q+KNYaVFRENrdPGCAi7iw7kvvPsCB2rp/EukRa9od5pdxJJFFcpsZ48bhyDxn6U7XdJi1i3toppHjEF3BdqUxktFIHAOexK4NZtp4StbZ9NZLicmxvrm/TOPmafzdynjoPObH0FU7PwJZWtitql3csi6OdGydufLJPz9Pvc/T2qOL4f2MGqR6pa3l1BqUXkLHcJt3BI4xGYzx8yOByp74IwQDTfitZjWNCstCRXFzql7FDFOjbWttpMjyqeoYIjYx1JA6Zq5feER9phuNB1O60SRLVLFxbJG6vCmdg2upAZdzYYdMnOaz7v4c2Twx2tlqF5Z6c9rDZXdsgR/tMUTMy5ZgWViXbJB5DevNdN4h0yXVtMe1gvpbFyQfMjRJAR3VlcEMpHBBrnrX4e6fbaLd6bFdXXk3OkrpLMduVjBlO4cYBzK3HQAAAU/UfAyXct/FFq19baVqTB7+xjCbZztCthiu5AwUBgDzzjBJNP8A+EJh/t8Xw1C6Fh9tGpf2ftTZ9p2bN+7G7b325xnn2qvbeAv7PitV0bXNQ0+RLb7HPJGsbGeIO7rkMpCspkfDD+8evGNaLwvbR+BB4WE85s/sB0/ziR5mwps3dMbsc9OtZD/D6G+gkh13WNQ1SNbVrO180Ro1uhKksCqjdJmNPmbP3enJzs+F/D8mitcyXGpTX884VSWhjhRFXONqRqBk5OT346AAVA/hG1e6ec3E4ZtWXV8cY8xYhHt6fdwufWqh8EC2eK40fV7zT9QR7km4VI5N8c8xmZGVlIIDH5T1Hvk5saT4K07TZtyyXE6NYvZSrOwbzg8jSSOxx95mdicYHPAFN8K+Dx4fuUcapc3UEEP2e2heKJAicY3FFBkYBQNzHpnuSaj13wTFqesz6hbajcWD3caRXaxRROZQmQpVnUmNsEjcvbHcA08+CbU62Na+23f9sLcCRLrIysAGPswGMeURnI67juznBrm/hr4Uln8OeH7nUdVvZrO1druHT2EeyObc+CXA3Mq7iQpPBx1wMbUXw705NPjtGu7wpHp0Gno6squnlSGSOUEDhw2D6cDitCHwzcSNYS6trV3qE9nei8jd4o4wCInjCbVUDGHJJ659uKuaPoEGleGV0WGaV4BHJH5j43YcsT7fxVj3fw/027sre1uLi6aOHS00tSCoIVHR1k6ffDRqfT2pbTwSqJEb7Vbm7mjvILwMIooUBiJKqERQADk5PU/gBSy+CITr09/bajcW1tc3C3dxaxxRHfKNuSJCpdVbau5QeeemTnd1nSItVm0ySaSRDYXYu0C4+Zgjpg+2HP5Vl6X4QtNObRGjuZ3OlPcvFux8/nElt3Hbdxil8V+FF8R3Vm1zqNzFaQSRyPaoiFXZHDqwYqWRsjBKkEjj3rPu/AFuzxT2Ooz2t7HNdP55himDJPKZXQo6kYDfdPUY75IOTD4ZvT421G203XdR09INHsrYzqI5GmXfcZLblIDjswAxk8V1134YsZvBj+GYTJBp5tPsSlTl1Tbtzk9Tjuao654E0nWdXv8AUboSLcXmnNpzlDgAE58wekg4AbrgCkk8FxW8Glf2FqFxpV3p1r9ijniRJPMhOCVdXBDHKhs9c59SDo6HoA0WO0gs765a1hWUyxyhWNzLI4dpXbGd2dx4wPmPHAxt1//ZAAA=loadFragment415({"fragmentData":"<p class="c17" id="a:HH"><span id="293866" class="amazon-word-span">As</span><span id="293869" class="amazon-word-span">Turkey </span><span id="293876" class="amazon-word-span">and </span><span id="293880" class="amazon-word-span">Iran </span><span id="293885" class="amazon-word-span">compete </span><span id="293893" class="amazon-word-span">in </span><span id="293896" class="amazon-word-span">the </span><span id="293900" class="amazon-word-span">next </span><span id="293905" class="amazon-word-span">decade, </span><span id="293913" class="amazon-word-span">Israel</span><span id="293920" class="amazon-word-span">and </span><span id="293924" class="amazon-word-span">Pakistan</span><span id="293933" class="amazon-word-span">will </span><span id="293938" class="amazon-word-span">be </span><span id="293941" class="amazon-word-span">concerned </span><span id="293951" class="amazon-word-span">with </span><span id="293956" class="amazon-word-span">local </span><span id="293962" class="amazon-word-span">balances</span><span id="293971" class="amazon-word-span">of </span><span id="293974" class="amazon-word-span">power. </span><span id="293981" class="amazon-word-span">In </span><span id="293984" class="amazon-word-span">the </span><span id="293988" class="amazon-word-span">long </span><span id="293993" class="amazon-word-span">run, </span><span id="293998" class="amazon-word-span">Turkey </span><span id="294005" class="amazon-word-span">cannot </span><span id="294012" class="amazon-word-span">be </span><span id="294015" class="amazon-word-span">contained </span><span id="294025" class="amazon-word-span">by </span><span id="294028" class="amazon-word-span">Iran. </span><span id="294034" class="amazon-word-span">Turkey </span><span id="294041" class="amazon-word-span">is</span><span id="294044" class="amazon-word-span">by </span><span id="294047" class="amazon-word-span">far </span><span id="294051" class="amazon-word-span">the </span><span id="294055" class="amazon-word-span">more </span><span id="294060" class="amazon-word-span">dynamic </span><span id="294068" class="amazon-word-span">country </span><span id="294076" class="amazon-word-span">economically, </span><span id="294090" class="amazon-word-span">and </span><span id="294094" class="amazon-word-span">therefore </span><span id="294104" class="amazon-word-span">it </span><span id="294107" class="amazon-word-span">can </span><span id="294111" class="amazon-word-span">support</span><span id="294119" class="amazon-word-span">a </span><span id="294121" class="amazon-word-span">more </span><span id="294126" class="amazon-word-span">sophisticated</span><span id="294140" class="amazon-word-span">military. </span><span id="294150" class="amazon-word-span">More </span><span id="294155" class="amazon-word-span">important, </span><span id="294166" class="amazon-word-span">whereas</span><span id="294174" class="amazon-word-span">Iran </span><span id="294179" class="amazon-word-span">has</span><span id="294183" class="amazon-word-span">geographically </span><span id="294198" class="amazon-word-span">limited </span><span id="294206" class="amazon-word-span">regional </span><span id="294215" class="amazon-word-span">options,</span><span id="294224" class="amazon-word-span">Turkey </span><span id="294231" class="amazon-word-span">reaches</span><span id="294239" class="amazon-word-span">into </span><span id="294244" class="amazon-word-span">the </span><span id="294248" class="amazon-word-span">Caucasus,</span><span id="294258" class="amazon-word-span">the </span><span id="294262" class="amazon-word-span">Balkans,</span><span id="294271" class="amazon-word-span">Central </span><span id="294279" class="amazon-word-span">Asia,</span><span id="294285" class="amazon-word-span">and </span><span id="294289" class="amazon-word-span">ultimately </span><span id="294300" class="amazon-word-span">the </span><span id="294304" class="amazon-word-span">Mediterranean </span><span id="294318" class="amazon-word-span">and </span><span id="294322" class="amazon-word-span">North </span><span id="294328" class="amazon-word-span">Africa, </span><span id="294336" class="amazon-word-span">which </span><span id="294342" class="amazon-word-span">provides</span><span id="294351" class="amazon-word-span">opportunities</span><span id="294365" class="amazon-word-span">and </span><span id="294369" class="amazon-word-span">allies</span><span id="294376" class="amazon-word-span">denied </span><span id="294383" class="amazon-word-span">the </span><span id="294387" class="amazon-word-span">Iranians.</span><span id="294397" class="amazon-word-span">Iran </span><span id="294402" class="amazon-word-span">has</span><span id="294406" class="amazon-word-span">never </span><span id="294412" class="amazon-word-span">been </span><span id="294417" class="amazon-word-span">a </span><span id="294419" class="amazon-word-span">significant</span><span id="294431" class="amazon-word-span">naval </span><span id="294437" class="amazon-word-span">power </span><span id="294443" class="amazon-word-span">since</span><span id="294449" class="amazon-word-span">antiquity, </span><span id="294460" class="amazon-word-span">and </span><span id="294464" class="amazon-word-span">because</span><span id="294472" class="amazon-word-span">of </span><span id="294475" class="amazon-word-span">the </span><span id="294479" class="amazon-word-span">location </span><span id="294488" class="amazon-word-span">of </span><span id="294491" class="amazon-word-span">its</span><span id="294495" class="amazon-word-span">ports,</span><span id="294502" class="amazon-word-span">it </span><span id="294505" class="amazon-word-span">can </span><span id="294509" class="amazon-word-span">never </span><span id="294515" class="amazon-word-span">really </span><span id="294522" class="amazon-word-span">be </span><span id="294525" class="amazon-word-span">one </span><span id="294529" class="amazon-word-span">in </span><span id="294532" class="amazon-word-span">the </span><span id="294536" class="amazon-word-span">future. </span><span id="294544" class="amazon-word-span">Turkey, </span><span id="294552" class="amazon-word-span">in </span><span id="294555" class="amazon-word-span">contrast,</span><span id="294565" class="amazon-word-span">has</span><span id="294569" class="amazon-word-span">frequently </span><span id="294580" class="amazon-word-span">been </span><span id="294585" class="amazon-word-span">the </span><span id="294589" class="amazon-word-span">dominant </span><span id="294598" class="amazon-word-span">power </span><span id="294604" class="amazon-word-span">in </span><span id="294607" class="amazon-word-span">the </span><span id="294611" class="amazon-word-span">Mediterranean </span><span id="294625" class="amazon-word-span">and </span><span id="294629" class="amazon-word-span">will </span><span id="294634" class="amazon-word-span">be </span><span id="294637" class="amazon-word-span">so</span><span id="294640" class="amazon-word-span">again. </span><span id="294647" class="amazon-word-span">Over </span><span id="294652" class="amazon-word-span">the </span><span id="294656" class="amazon-word-span">next </span><span id="294661" class="amazon-word-span">decade </span><span id="294668" class="amazon-word-span">we </span><span id="294671" class="amazon-word-span">will </span><span id="294676" class="amazon-word-span">see</span><span id="294680" class="amazon-word-span">the </span><span id="294684" class="amazon-word-span">beginning </span><span id="294694" class="amazon-word-span">of </span>Turkey<span id="294703" class="amazon-word-span">&#8217;</span><span id="294711" class="amazon-word-span">s</span><span id="294713" class="amazon-word-span">rise</span><span id="294718" class="amazon-word-span">to </span><span id="294721" class="amazon-word-span">dominance </span><span id="294731" class="amazon-word-span">in </span><span id="294734" class="amazon-word-span">the </span><span id="294738" class="amazon-word-span">region. </span><span id="294746" class="amazon-word-span">It </span><span id="294749" class="amazon-word-span">is</span><span id="294752" class="amazon-word-span">interesting</span><span id="294764" class="amazon-word-span">to </span><span id="294767" class="amazon-word-span">note </span><span id="294772" class="amazon-word-span">that </span><span id="294777" class="amazon-word-span">while </span><span id="294783" class="amazon-word-span">we </span>can<span id="294789" class="amazon-word-span">&#8217;</span><span id="294797" class="amazon-word-span">t </span><span id="294799" class="amazon-word-span">think </span><span id="294805" class="amazon-word-span">of </span><span id="294808" class="amazon-word-span">the </span><span id="294812" class="amazon-word-span">century </span><span id="294820" class="amazon-word-span">without </span><span id="294828" class="amazon-word-span">Turkey </span><span id="294835" class="amazon-word-span">playing </span><span id="294843" class="amazon-word-span">an </span><span id="294846" class="amazon-word-span">extremely </span><span id="294856" class="amazon-word-span">important </span><span id="294866" class="amazon-word-span">role, </span><span id="294872" class="amazon-word-span">this</span><span id="294877" class="amazon-word-span">decade </span><span id="294884" class="amazon-word-span">will </span><span id="294889" class="amazon-word-span">be </span><span id="294892" class="amazon-word-span">one </span><span id="294896" class="amazon-word-span">of </span><span id="294899" class="amazon-word-span">preparation. </span><span id="294912" class="amazon-word-span">Turkey </span><span id="294919" class="amazon-word-span">will </span><span id="294924" class="amazon-word-span">have </span><span id="294929" class="amazon-word-span">to </span><span id="294932" class="amazon-word-span">come </span><span id="294937" class="amazon-word-span">to </span><span id="294940" class="amazon-word-span">terms</span><span id="294946" class="amazon-word-span">with </span><span id="294951" class="amazon-word-span">its</span><span id="294955" class="amazon-word-span">domestic</span><span id="294964" class="amazon-word-span">conflicts</span><span id="294974" class="amazon-word-span">and </span><span id="294978" class="amazon-word-span">grow </span><span id="294983" class="amazon-word-span">its</span><span id="294987" class="amazon-word-span">economy. </span><span id="294996" class="amazon-word-span">The </span><span id="295000" class="amazon-word-span">cautious</span><span id="295009" class="amazon-word-span">foreign </span><span id="295017" class="amazon-word-span">policy </span><span id="295024" class="amazon-word-span">Turkey </span><span id="295031" class="amazon-word-span">has</span><span id="295035" class="amazon-word-span">followed </span><span id="295044" class="amazon-word-span">recently </span><span id="295053" class="amazon-word-span">will </span><span id="295058" class="amazon-word-span">continue. </span><span id="295068" class="amazon-word-span">It </span><span id="295071" class="amazon-word-span">is</span><span id="295074" class="amazon-word-span">not </span><span id="295078" class="amazon-word-span">going </span><span id="295084" class="amazon-word-span">to </span><span id="295087" class="amazon-word-span">plunge </span><span id="295094" class="amazon-word-span">into </span><span id="295099" class="amazon-word-span">conflicts</span><span id="295109" class="amazon-word-span">and </span><span id="295113" class="amazon-word-span">therefore </span><span id="295123" class="amazon-word-span">will </span><span id="295128" class="amazon-word-span">influence </span><span id="295138" class="amazon-word-span">but </span><span id="295142" class="amazon-word-span">not </span><span id="295146" class="amazon-word-span">define </span><span id="295153" class="amazon-word-span">the </span><span id="295157" class="amazon-word-span">region. </span><span id="295165" class="amazon-word-span">The </span><span id="295169" class="amazon-word-span">United </span><span id="295176" class="amazon-word-span">States</span><span id="295183" class="amazon-word-span">must</span><span id="295188" class="amazon-word-span">take </span><span id="295193" class="amazon-word-span">a </span><span id="295195" class="amazon-word-span">long-term </span><span id="295205" class="amazon-word-span">view </span><span id="295210" class="amazon-word-span">of </span><span id="295213" class="amazon-word-span">Turkey </span><span id="295220" class="amazon-word-span">and </span><span id="295224" class="amazon-word-span">avoid </span><span id="295230" class="amazon-word-span">pressure</span><span id="295239" class="amazon-word-span">that </span><span id="295244" class="amazon-word-span">could </span><span id="295250" class="amazon-word-span">undermine </span><span id="295260" class="amazon-word-span">its</span><span id="295264" class="amazon-word-span">development.</span></p>","fragmentMetadata":{"encryption":0,"id":415}});loadFragmap({"fragmentArray":[{"currentFragmentPosition":396,"fragmentEndLocation":6,"fragmentEndPosition":895,"fragmentId":0,"fragmentLength":2278,"fragmentStartLocation":3,"nextFragmentPosition":1030,"nodeOffset":0,"previousFragmentPosition":-1,"skeletonId":0,"skeletonLinkId":"a:0","skeletonLinkType":0},{"currentFragmentPosition":1030,"fragmentEndLocation":20,"fragmentEndPosition":2901,"fragmentId":1,"fragmentLength":6612,"fragmentStartLocation":7,"nextFragmentPosition":3030,"nodeOffset":6,"previousFragmentPosition":396,"skeletonId":0,"skeletonLinkId":"a:0","skeletonLinkType":0},{"currentFragmentPosition":3030,"fragmentEndLocation":30,"fragmentEndPosition":4364,"fragmentId":2,"fragmentLength":5376,"fragmentStartLocation":21,"nextFragmentPosition":4585,"nodeOffset":7,"previousFragmentPosition":1030,"skeletonId":0,"skeletonLinkId":"a:0","skeletonLinkType":0},{"currentFragmentPosition":4585,"fragmentEndLocation":53,"fragmentEndPosition":7837,"fragmentId":3,"fragmentLength":7413,"fragmentStartLocation":31,"nextFragmentPosition":10671,"nodeOffset":0,"previousFragmentPosition":3030,"skeletonId":0,"skeletonLinkId":"a:v","skeletonLinkType":0},{"currentFragmentPosition":10671,"fragmentEndLocation":72,"fragmentEndPosition":10671,"fragmentId":4,"fragmentLength":1220,"fragmentStartLocation":72,"nextFragmentPosition":10671,"nodeOffset":24,"previousFragmentPosition":4585,"skeletonId":0,"skeletonLinkId":"a:v","skeletonLinkType":0},{"currentFragmentPosition":10671,"fragmentEndLocation":73,"fragmentEndPosition":10846,"fragmentId":5,"fragmentLength":5609,"fragmentStartLocation":72,"nextFragmentPosition":10987,"nodeOffset":25,"previousFragmentPosition":10671,"skeletonId":0,"skeletonLinkId":"a:v","skeletonLinkType":0},{"currentFragmentPosition":10987,"fragmentEndLocation":94,"fragmentEndPosition":14041,"fragmentId":6,"fragmentLength":7847,"fragmentStartLocation":74,"nextFragmentPosition":14124,"nodeOffset":11,"previousFragmentPosition":10671,"skeletonId":0,"skeletonLinkId":"a:v","skeletonLinkType":1},{"currentFragmentPosition":14124,"fragmentEndLocation":98,"fragmentEndPosition":14661,"fragmentId":7,"fragmentLength":5304,"fragmentStartLocation":95,"nextFragmentPosition":14734,"nodeOffset":63,"previousFragmentPosition":10987,"skeletonId":0,"skeletonLinkId":"a:v","skeletonLinkType":1},{"currentFragmentPosition":14734,"fragmentEndLocation":101,"fragmentEndPosition":15042,"fragmentId":8,"fragmentLength":3128,"fragmentStartLocation":99,"nextFragmentPosition":15115,"nodeOffset":6<p id="p48" style=";text-align:justify;line-height:21.0px;word-spacing: 1.3;text-indent: 15.0;margin-top: 7.0"><canvas id="1697" width="44.0" height="18.0">Where </canvas> <canvas id="1698" width="25.0" height="18.0">was </canvas> <canvas id="1699" width="22.0" height="18.0">he? </canvas> <canvas id="1700" width="37.0" height="18.0">Sarah </canvas> <canvas id="1701" width="45.0" height="18.0">looked </canvas> <canvas id="1702" width="47.0" height="18.0">around </canvas> <canvas id="1703" width="20.0" height="18.0">for </canvas> <canvas id="1704" width="33.0" height="18.0">what </canvas> <canvas id="1705" width="48.0" height="18.0">seemed </canvas> <canvas id="1706" width="23.0" height="18.0">like </canvas> <canvas id="1708" width="21.0" height="18.0">the </canvas> <canvas id="1709" width="69.0" height="18.0">hundredth </canvas> <canvas id="1710" width="34.0" height="18.0">time, </canvas> <canvas id="1711" width="47.0" height="18.0">hoping </canvas> <canvas id="1712" width="27.0" height="18.0">that </canvas> <canvas id="1713" width="7.0" height="18.0">a </canvas> <canvas id="1714" width="26.0" height="18.0">tall, </canvas> <canvas id="1715" width="85.0" height="18.0">sandy-haired </canvas> <canvas id="1716" width="50.0" height="18.0">rancher </canvas> <canvas id="1718" width="42.0" height="18.0">would </canvas> <canvas id="1719" width="47.0" height="18.0">appear. </canvas> <canvas id="1720" width="20.0" height="18.0">He </canvas> <canvas id="1721" width="42.0" height="18.0">didn\'t. </canvas> <canvas id="1722" width="23.0" height="18.0">She </canvas> <canvas id="1723" width="32.0" height="18.0">took </canvas> <canvas id="1724" width="51.0" height="18.0">another </canvas> <canvas id="1725" width="30.0" height="18.0">deep </canvas> <canvas id="1726" width="43.0" height="18.0">breath </canvas> <canvas id="1727" width="13.0" height="18.0">as </canvas> <canvas id="1729" width="21.0" height="18.0">she </canvas> <canvas id="1730" width="71.0" height="18.0">considered </canvas> <canvas id="1731" width="21.0" height="18.0">the </canvas> <canvas id="1732" width="49.0" height="18.0">reasons </canvas> <canvas id="1733" width="17.0" height="18.0">he </canvas> <canvas id="1734" width="39.0" height="18.0">might </canvas> <canvas id="1735" width="22.0" height="18.0">not </canvas> <canvas id="1736" width="30.0" height="18.0">have </canvas> <canvas id="1737" width="40.0" height="18.0">come. </canvas> <canvas id="1738" width="51.0" height="18.0">Perhaps </canvas> <canvas id="1740" width="19.0" height="18.0">his </canvas> <canvas id="1741" width="37.0" height="18.0">horse </canvas> <canvas id="1742" width="26.0" height="18.0">had </canvas> <canvas id="1743" width="32.0" height="18.0">gone </canvas> <canvas id="1744" width="35.0" height="18.0">lame. </canvas> <canvas id="1745" width="51.0" height="18.0">Perhaps </canvas> <canvas id="1746" width="7.0" height="18.0">a </canvas> <canvas id="1747" width="37.0" height="18.0">wheel </canvas> <canvas id="1748" width="26.0" height="18.0">had </canvas> <canvas id="1749" width="37.0" height="18.0">fallen </canvas> <canvas id="1750" width="19.0" height="18.0">off </canvas> <canvas id="1751" width="21.0" height="18.0">the </canvas> <canvas id="1753" width="48.0" height="18.0">wagon. </canvas> <canvas id="1754" width="41.0" height="18.0">Those </canvas> <canvas id="1755" width="31.0" height="18.0">were </canvas> <canvas id="1756" width="82.0" height="18.0">possibilities, </canvas> <canvas id="1757" width="25.0" height="18.0">and </canvas> <canvas id="1758" width="29.0" height="18.0">they </canvas> <canvas id="1759" width="31.0" height="18.0">were </canvas> <canvas id="1760" width="20.0" height="18.0">far </canvas> <canvas id="1761" width="34.0" height="18.0">more </canvas> <canvas id="1762" width="21.0" height="18.0">pal- </canvas><canvas id="1764" width="39.0" height="18.0">atable </canvas> <canvas id="1765" width="31.0" height="18.0">than </canvas> <canvas id="1766" width="21.0" height="18.0">the </canvas> <canvas id="1767" width="72.0" height="18.0">alternative. </canvas> <canvas id="1768" width="40.0" height="18.0">Surely </canvas> <canvas id="1769" width="42.0" height="18.0">Austin </canvas> <canvas id="1770" width="43.0" height="18.0">hadn\'t </canvas> <canvas id="1771" width="55.0" height="18.0">changed </canvas> <canvas id="1772" width="20.0" height="18.0">his </canvas> <canvas id="1774" width="38.0" height="18.0">mind. </canvas> <canvas id="1775" width="40.0" height="18.0">Surely </canvas> <canvas id="1776" width="16.0" height="18.0">he </canvas> <canvas id="1777" width="44.0" height="18.0">hadn\'t </canvas> <canvas id="1778" width="31.0" height="18.0">been </canvas> <canvas id="1779" width="33.0" height="18.0">lying </canvas> <canvas id="1780" width="35.0" height="18.0">when </canvas> <canvas id="1781" width="30.0" height="18.0">he\'d </canvas> <canvas id="1782" width="49.0" height="18.0">written </canvas> <canvas id="1783" width="36.0" height="18.0">those </canvas> <canvas id="1785" width="67.0" height="18.0">wonderful </canvas> <canvas id="1786" width="42.0" height="18.0">letters. </canvas> <canvas id="1787" width="40.0" height="18.0">Surely </canvas> <canvas id="1788" width="16.0" height="18.0">he </canvas> <canvas id="1789" width="43.0" height="18.0">wasn\'t </canvas> <canvas id="1790" width="38.0" height="18.0">going </canvas> <canvas id="1791" width="14.0" height="18.0">to </canvas> <canvas id="1792" width="57.0" height="18.0">abandon </canvas> <canvas id="1793" width="22.0" height="18.0">her </canvas> <canvas id="1794" width="24.0" height="18.0">and </canvas> <canvas id="1796" width="34.0" height="18.0">Thea </canvas> <canvas id="1797" width="21.0" height="18.0">the </canvas> <canvas id="1798" width="26.0" height="18.0">way </canvas> <canvas id="1799" width="58.0" height="18.0">everyone </canvas> <canvas id="1800" width="13.0" height="18.0">in </canvas> <canvas id="1801" width="82.0" height="18.0">Philadelphia </canvas> <canvas id="1802" width="29.0" height="18.0">had. </canvas> <canvas id="1803" width="18.0" height="18.0">Or </canvas> <canvas id="1804" width="25.0" height="18.0">was </canvas> <canvas id="1805" width="22.0" height="18.0">he? </canvas> </p>';
  var defaultDictionary;
  var defaultDeDictionary;
  */

  // The highest character compressed and/or copied directly.
  var MAX_CHAR = 0x26ff;
  // The most characters that will be quoted.
  var MAX_QUOTE_COUNT = 100;
  // The (first) code for quoted high-characters.
  var QUOTE_CODE = MAX_CHAR + 1;
  // The last code for quoted high-characters.
  var MAX_QUOTE_CODE = QUOTE_CODE + MAX_QUOTE_COUNT;
  // The first emitted code.
  var FIRST_CODE = QUOTE_CODE + MAX_QUOTE_COUNT + 1;
  // The highest permissible code.
  var MAX_CODE = 0xfffd;
  // The gap for surrogate pairs.
  var BEGIN_SURROGATES = 0xd7ff;
  var END_SURROGATES = 0xe000;

  /**
   * Finds the next character code in the dictionary.
   * @param {Object} dict A possibly partially-built dictionary.
   * @return {Number} The next character code to use in the dictionary.
   */
  function findNextCode(dict, firstCode) {
    var nextCode = firstCode > 0 ? firstCode : FIRST_CODE;
    for (var entry in dict) {
      if (dict[entry] >= nextCode) {
        nextCode = dict[entry] + 1;
      }
    }
    return nextCode;
  } // End of findNextCode

  /**
   * Adds strings from an array to the compression dictionary.
   * @param {Object} strings The strings to be added.
   * @param {Object} dict The dictionary to which strings are to be added.
   * @param {Number} firstCode (optional) If a number > 0, defines the first code to be
   * used in the dictionary.  NOTE THAT CHARACTERS BETWEEN THIS VALUE AND THE SYSTEM
   * DEFINED MAX_CHAR WILL NOT BE PROPERLY DECOMPRESSED.  Use appropriately.
   * @return {Object} The augmented dictionary.
   */
  function addStringsToDictionary(strings, dict, firstCode) {
    var nextCode = findNextCode(dict, firstCode);

    // Enumerate the strings
    for (var ix in strings) {
      var str = strings[ix];
      // Iterate over the substrings of the first-2, first-3, first-4 ... str.length
      for (var l = 2; l <= str.length; l++) {
        var sub = str.substr(0, l);
        // If the substring isn't in the dictionary, add it.
        if (!dict.hasOwnProperty(sub)) {
          dict[sub] = nextCode++;
        }
      }
    }

    return dict;
  } // End of addStringsToDictionary

  /**
   * Adds the three-digit number strings to the dictionary.
   * @param {Object} dict The dictionary to which numbers are to be added.
   * @return {Object} The augmented dictionary.
   */
  function addNumbersToDictionary(dict, firstCode) {
    var list = [];
    for (var i = 100; i < 1000; i++) {
      list.push("" + i);
    }
    return addStringsToDictionary(list, dict, firstCode);
  } // End of addNumbersToDictionary

  /**
   * Constructs a decompression dictionary from a compression dictionary.
   * @param {Object} dict The compression dictionary.
   * @return {Object} The corresponding decompression dictionary.
   */
  function getDecompressionDictionary(dict) {
    var deDict = [];
    for (var de in dict) {
      deDict[dict[de]] = de;
    }
    return deDict;
  } // End of getDecompressionDictionary

  /**
   * Builds a dictionary for use with the lz{comprss|expand}withStaticDictionary functions.
   * @param {Object} dictionary An object in which to build the dictionary.
   * @param {String} string The training string.
   * @return {Object} the new dictionary.
   */
  function lzBuildDictionary(dictionary, string) {
    // The recreated string of characters.
    var currentString;
    // The current character code used to encode increasingly longer found strings.
    var stringCode = FIRST_CODE;
    // An index for iterating through a string. Ah, Javascript's scoping...
    var strIx;

    // Initialize the current string and the dictionary to empty.
    currentString = "";

    // Iterate the rest of the characters, adding them to the currentString as possible, and emitting
    //  new characters and building the dictionary as we go along.
    var ix = 0; // Counter of characters.
    while (ix < string.length) {
      var nextChar = string.charAt(ix);
      ix++;

      if (nextChar.charCodeAt(0) <= MAX_CHAR) {
        // This handles the case of Latin, Greek, Cyrillic, and symbols, performing LZ compression.

        if (dictionary.hasOwnProperty(currentString + nextChar)) {
          // The currentString plus the nextChar is still a known string, so keep on looking.
          currentString += nextChar;
        } else {
          // If the currentString doesn't have anything in it, we're just spinning up.
          if (currentString.length > 0) {
            // The nextChar makes a new string, so we need to emit the previous string, which may
            //  be a single character, or may be a string from the dictionary.
            // If currentString's length is 1, a single character, wasn't in dictionary; output it.
            //   otherwise, currentString was already found; output the corresponding stringCode;

            // If we can expand the dictionary, do so.
            if (stringCode < MAX_CODE) {
              dictionary[currentString + nextChar] = stringCode;
              stringCode++;
              // Skip the zone of surrogate pairs.
              if (stringCode === BEGIN_SURROGATES) {
                stringCode = END_SURROGATES;
              }
            }
          }
          // Start again looking for strings.
          currentString = nextChar;
        }
      } else {
        // This handles the case of chars > 0x26ff, Chinese, Japanese, Thai, Korean, Indic, etc.
        // Escapes break compression.
        currentString = "";
      }
    }

    return dictionary;
  } // End of lzBuildDictionary

  /**
   * Lazily builds the default static dictionary, and returns it.
   * @return {Object} The default compression dictionary.
   */
  function getDefaultDictionary() {
    if (defaultDictionary === undefined || defaultDictionary === {}) {
      // #ifdef DEBUG
      // KindleDebug.error("Using default static dictionary");
      // #endif

      defaultDictionary = lzBuildDictionary({}, defaultDictionaryString);
    }
    return defaultDictionary;
  } // End of getDefaultDictionary

  /**
   * Lazily builds the default static decompression dictionary, and returns it.
   * @return {Object} The default de-compression dictionary.
   */
  function getDefaultDeDictionary() {
    if (defaultDeDictionary === undefined || defaultDeDictionary === []) {
      getDefaultDictionary();
      defaultDeDictionary = [];
      for (var d in defaultDictionary) {
        defaultDeDictionary[defaultDictionary[d]] = d;
      }
    }
    return defaultDeDictionary;
  } // End of getDefaultDeDictionary

  /**
   * Compress with LZ style compression, but using a pre-built dictionary.
   * @param {String} toCompress The string to be compressed.
   * @param {Object} dictionary A dictionary to use in compression.  If
   * empty or undefined, use the default static dictionary.
   * @return {String} The compressed string.
   */
  function lzCompressWithStaticDictionary(toCompress, dictionary) {
    if (dictionary === undefined || dictionary === {}) {
      dictionary = getDefaultDictionary();
    }
    // The output is built here.
    var out = [];
    // The recreated string of characters.
    var currentString;
    // A run of non-compressible charcters.
    var nonCompressible;
    // When outputting a chunk of non-compressible chars, the length of the chunk.
    var chunkLen;
    // And the chunk itself.
    var chunk;
    // An index for iterating through a string. Ah, Javascript's scoping...
    var strIx;

    // Initialize the current string and the noncompressible string to empty.
    currentString = "";
    nonCompressible = "";

    // Iterate the rest of the characters, adding them to the currentString as possible, and emitting
    //  new characters and building the dictionary as we go along.
    var ix = 0; // Counter of characters.
    while (ix < toCompress.length) {
      var nextChar = toCompress.charAt(ix);
      ix++;

      if (nextChar.charCodeAt(0) <= MAX_CHAR) {
        // This handles the case of Latin, Greek, Cyrillic, and symbols, performing LZ compression.
        while (nonCompressible.length > 0) {
          chunkLen = Math.min(MAX_QUOTE_COUNT, nonCompressible.length);
          chunk = nonCompressible.substr(0, chunkLen);
          nonCompressible = nonCompressible.substr(chunkLen);
          out.push(QUOTE_CODE + chunkLen);
          for (strIx = 0; strIx < chunk.length; strIx++) {
            out.push(chunk.charCodeAt(strIx));
          }
        }

        if (dictionary.hasOwnProperty(currentString + nextChar)) {
          // The currentString plus the nextChar is still a known string, so keep on looking.
          currentString += nextChar;
        } else {
          // If the currentString doesn't have anything in it, we're just spinning up.
          if (currentString.length > 0) {
            // The nextChar makes a new string, so we need to emit the previous string, which may
            //  be a single character, or may be a string from the dictionary.
            // If currentString's length is 1, a single character, wasn't in dictionary; output it.
            //   otherwise, currentString was already found; output the corresponding stringCode;
            out.push(
              currentString.length === 1
                ? currentString.charCodeAt(0)
                : dictionary[currentString]
            );
          }
          // Start again looking for strings.
          currentString = nextChar;
        }
      } else {
        // This handles the case of chars > 0x26ff, Chinese, Japanese, Thai, Korean, Indic, etc.

        if (currentString.length > 0) {
          // See comment above.
          out.push(
            currentString.length === 1
              ? currentString.charCodeAt(0)
              : dictionary[currentString]
          );
          currentString = "";
        }

        nonCompressible += nextChar;
      }
    }

    // Finish up any compression.
    if (currentString.length > 0) {
      // See comment above.
      out.push(
        currentString.length === 1
          ? currentString.charCodeAt(0)
          : dictionary[currentString]
      );
    }

    // Finish up any non-compressible characters.
    while (nonCompressible.length > 0) {
      chunkLen = Math.min(MAX_QUOTE_COUNT, nonCompressible.length);
      chunk = nonCompressible.substr(0, chunkLen);
      nonCompressible = nonCompressible.substr(chunkLen);
      out.push(QUOTE_CODE + chunkLen);
      for (strIx = 0; strIx < chunk.length; strIx++) {
        out.push(chunk.charCodeAt(strIx));
      }
    }

    // Now convert all the character codes to strings, and concatenate them into one big string.
    for (/*var*/ i = 0; i < out.length; i++) {
      out[i] = String.fromCharCode(out[i]);
    }
    var result = out.join("");

    return result;
  } // End of lzCompressWithStaticDictionary

  /**
   * Expands a string using a static dictionary.
   * @param {String} toExpand The string to be expanded.
   * @param {Object} dictionary The dictionary to use for expansion.  If
   * undefined or empty, uses a default decompression dictionary.
   * @return {String} the expanded string.
   */
  function lzExpandWithStaticDictionary(toExpand, dictionary, altFirstCode) {
    if (dictionary === undefined || dictionary === []) {
      dictionary = getDefaultDeDictionary();
    }
    var maxChar = MAX_CHAR;
    var firstCode = FIRST_CODE;
    if (altFirstCode !== undefined) {
      maxChar = altFirstCode - 1;
      firstCode = altFirstCode;
    }

    // The de-compressed output is built here.
    var out = [];

    var ix = 0;
    while (ix < toExpand.length) {
      var nextCode = toExpand.charCodeAt(ix);
      ix++;

      // Process the codes from the compressed stream.
      if (nextCode <= maxChar) {
        // The code is a character, meaning we didn't find it as part of a longer string.
        out.push(String.fromCharCode(nextCode));
      } else if (nextCode >= firstCode) {
        // The code is an index into the dictionary.
        out.push(dictionary[nextCode]);
      } else {
        // It is a quoted sequence.  Output that many characters.
        var quotedLength = nextCode - QUOTE_CODE;
        out.push(toExpand.substr(ix, quotedLength));
        ix += quotedLength;
      }
    }

    var result = out.join("");

    return result;
  } // End of lzExpandWithStaticDictionary

  /**
   * This function performs a variation of LZ compression on the input string.  Key points
   * are that the input and output are Javascript strings, Western characters are compressed,
   * non-Western characters are quoted.
   * @param {String} toCompress The string to be compressed.
   * @return {String} The compressed string.
   */
  function lzCompress(toCompress) {
    // A dictionary of found strings.
    var dictionary = {};
    // The output is built here.
    var out = [];
    // The recreated string of characters.
    var currentString;
    // The current character code used to encode increasingly longer found strings.
    var stringCode = FIRST_CODE;
    // A run of non-compressible charcters.
    var nonCompressible;
    // When outputting a chunk of non-compressible chars, the length of the chunk.
    var chunkLen;
    // And the chunk itself.
    var chunk;
    // An index for iterating through a string. Ah, Javascript's scoping...
    var strIx;

    // Initialize the current string and the noncompressible string to empty.
    currentString = "";
    nonCompressible = "";

    // Iterate the rest of the characters, adding them to the currentString as possible, and emitting
    //  new characters and building the dictionary as we go along.
    var ix = 0; // Counter of characters.
    while (ix < toCompress.length) {
      var nextChar = toCompress.charAt(ix);
      ix++;

      if (nextChar.charCodeAt(0) <= MAX_CHAR) {
        // This handles the case of Latin, Greek, Cyrillic, and symbols, performing LZ compression.
        while (nonCompressible.length > 0) {
          chunkLen = Math.min(MAX_QUOTE_COUNT, nonCompressible.length);
          chunk = nonCompressible.substr(0, chunkLen);
          nonCompressible = nonCompressible.substr(chunkLen);
          out.push(QUOTE_CODE + chunkLen);
          for (strIx = 0; strIx < chunk.length; strIx++) {
            out.push(chunk.charCodeAt(strIx));
          }
        }

        if (dictionary.hasOwnProperty(currentString + nextChar)) {
          // The currentString plus the nextChar is still a known string, so keep on looking.
          currentString += nextChar;
        } else {
          // If the currentString doesn't have anything in it, we're just spinning up.
          if (currentString.length > 0) {
            // The nextChar makes a new string, so we need to emit the previous string, which may
            //  be a single character, or may be a string from the dictionary.
            // If currentString's length is 1, a single character, wasn't in dictionary; output it.
            //   otherwise, currentString was already found; output the corresponding stringCode;
            out.push(
              currentString.length === 1
                ? currentString.charCodeAt(0)
                : dictionary[currentString]
            );

            // If we can expand the dictionary, do so.
            if (stringCode < MAX_CODE) {
              dictionary[currentString + nextChar] = stringCode;
              stringCode++;
              // Skip the zone of surrogate pairs.
              if (stringCode === BEGIN_SURROGATES) {
                stringCode = END_SURROGATES;
              }
            }
          }
          // Start again looking for strings.
          currentString = nextChar;
        }
      } else {
        // This handles the case of chars > 0x26ff, Chinese, Japanese, Thai, Korean, Indic, etc.

        if (currentString.length > 0) {
          // See comment above.
          out.push(
            currentString.length === 1
              ? currentString.charCodeAt(0)
              : dictionary[currentString]
          );
          currentString = "";
        }

        nonCompressible += nextChar;
      }
    }

    // Finish up any compression.
    if (currentString.length > 0) {
      // See comment above.
      out.push(
        currentString.length === 1
          ? currentString.charCodeAt(0)
          : dictionary[currentString]
      );
    }

    // Finish up any non-compressible characters.
    while (nonCompressible.length > 0) {
      chunkLen = Math.min(MAX_QUOTE_COUNT, nonCompressible.length);
      chunk = nonCompressible.substr(0, chunkLen);
      nonCompressible = nonCompressible.substr(chunkLen);
      out.push(QUOTE_CODE + chunkLen);
      for (strIx = 0; strIx < chunk.length; strIx++) {
        out.push(chunk.charCodeAt(strIx));
      }
    }

    // Now convert all the character codes to strings, and concatenate them into one big string.
    for (/*var*/ i = 0; i < out.length; i++) {
      out[i] = String.fromCharCode(out[i]);
    }
    var result = out.join("");

    return result;
  } // End of lzCompress

  /**
   * This function is the complement of the LZ compression function above.
   * @param {String} toExpand The string to be expanded.
   * @return {String} The expanded string.
   */
  function lzExpand(toExpand) {
    // The recreated dictionary of found strings.
    var dictionary = {};
    // The de-compressed output is built here.
    var out = [];
    // A string, consisting of characters through the current character, that has already been seen; that is
    //  this string exists in the dictionary.  We try to extend the string.  Once it can no longer be extended,
    //  we emit the code that corresponds to this string.
    var currentString;
    // The current character code used to encode increasingly longer found strings.
    var stringCode = FIRST_CODE;

    var previousString = "";
    var previousChar;

    var ix = 0;
    while (ix < toExpand.length) {
      var nextCode = toExpand.charCodeAt(ix);
      ix++;

      // Process the codes from the compressed stream.
      if (nextCode <= MAX_CHAR) {
        // The code is a character, meaning we didn't find it as part of a longer string.
        currentString = String.fromCharCode(nextCode);
      } else if (nextCode >= FIRST_CODE) {
        // If the code is already in the dictionary, it means we know it, and what it is.  If it
        //  isn't there (yet), it means that during compression it was emitted here for the first
        //  time, representing the string and character we were looking at last time through this loop.
        currentString = dictionary[nextCode];
        if (!currentString) {
          currentString = previousString + previousChar;
        }
      } else {
        // It is a quoted sequence.  Output that many characters.
        var quotedLength = nextCode - QUOTE_CODE;
        out.push(toExpand.substr(ix, quotedLength));
        ix += quotedLength;
        // Quoting breaks compression sequences.
        previousString = "";
        continue;
      }

      // This is for the non-quoted case.
      out.push(currentString);
      previousChar = currentString.charAt(0);
      if (stringCode < MAX_CODE && previousString.length > 0) {
        dictionary[stringCode] = previousString + previousChar;
        stringCode++;
        // Skip the zone of surrogate pairs.
        if (stringCode === BEGIN_SURROGATES) {
          stringCode = END_SURROGATES;
        }
      }
      previousString = currentString;
    }

    var result = out.join("");

    return result;
  } // End of lzExpand

  return {
    /**
     * lzCompress - perform LZ78 compression on the input string.
     * @param toCompress - A String to be compressed.
     * @return A compressed version of the string.
     */
    lzCompress: lzCompress,

    /**
     * lzExpand - perform LZ78 compression on the input string.
     * @param toExpand - A string to be expanded, originally compressed by lzComress.
     * @return The original, uncompressed version of the string.
     */
    lzExpand: lzExpand,

    lzBuildDictionary: lzBuildDictionary,
    lzGetDecompressionDictionary: getDecompressionDictionary,
    lzAddStringsToDictionary: addStringsToDictionary,
    lzAddNumbersToDictionary: addNumbersToDictionary,

    lzCompressWithStaticDictionary: lzCompressWithStaticDictionary,
    lzExpandWithStaticDictionary: lzExpandWithStaticDictionary
  };
})();

/*
 * =======================================================================
 * KindleDebug
 *
 * This class provides debug functionality.
 *
 * Copyright (c) 2010-2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * =======================================================================
 */

var KindleDebug = function() {
  /***************************************
   *
   * LOG METHODS
   *
   **************************************/

  /**
   * @param message The string to error.
   */
  function error(message) {
    // #ifdef DEBUG
    if (window.console) {
      console.error(message);
    }
    // #endif
  }

  /**
   * @param message The string to log.
   */
  function log(message) {
    // #ifdef DEBUG
    if (window.console) {
      console.log(message);
    }
    // #endif
  }

  /**
   * @param message The string to warn.
   */
  function warn(message) {
    // #ifdef DEBUG
    if (window.console) {
      console.warn(message);
    }
    // #endif
  }

  return {
    error: error,
    log: log,
    warn: warn,
  };
}();
var KindleEncryption = function(){

  // -------------
  // UTF8 Encoding
  // -------------

  /**
   * UTF8 encodes a string.
   * @param {Object} input String to encode.
   */
  function utf8Encode(input){
    input = input.replace(/\x0d\x0a/g, "\x0a");
    var output = [];
    for (var n = 0; n < input.length; n++) {
      var c = input.charCodeAt(n);
      if (c < 128) {
        output.push(String.fromCharCode(c));
      } else if ((c > 127) && (c < 2048)) {
        output.push(String.fromCharCode((c >> 6) | 192));
        output.push(String.fromCharCode((c & 63) | 128));
      } else {
        output.push(String.fromCharCode((c >> 12) | 224));
        output.push(String.fromCharCode(((c >> 6) & 63) | 128));
        output.push(String.fromCharCode((c & 63) | 128));
      }
    }
    return output.join('');
  }

  /**
   * UTF8 decodes a string.
   * @param {Object} input String to decode.
   */
  function utf8Decode(input){
    var string = [];
    var i = 0;
    var c, c1, c2;
    while (i < input.length) {
      c = input.charCodeAt(i);
      if (c < 128) {
        string.push(String.fromCharCode(c));
        i++;
      } else if ((c > 191) && (c < 224)) {
        c1 = input.charCodeAt(i + 1);
        string.push(String.fromCharCode(((c & 31) << 6) | (c1 & 63)));
        i += 2;
      } else {
        c1 = input.charCodeAt(i + 1);
        c2 = input.charCodeAt(i + 2);
        string.push(String.fromCharCode(((c & 15) << 12) |
          ((c1 & 63) << 6) |
          (c2 & 63)));
        i += 3;
      }
    }
    return string.join('');
  }

  // ---------------
  // Base64 Encoding
  // ---------------

  var BASE64_STRING = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  var B64LOOKUP = [];

  for (var i=0 ; i<BASE64_STRING.length ; i+=1) {
    B64LOOKUP[BASE64_STRING.charCodeAt(i)] = i;
  }

  /**
   * Base64 encodes a string.
   * @param {Object} input String to encode.
   */
  function base64Encode(input){
    var output = [];
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    while (i < input.length) {
      chr1 = input.charCodeAt(i++)&255;
      chr2 = input.charCodeAt(i++)&255;
      chr3 = input.charCodeAt(i++)&255;
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;
      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }
      output.push(BASE64_STRING.charAt(enc1) +
        BASE64_STRING.charAt(enc2) +
        BASE64_STRING.charAt(enc3) +
        BASE64_STRING.charAt(enc4));
    }
    return output.join('');
  }

  /**
   * Base64 decodes a string.
   * @param {Object} input String to decode.
   */
  function base64Decode(input){
    var output = [];
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    while (i < input.length) {
      /*
          enc1 = BASE64_STRING.indexOf(input.charAt(i++));
          enc2 = BASE64_STRING.indexOf(input.charAt(i++));
          enc3 = BASE64_STRING.indexOf(input.charAt(i++));
          enc4 = BASE64_STRING.indexOf(input.charAt(i++));
      */
      enc1 = B64LOOKUP[input.charCodeAt(i++)];
      enc2 = B64LOOKUP[input.charCodeAt(i++)];
      enc3 = B64LOOKUP[input.charCodeAt(i++)];
      enc4 = B64LOOKUP[input.charCodeAt(i++)];

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;
      output.push(String.fromCharCode(chr1));
      if (enc3 !== 64) {
        output.push(String.fromCharCode(chr2));
      }
      if (enc4 !== 64) {
        output.push(String.fromCharCode(chr3));
      }
    }
    return output.join('');
  }


  // --------------
  // RC4 encryption
  // --------------

  /**
   * RC4 encrypts (or decrypts) a string.
   * @param {Object} input String to encrypt or decrypt.
   * @param {Object} key The key.
   */
  function rc4(input, key){
    var s = [];
    s.length = 256;
    for (var i = 0; i < 256; i++) {
      s[i] = i;
    }
    var j = 0;
    var x;
    for (i = 0; i < 256; i++) {
      j = (j + s[i] + key[i % key.length]) & 255;
      x = s[i];
      s[i] = s[j];
      s[j] = x;
    }
    i = 0;
    j = 0;
    var ct = [];

    for (var y = 0; y < input.length; y++) {
      i = (i + 1) & 255;
      j = (j + s[i]) & 255;
      x = s[i];
      s[i] = s[j];
      s[j] = x;
      ct.push(String.fromCharCode(input.charCodeAt(y) ^ s[(s[i] + s[j]) & 255]));
    }
    return ct.join('');
  }


  // -----------
  // Obfuscation
  // -----------

  // since we want the random strings we insert to look something like text, we
  // use a set of characters that approximate the letter distribution in English
  var FREQ_CHARS = 'eeeeeeeeeeeeeeeeettttttttaaaaaaaaaaaaaaaaooooooiiiiiiinnnnssssrrrrhhhhllldddcccuuummmfffpoggwwyybbvkxjqz';
  var FREQ_CHARS_WITH_SPACE = FREQ_CHARS + '                                             ';

  /**
   * Creates a random string of the given length.
   * @param {Object} len Length.
   * @param {Object} allowSpace Allow spaces or not.
   */
  function randomString(len, allowSpace) {
    var text = '';
    var possible = allowSpace ? FREQ_CHARS_WITH_SPACE : FREQ_CHARS;
    var l = possible.length;
    for (var i = 0; i < len; i++) {
      text += possible.charAt(Math.floor(Math.random() * l));
    }
    return text;
  }

  var RANDOM_CSS_CLASSES = 10;

  // add RANDOM_CSS_CLASSES CSS classes with random names: .RANDOM {display: none;}
  var cssClasses = [];
  for (var j = 0; j < RANDOM_CSS_CLASSES; j++) {
    cssClasses[j] = randomString(15, false);
  }

  // the set of tags we will insert when obfuscating
  var obfuscationTags = ['p', 'span', 'div', 'em', 'i', 'strong', 'b', 'a', 'big', 'small'];

  // have the CSS rules been defined?
  var rulesDefined = false;

  // how often we insert bogus DOM nodes (smaller means more bogus nodes)
  var CHARS_BETWEEN_BOGUS_NODES = 60;

  /**
   * Obfuscates the given DOM node.
   * @param {Object} node Node.
   */
  function obfuscate(node){
    var i;
    if (!rulesDefined) {
      for (i = 0; i < RANDOM_CSS_CLASSES; i++) {
        $(cssClasses[i]).addClass("noDisplay");
      }
      rulesDefined = true;
    }

    // get the html
    var htmlText = $(node).html();

    // insert garbage of the form
    //     <TAG class=RANDOM_RULE>RANDOM TEXT</TAG>
    // where RANDOM_RULE is one of the 10 rules we created above
    // and TAG is one of the obfuscationTags elements above
    var inTag = false;
    var obfuscatedText = '';
    var lastInsert = 0;
    for (i = 0; i < htmlText.length; i++) {
      if (htmlText[i] === '>') {
        inTag = false;
      } else if (htmlText[i] === '<') {
        inTag = true;
      } else if ((i % CHARS_BETWEEN_BOGUS_NODES === 7) && (!inTag)) {
        obfuscatedText += htmlText.substring(lastInsert, i);
        lastInsert = i;

        // pick a random CSS class
        var cssClass = cssClasses[Math.floor(Math.random() * cssClasses.length)];
        // pick a random tag
        var tag = obfuscationTags[Math.floor(Math.random() * obfuscationTags.length)];
        // add a tag containing random text
        obfuscatedText += '<' + tag + ' class="' + cssClass + '">' + randomString(30, true) + '</' + tag + '>';
      }
    }
    obfuscatedText += htmlText.substring(lastInsert, htmlText.length);

    // replace the html
    $(node).html(obfuscatedText);
  }

  /**
   * Checks if a given class name is one of our obfuscation classes.
   * @param {Object} className Class name to check.
   */
  function isObfuscationClass(className) {
    for (var j = 0; j < cssClasses.length; j++) {
      if (cssClasses[j] === className) {
        return true;
      }
    }
    return false;
  }

  // Pad the key hex to 128bits
  var PADDING_ZEROS="00000000000000000000000000000000";
  function hexToByte8Array(hex) {
    hex = hex + PADDING_ZEROS.substring(0, 32 - hex.length);

    var value = [];
    for (i = 0; i < hex.length; i+=2) {
      value.push(parseInt(hex.substring(i,i+2), 16));
    }
    return value;
  }

  function rc4Encrypt(str, key){
    return base64Encode(rc4(utf8Encode(str), hexToByte8Array(key)));
  }

  function rc4Decrypt(str, key){
    return utf8Decode(rc4(base64Decode(str), hexToByte8Array(key)));
  }

  /**
   * In IE 9, if we draw an image to a canvas, and get the image data back, the pixel value we get will not be an exact match
   * of the original image. This creates a serious problem because we rely on the exact pixel value to decode book key.
   * Based on observation, the pixel value is always within +-1 range, and if any distortion happens, all 3 channel will be
   * distorted the same way. Since we use base32 encoding for the book key, this method detects characters that are
   * not in base32 encoding and attempt to derive the original character.
   *
   * Unfortunately, this solution is not complete, there is one pair of base32 characters('X' <-> '7') that can in theory be distorted to each other.
   * This situation is rare enough and has not been observed in practice, so this function should be good for now to unblock IE development
   *
   * @param ch The character that IE tell us
   * @param r The r value
   * @param g The g value
   * @param b The b Value
   * @return The (hopefully) real character before IE messed it up
   */
  function degibberishCharacter(ch, r, g, b){
    function isBase32(c){
      return (c>=65&&c<=90) || (c>=50&&c<=55);
    }

    var result, offset = 0;
    if(isBase32(ch)|| ch===0){
      result = ch;
    }
    else{
      offset = r>=2?-1:1;
      result = (r+offset+8)%8 * 32 + (g+offset+4)%4 * 8 + (b+offset+8)%8;
    }

    if(!isBase32(result)){
      result = 0;
    }
    return result;
  }

  /**
   * The unhelpful name is intentional.
   *
   * Extract an ASCII string from an image, where the string is encoded in the low bits of
   * the color channels.  Assumes a 24-bit color image.  Some browsers have issues
   * if there is an alpha channel.  Each pixel codes one character, with:
   * bits 5-7 (the high 3 bits) encoded in the low 3 bits of the red channel
   * bits 3-4 (the middle 2) encoded in the low 2 bits of the green channel
   * bits 0-2 (the low 3 bits) encoded in the low 3 bits of the blue channel
   * @param {Object} imageUrl The URL of the image containing the string.
   * @param {Object} resultCallback A function, taking one argument, that will be called
   * with the result, a string.
   * @param {Object} errorCallback A function that will be called if there is an error getting the file.
   */
  function iToStr(imageUrl, resultCallback, errorCallback){
    var image = new Image();
    image.onload = function(){
      var isIE = KindleHostDeviceDetector.isIE();
      var height = image.height;
      var width = image.width;
      // Create a canvas, and get the 2d context; draw the image in that context.
      var canvas = document.createElement('canvas');
      var context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);

      // Extract characters from the data.
      var idat;           // image data
      var r, g, b;        // rgb values from pixels
      var ch;             // extracted charCode
      var result = '';    // resulting string
      var ix = 0;         // byte index
      var maxIx;          // Max byte index
      var ixRow = 0;
      while (ixRow < height) {
        // Get the data from the image.
        idat = context.getImageData(0, ixRow, width, 1);
        ix = 0;
        // We consume 4 elements per iteration, because there are 4 elements
        // per pixel, and we code one character per pixel.  Adjust maxIx to
        // account for that.
        maxIx = idat.data.length - 4;
        while (ix < maxIx) {
          // Get the low three bits from red and blue, low 2 from green.
          r = (idat.data[ix++]) & 0x7;
          g = (idat.data[ix++]) & 0x3;
          b = (idat.data[ix++]) & 0x7;
          ix++; // skip alpha channel.
          // Shift the bits into place and combine into one char code.
          ch = r * 32 + g * 8 + b;

          if(isIE){
            ch = degibberishCharacter(ch, r, g, b);
          }
          // If we've reached the null, we're done.  The null is not part of the string.
          if (ch === 0) {
            break;
          }
          result += String.fromCharCode(ch);
        }
        // If we've reached the null, we're done.
        if (ch===0) {
          break;
        }
        // Otherwise, on to the next row.
        ixRow++;
      }
      // Return the results.
      resultCallback(result);
    };
    image.onerror = function() {
      errorCallback();
    };

    // Load the image.
    image.src = imageUrl;
  } // End of iToStr

  function strToByte8Array(str) {
    var hex = [];
    for (var i=0; i<str.length; i++) {
      hex.push(str.charCodeAt(i));
    }
    return hex;
  }


  return {
    iToStr: iToStr,

    base64Encode: base64Encode,

    rc4Encrypt: function (input, key) {
      return rc4Encrypt(input, key);
    },
    rc4DecryptWithString: function(str, keyStr) {
      return utf8Decode(rc4(base64Decode(str), strToByte8Array(keyStr)));
    },
    obfuscate: function(node){
      obfuscate(node);
    },
    isObfuscationClass: function(className) {
      return isObfuscationClass(className);
    }
  };
}();
/*
 * =======================================================================
 * KindleHostDeviceDetector
 *
 * Detect device using User Agent
 *
 * Revision: : $
 * Last Changed: : 11:42 AM $
 * Changed By: mjzheng $
 *
 * Copyright (c) 2010-2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * =======================================================================
 */
var KindleHostDeviceDetector = function() {
  var ClientName = {
    KCR:   "K4W",
    Metro: "KW8"
  };

  var DeviceType = {
    KCR:   "A2CTZ977SKFQZY",
    Metro: "A3C2X3KG4GJCOD"
  };

  /**
   * Returns true if the device is iPad
   */
  function isiPad() {
    return (navigator.platform.indexOf("iPad") !== -1);
  }

  function isWindows(){
    return navigator.platform.indexOf('Win') !== -1;
  }

  function hasIpad1Perf(isiOSAppMode) {
    var maxresult=0;
    var minresult=1000;
    var average;
    var sum=0;
    var result;

    // threshold depends on appmode vs safari (safari is about 2x)
    var IPAD1_THRESHOLD_SAFARI=100;
    var IPAD1_THRESHOLD_APPMODE=200;
    var NUM_RUNS=3;

    for (i=0;i<NUM_RUNS;i++) {
      result = SunSpiderBenchmark.get3DSpeed();
      if (result > maxresult) {
        maxresult=result;
      } else if (result < minresult) {
        minresult=result;
      }
      sum += result;
    }
    average = sum/NUM_RUNS;

    // #ifdef DEBUG
//        KindleDebug.log("Results: (sum, avg, min, max) = (" + sum +","+average+","+minresult+","+maxresult+")");
    // #endif

    if ((average >= IPAD1_THRESHOLD_APPMODE) && isiOSAppMode) {
      return true;
    }
    if ((average >= IPAD1_THRESHOLD_SAFARI) && !isiOSAppMode) {
      return true;
    }
    return false;
  }

  /**
   * Returns true if the device is an iPad1
   */
  function isiPad1() {
    return isiPad() && hasIpad1Perf(isiOSAppMode());
  }

  /**
   * Returns true if the device is iPhone or iPod
   */
  function isiPhone() {
    return ((navigator.platform.indexOf("iPhone") !== -1) || (navigator.platform.indexOf("iPod") !== -1));
  }

  /**
   * Returns true if the device is iPad/iPhone/iPod
   * NOTE: For initial launch we also call Playbook iOS for now (to get touch UX) & Otter too
   */
  function isiOS() {
    return isiPad() || isiPhone() || isPlayBook() || isCloud9();
  }

  /**
   * Returns true if the device is iPhone or iPod running iOS major version 4
   */
  function isiOS_4x() {
    // TODO use capabilities
    return ((isiPad() || isiPhone()) && navigator.userAgent.indexOf("OS 4") !== -1);
  }

  /**
   * Returns true if the device is iPhone or iPod running iOS major version 5
   */
  function isiOS_5x() {
    // TODO use capabilities
    return ((isiPad() || isiPhone()) && navigator.userAgent.indexOf("OS 5") !== -1);
  }

  function isAndroid(){
    // TODO use capabilities
    return (navigator.userAgent.indexOf("Android") !== -1);
  }

  //currently, android 5.0 and 5.1
  function isAndroid_Lollipop() {
    // TODO use capabilities
    return (navigator.userAgent.indexOf("Android 5") !== -1);
  }

  //android 4.4.x
  function isAndroid_KitKat() {
    // TODO use capabilities
    return (navigator.userAgent.indexOf("Android 4.4") !== -1);
  }

  //android 4.1-4.3
  function isAndroid_JellyBean() {
    // TODO use capabilities
    return (navigator.userAgent.search(/Android 4.[1-3]/) !== -1);
  }

  /**
   * there is no reliable way to detect stock browser, some solutions (like: http://stackoverflow.com/a/19915132/1157490) check chrome version in UA and thatâ€™s not reliable.
   * but like web view, â€œmostâ€ stock browsers have â€œVersion/X.xâ€ in UA. https://developer.chrome.com/multidevice/user-agent#webview_user_agent
   */
  function isStockBrowser() {
    // TODO use capabilities
    return isAndroid() && (navigator.userAgent.indexOf('Mozilla') !== -1) && (navigator.userAgent.indexOf('AppleWebKit') !== -1) && !isChrome() && (navigator.userAgent.search(/Version\/[0-9]+\.[0-9]+/) !== -1);
  }

  /**
   * Returns true if the browser is Firefox.
   */
  function isFirefox(){
    // On IE11, Microsoft has a compatibility view list that makes IE to pretend itself as Firefox for read.amazon.com
    // with UA string: Mozilla/5.0 (Windows NT 6.1; Win64; x64; Trident/7.0; rv:11.0) like Gecko/20100101 Firefox/22.0
    // See this link in IE. https://iecvlist.microsoft.com/IE11/1375395130872/iecompatviewlist.xml
    return (navigator.userAgent.indexOf("Firefox") !== -1) && (navigator.userAgent.indexOf('Trident') < 0);
  }

  /**
   * Returns true if the browser is Safari.
   * Note: will return false for Safari on iOS running in App Mode; check isiOSAppMode() independently if needed.
   *
   * @param {Number} minVersion (optional) Return false if the version of Safari is less than this value.
   */
  function isSafari(minVersion) {
    // Chrome claims 'Safari' in its UA string; the below regex should only match on a "genuine" Safari UA string.
    // See http://www.useragentstring.com/pages/Safari/ for examples.
    var match = navigator.userAgent.match(/Version\/(\d+\.\d+)(?:\.\d+)*(?: Mobile\/\S+)? Safari/);
    if (!match) {
      return false;   // not genuine Safari browser
    }
    if (!minVersion) {
      return true;    // genuine Safari browser, without minVersion requirement
    }
    // test whether genuine Safari browser's version number >= minVersion
    return (Number(match[1]) >= Number(minVersion));
  }

  /**
   * Returns true if the browser is Cloud9 (i.e. Otter).
   */
  function isCloud9() {
    return (navigator.userAgent.indexOf('Cloud9') !== -1);
  }

  /**
   * Returns true if the browser is running in Microsoft Metro application.
   */
  function isMetro() {
    return (navigator.userAgent.indexOf('MSAppHost') !== -1);
  }


  /**
   * Returns true if WebSQLDb is supported.
   */
  function isWebSQLSupported(){
    return !!window['openDatabase'];
  }

  /**
   * Returns true if IndexedDB is supported.
   */
  function isIndexedDBSupported(){
    //Uncomment the IE indexedDB when we get it working.
    return !!window['mozIndexedDB'] || !!window['webkitIndexedDB'] || !!window['msIndexedDB'] || !!window['indexedDB'];
  }

  /**
   * Returns true if the browser is Chrome.
   */
  function isChrome() {
    return window.chrome && !isMSEdge();
  } // End of isChrome

  /**
   * Detect whether the host device is online
   * @return true if device is online
   */
  function isOnline(){
    // This property does not necessarily indicate that we can get to the internet. When false, it does indicate
    // that we definitely can not get to the internet. When true, it means that it is NOT true that we *definitely*
    // can not get to the internet. Maybe we can, maybe we can't.
    return navigator.onLine;
  }

  /**
   * Detect network availability.
   * Note: This function expects http://read.amazon.com/ping to exist.
   * @return Promise that resolves if connected, rejects if fails or timeout.
   */
  function isNetworkAvailable() {
    // --------------------------------------------------------------------
    // PLEASE NOTE!!!
    // This function should be superseded by the "network online detector".
    // --------------------------------------------------------------------
    if (!isOnline()) {
      // isOnline 'false' is sufficient to return false.
      return new jQuery.Deferred().reject().promise();
    }

    // If we get here, we're going to hit the ping URL to test network availability.
    var dfd = $.ajax({
      url: "/ping",
      error: function() {
        dfd.reject();
      },
      timeout: 5000
    });

    return dfd.promise();
  }

  /**
   * Detect network availability.
   * Note: This function expects http://read.amazon.com/ping to exist.
   * @return true if successful
   */
  function isNetworkAvailableSync() {
    // -----------------------------------------------------------------------------------------------------------
    // PLEASE NOTE!!!
    // This function should be superseded by the "network online detector". This is a temporary fix for CASC-2004.
    // -----------------------------------------------------------------------------------------------------------
    if (!isOnline()) {
      // isOnline 'false' is sufficient to return false.
      return false;
    }

    // If we get here, we're going to hit the ping URL to test network availability.
    var avail = true;
    $.ajax({
      url: "/ping",
      error: function() {
        avail = false;
      },
      timeout: 50,
      async: false  // Must be a synchronous call ($.ajax.async default is true)
    });
    return avail;
  }

  /**
   * Detect whether the host device is IE
   */
  function isIE(){
    // starting from IE11, the user agent doen't have MSIE in it any more.
    // IE Edge does not have Trident, it instead has the same UA string as Chrome with Edge appended to the end of it
    return (navigator.userAgent.indexOf('MSIE') !== -1) || (navigator.userAgent.indexOf('Trident') !== -1);
  }

  /**
   * Detect whether the host device is IE 10
   */
  function isIE10() {
    return isIE() && navigator.userAgent.indexOf('Trident/6.0') !== -1;
  }

  /**
   * Detect whether the host device is IE 11
   */
  function isIE11() {
    // KCR is running in IE10-Compatible mode in IE11, so navigator.userAgent reports
    // "MSIE 10" instead of "MSIE 11". To tell whether we are on IE10 or IE11, we need
    // to check whether the userAgent reports Trident 7.0/8.0 which is used in IE11 in comparison to Trident 6.0 for IE10.
    return isIE() && (navigator.userAgent.indexOf('Trident/7.0') !== -1 || navigator.userAgent.indexOf('Trident/8.0') !== -1);
  }

  /**
   * Detect whether the host device is Microsoft Edge
   */
  function isMSEdge() {
    //IE edge reports the same user agent string as that for chrome with Edge/version appended at the end of it
    return (navigator.userAgent.indexOf('Chrome') !== -1)  && (navigator.userAgent.indexOf('Safari') !== -1) && (navigator.userAgent.indexOf('Edge') !== -1);
  }

  /**
   * Returns true if the app is installed or launched as an app in any platform.
   */
  function isInAppMode() {
    return isiOSAppMode() || isChromeApp();
  } // End of isInAppMode

  /**
   * Returns true if the app is installed or launched as an app in iOS
   */
  function isiOSAppMode() {
    return "standalone" in navigator && navigator.standalone;
  }

  /**
   * Returns true if the app is installed as a Chrome app.  We check the top window
   * because this may be called within the library or reader iframes, which consider themselves
   * their own windows, which are not individually installed in app form.
   */
  function isChromeApp() {
    return window.chrome && window.chrome.app && window.chrome.app.isInstalled;
  }

  /**
   * Returns true if the userAgent string identifies the device as a Playbook
   */
  function isPlayBook() {
    return (navigator.userAgent.indexOf("PlayBook") !== -1);
  }

  function getDevicePlatform(){
    var result;

    if(isiPad()){
      result = 'iPad';
    }
    else if(isiPhone()){
      result = 'iPhone';
    }
    else if(isPlayBook()){
      result = 'playBook';
    }
    else if (isCloud9()) {
      result='otter';
    }
    else if (isMetro()) {
      result='metro';
    }
    else{
      result = 'desktop';
    }

    return result;
  }

  function hasCanvasPerformanceProblem() {
    return (isiPad1() || isIE());
  }

  /*
   * Device Type
   * -Set to KCR or Metro device type
   */
  function getDeviceType() {
    if(isMetro()) {
      return DeviceType.Metro;
    } else {
      return DeviceType.KCR;
    }
  }

  /*
   * Client name K4W for KCR or KW8 for metro
   */

  function getClientName() {
    if(isMetro()) {
      return ClientName.Metro;
    } else {
      return ClientName.KCR;
    }
  }

  /**
   * Detect whether cookie has been enabled
   * @return true if cookie has been enabled
   */
  function isCookieEnabled() {
    return navigator.cookieEnabled;
  }

  /**
   * Returns true if MSPointer (IE10+ and Metro) are supported
   */
  function isMSPointerEnabled() {
    return !!window.navigator.msPointerEnabled;
  }


  /**
   * @return true if device supports touch
   */
  function isTouchDevice() {
    var has =
      isiOS() ||
      isMSPointerEnabled() ||
      isPlayBook();

    return has;
  }

  /**
   * Returns true if localStorage is not empty or we can put "testLocalStorage" in localStorage
   * @return true if localStorage appears to be enabled
   */
  function isLocalStorageEnabled() {
    false;
  }

  /**
   * Returns true if the device is known to exhibit a problem where setting an <img>'s src attribute to
   * a data-uri: or blob: URL will sometimes result in the element's onload and onerror event handlers never
   * being fired, even when the image data can be confirmed to have been loaded and renders onscreen.
   */
  function hasMissingImgOnLoadProblem() {
    return isSafari() || isiOSAppMode() || isFirefox();
  }

  /**
   * Returns true if the device is known to exhibit a problem where an <img> with its src attribute properly set
   * will fail to be rendered to the screen, even when the image data is known to be loaded properly.
   */
  function hasImageRenderingProblem() {
    return isSafari() || isiOSAppMode();
  }

  /**
   * Returns true if the device is a hand-held tablet (of any brand).
   * @return {Boolean} true if the device is a tablet, or false otherwise
   */
  function isTablet() {
    return isiPad() || isMetro();
  }

  /**
   * Returns the major version of OS
   */
  function getOSMajorVersion() {
    var osMajorVersion = -1;
    if (isiOS()) {
      var versionInfo = (navigator.userAgent).match(/OS (\d+)_/);
      osMajorVersion = versionInfo[1];
    }
    return osMajorVersion;
  }

  /**
   * Returns the minor version of OS
   */
  function getOSMinorVersion() {
    var osMinorVersion = -1;
    if (isiOS()) {
      var versionInfo = (navigator.userAgent).match(/OS (\d+)_(\d+_?(\d+)?)/);
      osMinorVersion = versionInfo[2];
    }
    return osMinorVersion;
  }

  return {
    isiOS: isiOS,
    isiPad: isiPad,
    isiPhone: isiPhone,
    isiOS_4x: isiOS_4x,
    isiOS_5x: isiOS_5x,
    isFirefox: isFirefox,
    isSafari: isSafari,
    isMetro : isMetro,
    isIE: isIE,
    isIE10: isIE10,
    isIE11: isIE11,
    isMSEdge: isMSEdge,
    isPlayBook: isPlayBook,
    isCloud9: isCloud9,
    isTablet: isTablet,
    isOnline: isOnline,
    isNetworkAvailable: isNetworkAvailable,
    isNetworkAvailableSync: isNetworkAvailableSync,
    isChrome: isChrome,
    isiOSAppMode: isiOSAppMode,
    isInAppMode: isInAppMode,
    isCookieEnabled: isCookieEnabled,
    isLocalStorageEnabled: isLocalStorageEnabled,
    isWebSQLSupported: isWebSQLSupported,
    isIndexedDBSupported: isIndexedDBSupported,
    isMSPointerEnabled : isMSPointerEnabled,
    isTouchDevice: isTouchDevice,
    getDevicePlatform : getDevicePlatform,
    hasCanvasPerformanceProblem : hasCanvasPerformanceProblem,
    hasMissingImgOnLoadProblem : hasMissingImgOnLoadProblem,
    hasImageRenderingProblem : hasImageRenderingProblem,
    getDeviceType : getDeviceType,
    getClientName : getClientName,
    getOSMajorVersion: getOSMajorVersion,
    getOSMinorVersion: getOSMinorVersion,
    isAndroid: isAndroid,
    isAndroid_Lollipop: isAndroid_Lollipop,
    isAndroid_KitKat: isAndroid_KitKat,
    isAndroid_JellyBean: isAndroid_JellyBean,
    isStockBrowser: isStockBrowser,
    isWindows: isWindows
  };

}();
/*
 * =======================================================================
 * Kindle module for handling metrics
 *
 * Revision: $Revision:
 * Last Changed: $Date:
 * Changed By: $Author: maryga $
 *
 * Copyright (c) 2010-2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * =======================================================================
 */
var KindleMetricsProfiler = function (name) {
  /**
   * Get the current time in milliseconds
   * @return The value of currentTime
   */
  function getTimestamp() {
    return (new Date()).getTime();
  }

  /**
   * Calculate time to load based on start and end times
   * @param startTime The time when the request started
   * @param endTime The time the request finished
   * @return the calculated elapsed time in milliseconds.
   */
  function calculateElapseTime(runs) {
    var elapsedTime = 0;
    for (var idx=0; idx<runs.length; idx += 1) {
      elapsedTime += (runs[idx].end - runs[idx].start);
    }
    return elapsedTime;
  }



  /**
   * Instantiate our metrics object
   */
  var metrics = {};

  /**
   * Set name to caller-specified
   */
  metrics.name = name;

  /**
   * Initialize our counters.
   */
  metrics.counters = null;

  /**
   * Initialize our sub-timers.
   */
  metrics.subTimers = null;

  /**
   * The runs that this metric has recorded.
   */
  metrics.runs = [{start: getTimestamp(), end: null}];

  /**
   * Finishes the timer.
   */
  metrics.endTimer = function() {
    var currentRun = this.runs[this.runs.length-1];
    if (currentRun.end === null) {
      currentRun.end = getTimestamp();
    }
  };

  /**
   * Add a counter to this metrics object.
   * @param counter the name of the counter to add.
   * @param units the number of units to add to the counter.s
   */
  metrics.addCount = function(counter, units) {
    if (this.counters === null) {
      this.counters = {};
    }

    if (this.counters[counter] === undefined) {
      this.counters[counter] = units;
    } else {
      this.counters[counter] += units;
    }
  };

  metrics.createSubTimer = function(name) {
    if (this.subTimers === null) {
      this.subTimers = {};
    }
    if (this.subTimers[name] === undefined) {
      this.subTimers[name] = KindleMetricsProfiler(name);
    } else {
      this.subTimers[name].runs.push({start: getTimestamp(), end: null});
    }
    return this.subTimers[name];
  };

  /**
   * This function logs all the information in this counter to the console.
   */
  metrics.log = function() {
    var totalElapsedTime = calculateElapseTime(this.runs);
    this.logAsPercentageOfTime("", totalElapsedTime);
  };

  metrics.logAsPercentageOfTime = function(prefix, totalTime) {
    var name = prefix + ":" + this.name;
    var counter;
    var elapsedTime = calculateElapseTime(this.runs);
    var percent = totalTime ? elapsedTime / totalTime * 100 : 100;


    for(counter in this.counters) {
    }
    for(counter in this.subTimers) {
      this.subTimers[counter].logAsPercentageOfTime(name, totalTime);
    }
  };

  return metrics;
};

/*
 * =======================================================================
 * KindleUserLocationConverter
 *
 * Converts between "Location" as displayed to the user, and
 * "Mobi Position" or "Topaz Position", as used internally.
 *
 * Revision: $Revision: 56819 $
 * Last Changed: $Date: 2011-03-23 13:13:31 -0700 (Wed, 23 Mar 2011) $
 * Changed By: $Author: krneta $
 *
 * Copyright (c) 2010-2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * =======================================================================
 */

var KindleUserLocationConverter;
KindleUserLocationConverter = function() {
  var MOBI_FLAVOR = 'mobi';
  var TOPAZ_FLAVOR = 'topaz';

  // This is copied from KRF.
  var TOPAZ_USER_LOCATION_TRANSLATION_FACTOR = 3;

  /*
  * This function returns a converter for changing Locations to
  * Mobi 7 positions and vice-versa.
  */
  function mobiLocationConverter() {
    return {

      /* Convert a Mobi 7 position to a user Location.
       * @param {Number} position The Mobi 7 position.
       * @return {Deferred} A promise on the User visible Location.
       *   Note that the promise is already resolved.
       */
      locationFromPosition: function(position) {
        // Copied from KRF CMBPUserLocation.h
        return $.Deferred().resolve(Math.floor(position * 2 / 300 + 1));
      },

      /* Convert a user Location to a Mobi 7 position.
       * @param {Number} position The user Location.
       * @return {Deferred} A promise on the Mobi 7 position.
       *   Note that the promise is already resolved.
       */
      positionFromLocation: function(location) {
        // Copied from KRF CMBPUserLocation.h
        location *= 100;
        if (location < 100) {
          location = 100;
        }
        return  $.Deferred().resolve(Math.floor(((location - 100) * 3) / 2));
      },

      /* To ask the object what kind of conversions it does.
       */
      flavor: function() {
        return MOBI_FLAVOR;
      }
    };
  }

  /*
   * This function returns a converter for changing Locations to
   * Topaz positions and vice-versa.
   */
  function topazLocationConverter() {
    return {

      /* Convert a Topaz position to a user Location.
       * @param {Number} position The Topaz position.
       * @return {Deferred} A promise on the User visible Location.
       *   Note that the promise is already resolved.
       */
      locationFromPosition: function(position) {
        // Copied from KRF CTPZUserLocation.h
        return $.Deferred().resolve(Math.floor(((position * TOPAZ_USER_LOCATION_TRANSLATION_FACTOR) + 100) / 100));
      },

      /* Convert a user Location to a Topaz position.
       * @param {Number} position The user Location.
       * @return {Deferred} A promise on the Topaz position.
       *   Note that the promise is already resolved.
       */
      positionFromLocation: function(location) {
        // Copied from KRF CTPZUserLocation.h

        // real user location are float...but it doesn't seem we never user the number after the decimal part
        location *= 100;

        if (location < 100) {
          // protection against negative numbers
          ASSERT(0);
          location = 100;
        }
        return $.Deferred().resolve(Math.floor((location - 100) / TOPAZ_USER_LOCATION_TRANSLATION_FACTOR));
      },

      /* To ask the object what kind of conversions it does.
       */
      flavor: function() {
        return TOPAZ_FLAVOR;
      }
    };
  }

  function mobi8LocationConverter(locationMapInfo) {
    var ORIGIN=1; // the first location is 1, not 0.
    var minPosition = locationMapInfo.minPosition;
    var maxPosition = locationMapInfo.maxPosition;
    var numLocations = locationMapInfo.locationsInfo.numOfLocations;
    var mapSize = locationMapInfo.locationsInfo.mapSize;
    var mapGetter = locationMapInfo.mapGetter;

    var mapBoundList = [];

    // For every location map in the cache, indexed by id, keep:
    //  - the deferred for the locationMap.  Once resolved, returns the value immediately.
    //  - the "time" it was put there, for lru purging.
    //  - if it is being fetched, keep a list of deferreds to be resolved with the locationMap
    //  The 20000 is pulled from the air, but is enough locations for most books.  Could be tuned.
    var mapCache = {}, cacheEntrySeq = 1, MAX_CACHE=Math.max(5, Math.floor(20000 / mapSize));

    /**
     * Given a location map id, provide that location map.  Keeps a cache for better performance,
     * and as every map is read, updates the list of known locations, for quicker lookup in the future.
     * @param {Number} id The id of the desired location map.
     * @return {Deferred} A promise on the location map.
     */
    function getMapById(id) {
      // If it is cached, just return it.
      if (mapCache[id]) {
        return mapCache[id].deferred;
      }
      var dfd, cacheId, oldestId, oldestSeq;
      dfd = mapGetter(id);
      dfd.done(cacheMapBounds);
      // If the read fails, remove the failing location map deferred???
      cacheEntrySeq++;
      mapCache[id] = {deferred: dfd, cacheEntrySeq: cacheEntrySeq};
      // remove stale entries.
      if (cacheEntrySeq > MAX_CACHE) {
        // Note that if we ever overflow the largest integer, such that (cacheEntrySeq === ++cacheEntrySeq), this will stop working.
        oldestSeq = cacheEntrySeq;
        for (cacheId in mapCache) {
          if (mapCache[cacheId].cacheEntrySeq < oldestSeq) {
            oldestId = cacheId;
            oldestSeq = mapCache[cacheId].cacheEntrySeq;
          }
        }
        if (oldestSeq !== cacheEntrySeq) {
          delete mapCache[oldestId];
        }
      }
      return dfd;
    }

    /**
     * Given a location map, record information about lowest and highest positions.  From a map, we
     * know for sure its lowest position, and the previous map's highest.  And we have a lower bound
     * on the highest position (from highest location).  Note that the actual highest position is
     * one less than the lowest position of the next location map.
     * @param {Object} map A location map.
     */
    function cacheMapBounds(map) {
      var id = map.metadata.id;
      // If there is no bound list entry at all for this map, or if we don't have the start position...
      if (!mapBoundList[id] || !mapBoundList[id].firstPos) {
        mapBoundList[id] = mapBoundList[id] || {};
        // Get the positions that are known to be in this location map.
        var positions = getPositionRangeForMap(map);
        // If we haven't seen the next id, we won't have any last position information, so take what we
        //  can get from this location map.
        if (!mapBoundList[id].lastPos) {
          mapBoundList[id].lastPos = positions.lastPos;
        }
        // If we haven't seen this id before, save its first position, and also the last position
        //  for any previous location map.
        if (!mapBoundList[id].firstPos) {
          mapBoundList[id].firstPos = positions.firstPos;
          if (id > 0) {
            mapBoundList[id-1] = mapBoundList[id-1] || {};
            mapBoundList[id-1].lastPos = positions.firstPos-1;
          }
        }
      }
    }

    /**
     * Given a location map, return the lowest and highest positions in the map.
     * @param {Object} map A location map.
     * @return {Object} An object with properties firstPos and lastPos.
     */
    function getPositionRangeForMap(map) {
      var firstPos, lastPos, id = map.metadata.id;
      try {
        if ($.isArray(map.locations)) {
          // New format
          firstPos = map.locations[0];
          lastPos = map.locations[map.locations.length-1];
        } else {
          // Old format
          firstPos = map.locations[(id * mapSize)+ORIGIN];
          lastPos = map.locations[Math.min(((id+1) * mapSize)+ORIGIN - 1, numLocations)];
        }
      } catch (e) {
        // Slow fallback.  Can't be needed for new format.
        firstPos = Number.MAX_VALUE;
        lastPos = -1;
        for (var loc in map.locations) {
          if (map.locations.hasOwnProperty(loc) && map.locations[loc]) {
            firstPos = Math.min(map.locations[loc], firstPos);
            lastPos = Math.max(map.locations[loc], lastPos);
          }
        }
      }
      return {firstPos: firstPos, lastPos: lastPos};
    }

    /**
     * Given a location map, return the lowest and highest indexes in the map.
     * @param {Object} map A location map.
     * @return {Object} An object with properties firstIx, lastIx, and offset.
     *   (a given location is at (index + offset); for a hash offset is 0, for an
     *   array, offset is (id * mapSize) + ORIGIN to adjust for 1-based locations.)
     */
    function getLocationIxRangeForMap(map) {
      var firstIx, lastIx, id = map.metadata.id;
      try {
        if ($.isArray(map.locations)) {
          // New format
          firstIx = 0;
          lastIx = map.locations.length-1;
          offset = (id * mapSize)+ORIGIN;
        } else {
          // Old format
          firstIx = (id * mapSize)+ORIGIN;
          lastIx = Math.min(((id+1) * mapSize)+ORIGIN - 1, numLocations);
          offset = 0;
        }
      } catch (e) {
        // Slow fallback.  Can't be needed for new format.
        firstIx = Number.MAX_VALUE;
        lastIx = -1;
        for (var loc in map.locations) {
          if (map.locations.hasOwnProperty(loc) && map.locations[loc]) {
            firstIx = Math.min(loc, firstIx);
            lastIx = Math.max(loc, lastIx);
          }
        }
      }
      return {firstIx: firstIx, lastIx: lastIx, offset: offset};
    }

    /**
     * Given a location, provide the location map containing that location.  This is
     * just division.
     * @param {Number} location The location for which the map is needed.
     * @return {Deferred} A promise on the location map.
     */
    function mapForLocation(location) {
      var mapFrag = Math.floor((location-ORIGIN) / mapSize);
      return getMapById(mapFrag);
    }

    /**
     * Given a position, provide the location map containing that position.  This is
     * possibly expensive, if we've not seen the map containing that position, we'll
     * have to search for it.
     * @param {Number} location The location for which the map is needed.
     * @return {Deferred} A promise on the location map.
     */
    function mapForPosition(position) {
      function bsearchForLocationMap(lo, hi) {
        function onGotMap(map) {
          var mapBounds = mapBoundList[map.metadata.id];
          if (mapBounds.firstPos > position) {
            // position is definitely below mid.
            bsearchForLocationMap(lo, mid-1);
          } else if (mapBounds.lastPos >= position) {
            // position is definitely in mid.
            dfd.resolve(map);
          } else {
            // position may be in the last part of mid, or else above it.
            bsearchForLocationMap(mid, hi);
          }
        } // onGotMap

        // If already narrowed down, use that value.
        if (lo === hi) {
          getMapById(lo).then(dfd.resolve, dfd.reject);
          return;
        }
        var mid = Math.floor((lo + hi) / 2);
        // Because we have slightly better knowledge about the lower bounds of a location map, favor the
        //  higher id'd location map out of two.
        if (mid === lo && hi === lo + 1) {
          mid = hi;
        }
        getMapById(mid).done(onGotMap).fail(dfd.reject);
      } // bsearchForLocationMap

      // See if we already know where the position is.  If not, try to narrow down range of location maps.
      var ix, lo, hi;
      lo = 0;
      hi = Math.floor((numLocations-ORIGIN)/mapSize);  // if mapSize=1000, 1999->1, 2000->1, 2001->2
      // Look in whatever mapBounds we may have found so far.
      for (ix=0; ix<mapBoundList.length; ix++) {
        if (mapBoundList[ix]) {
          if (mapBoundList[ix].firstPos) {
            // Tests with both a firstPos and a lastPos.  The lastPos may be low,if we have not yet
            //  seen the location map above this one (whose first position nails down this last position).
            if (mapBoundList[ix].firstPos <= position &&
              mapBoundList[ix].lastPos >= position) {
              return getMapById(ix);
            }
            // Didn't find the location map (yet), but adjust the search bounds.
            if (mapBoundList[ix].firstPos > position) {
              // Definitely below here.
              hi = ix-1;
              break;
            } else {
              lo = ix;
            }
          } else if (mapBoundList[ix].lastPos) {
            // Tests with a lastPos only.  With only a lastPos, the lastPos is exact, since it came
            //  from the first position of the next location map.  We can have a lastPos but no firstPos
            //  if we haven't seen this corresponding locationMap, but have seen the next one.
            if (mapBoundList[ix].lastPos === position) {
              // we got lucky and hit equality with the end!
              return getMapById(ix);
            }
            if (mapBoundList[ix].lastPos > position) {
              // In or below this map.
              hi = ix;
              break;
            } else {
              // Definitely above this location map.
              lo = ix+1;
            }
          }
        }
      }

      // Binary search for location map containing this position.
      var dfd = new jQuery.Deferred();
      bsearchForLocationMap(lo, hi);
      return dfd.promise();
    } // End of mapForPosition

    /**
     * Given a Mobi8 position, find the corresponding user visible location.
     * @param {Number} position The Mobi8 position.
     * @return {Deferred} A promise on the location.
     */
    function locationFromPosition(position) {
      function onGotMap(map) {
        function bsearch(lo, hi, ary) {
          // We need to find the greatest index such that the value is <= position
          var mid = Math.floor((lo + hi) / 2);

          if(ary[mid] === position) {
            //Found exact match of position in location map. mid is it.
            dfd.resolve(mid+locationIxs.offset);
          } else if (ary[mid] > position) {
            // Too high, search lower half.
            bsearch(lo, mid-1, ary);
          } else {
            // Maybe too low.  If there is nothing above mid, mid is it.  If there is
            //  something above mid, and its value is higher, mid is it.  Otherwise,
            //  mid is too low, search upper half.
            if (mid === hi || ary[mid+1] > position) {
              // mid is it.
              dfd.resolve(mid+locationIxs.offset);
            } else {
              // Too low, search upper half.
              bsearch(mid+1, hi, ary);
            }
          }
        }
        var locationIxs = getLocationIxRangeForMap(map);
        bsearch(locationIxs.firstIx, locationIxs.lastIx, map.locations);
      }
      function noMap() {
        // Couldn't get the map.  Interpolate.
        if (position <= minPosition) {
          dfd.resolve(ORIGIN);
        } else if (position >= maxPosition) {
          dfd.resolve(numLocations-1+ORIGIN);
        } else {
          var p = (position - minPosition) / (maxPosition - minPosition); // fraction of entire book
          dfd.resolve(Math.floor(p * (numLocations - ORIGIN) + ORIGIN));
        }
      }
      var dfd = new jQuery.Deferred();
      mapForPosition(position).done(onGotMap).fail(noMap);
      return dfd;
    }

    /**
     * Given a user visible location, return the corresponding Mobi8 position.
     * @param {Number} location The user visible location.
     * @return {Deferred} A promise on the position.
     */
    function positionFromLocation(location) {
      function onGotMap(map) {
        var ix, pos;
        try {
          if ($.isArray(map.locations)) {
            // New format.
            ix = (location-ORIGIN) % mapSize;
            pos = map.locations[ix];
          } else {
            // Old format.
            pos = map.locations[location];
          }
        } catch (e) {
          pos = 1;
        }
        dfd.resolve(pos);
      }
      function noMap() {
        // Couldn't get map.  Interpolate.
        if (location <= ORIGIN) {
          dfd.resolve(minPosition);
        } else if (location >= (numLocations-1+ORIGIN)) {
          dfd.resolve(maxPosition);
        } else {
          p = (location - ORIGIN) / (numLocations);
          dfd.resolve(Math.floor(p * (maxPosition - minPosition) + minPosition));
        }
      }
      var dfd = new jQuery.Deferred();
      mapForLocation(location).done(onGotMap).fail(noMap);
      return dfd.promise();
    }

    return {
      locationFromPosition: locationFromPosition,
      positionFromLocation: positionFromLocation
    };
  }


  return {

    MOBI_FLAVOR: MOBI_FLAVOR,

    TOPAZ_FLAVOR: TOPAZ_FLAVOR,

    mobiLocationConverter   : mobiLocationConverter,
    topazLocationConverter  : topazLocationConverter,

    /**
     * Gets location converter based on book type
     * @param bookType The type (mobi/topaz) of the book
     * @return A location converter corresponding to the book type
     */
    getLocationConverter    : function(bookType, locationMapInfo){
      if (bookType === 'topaz'){
        return topazLocationConverter();
      } if (bookType === 'mobi8') {
        return mobi8LocationConverter(locationMapInfo);
      } else {
        return mobiLocationConverter();
      }
    }
  };
}();
/*
 * =======================================================================
 * KindleBookPieceManagerFactory
 *
 * This class manages fetching, caching, and pre-fetching book pieces.
 *
 * Revision: $Revision: $
 * Last Changed: $Date: $
 * Changed By: $Author: $
 *
 * Copyright (c) 2010-2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * =======================================================================
 */

/**
 * A factory for BookPieceManagers.  A BookPieceManager manages fetching, storing,
 * and caching pieces of the book, specifically skeleton, fragment, or glyph chunk pieces.
 *
 * @param {Object} spec An object containing the information needed to create the manager:
 *  type: one of 'skeleton', 'fragment', or 'glyph'
 *  netGetter: a function(list, successCB, errorCB) to get the piece from the network.
 *  dbGetter: a function(list, successCB, errorCB) to get the pieces from the database.
 *  dbPutter: a function(pieces, successCB, errorCB) to put the pieces into the database.
 *  downloader: an object with pauseReadAhead, resumeReadAhead, and removeIdFromReadAhead functions.
 */
function KindleBookPieceManagerFactory(spec) {

  var that = {};
  var _networkDfd;

  // What kind of part is this for?  What book?
  that.type = spec.type;
  that.cache = spec.cache;

  that.dbGetter = spec.dbGetter;
  that.dbPutter = spec.dbPutter;
  that.downloader = spec.downloader;
  that.netGetter = spec.netGetter;

  /**
   * Get the id from any sort of metadata.
   * @param {Object} data
   */
  function getIdFromMetadata(data) {
    if (data.fragmentMetadata !== undefined) {
      return data.fragmentMetadata.id;
    } else if (data.skeletonMetadata !== undefined) {
      return data.skeletonMetadata.id;
    } else if (data.glyphFragmentMetadata !== undefined) {
      return data.glyphFragmentMetadata.id;
    } else if (data.metadata !== undefined) {
      return data.metadata.id;
    }
  } // End of getIdFromMetadata

  /**
   * Get pieces of a file.  Try the database first, and then fill any gaps
   * from online.  Store network pieces in the database.
   * @param {Object} list The list of ids.
   * @param {Object} successCallback
   * @param {Object} errorCallback
   */
  that.getPieces = function(list, successCallback, errorCallback) {
    // If the list is a single item (skeleton), convert it into an array.
    if (Object.prototype.toString.call(list) !== '[object Array]') {
      list = [list];
    }
    var ids = list.slice(0);  // Copy array; we may want to diddle with it.
    var self = this;          // 'this' will have a different value in callbacks; save in closure.
    var remaining = 0;        // Number in list still remaining to be resolved.  So we can know when to resume read ahead.
    var nextId = Math.max.apply(Math, ids) + 1; // Where to start readahead, if we do.
    var retryCounts = [];     // List of ids that have been retried, so we can limit retries.

    /**
     * Handle a (possibly empty) list of pieces returned from the database.  If requested pieces werent'
     * found, submit a network request for the remainder.
     * @param {Object} pieces The list of pieces from the database.
     */
    function onDbSuccess(pieces) {
      var id;
      // Return any retrieved pieces.
      for (id in pieces) {
        successCallback(pieces[id]);
      }
      // Any missing? Submit net requests.
      var missing = [];
      var idIx;
      for (idIx=0; idIx<ids.length; idIx++) {
        id = ids[idIx];
        if (pieces[id] === undefined) {
          missing.push(id);
        }
      }
      ids = missing;
      if (missing.length > 0) {
        getFromNetwork(missing);
      }
    } // End of onDbSuccess
    /**
     * Handle error return from the database.  Defers to the network.
     * @param {Object} dbError
     */
    function onDbError(dbError) {
      // DB call failed; fall back to network
      if(!_networkDfd){
        _networkDfd = new jQuery.Deferred();
      }

      _networkDfd.done(
        function(){
          getFromNetwork(ids);
        }
      );
    } // End of onDbError
    /**
     * Handles successful return from the network.  The data will be one piece.
     * @param {Object} data One piece of data.
     */
    function onNetworkSuccess(data){
      // We use this to send the data back to the caller after the db write.  We
      // wait for that because we want to write compressed data.
      function dbWriteDone() {
        successCallback(data);
      }

      var id = getIdFromMetadata(data);
      // Store in database.
      if (self.cache) {
        var pieces = [];
        pieces[id] = data;
        self.dbPutter(pieces, dbWriteDone, dbWriteDone);

        // Manage read ahead.
        self.downloader.removeIdFromReadAhead(id);
      } else {
        // No database, so give to caller.
        successCallback(data);
      }
    } // End of onNetworkSuccess

    /**
     * Handles errors from the network.  Issues up to two retries.
     * @param {Object} jqXHR The jquery XHR object (possibly null).
     * @param {Object} error The error message.
     * @param {Object} ex The exception message, if any.
     * @param {Object} id The id of the failed request.
     */
    function onNetworkError(jqXHR, error, ex, idOrList) {
      var retryList;
      var retryCountId;
      // If we got back the id list, it was the getUrls call that failed.
      if (Object.prototype.toString.call(idOrList) === '[object Array]') {
        retryList = idOrList;
        retryCountId = 'list';
      } else {
        retryList = [idOrList];
        retryCountId = idOrList;
      }
      // If we have not retried twice already, do so now.

      retryCounts[retryCountId] = retryCounts[retryCountId]+1 || 1;
      if (retryCounts[retryCountId] <= 2) {
        // Retry.
        // TODO: We should consider a delay on the retry.  However, for the
        // failure to parse errors, it never seems necessary.
        self.netGetter(retryList, onNetworkSuccess, onNetworkError);
      }
      else {
        // Abandon hope
        errorCallback(jqXHR, error, ex);
      }
    } // End of onNetworkError

    /**
     * Submits a request to the network, when the pieces couldn't be retrieved from the database.
     * @param {Object} idList The needed pieces.
     */
    function getFromNetwork(idList) {
      remaining = idList.length;
      self.netGetter(idList, onNetworkSuccess, onNetworkError);
    } // End of getFromNetwork

    if (this.cache) {
      this.downloader.pauseReadAhead();
      // Submit the database request.  The callbacks will request the remainder from the network.
      this.dbGetter(list, onDbSuccess, onDbError);
    } else {
      getFromNetwork(list);
    }

  }; // End of getPieces


  /**
   * Signal piece manager that the network is reading to be used (startReading succeed)
   */
  that.setNetworkReady = function(){
    if(!_networkDfd){
      _networkDfd = new jQuery.Deferred();
    }
    _networkDfd.resolve();
  }; // End of startReadAhead

  return that;
}

/*
 * =======================================================================
 * KindleReaderBookInfoProvider
 *
 * This class is used by KReW BookViewer to read books from disk through jsonp.
 *
 * Copyright (c) 2010-2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * =======================================================================
 */
function KindleReaderBookInfoProviderFactory() {
  //Time to wait for a network response to a JSON call before giving up.
  var NETWORK_TIMEOUT = 30000;

  //Names for member names to getFileUrl query.
  var FRAGMENT_TYPE = "fragment";
  var GLYPH_TYPE = "glyph";
  var SKELETON_TYPE = "skeleton";
  var RESOURCE_TYPE = "resource";
  var LOCATIONMAP_TYPE = "locationMap";

  var IDS_QUERY = "Ids";
  var FRAGMENTIDS_QUERY = FRAGMENT_TYPE + IDS_QUERY;
  var GLYPHIDS_QUERY = GLYPH_TYPE + IDS_QUERY;
  var SKELETONIDS_QUERY = SKELETON_TYPE + IDS_QUERY;
  var RESOURCEIDS_QUERY = RESOURCE_TYPE + IDS_QUERY;
  var LOCATIONMAPIDS_QUERY = LOCATIONMAP_TYPE + IDS_QUERY;

  var _bookPath = null;
  var _startReadingInfo = null;
  var _metadata = null;
  var _manifest = null;
  var _manifestType = null;
  var _fragmap = null;
  var _skeletonBuilder = null;
  var _resourceUrlTranslator = null;
  var _chunkManagers = {};
  var _locationConverter = null;
  var _deDictionary = null;
  var _deJson = null;

  /**
   * This method submits JSONP requests to the URLs returned from a locator service call.
   * These are the pieces of the book, and they may need to be decrypted before they're usable.
   *
   * @param {Object} fileUrls A response object from getFileUrl, with one or more of skeletonUrls, fragmentUrls, glyphUrls
   * @param {Object} successCallback A function that handles successful request
   * @param {Object} errorCallback A function accepting three parameters: The jqXHR object (possibly null), a string describing the
   * type of error that occurred and an optional exception object, if one occurred.
   */
  function getFilesFromLocatorResponse(
    fileUrls,
    successCallback,
    errorCallback
  ) {
    /* Unfortunately, we need all of these, one for every flavor.  Ideally, the fields
     * would all be named similarly in similar structures, and there would be a 'type'
     * field to distinguish between types.
     */
    function getSkeleton(url, jcb, id) {
      function handleSkeletonData(data) {
        if (
          data.skeletonMetadata !== undefined &&
          data.skeletonMetadata.encryption === 1
        ) {
          var clear = KindleEncryption.rc4DecryptWithString(
            data.skeletonData,
            ""
          );
          data.skeletonData = clear;
          delete data.skeletonMetadata.encryption;
        }
        successCallback(data);
      }
      function handleSkeletonError(xOptions, error) {
        // Pass the failing ID back, so caller can know what to retry if they wish.
        errorCallback(null, error, null, id);
      }
      getJSONPData(url, handleSkeletonData, handleSkeletonError, jcb);
    }
    function getFragment(url, jcb, id) {
      function handleFragmentData(data) {
        if (
          data.fragmentMetadata !== undefined &&
          data.fragmentMetadata.encryption === 1
        ) {
          var clear = KindleEncryption.rc4DecryptWithString(
            data.fragmentData,
            ""
          );
          data.fragmentData = clear;
          delete data.fragmentMetadata.encryption;
        }
        successCallback(data);
      }
      function handleFragmentError(xOptions, error) {
        // Pass the failing ID back, so caller can know what to retry if they wish.
        errorCallback(null, error, null, id);
      }
      getJSONPData(url, handleFragmentData, handleFragmentError, jcb);
    }

    // glyph fragments are different, because they're not encrypted, but we need
    // to inject id into the returned metadata.
    function getGlyphFragment(url, jcb, id) {
      function handleGlyphData(data) {
        if (data.glyphFragmentMetadata !== undefined) {
          data.glyphFragmentMetadata.id = id;
        }
        successCallback(data);
      }
      function handleGlyphFragmentError(xOptions, error) {
        // Pass the failing ID back, so caller can know what to retry if they wish.
        errorCallback(null, error, null, id);
      }
      getJSONPData(url, handleGlyphData, handleGlyphFragmentError, jcb);
    } // End of handleGlyphFragment

    function getResource(url, jcb, id) {
      function handleResource(data) {
        successCallback(data);
      }
      function handleResourceError(xOptions, error) {
        // Pass the failing ID back, so caller can know what to retry if they wish.
        errorCallback(null, error, null, id);
      }
      getJSONPData(url, handleResource, handleResourceError, jcb);
    } // End of getResource

    function getLocationMap(url, jcb, id) {
      function handleLocationMap(data) {
        successCallback(data);
      }
      function handleLocationMapError(xOptions, error) {
        // Pass the failing ID back, so caller can know what to retry if they wish.
        errorCallback(null, error, null, id);
      }
      getJSONPData(url, handleLocationMap, handleLocationMapError, jcb);
    } // End of getLocationMap

    var ix;
    if (fileUrls.skeletonUrls) {
      var skeletonLoc = fileUrls.skeletonUrls;
      for (ix = 0; ix < skeletonLoc.length; ix++) {
        var skeletonJcb = "loadSkeleton" + skeletonLoc[ix].id;
        getSkeleton(skeletonLoc[ix].signedUrl, skeletonJcb, skeletonLoc[ix].id);
      }
    }
    if (fileUrls.fragmentUrls) {
      var fragmentLoc = fileUrls.fragmentUrls;
      for (ix = 0; ix < fragmentLoc.length; ix++) {
        var fragmentJcb = "loadFragment" + fragmentLoc[ix].id;
        getFragment(fragmentLoc[ix].signedUrl, fragmentJcb, fragmentLoc[ix].id);
      }
    }
    if (fileUrls.glyphUrls) {
      var glyphFragmentLoc = fileUrls.glyphUrls;
      for (ix = 0; ix < glyphFragmentLoc.length; ix++) {
        var glyphFragmentJcb = "loadGlyphFragment" + glyphFragmentLoc[ix].id;
        getGlyphFragment(
          glyphFragmentLoc[ix].signedUrl,
          glyphFragmentJcb,
          glyphFragmentLoc[ix].id
        );
      }
    }
    if (fileUrls.resourceUrls) {
      var resourceLoc = fileUrls.resourceUrls;
      for (ix = 0; ix < resourceLoc.length; ix++) {
        var resourceJcb = "loadResource" + resourceLoc[ix].id;
        getResource(resourceLoc[ix].signedUrl, resourceJcb, resourceLoc[ix].id);
      }
    }
    if (fileUrls.locationMapUrls) {
      var locationMapLoc = fileUrls.locationMapUrls;
      for (ix = 0; ix < locationMapLoc.length; ix++) {
        var locationJcb = "loadMobiLocationMap" + locationMapLoc[ix].id;
        getLocationMap(
          locationMapLoc[ix].signedUrl,
          locationJcb,
          locationMapLoc[ix].id
        );
      }
    }
  } // End of getFilesFromLocatorResponse

  /*
   * Used to make JSONp calls. Will need to move to the networking module.
   * @param {Object} url
   * @param {Object} successCallback handler for successful request
   * @param {Object} errorCallback a function accepting two parameters: xOptions and error ("error" or "timeout")
   * @param {Object} jsonpCB jsonp method
   */
  function getJSONPData(url, successCallback, errorCallback, jsonpCB) {
    var dfd = new jQuery.Deferred();

    $.ajax({
      url: url,
      dataType: "text",
      timeout: NETWORK_TIMEOUT,
      error: function(xOptions, error) {
        if (errorCallback) {
          errorCallback(xOptions, error);
        }
        dfd.reject(error);
      },
      success: function(text) {
        if (!text) {
          dfd.reject();
          return;
        }

        var start = text.indexOf("{");
        var end = text.lastIndexOf("}");
        if (start === -1 || end === -1) {
          dfd.reject();
          return;
        }

        var content = text.substring(start, end + 1);
        try {
          var json = JSON.parse(content);
          successCallback(json);
        } catch (e) {
          dfd.reject(e);
        }
        dfd.resolve();
      }
    });
    return dfd.promise();
  } // End of getJSONPData

  /**
   * Create and initialize the objects that manage file pieces.
   */
  function initializePieceManagers() {
    var fragmentSpec = {
      type: FRAGMENT_TYPE,
      netGetter: function(list, successCB, errorCB) {
        doGetBookPieces(FRAGMENTIDS_QUERY, list, successCB, errorCB);
      }
    };
    var skeletonSpec = {
      type: SKELETON_TYPE,
      netGetter: function(list, successCB, errorCB) {
        doGetBookPieces(SKELETONIDS_QUERY, list, successCB, errorCB);
      }
    };
    var glyphSpec = {
      type: GLYPH_TYPE,
      netGetter: function(list, successCB, errorCB) {
        doGetBookPieces(GLYPHIDS_QUERY, list, successCB, errorCB);
      }
    };
    var resourceSpec = {
      type: RESOURCE_TYPE,
      netGetter: function(list, successCB, errorCB) {
        doGetBookPieces(RESOURCEIDS_QUERY, list, successCB, errorCB);
      },
      isIdRequired: function(id) {
        var skeletonBuilder = getSkeletonBuilder();
        return id in skeletonBuilder.manifest.resourceManifest;
      }
    };
    var locationMapSpec = {
      type: LOCATIONMAP_TYPE,
      netGetter: function(list, successCB, errorCB) {
        doGetBookPieces(LOCATIONMAPIDS_QUERY, list, successCB, errorCB);
      }
    };

    _chunkManagers[FRAGMENT_TYPE] = KindleBookPieceManagerFactory(fragmentSpec);
    _chunkManagers[SKELETON_TYPE] = KindleBookPieceManagerFactory(skeletonSpec);
    _chunkManagers[GLYPH_TYPE] = KindleBookPieceManagerFactory(glyphSpec);
    _chunkManagers[RESOURCE_TYPE] = KindleBookPieceManagerFactory(resourceSpec);
    _chunkManagers[LOCATIONMAP_TYPE] = KindleBookPieceManagerFactory(
      locationMapSpec
    );
  }

  function loadMetadata(rejectDfd) {
    return getJSONPData(
      _startReadingInfo.metadataUrl,
      function(data) {
        var dict;
        if (data.cpr !== undefined) {
          dict = {};
          KindleCompression.lzAddStringsToDictionary(data.cpr, dict);
          KindleCompression.lzAddNumbersToDictionary(dict);
          _deDictionary = KindleCompression.lzGetDecompressionDictionary(dict);
        }
        if (data.cprJson !== undefined) {
          dict = {};
          KindleCompression.lzAddStringsToDictionary(data.cprJson, dict, 0x100);
          KindleCompression.lzAddNumbersToDictionary(dict, 0x100);
          _deJson = KindleCompression.lzGetDecompressionDictionary(dict);
        }
        _metadata = data;
      },
      function(xOptions, error) {
        rejectDfd.reject(error);
      },
      "loadMetadata"
    );
  }

  function loadManifest(rejectDfd, bookType) {
    var dfd = new jQuery.Deferred();

    if (bookType === "Mobi8") {
      getJSONPData(
        _startReadingInfo.manifestUrl,
        function(data) {
          dfd.resolve((_manifest = data));
        },
        function(xOptions, error) {
          rejectDfd(error);
        },
        "loadManifest"
      );
    } else {
      dfd.resolve((_manifest = {}));
    }

    return dfd.promise();
  }

  function loadFragmap(rejectDfd) {
    return getJSONPData(
      _startReadingInfo.fragmentMapUrl,
      function(data) {
        _fragmap = data;
      },
      function(xOptions, error) {
        rejectDfd.reject(error);
      },
      "loadFragmap"
    );
  }

  var sitbDeviceType = "AI8E87R86GTSD";

  //Android 2.X browser has cache control problem with AJAX
  //http://stackoverflow.com/questions/6090816/android-cors-requests-work-only-once
  function getRandomArg(url) {
    return (
      (url.indexOf("?") == -1 ? "?" : "&") + "randomValue=" + Math.random()
    );
  }

  function isOldAndroid() {
    var ua = navigator.userAgent;
    var index = ua.indexOf("Android");
    if (index >= 0) {
      var androidVersion = parseFloat(ua.slice(index + 8));
      if (androidVersion < 3.0) {
        return true;
      }
    }
    return false;
  }

  function setAuthHeaders(xhr, settings) {
    //SRS does not accept request from Android 2.x phone when additional request header is added.
    if (isOldAndroid()) {
      return true;
    }
    xhr.setRequestHeader("Amzn-Device-Type", sitbDeviceType);
    return true;
  }

  function srsAjax(call, successCallback, errorCallback) {
    $.ajax({
      url: srsUrl + call + getRandomArg(call),
      dataType: "json",
      cache: true,
      timeout: 10000,
      beforeSend: setAuthHeaders,
      error: errorCallback,
      success: successCallback
    });
  }

  function getFileUrl(arg, successCallback, errorCallback) {
    srsAjax(
      "/web/content/getFileUrl?asin=" +
        _startReadingInfo.deliveredAsin +
        "&contentVersion=" +
        _startReadingInfo.contentVersion +
        "&formatVersion=" +
        _startReadingInfo.formatVersion +
        "&isSample=true" +
        arg,
      successCallback,
      errorCallback
    );
  }

  function doGetBookPieces(
    serviceName,
    idList,
    successCallback,
    errorCallback
  ) {
    var args;
    switch (serviceName) {
      case SKELETONIDS_QUERY:
        args = "&skeletonIds=" + idList;
        break;
      case FRAGMENTIDS_QUERY:
        args = "&fragmentIds=" + idList;
        break;
      case RESOURCEIDS_QUERY:
        args = "&resourceIds=" + idList;
        break;
      default:
        errorCallback();
    }

    getFileUrl(
      args,
      function(response) {
        getFilesFromLocatorResponse(response, successCallback, errorCallback);
      },
      errorCallback
    );
  }

  function fulfilledPromise(data, callback) {
    return new jQuery.Deferred()
      .resolve(data)
      .promise()
      .done(callback);
  }

  return {
    initialize: function(startReadingInfo) {
      var dfd = new $.Deferred();
      _startReadingInfo = startReadingInfo;

      loadMetadata(dfd).done(function() {
        loadManifest(dfd, _startReadingInfo.format).done(function() {
          loadFragmap(dfd).done(function() {
            initializePieceManagers();
            _resourceUrlTranslator = KindleBookResourceUrlTranslator(
              _chunkManagers[RESOURCE_TYPE],
              _manifest
            );
            _skeletonBuilder = KindleBookSkeletonBuilderFactory(
              _chunkManagers[SKELETON_TYPE],
              _chunkManagers[RESOURCE_TYPE],
              _manifest,
              _resourceUrlTranslator,
              _deDictionary
            );

            _locationConverter = KindleUserLocationConverter.getLocationConverter(
              _fragmap.fragmentMetadata.bookType,
              {
                locationsInfo: _metadata.locationsInfo,
                minPosition: _fragmap.fragmentArray[0].cPos,
                maxPosition:
                  _fragmap.fragmentArray[_fragmap.fragmentArray.length - 1]
                    .ePos,
                mapGetter: function(id) {
                  var dfd = jQuery.Deferred();
                  _chunkManagers[LOCATIONMAP_TYPE].getPieces(
                    [id],
                    dfd.resolve,
                    dfd.reject
                  );
                  return dfd;
                }
              }
            );
            dfd.resolve();
          });
        });
      });

      return dfd.promise();
    },

    getMetadata: function(successCallback, errorCallback) {
      return fulfilledPromise(_metadata, successCallback);
    },

    getManifest: function(successCallback, errorCallback) {
      return fulfilledPromise(_manifest, successCallback);
    },

    getFragmentMap: function(successCallback, errorCallback) {
      return fulfilledPromise(_fragmap, successCallback);
    },

    getBookSkeleton: function(successCallback, errorCallback, skeletonId) {
      return _skeletonBuilder
        .buildSkeleton(skeletonId)
        .then(successCallback, errorCallback);
    },

    getBookFragments: function(successCallback, errorCallback, idList) {
      // Performs any final modifications before giving back to caller (the Renderer)
      function fragmentHandler(fragment) {
        if (
          fragment.fragmentMetadata.compression === 1 ||
          fragment.fragmentMetadata.compression === 2
        ) {
          fragment.fragmentData = KindleCompression.lzExpandWithStaticDictionary(
            fragment.fragmentData,
            _deDictionary
          );
          // if the paraData is a string, it is compressed JSON-ified; expand and JSON.parse.
          if (
            fragment.paraData !== undefined &&
            typeof fragment.paraData === "string"
          ) {
            var strData = KindleCompression.lzExpandWithStaticDictionary(
              fragment.paraData,
              _deJson,
              0x100
            );
            fragment.paraData = JSON.parse(strData);
          }
          delete fragment.fragmentMetadata.compression;
        }
        successCallback(fragment);
      } // End of fragmentHandler

      _chunkManagers[FRAGMENT_TYPE].getPieces(
        idList,
        fragmentHandler,
        errorCallback
      );
    },

    getGlyphFragments: function(successCallback, errorCallback, idList) {
      // Performs any final modifications before giving back to caller (the Renderer)
      function glyphHandler(glyph) {
        if (
          glyph.glyphFragmentMetadata.compression === 1 ||
          typeof glyph.glyphData === "string"
        ) {
          var strData = KindleCompression.lzExpandWithStaticDictionary(
            glyph.glyphData,
            _deJson,
            0x100
          );
          glyph.glyphData = JSON.parse(strData);
          delete glyph.glyphFragmentMetadata.compression;
        }
        successCallback(glyph);
      } // End of glyphHandler

      _chunkManagers[GLYPH_TYPE].getPieces(idList, glyphHandler, errorCallback);
    },

    /**
     * This function is used to get a set of resources urls, given the wanted resource names.
     *
     * @param successCallback the function to call when we have the dataURI for the resource name. The parameter
     * it expects is a key value pair of the resource and the data URI. eg. {"dir/file0" : "data:..."}
     * @param errorCallback the function to call in the case of an error. This function may be called
     * back with a text message explaining the error.
     * @param resources an array of resources specified by their names, eg. ["dir/file0", "dir/file1", ...]
     */
    getResourceUrls: function(successCallback, errorCallback, resources) {
      _resourceUrlTranslator.getResourceUrls(
        resources,
        successCallback,
        errorCallback
      );
    },

    getLocationConverter: function() {
      return _locationConverter;
    },

    hasCover: function(successCallback, errorCallback) {
      var coverResourceId = _manifest.coverResource;
      return fulfilledPromise(
        coverResourceId !== undefined && coverResourceId !== null,
        successCallback
      );
    },

    getCoverUrl: function(successCallback, errorCallback) {
      var dfd = new jQuery.Deferred();
      var coverResourceId = _manifest.coverResource;
      if (coverResourceId !== undefined && coverResourceId !== null) {
        _chunkManagers[RESOURCE_TYPE].getPieces(
          coverResourceId,
          function(resource) {
            dfd.resolve(resource.data);
          },
          dfd.reject
        );
      } else {
        // No manifest URL, means no manifest, means no cover.
        dfd.resolve(null);
      }
      return dfd.promise().then(successCallback, errorCallback);
    }
  };
}

/*
 * =======================================================================
 * KindleBookSkeletonBuilderFactory
 *
 * This class creates a skeletonBuilder object.
 *
 * A skeletonBuilder object allows for loading of a skeleton, along with all the resources
 * it needs. When done, the skeleton text is passed back via deferred.
 *
 * SkeletonBuilder API:
 *
 * Copyright (c) 2010-2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * =======================================================================
 */

/**
 * Creates and initializes a SkeletonBuilder.
 * @param {Object} skeletonManager An object that can retrieve skeleton fragments from database or network.
 * @param {Object} resourceManager An object that can retrieve resource fragments from database or network.
 * @param {Object} manifest A list of the resources used in the entire book.
 * @param {Object} dictionary The compression dictionary with which to expand the skeleton fragment.
 *
 * The data structures involved:
 *
 * A manifest has a structure like (resource ids need not be contiguous):
 *   { 'skeletonManifest': { //skeleton level resource details
 *                      0: {'includes':[0,1], 'depends':[0,1,3,4]}, //dependencies of skeleton0
 *                      1: {'includes':[1,2], 'depends':[1,2,4]}, //dependencies of skeleton1
 *               },
 *     'resourceManifest': { //individual resource details
 *                      0: {'name':'resources/1234',type:'text/css', includes:[3] },
 *                      1: {'name':'resources/5678',type:'text/css', includes:[4], resInfo:{} },
 *                      2: {'name':'resources/1111',type:'text/css', includes:[] },
 *                      3: {'name':'resources/img1',type:'image/jpeg', includes:[] },
 *                      4: {'name':'resources/img2',type:'image/png', includes:[] }
 *                }
 *   }
 *   The 'resInfo' properties are a way to pass hints to the renderer.
 *
 * A resource containing a css could look like this:
 *  {'data':'.chapter1 {margin-left: 2px;}
 *                     #header {font-size: 1.5em;}
 *                     .ballon {color: yellow; background-image: url('resources/33333');}
 *                     .smiley {color: green; background-image: url('resources/img2');}
 *                     .mystyle {color: red;}',
 *   'resList':{'resources/33333':'data:image/jpeg,base64;ASdse3ade3S321...sd/P'},
 *   'metadata':{'id':1, type:'text/css'}
 *  }
 *  The 'resList' is like a local include.  An image can be referenced in many places, but only downloaded or stored
 *  once.  Note that this can result in DOM bloat.
 *
 * A skeleton fragment could look like this:
 *  {'skeletonData':'<fragment data> <link href="resources/5678" rel="stylesheet" type="text/css"></link> <more data>',
 *   'skeletonMetadata': {'id':1, 'compression': 1, 'encryption': 1}
 *  }
 *
 * Given this, skeleton1 will be built by its fragment and resources 1, 2, and 4:
 * - the raw fragment and resources are fetched from database or network.
 * - the resLists (local includes for the css resources) are processed.
 * - cross-resource includes are processed, by substituting names with the included resources.
 * - resources are injected into the skeleton fragment, by substituting names with the included resources.
 * - any resInfos mentioned in the resourceManifest are added to the skeleton.
 *
 */
function KindleBookSkeletonBuilderFactory(
  skeletonManager_,
  resourceManager_,
  manifest_,
  resourceTranslator_,
  dictionary_
) {
  var that = {};
  that.skeletonManager = skeletonManager_;
  that.resourceManger = resourceManager_;
  that.manifest = manifest_;
  that.resourceTranslator = resourceTranslator_;
  that.dictionary = dictionary_;

  var MAX_FONTS_SIZE = 10 * 1024 * 1024;

  /**
   * This function injects fonts, images, etc. into CSS files by replacing (external) URLs with data: URI's
   * that contain the data inline. Sometimes an included resource isn't actually required (it might be
   * relevant to a different part of the book in a different skeleton, but not relevant here). Those
   * resources get stripped out instead.
   *
   * @param {String} text A skeleton fragment or resource with 'url(...)' values to be replaced.
   * @param {Object} replaceMap The replacements to be made.
   * @return {String} The resulting string after replacements.
   */
  function replaceAllFromMap(text, replaceMap) {
    if (replaceMap) {
      // All URL values in CSS attributes use the "url" function. This regular expression looks for that function
      // and captures its argument's value (which may be specified as a single- or double-quoted string).
      //
      // Captures:
      //   $1 : The URL value if it was quoted with '
      //   $2 : The URL value if it was quoted with "

      var regex = /\burl\s*\(\s*(?:'([^']*)'|"([^"]*)")\s*\)/gi;
      text = text.replace(regex, function(str, squote, dquote) {
        var url = squote || dquote;
        var replacement = replaceMap[url];

        if (replacement) {
          if (replacement.composites) {
            var compositeString = 'url("' + replacement.composites[0] + '")';
            for (var i = 1; i < replacement.composites.length; ++i) {
              compositeString +=
                ", " + 'url("' + replacement.composites[i] + '")';
            }
            return compositeString;
          }
          return 'url("' + replacement + '")';
        } else if (replacement === null) {
          return "none";
        } else {
          // Usually not an error but log it anyway
          return str; // Return original string
        }
      });
    }

    return text;
  }

  /**
   * Resources can include a resList, which can contain data urls used in several places in the resource.  This
   * function makes that substitution.
   * @param {Object} resource A resource that may contain ...src:url("resources/1234")... strings to be replaced
   * with data urls (also contained in the resource).
   */
  function injectInlineDataURIs(resource) {
    resource.data = replaceAllFromMap(resource.data, resource.resList);
  }

  /**
   * This function scans a list of resources for any stylesheets (the only kind of resource that can
   * include other resources) and inlines any included resources.
   *
   * @param {Object} resourcesManifest The book's resourceManifest.
   * @param {Object} availableResources All of the resources upon which the
   *   given skeleton fragment depends.
   */
  function injectResourceIncludes(manifest, availableResources) {
    for (var resourceIndex in availableResources) {
      var resourcesManifest = manifest.resourceManifest;
      var resource = availableResources[resourceIndex];
      var resId = resource.metadata.id;

      var resourceInfo = resourcesManifest[resId];

      if (!resourceInfo) {
        if (manifest.resourceManifest && manifest.resourceManifest[resId]) {
          var resName = manifest.resourceManifest[resId].name;
          resId = that.resourceTranslator.reverseLookup[resName];
          resourceInfo = resourcesManifest[resId];
        }
      }

      var includes = resourceInfo.includes;
      if (includes !== undefined) {
        var replaceMap = {};

        // Here, the resource under consideration has its own list of included resources.  For those
        //  included resources, build a map like {'resources/1234': 'data:image/png;...'}
        for (var i = 0; i < includes.length; i++) {
          var resourceToIncludeInfo = resourcesManifest[includes[i]];
          var resourceToInclude = availableResources[includes[i]];
          if (resourceToInclude === undefined) {
            // this means that the resource includes a resource not actually needed by the skeleton
            // being loaded.
            replaceMap[resourceToIncludeInfo.name] = null;
          } else {
            /*if (resourceToIncludeInfo.composite) {
                var compositesList = [];
                for (var j in resourceToIncludeInfo.composite) {
                    compositesList.push(availableResources[resourceToIncludeInfo.composite[j]].data);
                }
                replaceMap[resourceToIncludeInfo.name] = {composites: compositesList};
            } else {*/
            replaceMap[resourceToIncludeInfo.name] = resourceToInclude.data;
            //}
          }
        }

        resource.data = replaceAllFromMap(resource.data, replaceMap);
      }
    }
  }

  /**
   * Performs an in-place replacement of css links in a skeleton fragment with inline css.  Looks
   * for strings like "<link href='resources/1990984815' ... ></link>" and
   * replaces them with "<style type="text/css"> css statements </style>"
   *
   * @param {Object} skeletonManifest Manifest for the skeleton id being built.
   * @param {Object} resourcesManifest Manifest for all the book's resoruces.
   * @param {Object} skeleton The skeleton fragment being built.
   * @param {Object} availableResources A list of all the resources on which the skeleton fragment depends.
   */
  function injectSkeletonIncludes(
    skeletonManifest,
    resourcesManifest,
    skeleton,
    availableResources
  ) {
    var includes = skeletonManifest.includes;
    if (includes !== undefined) {
      var replaceMap;
      for (var i = 0; i < includes.length; i++) {
        var resourceToInclude = availableResources[includes[i]];
        var resourceToIncludeData =
          resourcesManifest[resourceToInclude.metadata.id];
        if (resourceToIncludeData.type === "text/css") {
          replaceMap = replaceMap || {};
          replaceMap[resourceToIncludeData.name] = resourceToInclude.data;
        }
      }

      if (replaceMap) {
        // This regular expression looks for HTML "link" tags and captures the "href" attribute's value (which
        // may be a single- or double-quoted string). This regex handles both HTML-style (</link>) and XML-style (/>)
        // tag endings.
        //
        // Captures:
        //   $1 : The href value if it was quoted with '
        //   $2 : The href value if it was quoted with "

        var regex = /<link\s(?:[^\/>'"]|'[^']*'|"[^"]*")*href\s*=\s*(?:'([^']*)'|"([^"]*)")(?:[^\/>'"]|'[^']*'|"[^"]*")*(?:\/>|>\s*<\/link>)/gi;
        skeleton.skeletonData = skeleton.skeletonData.replace(regex, function(
          str,
          squote,
          dquote
        ) {
          var url = squote || dquote;
          var replacement = replaceMap[url];
          if (replacement) {
            return '<style type="text/css">' + replacement + "</style>";
          } else {
            // The <link> probably refers to something other than a stylesheet and therefore doesn't need replacing
            return str;
          }
        });
      }
    }
  }

  /**
   * Collects any resInfos attached to resources, and attaches them to the skeleton.
   */
  function addResourceInfoToSkeleton(
    skeleton,
    resourcesManifest,
    skeletonManifest
  ) {
    var dependencies = skeletonManifest.depends;
    if (dependencies !== undefined) {
      var resourceInfo = [];
      for (var i = 0; i < dependencies.length; i++) {
        var resourceToIncludeData = resourcesManifest[dependencies[i]];
        if (resourceToIncludeData.resInfo !== undefined) {
          resourceInfo.push(resourceToIncludeData.resInfo);
        }
      }
      skeleton.resourceInfo = resourceInfo;
    }
  }

  /**
   * Combines a skeleton fragment and a full set of resources into a complete skeleton fragment.
   *
   * @param {Object} manifest The book's manifest.
   * @param {Object} skeleton The (possibly incomplete) skeleton fragment.
   * @param {Object} availableResources The resources on which this skeleton fragment depends.
   * @param {Deferred} dfd The deferred to be resolved with the completed skeleton.
   */
  function processSkeletonAndResources(
    manifest,
    skeleton,
    availableResources,
    dfd
  ) {
    if (availableResources !== null) {
      var resourceManifest = manifest.resourceManifest;
      var currentSkeletonManifest =
        manifest.skeletonManifest[skeleton.skeletonMetadata.id];
      var currentKcrSkeletonManifest =
        manifest.skeletonManifest[skeleton.skeletonMetadata.id];
      injectResourceIncludes(manifest, availableResources);
      injectSkeletonIncludes(
        currentKcrSkeletonManifest,
        manifest.resourceManifest,
        skeleton,
        availableResources
      );
      addResourceInfoToSkeleton(
        skeleton,
        resourceManifest,
        currentSkeletonManifest
      );
    }
    dfd.resolve(skeleton);
  }

  /**
   * This is a test function that illustrates how we could prevent the download of fonts which are too large and
   * cause stability issues.
   *
   * @param resources
   * @param manifest
   */
  function getNeededResources(resources, manifest) {
    var neededResources = [];
    var totalFontSize = 0;
    for (var idx = 0; idx < resources.length; ++idx) {
      var resourceId = resources[idx];
      if (manifest[resourceId].type === "font/*" && manifest[resourceId].size) {
        totalFontSize += manifest[resourceId].size;
        if (totalFontSize > MAX_FONTS_SIZE) {
          continue;
        }
      }
      neededResources.push(resourceId);
    }
    return neededResources;
  }

  /**
   * Builds a skeleton by injecting the appropriate resources into it.
   * @param {Number} skeletonId Id of the desired skeleton.
   * @returns {Deferred} A promise on the completed skeleton.
   */
  that.buildSkeleton = function(skeletonId) {
    // Collects the skeleton.  When it and all resources are ready, calls process...
    function skeletonHandler(skeleton) {
      if (skeleton.skeletonMetadata.compression === 1) {
        skeleton.skeletonData = KindleCompression.lzExpandWithStaticDictionary(
          skeleton.skeletonData,
          dictionary
        );
        delete skeleton.skeletonMetadata.compression;
      }
      if (numRetrievedResources >= numNeededResources) {
        processSkeletonAndResources(manifest, skeleton, resourcesResult, dfd);
      } else {
        skeletonResult = skeleton;
      }
    }
    // Collects the resources.  When they and the skeleton are ready, calls process...
    function resourceHandler(resource) {
      injectInlineDataURIs(resource);

      resourcesResult[resource.metadata.id] = resource;

      numRetrievedResources++;

      if (
        skeletonResult !== null &&
        numRetrievedResources >= numNeededResources
      ) {
        processSkeletonAndResources(
          manifest,
          skeletonResult,
          resourcesResult,
          dfd
        );
      }
    }

    var dfd = new jQuery.Deferred();
    var dictionary = this.dictionary;

    var numNeededResources = 0;
    var numRetrievedResources = 0;

    // Get the list of resources required to complete this skeleton fragment.
    var resources = [];
    if (
      this.manifest.skeletonManifest !== undefined &&
      this.manifest.skeletonManifest[skeletonId] !== undefined &&
      this.manifest.skeletonManifest[skeletonId].depends !== null
    ) {
      resources = this.manifest.skeletonManifest[skeletonId].depends.slice();
      for (var res = 0; res < resources.length; ++res) {
        var resInfo = this.manifest.resourceManifest[resources[res]];
        if (resInfo.type === "text/css") {
          resources[res] = this.manifest.skeletonManifest[skeletonId].depends[
            res
          ];
        }
        if (resInfo.composite) {
          //    resources = resources.concat(resInfo.composite);
        }
      }
      numNeededResources = resources.length;
    }

    var skeletonResult = null;
    var resourcesResult = null;
    var manifest = this.manifest;

    // Request the skeleton and any needed resources.
    this.skeletonManager.getPieces([skeletonId], skeletonHandler, dfd.reject);

    if (numNeededResources > 0) {
      resourcesResult = {};
      this.resourceManger.getPieces(resources, resourceHandler, dfd.reject);
    }

    return dfd.promise();
  };

  return that;
}

/*
 * Copyright (c) 2019 Amazon.com, Inc. All rights reserved.
 *
 * KReW Version 2.9.14 */
var KindleRendererAnnotationRenderer=function(){function g(){var c={};return function(a,d){if(c[a]!==void 0)return c[a];var e=d[a];if(!e)return c[a]=!1;if(e.tagName==="IMG")return c[a]=!0;for(;e.tagName!=="BODY";){var k=$(e);if(k){var j=k.css("background-color"),k=k.css("background-image");if(j&&j!=="rgba(0, 0, 0, 0)"&&j!=="transparent"||k&&k!=="none")return c[a]=!0;e=e.parentNode}}return c[a]=!1}}function m(c){var a={};$(c).find("[data-nid]").each(function(d,e){a[e.getAttribute("data-nid")]=e});
return a}function h(f,a){a!==void 0&&(a.clickable!==void 0&&f.setAttribute(b,a.clickable),a.feedbackAnimation!==void 0&&f.setAttribute(c,a.feedbackAnimation))}var b="data-annotationClickable",c="data-annotationClickFeedback";return{DRAW_AFTER:"after",DRAW_OVER:"over",ANNOTATION_CLICK_ATTRIBUTE:b,ANNOTATION_CLICK_FEEDBACK_ATTRIBUTE:c,createAnnotationElements:function(c,a,d,e,k){var j=[];if(e!==null)for(var b=KindleRendererSettings.getSettings().annotationStyles,q=KindleRendererSettings.getSettings().annotationClick,
o,p=o=null,n=null,s=m(c.contentDocument),r=g(),w=0;w<e.length;w+=1)if(p=e[w],o=p.type,b[o]){var n=q?q[o]:void 0,z=b[p.type].className;if(p.additionalStyles)for(var C in p.additionalStyles)z+=" "+p.additionalStyles[C];if(b[o].drawingType==="over"){o=c;var u=k,x=a,D=z,v=n,n=s,z=r,H=o.contentDocument.createElement("DIV");H.setAttribute("annotationType",p.type);H.setAttribute("annotationStart",p.start);h(H,v);for(var x=KindleRendererWordRectsHelper.createWordBoundaries(p,x,o.contentDocument,o.contentWindow,
o.writingMode),p=o.contentDocument,v=p.createElement("DIV"),t=!1,J=!1,E={isNewDiv:!0,isImageBound:!1,lineBounds:{top:0,height:0,left:0,right:0,width:0}},B=!1,y=!0,M=x.length,A=0;A<M;A+=1){var G=x[A].dataNid;t||typeof G==="string"&&z(G,n)&&(t=!0);!G&&!t&&x[A].tagName==="IMG"&&(t=!0);var y=x[A].rect,F=void 0,I=n[G],G=void 0,K=!1;if(A<M-1)F=x[A+1].rect,G=n[x[A+1].dataNid],J=z(x[A+1].dataNid,n);I&&G&&(K=I.tagName==="IMG"||t,B=I.tagName==="IMG",I=!1,I=G!==void 0?G.tagName==="IMG":!1,B=B!==I||J!==t);if(y=
o.writingMode.updateDivIfNewLineOrImageBound(E,y,F,K,B,$(p).width()))y=v,F=E.lineBounds,G=D,y.style.top=F.top+"px",y.style.height=F.height+"px",y.style.left=F.left+"px",y.style.width=F.width+"px",y.className=t?G+" semiTransparentOverlay":G,H.appendChild(v),v=p.createElement("DIV"),t=!1}u.appendChild(H);o=H}else if(b[o].drawingType==="after"){H=c;o=k;D=a;x=d;v=n;n=p.start;J=-1;u=void 0;for(x.addBoundsForPosition(H.contentDocument,D,n,H.writingMode);D[n]===void 0&&J<100;)n=p.start+J,x.addBoundsForPosition(H.contentDocument,
D,n,H.writingMode),J+=1;if(D[n]!==void 0)u=H.contentDocument.createElement("DIV"),u.setAttribute("annotationType",p.type),u.setAttribute("annotationStart",p.start),h(u,v),x=u,D=D[n].rects[D[n].rects.length-1],n=z,z=H.contentDocument,p=z.createElement("DIV"),H.writingMode.positionDivAfterWord(p,D,"px",$(z).width()),p.className="note-annotation "+n,x.appendChild(p),o.appendChild(u);o=u}else o=null;o&&j.push(o)}return j},removeAnnotationElements:function(c,a){$(c).children('[annotationtype="'+a.type+
'"][annotationstart="'+a.start+'"]').remove()}}}(),KindleRenderer=function(){function g(a,d,e){a={status:a};if(d!==void 0)a.errorCode=d;if(e!==void 0)a.errorMsg=e;y!==void 0&&y(a)}function m(a,d){g(p,a,d?d:"no msg")}function h(){E=J=!1;g(s)}function b(){M!==null&&(M.endTimer(),M.log(),M=null);J=!0;g(r)}function c(){E=!1}function f(){E=!0;g(w)}function a(a){E=!1;m(x,a)}function d(a){J=!1;m(u,a)}function e(a){a=parseInt(a,10);isNaN(a)&&(a=0);return KindleRendererContentDisplay.gotoPosition(a,!0)}function k(){return setTimeout(function(){t||
(H=!0,m(z,"Init timed out"))},v)}function j(a){clearTimeout(a);return k()}function l(r,w,l,u){M===null&&(M=KindleMetricsProfiler("Renderer-Load"));y=l.statusCallback;l.contentInterfaceCallbacks&&KindleRendererContentScripts.setCallbacks(l.contentInterfaceCallbacks);H=!1;if(r)if(r.bookInfo&&r.containerId)A=$(document.getElementById(r.containerId)),A.length===0?m(C,"Container not found"):(g(n),KindleRendererDeviceSpecific.initialize(),v=KindleRendererDeviceSpecific.rendererInitializationTimeout(),B=
k(),KindleRendererFragmentLoader.initialize(r.bookInfo).then(function(){H||(B=j(B),KindleRendererSettings.initialize(r.bookInfo).then(function(){if(!H){B=j(B);KindleRendererPositionLoadingCalculator.updateScreenDimensions(A.width(),A.height());var k={waitNotification:h,readyNotification:b,rectsWaitNofification:c,rectsReadyNotification:f,rectsErrorNotification:a,errorNotification:d,annotationTriggered:l.annotationEventCallback};r.startingPositionDfd.done(function(a){H||(B=j(B),KindleRendererContentDisplay.initialize(A.get(0),
k,r.bookInfo,u,a).then(function(){H||(KindleRendererSettings.updateSettings(w),KindleGlyphRenderer.updateSettings(w),KindleRendererContentDisplay.updateSettings(w),t=!0,e(a))},function(a){H||m(z,"Load Failure: "+a)}))})}},function(){H||m(z,"Load Failure: Metadata")}))},function(a){H||m(z,"Load Failure: "+a)}));else throw{name:"initializationError",message:"required parameters not present"};}function q(){if(!t)throw{name:"initializationError",message:"Please call KindleRenderer.initialize function first"};
}var o=0,p=o++,n=o++,s=o++,r=o++,w=o++,z=o++,C=o++,u=o++,x=o++,D=o++,o=o++,v=12E4,H=!1,t=!1,J=!1,E=!1,B,y=void 0,M=null,A=null;return{STATUS_ERROR:p,STATUS_LOADING:n,STATUS_PAGINATING:s,STATUS_PAGINATED:r,STATUS_DONE:w,ERROR_LOAD_FAILURE:z,ERROR_CONTAINER_NOT_FOUND:C,ERROR_UNABLE_TO_GET_BOOK_CONTENT:u,ERROR_UNABLE_TO_GET_WORD_RECTS:x,ERROR_TIMEOUT_WHILE_LOADING_BOOK_CONTENT:D,ERROR_UNKNOWN:o,PAGE_LOAD_INCOMPLETE_FLAG_NAME:"PageLoadIncomplete",initialize:function(a,d,e,c){try{l(a,d,e,c)}catch(k){}},
shutdown:function(){try{t&&(t=!1,clearTimeout(B),KindleRendererContentDisplay.cleanup(),KindleGlyphRenderer.cleanup(),KindleRendererCanvasInsertion.cleanup())}catch(a){}},getMinimumPosition:function(){q();return KindleRendererFragmentLoader.getMinimumPosition()},getMaximumPosition:function(){q();return KindleRendererFragmentLoader.getMaximumPosition()},createWordIterator:function(){q();try{return KindleRendererWordIteratorFactory.build()}catch(a){}return null},updateSettings:function(a){try{KindleRendererSettings.updateSettings(a),
KindleGlyphRenderer.updateSettings(a),KindleRendererContentDisplay.updateSettings(a)}catch(d){return!1}},gotoPosition:function(a){q();try{return e(a)}catch(d){}return!1},nextScreen:function(){q();try{if(J)return KindleRendererContentDisplay.nextScreen()}catch(a){}return!1},previousScreen:function(){q();try{if(J)return KindleRendererContentDisplay.previousScreen()}catch(a){}return!1},hasNextScreen:function(){q();try{if(J)return KindleRendererContentDisplay.hasNextScreen()}catch(a){}return!1},hasPreviousScreen:function(){q();
try{if(J)return KindleRendererContentDisplay.hasPreviousScreen()}catch(a){}return!1},getPagePositionRange:function(){q();try{if(J)return KindleRendererContentDisplay.getPagePositionRange()}catch(a){}return null},getPageSelectableItemBoundaries:function(){q();try{if(E)return KindleRendererContentDisplay.getSelectableItemBoundaries()}catch(a){}return null},getPageWordPositions:function(){q();try{if(E)return KindleRendererContentDisplay.getWordPositions()}catch(a){}return null},onWindowResize:function(){if(t)try{KindleRendererPositionLoadingCalculator.updateScreenDimensions(A.width(),
A.height()),KindleRendererContentDisplay.onWindowResize()}catch(a){}},handleClick:function(a,d){try{if(J)return KindleRendererContentDisplay.handleClick(a,d)}catch(e){}return null},reloadAnnotations:function(){try{J&&KindleRendererContentDisplay.reloadAnnotations()}catch(a){}},getContentRects:function(){q();try{if(J)return KindleRendererContentDisplay.getContentRects()}catch(a){}return null},getZoomableAt:function(a,d){q();try{if(J)return KindleRendererContentDisplay.getZoomableAt(a,d)}catch(e){}return null},
getZoomableList:function(){q();try{if(J)return KindleRendererContentDisplay.getZoomableList()}catch(a){}return null},clearSelection:function(){if(t)try{J&&KindleRendererContentDisplay.clearSelection()}catch(a){}},getSelection:function(){q();try{if(J)return KindleRendererContentDisplay.getSelection()}catch(a){}}}}(),KindleRendererWordIteratorFactory=function(){function g(a,e,c,j){for(var b=!0;b;){b=a.getItem();if(b.pos>e){j.resolve(c);return}c+=b.text;b=a.next()}a.getLoadingDfd().then(function(b){b?
g(a,e,c,j):j.resolve(c)},j.reject)}function m(d){d.cancelCurrentRequest=function(){if(this.currentRequest)this.currentRequest=null};d.newRequest=function(a,d,c){this.cancelCurrentRequest();this.currentRequest={requestId:KindleRendererRequestId.getUniqueRequestId(),metrics:KindleMetricsProfiler("word-iterator-load"),position:a,stopPosition:d,direction:c}};d.newRequestDfd=function(){this.currentRequestDfd=new jQuery.Deferred;this.currentRequestReachedTerminal=!1};d.fragmentLoadedCallback=function(a){var d=
this;d.loadedRange=a.contentRange;d.wordMapGenerator.createWordMap(a.fragmentRoot,a.positionData).then(function(a){d.createPositionInfo(a)},function(){d.currentRequestDfd.reject()})};d.calculateContinuePosition=function(a){return a===f?this.loadedRange.startPosition-1:this.loadedRange.endPosition+1};d.hasReachedStopPosition=function(a){if(this.currentRequest&&this.currentRequest.stopPosition!==void 0){var d=this.currentRequest.direction,c=this.currentRequest.stopPosition,a=a?this.positions[this.currPositionIndex]:
this.calculateContinuePosition(d);return d===f&&a<c||a>c}return!1};d.createPositionInfo=function(d){this.wordMap=d;d=this.currentRequest.direction;this.positions=[];for(var k in this.wordMap)this.positions.push(parseInt(k,10));this.positions.sort(function(a,d){return a-d});k=this.findPosition(this.currentRequest.position,d);this.hasReachedStopPosition(k)?this.currentRequestDfd.reject():k?(this.currentRequest=null,this.currentRequestDfd.resolve(!this.currentRequestReachedTerminal)):d===f&&this.startPositionIsLoaded()||
this.endPositionIsLoaded()?this.currentRequestReachedTerminal?this.currentRequestDfd.reject():(this.currentRequestReachedTerminal=d!==c,d=d===f?a:f,this.beginLoad(this.calculateContinuePosition(d),this.currentRequest.stopPosition,d)):this.beginLoad(this.calculateContinuePosition(d),this.currentRequest.stopPosition,d)};d.findPosition=function(a,d){this.currPositionIndex=KindleListUtilities.binarySearch(this.positions,a);return d===f?a>=this.positions[0]:(this.positions[this.currPositionIndex]<a&&++this.currPositionIndex,
this.currPositionIndex<this.positions.length)};d.beginLoad=function(a,d,c){var b=this;b.newRequest(a,d,c);a=KindleRendererFragmentLoader.getFragmentIdForPosition(a,c===f);KindleRendererFragmentLoader.getFragmentAtId(a,b.currentRequest).then(function(a,d){b.currentRequest&&b.currentRequest.requestId===a.requestId&&b.fragmentLoadedCallback(d)},function(){b.currentRequestDfd.reject()})};d.gotoPosition=function(a,d){this.newRequestDfd();if(this.currentRequest===null&&this.loadedRange!==null&&a>=this.loadedRange.startPosition&&
a<this.loadedRange.endPosition&&this.findPosition(a,c))return this.currentRequestDfd.resolve(!0),this.currentRequestDfd.promise();this.beginLoad(a,d,c);return this.currentRequestDfd.promise()};d.getItem=function(){if(this.currentRequest===null){var a=this.positions[this.currPositionIndex];return{pos:a,text:this.wordMap[a].text}}return null};d.previous=function(a){if(this.currPositionIndex===null||this.currentRequest!==null)return!1;this.currPositionIndex--;return this.currPositionIndex<0?(this.startPositionIsLoaded()?
(this.currPositionIndex=0,this.newRequestDfd(),this.currentRequestDfd.resolve(!1)):(this.newRequestDfd(),this.beginLoad(this.loadedRange.startPosition-1,a,f)),!1):!0};d.next=function(d){if(this.currPositionIndex===null||this.currentRequest!==null)return!1;this.currPositionIndex++;return this.currPositionIndex>=this.positions.length?(this.endPositionIsLoaded()?(this.currPositionIndex=this.positions.length-1,this.newRequestDfd(),this.currentRequestDfd.resolve(!1)):(this.newRequestDfd(),this.beginLoad(this.loadedRange.endPosition+
1,d,a)),!1):!0};d.getLoadingDfd=function(){return this.currentRequestDfd.promise()};d.startPositionIsLoaded=function(){return this.loadedRange.startPosition<=KindleRendererFragmentLoader.getMinimumPosition()};d.endPositionIsLoaded=function(){return this.loadedRange.endPosition>=KindleRendererFragmentLoader.getMaximumPosition()}}function h(a,e){a.getItem=function(){return e.getItem()};a.previous=function(a){return e.previous(a)};a.next=function(a){return e.next(a)};a.getLoadingDfd=function(){return e.getLoadingDfd()};
a.gotoPosition=function(a,d){var c=Math.max(a,KindleRendererFragmentLoader.getMinimumPosition()),c=Math.min(c,KindleRendererFragmentLoader.getMaximumPosition());return e.gotoPosition(c,d)};a.getText=function(a,d){var e=this,c=new jQuery.Deferred;e.gotoPosition(a).then(function(){g(e,d,"",c)},c.reject);return c.promise()};a.clear=function(){b(e)}}function b(a){a.currentRequest=null;a.currentRequestDfd=null;a.currentRequestReachedTerminal=null;a.loadedRange=null;a.wordMap=null;a.positions=null;a.currPositionIndex=
null}var c="goto",f="prev",a="next";return{build:function(){var a={};a.wordMapGenerator=KindleRendererWordMapGeneratorFactory.buildWordMapGeneratorForWordText();b(a);m(a);var e={};h(e,a);return e}}}(),KindleRendererCanvasInsertion=function(){function g(a,d){for(var e=a;e<d.length;e++){d[e].innerHTML="";d[e].width=0;for(var c=d[e].attributes.length;--c>=0;)d[e].removeAttribute(d[e].attributes[c].nodeName)}}function m(a,d,e,c){var j=d.getElementsByTagName("html")[0],l=d.getElementsByTagName("body")[0],
q=Array.prototype.slice.call(l.getElementsByClassName("k4wc"));if(q.length>0){j.removeChild(l);var o=q.length,p=KindleRendererDeviceSpecific.maximumCanvases();b[a]=0;var n=null;h[a]||(h[a]=[]);var s=function(e){e=q[e];if(b[a]>=p)if(e.parentNode.removeChild(e),e=parseInt(e.id,10),c){if(n===null||e>n)n=e}else{if(n===null||e<n)n=e}else{var r=f(a,d);r.id=e.id;r.setAttribute("height",e.getAttribute("height"));r.setAttribute("width",e.getAttribute("width"));r.setAttribute("data-nid",r.id);r.innerHTML=e.innerHTML;
e.parentNode.replaceChild(r,e)}},r;if(c)for(r=o-1;r>=0;r--)s(r);else for(r=0;r<o;r++)s(r);if(n!==null){o=KindleMetricsProfiler("remove-extra-canvases");if(c){if($(l).find("*").filter(function(){return parseInt(this.getAttribute("id"),10)<n}).remove(),e.startPosition<=n)e.startPosition=n+1}else if($(l).find("*").filter(function(){return parseInt(this.getAttribute("id"),10)>n}).remove(),e.endPosition>=n)e.endPosition=n-1;o.endTimer();o.log()}g(b[a],h[a]);j.appendChild(l)}}var h=[],b=[],c=0,f=function(){return(window.ActiveXObject||
"ActiveXObject"in window)&&window.XMLHttpRequest?function(a,d){return d.createElement("CANVAS")}:function(a,d){b[a]++;var e=b[a],k=h[a],j=null;e>k.length?(j=d.createElement("CANVAS"),c+=1,k[e-1]=j):j=k[e-1];return j}}();return{changeSpanToCanvas:function(a,d,e,c){m(a,d,e,c)},cleanup:function(){for(var a in h)for(var d=h[a],e=d.length,c=0;c<e;c+=1){var b=d[c],f=b.parentNode;f!==null&&f!==void 0&&f.removeChild(b)}h=null}}}(),KindleGlyphRenderer=function(){function g(a,d,e,c,k,b,j,f){d=d[c.imgSrc];if(e.getContext&&
d!==void 0){var n=new Image,l=c.o;l||(l=[0,0]);n.onload=function(){if(a===o){var d=l,c=e,w=c.getContext("2d"),n=d[0]*k/1440,d=d[1]*k/1440,C={x:n,y:d,w:this.width*b,h:this.height*b};j[c.id]||(j[c.id]=[]);c=j[c.id];c[c.length]=C;w.translate(n,d);w.scale(b,b);w.drawImage(this,0,0);w.scale(1/b,1/b);w.translate(-n,-d);e=null}setTimeout(f,25)};n.src=d;c=d=d=null}else setTimeout(f,10)}function m(a,d,e,c){if(d.getContext){var k=e.o;k||(k=[0,0]);var b=d.getContext("2d");b.translate(k[0]*c/1440,k[1]*c/1440);
b.fillStyle=h(d);for(var j,f,n,l,q,g=e.l.length,o=0;o<g;o++){a:{j=e.l[o][0];n=void 0;for(q=0;q<a.length;q+=1)if(n=a[q].glyphFragmentMetadata,j>=n.startingGlyph&&j<=n.endingGlyph){n=j-n.startingGlyph;j=a[q].glyphData[n];break a}j=null}if(j!==null){n=e.l[o][1]+e.p[0];l=e.l[o][2]+e.p[1];q=c/j.dpi;n=(n-e.p[0])*c/1440;l=(l-e.p[1])*c/1440;b.translate(n,l);b.scale(q,q);b.beginPath();for(var p=j.c.length,m=0;m<p;m++){var A=j.c[m];b.moveTo(A[0],A[1]);f=A.length-6;for(var G=2;G<f;G+=6)b.bezierCurveTo(A[G],
A[G+1],A[G+2],A[G+3],A[G+4],A[G+5]);f=A.length;b.bezierCurveTo(A[f-4],A[f-3],A[f-2],A[f-1],A[0],A[1])}b.closePath();b.fill();b.scale(1/q,1/q);b.translate(-n,-l)}}b.translate(-(k[0]*c/1440),-(k[1]*c/1440));if(d.parentNode.tagName==="A")b.strokeStyle=h(d),b.lineWidth=s.lineWidth,b.beginPath(),b.moveTo(0,d.height-1),b.lineTo(d.width,d.height-1),b.stroke(),b.closePath()}}function h(a){a=a.parentNode;return a.tagName==="A"?s.linkColor:(a=a.getAttribute("class"))&&a.indexOf("fixedOverlap")>=0?q:s.textColor}
function b(a){for(var a=a.getElementsByTagName("CANVAS"),d={},e=0;e<a.length;e+=1)d[a[e].id]=a[e];return d}function c(a,d,e,c,k,b){for(var j={},f=0;f<a.length;f+=1){var n=d[a[f].id];if(n)for(var l=0;l<n.length;l++){var q=k[n[l].id];if(q){var s=c,o=q.parentNode.getAttribute("class");if(o&&o.indexOf("fixed")>=0){var s=e,o=q,g=b;if(g[o.id])s=g[o.id];else{var p=o.getAttribute("height"),h=o.getAttribute("width"),m=0,F=0,I=1;if(p&&!(p<=0||!h||h<=0))p>s.height&&(m=s.height/p),h>s.width&&(F=s.width/h),m>
0&&F>0?I=m<F?m:F:m>0?I=m:F>0&&(I=F),g[o.id]=I;s=I}}if(s!==1&&!j[q.id])j[q.id]=1,q.width=Math.round(s*q.width),q.height=Math.round(s*q.height)}}}}function f(a,d,e,c,k,b,j,n,l,q,s){function h(){a===o?f(a,d,e+1,c,k,b,j,n,l,q,s):setTimeout(s,10)}for(var m=c.length;d<m;){var y=k[c[d].id];if(y)for(var M=y.length;e<M;){var A=y[e];if(A.imgSrc!==void 0){var G=n[A.id];if(G){m=l[G.id];m=m!==void 0?m:b;g(a,j,G,A,m*p,m,q,h);return}}e+=1}d+=1;e=0}setTimeout(s,10)}function a(a,d,e,c,k,b,j,n,l){f(a,0,0,d,e,c,k,b,
j,n,l)}function d(a,e,c,k,b,j,f,n,l,q,s){function g(){a===o?d(a,e,c+1,k,b,j,f,n,l,q,s):setTimeout(s,q.time)}var h=0,y=k.length;for(KindleRendererProcessTuning.startingOperation("GlyphRenderering");e<y;){var M=b[k[e].id];if(M)for(var A=M.length;c<A;){var G=M[c];if(G.l!==void 0&&G.l.length>0){var F=n[G.id];if(F){var I=l[F.id];m(f,F,G,(I!==void 0?I:j)*p);h+=1;if(h>=q.frequency){KindleRendererProcessTuning.endingOperation("GlyphRenderering",h);setTimeout(g,q.time);return}}}c+=1}e+=1;c=0}KindleRendererProcessTuning.endingOperation("GlyphRenderering",
h);setTimeout(s,q.time)}function e(a,e,c,k,b,j,f,n,l){d(a,0,0,e,c,k,b,j,f,n,l)}function k(d,k,j,f,l,q){var g={height:$(d).parent().height()*0.85,width:$(d).parent().width()*0.85},p=b(d.contentDocument),h=[],t=d.contentDocument.getElementsByTagName("html")[0],m=d.contentDocument.getElementsByTagName("body")[0],m=t.removeChild(m),E=$(m).find("p"),B={},y=l.createSubTimer("resizing-canvases");c(E,j.paraData,g,s.glyphScale,p,B);y.endTimer();y=l.createSubTimer("rendering-all-images");a(k.requestId,E,j.paraData,
s.glyphScale,j.imageData,p,B,h,function(){y.endTimer();if(!(o!==k.requestId||d.processingRequestId.id!==k.requestId)){y=l.createSubTimer("rendering-all-glyphs");var a={frequency:KindleRendererProcessTuning.drawYieldFrequency("GlyphRenderering"),time:KindleRendererProcessTuning.drawYieldUpdateTime("GlyphRenderering")};e(k.requestId,E,j.paraData,s.glyphScale,f,p,B,a,function(){y.endTimer();o!==k.requestId||d.processingRequestId.id!==k.requestId||(t.appendChild(m),n[d.id]=h,p=B=null,setTimeout(q,a.time))})}})}
function j(a,d,e,c){var b=new jQuery.Deferred;if(o===null||d.requestId>=o){o=d.requestId;var j=d.metrics.createSubTimer("glyph-rendering");k(a,d,e,c,j,function(){o===d.requestId&&a.processingRequestId.id===d.requestId&&(o=null,j.endTimer(),b.resolve())})}return b.promise()}function l(a){var d={r:parseInt(s.textColor.substring(1,3),16),g:parseInt(s.textColor.substring(3,5),16),b:parseInt(s.textColor.substring(5,7),16)},e=n[a.id];$(a.contentDocument).find("canvas").each(function(){var a=this.parentNode;
if(a.tagName!=="A"&&(a=a.getAttribute("class"),!a||a.indexOf("fixedOverlap")<0)){a=this.getContext("2d");try{var c=a.getImageData(0,0,this.width,this.height),k=this.width*this.height*4,b=e[this.id];if(b){for(var j=this.width,f=0,r=b.length,n=[];f<r;f+=1)for(var l=Math.floor(b[f].x),q=Math.floor(b[f].y),s=Math.ceil(b[f].w),o=Math.ceil(b[f].h),g=0;g<o;g+=1)for(var p=(j*(q+g)+l)*4,h=p+s*4;p<=h;p+=4)n[p]=1;for(var m=c.data,K=d.r,N=d.g,L=d.b,b=0;b<k;b+=4)m[b+3]>0&&!n[b]&&(m[b]=K,m[b+1]=N,m[b+2]=L)}else{n=
c.data;f=d.r;g=d.g;p=d.b;for(m=0;m<k;m+=4)n[m+3]>0&&(n[m]=f,n[m+1]=g,n[m+2]=p)}a.putImageData(c,0,0)}catch(Q){}}})}var q="#000000",o=null,p=100,n=[],s={glyphScale:1,textColor:q,linkColor:"#0000ff",lineWidth:1};return{renderAllContent:function(a,d,e,c){return j(a,d,e,c)},updateTextColor:function(a){l(a)},updateSettings:function(a){if(a.glyphScale!==void 0&&(s.glyphScale=a.glyphScale,s.glyphScale<0.75||s.glyphScale>3))s.glyphScale=Math.max(0.75,Math.min(3,s.glyphScale));if(a.fontColor!==void 0)s.textColor=
a.fontColor},clearIframeData:function(a){n&&n[a.id]!==null&&(n[a.id]=void 0)},cleanup:function(){n=null}}}(),KindleRendererContentFragmentation=function(){function g(a){a=$.extend(!0,{},a);if(!isFinite(a.startPosition)||!isFinite(a.endPosition))a.startPosition=0,a.endPosition=1E4;if(a.startPosition<0)a.startPosition=0;if(a.endPosition<0)a.endPosition=1E4;return a}function m(a){return!a||!a.requestData||a.requestData.cancelled===!0}function h(a,d){for(var e=Math.max(l[0].cPos,d.startPosition),c=Math.min(l[l.length-
1].ePos,d.endPosition),b=[],k=Infinity,j=-Infinity,f=0;f<l.length;f+=1)if(l[f].sId===a){var n=f===0?l[f].cPos:Math.min(l[f].cPos,l[f-1].ePos+1),q=l[f].ePos;if(!(q<e)){if(n>c)break;n<k&&(k=n);q>j&&(j=q);b.push(f)}}b[0]===1&&l[0].cPos===l[0].ePos&&l[0].cPos===l[1].cPos&&b.push(0);return{fragmentList:b,startPosition:k,endPosition:j}}function b(e,c){if(c!==null)c.skeletonData=e.skeletonData,c.resourceInfo=e.resourceInfo,f(e),c.fragmentLoadMetrics=c.overallLoadMetrics.createSubTimer("fragments"),q.getBookFragments(function(e){m(c)?
(c=null,k(e)):KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeOnContentReceived(),c.requestData.type,function(){var b=c;if(b===null||b.loadedFragments===null)k(e);else{b.numFragmentsLoaded+=1;var j=e.fragmentMetadata.id,f=l[j];if(e.wordList)for(var n in e.wordList)e.wordList[n]+=f.cPos;b.loadedFragments[j]=e;if(!(b.numFragmentsLoaded<b.fragmentsToLoad.length)&&(b.fragmentLoadMetrics.endTimer(),b!==null)){var q,f=b.loadedFragments,j={},o;for(o in f)if(n=f[o].imageRefs)for(var g in n)j[n[g]]=
!0;o=[];for(q in j)o.push(q);q=o=KindleRendererImageRenderer.resolveCompositeResources(o);q.length>0?d(q,b):a(b)}}})},function(){if(c!==null){var a=c.requestData;c.fragmentLoadMetrics.addCount("Failure",1);c.fragmentLoadMetrics.endTimer();var d=c.deferredResult;c.loadedFragments=null;c=c.glyphData=null;d.reject("Error trying to download file fragments.",a)}},c.fragmentsToLoad)}function c(a){if(a!==void 0&&a!==null&&a.length>0&&p>0){var d=[],e,c,b,k;o=[];c=Math.min(a.length,p);e=p-c;for(b=0;b<a.length&&
b<c;++b)k=a[b].glyphFragmentMetadata.id,d[k]=a[b],delete o[k];if(e>0)for(b in o)if(d[b]=o[b],--e===0)break;o=d}}function f(a){if(a.skeletonMetadata){var d=a.skeletonMetadata.id;n[d]===void 0&&(n={},n[d]=a)}}function a(a){function d(c){m(a)&&(a=null);KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeOnContentReceived(),a&&a.requestData.type,function(){var d=a;d===null||d.glyphData===null?(c.glyphData=null,c.glyphFragmentMetadata=null):(d.glyphChunkLoadCnt+=1,d.glyphData.push(c),
d.glyphChunkLoadCnt<d.glyphChunksToDownload.length||(d.glyphLoadMetrics.endTimer(),e(d)))})}function c(){if(a!==null&&a.glyphData!==null){var d=a.requestData,e=a.deferredResult;a.glyphLoadMetrics.addCount("Failure",1);a.glyphLoadMetrics.endTimer();a=a.glyphData=null;e.reject("Error trying to download glyph chunks.",d)}}if(a!==null){var b,k=[],f=[],n;for(n in a.loadedFragments)if(b=j(parseInt(n,10)),b.gCks)for(var l=0;l<b.gCks.length;l+=1)$.inArray(b.gCks[l],f)===-1&&f.push(b.gCks[l]);b=[];for(n=0;n<
f.length;n+=1)l=f[n],o[l]===void 0?b.push(l):k.push(o[l]);a.glyphData=k;b.length>0?(k=a.overallLoadMetrics.createSubTimer("glyph-loading"),k.addCount("NumGlyphCunks",b.length),a.glyphChunkLoadCnt=0,a.glyphChunksToDownload=b,a.glyphLoadMetrics=k,q.getGlyphFragments(d,c,b,a)):e(a)}}function d(d,e){var c=e.overallLoadMetrics.createSubTimer("resources");e.fragmentResources={};e.fragmentResourceLoadCnt=0;e.fragmentResourceToDownload=d;e.fragmentResourceLoadMetrics=c;q.getResourceUrls(function(d){m(e)&&
(e=null);KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeOnContentReceived(),e&&e.requestData.type,function(){var c=e;c!==null&&(c.fragmentResourceLoadCnt+=1,jQuery.extend(c.fragmentResources,d),c.fragmentResourceLoadCnt<c.fragmentResourceToDownload.length||(c.fragmentResourceLoadMetrics.endTimer(),a(c)))})},function(){if(e!==null){var a=e.requestData,d=e.deferredResult;e.fragmentResourceLoadMetrics.addCount("Failure",1);e.fragmentResourceLoadMetrics.endTimer();e=null;
d.reject("Error trying to download fragment resources.",a)}},d)}function e(a){if(!(a===null||a.loadedFragments===null)){c(a.glyphData);var d,e;for(e in a.loadedFragments)if(a.loadedFragments[e].fragmentMetadata.lId===void 0)d=j(parseInt(e,10)),a.loadedFragments[e].fragmentMetadata.lId=d.lId,a.loadedFragments[e].fragmentMetadata.lt=d.lt,a.loadedFragments[e].fragmentMetadata.nOff=d.off;d=null;var b=a.deferredResult,k=a.requestData,f={};f.skeletonData=a.skeletonData;f.resourceInfo=a.resourceInfo;f.glyphData=
a.glyphData;f.fragmentResources=a.fragmentResources;f.contentRange={skeletonId:a.skeletonId,startPosition:a.fragmentsStartPosition,endPosition:a.fragmentsEndPosition};f.fragmentData=a.loadedFragments;var n=a.overallLoadMetrics;a.glyphData=null;a.fragmentResources=null;var a=a.loadedFragments=null,l=n.createSubTimer("(YIELD) finish-content-fetch");setTimeout(function(){l.endTimer();n.endTimer();b.resolve(k,f);f=k=null},KindleRendererDeviceSpecific.drawYieldUpdateTime())}}function k(a){a.fragmentData=
null;a.fragmentMetadata=null;a.paraData=null}function j(a){return l[a]}var l=null,q=null,o=[],p,n={};return{initialize:function(a){o=[];p=KindleRendererDeviceSpecific.glyphCacheMaxSize();n={};q=a;var d=new jQuery.Deferred;q.getFragmentMap(function(a){l=a.fragmentArray;q.getManifest?q.getManifest(function(e){KindleRendererImageRenderer.initialize(e);d.resolve(a,e)},function(){d.resolve(a,null)}):d.resolve(a)},function(){d.reject()});return d.promise()},cleanup:function(){q=l=null;o=[];n={};KindleRendererImageRenderer.cleanup()},
loadNextFragmentGroup:function(d,e,c){function k(a){m(t)?t=null:(p.endTimer(),b(a,t))}function f(){if(t!==null){var a=t.requestData;t.fragmentLoadMetrics.addCount("Failure",1);t.fragmentLoadMetrics.endTimer();t=null;l.reject("Error trying to download skeleton.",a)}}function j(){J.endTimer();m(t)?t=null:(p=t.overallLoadMetrics.createSubTimer("skeletons"),n[d]!==void 0?k(n[d]):q.getBookSkeleton(k,f,d))}var l=new jQuery.Deferred,e=g(e),o=c.metrics.createSubTimer("content-fetch"),p,e=h(d,e),e=g(e),H=
e.fragmentList.slice(),t={deferredResult:l,skeletonId:d,fragmentsStartPosition:e.startPosition,fragmentsEndPosition:e.endPosition,overallLoadMetrics:o,loadedFragments:{},fragmentsToLoad:H,numFragmentsLoaded:0,requestData:c},J=o.createSubTimer("(YIELD) begin-content-fetch");H.length===0?a(t):setTimeout(j,KindleRendererDeviceSpecific.drawYieldUpdateTime());return l.promise()},isContentRangeLoaded:function(a,d,e,c){if(a===null||a===void 0||!d||e===null||e===void 0||!c)return!1;if(a!==e)return!1;d=g(d);
c=g(c);a=h(a,d);e=h(e,c);if(e.fragmentList.length>a.fragmentList.length)return!1;for(c=0;c<e.fragmentList.length;++c)if(a.fragmentList.indexOf(e.fragmentList[c])===-1)return!1;return!0}}}(),KindleRendererFragmentLoader=function(){function g(a){for(var e=0;e<c.length;e++){var b=c[e];if(b.start<=a&&a<=b.end)return e}return 0}function m(d){a=d;var e=new jQuery.Deferred;KindleRendererContentFragmentation.initialize(a).then(function(a){var d=[],l,q=a.fragmentArray;for(l=0;l<q.length;l+=1){var o=q[l].sId,
g=l===0?q[l].cPos:Math.min(q[l].cPos,q[l-1].ePos+1),n=q[l].ePos,s=d[o];if(s===void 0)d[o]={start:g,end:n};else{if(g<s.start)s.start=g;if(n>s.end)s.end=n}}if(a.skeletonMap!==void 0)for(l=0;l<a.skeletonMap.length;++l)if(d[l])d[l].properties=a.skeletonMap[l].properties;c=d;b=a.fragmentArray;f=a.fragmentMetadata.bookType;e.resolve()},e.reject);return e.promise()}function h(d,e,c){a.getBookFragments(function(a){KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeOnContentReceived(),
e.type,function(){var d=a.fragmentMetadata.id,f=b[d],o,g;o=a.fragmentMetadata.lId===void 0||a.fragmentMetadata.lId===null?f.lId:a.fragmentMetadata.lId;g=a.fragmentMetadata.nOff===void 0||a.fragmentMetadata.nOff===null?f.off:a.fragmentMetadata.nOff;var n=document.createElement("DIV");n.id=o;n.setAttribute("data-nid",o);n.innerHTML=a.fragmentData;o=n.childNodes;for(var s=o.length,r=0;r<s;r+=1)o[r].ownChildIndex=g+r;c.resolve(e,{id:d,contentRange:{startPosition:f.cPos,endPosition:f.ePos},fragmentRoot:n,
positionData:{posMap:a.posMap}})})},function(){c.reject("Error trying to download file fragments ID : ",d)},[d])}var b=null,c=null,f=!1,a=null;return{initialize:function(a){return m(a)},cleanup:function(){KindleRendererContentFragmentation.cleanup();c=b=null;f=!1},loadFragments:function(a,e){var c=g(a.focus);return KindleRendererContentFragmentation.loadNextFragmentGroup(c,a,e)},getFragmentAtId:function(d,e){var c=new jQuery.Deferred;a?h(d,e,c):c.reject();return c.promise()},getFragmentIdForPosition:function(a,
e){var c;a:{for(var f=0;f<b.length-1;++f)if(c=e?b[f+1].cPos-1:b[f].ePos,a<=c){c=f;break a}c=b.length-1}return c},needToLoadFragments:function(a,e){var c;if(!a||!e)c=!0;else{c=g(a.startPosition);var b=g(e.focus);c=!KindleRendererContentFragmentation.isContentRangeLoaded(c,a,b,e)}return c},getMaximumPosition:function(){return b[b.length-1].ePos},getMinimumPosition:function(){return b[0].cPos},isPositionAtBeginningOfSkeletonOrDocument:function(a,e){return e<=b[0].cPos||e===c[a].start},isPositionAtEndOfSkeletonOrDocument:function(a,
e){return e>=b[b.length-1].ePos||e===c[a].end},getBookContentType:function(){return f},getSkeletonForPosition:function(a){return g(a)},getSkeletonRange:function(a){return{start:c[a].start,end:c[a].end}},getGroupInfo:function(a){if(c[a].properties&&c[a].properties.group)return c[a].properties.group;var e=a%2===0?a+1:a-1;return e<0||e>=this.getNumSkeletons()||c[e].properties&&c[e].properties.group?{start:a,length:1,spine:!0}:{start:Math.min(a,e),length:2,spine:!0}},isBlankPage:function(a){return!c[a].properties?
!1:c[a].properties.blank===!0},getNumSkeletons:function(){return c.length},getFragmentMap:function(){}}}(),KindleRendererPositionLoadingCalculator=function(){function g(){if(f>0)return f;var a,d;d=KindleRendererSettings.getSettings();if(KindleRendererFragmentLoader.getBookContentType()==="topaz")a=h.width/(25*d.glyphScale),d=h.height/(25*d.glyphScale);else{var e=d.fontSizes[m];a=h.width/(e*0.4);d=h.height/(e*d.lineSpacingMultiplier)}return Math.round(a*d)}var m=2,h={height:1,width:1},b=0,c=[],f=0;
return{updateScreenDimensions:function(a,d){h.width=a;h.height=d;f=_displayedScreenCount=_logSumPositionsDisplayed=0},updateDisplayedPositionRange:function(a){a>0&&(c[b]=a,b=(b+1)%10,f=0,f=Math.max.apply(Math,c))},calculateDesiredFragmentRangeForPageFlip:function(a,d){var e=KindleRendererFragmentLoader.getBookContentType()==="topaz",c=KindleRendererDeviceSpecific.fragmentBufferCapacityForPageFlip(e),b=g();c*=b;var f=Math.ceil(c*0.25),q=Math.ceil(c*0.75),c=KindleRendererFragmentLoader.getMinimumPosition(),
o=KindleRendererFragmentLoader.getMaximumPosition(),f=Math.max(c,a-f),q=Math.min(o,a+q),p=d.currentTopOfPage,n=d.currentBottomOfPage;e?(f=Math.min(f,Math.max(c,p-1)),q=Math.max(q,Math.min(o,n+1))):a<p&&p-a<3*b?q=Math.min(o,n+1):a>n&&a-n<3*b&&(f=Math.max(c,p-1));return{focus:a,startPosition:f,endPosition:q}},calculateDesiredFragmentRangeForGoTo:function(a){var d=g()*KindleRendererDeviceSpecific.fragmentBufferCapacityForGoTo(),e=Math.ceil(d*0.1),d=Math.ceil(d),c=KindleRendererFragmentLoader.getMinimumPosition(),
b=KindleRendererFragmentLoader.getMaximumPosition();return{focus:a,startPosition:Math.max(c,a-e),endPosition:Math.min(b,Math.max(c+d,a+d))}}}}(),KindleRendererRequestId=function(){var g=0;return{getUniqueRequestId:function(){g+=1;return g}}}(),KindleRendererIframeLoading=function(){function g(){window.focus()}function m(a){a.ctrlKey&&a.preventDefault();switch(a.which){case 219:case 221:a.shiftKey||a.preventDefault();break;case 37:case 38:case 33:case 39:case 40:case 34:case 32:case 8:a.preventDefault()}}
function h(a,d){var e=d.ownerDocument.createEvent("CustomEvent");e.initCustomEvent(a.type,!0,!0,a);d.dispatchEvent(e)}function b(a,d){var e=d.ownerDocument.createEvent("MSPointerEvent");e.initPointerEvent(a.type,!0,!0,window.parent,a.detail,a.screenX,a.screenY,a.clientX,a.clientY,a.ctrlKey,a.altKey,a.shiftKey,a.metaKey,a.button,null,a.offsetX,a.offsetY,a.width,a.height,a.pressure,a.rotation,a.tiltX,a.tiltY,a.pointerId,a.pointerType,a.hwTimestamp,a.isPrimary);d.dispatchEvent(e)}function c(a,d){var e;
a.type==="mousewheel"?(a.preventDefault(),e=d.ownerDocument.createEvent("WheelEvent"),e.initWheelEvent(a.type,!0,!0,window.parent,-1*a.wheelDelta,a.screenX,a.screenY,a.clientX,a.clientY,a.button,null,null,a.deltaX,a.deltaY,a.deltaZ,a.deltaMode)):(e=d.ownerDocument.createEvent("MouseEvent"),e.initMouseEvent(a.type,!0,!0,window.parent,a.detail,a.screenX,a.screenY,a.clientX,a.clientY,a.ctrlKey,a.altKey,a.shiftKey,a.metaKey,a.button,null));d.dispatchEvent(e)}function f(a){var d=a.contentDocument.getElementsByTagName("body")[0];
d.className+=" amzUserPref";var e=a.contentDocument.getElementsByTagName("head")[0];KindleRendererDefaults.addCSSRules(e,KindleRendererFragmentLoader.getBookContentType());KindleRendererSettings.addCSSRules(a.contentDocument,e);KindleRendererContentScripts.addInterfaceScripts(a);d.onmousewheel=function(d){c(d,a);return!1};a.contentWindow.onkeydown=function(d){m(d);h(d,a)};a.contentWindow.onkeyup=function(d){m(d);h(d,a)};a.contentWindow.onkeypress=function(d){m(d);h(d,a)};if(KindleRendererSettings.useNativeSelection()){if(window.navigator.msPointerEnabled)d.onmspointerdown=
function(d){b(d,a)},d.onmspointerup=function(d){b(d,a)},d.onmspointermove=function(d){b(d,a)},d.onmspointerout=function(d){b(d,a)},d.onmspointercancel=function(d){b(d,a)},d.onmspointerover=function(d){b(d,a)},d.onmspointerhover=function(d){b(d,a)},d.addEventListener("MSGestureHold",function(a){a.preventDefault()},!1);d.oncontextmenu=function(d){b(d,a);d.preventDefault()};d.onclick=function(d){c(d,a)};d.ondblclick=function(d){c(d,a)};d.onmousedown=function(d){c(d,a)};d.onmouseup=function(d){c(d,a)};
d.onmousemove=function(d){c(d,a)};d.onmouseover=function(d){c(d,a)};d.onmouseout=function(d){c(d,a)}}else a.contentWindow.onfocus=g,a.contentWindow.onclick=g,d.onselectstart=function(){return!1}}function a(a){if(a=a.getElementsByTagName("body")[0])for(;a.hasChildNodes();)a.removeChild(a.lastChild)}function d(a,e){if(a&&a.nodeType===Node.ELEMENT_NODE){var c=a.getAttribute("data-nid");c!==null&&(e[c]={linkNode:a,typeArray:[a.firstChild,a.nextSibling]});for(var c=a.childNodes,b=c.length,f=0;f<b;f+=1)d(c[f],
e)}}function e(a){var e={};try{if((window.ActiveXObject||"ActiveXObject"in window)&&window.XMLHttpRequest)d(a.contentDocument.body,e);else for(var c=(new XPathEvaluator).evaluate("//*[@data-nid]",a.contentDocument,null,XPathResult.UNORDERED_NODE_ITERATOR_TYPE,null),b=c.iterateNext();b;){var f=b.getAttribute("data-nid");e[f]={linkNode:b,typeArray:[b.firstChild,b.nextSibling]};b=c.iterateNext()}}catch(k){d(a.contentDocument.body,e)}return e}function k(a){var d=[],e;for(e in a)d.push(parseInt(e,10));
d.sort(function(a,d){return a-d});return d}function j(a,d,e,c){function b(){if(I!==null)F.insertBefore(I,K),I=null,A.lId=null,A.lt=-1}function f(){l=e.fragmentData[N[L]];q=l.fragmentMetadata;if(A.lId!==q.lId||A.lt!==q.lt){b();A.lId=q.lId;A.lt=q.lt;G=d[q.lId];if(G===void 0){var k=d,O=q.lId,P=a.contentDocument.getElementById(O);k[O]={linkNode:P,typeArray:[P.firstChild,P.nextSibling]};G=d[q.lId]}I=q.lt===0?G.linkNode:G.linkNode.parentNode;F=I.parentNode;K=I.nextSibling;I=F.removeChild(I)}M=a.contentDocument.createElement(I.tagName);
M.innerHTML=l.fragmentData;k=e.fragmentResources;O=l.resList===void 0?l.imageData:l.resList;if(k||O)for(var P=$(M).find("img"),T=0,U=0;U<P.length;U+=1){T=P[U].getAttribute("dataUrl");if(T===void 0||T===null)T=P[U].getAttribute("src");KindleRendererImageRenderer.loadImage(P[U],k,O,T)}for(k=q.nOff;M.hasChildNodes();){O=M.removeChild(M.firstChild);if(O.nodeType===Node.TEXT_NODE)O.ownChildIndex=k;I.insertBefore(O,G.typeArray[q.lt]);k+=1}if(l.posMap!==void 0){p=!0;for(var R in l.posMap)o[R]=l.posMap[R]}l.wordList!==
void 0&&(h=!0,g=g.concat(l.wordList));if(l.paraIds!==void 0&&l.paraIds!==null){y=!0;for(R=0;R<l.paraIds.length;R+=1)m[l.paraIds[R]]=l.paraData[R];for(var S in l.imageData)B[S]=l.imageData[S]}l.fragmentData=null;l.imageData=null;l.paraData=null;L+=1;if(L<N.length)L%50===49?setTimeout(f,0):KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeLoadNextFragment(),c.type,f);else{b();K=I=F=l=null;S={positionData:{}};if(p)S.positionData.posMap=o;if(h)S.positionData.wordList=g;if(y)S.glyphData=
{paraData:m,imageData:B};j.resolve(S)}}var j=$.Deferred(),l,q,o={},g=[],p=!1,h=!1,m={},B={},y=!1,M=null,A={lId:null,lt:-1},G=null,F=null,I=null,K=null,N=k(e.fragmentData),L=0;KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeLoadNextFragment(),c.type,f);return j.promise()}function l(a,d,e){KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeBeforeBulkWriteToIframe(),e.type,function(){KindleHostDeviceDetector.isFirefox&&KindleHostDeviceDetector.isFirefox()||
KindleHostDeviceDetector.isMSEdge&&KindleHostDeviceDetector.isMSEdge()?d.open("text/html","replace"):d.open();d.write(a);KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeAfterBulkWriteToIframe(),e.type,function(){d.close()})})}function q(a){a=a.replace(/-webkit-writing-mode\s*:\s*([a-z\-]+)/g,"writing-mode: $1; $&");a=a.replace(/-webkit-text-combine\s*:\s*horizontal/g,"text-combine-upright: all; $&");a=a.replace(/-webkit-text-emphasis\s*:\s*([a-z\-]+)/g,"text-emphasis: $1; $&");
a=a.replace(/-webkit-text-emphasis-color\s*:\s*([a-z\-]+)/g,"text-emphasis-color: $1; $&");a=a.replace(/-webkit-text-emphasis-style\s*:\s*([a-z\-\s]+)/g,"text-emphasis-style: $1; $&");return a=a.replace(/:first-letter/g,":-disabled-first-letter")}function o(d,e,c,b){if(d.processingRequestId.id===e.requestId){c.skeletonData=q(c.skeletonData);var k=d.contentDocument;d.screenManager=null;a(k);KindleGlyphRenderer.clearIframeData(d);d.onload=function(){KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeAfterIframeLoaded(),
e.type,function(){if(d.processingRequestId.id===e.requestId){d.onload=null;var a=KindleRendererSettings.getSettings(),k=$(d).parent(),k={height:k.height(),width:k.width()},j=e.contentLoadMetrics.createSubTimer("css-style-sanitization");KindleRendererContentStyleSanitization.sanitizeCSS(d.contentDocument,a,k);j.endTimer();f(d);d.writingMode=KindleRendererWritingModeFactory.buildIFrameWritingMode(d);d.writingMode.resetIframeDimensions(d);p(d,e,c,b)}})};l(c.skeletonData,k,e)}}function p(a,d,c,b){function k(a){b.reject(d,
a)}var f=e(a),l=d.contentLoadMetrics.createSubTimer("fragment-loading"),q;try{q=j(a,f,c,d)}catch(o){k(o);return}q.then(function(e){l.endTimer();var c=KindleRendererSettings.getSettings(),f=$(a).parent(),f={height:f.height(),width:f.width()},j=d.contentLoadMetrics.createSubTimer("node-style-sanitization");KindleRendererContentStyleSanitization.sanitizeContent(a.contentDocument,c,f).then(function(){j.endTimer();b.resolve(d,e)},k)},k)}return{loadIframe:function(a,d,e){var c=new jQuery.Deferred;a.processingRequestId.id===
d.requestId?o(a,d,e,c):c.reject();return c.promise()},copyIframeContents:function(d,e,c){function b(){KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeAfterIframeLoaded(),d.type,function(){if(c.processingRequestId.id===d.requestId)f(c),KindleRendererContentStyleSanitization.copySanitizationData(e.contentDocument,c.contentDocument),KindlePaginator.copyIframe(e,c),c.onload=null,c.writingMode.prepareForPagination(c),k.resolve(d)})}var k=new jQuery.Deferred,j,q;c.processingRequestId.id===
d.requestId?(q=e.contentDocument.getElementsByTagName("html")[0],a(c.contentDocument),c.writingMode.resetHeight(c),c.onload=b,j=q.outerHTML,j===void 0&&(j="<html>"+q.innerHTML+"</html>"),l(j,c.contentDocument,d)):k.reject();return k.promise()},cleanupIframe:function(d){a(d.contentDocument)},updateSettingsInIframe:function(a){if(a&&a.contentDocument){var d=a.contentDocument.getElementsByTagName("head")[0];if(d){KindleRendererSettings.addCSSRules(a.contentDocument,d);var d=KindleRendererSettings.getSettings(),
e={height:$(a).parent().height(),width:$(a).parent().width()},c=KindleMetricsProfiler("style-sanitization");KindleRendererContentStyleSanitization.sanitizeCSS(a.contentDocument,d,e);KindleRendererContentStyleSanitization.sanitizeContent(a.contentDocument,d,e);c.endTimer()}}}}}(),KindleRendererIframeManagerFactory=function(){function g(b){b.cancelCurrentRequest=function(){if(this.currentRequest)this.currentRequest.cancelled=!0,this.currentRequest=null};b.createNewRequest=function(a,d){this.cancelCurrentRequest();
this.currentRequest={type:a,requestId:KindleRendererRequestId.getUniqueRequestId(),metrics:KindleMetricsProfiler("iframe-load"),retryCount:0,initialPosition:d};this.currentRequestDfd=new jQuery.Deferred};b.willRetryCurrentRequest=function(){this.currentRequest&&this.currentRequest.retryCount++};b.canRetryCurrentRequest=function(){return this.currentRequest?this.currentRequest.retryCount<d:!0};b.getCurrentProcessDfd=function(){return this.currentRequestDfd.promise()};b.getCurrentProcessId=function(){return this.currentRequest.requestId};
b.createIframe=function(a,d,c){var b=document.createElement("iframe");b.writingMode=KindleRendererWritingModeFactory.buildIFrameWritingMode(b);b.index=c;b.processingRequestId={};b.computingRectsId={};b.setAttribute("frameBorder","0");b.setAttribute("id",d+"_frame_"+c);b.setAttribute("name","book_iframe_"+c);b.setAttribute("scrolling","no");b.setAttribute("tabindex",-1);$(b).css({height:"100%",width:a+"px",position:"absolute","margin-top":"0px",left:"0px",visibility:"hidden","z-index":e});return b};
b.setIframeVisibility=function(a,d){if(this.showContent||!d)if(d){if($(a).css({visibility:"visible","z-index":0,"margin-top":"0px"}),$(a.pageOverflowDiv).css({visibility:"visible","z-index":0}),KindleHostDeviceDetector.hasImageRenderingProblem&&KindleHostDeviceDetector.hasImageRenderingProblem()){var c=a.contentDocument.querySelector("img[data-repaint-on-show]");if(c){var b=function(){c.style.borderColor="#FFF"};setTimeout(b,1);setTimeout(b,1500)}}}else $(a).css({visibility:"hidden","z-index":e,"margin-top":k+
"px"}),$(a.pageOverflowDiv).css({visibility:"hidden","z-index":e})};b.calculateIframePaginationData=function(d,e,c){var b=this,k=KindleRendererFragmentLoader.getBookContentType()==="topaz"?b.currentRequest.type===b.loadedType.PREVIOUS?KindleRendererIframePreparation.CANVAS_INSERTION_PREVIOUS:KindleRendererIframePreparation.CANVAS_INSERTION_NEXT:KindleRendererIframePreparation.CANVAS_INSERTION_NONE;KindleRendererIframePreparation.prepareIframe(d,b.currentRequest,e,c,k).then(function(a){if(d.processingRequestId.id===
a.requestId&&b.currentRequest&&b.currentRequest.requestId===a.requestId)d.processingRequestId.id=null,b.frameIsLoadedAndReady(d);b=null},function(d){b.currentRequest&&b.currentRequest.requestId===d.requestId&&b.currentRequestDfd.reject(a);b=null})};b.loadContentDataIntoIframe=function(a){var d=this;d.currentRequest.contentLoadMetrics=d.currentRequest.metrics.createSubTimer("content-load");var e=d.getIframeToLoad();if(e)d.contentRange[e.index]=a.contentRange,e.processingRequestId.id=d.currentRequest.requestId,
e.computingRectsId.id=null,KindleRendererIframeLoading.loadIframe(e,d.currentRequest,a).then(function(c,b){if(e.processingRequestId.id===c.requestId&&d.currentRequest&&d.currentRequest.requestId===c.requestId)d.positionData[e.index]=b.positionData,d.calculateIframePaginationData(e,a,b);d=null},function(a){d.currentRequest&&d.currentRequest.requestId===a.requestId&&d.currentRequestDfd.reject(f);d=null})};b.loadFragmentsForRange=function(a){var d=this;KindleRendererFragmentLoader.loadFragments(a,d.currentRequest).then(function(a,
e){d.currentRequest&&d.currentRequest.requestId===a.requestId&&d.loadContentDataIntoIframe(e);d=null},function(a,e){d.currentRequest&&d.currentRequest.requestId===e.requestId&&d.currentRequestDfd.reject(c);d=null})};b.resizeWithoutReload=function(d){var e=this,c=this.iframes[d];c.processingRequestId.id=this.currentRequest.requestId;e.setIframeVisibility(c,!1);e.currentRequest.contentLoadMetrics=e.currentRequest.metrics.createSubTimer("content-load");KindleRendererContentReflow.reflow(c,this.currentRequest,
this.positionData[d]).then(function(){e.currentRequest&&e.currentRequest.requestId===c.processingRequestId.id&&(e.frameIsLoadedAndReady(c),e.setIframeVisibility(c,c.index===e.visibleIframeIndex));e=null},function(){e.currentRequest&&e.currentRequest.requestId===c.processingRequestId.id&&(e.setIframeVisibility(c,c.index===e.visibleIframeIndex),e.currentRequestDfd.reject(a));e=null})};b.setCanPreloadNext=function(a){this.canPreloadNext=a};b.setCanPreloadPrevious=function(a){this.canPreloadPrevious=
a};b.getIframeOrigin=function(a){a=$(this.iframes[a]);return{x:parseInt(a.css("left"),10),y:parseInt(a.css("top"),10)}};b.getBoundsWithOffset=function(a,d){if(a.getBoundingClientRect){var e=a.getBoundingClientRect();if(e)return{top:e.top+d.y,right:e.right+d.x,bottom:e.bottom+d.y,left:e.left+d.x,width:e.width,height:e.height}}return null}}function m(a,d){a.gotoPosition=function(a,e){return d.gotoPosition(a,e)};a.nextScreen=function(){return d.nextScreen()};a.previousScreen=function(){return d.previousScreen()};
a.copyIframeData=function(a){return d.copyIframeData(a.internal)};a.hasNextScreen=function(){return d.hasNextScreen()};a.hasPreviousScreen=function(){return d.hasPreviousScreen()};a.getPagePositionRange=function(){return d.getPagePositionRange()};a.getCurrentPosition=function(){return d.getCurrentPosition()};a.getSelectableItemBoundaries=function(){return d.getSelectableItemBoundaries()};a.getWordPositions=function(){return d.getWordPositions()};a.reloadAnnotations=function(){d.reloadAnnotations()};
a.updateGlyphColor=function(){d.updateGlyphColor()};a.handleClick=function(a,e){return d.handleClick(a,e)};a.cleanup=function(){d.cleanup()};a.updateSettings=function(a){d.updateSettings(a)};a.reloadNotification=function(){d.reloadNotification()};a.resizeNotification=function(){d.resizeNotification()};a.setAnnotationEventCallback=function(a){d.setAnnotationEventCallback(a)};a.getCurrentProcessDfd=function(){return d.getCurrentProcessDfd()};a.getComputedRectsDfd=function(){return d.getComputedRectsDfd()};
a.getCurrentProcessId=function(){return d.getCurrentProcessId()};a.show=function(){d.show()};a.hide=function(){d.hide()};a.getContentRects=function(){return d.getContentRects()};a.getZoomableAt=function(a,e,c){return d.getZoomableAt(a,e,c)};a.getZoomableList=function(a){return d.getZoomableList(a)};a.setOverlayManager=function(a){d.setOverlayManager(a)};a.setCanPreloadPrevious=function(a){d.setCanPreloadPrevious(a)};a.setCanPreloadNext=function(a){d.setCanPreloadNext(a)};a.drawWordMap=function(){d.drawWordMap()};
a.drawHeightMaps=function(){d.drawHeightMaps()};a.clearSelection=function(){d.clearSelection()};a.getSelection=function(){return d.getSelection()}}function h(a){a.showContent=!0;a.canPreloadNext=!0;a.canPreloadPrevious=!0}var b=0,c=b++,f=b++,a=b++,d=5,e=-1E3,k=1E4;return{DATA_LOAD_ERROR:c,IFRAME_ERROR_LOADING:f,IFRAME_ERROR_PAGINATING:a,build:function(a){if(KindleRendererSettings.useCSSRegions()){var d={};h(d,a);g(d);KindleRegionIframeManager.build(d,a);a={internal:d}}else KindleRendererSettings.getSettings().fixedContent?
(d={},h(d,a),g(d),KindleRendererIframeManagerFixedFactory.build(d,a),a={}):(d={},h(d,a),g(d),KindleRendererIframeManagerReflowFactory.build(d,a),a={internal:d});m(a,d);return a}}}(),KindleRendererIframeManagerFixedFactory=function(){function g(g){g.findNextNonBlankPage=function(b,c){var f=this.findNextNonBlankPageInDirection(b,c);f===null&&(f=this.findNextNonBlankPageInDirection(b,!c));return f};g.findNextNonBlankPageInDirection=function(b,c){for(var f=b,a=KindleRendererFragmentLoader.getNumSkeletons();f>=
0&&f<a;){if(KindleRendererFragmentLoader.isBlankPage(f)===!1)return f;c?f+=1:f-=1}return null};g.getNeededSkeletonsFrom=function(b,c){for(var f=this.getSkeletonsToShowWith(b,c),a=0;a<f.length;a++)if(KindleRendererFragmentLoader.isBlankPage(f[a])===!1)return f;a=this.findNextNonBlankPage(c?Math.max.apply(Math,f)+1:Math.min.apply(Math,f)-1,c);return a===null?f:this.getSkeletonsToShowWith(a,c)};g.addSkeletonRangeToList=function(b,c,f){for(var a=0;a<f;a+=1)b.push(c+a)};g.getSkeletonsToShowWith=function(b,
c){var f=KindleRendererFragmentLoader.getGroupInfo(b);if(f.length>this.numberOfColumns){var a=[];this.addSkeletonRangeToList(a,b,Math.min(this.numberOfColumns,f.length-(b-f.start)));return a}return this.getGroupsToFillScreen(f,c)};g.getGroupsToFillScreen=function(b,c){var f=[];this.addSkeletonRangeToList(f,b.start,b.length);var a;a=c?b.start+b.length:b.start-1;for(var d=KindleRendererFragmentLoader.getNumSkeletons();f.length<this.numberOfColumns&&a>=0&&a<d;){var e=KindleRendererFragmentLoader.getGroupInfo(a);
if(f.length+e.length<=this.numberOfColumns)this.addSkeletonRangeToList(f,a,e.length);else break;c?a+=e.length:a-=e.length}return f};g.getNeededSkeletonsForGoTo=function(b){return this.getNeededSkeletonsFrom(KindleRendererFragmentLoader.getSkeletonForPosition(b),!0)};g.getNeededSkeletonsForPageFlip=function(b){var c=this.getCurrentlyVisibleSkeletons();return b>0?(b=Math.max.apply(Math,c),b=Math.min(b+1,KindleRendererFragmentLoader.getNumSkeletons()),this.getNeededSkeletonsFrom(b,!0)):(b=Math.min.apply(Math,
c),b=Math.max(b-1,0),this.getNeededSkeletonsFrom(b,!1))};g.clearCacheReservations=function(){for(var b=this.iframeStatus.length,c=0;c<b;c++)if(this.iframeStatus[c]===this.statusType.RESERVED)this.iframeStatus[c]=this.statusType.AVAILABLE};g.getLoadedSkeletons=function(){for(var b={},c=this.contentRange.length,f=0;f<c;f++)this.contentRange[f]&&this.iframes[f].processingRequestId.id===null&&(b[this.contentRange[f].skeletonId]=f);return b};g.reserveSkeletonsInCache=function(b){this.clearCacheReservations();
for(var c=this.getLoadedSkeletons(),f=[],a=0;a<b.length;a++){var d=b[a],e=c[d];if(e===void 0)f.push(d);else if(this.iframeStatus[e]===this.statusType.AVAILABLE)this.iframeStatus[e]=this.statusType.RESERVED}return f};g.getIndicesToShow=function(b){for(var c=this.getLoadedSkeletons(),f=[],a=0;a<b.length;a++)f.push(c[b[a]]);return f};g.shouldShowSpineAfterSkeleton=function(b){var b=this.contentRange[b].skeletonId,c=KindleRendererFragmentLoader.getGroupInfo(b),f=c.start+c.length-1;return c.spine||b===
f?!0:!1};g.getSpineCountForIndicies=function(b){var c=0;for(i=0;i<b.length-1;i++)this.shouldShowSpineAfterSkeleton(b[i])&&c++;return c};g.prepareSpine=function(){var b={position:"absolute",visibility:"visible","background-color":this.spineColor,"z-index":m},c=this.getAvailableSpine();$(c).css(b);return c};g.getAvailableSpine=function(){for(i=0;i<this.spines.length;i++)if(this.spines[i].status===this.statusType.AVAILABLE)return this.spines[i];var b=document.createElement("div");this.parent.appendChild(b);
b.status=this.statusType.RESERVED;this.spines.push(b);return b};g.removeAllSpines=function(){for(i=0;i<this.spines.length;i++)$(this.spines[i]).css("visibility","hidden"),this.spines[i].status=this.statusType.AVAILABLE};g.isRTLProgression=function(){var b=KindleRendererSettings.getSettings().pageProgressionDirection;return b?b.value===b.RTL:!1};g.prepareDisplayElements=function(b,c,f){for(var a,d=[],e=0;e<b.length;e++){a=this.iframes[b[e]];var k=KindleRendererElementFitting.resize(a.contentDocument.body,
c),j=Math.round((c.height-k.height)*0.5)+"px";$(a).css({top:j,height:k.height+"px",width:k.width+"px"});d.push(a);if(e!==b.length-1&&this.shouldShowSpineAfterSkeleton(b[e])){var g=this.prepareSpine();$(g).css({top:j,height:k.height+"px",width:this.columnGap+"px"});d.push(g)}this.iframeStatus[a.index]=this.statusType.VISIBLE;this.setIframeVisibility(a,!0);f[a.index]=!1}return d};g.placeElementsHorizontally=function(b,c){var f=0,a;for(a=0;a<b.length;a++)f+=$(b[a]).width();var d,e=Math.floor((c-f)*0.5);
for(a=0;a<b.length;a++)f=b[a],d=$(f).width(),$(f).css({left:this.isRTLProgression()?c-(e+d):e}),e+=d};g.showSkeletons=function(b){var b=this.getIndicesToShow(b.sort(function(a,d){return a-d})),c=this.getCurrentlyVisibleIndices(),f={},a;for(a=0;a<c.length;a++)f[c[a]]=!0;if(b.length>0){var d=$(this.parent).height(),c=$(this.parent).width(),d={width:Math.round((c-this.columnGap*this.getSpineCountForIndicies(b))/b.length),height:d};this.removeAllSpines();this.placeElementsHorizontally(this.prepareDisplayElements(b,
d,f),c)}for(a in f)if(f[a])this.iframeStatus[a]=this.statusType.AVAILABLE,this.setIframeVisibility(this.iframes[a],!1)};g.getCurrentlyVisibleIndices=function(){for(var b=[],c=this.iframeStatus.length,f=0;f<c;f++)this.iframeStatus[f]===this.statusType.VISIBLE&&b.push(f);return b};g.getSkeletonsFromIndices=function(b){for(var c=[],f=0;f<b.length;f++){var a=this.contentRange[b[f]];a&&c.push(a.skeletonId)}return c};g.getCurrentlyVisibleSkeletons=function(){return this.getSkeletonsFromIndices(this.getCurrentlyVisibleIndices())};
g.getPrioritizedPreloadList=function(b){var c=b.slice(0);if(b.length>0)for(var f=KindleRendererFragmentLoader.getNumSkeletons(),a=this.iframes.length,d=Math.min.apply(Math,b),b=Math.max.apply(Math,b);c.length<a&&(d>0||b<f-1);){var e;for(e=0;e<this.numberOfColumns&&b<f-1&&c.length<a;e++)b++,c.push(b);for(e=0;e<this.numberOfColumns&&d>0&&c.length<a;e++)d--,c.push(d)}return c};g.getLowestPriority=function(b){for(var c=this.iframes.length,f=0,a=-1,d=0;d<c;d++){var e=this.contentRange[d];if(!e)return{iframeIndex:d,
priorityRating:-Infinity};if(this.iframeStatus[d]===this.statusType.AVAILABLE)if(e=$.inArray(e.skeletonId,b),e===-1)return{iframeIndex:d,priorityRating:-Infinity};else e>a&&(a=e,f=d)}return{iframeIndex:f,priorityRating:c-a}};g.pickSkeletonToPreload=function(b){for(var c=this.getLoadedSkeletons(),f=0;f<b.length;f++)if(c[b[f]]===void 0)return{skeletonId:b[f],priorityRating:b.length-f};return null};g.considerLoadingMoreSkeletons=function(){if(!this.currentRequest){var b=this.getPrioritizedPreloadList(this.getCurrentlyVisibleSkeletons()),
c=this.pickSkeletonToPreload(b);if(c!==null&&this.getLowestPriority(b).priorityRating<c.priorityRating)this.createNewRequest(this.loadedType.PRELOAD,null),this.currentRequest.skeletons=[c.skeletonId],this.loadFragmentsForRange(this.getDesiredRangeForSkeleton(c.skeletonId))}};g.updateSettings=function(b){if(b.columns!==void 0){if(b.columns.num!==void 0)this.numberOfColumns=b.columns.num;if(b.columns.gap!==void 0)this.columnGap=b.columns.gap;if(b.columns.spineColor!==void 0)this.spineColor=b.columns.spineColor}};
g.getIframeToLoad=function(){return this.currentRequest?this.iframes[this.getLowestPriority(this.getPrioritizedPreloadList(this.currentRequest.type===this.loadedType.PRELOAD?this.getCurrentlyVisibleSkeletons():this.currentRequest.skeletons)).iframeIndex]:null};g.getDesiredRangeForSkeleton=function(b){b=KindleRendererFragmentLoader.getSkeletonRange(b);return{focus:b.start,startPosition:b.start,endPosition:b.end}};g.frameIsLoadedAndReady=function(){var b=this.currentRequest,c=this.reserveSkeletonsInCache(b.skeletons);
c.length>0?this.loadFragmentsForRange(this.getDesiredRangeForSkeleton(c[0])):(b.type===this.loadedType.PRELOAD&&this.clearCacheReservations(),b.initialPosition!==null&&this.showSkeletons(b.skeletons),b.metrics.endTimer(),b.metrics.log(),this.currentRequest=null,setTimeout(this.currentRequestDfd.resolve,10),b.type!==this.loadedType.PAGE_FLIP&&this.considerLoadingMoreSkeletons())};g.pageFlip=function(b){var b=this.getNeededSkeletonsForPageFlip(b),c=this.reserveSkeletonsInCache(b),f=Math.max.apply(Math,
b);this.currentPosition=KindleRendererFragmentLoader.getSkeletonRange(f).start;if(c.length>0)return this.createNewRequest(this.loadedType.PAGE_FLIP,null),this.currentRequest.skeletons=b,this.loadFragmentsForRange(this.getDesiredRangeForSkeleton(c[0])),!1;this.showSkeletons(b);this.considerLoadingMoreSkeletons();return!0};g.nextScreen=function(){return this.pageFlip(1)};g.previousScreen=function(){return this.pageFlip(-1)};g.gotoPosition=function(b,c){var f=this.getNeededSkeletonsForGoTo(b),a=this.reserveSkeletonsInCache(f);
if(c){var d=Math.max.apply(Math,f);this.currentPosition=KindleRendererFragmentLoader.getSkeletonRange(d).start}if(a.length>0)return this.createNewRequest(this.loadedType.GOTO,b),this.currentRequest.skeletons=f,this.loadFragmentsForRange(this.getDesiredRangeForSkeleton(a[0])),!1;this.clearCacheReservations();this.showSkeletons(f);return!0};g.getPagePositionRange=function(){var b=this.getCurrentlyVisibleIndices();if(b.length===0)return null;for(var c=Infinity,f=-Infinity,a=0;a<b.length;a++)var d=this.contentRange[b[a]],
c=Math.min(c,d.startPosition),f=Math.max(f,d.endPosition);return{currentTopOfPage:c,currentBottomOfPage:f}};g.getCurrentPosition=function(){return this.currentPosition};g.cleanup=function(){this.cancelCurrentRequest();for(var b=0;b<this.iframes.length;b++)KindleRendererIframeLoading.cleanupIframe(this.iframes[b]),KindlePaginator.cleanupIframe(this.iframes[b]),this.contentRange[b]=null,this.positionData[b]=null;KindleRendererFragmentLoader.cleanup();this.iframes=null};g.hasNextScreen=function(){for(var b=
this.getCurrentlyVisibleSkeletons(),c=KindleRendererFragmentLoader.getNumSkeletons()-1,f=0;f<b.length;f++)if(b[f]===c)return!1;return!0};g.hasPreviousScreen=function(){for(var b=this.getCurrentlyVisibleSkeletons(),c=0;c<b.length;c++)if(b[c]===0)return!1;return!0};g.getSortedVisibleIndicies=function(){for(var b,c=[],f=this.getCurrentlyVisibleIndices(),a=0;a<f.length;a++){b=f[a];var d=this.contentRange[b].skeletonId;KindleRendererFragmentLoader.isBlankPage(d)||c.push([d,b])}c.sort(function(a,d){return a[0]-
d[0]});b=[];for(a=0;a<c.length;a++)b.push(c[a][1]);return b};g.getContentRects=function(){for(var b=this.getSortedVisibleIndicies(),c=[],f=0;f<b.length;f++){var a=b[f],d=this.iframes[a],a=this.getIframeOrigin(a);c.push(this.getBoundsWithOffset(d.contentDocument.body,a))}return c};g.getZoomableAt=function(b,c,f){for(var a=this.getCurrentlyVisibleIndices(),d=0;d<a.length;d++){var e=a[d],k=$(this.iframes[e]),k={x:b.x+parseInt(k.css("left"),10),y:b.y+parseInt(k.css("top"),10)};if(e=KindleRendererZoomablesFactory.buildFromCoord(this.iframes[e].contentDocument,
k,c,f))return e}return null};g.getZoomableList=function(b){for(var c=[],f=this.getSortedVisibleIndicies(),a=0;a<f.length;a++)var d=f[a],e=$(this.iframes[d]),e={x:b.x+parseInt(e.css("left"),10),y:b.y+parseInt(e.css("top"),10)},c=c.concat(KindleRendererZoomablesFactory.buildList(this.iframes[d].contentDocument,e));return c};g.getSelectableItemBoundaries=function(){return{}};g.getComputedRectsDfd=function(){return null};g.getWordPositions=function(){return null};g.show=function(){this.showContent=!0;
for(var b=this.getCurrentlyVisibleIndices(),c=0;c<b.length;c++)this.setIframeVisibility(this.iframes[b[c]],!0)};g.hide=function(){this.showContent=!1;for(var b=this.getCurrentlyVisibleIndices(),c=0;c<b.length;c++)this.setIframeVisibility(this.iframes[b[c]],!1)};g.handleClick=function(b,c){for(var f=this.getCurrentlyVisibleIndices(),a,d=0;d<f.length;d++){var e=this.iframes[f[d]],k=e.offsetLeft,j=e.offsetTop,g=e.offsetHeight,q=e.offsetWidth;if(b>=k&&b<=k+q&&c>=j&&c<=j+g){a=e;break}}return a?(b-=parseInt(a.offsetLeft,
10),c-=parseInt(a.offsetTop,10),f=KindleRendererUtils.elementFromPoint(a.contentDocument,b,c),KindleRendererEventHandler.handleClick(a.contentDocument,f,{x:b,y:c})):!1};g.resizeNotification=function(){this.reloadNotification()};g.reloadNotification=function(){this.showSkeletons(this.getCurrentlyVisibleSkeletons())};g.reloadAnnotations=function(){};g.updateGlyphColor=function(){};g.setAnnotationEventCallback=function(){};g.setOverlayManager=function(){};g.copyIframeData=function(){}}var m=-1;return{build:function(h,
b){h.loadedType={PRELOAD:0,GOTO:1,PAGE_FLIP:2};h.statusType={AVAILABLE:0,RESERVED:1,VISIBLE:2};h.iframes=[];h.iframeStatus=[];h.contentRange=[];h.positionData=[];h.parent=b;for(var c=0;c<6;c+=1)h.iframes[c]=h.createIframe($(b).width(),b.name,c),h.iframeStatus[c]=h.statusType.AVAILABLE,h.contentRange[c]=null,h.positionData[c]=null,b.appendChild(h.iframes[c]);h.currentPosition=0;h.showContent=!0;h.numberOfColumns=1;h.columnGap=20;h.spineColor="transparent";h.spines=[];g(h)}}}(),KindleRendererIframeManagerReflowFactory=
function(){function g(b){b.getIframeToLoad=function(){return this.iframes[this.hiddenIframeIndex]};b.annotationClickedHandler=function(c){if(this.annotationEventCallback!==void 0){var b=c.currentTarget.parentNode,c=b.getAttribute("annotationType"),b=b.getAttribute("annotationStart");this.annotationEventCallback(c,b)}};b.renderAnnotations=function(c,b){var a=c.contentDocument.getElementById(h);a!==null&&a.parentNode.removeChild(a);if(this.overlayManager&&(a=this.overlayManager.getOverlaysInRange(b.startPosition,
b.endPosition))&&a.length>0)this.createAnnotationElements(c,a),c.writingMode.forceRepaint(c)};b.frameIsLoadedAndReady=function(c){var b=this,a=b.currentRequest;b.iframeLoadStatus[c.index]=a.type;var d=b.contentRange[c.index];b.renderAnnotations(c,d);var e=this.isStartOfSkeletonLoaded(c.index);a.initialPosition!==null?KindlePaginator.scrollToPosition(c,a.initialPosition,e):KindlePaginator.scrollToTop(c,e);if(!KindlePaginator.isIframePaginationValid(c)){if(b.canRetryCurrentRequest()){b.willRetryCurrentRequest();
b.resizeWithoutReload(c.index);return}KindlePaginator.clearIframePaginationValidation(c)}if(!KindlePaginator.hasNextScreen(c)&&!KindleRendererFragmentLoader.isPositionAtEndOfSkeletonOrDocument(d.skeletonId,d.endPosition))if(d=d.endPosition-d.startPosition,d<0)b.currentRequestDfd.reject(DATA_LOAD_ERROR);else{KindleRendererPositionLoadingCalculator.updateDisplayedPositionRange(d+1);var k=a.initialPosition;if(k===null)k=KindlePaginator.getCurrentPagePositionRange(c).currentTopOfPage;setTimeout(function(){b.reloadHiddenFrame(k)},
0)}else a.initialPosition!==null&&c===b.iframes[b.hiddenIframeIndex]&&(b.swapIframes(),this.updateDisplayedPositionsInPage()),a.metrics.endTimer(),a.metrics.log(),b.currentRequest=null,setTimeout(b.currentRequestDfd.resolve,10),c.computingRectsId.id=a.requestId,b.computedRectsDfd[c.index]=b.computeRectsInIframe(b.iframes[c.index],a.requestId),b.computedRectsDfd[c.index].then(function(){b.computedRectsDfd[c.index]=null;c.computingRectsId.id=null;!b.currentRequest&&a.type===b.loadedType.GOTO_POSITION&&
b.considerLoadingMoreFragments();b=null},function(){b=null})};b.reloadHiddenFrame=function(c){this.loadFragmentsForRange(KindleRendererPositionLoadingCalculator.calculateDesiredFragmentRangeForGoTo(c))};b.gotoPosition=function(c){$(this.iframes[this.visibleIframeIndex].contentDocument.body).find("#"+m).empty();this.createNewRequest(this.loadedType.GOTO_POSITION,c);c=KindleRendererPositionLoadingCalculator.calculateDesiredFragmentRangeForGoTo(c);KindleRendererFragmentLoader.needToLoadFragments(this.contentRange[this.visibleIframeIndex],
c)?this.loadFragmentsForRange(c):this.resizeWithoutReload(this.visibleIframeIndex);return!1};b.swapIframes=function(){this.iframeLoadStatus[this.visibleIframeIndex]=this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.NEXT?this.loadedType.PREVIOUS:this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.PREVIOUS?this.loadedType.NEXT:this.loadedType.EMPTY;this.iframeLoadStatus[this.hiddenIframeIndex]=this.loadedType.EMPTY;var c=this.visibleIframeIndex;this.visibleIframeIndex=this.hiddenIframeIndex;
this.hiddenIframeIndex=c;this.setIframeVisibility(this.iframes[this.visibleIframeIndex],!0);this.setIframeVisibility(this.iframes[this.hiddenIframeIndex],!1);this.iframes[this.hiddenIframeIndex].writingMode.resetHeight(this.iframes[this.hiddenIframeIndex])};b.getPagePositionRange=function(){var c=this.contentRange[this.visibleIframeIndex];if(c===null)return null;var b=KindlePaginator.getCurrentPagePositionRange(this.iframes[this.visibleIframeIndex]);if(b.currentTopOfPage===null||b.currentBottomOfPage===
null)b.currentTopOfPage=c.startPosition,b.currentBottomOfPage=c.endPosition;return b};b.getCurrentPosition=function(){var c=this.getPagePositionRange();return c?c.currentTopOfPage:null};b.getSelectableItemBoundaries=function(){return KindlePaginator.getSelectableItemBoundariesForCurrentScreen(this.iframes[this.visibleIframeIndex])};b.computeRectsInIframe=function(c,b){var a=KindleMetricsProfiler("rects-computation"),d=KindleRendererFragmentLoader.getBookContentType();return c.screenManager.wordMapGenerator.computeWordRects(c.contentDocument,
c.screenManager.wordMap,c.screenManager.wordMapKeys,c.writingMode,d,b,c.computingRectsId,a)};b.getComputedRectsDfd=function(){return this.computedRectsDfd[this.visibleIframeIndex]};b.getWordPositions=function(){return KindlePaginator.getWordPositionsForCurrentScreen(this.iframes[this.visibleIframeIndex])};b.causeReflowEventInBrowser=function(){var c=this.iframes[this.visibleIframeIndex].contentDocument.getElementsByTagName("html")[0],b=this.iframes[this.visibleIframeIndex].contentDocument.getElementsByTagName("body")[0];
c.removeChild(b);c.appendChild(b)};b.causeReflowEventInBrowserIfNeeded=function(){if(KindleRendererDeviceSpecific.needsReflowOnPageFlip()){var c=this;setTimeout(function(){c.causeReflowEventInBrowser()},KindleRendererDeviceSpecific.drawYieldUpdateTime())}};b.reloadAnnotations=function(){this.renderAnnotations(this.iframes[this.visibleIframeIndex],this.contentRange[this.visibleIframeIndex]);this.iframes[this.hiddenIframeIndex]!==null&&this.iframeLoadStatus[this.hiddenIframeIndex]!==this.loadedType.EMPTY&&
this.renderAnnotations(this.iframes[this.hiddenIframeIndex],this.contentRange[this.hiddenIframeIndex])};b.loadNextPages=function(){if(this.iframeLoadStatus[this.hiddenIframeIndex]!==this.loadedType.NEXT&&(this.currentRequest===null||this.currentRequest.type!==this.loadedType.NEXT)){var c=this.contentRange[this.visibleIframeIndex].endPosition+1,b=this.getPagePositionRange(),c=KindleRendererPositionLoadingCalculator.calculateDesiredFragmentRangeForPageFlip(c,b);this.createNewRequest(this.loadedType.NEXT,
null);this.loadFragmentsForRange(c)}};b.loadPreviousPages=function(){if(this.iframeLoadStatus[this.hiddenIframeIndex]!==this.loadedType.PREVIOUS&&(this.currentRequest===null||this.currentRequest.type!==this.loadedType.PREVIOUS)){var c=this.contentRange[this.visibleIframeIndex].startPosition-1,b=this.getPagePositionRange(),c=KindleRendererPositionLoadingCalculator.calculateDesiredFragmentRangeForPageFlip(c,b);this.createNewRequest(this.loadedType.PREVIOUS,null);this.loadFragmentsForRange(c)}};b.considerLoadingMoreFragments=
function(c){if(this.canPreloadNext){var b=c!==this.direction.PREVIOUS?4:2;if(KindlePaginator.getApproximateNumNextScreens(this.iframes[this.visibleIframeIndex])<b&&this.hasMoreNextFragments()){this.loadNextPages();return}}this.canPreloadPrevious&&(c=c===this.direction.PREVIOUS?4:2,KindlePaginator.getApproximateNumPreviousScreens(this.iframes[this.visibleIframeIndex])<c&&this.hasMorePreviousFragments()&&this.loadPreviousPages())};b.handleClick=function(c,b){var a=KindleRendererUtils.elementFromPoint(this.iframes[this.visibleIframeIndex].contentDocument,
c,b);return KindleRendererEventHandler.handleClick(this.iframes[this.visibleIframeIndex].contentDocument,a,{x:c,y:b})};b.crossSkeletonBoundary=function(){var c=this.contentRange[this.visibleIframeIndex],b=this.contentRange[this.hiddenIframeIndex];if(this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.NEXT)if(c.skeletonId+1===b.skeletonId)return KindlePaginator.scrollToTop(this.iframes[this.hiddenIframeIndex],!0),this.swapIframes(),!0;else if(c.skeletonId!==b.skeletonId)return this.iframeLoadStatus[this.hiddenIframeIndex]=
this.loadedType.EMPTY,!1;if(this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.PREVIOUS)if(c.skeletonId-1===b.skeletonId)return c=this.hiddenIframeIndex,KindlePaginator.scrollToBottom(this.iframes[c],this.isStartOfSkeletonLoaded(c)),this.swapIframes(),!0;else if(c.skeletonId!==b.skeletonId)this.iframeLoadStatus[this.hiddenIframeIndex]=this.loadedType.EMPTY;return!1};b.cleanup=function(){this.cancelCurrentRequest();KindleRendererIframeLoading.cleanupIframe(this.iframes[this.visibleIframeIndex]);
KindleRendererIframeLoading.cleanupIframe(this.iframes[this.hiddenIframeIndex]);KindlePaginator.cleanupIframe(this.iframes[this.visibleIframeIndex]);KindlePaginator.cleanupIframe(this.iframes[this.hiddenIframeIndex]);this.setOverlayManager(null);this.contentRange=[null,null];this.positionData=[null,null];this.iframes=null};b.hasMoreNextFragments=function(){return this.contentRange[this.visibleIframeIndex].endPosition!==KindleRendererFragmentLoader.getMaximumPosition()};b.hasMorePreviousFragments=
function(){return this.contentRange[this.visibleIframeIndex].startPosition!==KindleRendererFragmentLoader.getMinimumPosition()};b.isAtEndOfDocumentOrSkeleton=function(){var c=this.contentRange[this.visibleIframeIndex];return KindleRendererFragmentLoader.isPositionAtEndOfSkeletonOrDocument(c.skeletonId,c.endPosition)};b.isAtBeginningOfDocumentOrSkeleton=function(){var c=this.contentRange[this.visibleIframeIndex];return KindleRendererFragmentLoader.isPositionAtBeginningOfSkeletonOrDocument(c.skeletonId,
c.startPosition)};b.isStartOfSkeletonLoaded=function(c){c=this.contentRange[c];return KindleRendererFragmentLoader.isPositionAtBeginningOfSkeletonOrDocument(c.skeletonId,c.startPosition)};b.needToWaitForLoadToShowNextPage=function(){return!KindlePaginator.isNextFullScreen(this.iframes[this.visibleIframeIndex])&&this.hasMoreNextFragments()};b.needToWaitForLoadToShowPreviousPage=function(){var c=this.visibleIframeIndex;return!KindlePaginator.isPreviousFullScreen(this.iframes[c],this.isStartOfSkeletonLoaded(c))&&
this.hasMorePreviousFragments()};b.hasNextScreen=function(){return KindlePaginator.hasNextScreen(this.iframes[this.visibleIframeIndex])||this.hasMoreNextFragments()};b.hasPreviousScreen=function(){return KindlePaginator.hasPreviousScreen(this.iframes[this.visibleIframeIndex])||this.hasMorePreviousFragments()};b.updateDisplayedPositionsInPage=function(){var c=KindlePaginator.getCurrentPagePositionRange(this.iframes[this.visibleIframeIndex]);KindleRendererPositionLoadingCalculator.updateDisplayedPositionRange(c.currentBottomOfPage-
c.currentTopOfPage)};b.considerFlippingFrames=function(){var c=this.iframeLoadStatus[this.hiddenIframeIndex],b=this.currentRequest!==null&&this.currentRequest.type===c;if(c!==this.loadedType.EMPTY&&!b){var b=this.getPagePositionRange(),a=this.contentRange[this.hiddenIframeIndex],d=0,e=0;c===this.loadedType.NEXT?e=1:d=1;if(b.currentTopOfPage>=a.startPosition+d&&b.currentBottomOfPage<=a.endPosition-e)if(KindlePaginator.matchFrames(this.iframes[this.visibleIframeIndex],this.iframes[this.hiddenIframeIndex]),
c=KindlePaginator.getCurrentPagePositionRange(this.iframes[this.hiddenIframeIndex]),c.currentTopOfPage===b.currentTopOfPage&&c.currentBottomOfPage===b.currentBottomOfPage)return this.swapIframes(),!0;else if(this.needToWaitForLoadToShowNextPage()||this.needToWaitForLoadToShowPreviousPage())throw"Pagination Error";}return!1};b.nextScreen=function(){if(!KindlePaginator.isIframePaginationValid(this.iframes[this.visibleIframeIndex]))return this.gotoPosition(this.getPagePositionRange().currentTopOfPage);
var c=this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.NEXT;if(c&&this.considerFlippingFrames()===void 0)return!0;var b=this.isAtEndOfDocumentOrSkeleton(),a=KindlePaginator.nextScreen(this.iframes[this.visibleIframeIndex],b);if(!a)if(this.hasMoreNextFragments())if(c&&b&&this.crossSkeletonBoundary())a=!0;else return c=this.getPagePositionRange(),KindleRendererPositionLoadingCalculator.updateDisplayedPositionRange(this.contentRange[this.visibleIframeIndex].endPosition-c.currentBottomOfPage),
this.loadNextPages(),!1;else KindlePaginator.showEndOfDocument(this.iframes[this.visibleIframeIndex]),a=!0;this.considerLoadingMoreFragments(this.direction.NEXT);this.causeReflowEventInBrowserIfNeeded();this.updateDisplayedPositionsInPage();return a};b.previousScreen=function(){if(!KindlePaginator.isIframePaginationValid(this.iframes[this.visibleIframeIndex]))return this.gotoPosition(this.getPagePositionRange().currentTopOfPage);var c=this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.PREVIOUS;
if(c&&this.considerFlippingFrames()===void 0)return!0;var b=this.visibleIframeIndex,a=this.isAtBeginningOfDocumentOrSkeleton(),b=KindlePaginator.previousScreen(this.iframes[b],a,this.isStartOfSkeletonLoaded(b));if(!b&&this.hasMorePreviousFragments())if(c&&a&&this.crossSkeletonBoundary())b=!0;else return c=this.getPagePositionRange(),KindleRendererPositionLoadingCalculator.updateDisplayedPositionRange(c.currentTopOfPage-this.contentRange[this.visibleIframeIndex].startPosition),this.loadPreviousPages(),
!1;this.considerLoadingMoreFragments(this.direction.PREVIOUS);this.causeReflowEventInBrowserIfNeeded();this.updateDisplayedPositionsInPage();return b};b.cancelHiddenIframeLoading=function(){var c=this.iframes[this.hiddenIframeIndex];if(c.processingRequestId.id!==null)c.processingRequestId.id=null,this.cancelCurrentRequest();c.computingRectsId.id=null};b.doGuardedAsyncCopyOf=function(c,b,a){var d=this;b.processingRequestId.id=d.currentRequest.requestId;b.computingRectsId.id=null;KindleRendererIframeLoading.copyIframeContents(d.currentRequest,
c,b).done(function(e){if(b.processingRequestId.id===e.requestId&&d.currentRequest&&d.currentRequest.requestId===e.requestId)d.addClickHandlers(b),b.processingRequestId.id=null,a()})};b.copyIframeDataOf=function(c){var b=this;b.cancelHiddenIframeLoading();b.createNewRequest(b.loadedType.GOTO_POSITION,null);b.doGuardedAsyncCopyOf(c.iframes[c.visibleIframeIndex],b.iframes[b.visibleIframeIndex],function(){b.contentRange[b.visibleIframeIndex]=jQuery.extend({},c.contentRange[c.visibleIframeIndex]);b.positionData[b.visibleIframeIndex]=
jQuery.extend({},c.positionData[c.visibleIframeIndex]);var a=b.iframes[b.hiddenIframeIndex],d=c.iframes[c.hiddenIframeIndex];c.iframeLoadStatus[c.hiddenIframeIndex]!==c.loadedType.EMPTY&&d.processingRequestId.id===null?b.doGuardedAsyncCopyOf(d,a,function(){b.contentRange[b.hiddenIframeIndex]=jQuery.extend({},c.contentRange[c.hiddenIframeIndex]);b.positionData[b.hiddenIframeIndex]=jQuery.extend({},c.positionData[c.hiddenIframeIndex]);b.iframeLoadStatus[b.visibleIframeIndex]=c.iframeLoadStatus[c.visibleIframeIndex];
b.iframeLoadStatus[b.hiddenIframeIndex]=c.iframeLoadStatus[c.hiddenIframeIndex];b.currentRequestDfd.resolve()}):(b.iframeLoadStatus=[b.loadedType.EMPTY,b.loadedType.EMPTY],b.currentRequestDfd.resolve())});return b.currentRequestDfd.isResolved()};b.recreateFrame=function(c){var b=this.iframes[c],a=b.writingMode.width(b),d=b.parentNode,e=b.pageOverflowDiv;d.removeChild(b);b=this.createIframe(a,this.parentName,b.index);b.pageOverflowDiv=e;d.appendChild(b);d.appendChild(e);this.iframes[c]=b};b.copyIframeData=
function(c){if(!(this.contentRange[this.visibleIframeIndex]===null||c.contentRange[c.visibleIframeIndex]===null?this.contentRange[this.visibleIframeIndex]===c.contentRange[c.visibleIframeIndex]:this.contentRange[this.visibleIframeIndex].startPosition===c.contentRange[c.visibleIframeIndex].startPosition&&this.contentRange[this.visibleIframeIndex].endPosition===c.contentRange[c.visibleIframeIndex].endPosition))return KindleRendererDeviceSpecific.needsReflowOnPageFlip()&&(this.recreateFrame(0),this.recreateFrame(1),
this.setIframeVisibility(this.iframes[this.visibleIframeIndex],!0)),this.copyIframeDataOf(c);var b=this.iframes[this.visibleIframeIndex],c=c.iframes[c.visibleIframeIndex];b.currentTopOfScreen=c.currentTopOfScreen;b.currentBottomOfScreen=c.currentBottomOfScreen;return!0};b.updateSettingsInIframe=function(c){if(c&&c.contentDocument){var b=c.contentDocument.getElementById(m);b&&c.contentDocument.body.removeChild(b);KindleRendererIframeLoading.updateSettingsInIframe(c);b&&c.contentDocument.body.appendChild(b)}};
b.updateSettings=function(){var c=KindleRendererSettings.getSettings().backgroundColor;$(this.iframes[this.visibleIframeIndex].pageOverflowDiv).css({"background-color":c});$(this.iframes[this.hiddenIframeIndex].pageOverflowDiv).css({"background-color":c});this.updateSettingsInIframe(this.iframes[this.visibleIframeIndex]);this.updateSettingsInIframe(this.iframes[this.hiddenIframeIndex])};b.reloadNotification=function(){this.contentRange=[null,null];this.positionData=[null,null];this.resizeNotification()};
b.resizeNotification=function(){this.cancelHiddenIframeLoading();this.iframeLoadStatus=[this.loadedType.EMPTY,this.loadedType.EMPTY];var c=this.iframes[this.visibleIframeIndex];c.writingMode.resetIframeDimensions(c);c=this.iframes[this.hiddenIframeIndex];c.writingMode.resetIframeDimensions(c)};b.updateGlyphColorForFrameIndex=function(c){this.iframes[c].hasGlyphs&&this.iframes[c].contentDocument&&KindleGlyphRenderer.updateTextColor(this.iframes[c])};b.updateGlyphColor=function(){this.updateGlyphColorForFrameIndex(this.visibleIframeIndex);
this.updateGlyphColorForFrameIndex(this.hiddenIframeIndex)};b.setAnnotationEventCallback=function(c){this.annotationEventCallback=c};b.getContentRects=function(){var c=this.iframes[this.visibleIframeIndex],b=this.getIframeOrigin(this.visibleIframeIndex),c={left:b.x,top:b.y,width:$(c).width(),height:$(c).height()};c.right=c.left+c.width;c.bottom=c.top+c.height;return[c]};b.getZoomableAt=function(c,b,a){var d=this.iframes[this.visibleIframeIndex];return!KindlePaginator.isPointOnVisiblePage(d,b-c.x,
a-c.y)?null:KindleRendererZoomablesFactory.buildFromCoord(d.contentDocument,c,b,a)};b.getZoomableList=function(c){return KindleRendererZoomablesFactory.buildList(this.iframes[this.visibleIframeIndex].contentDocument,c)};b.addClickHandlers=function(c){var b=this,c=c.contentDocument.getElementById(h),c=$(c).find("["+KindleRendererAnnotationRenderer.ANNOTATION_CLICK_ATTRIBUTE+"='true']").children();$(c).unbind("click");$(c).click(function(a){b.annotationClickedHandler(a)})};b.createAnnotationElements=
function(c,b){if(c.contentDocument.getElementsByTagName("body")[0]){var a=KindlePaginator.getWordMap(c),d=c.contentDocument.createDocumentFragment();KindleRendererAnnotationRenderer.createAnnotationElements(c,a,c.screenManager.wordMapGenerator,b,d);a=c.contentDocument.getElementById(h);if(!a){var e=c.contentDocument.getElementById(m),a=c.contentDocument.createElement("DIV");a.id=h;a.setAttribute("class","kindle-annotation-wrapper");e.appendChild(a)}a.appendChild(d);this.addClickHandlers(c)}};b.addAnnotation=
function(b,f,a){b&&f&&a&&f.startPosition<=a.end&&a.start<=f.endPosition&&(this.createAnnotationElements(b,[a]),b.writingMode.forceRepaint(b))};b.removeAnnotation=function(b,f){if(b&&f){var a=b.contentDocument.getElementById(h);a&&(KindleRendererAnnotationRenderer.removeAnnotationElements(a,f),b.writingMode.forceRepaint(b))}};b.onOverlayAdded=function(c){b.addAnnotation(b.iframes[0],b.contentRange[0],c.overlay);b.addAnnotation(b.iframes[1],b.contentRange[1],c.overlay)};b.onOverlayRemoved=function(c){b.removeAnnotation(b.iframes[0],
c.overlay);b.removeAnnotation(b.iframes[1],c.overlay)};b.setOverlayManager=function(b){this.overlayManager&&(this.overlayManager.removeEventListener(this.overlayManager.OVERLAY_ADDED_EVENT,this.onOverlayAdded),this.overlayManager.removeEventListener(this.overlayManager.OVERLAY_REMOVED_EVENT,this.onOverlayRemoved));if(this.overlayManager=b)this.overlayManager.addEventListener(this.overlayManager.OVERLAY_ADDED_EVENT,this.onOverlayAdded),this.overlayManager.addEventListener(this.overlayManager.OVERLAY_REMOVED_EVENT,
this.onOverlayRemoved)};b.show=function(){this.showContent=!0;this.setIframeVisibility(this.iframes[this.visibleIframeIndex],!0)};b.hide=function(){this.showContent=!1;this.setIframeVisibility(this.iframes[this.visibleIframeIndex],!1)};b.drawWordMap=function(){var b=this.iframes[this.visibleIframeIndex];drawWordMap(b,b.screenManager,b.contentDocument.body)};b.drawHeightMaps=function(){drawHeightMaps(this.iframes[this.visibleIframeIndex],this.iframes[this.hiddenIframeIndex])}}var m="content-overlays",
h="annotation-section";return{build:function(b,c){for(var f=[],a=0;a<2;a+=1){f[a]=b.createIframe($(c).width(),c.name,a);c.appendChild(f[a]);var d=f[a],e=c,k=a,j=document.createElement("div");j.setAttribute("id",e.name+"_page_overflow_"+k);$(j).css({position:"absolute",visibility:"hidden","z-index":1});e.appendChild(j);d.pageOverflowDiv=j}b.loadedType={EMPTY:0,GOTO_POSITION:1,NEXT:2,PREVIOUS:3};b.direction={NEXT:2,PREVIOUS:3};b.iframes=f;b.parentName=c.name;b.iframeLoadStatus=[b.loadedType.EMPTY,b.loadedType.EMPTY];
b.contentRange=[null,null];b.positionData=[null,null];b.computedRectsDfd=[null,null];b.visibleIframeIndex=0;b.hiddenIframeIndex=1;b.overlayManager=null;g(b)}}}(),KindleRendererIframePreparation=function(){function g(b,f,a,d){KindleRendererSettings.useCSSRegions()?d.resolve(f):KindleRendererContentReflow.reflow(b,f,a).then(function(){d.resolve(f)},function(){d.reject(f,"reflow took too long")})}function m(c,f,a,d,e,k){e!==b&&KindleRendererCanvasInsertion.changeSpanToCanvas(c.id,c.contentDocument,a.contentRange,
e===h);c.hasGlyphs=d.glyphData!==void 0&&a.glyphData!==void 0;c.hasGlyphs?KindleGlyphRenderer.renderAllContent(c,f,d.glyphData,a.glyphData).then(function(){g(c,f,d.positionData,k)},function(){k.reject(f,"glyph rendering took too long")}):(d.glyphData=null,g(c,f,d.positionData,k))}var h=-1,b=0;return{CANVAS_INSERTION_PREVIOUS:h,CANVAS_INSERTION_NONE:b,CANVAS_INSERTION_NEXT:1,prepareIframe:function(b,f,a,d,e){var k=new jQuery.Deferred;if(b.processingRequestId.id===f.requestId){var j=b.contentDocument.getElementById("content-overlays");
if(!j)j=b.contentDocument.createElement("DIV"),j.id="content-overlays",b.contentDocument.body.appendChild(j);m(b,f,a,d,e,k)}else k.reject();return k.promise()}}}(),KindleRendererColumnManager=function(){function g(){for(var a=0;a<v;a++)t[a].hide()}function m(a){if(B||y){if(a<=C)throw{name:"pagingError",message:"Repeating wait request"};C=a;z<0&&(w.waitNotification&&w.waitNotification(),y=!0,g());z=a}}function h(a){if((B||y)&&z>=0&&z<=a){A=0;z=-1;if(y){for(a=0;a<v;a++)t[a].show();B=!0;y=!1}w.readyNotification&&
w.readyNotification()}}function b(a){if(z===-1)if(a<v){var d=t[a].getComputedRectsDfd();d?(w.rectsWaitNofification&&w.rectsWaitNofification(),d.then(function(){b(a+1)},function(a){w.rectsErrorNotification&&w.rectsErrorNotification(a)})):b(a+1)}else w.rectsReadyNotification&&w.rectsReadyNotification()}function c(a){return a>v*G?(w.errorNotification&&w.errorNotification("Irrecoverable Error"),!0):!1}function f(a,d,e){z<=a&&(d!==KindleRendererIframeManagerFactory.DATA_LOAD_ERROR&&A<M?(++A,s(),o(e)):
(w.errorNotification&&w.errorNotification(d),z=-1))}function a(d,e){try{if(c(e))return!1;if(t[d].copyIframeData(t[d===0?v-1:d-1])){var k=t[d].nextScreen(),j=d+1;if(k){if(j<v)return a(j,e+1);b(0);return!0}}var g=t[d].getCurrentProcessId();m(g);t[d].getCurrentProcessDfd().then(function(){a(d,e+1)&&(h(g),b(0))},function(a){f(g,a,e)})}catch(r){o(e)}return!1}function d(k,j){try{if(c(j))return!1;var g=t[k===v-1?0:k+1];if(!g.hasPreviousScreen())return e(0,j),!1;if(t[k].copyIframeData(g)){var r=t[k].previousScreen(),
g=k-1;if(r)return g>=0?d(g,j+1):a(1,j)}var w=t[k].getCurrentProcessId();m(w);t[k].getCurrentProcessDfd().then(function(){d(k,j+1)&&(h(w),b(0))},function(a){f(w,a,j)})}catch(l){o(j)}return!1}function e(d,e,c){var k;t[0].gotoPosition(d,c)?(k=KindleRendererRequestId.getUniqueRequestId(),m(k),h(k),b(0)):(k=t[0].getCurrentProcessId(),m(k),d=t[0].getCurrentProcessDfd(),v===1?d.then(function(){h(k);b(0)},function(a){f(k,a,e)}):d.then(function(){a(1)&&(h(k),b(0))},function(a){f(k,a,e)}));return!1}function k(){try{if(v===
1){var d=t[0].nextScreen();if(d)b(0);else{var e=t[0].getCurrentProcessId();m(e);t[0].getCurrentProcessDfd().then(function(){k();h(e);b(0)},function(a){f(e,a,0)})}return d}else return a(0,0)}catch(c){return o(0),!1}}function j(){try{if(v===1){var a=t[0].previousScreen();if(a)b(0);else{var e=t[0].getCurrentProcessId();m(e);t[0].getCurrentProcessDfd().then(function(){j();h(e);b(0)},function(a){f(e,a,0)})}return a}else return d(v-1,0)}catch(c){return o(0),!1}}function l(a){for(;a<v;a++)t[a].reloadNotification()}
function q(){var a=t[0].getCurrentPosition();a!==null&&(J=a)}function o(a){q();l(0);e(J,a)}function p(a){if(u&&a&&a.length>0){var d=document.getElementById("renderer_translation_div");if(!d)d=document.createElement("div"),d.id="renderer_translation_div",$(d).css({visibility:"hidden","z-index":-1E3}),u.appendChild(d);$(d).css({margin:a});a=window.getComputedStyle(d);return{top:parseFloat(a.marginTop),bottom:parseFloat(a.marginBottom),left:parseFloat(a.marginLeft),right:parseFloat(a.marginRight)}}return{top:0,
bottom:0,left:0,right:0}}function n(){var a=KindleRendererSettings.getSettings().inlineBaseDirection,d=a&&a.value===a.VERTICAL,a=p(x),e,b;d?(a={top:a.left,right:a.bottom,bottom:a.right,left:a.top},e=$(u).height(),b=$(u).width()):(e=$(u).width(),b=$(u).height());return{margins:a,parentWidth:e,parentHeight:b,getStyle:function(a){return d?{top:a.left,left:a.top,width:a.height,height:a.width}:a}}}function s(){v=Math.max(v,1);for(var a=n(),d=a.parentHeight,e=a.margins,b=D-(e.left+e.right),c=parseInt((a.parentWidth-
b*(v-1))/v,10),k=e.top,d=d-e.top-e.bottom,e=0;e<v;e++){if(H[e]===void 0)H[e]=document.createElement("div"),H[e].name="column_"+e,$(H[e]).css("position","absolute"),u.appendChild(H[e]);var j=a.getStyle({top:k,left:e*(c+b),height:d,width:c});j.display="";$(H[e]).css(j);t[e]===void 0&&(t[e]=KindleRendererIframeManagerFactory.build(H[e]),t[e].setAnnotationEventCallback(w.annotationTriggered),t[e].setOverlayManager(E));t[e].setCanPreloadPrevious(e===0);t[e].setCanPreloadNext(e===v-1)}for(e=v;e<H.length;e++)$(H[e]).hide();
B||g()}function r(a){a=$(H[a]);return{x:parseInt(a.css("left"),10),y:parseInt(a.css("top"),10)}}var w={},z=-1,C=-1,u=null,x=0,D=20,v=0,H=[],t=[],J=0,E,B=!0,y=!1,M=3,A=0,G=20;return{initialize:function(a,d,e,b){u=a;w=d;E=e;b>0&&(J=b);s()},cleanup:function(){for(var a=0;a<t.length;a++)t[a].cleanup();t=[];E=u=null;H=[]},hide:function(){g();y=B=!1},show:function(){y=!0},updateSettings:function(a){if(a.columns!==void 0)if(KindleRendererSettings.getSettings().fixedContent)v=1,D=0;else{if(a.columns.num!==
void 0)v=a.columns.num;a.columns.gap!==void 0&&(D=parseInt(a.columns.gap,10))}if(a.margin!==void 0)x=a.margin;if(u!==null){s();for(var d=a.fontSizes!==void 0||a.lineSpacingMultiplier!==void 0||a.fontSizeUnits!==void 0||a.fontFamily!==void 0||a.margin!==void 0||a.columns!==void 0||a.textAlign!==void 0,e=0;e<v;e++)t[e].updateSettings(a),!d&&a.fontColor!==void 0&&t[0].updateGlyphColor();d&&(B?o(0):l(0))}},gotoPosition:function(a,d){return e(a,0,d)},nextScreen:function(){return k()},previousScreen:function(){return j()},
hasNextScreen:function(){return t[v-1].hasNextScreen()},hasPreviousScreen:function(){return t[0].hasPreviousScreen()},getPagePositionRange:function(){var a;a=t[0].getPagePositionRange();if(v!==1){var d=t[v-1].getPagePositionRange();a={currentTopOfPage:a.currentTopOfPage,currentBottomOfPage:d.currentBottomOfPage}}return a},getSelectableItemBoundaries:function(){for(var a={},d=0;d<v;d++){var e=$(H[d]),b=parseFloat(e.css("top")),e=parseFloat(e.css("left")),c=t[d].getSelectableItemBoundaries(),k;for(k in c){a[k]=
[];for(var j=c[k],f=0;f<j.length;f++)a[k].push({top:j[f].top+b,bottom:j[f].bottom+b,left:j[f].left+e,right:j[f].right+e})}}return a},getWordPositions:function(){for(var a=[],d=0;d<v;d++){var e=t[d].getWordPositions();e&&(a=a.concat(e))}return a.length?a:null},onWindowResize:function(){s();q();t[0].resizeNotification();l(1);e(J,0)},handleClick:function(a,d){for(var e=0;e<v;e++){var b=$(H[e]),c=a-parseInt(b.css("left"),10),b=d-parseInt(b.css("top"),10);if(t[e].handleClick(c,b))return!0}return!1},reloadAnnotations:function(){for(var a=
0;a<v;a++)t[a].reloadAnnotations()},getContentRects:function(){for(var a=[],d=0;d<v;d++){for(var e=t[d].getContentRects(),b=r(d),c=0;c<e.length;c++)e[c].left+=b.x,e[c].right+=b.x,e[c].top+=b.y,e[c].bottom+=b.y;a=a.concat(e)}return a},getZoomableAt:function(a,d){for(var e=0;e<v;e++){var b=r(e);if(b=t[e].getZoomableAt(b,a,d))return b}return null},getZoomableList:function(){for(var a=[],d=0;d<v;d++)var e=r(d),e=t[d].getZoomableList(e),a=a.concat(e);return a}}}(),KindleRendererContentDisplay=function(){function g(d){f=
document.createElement("DIV");$(f).css({position:"absolute",top:0,left:0});d.appendChild(f);a=document.createElement("DIV");var e=$(a);e.css({position:"absolute",top:0,left:0});KindleRendererSettings.useCSSRegions()&&e.css({height:"100%",width:"100%"});d.appendChild(a);m()}function m(){if(!KindleRendererSettings.useCSSRegions()){if(f){var d=$(f.parentNode);$(f).css({width:d.width(),height:d.height()})}a&&(jContentDivParentNode=$(a.parentNode),$(a).css({width:jContentDivParentNode.width(),height:jContentDivParentNode.height()}))}}
function h(a){c!==a&&(c.hide(),d.waitNotification(),c=a,c.show())}var b=null,c,f=null,a=null,d=null,e=!1;return{initialize:function(k,j,l,q,o){var p=new jQuery.Deferred;c=b=KindleRendererSettings.useCSSRegions()?KindleRegionContentManager:KindleRendererColumnManager;g(k);d=j;KindleRendererCover.initialize(f,j,l);b.initialize(a,j,q,o);KindleRendererContentReflow.initialize();l.hasCover(function(a){e=a;p.resolve()},p.resolve);return p.promise()},cleanup:function(){KindleRendererCover.cleanup();b.cleanup();
d=a=f=c=null},updateSettings:function(a){b&&(m(),KindleRendererCover.onWindowResize(),b.updateSettings(a))},gotoPosition:function(a,d){a=parseInt(a,10);a=Math.max(a,0);e&&a===0?(h(KindleRendererCover),KindleRendererCover.showCover()):(h(b),a=Math.min(a,KindleRendererFragmentLoader.getMaximumPosition()));return b.gotoPosition(a,d)},nextScreen:function(){if(c===KindleRendererCover)return h(b),b.gotoPosition(0);else if(c.hasNextScreen())return c.nextScreen();return!0},previousScreen:function(){if(c===
b)if(c.hasPreviousScreen())return c.previousScreen();else e&&(h(KindleRendererCover),KindleRendererCover.showCover());return!0},hasNextScreen:function(){return c.hasNextScreen()},hasPreviousScreen:function(){return e?c!==KindleRendererCover:c.hasPreviousScreen()},getPagePositionRange:function(){return c.getPagePositionRange()},getSelectableItemBoundaries:function(){return c.getSelectableItemBoundaries()},getWordPositions:function(){return c.getWordPositions()},onWindowResize:function(){m();KindleRendererCover.onWindowResize();
b.onWindowResize()},handleClick:function(a,d){return c.handleClick(a,d)},reloadAnnotations:function(){c.reloadAnnotations()},getContentRects:function(){return c.getContentRects()},getZoomableAt:function(a,d){return c.getZoomableAt(a,d)},getZoomableList:function(){return c.getZoomableList()},clearSelection:function(){b.clearSelection&&b.clearSelection()},getSelection:function(){if(b.getSelection)return b.getSelection()}}}(),KindleRendererCover=function(){function g(e){function c(){++w;w===r&&(h(a),
b(a))}var k=e.data||e,j=e.metadata,e=k.split("resources")[0],g=KindleRendererImageRenderer.getCoverImageSlices();if(l=g!==void 0&&g!==null){a=f.ownerDocument.createElement("DIV");for(var k=$(a),r=g.length,w=0,z=0,C=0,u=0;u<r;u++)z=f.ownerDocument.createElement("IMG"),$(z).width(g[u].width),$(z).height(g[u].height),z.onload=c,z.src=e+g[u].name,$(z).appendTo(k),C+=g[u].height;z=g[0].width;$(a).width(z);$(a).height(C);$(a).css("visibility","hidden")}else a=f.ownerDocument.createElement("IMG"),a.src=
k,$(a).css("visibility","hidden"),a.onload=function(){j&&j.map?($(this).css("display","none"),d=KindleRendererImageRenderer.createCanvasImage(this,j.map),d=m(this.parentNode,d),$(this).after(d)):h(this);b(this)};f.appendChild(a)}function m(a,d){var e=$(a),b=e.width(),c=e.height(),k=Math.min(b/d.width,c/d.height),e=d.width*k;k*=d.height;b=Math.round((b-e)*0.5);c=Math.round((c-k)*0.5);$(d).css({top:c+"px",left:b+"px",height:k+"px",width:e+"px",position:"absolute"});return d}function h(a){if(!(a===null||
a===void 0)){var d=$(a),e=$(d.parent()),b=e.width(),c=e.height();d.css("visiblity","hidden");var k=1,e=a.offsetWidth,j=a.offsetHeight;e>0&&j>0?(d.attr("nativeWidth")===void 0&&d.attr("nativeWidth",e),d.attr("nativeHeight")===void 0&&d.attr("nativeHeight",j)):(e=d.attr("nativeWidth")||b,j=d.attr("nativeHeight")||c);k=Math.min(b/e,c/j);e*=k;k*=j;b=Math.round((b-e)*0.5);c=Math.round((c-k)*0.5);l?(d=f.ownerDocument.createElement("IMG"),$(d).css({width:e+"px",height:k+"px",position:"absolute",left:b+"px",
top:c+"px"}),KindleRendererImageRenderer.scaleImageSlices(d,a,!1),$(d).remove()):d.css({height:k+"px",width:e+"px",position:"absolute",left:b+"px",top:c+"px"});$(a).css("visibility","visible")}}function b(){j=!0;e.readyNotification&&e.readyNotification();e.rectsReadyNotification&&e.rectsReadyNotification()}function c(a){e.errorNotification&&e.errorNotification(a)}var f=null,a=null,d=null,e=null,k=null,j=!1,l=!1;return{initialize:function(a,d,b){f=a;e=d;k=b},cleanup:function(){k=e=a=f=null;l=j=!1},
hide:function(){$(f).hide()},show:function(){$(f).show()},showCover:function(){j?(e.readyNotification&&e.readyNotification(),e.rectsReadyNotification&&e.rectsReadyNotification()):(e.waitNotification&&e.waitNotification(),k.getCoverUrl(g,c))},nextScreen:function(){return!0},previousScreen:function(){return!0},hasNextScreen:function(){return!0},hasPreviousScreen:function(){return!1},getPagePositionRange:function(){return{currentTopOfPage:0,currentBottomOfPage:0}},getSelectableItemBoundaries:function(){var d=
{};if(a&&a.getBoundingClientRect){var e=a.getBoundingClientRect();e&&(d[0]=[{left:e.left,top:e.top,right:e.right,bottom:e.bottom}])}return d},getWordPositions:function(){return null},onWindowResize:function(){d?m(d.parentNode,d):h(a)},handleClick:function(){return!1},reloadAnnotations:function(){},getContentRects:function(){var d=$(a),d={left:parseInt(d.css("left"),10),top:parseInt(d.css("top"),10),width:d.width(),height:d.height()};d.right=d.left+d.width;d.bottom=d.top+d.height;return[d]},getZoomableAt:function(){return a?
KindleRendererZoomableReflowableContentFactory.buildFromElement(a,{x:0,y:0}):null},getZoomableList:function(){return[]}}}(),KindleRendererElementFitting=function(){function g(a){return(a.getAttribute("style")||"")+";"}function m(a,d,e,b){var c=0,k=c=0;a>e&&(c=e/a);d>b&&(k=b/d);c=c>0&&k>0?c<k?c:k:c>0?c:k;c!==0&&(a=c*parseInt(a,10),d=c*parseInt(d,10),d=Math.max(1,d),a=Math.max(1,a));return{height:a,width:d,scale:c}}function h(a){var d=a.getAttribute("data-isGaiji");if(d)return d==="true";var d=parseInt($(a).css("width"),
10),e=parseInt($(a).css("height"),10),b=parseInt($(a).css("font-size"),10);if(Math.abs(d-b)<=1&&Math.abs(e-b)<=1)return a.setAttribute("data-isGaiji","true"),!0;a.setAttribute("data-isGaiji","false");return!1}function b(a,d){for(var e={neededCount:0,downloadedCount:0},b=function(){e.downloadedCount+=1;e.downloadedCount===e.neededCount&&setTimeout(d,KindleRendererDeviceSpecific.drawYieldUpdateTime())},c=0;c<a.length;c+=1)if(a[c].src!==""&&(a[c].complete!==void 0&&a[c].complete===!1||a[c].naturalHeight===
0&&a[c].naturalWidth===0))e.neededCount+=1,a[c].onerror=b,a[c].onload=b,a[c].onabort=b;e.neededCount===0&&setTimeout(d,KindleRendererDeviceSpecific.drawYieldUpdateTime())}function c(a,d){var e=a.getElementsByTagName("IMG");e.length>0?b(e,d):d()}function f(b,f,q,o){var p=new jQuery.Deferred,n,s,r=function(){n=o.createSubTimer("element-fitting");if($(b).css("position")==="absolute")KindleRendererImageRenderer.scaleCompositeInlineImages(b),p.resolve();else{var c=b.getElementsByTagName("IMG");if(c.length>
0){var r;for(r=0;r<c.length;r+=1){var C=c[r],u=C,x=$(u),D=x.css("max-height"),x=x.css("max-width"),D=D!=="auto"&&D!=="none",x=x!=="auto"&&x!=="none";if(D||x){var v=g(u);D&&(v+="max-height: none; ");x&&(v+="max-width: none; ");u.setAttribute("style",v)}u=C;u.getAttribute("data-nativeHeight")||u.setAttribute("data-nativeHeight",u.height);u.getAttribute("data-nativeWidth")||u.setAttribute("data-nativeWidth",u.width);u.getAttribute("data-nativeLeftOffset")||u.setAttribute("data-nativeLeftOffset",u.offsetLeft);
u.getAttribute("data-nativeTopOffset")||u.setAttribute("data-nativeTopOffset",u.offsetTop);u=C;if(u.className.indexOf("unsupsvg")>=0&&(u.src=e,u.height=u.getAttribute("data-nativeHeight"),u.width=u.getAttribute("data-nativeWidth"),u.height===0||u.width===0))u.height=k,u.width=k,u.setAttribute("data-nativeHeight",u.height),u.setAttribute("data-nativeWidth",u.width);u=C;v=f.getAvailableSizeForImage(u,q,a);x=parseInt(u.getAttribute("data-nativeWidth"),10)||u.naturalWidth;D=parseInt(u.getAttribute("data-nativeHeight"),
10)||u.naturalHeight;if(!x||!D)KindleDebug.warn("Defaulting image width/height. It'll be scaled down to fit."),D=x=1E3;var x=m(D,x,v.height,v.width),D=x.height,x=x.width,s=D,t=x,J=v.height,E=v.width,v={},B=0,y=parseInt($(u).css("padding-top"),10),M=parseInt($(u).css("padding-bottom"),10),A=y+M;if(A+s>J)B=s+A-J,s=Math.ceil(y/A*B),B-=s,v.top=y-s,v.bottom=M-B;y=parseInt($(u).css("padding-left"),10);M=parseInt($(u).css("padding-right"),10);s=y+M;if(s+t>E)B=t+s-E,t=Math.ceil(y/s*B),E=B-t,v.left=y-t,v.right=
M-E;t=g(u);t+="height: "+D+"px; width: "+x+"px; ";t+=(v.top!==void 0?"padding-top: "+v.top+"px; ":"")+(v.bottom!==void 0?"padding-bottom: "+v.bottom+"px; ":"")+(v.left!==void 0?"padding-left: "+v.left+"px; ":"")+(v.right!==void 0?"padding-right: "+v.right+"px; ":"");u.setAttribute("style",t);h(C)||f.padImageIfNeeded(C)}C=f.calculateOverlappingImageSets(c,h);for(u=d;u>0&&C.length>0;){for(r=0;r<C.length;r+=1)if(x=C[r],D=x.imgs,x=m(x.height,x.width,q.height*a,q.width*a).scale,x!==0){E=t=v=void 0;for(B=
0;B<D.length;B+=1)v=D[B],t=v.height*x,E=v.width*x,t<1||E<1||(y=g(v),y+="height: "+t+"px; width: "+E+"px;",v.setAttribute("style",y))}--u;C=f.calculateOverlappingImageSets(c,h)}}if(f.getWritingMode()!=="vertical"){c=b.getElementsByTagName("TABLE");for(r=0;r<c.length;r++){u=c[r];v=q;D=C=0;x=parseInt(u.getAttribute("data-nativeWidth"),10);v=v.parentWidth||v.width;x||(x=$(u).width(),u.setAttribute("data-nativeWidth",x));t=Math.min(parseInt(u.getAttribute("data-nativeLeftOffset"),10),u.offsetLeft);if(!t)t=
u.offsetLeft,u.setAttribute("data-nativeLeftOffset",t);E=$(u.offsetParent).width()||v;E=Math.min(E-t,v*a);x>E&&(D=E/x);D>0&&(C=D);C!==0&&(D="scale("+C+")",C=g(u),C+=" -moz-transform: "+D+"; -webkit-transform:"+D+"; -o-transform:"+D+"; -ms-transform:"+D+"; ms-transform:"+D+"; transform:"+D+"; ",D=$(u).css("float"),x="top ",x+=D==="right"?"right":"left",C+=" -moz-transform-origin: "+x+"; -webkit-transform-origin: "+x+"; -o-transform-origin: "+x+"; -ms-transform-origin: "+x+"; ms-transform-origin: "+
x+"; transform-origin: "+x+"; ",u.setAttribute("style",C))}}setTimeout(p.resolve,10)}};(window.ActiveXObject||"ActiveXObject"in window)&&window.XMLHttpRequest?$(b.ownerDocument).ready(r):(s=o.createSubTimer("(WAIT) image-loading"),c(b,function(){s.endTimer();r()}));return p.promise().then(function(){n.endTimer()})}var a=0.95,d=3,e="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' viewBox='0 0 100 100'><g><rect x='1%' y='1%' rx='20' ry='20' width='98%' height='98%' style='fill:white; stroke:gray;stroke-width:2;'></rect><text x='50%' y='50%' fill='black' font-size='8px' style='text-anchor: middle; dominant-baseline: central;'>Image Not Supported</text></g></svg>",
k=200;return{fitToViewport:function(a,d,e,b){return f(a,d,e,b)},resize:function(a,d){var e;if($(a).css("position")==="absolute")if(d.width>0&&d.height>0){e=a.offsetWidth>0&&a.offsetHeight>0?Math.min(d.width/a.offsetWidth,d.height/a.offsetHeight):1;var b="scale("+e+")";$(a).css({"-moz-transform":b,"-moz-transform-origin":"left top","-webkit-transform":b,"-webkit-transform-origin":"left top","-o-transform":b,"-o-transform-origin":"left top","ms-transform":b,"ms-transform-origin":"left top","-ms-transform":b,
"-ms-transform-origin":"left top",transform:b,"transform-origin":"left top"});e={width:$(a).width()*e,height:$(a).height()*e}}else e=void 0;return e}}}(),KindleRendererImageRenderer=function(){function g(a,d){for(var e=d.length,b=document.createElement("canvas"),c=0,k=0,f=0;f<e;f+=6)c=Math.max(c,d[f+1]+d[f+5]),k=Math.max(k,d[f]+d[f+4]);b.height=c;b.width=k;m(a,d,b);$(b).css({height:"100%",width:"auto"});return b}function m(a,d,e){for(var b,c,k,f,j,g=d.length,l=e.getContext("2d"),n=0;n<g;n+=6)e=d[n],
b=d[n+1],c=d[n+2],k=d[n+3],f=d[n+4],j=d[n+5],l.drawImage(a,c,k,f,j,e,b,f,j)}function h(a){function d(a,e){return parseInt(a.name.match(n),10)-parseInt(e.name.match(n),10)}for(var e in a){var b=a[e].parent;if(o[b]===void 0||o[b]===null)o[b]=[];o[b].push({name:a[e].name,width:a[e].width,height:a[e].height})}for(e in o)o[e].sort(d)}function b(a,d,e,b){var c=d&&d.metadata||e&&e.metadata;if(c&&c.map){$(a).css("display","none");var k,f=function(){a.parentNode&&(k?m(a,c.map,k):(k=g(a,c.map),$(a.parentNode).append(k)))},
j=KindleHostDeviceDetector.hasMissingImgOnLoadProblem&&KindleHostDeviceDetector.hasMissingImgOnLoadProblem();if(j)var l=s.map(function(a){return setTimeout(f,a)});a.onload=function(){f();j&&l.forEach(function(a){clearTimeout(a)})}}else KindleHostDeviceDetector.hasImageRenderingProblem&&KindleHostDeviceDetector.hasImageRenderingProblem()&&$(a).attr("data-repaint-on-show","1");if(d&&d[b])a.src=d[b];else if(e&&e[b])a.src=e[b]}function c(a){a=a.split("url(")[1].split(")")[0].split("resources");bgImgFilepath=
a[0];bgImgResourceName="resources"+a[a.length-1];return{bgImgFilepath:bgImgFilepath,bgImgResourceName:bgImgResourceName}}function f(a,d,e){var b=0;a.substring(a.length-1,a.length)==="%"?b=d!==0?parseFloat(a)/100*e/d:1:a.substring(a.length-2,a.length)==="px"?(e=0,e=parseFloat(a),b=d!==0?e/d:1):b=1;return b}function a(a,d,e,b){var c=d.css("background-size").split(",")[0].trim().split(" "),k,j=!1,g=!1;c[0]==="auto"?c=k="100%":c[0]==="cover"?(j=!0,c=k="100%"):c[0]==="contain"?(g=!0,c=k="100%"):c.length===
1?(k=c[0],c="100%"):(k=c[0],c=c[1]);a.w=f(k,e,d.width());a.h=f(c,b,d.height());if(j)d=a.w>a.h?a.w:a.h,a.w=d,a.h=d;else if(g)d=a.w<a.h?a.w:a.h,a.w=d,a.h=d}function d(a,d,e,b,c,k,f){for(var j=[],g=[],l=0,n=0,q=0,l=0;l<c;l++)j[l]=k*e[l],g[l]=f*b[l],a[l]=Math.round(j[l]),n+=g[l],d[l]=Math.round(n-q),q+=d[l]}function e(a,d){if(a==="top"||a==="left")a="0%";a==="center"&&(a="50%");if(a==="bottom"||a==="right")a="100%";var e=0,e=a.substring(a.length-1,a.length)==="%"?parseFloat(a)/100*d:a.substring(a.length-
2,a.length)==="px"?parseFloat(a):0;return Math.round(e)}function k(a,d){var b=d.css("background-position").split(",")[0].trim().split(" "),c;b.length===1?(c=b[0],b="50%"):(c=b[0],b=b[1]);a.x=e(c,d.width());a.y=e(b,d.height())}function j(e){function b(){B++;B===n&&f.css("background-image",E)}var f=$(e),j=f.css("background-image");if(!(j==="none"||j==="inherit")){var j=c(j),g=j.bgImgFilepath,l=o[j.bgImgResourceName];if(l!==void 0&&l!==null){var j=0,n=l.length;f.addClass(q);for(var p=[],h=[],s=0,m=0,
E="",s=[],j=0;j<n;j++)s[j]="url("+g+l[j].name+")",p[j]=l[j].width,h[j]=l[j].height,m+=h[j],E+=s[j],j!==n-1&&(E+=",");for(var s=p[0],B=0,j=0;j<n;j++)jqImgSlicedNode=$("<img/>"),jqImgSlicedNode[0].onload=b,jqImgSlicedNode[0].src=g+l[j].name;j={w:1,h:1};a(j,f,s,m);m=[];g=[];d(m,g,p,h,n,j.w,j.h);p="";for(j=0;j<n;j++)p=p+m[j]+"px "+g[j]+"px",j!==n-1&&(p+=",");e.setAttribute("style",(e.style||"")+("; background-size: "+p+" !important;"));p={x:0,y:0};k(p,f);for(var h=[],m=[],l=0,y=s="",j=0;j<n;j++)h[j]=
p.x,m[j]=p.y+l,s=s+h[j]+"px "+m[j]+"px",y+="no-repeat",l+=g[j],j!==n-1&&(s+=",",y+=",");e.setAttribute("style",(e.style||"")+("; background-position: "+s+" !important;"));f.css("background-repeat",y)}}}function l(a,e,b){for(var c=[],k=[],j=[],f=[],g=0,l=0,n=$(e).children(),l=l=0;l<n.length;l++)c[l]=n[l].width,k[l]=n[l].height,g+=k[l];l=c[0];if(!(g===0||l===0)){$(a).css("display","block");var q=parseInt($(a).css("height"),10),o=parseInt($(a).css("width"),10);o===0&&q===0?(o=l,q=g):q===0?q=Math.round(g/
l*o):o===0&&(o=Math.round(l/g*q));$(a).width(o);$(a).height(q);d(j,f,c,k,n.length,o/l,q/g);for(l=0;l<n.length;l++)$(n[l]).width(j[l]),$(n[l]).height(f[l]),$(n[l]).css("top","0px"),$(n[l]).css("left","0px"),$(n[l]).css("position","relative"),$(n[l]).css("border","none"),$(n[l]).css("display","block"),b&&$(n[l]).css("margin-bottom","-1px");$(e).css("line-height",0);$(e).css("display","inline-block");$(e).css("position",$(a).css("position"));$(e).css("width",$(a).css("width"));$(e).css("height",$(a).css("height"));
$(e).css("top",$(a).css("top"));$(e).css("left",$(a).css("left"));$(e).css("bottom",$(a).css("bottom"));$(e).css("right",$(a).css("right"));$(e).css("float",$(a).css("float"));$(e).css("padding",$(a).css("padding"));$(e).css("border",$(a).css("border"));$(e).css("margin",$(a).css("margin"))}}var q="amzn-sliced-bgimg-ori",o={},p=null,n=RegExp(/\d+$/),s=[200,500,1E3];return{initialize:function(a){if(a.coverResource!==null&&a.coverResource!==void 0)p=a.resourceManifest[a.coverResource].name;a=a.compositeResourceManifest;
a!==void 0&&a!==null?h(a):o={}},cleanup:function(){o={}},getCompositeData:function(){return o},getCoverImageSlices:function(){return o[p]},resolveCompositeResources:function(a){if(!$.isEmptyObject(o)){for(var d=[],e=0;e<a.length;e++){var b=[],c=b,k=a[e];if(o[k]!==void 0&&o[k]!==null)for(var j=o[k].length,f=0;f<j;f++)c.push(o[k][f].name);d=b.length>0?d.concat(b):d.concat(a[e])}a=d}return a},loadImage:function(a,d,e,c){var k=o[c];if(k!==void 0&&k!==null){$(a).addClass("amzn-sliced-inimg-ori");(c=a.getAttribute("alt"))&&
a.setAttribute("data-alt-text",c);a.removeAttribute("alt");$(a).css("display","none");c=$("<div/>",{"class":"amzn-sliced-inimg-div"});c.insertBefore($(a));c.attr("data-nid",a.getAttribute("data-nid"));for(var j=k.length,f=0;f<j;f++)a=$("<img/>",{"class":"amzn-sliced-inimg-imgslice"}),a.width(k[f].width),a.height(k[f].height),b(a[0],d,e,k[f].name),a.appendTo(c)}else b(a,d,e,c)},scaleCompositeInlineImages:function(a){if(!$.isEmptyObject(o)){for(var d=a.getElementsByClassName("amzn-sliced-inimg-ori"),
a=a.getElementsByClassName("amzn-sliced-inimg-div"),e=d.length,b=0,b=0;b<e;b++){l(d[b],a[b],!0);var c=$(a[b]).children()[0],k=d[b].getAttribute("data-alt-text");k&&c.setAttribute("alt",k)}$(d).remove()}},scaleCompositeBackgroundImages:function(a){if(!$.isEmptyObject(o))for(var a=$(a).find("*"),d=0;d<a.length;d++)j(a[d])},scaleImageSlices:l,createCanvasImage:g,scaleCanvas:function(a,d){for(var e=a,b=e.width,c=e.height;b>d.width&&c>d.height;){var k=Math.max(d.width,Math.round(b*0.75)),j=Math.max(d.height,
Math.round(c*0.75)),f=document.createElement("canvas"),g=f.getContext("2d");f.width=k;f.height=j;$(f).attr("id","c1");g.drawImage(e,0,0,b,c,0,0,k,j);g.globalAlpha=0.5;g.drawImage(a,0,0,a.width,a.height,0,0,k,j);e=f;b=e.width;c=e.height}return e}}}(),KindleRendererWritingModeFactory=function(){function g(a,d,e,b,j){var f=c*Math.min(e,b),g=Math.abs(e-b);return(a<d?a+e-d:d+b-a)>f&&(!j||g<f)}function m(a){var d=a.getAttribute("style");a.setAttribute("style",(d?d+"; ":"")+"-webkit-writing-mode: vertical-rl !important; writing-mode: vertical-rl !important;")}
function h(){var a=KindleRendererDeviceSpecific.usesDocRelativeVerticalCoordinates(),d=0,e=!1;return{getWritingMode:function(){return"vertical"},resetHeight:function(a){$(a).css("width",$(a.parentNode).width()+"px")},resetWidth:function(a){$(a).css("height",$(a.parentNode).height()+"px")},resetIframeDimensions:function(a){$(a).css({width:$(a.parentNode).width()+"px",height:$(a.parentNode).height()+"px"})},padImageIfNeeded:function(a){var d=$(a).css("margin-left");parseInt(d,10)<=1&&$(a).css("margin-left",
"2px")},getAvailableSizeForImage:function(a,d,e){var b=Math.min(a.getAttribute("data-nativeTopOffset"),a.offsetTop),c=$(a.offsetParent).outerHeight()||d.height,f=$(a.offsetParent).outerWidth()||d.width,c=Math.min(c-b,d.height*e),f=Math.min(f,d.width*e);$(a).css("float")!=="none"&&(e=$(a).parent(),a=parseInt($(e).css("line-height"),10),e=parseInt($(e).css("font-size"),10),f=Math.min(f,d.width-(a+e)));return{width:f,height:c}},calculateOverlappingImageSets:function(a,d){function e(a,d){return a.offsetLeft-
d.offsetLeft}var b=[];if(a.length>1){for(var a=Array.prototype.slice.call(a).sort(e),c=null,f=a[0],g=f.offsetLeft+f.width,h,r,w=1;w<a.length;++w)if(h=a[w],!d(h)){r=h.offsetLeft+h.width;if(h.offsetLeft<=g){c||(c={left:f.offsetLeft,right:g,imgs:[f]});if(r>c.right)c.right=r;c.imgs.push(h)}else c&&(b.push({height:0,width:c.right-c.left,imgs:c.imgs}),c=null);f=h;g=c?c.right:r}c&&b.push({height:0,width:c.right-c.left,imgs:c.imgs})}return b},forceRepaint:function(a){if(a.contentDocument)a.contentDocument.body.style.top=
0,setTimeout(function(){a.contentDocument.body.style.top=""},1)},setHeight:function(a,d){$(a).css("width",d)},setWidth:function(a,d){$(a).css("height",d)},fitToBottomOfFrame:function(a,d,e){$(d).css({height:"100%",width:$(a).width()-e+1,top:0,left:$(a).position().left-1})},height:function(a){return $(a).width()},width:function(a){return $(a).height()},prepareForPagination:function(a){d=$(a).width();this.scrollToTopOfDocument(a);e=$(a.contentDocument).find("table").length>0},getBorderMap:function(a,
e){var b,c,f,g;for(b=0;b<a.length;b++){f=a[b];c=f.getBoundingClientRect();if((g=$(f).css("border-right-style"))&&g!=="none")if(g=parseInt($(f).css("border-right-width"),10))g={borderStart:d-c.right-g,borderEnd:d-c.right},e.top.push(g);if((g=$(f).css("border-left-style"))&&g!=="none")if(f=parseInt($(f).css("border-left-width"),10))g={borderStart:d-c.left,borderEnd:d-c.left+f},e.bottom.push(g)}},getTransformedClientRects:function(a,b,c){var f=a.length,g=[],h=b&&b.deltaX||0,c=b&&b.fontSize||c&&parseInt(c.fontSize,
10)||void 0,n=0;a.length>1&&(a[0].height<=1&&++n,a[a.length-1].height<=1&&--f);for(;n<f;n++){var s=a[n],r=s.right+h-(b&&parseInt(b.ownerDocument.body.style.left,10)||0),w=c&&b.tagName!=="IMG"?c:s.width,s={top:s.top,bottom:s.bottom,height:s.height,left:d-(r-w),right:d-r,width:w},w=b,r=s;if(e){var z=$(w).closest("TBODY")[0];if(z){var C=0,C=$(z).parent(),u=$(C).width(),C=u,x=$(w).closest("TD")[0];x&&(C-=$(x).width());z=u-$(z).width();C+=z;r.left+=C;r.right+=C}}w&&w.getAttribute&&w.getAttribute("data-isTextCombineBlock")&&
(z=parseInt($(w).css("font-size"),10),w=r.height-z,z=r.width-z,w>0&&(C=Math.ceil(w/2),r.top+=C,r.bottom-=C,r.height-=w),z<0&&(w=Math.ceil(z/2),r.left-=w,r.right+=w,r.width-=z));g.push(s)}return g},getRectsAdjustedForAnnotationMarks:function(a,d){for(var e=a.length,b=[],c=Math.ceil(d/2)+1,f=0;f<e;f++){var g=a[f];b.push({top:g.top,bottom:g.bottom,height:g.height,left:g.left,right:g.right-c,width:g.width+c})}return b},unionRect:function(a){for(var d=a[0],d={left:d.top,right:d.bottom,bottom:d.left,top:d.right},
e=1;e<a.length;++e)d.top=Math.min(d.top,a[e].right),d.bottom=Math.max(d.bottom,a[e].left),d.right=Math.max(d.right,a[e].bottom),d.left=Math.min(d.left,a[e].top);return d},clientRectTop:function(a){return a.right},clientRectBottom:function(a){return a.left},clientRectLeft:function(a){return a.top},clientRectRight:function(a){return a.bottom},clientRectWidth:function(a){return a.height},clientRectHeight:function(a){return a.width},clientRectCompare:function(a,d){return g(a.right,d.right,a.width,d.width,
!1)?a.top-d.top:a.right-d.right},checkIfRectsOnSameLine:function(a,d){return g(a.right,d.right,a.width,d.width,!1)},scrollToTopOfDocument:function(e){var b=0;a&&(b=$(e.contentDocument).width()-d);$(e.contentWindow).scrollLeft(b);e.contentDocument.body.style.top=0;e.contentDocument.body.style.left=0},scrollTop:function(a,d){a.contentDocument.body.style.left=d},getRectBoundariesForScreen:function(a,e){for(var b=[],c=a.length,f=0;f<c;f++)b.push({left:d-(a[f].left-e),top:a[f].top,right:d-(a[f].right-
e),bottom:a[f].bottom});return b},isPointOnVisiblePage:function(a,d,e){return e>d},checkIfNewLine:function(a,d,e){return d===void 0||!g(a.right,d.right,a.width,d.width,e)},updateLineBounds:function(a,d,e,b,c){a.left=c-e.left;a.right=c-e.right;a.height=d&&b?b.top-a.top:e.bottom-a.top;a.width=a.right-a.left},updateLineHeightOfBounds:function(a,d){a.left=a.left>=d.left?a.left:d.left;a.right=a.right<=d.right?a.right:d.right;a.top=d.top;a.bottom=d.bottom},updateDivIfNewLineOrImageBound:function(a,d,e,
b,c,f){var g=!1;if(a.isNewDiv||a.isImageBound)a.lineBounds={top:a.isNewDiv?d.top:a.lineBounds.top+a.lineBounds.height,height:d.height,left:d.left,right:d.right,width:d.width};a.isImageBound=c;a.isNewDiv=this.checkIfNewLine(a.lineBounds,e,!0);(g=a.isNewDiv||a.isImageBound)&&this.updateLineBounds(a.lineBounds,!a.isNewDiv&&!(b||e===void 0),d,e,f);return g},positionDivAfterWord:function(a,d,e,b){a.style.top=d.top+e;a.style.left=b-d.left+d.width+e},getDeltaX:function(a,d){var j;var e=0;if(KindleHostDeviceDetector.isiOS()&&
parseInt(KindleHostDeviceDetector.getOSMajorVersion(),10)<6){if(a.tagName==="RUBY"){var b=d.createRange();b.selectNodeContents(a);var b=b.getClientRects(),c=a.getClientRects();c&&b&&c.length&&b.length&&(e=c[0].left-b[0].left)}if(a.parentNode&&a.parentNode.parentNode){var b=a.nodeType===Node.TEXT_NODE?a.parentNode:a,c=a.nodeType!==Node.TEXT_NODE&&a.tagName!=="RUBY"&&$(b).css("display")==="inline",f=$(b).css("display")==="inline-block",g=$(b.parentNode).css("display")==="inline";if((c||f)&&g){e+=-b.getBoundingClientRect().right;
f=c=b;do f=c,c=c.parentNode;while(c&&$(c).css("display")!=="block");f={containingBlock:c,furthestNonBlockParent:f};if(c=f.containingBlock){j=g=f.furthestNonBlockParent,f=j;do f=f.nextElementSibling;while(f&&$(f).css("display")!=="block");do g=g.previousElementSibling;while(g&&$(g).css("display")!=="block");g=g?g.getBoundingClientRect().left-parseInt($(g).css("margin-left"),10):c.getBoundingClientRect().right;c=f?f.getBoundingClientRect().right+parseInt($(f).css("margin-right"),10):c.getBoundingClientRect().left;
b=g-(b.getBoundingClientRect().left-c)}else b=b.getBoundingClientRect().right;e+=b}}}return e},floatToTopOfIframe:function(a,e){var b=a.document.body,c=b.getBoundingClientRect(),b=a.getComputedStyle(b);$(e).css({position:"absolute",top:parseInt(b.top,10)-c.top,left:parseInt(b.left,10)-(c.left+$(a.document).width()-d)})}}}function b(){return{getWritingMode:function(){return"horizontal"},resetHeight:function(a){$(a).css("height",$(a.parentNode).height()+"px")},resetWidth:function(a){$(a).css("width",
$(a.parentNode).width()+"px")},resetIframeDimensions:function(a){$(a).css({height:$(a.parentNode).height()+"px",width:$(a.parentNode).width()+"px"})},padImageIfNeeded:function(a){var d=$(a).css("margin-bottom");parseInt(d,10)<=1&&$(a).css("margin-bottom","2px")},getAvailableSizeForImage:function(a,d,e){var b=Math.min(a.getAttribute("data-nativeLeftOffset"),a.offsetLeft),c=$(a.offsetParent).outerHeight()||d.height,f=$(a.offsetParent).outerWidth()||d.width,c=Math.min(c,d.height*e),f=Math.min(f-b,d.width*
e);$(a).css("float")!=="none"&&(e=$(a).parent(),a=parseInt($(e).css("line-height"),10),e=parseInt($(e).css("font-size"),10),c=Math.min(c,d.height-(a+e)));return{width:f,height:c}},calculateOverlappingImageSets:function(a,d){function e(a,d){return a.offsetTop-d.offsetTop}var b=[];if(a.length>1){for(var a=Array.prototype.slice.call(a).sort(e),c=null,f=a[0],g=f.offsetTop+f.height,o,h,n=1;n<a.length;++n)if(o=a[n],!d(o)){h=o.offsetTop+o.height;if(o.offsetTop<=g){c||(c={top:f.offsetTop,bottom:g,imgs:[f]});
if(h>c.bottom)c.bottom=h;c.imgs.push(o)}else c&&(b.push({height:c.bottom-c.top,width:0,imgs:c.imgs}),c=null);f=o;g=c?c.bottom:h}c&&b.push({height:c.bottom-c.top,width:0,imgs:c.imgs})}return b},forceRepaint:function(){},setHeight:function(a,d){$(a).css("height",d)},setWidth:function(a,d){$(a).css("width",d)},fitToBottomOfFrame:function(a,d,e){e=$(a).height()-e+1;a=$(a).position().top+$(a).height()-e+1;$(d).css({height:e,width:"100%",top:a,left:0})},height:function(a){return $(a).height()},width:function(a){return $(a).width()},
prepareForPagination:function(a){this.scrollToTopOfDocument(a)},getBorderMap:function(a,d){var e,b,c,f;for(e=0;e<a.length;e++){c=a[e];b=c.getBoundingClientRect();if((f=$(c).css("border-top-style"))&&f!=="none")if(f=parseInt($(c).css("border-top-width"),10))f={borderStart:b.top-f,borderEnd:b.top},d.top.push(f);if((f=$(c).css("border-bottom-style"))&&f!=="none")if(c=parseInt($(c).css("border-bottom-width"),10))f={borderStart:b.bottom,borderEnd:b.bottom+c},d.bottom.push(f)}},getTransformedClientRects:function(a,
d){a.length>1&&(a[0].width<=1&&(a=Array.prototype.slice.call(a,1)),a[a.length-1].width<=1&&(a=Array.prototype.slice.call(a,0,-1)));if(d){var e=[],b=parseInt(d.ownerDocument.body.style.top,10);if(b!==0){for(var c=0;c<a.length;++c){var f=a[c];e.push({top:f.top-b,bottom:f.bottom-b,height:f.height,left:f.left,right:f.right,width:f.width})}a=e}}return a},getRectsAdjustedForAnnotationMarks:function(a,d){for(var e=a.length,b=[],c=Math.ceil(d/2)+1,f=0;f<e;f++){var g=a[f];b.push({top:g.top-c,bottom:g.bottom,
height:g.height+c,left:g.left,right:g.right,width:g.width})}return b},unionRect:function(a){for(var d=a[0],d={top:d.top,bottom:d.bottom,left:d.left,right:d.right},e=1;e<a.length;++e)d.top=Math.min(d.top,a[e].top),d.right=Math.max(d.right,a[e].right),d.bottom=Math.max(d.bottom,a[e].bottom),d.left=Math.min(d.left,a[e].left);return d},clientRectTop:function(a){return a.top},clientRectBottom:function(a){return a.bottom},clientRectLeft:function(a){return a.left},clientRectRight:function(a){return a.right},
clientRectWidth:function(a){return a.width},clientRectHeight:function(a){return a.height},clientRectCompare:function(a,d){return g(a.top,d.top,a.height,d.height,!1)?a.left-d.left:a.top-d.top},checkIfRectsOnSameLine:function(a,d){return g(a.top,d.top,a.height,d.height,!1)},scrollToTopOfDocument:function(a){$(a.contentWindow).scrollTop(0);a.contentDocument.body.style.top=0;a.contentDocument.body.style.left=0},scrollTop:function(a,d){a.contentDocument.body.style.top=-d},getRectBoundariesForScreen:function(a,
d){for(var e=[],b=a.length,c=0;c<b;c++)e.push({left:a[c].left,top:a[c].top-d,right:a[c].right,bottom:a[c].bottom-d});return e},isPointOnVisiblePage:function(a,d,e,b){return b<a-d},checkIfNewLine:function(a,d,e){return d===void 0||!g(a.top,d.top,a.height,d.height,e)},updateLineBounds:function(a,d,e,b){a.top=Math.min(e.top,a.top);a.bottom=Math.max(e.bottom,a.bottom);a.height=a.bottom-a.top;a.width=d&&b?b.left-a.left:e.right-a.left},updateLineHeightOfBounds:function(a,d){a.top=a.top?a.top<=d.top?a.top:
d.top:d.top;a.bottom=a.bottom?a.bottom>=d.bottom?a.bottom:d.bottom:d.bottom;a.left=d.left;a.right=d.right},updateDivIfNewLineOrImageBound:function(a,d,e,b,c){var g=!1;if(a.isNewDiv||a.isImageBound)a.lineBounds={top:d.top,height:d.height,left:a.isNewDiv?d.left:a.lineBounds.left+a.lineBounds.width,right:d.right,width:d.width,bottom:d.bottom};a.isImageBound=c;var q=a.lineBounds,g=f;if(!q||!e)c=!1;else var c=this.clientRectTop(q),o=this.clientRectTop(e),h=this.clientRectHeight(q),n=this.clientRectHeight(e),
q=Math.max(h,n),h=Math.abs(c+h-(o+n))/q,c=Math.abs(c-o)/q<=g&&h<=g;o=this.checkIfNewLine(a.lineBounds,e,!0);a.isNewDiv=!c||o;(g=a.isNewDiv||a.isImageBound)?this.updateLineBounds(a.lineBounds,!c&&!o&&!(b||e===void 0),d,e):(a.lineBounds.top=Math.min(d.top,a.lineBounds.top),a.lineBounds.bottom=Math.max(d.bottom,a.lineBounds.bottom));return g},positionDivAfterWord:function(a,d,e){a.style.top=d.top+e;a.style.left=d.left+d.width+e},getDeltaX:function(){return 0},floatToTopOfIframe:function(a,d){var e=a.document.body,
b=e.getBoundingClientRect(),e=a.getComputedStyle(e);$(d).css({position:"absolute",top:parseInt(e.top,10)-b.top,left:parseInt(e.left,10)-b.left})}}}var c=0.25,f=0.25;return{buildIFrameWritingMode:function(a){if(!a.contentDocument)return b();var d=$(a.contentDocument.documentElement).css("-webkit-writing-mode")==="vertical-rl"||$(a.contentDocument.documentElement).css("writing-mode")==="vertical-rl"||$(a.contentDocument.body).css("-webkit-writing-mode")==="vertical-rl"||$(a.contentDocument.body).css("writing-mode")===
"vertical-rl";d&&KindleRendererDeviceSpecific.needsWritingModeSpecifiedOnBody()&&m(a.contentDocument.body);d&&KindleRendererDeviceSpecific.needsWritingModeSpecifiedOnRoot()&&m(a.contentDocument.documentElement);return d?h():b()},buildHorizontalWritingMode:b,buildVerticalWritingMode:h}}(),KindleRendererContentReflow=function(){function g(a){a=a.contentDocument.getElementsByTagName("body")[0];return $(a).css("position")==="absolute"}function m(a,d){KindleRendererLanguageOptions.getNeedsPageRefresh()&&
!g(a)?(a.contentDocument.body.style.display="none",setTimeout(function(){a.contentDocument.body.style.display="block";d()},1)):d()}function h(a,b,c,f,o,h){e===null&&(e=KindleRendererWordMapGeneratorFactory.buildWordMapGeneratorForWordBounds());var n=o.createSubTimer("preparation");KindleRendererContentCorrection.applyDocumentWideCorrections(a.contentWindow,a.contentDocument,a.writingMode,n);m(a,function(){a.writingMode.prepareForPagination(a);var s=a.contentDocument.getElementById(d);a.writingMode.floatToTopOfIframe(a.contentWindow,
s);n.endTimer();var r=o.createSubTimer("word-map");e.createWordMap(a.contentDocument,a.contentWindow,b,a.writingMode,c,a.processingRequestId,r).then(function(d,b,c){function f(a){j.endTimer();h(a)}r.endTimer();KindleRendererContentCorrection.cleanup(a.contentDocument.body);var j=o.createSubTimer("height-map");g(a)?KindlePaginatorFixedContent(a.contentDocument,d,$(a).parent().height(),f):KindlePaginatorScreenFragmentation(a.contentDocument,d,b,c,e,a.writingMode.height($(a).parent()),a.writingMode,
f);m(a,function(){})},f.reject)})}function b(a,d,e,b){if(a.processingRequestId.id===d.requestId){a.writingMode.scrollToTopOfDocument(a);a.writingMode.resetHeight(a);var f={height:$(a).parent().height(),width:$(a).parent().width()},g=a.contentDocument.getElementsByTagName("body")[0];if(KindleRendererSettings.getSettings().initialExpandedBodyHeight!==void 0){var n=parseInt($(g).css("margin-top"),10),h=parseInt($(g).css("margin-bottom"),10);g.style.height=parseInt(f.height,10)-n-h+"px"}n=g.getElementsByClassName("k4w-margin");
for(h=0;h<n.length;h+=1){var r=parseInt(n[h].getAttribute("vertical"),10);if(r>0)n[h].style.marginTop=Math.round(r*0.01*f.height)+"px"}KindleRendererElementFitting.fitToViewport(g,a.writingMode,f,d.contentLoadMetrics).then(function(){a.processingRequestId.id!==d.requestId?(d.contentLoadMetrics.addCount("Cancelled",1),d.contentLoadMetrics.endTimer()):c(a,d,e,b)},b.reject)}}function c(a,d,e,b){d.contentLoadMetrics.endTimer();var c=d.metrics.createSubTimer("pagination");h(a,e,d.requestId,b,c,function(e){c.endTimer();
a.processingRequestId.id!==d.requestId?(d.contentLoadMetrics.addCount("Cancelled",1),d.contentLoadMetrics.endTimer()):(a.screenManager=e,d.contentLoadMetrics.endTimer(),b.resolve(d))})}function f(a,d){var e=KindleRendererDeviceSpecific.reflowTimeout();e>0&&setTimeout(function(){if(d.state?d.state()==="pending":!d.isRejected()&&!d.isResolved())a.contentLoadMetrics.addCount("Timeout",1),a.contentLoadMetrics.endTimer(),d.reject()},e)}function a(a,d,e){var c=new jQuery.Deferred;f(d,c);var g=d.contentLoadMetrics.createSubTimer("(YIELD) begin-element-fitting");
setTimeout(function(){g.endTimer();b(a,d,e,c)},KindleRendererDeviceSpecific.drawYieldUpdateTime());return c.promise()}var d="content-overlays",e=null;return{initialize:function(){KindleRendererContentCorrection.initialize()},reflow:function(d,e,b){return a(d,e,b)}}}(),KindlePaginatorFixedContent=function(g,m,h,b){g={minDocTop:0,maxDocTop:0,docBottom:h,wordMap:m};(function(b){b.minPosition=Infinity;b.maxPosition=-Infinity;for(var f in m){var a=parseInt(f,10);if(a>b.maxPosition)b.maxPosition=a;if(a<
b.minPosition)b.minPosition=a}})(g);(function(b){b.hasNextScreen=function(b){return b===0};b.hasPreviousScreen=function(b){return b===h};b.getFirstReadingPositionAtHeight=function(){return null};b.getFirstEmptySpaceBeforeHeight=function(){return 0};b.getTopOfNodeAtPosition=function(){return 0};b.findNextScreen=function(f){return!b.hasNextScreen(f)?null:{topOfScreen:0,bottomOfScreen:h}};b.findPreviousScreen=function(b){return!this.hasPreviousScreen(b)?null:{topOfScreen:0,bottomOfScreen:h}}})(g);b(g)},
KindlePaginatorHeightMapGenerator=function(){function g(a,d,b,c,f,g){b<0&&(b=0);c<0&&(c=0);if(d.previousTop===b&&d.previousBottom===c&&d.previousFontSize===g)return!1;d.previousTop=b;d.previousBottom=c;d.previousFontSize=g;if(b<a.minDocTop)a.minDocTop=b;if(b>a.maxDocTop)a.maxDocTop=b;d=c;if(d>a.docBottom)a.docBottom=d;c-=b;g===void 0&&(g=c);c=b+Math.floor((c-g)/2);g=c+g;a=a.nodeHeightRanges;for(b+=1;b<c;)a[b]>=0||(a[b]=-f),++b;for(;b<g;)a[b]>=0||(a[b]=f),++b;for(;b<d;)a[b]===void 0&&(a[b]=-f),++b;
return!0}function m(a){for(var a=a.nodeHeightRanges,d=a.length,b=0,c,f,g,h,n;b<d;){for(;a[b]<0;)a[b]=-a[b],++b;if(a[b]>=0){for(++b;a[b]>=0;)++b;if(a[b]<0){c=b;h=a[c-1];for(++b;a[b]<0;)++b;f=b-1;n=a[b];if(n>=0){g=Math.floor((c+f)/2);for(delete a[g];c<g;++c)a[c]=h;for(c=g+1;c<=f;++c)a[c]=n}else for(;c<=f;++c)a[c]=h}}++b}}function h(a,d,b,c,f,o,p){function n(){h(a+1,d,b,c,f,o,p)}var s=0;for(KindleRendererProcessTuning.startingOperation("HeightMap");a<d.length;){var r=d[a],w=r.position,z=r.rect,C=c.clientRectTop(z),
z=c.clientRectBottom(z);if(C>0||z>0){var u=Math.round(C);g(b,f,u,u+Math.round(z-C+1),w,r.fontSize)&&s++}if(s>p.count){KindleRendererProcessTuning.endingOperation("HeightMap",s);setTimeout(n,p.interval);return}a++}KindleRendererProcessTuning.endingOperation("HeightMap",s);m(b);setTimeout(o.resolve,p.interval)}function b(a){var d={},a=a.body;d.bodyDimensions={height:a.offsetHeight,width:a.offsetWidth};if(a=a.lastElementChild){var b=$(a),a=b.offset(),c=b.width(),b=b.height();d.lastElementPos={top:a.top,
left:a.left,width:c,height:b}}return d}function c(a,d,b,c,f,g,m,n){if(b){var s=new jQuery.Deferred,r={count:KindleRendererProcessTuning.drawYieldFrequency("HeightMap"),interval:KindleRendererProcessTuning.drawYieldUpdateTime("HeightMap")};h(0,b,c,d,{},s,r);s.promise().then(function(){var b=Array.prototype.slice.call(a.getElementsByTagName("hr")),c,j=[];for(c=0;c<b.length;++c)j.push(b[c].getBoundingClientRect());j=d.getTransformedClientRects(j);for(c=0;c<j.length;++c)g.push(j[c]);b=$(a.body).find("[data-hasCssBorder='true']");
d.getBorderMap(b,m);b=[];b=b.concat(Array.prototype.slice.call(a.getElementsByClassName("page-break")));b=b.concat(Array.prototype.slice.call(a.getElementsByClassName("pagebreak")));c=[];for(j=0;j<b.length;++j)c.push(b[j].getBoundingClientRect());c=d.getTransformedClientRects(c);for(j=0;j<c.length;++j)f.push(Math.round(d.clientRectTop(c[j])));n()},function(){})}}function f(b,c){var f=function(){if(h<b.minDocTop)b.minDocTop=h;if(h>b.maxDocTop)b.maxDocTop=h;if(m>b.docBottom)b.docBottom=m;for(var d=
h;d<m;d++)b.nodeHeightRanges[d]===void 0&&(b.nodeHeightRanges[d]=a)},g,q;g=c.top;q=c.bottom;var h,m,n,s,r;for(n=0;n<g.length;n++){h=Math.round(g[n].borderStart);m=Math.round(g[n].borderEnd);f();r=0;for(s=m;s<b.docBottom;s++)if(b.nodeHeightRanges[s]===void 0&&r<=d)b.nodeHeightRanges[s]=a,r++;else break}for(n=0;n<q.length;n++){h=Math.round(q[n].borderStart);m=Math.round(q[n].borderEnd);f();r=0;for(s=h;s>b.minDocTop;s--)if(b.nodeHeightRanges[s]===void 0&&r<=d)b.nodeHeightRanges[s]=a,r++;else break}}
var a="border-height",d=2;return{getHeightMapTags:function(){return{HARD_PAGE_BREAK:"page-break",HORIZONTAL_RULE:"horizontal-rule",BORDER_HEIGHT:a}},createHeightMap:function(a,d,g,l){var h={nodeHeightRanges:[],minPosition:Infinity,maxPosition:0,minDocTop:Infinity,maxDocTop:0,docBottom:0};h.validationData=b(a);var o=[],m=[],n={top:[],bottom:[]};c(a,d,g,h,o,m,n,function(){for(var a=o,b=0;b<a.length;b++){var c=a[b],e=h.nodeHeightRanges[c];if(e===void 0)h.nodeHeightRanges[c]="page-break";else if(e!==
"page-break")for(var g=1;g<20;g++){if(h.nodeHeightRanges[c-g]!==e){h.nodeHeightRanges[c-g]="page-break";break}if(h.nodeHeightRanges[c+g]!==e){h.nodeHeightRanges[c+g]="page-break";break}}}for(a=0;a<m.length;a++)if(c=Math.round(d.clientRectTop(m[a])),b=Math.round(d.clientRectBottom(m[a])),b>c){if(c<h.minDocTop)h.minDocTop=c;if(c>h.maxDocTop)h.maxDocTop=c;if(b>h.docBottom)h.docBottom=b;for(;c<b;c++)h.nodeHeightRanges[c]===void 0&&(h.nodeHeightRanges[c]="horizontal-rule")}f(h,n,d);o=null;l(h)})}}}(),
KindlePaginator=function(){function g(b,c){if(c!==null)b.currentTopOfScreen=c.topOfScreen,b.currentBottomOfScreen=c.bottomOfScreen,h(b)}function m(b,c){if(c!==null)b.currentTopOfScreen=c.topOfScreen,b.currentBottomOfScreen=c.bottomOfScreen,h(b)}function h(b){var c=KindleRendererDeviceSpecific.animatePageFlip(),f=$(b);c&&(f.removeClass("pageTurnEnd"),f.addClass("pageTurnStart"));b.writingMode.scrollTop(b,b.currentTopOfScreen);b.writingMode.fitToBottomOfFrame(b,b.pageOverflowDiv,b.currentBottomOfScreen-
b.currentTopOfScreen);c&&(f.removeClass("pageTurnStart"),f.addClass("pageTurnEnd"))}return{scrollToTop:function(b,c){var f=b.screenManager.findNextScreen(c||b.screenManager.minDocTop<=1?0:b.screenManager.minDocTop-1);g(b,f)},scrollToBottom:function(b,c){var f=b.screenManager.findPreviousScreen(b.screenManager.docBottom,c);m(b,f)},scrollToPosition:function(b,c,f){c=b.screenManager.getTopOfNodeAtPosition(b.contentDocument,c);c=b.screenManager.getFirstEmptySpaceBeforeHeight(c);f=b.screenManager.findNextScreen(f&&
c<=b.screenManager.minDocTop?0:c);g(b,f)},matchFrames:function(b,c){var f=b.screenManager.getFirstReadingPositionAtHeight(b.currentTopOfScreen),a=b.screenManager.getTopOfNodeAtPosition(b.contentDocument,f)-b.currentTopOfScreen,d=b.currentBottomOfScreen-b.currentTopOfScreen,f=c.screenManager.getTopOfNodeAtPosition(c.contentDocument,f);c.currentTopOfScreen=f-a;c.currentBottomOfScreen=c.currentTopOfScreen+d;h(c)},getApproximateNumPreviousScreens:function(b){var c=b.writingMode.height($(b).parent());
return(b.currentTopOfScreen-b.screenManager.minDocTop)/c},getApproximateNumNextScreens:function(b){var c=b.writingMode.height($(b).parent());return(b.screenManager.maxDocTop-b.currentBottomOfScreen)/c},getCurrentPagePositionRange:function(b){var c=b.screenManager.getFirstReadingPositionAtHeight(b.currentTopOfScreen),b=b.screenManager.getFirstReadingPositionAtHeight(b.currentBottomOfScreen)-1;return{currentTopOfPage:c,currentBottomOfPage:b}},hasPreviousScreen:function(b){return b.screenManager.hasPreviousScreen(b.currentTopOfScreen)},
hasNextScreen:function(b){return b.screenManager.hasNextScreen(b.currentBottomOfScreen)},isPreviousFullScreen:function(b,c){var f=b.screenManager.findPreviousScreen(b.currentTopOfScreen,c);return f!==null?b.screenManager.hasPreviousScreen(f.topOfScreen):!1},isNextFullScreen:function(b){var c=b.screenManager.findNextScreen(b.currentBottomOfScreen);return c!==null?b.screenManager.hasNextScreen(c.bottomOfScreen):!1},nextScreen:function(b,c){var f=b.screenManager.findNextScreen(b.currentBottomOfScreen);
return f!==null&&(c||b.screenManager.hasNextScreen(f.bottomOfScreen))?(g(b,f),!0):!1},previousScreen:function(b,c,f){f=b.screenManager.findPreviousScreen(b.currentTopOfScreen,f);return f!==null&&(c||b.screenManager.hasPreviousScreen(f.topOfScreen))?(m(b,f),!0):!1},getWordMap:function(b){return b.screenManager.wordMap},copyIframe:function(b,c){c.screenManager=b.screenManager;c.writingMode=b.writingMode;c.currentTopOfScreen=b.currentTopOfScreen;c.currentBottomOfScreen=b.currentBottomOfScreen;c.writingMode.resetIframeDimensions(c)},
getSelectableItemBoundariesForCurrentScreen:function(b){for(var c=KindlePaginator.getCurrentPagePositionRange(b),f=b.screenManager.wordMap,a=c.currentBottomOfPage,d={},c=c.currentTopOfPage;c<=a;++c){var e=f[c]&&f[c].rects;if(e!==void 0){var g=f[c].selectableRects;g!==void 0&&(e=g);d[c]=b.writingMode.getRectBoundariesForScreen(e,b.currentTopOfScreen)}}return d},getWordPositionsForCurrentScreen:function(b){var c=KindlePaginator.getCurrentPagePositionRange(b),b=b.screenManager.wordPositions,f=c.currentTopOfPage,
a=c.currentBottomOfPage,c=null;if(b&&b.length>0){var d=KindleListUtilities.binarySearch(b,f),a=KindleListUtilities.binarySearch(b,a,void 0,d);b[d]<f&&++d;c=[];for(f=d;f<=a;++f)c.push(b[f])}return c},isPointOnVisiblePage:function(b,c,f){var a=b.writingMode.height(b),d=b.writingMode.height(b.pageOverflowDiv);return b.writingMode.isPointOnVisiblePage(a,d,c,f)},showEndOfDocument:function(b){b.currentTopOfScreen=b.currentBottomOfScreen;h(b)},isIframePaginationValid:function(b){var c=b.screenManager.validationData;
if(c){var f=b.contentDocument.body,a=c.bodyDimensions,b=$(b).parent(),d=window.navigator.userAgent.indexOf("MSIE")!==-1;if(f.offsetHeight===a.height&&f.offsetWidth===a.width||f.offsetHeight<=b.height()&&f.offsetWidth<=b.width())return!0;else if(d&&(a=Math.abs(f.offsetHeight-a.height),f.offsetWidth===f.offsetWidth&&a<80))return!0;f=f.lastElementChild;return(c=c.lastElementPos)&&f?(b=$(f),f=b.offset(),a=b.width(),b=b.height(),f.top===c.top&&f.left===c.left&&a===c.width&&b===c.height):!1}return!0},clearIframePaginationValidation:function(b){b.screenManager.validationData=
null},cleanupIframe:function(b){b.screenManager=null}}}(),KindlePaginatorScreenFragmentation=function(g,m,h,b,c,f,a,d){function e(d){c.addBoundsForPosition(g,m,d,a)}function k(d){d.hasNextScreen=function(a){return this.maxDocTop>=a};d.hasPreviousScreen=function(a){return a>this.minDocTop};d.getFirstReadingPositionAtHeight=function(d){if(this.nodeHeightRanges.length===0)return null;var b;a:{for(var c=this.nodeHeightRanges,f=d;f<c.length;f+=1)if(b=c[f],b!==void 0&&b!==l&&b!==q&&b!==o){b=Math.abs(b);
break a}b=this.maxPosition+1}e(b);if(this.wordMap[b]===void 0)return b;c=a.unionRect(this.wordMap[b].rects);for(f=b;f>=this.minPosition;f--)if(e(f),this.wordMap[f]!==void 0){if(this.wordMap[f].rects===void 0)return null;var g=a.unionRect(this.wordMap[f].rects);if(a.checkIfRectsOnSameLine(g,c)||g.top>=d)b=f;else break}return b};d.getFirstEmptySpaceBeforeHeight=function(a){for(var d,b=a;b>=0;b-=1)if(d=this.nodeHeightRanges[b],d===void 0||d===l)return b;return a};d.getTopOfNodeAtPosition=function(d,
b){if(b<this.minPosition)return this.minDocTop;if(b>this.maxPosition)return this.maxDocTop;for(;b<=this.maxPosition;){e(b);var c=this.wordMap[b];if(c){for(var c=c.rects,f=Infinity,g=0;g<c.length;g++){var k=a.clientRectTop(c[g]);k<f&&(f=k)}return Math.round(f)}b+=1}return this.minDocTop};d.findBestPaginationNearBottom=function(d,b){var c=this.nodeHeightRanges[b];return c!==void 0&&(e(c),c=this.wordMap[c]&&this.wordMap[c].rects,c!==void 0&&(c=Math.floor(a.clientRectTop(c[0])+1),d<=c&&c<b))?c:b-1};d.findBestPaginationNearTop=
function(d,b){var c=this.nodeHeightRanges[d];return c!==void 0&&(c<0&&(c=-c),e(c),c=this.wordMap[c]&&this.wordMap[c].rects,c!==void 0&&(c=Math.floor(a.clientRectBottom(c[c.length-1])),d<c&&c<=b))?c:d+1};d.findNextScreen=function(a){if(this.nodeHeightRanges.length===0||!this.hasNextScreen(a))return null;var d=this.nodeHeightRanges.length;if(a!==0&&this.nodeHeightRanges[a]!==l)for(var b=a+1;b<=d&&this.nodeHeightRanges[b]===void 0;)a=b++;for(var c=a,e=b=0,g=!1,k=!1,j,e=a;e<=d;e+=1)if(b+=1,j=this.nodeHeightRanges[e],
j===void 0?(c=e,k=g):j!==l&&(g=!0),j===l&&e>a){b=e-a;k=g;break}else if(b>=f){c===a&&(c=this.findBestPaginationNearBottom(a+1,a+f-1),k=g);b=c-a;break}c={topOfScreen:a,bottomOfScreen:0};e<d?c.bottomOfScreen=a+b:(c.bottomOfScreen=e,k=g);return!k?e<d?this.findNextScreen(c.bottomOfScreen):null:c};d.findPreviousScreen=function(a,d){if(this.nodeHeightRanges.length===0||!this.hasPreviousScreen(a))return null;for(var b=a,c=0,e=0,g,k=!1,j=!1,n=a,w=a,r=0,e=a;e>=0;e-=1)if(c+=1,g=this.nodeHeightRanges[e],g===
void 0?(b=e,j=k,w=n,k||++r):g!==l&&(k=!0,n=e),g===l&&e<a){if(k)return this.findNextScreen(e);r=c=0;w=n=b=a=e}else if(c>=f){b===a&&(w=this.findBestPaginationNearTop(a-f,a-1),j=k);break}b=w-1;if(b<=this.minDocTop)if(b=this.findNextScreen(d||this.minDocTop<=1?0:this.minDocTop-1),b.bottomOfScreen>=a-r)return b;else b=b.bottomOfScreen;result={topOfScreen:b,bottomOfScreen:a};return!j?e>0?this.findPreviousScreen(result.topOfScreen,d):null:result}}var j=KindlePaginatorHeightMapGenerator.getHeightMapTags(),
l=j.HARD_PAGE_BREAK,q=j.HORIZONTAL_RULE,o=j.BORDER_HEIGHT,p=function(a){var d=[],b;for(b in a){var c=parseInt(b,10);d.push(c)}d.sort(function(a,d){return a-d});return d}(m);if(b&&b.length)rects=b;else{rects=[];for(j=0;j<p.length;++j){var n=p[j],s=m[n].rects,r=m[n].fontSize,w;for(w in s)rects.push({position:n,rect:s[w],fontSize:r})}}KindlePaginatorHeightMapGenerator.createHeightMap(g,a,rects,function(a){a.wordMap=m;a.lineRects=b;a.wordPositions=h;a.wordMapKeys=p;a.wordMapGenerator=c;if(p.length>0)a.minPosition=
p[0],a.maxPosition=p[p.length-1];k(a);d(a)})},KindleRendererWordMapGeneratorFactory=function(){function g(a,d){if(a&&a.getComputedStyle)return a.getComputedStyle(d)}function m(a,d){for(var b=[],c=0;c<a.length;++c){var e=a[c];d.clientRectWidth(e)>1&&b.push(e)}return b}function h(a,d,b,c){d&&b>=0&&a.push({rect:d,position:b,fontSize:c})}function b(a){if(a<128)return 1;else if(a<2048)return 2;else if(a>=55296&&a<=57343)return 2;return 3}function c(a,d){a.fontSize=d&&parseInt(d.fontSize,10)||0;a.hasTextEmphasis=
d?d.webkitTextEmphasisStyle&&d.webkitTextEmphasisStyle!=="none":!1;if(a.domChildIndex===void 0)for(var b=a.parentNode.firstChild,c=0;b;){if(b.nodeType===Node.TEXT_NODE)b.domChildIndex=c;b=b.nextSibling;++c}}function f(a,d){if(KindleRendererSettings.getSettings().fixedContent){var b=a.className;if(b&&b.match(s))return}if(!(a.tagName==="RT"||a.tagName==="RP"))if(a.nodeType===Node.TEXT_NODE||a.tagName==="IMG")d.push(a);else for(var b=a.childNodes,c=b.length,e=0;e<c;e+=1)f(b[e],d)}function a(a){var d=
[];f(a,d);return d}function d(d){if((window.ActiveXObject||"ActiveXObject"in window)&&window.XMLHttpRequest)return a(d.body);else try{var b=(new XPathEvaluator).evaluate("/html/body//text()[not(ancestor::ruby)] | //img[not(ancestor::ruby)] | //ruby",d,null,XPathResult.ORDERED_NODE_ITERATOR_TYPE,null),c;if(b.invalidIteratorState)c=a(d.body);else{for(var e=[],f=b.iterateNext();f;)e.push(f),f=b.iterateNext();c=e}return c}catch(g){return a(d.body)}}function e(a){a.addElementsToWordMap=function(a,d,b,
c,e,f,g){function k(){j.addElementsToWordMap(a,d,b+1,c,e,f,g)}var j=this;KindleRendererProcessTuning.startingOperation("ScreenManager");for(var n=0;b<d.length;){var l=d[b],h=l.id,l=j.getValueForNode(a,l,f);l!==null&&(e[h]=l);n+=1;if(n>=c.interval){KindleRendererProcessTuning.endingOperation("ScreenManager",n);setTimeout(k,c.time);return}b+=1}KindleRendererProcessTuning.endingOperation("ScreenManager",n);setTimeout(function(){g.resolve(e,[],null,0)},c.time)};a.getPositionDataForNode=function(a,d,b){a=
a[d+"_"+b];return a===void 0||a.length===0?null:a};a.getNodeId=function(a){var d=a.parentNode,b=d.getAttribute(n),c=0;if(a.ownChildIndex===void 0)for(;d.childNodes[c]!==a;)c+=1;else c=a.ownChildIndex;return{parentId:b,index:c}};a.getAllBaseNodesInRuby=function(a){a=(new XPathEvaluator).evaluate(".//text()[not(ancestor::rt or ancestor::rp)] | .//img[not(ancestor::rt or ancestor::rp)]",a,null,XPathResult.ORDERED_NODE_ITERATOR_TYPE,null);if(!a.invalidIteratorState){for(var d=[],b=a.iterateNext();b;)b.nodeType===
Node.TEXT_NODE&&b.nodeValue.trim().length===0||d.push(b),b=a.iterateNext();return d}};a.addRubyNodeToWordMap=function(a,d,b,e,f,k,j,n){for(var l=this.getAllBaseNodesInRuby(a),r,q=[],o,m=0;m<l.length;++m)o=l[m],o.deltaX=a.deltaX,o.isRuby=!0,o.nodeType===Node.TEXT_NODE?(r=g(b,o.parentNode),c(o,r),(r=this.addTextNodeToWordMap(this.getNodeId(o),o,d,b,e,f,j))&&this.addTextNodeToLineRects(o,k,f,r,j,n)):(r=g(b,o),o.fontSize=r?parseInt(r.fontSize,10):0,(r=this.addImageNodeToWordMap(o,e,f,j))&&h(k,f[r[0]].rects[0],
r[0])),r&&r.length>0&&(q=q.concat(r));return q}}function k(a){a.addTextNodeToWordMap=function(a,d,b,c,e,f,g){var k=d.nodeValue;if(k&&k.trim().length>0&&(e=this.getPositionDataForNode(e,a.parentId,a.index))){var j=e.length-1,n,l=0,r;a:{r=d;for(var h=0;h<2;h++)if(r.parentNode)if(r.parentNode.getAttribute("data-isTextCombineBlock"))break a;else r=r.parentNode;r=null}if(r){if(r.deltaX===void 0)r.deltaX=g.getDeltaX(r,b);r.parentNode.deltaX=r.deltaX;if(n=this.getValueForNode(c,r.parentNode,g))return l=
e[0][1],f[l]=n,[l]}c=0;r=c<j?e[c+1][0]:Infinity;for(var q=l=h=0,o=k.length,m=[],s=0;s<=o;s++)if(n=k.charCodeAt(s),n<128?h+=1:n<2048?h+=2:n>=55296&&n<=57343?(q+=1,h+=2):h+=3,n=n<=32||n===45,s<o){if(!n){if(q===0)n=this.getValueForWord(b,d,s,s+1,n,a.parentId,g);else if(q===1)continue;else q=0,n=this.getValueForWord(b,d,s-1,s+1,n,a.parentId,g);if(n!==null){for(;l>=r;)c++,r=c<j?e[c+1][0]:Infinity;l=e[c][1]+(l-e[c][0]);f[l]=n;m.push(l)}}l=h}return m}}}function j(a){a.addTextNodeToWordMap=function(a,d,b,
c,e,f,g){if((c=d.nodeValue)&&c.trim().length>0)if(e=this.getPositionDataForNode(e,a.parentId,a.index)){for(var k=e.length-1,j=0,n=j<k?e[j+1][0]:Infinity,l=0,r=0,h=0,l=0,q=c.length,o=[],m=0;m<=q;m++){var s=c.charCodeAt(m);r+=s<128?1:s<2048?2:s>=55296&&s<=57343?2:3;s=s<=32||s===45||s===8212;if(m===q||s){h=this.getValueForWord(b,d,h,m,s,a.parentId,g);if(h!==null){for(;l>=n;)j++,n=j<k?e[j+1][0]:Infinity;l=e[j][1]+(l-e[j][0]);f[l]=h;o.push(l)}h=m+1;l=r}}return o}}}function l(a){a.getValueForWord=function(a,
d,b,c,e,f){return c>b?{startOffset:b,endOffset:c,childIndex:d.domChildIndex,fontSize:d.fontSize,dataNid:f}:null};a.getValueForNode=function(a,d,b){var c=d.getClientRects();if(KindleRendererDeviceSpecific.clientRectsExpire()){for(var e=[],f=0;f<c.length;++f)e.push({top:c[f].top,left:c[f].left,bottom:c[f].bottom,right:c[f].right,width:c[f].width,height:c[f].height});c=e}if(c&&c.length>0){b={rects:b.getTransformedClientRects(c,d)};if(d.tagName==="SPAN")a=g(a,d),b.fontSize=a?parseInt(a.fontSize,10):void 0;
if(d.tagName==="IMG")b.tagName="IMG";b.dataNid=d.getAttribute(n);return b}return null};a.getValueForImage=function(a,d){if(a.getClientRects){var b=a.getClientRects();if(b&&b.length>0)return b=this.getBoundingAndSelectableRects(a,b,d),{selectableRects:b.selectableRects,rects:b.boundingRects,dataNid:a.getAttribute(n)}}return null};a.getValueForWhitespace=function(a,d,b){d=d.createRange();d.setStart(a,0);d.setEnd(a,a.length);return d.getClientRects?(d=d.getClientRects(),this.getBoundingAndSelectableRects(a,
d,b).boundingRects):null};a.getBoundingAndSelectableRects=function(a,d,b){var c=void 0,d=b.getTransformedClientRects(d,a),c=a.hasTextEmphasis||a.isRuby?b.getRectsAdjustedForAnnotationMarks(d,a.fontSize):d;return{boundingRects:c,selectableRects:d}};a.addBoundsForPosition=function(a,d,b,c,e){var f=d[b];if(f&&f.rects===void 0&&(e=e||$("["+n+'="'+f.dataNid+'"]',a).contents()[f.childIndex]))a=a.createRange(),a.setStart(e,f.startOffset),a.setEnd(e,f.endOffset),(a=a.getClientRects())&&a.length>0&&(a=this.getBoundingAndSelectableRects(e,
a,c)),a&&a.boundingRects&&a.boundingRects.length>0?(f.selectableRects=a.selectableRects,f.rects=a.boundingRects):delete d[b]};a.getNextValidPositionIndexInNode=function(a,d,b,c,e,f){for(var g;g===void 0&&b<d.length;)g=d[b],this.addBoundsForPosition(e,c,g,f,a),g=c[g],++b;return g===void 0?-1:--b};a.addTextNodeToLineRects=function(a,d,b,c,e){if(c.length!==0){var f=a.ownerDocument,g=f.createRange();g.selectNode(a);var k=this.getBoundingAndSelectableRects(a,m(g.getClientRects(),e),e).boundingRects,j=
k.length,n=a.fontSize,l=0.25*n;if(j===1)h(d,k[0],c[0],n);else if(j>1){var r;if(c.length===1)for(r=0;r<j;r++)h(d,k[r],c[0],n);else{var q=a.nodeValue.length,o=0;for(r=0;r<j;++r)o+=e.clientRectWidth(k[r]);var q=o/q,s=o=!1,p=this.getNextValidPositionIndexInNode(a,c,0,b,f,e);if(!(p<0)){var F=p,I=c[F],K=b[I],N=K.endOffset-K.startOffset,I=K.rects.length,L=0;for(r=0;r<j;++r)if(L<I-1)Math.abs(e.clientRectTop(K.rects[L])-e.clientRectTop(k[r]))<l&&(h(d,k[r],c[p],n),++L);else if(L=Math.min(L,I-1),Math.abs(e.clientRectTop(K.rects[L])-
e.clientRectTop(k[r]))<l){var Q=e.clientRectWidth(k[r]),Q=Math.round(Q/q);e.clientRectLeft(K.rects[L]);for(e.clientRectLeft(k[r]);F<c.length-1&&N<Q;)++F,K=b[c[F]],N+=K.endOffset-K.startOffset;if(p===F&&(++F,F>=c.length)){h(d,k[r],c[p],n);break}for(g.setStart(a,b[c[p]].startOffset);;)if(g.setEnd(a,b[c[F]].endOffset),K=m(g.getClientRects(),e),K.length>I){if(F<=0)break;--F;if(s)break;o=!0}else if(K.length===I){if(o||F>=c.length-1)break;++F;s=!0}else break;h(d,k[r],c[p],n);if(F>=c.length-1)break;o=s=
!1;p=this.getNextValidPositionIndexInNode(a,c,F+1,b,f,e);if(p<0)break;F=p;I=c[F];K=b[I];N=K.endOffset-K.startOffset;I=K.rects.length;L=0;Math.abs(e.clientRectTop(K.rects[0])-e.clientRectTop(k[r]))<l&&++L}}}}}};a.createBoundsWordMap=function(a,b,c,e,f,g,k){var j=new jQuery.Deferred,n={};c.posMap===void 0||$.isEmptyObject(c.posMap)?this.createWordMapFromElements(a,b,n,e,j):c.posMap!==null?(f={interval:KindleRendererProcessTuning.drawYieldFrequency("WordMapGen"),time:KindleRendererProcessTuning.drawYieldUpdateTime("WordMapGen"),
metrics:k||KindleMetricsProfiler("wordMap"),requestId:f,processingRequest:g},this.createWordMapFromNodeList(0,d(a),a,b,c,n,[],e,f,j)):j.resolve(n,[],[],0);return j.promise()};a.computeAllWordRects=function(a,d,b,c,e,f){function g(){if(e.requestId===e.computingRectsId.id){KindleRendererProcessTuning.startingOperation("WordMapGen");for(var o=0;r<b.length;++r){if((l=d[b[r]])&&l.rects===void 0){if(l.dataNid!==j.dataNid||l.childIndex!==j.childIndex)if(k=$("["+n+'="'+l.dataNid+'"]',a).contents()[l.childIndex],
!k)return;j=l;h.setStart(k,l.startOffset);h.setEnd(k,l.endOffset);var m=h.getClientRects();m&&m.length>0&&(m=q.getBoundingAndSelectableRects(k,m,c));m&&m.boundingRects&&m.boundingRects.length>0?(l.selectableRects=m.selectableRects,l.rects=m.boundingRects):delete d[b[r]];++o}if(o>=e.frequency){KindleRendererProcessTuning.endingOperation("WordMapGen",o);setTimeout(g,e.time);return}}KindleRendererProcessTuning.endingOperation("WordMapGen",o);f.resolve()}}var k,j={},l,r=0,h=a.createRange(),q=this;h.getClientRects?
g():f.resolve()};a.addImageNodeToWordMap=function(a,d,b,c){c=this.getValueForImage(a,c);if(c!==null&&(a=a.getAttribute(n),a!==null))return d=d[a],b[d[0][1]]=c,[d[0][1]]};a.createWordMapFromElements=function(a,d,b,c,e){var f=[],f=f.concat(Array.prototype.slice.call(a.getElementsByTagName("IMG"))),f=f.concat(Array.prototype.slice.call(a.getElementsByTagName("CANVAS"))),f=f.concat(Array.prototype.slice.call(a.getElementsByClassName("k4w"))),f=f.concat(Array.prototype.slice.call(a.getElementsByClassName("k4wc"))),
a={interval:KindleRendererProcessTuning.drawYieldFrequency("ScreenManager"),time:KindleRendererProcessTuning.drawYieldUpdateTime("ScreenManager")};this.addElementsToWordMap(d,f,0,a,b,c,e)};a.createWordMapFromNodeList=function(a,d,b,e,f,k,j,n,l,r){function q(){l.requestId===l.processingRequest.id&&o.createWordMapFromNodeList(a+1,d,b,e,f,k,j,n,l,r)}var o=this;KindleRendererProcessTuning.startingOperation("WordMapGen");var m=0,s=d.length,p=null,G=l.numPositionsAdded||0,F=f.wordList&&f.wordList.length;
if(F&&!f.imageList)f.imageList=[];for(var I=f.imageList,K,N=l.metrics.createSubTimer("text counters (timeless)");a<s;){var L=d[a],Q=k;L.deltaX=n.getDeltaX(L,b);if(L.nodeType===Node.TEXT_NODE)K=g(e,L.parentNode),K&&K.display==="none"||(c(L,K),p=o.getNodeId(L),p=o.addTextNodeToWordMap(p,L,b,e,f.posMap,k,n),p===void 0?(p=[],Q=[{rects:o.getValueForWhitespace(L,b,n)}]):this.addTextNodeToLineRects(L,j,k,p,n,N));else if(L.tagName==="IMG"){if(K=g(e,L),L.fontSize=K?parseInt(K.fontSize,10):0,p=o.addImageNodeToWordMap(L,
f.posMap,k,n))h(j,k[p[0]].rects[0],p[0]),F&&I.push(p[0])}else p=o.addRubyNodeToWordMap(L,b,e,f.posMap,k,j,n,N);p&&p.length&&(G+=p.length,KindleRendererContentCorrection.applyNodeLocalCorrections(L,p,Q,e,n,l.metrics));++m;if(m>=l.interval){l.numPositionsAdded=G;KindleRendererProcessTuning.endingOperation("WordMapGen",m);setTimeout(q,l.time);return}++a}s=F?KindleListUtilities.sortedMerge(f.wordList,I):[];delete f.imageList;KindleRendererProcessTuning.endingOperation("WordMapGen",m);r.resolve(k,s,j,
G)}}function q(d){d.getValueForWord=function(a,d,b,c,e){return c>b?(a=d.nodeValue,b={text:a.substr(b,e?c-b+1:c-b)},c===a.length&&(b.text+=this.WORD_DELIMITER),b):null};d.findSibling=function(a){return a&&a.nodeType!==Node.DOCUMENT_NODE?a.nextSibling?a.nextSibling:this.findSibling(a.parentNode):null};d.getValueForNode=function(a,d){if(d.tagName!=="IMG"){var b=d.textContent;if(!/\s/.test(b[b.length-1])){var c=this.findSibling(d);c&&c.className!=="k4w"&&(b+=" ")}return{text:b}}return null};d.getValueForImage=
function(){return null};d.WORD_DELIMITER=KindleRendererLanguageOptions.getHasWhitespaceDelimitedWords()?" ":"";d.createTextWordMap=function(d,b){var c=new jQuery.Deferred,e={},f,g,k,j,n;if(b.posMap===void 0){j=$(d).find("CANVAS,.k4w,.k4wc");j=$.makeArray(j);n=j.length;for(f=0;f<n;f++)k=j[f],g=k.id,k=this.getValueForNode(null,k),k!==null&&(e[g]=k)}else if(b.posMap!==null){j=a(d);n=j.length;for(f=0;f<n;f++)k=j[f],k.nodeType===Node.TEXT_NODE&&(g=this.getNodeId(k),this.addTextNodeToWordMap(g,k,null,null,
b.posMap,e))}c.resolve(e);return c.promise()}}function o(a,d){a.createWordMap=function(a,b,c,e,f,g,k){return d.createBoundsWordMap(a,b,c,e,f,g,k)};a.addBoundsForPosition=function(a,b,c,e,f){d.addBoundsForPosition(a,b,c,e,f)};a.computeWordRects=function(a,b,c,e,f,g,k,j){var n=new jQuery.Deferred;f==="mobi8"&&c&&c.length>0?(f={frequency:KindleRendererProcessTuning.drawYieldFrequency("WordMapGen"),time:KindleRendererProcessTuning.drawYieldUpdateTime("WordMapGen"),requestId:g,computingRectsId:k},d.computeAllWordRects(a,
b,c,e,f,n,j)):n.resolve();return n.promise()}}function p(a,d){a.createWordMap=function(a,b){return d.createTextWordMap(a,b)}}var n="data-nid",s=/(?=.*target)(?=.*mag)/i;return{buildWordMapGeneratorForWordBounds:function(){var a={},d={};e(a);l(a);o(d,a);KindleRendererLanguageOptions.getHasWhitespaceDelimitedWords()?j(a):k(a);return d},buildWordMapGeneratorForWordText:function(){var a={},d={};e(a);q(a);p(d,a);KindleRendererLanguageOptions.getHasWhitespaceDelimitedWords()?j(a):k(a);return d},countUTF8Bytes:function(a){return b(a)}}}(),
KindleRegionAnnotationRenderer=function(){function g(b,f){return b.contentDocument.querySelectorAll("mark[annotationType"+(f?'="'+f.type+'"':"")+"][annotationStart"+(f?'="'+f.start+'"':"")+"]")}function m(b,f,a){var d,e;if(!b||!f||parseInt(b.id,10)>parseInt(f.id,10)||b.tagName==="MARK"||f.tagName==="MARK")throw"Insertion of <mark> tags failed.";if(b.parentNode===f.parentNode){a=a();d=f.nextSibling;e=b.parentNode;var g=b;do b=g,g=b.nextSibling,e.removeChild(b),a.appendChild(b);while(b!==f);e.insertBefore(a,
d)}else KindleRendererUtils.treeDepth(b)>KindleRendererUtils.treeDepth(f)?b.previousElementSibling||KindleRendererUtils.isBlock(b.parentNode)?(d=KindleRendererUtils.previousPositionedNode(b.parentNode),e=KindleRendererUtils.nextPositionedNode(KindleRendererUtils.followingNode(b.parentNode)),m(b,d,a),m(e,f,a)):m(b.parentNode,f,a):f.nextElementSibling||KindleRendererUtils.isBlock(f.parentNode)?(d=KindleRendererUtils.previousPositionedNode(KindleRendererUtils.precedingNode(f.parentNode)),e=KindleRendererUtils.nextPositionedNode(f.parentNode),
m(b,d,a),m(e,f,a)):m(b,f.parentNode,a)}function h(b,f,a){var d=b.contentDocument,b=KindleRendererUtils.findElementAtOrAfterPosition(d,f.start),e=KindleRendererUtils.findElementAtOrBeforePosition(d,f.end);try{m(b,e,function(){var b=d.createElement("mark");b.className=a;b.setAttribute("annotationType",f.type);b.setAttribute("annotationStart",f.start);return b})}catch(g){}}function b(b,f){for(var a=Array.prototype.slice.call(f),d=0;d<a.length;d++){var e=a[d],g=e.getAttribute("annotationType");if(g===
"kindle.highlight"||g==="kindle.search"){for(var g=b.createDocumentFragment(),j=e.firstChild,l;j;)l=j.nextSibling,e.removeChild(j),g.appendChild(j),j=l;j=e.parentNode;l=e.nextSibling;j.removeChild(e);j.insertBefore(g,l)}else e.parentNode.removeChild(e)}}return{createAnnotationElements:function(b,f){var a;for(a=0;a<f.length;a++){var d=f[a];if(d.type==="kindle.highlight")h(b,d,"highlight");else if(d.type==="kindle.note"){var e=b.contentDocument,k=e.createElement("div");k.className="note-icon";var j=
e.createElement("mark");j.className="note";j.setAttribute("annotationType",d.type);j.setAttribute("annotationStart",d.start);j.setAttribute(KindleRendererAnnotationRenderer.ANNOTATION_CLICK_ATTRIBUTE,"true");j.appendChild(k);d=KindleRendererUtils.findElementAtOrBeforePosition(e,d.start);d.parentNode.insertBefore(j,d.nextSibling)}else d.type==="kindle.search"&&(j=b,g(j,d).length>0||h(j,d,"search-result"))}},removeAnnotationElements:function(c,f){b(c.contentDocument,g(c,f))},removeAllAnnotationElements:function(c){b(c.contentDocument,
g(c))}}}(),KindleRegionContentManager=function(){function g(a){if(p||n){if(a<=k)throw{name:"pagingError",message:"Repeating wait request"};k=a;e<0&&d.waitNotification&&d.waitNotification();e=a}}function m(a){if((p||n)&&e>=0&&e<=a)r=0,e=-1,n&&(p=!0,n=!1),d.readyNotification&&d.readyNotification(),d.rectsReadyNotification&&d.rectsReadyNotification()}function h(b,c,f){e<=b&&(c!==KindleRendererIframeManagerFactory.DATA_LOAD_ERROR&&r<s?(++r,a(f)):(d.errorNotification&&d.errorNotification(c),e=-1))}function b(a){a=
l.gotoPosition(a);if(!a){var d=l.getCurrentProcessId();g(d);l.getCurrentProcessDfd().then(function(){m(d)},function(a){h(d,a)})}return a}function c(){try{var d=l.nextScreen();if(!d){var b=l.getCurrentProcessId();g(b);l.getCurrentProcessDfd().then(function(){c();m(b)},function(a){h(b,a,0)})}return d}catch(e){return KindleDebug.breakPt(),a(),!1}}function f(){try{var d=l.previousScreen();if(!d){var b=l.getCurrentProcessId();g(b);l.getCurrentProcessDfd().then(function(){f();m(b)},function(a){h(b,a,0)})}return d}catch(c){return KindleDebug.breakPt(),
a(),!1}}function a(){var a=l.getPagePositionRange();if(a!==null)q=a.currentTopOfPage;l.reloadNotification();b(q)}var d={},e=-1,k=-1,j=null,l=null,q=0,o,p=!0,n=!1,s=3,r=0;return{initialize:function(a,b,c){j=a;d=b;o=c;q=void 0;l=KindleRendererIframeManagerFactory.build(j);l.setOverlayManager(o);l.setAnnotationEventCallback(d.annotationTriggered)},cleanup:function(){l&&l.cleanup();j=l=null;e=k=-1;d={};o=null},hide:function(){n=p=!1},show:function(){n=!0},updateSettings:function(a){l.updateSettings(a)},
gotoPosition:function(a){return b(a,0)},nextScreen:function(){return c()},previousScreen:function(){return f()},hasNextScreen:function(){return l.hasNextScreen()},hasPreviousScreen:function(){return l.hasPreviousScreen()},getPagePositionRange:function(){return l.getPagePositionRange()},getSelectableItemBoundaries:function(){return null},getWordPositions:function(){return null},onWindowResize:function(){l.resizeNotification()},handleClick:function(){},reloadAnnotations:function(){l&&l.reloadAnnotations()},
getZoomableAt:function(){return null},getZoomableList:function(){return[]},clearSelection:function(){l.clearSelection()},getSelection:function(){return l.getSelection()}}}(),KindleRegionIframeManager=function(){function g(a){a.cancelCurrentRequest=function(){if(this.currentRequest)this.currentRequest.cancelled=!0,this.currentRequest=null};a.createNewRequest=function(a,b){this.cancelCurrentRequest();this.currentRequest={type:a,requestId:KindleRendererRequestId.getUniqueRequestId(),metrics:KindleMetricsProfiler("renderer-iframe-load"),
retryCount:0,initialPosition:b};this.currentRequestDfd=new jQuery.Deferred};a.willRetryCurrentRequest=function(){this.currentRequest&&this.currentRequest.retryCount++};a.canRetryCurrentRequest=function(){return this.currentRequest?this.currentRequest.retryCount<f:!0};a.calculateIframePaginationData=function(a,b,f){var g=this,l=KindleRendererFragmentLoader.getBookContentType()==="topaz"?g.currentRequest.type?KindleRendererIframePreparation.CANVAS_INSERTION_PREVIOUS:KindleRendererIframePreparation.CANVAS_INSERTION_NEXT:
KindleRendererIframePreparation.CANVAS_INSERTION_NONE;KindleRendererIframePreparation.prepareIframe(a,g.currentRequest,b,f,l).then(function(b){if(a.processingRequestId.id===b.requestId&&g.currentRequest&&g.currentRequest.requestId===b.requestId)a.processingRequestId.id=null,g.frameIsLoadedAndReady(a);g=null},function(a){g.currentRequest&&a&&g.currentRequest.requestId===a.requestId&&g.currentRequestDfd.reject(c);g=null})};a.loadContentDataIntoIframe=function(a){var c=this;c.currentRequest.contentLoadMetrics=
c.currentRequest.metrics.createSubTimer("content-load");c.contentRange[this.hiddenIframeIndex]=a.contentRange;var f=this.iframes[this.hiddenIframeIndex];f.processingRequestId.id=c.currentRequest.requestId;KindleRendererIframeLoading.loadIframe(f,c.currentRequest,a).then(function(g,l){KindleRendererProcessTuning.runAfterYield(KindleRendererDeviceSpecific.yieldTimeAfterIframeLoaded(),g.type,function(){if(f.processingRequestId.id===g.requestId&&c.currentRequest&&c.currentRequest.requestId===g.requestId){c.positionData[c.hiddenIframeIndex]=
l.positionData;var h=c.getViewportDimensions(f);c.regionManagers[c.hiddenIframeIndex].computeFilledRegionNodes();c.ensureElementsWillFit(f,h,c.currentRequest.contentLoadMetrics).then(function(){c.currentRequest.contentLoadMetrics.endTimer();c.calculateIframePaginationData(f,a,l);(KindleHostDeviceDetector.isMetro()||KindleHostDeviceDetector.isIE())&&c.addSelectionListener(f);c=null},function(){c.currentRequest&&c.currentRequestDfd.reject(b);c=null})}else c=null})},function(){c.currentRequest&&c.currentRequestDfd.reject(b)})};
a.ensureElementsWillFit=function(a,b,c){a.writingMode.scrollToTopOfDocument(a);a.writingMode.resetHeight(a);var f=a.contentDocument.getElementsByTagName("body")[0];if(KindleRendererSettings.getSettings().initialExpandedBodyHeight!==void 0){var g=parseInt($(f).css("margin-top"),10),h=parseInt($(f).css("margin-bottom"),10);f.style.height=parseInt(b.height,10)-g-h+"px"}g=f.getElementsByClassName("k4w-margin");for(h=0;h<g.length;h+=1){var o=parseInt(g[h].getAttribute("vertical"),10);if(o>0)g[h].style.marginTop=
Math.round(o*0.01*b.height)+"px"}return KindleRendererElementFitting.fitToViewport(f,a.writingMode,b,c)};a.annotationClickedHandler=function(a){if(this.annotationEventCallback!==void 0){var b=a.currentTarget.parentNode,a=b.getAttribute("annotationType"),b=b.getAttribute("annotationStart");this.annotationEventCallback(a,b)}};a.renderAnnotations=function(a,b){a&&KindleRegionAnnotationRenderer.removeAllAnnotationElements(a);if(this.overlayManager){var c=this.overlayManager.getOverlaysInRange(b.startPosition,
b.endPosition);c&&c.length>0&&this.createAnnotationElements(a,c)}};a.frameIsLoadedAndReady=function(a){var b=this.currentRequest;this.iframeLoadStatus[a.index]=b.type;this.renderAnnotations(a,this.contentRange[a.index]);b&&b.initialPosition!==null&&(this.regionManagers[a.index].updateView(KindleRegionManagerFactory.VIEW_REQUEST.GO_TO_POSITION,{position:b.initialPosition}),a===this.iframes[this.hiddenIframeIndex]&&(this.swapIframes(),this.updateDisplayedPositionsInPage()));b.metrics.addCount("Success",
1);b.metrics.endTimer();b.metrics.log();this.currentRequest=null;setTimeout(this.currentRequestDfd.resolve,10);b.type===this.loadedType.GOTO_POSITION&&this.considerLoadingMoreFragments()};a.loadFragmentsForRange=function(a){var b=this;KindleRendererFragmentLoader.loadFragments(a,b.currentRequest).then(function(a,d){b.currentRequest&&b.currentRequest.requestId===a.requestId&&b.loadContentDataIntoIframe(d);b=null},function(a,d){b.currentRequest&&b.currentRequest.requestId===d.requestId&&b.currentRequestDfd.reject(h);
b=null})};a.gotoPosition=function(a){var b=this.iframes[this.visibleIframeIndex];b&&KindleRegionAnnotationRenderer.removeAllAnnotationElements(b);this.createNewRequest(this.loadedType.GOTO_POSITION,a);a=KindleRendererPositionLoadingCalculator.calculateDesiredFragmentRangeForGoTo(a);if(KindleRendererFragmentLoader.needToLoadFragments(this.contentRange[this.visibleIframeIndex],a))return this.loadFragmentsForRange(a),!1;else this.frameIsLoadedAndReady(this.iframes[this.visibleIframeIndex]);return!0};
a.setIframeVisibility=function(a,b){b?this.regionManagers[a].show():this.regionManagers[a].hide()};a.swapIframes=function(){this.iframeLoadStatus[this.visibleIframeIndex]=this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.NEXT?this.loadedType.PREVIOUS:this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.PREVIOUS?this.loadedType.NEXT:this.loadedType.EMPTY;this.iframeLoadStatus[this.hiddenIframeIndex]=this.loadedType.EMPTY;var a=this.visibleIframeIndex;this.visibleIframeIndex=
this.hiddenIframeIndex;this.hiddenIframeIndex=a;this.setIframeVisibility(this.visibleIframeIndex,!0);this.setIframeVisibility(this.hiddenIframeIndex,!1)};a.getPagePositionRange=function(){return this.regionManagers[this.visibleIframeIndex].getPagePositionRange()};a.reloadAnnotations=function(){this.renderAnnotations(this.iframes[this.visibleIframeIndex],this.contentRange[this.visibleIframeIndex]);this.iframes[this.hiddenIframeIndex]!==null&&this.iframeLoadStatus[this.hiddenIframeIndex]!==this.loadedType.EMPTY&&
this.renderAnnotations(this.iframes[this.hiddenIframeIndex],this.contentRange[this.hiddenIframeIndex])};a.loadNextPages=function(){if(this.iframeLoadStatus[this.hiddenIframeIndex]!==this.loadedType.NEXT&&(this.currentRequest===null||this.currentRequest.type!==this.loadedType.NEXT)){var a=this.contentRange[this.visibleIframeIndex].endPosition+1,b=this.getPagePositionRange(),a=KindleRendererPositionLoadingCalculator.calculateDesiredFragmentRangeForPageFlip(a,b);this.createNewRequest(this.loadedType.NEXT,
null);this.loadFragmentsForRange(a)}};a.loadPreviousPages=function(){if(this.iframeLoadStatus[this.hiddenIframeIndex]!==this.loadedType.PREVIOUS&&(this.currentRequest===null||this.currentRequest.type!==this.loadedType.PREVIOUS)){var a=this.contentRange[this.visibleIframeIndex].startPosition-1,b=this.getPagePositionRange(),a=KindleRendererPositionLoadingCalculator.calculateDesiredFragmentRangeForPageFlip(a,b);this.createNewRequest(this.loadedType.PREVIOUS,null);this.loadFragmentsForRange(a)}};a.considerLoadingMoreFragments=
function(a){if(this.canPreloadNext){var b=a!==this.direction.PREVIOUS?4:2;if(this.getApproximateNumNextScreens()<b&&this.hasMoreNextFragments()){this.loadNextPages();return}}this.canPreloadPrevious&&(a=a===this.direction.PREVIOUS?4:2,this.getApproximateNumPrevScreens()<a&&this.hasMorePreviousFragments()&&this.loadPreviousPages())};a.crossSkeletonBoundary=function(){var a=this.contentRange[this.visibleIframeIndex],b=this.contentRange[this.hiddenIframeIndex];if(this.iframeLoadStatus[this.hiddenIframeIndex]===
this.loadedType.NEXT)if(a.skeletonId+1===b.skeletonId)return this.swapIframes(),!0;else if(a.skeletonId!==b.skeletonId)return this.iframeLoadStatus[this.hiddenIframeIndex]=this.loadedType.EMPTY,!1;if(this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.PREVIOUS)if(a.skeletonId-1===b.skeletonId)return this.swapIframes(),!0;else if(a.skeletonId!==b.skeletonId)this.iframeLoadStatus[this.hiddenIframeIndex]=this.loadedType.EMPTY;return!1};a.cleanup=function(){this.cancelCurrentRequest();KindleRendererIframeLoading.cleanupIframe(this.iframes[this.visibleIframeIndex]);
KindleRendererIframeLoading.cleanupIframe(this.iframes[this.hiddenIframeIndex]);this.setOverlayManager(null);this.contentRange=[null,null];this.positionData=[null,null];this.iframes=null};a.hasMoreNextFragments=function(){return this.contentRange[this.visibleIframeIndex].endPosition!==KindleRendererFragmentLoader.getMaximumPosition()};a.hasMorePreviousFragments=function(){return this.contentRange[this.visibleIframeIndex].startPosition!==KindleRendererFragmentLoader.getMinimumPosition()};a.isAtEndOfDocumentOrSkeleton=
function(){var a=this.contentRange[this.visibleIframeIndex];return KindleRendererFragmentLoader.isPositionAtEndOfSkeletonOrDocument(a.skeletonId,a.endPosition)};a.isAtBeginningOfDocumentOrSkeleton=function(){var a=this.contentRange[this.visibleIframeIndex];return KindleRendererFragmentLoader.isPositionAtBeginningOfSkeletonOrDocument(a.skeletonId,a.startPosition)};a.getApproximateNumNextScreens=function(){return this.regionManagers[this.visibleIframeIndex].getApproximateNumNextScreens(this.isAtEndOfDocumentOrSkeleton())};
a.getApproximateNumPrevScreens=function(){return this.regionManagers[this.visibleIframeIndex].getApproximateNumPrevScreens(this.isAtBeginningOfDocumentOrSkeleton())};a.hasNextScreen=function(){return this.regionManagers[this.visibleIframeIndex].hasNextScreen(this.isAtEndOfDocumentOrSkeleton())||this.hasMoreNextFragments()};a.hasPreviousScreen=function(){return this.regionManagers[this.visibleIframeIndex].hasPreviousScreen(this.isAtBeginningOfDocumentOrSkeleton())||this.hasMorePreviousFragments()};
a.updateDisplayedPositionsInPage=function(){var a=this.getPagePositionRange();KindleRendererPositionLoadingCalculator.updateDisplayedPositionRange(a.currentBottomOfPage-a.currentTopOfPage)};a.considerFlippingFrames=function(){var a=this.iframeLoadStatus[this.hiddenIframeIndex];if(a!==this.loadedType.EMPTY){var b=this.getPagePositionRange(),c=this.contentRange[this.hiddenIframeIndex],f=0,g=0;a===this.loadedType.NEXT?g=1:f=1;if(b.currentTopOfPage>=c.startPosition+f&&b.currentBottomOfPage<=c.endPosition-
g){b=this.regionManagers[this.hiddenIframeIndex];c=this.regionManagers[this.visibleIframeIndex].getPagePositionRange();if(a===this.loadedType.NEXT){if(a={position:c.currentBottomOfPage,allowPartialScreen:this.isAtEndOfDocumentOrSkeleton()},a=b.updateView(KindleRegionManagerFactory.VIEW_REQUEST.NEXT_PAGE,a),!a)return this.requestMoreNextPages(),!1}else if(a={position:c.currentTopOfPage,allowPartialScreen:this.isAtBeginningOfDocumentOrSkeleton()},a=b.updateView(KindleRegionManagerFactory.VIEW_REQUEST.PREVIOUS_PAGE,
a),!a)return this.requestMorePreviousPages(),!1;this.swapIframes();return!0}}return!1};a.nextScreen=function(){var a=this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.NEXT;if(a&&this.considerFlippingFrames())return!0;var b=this.isAtEndOfDocumentOrSkeleton(),c=this.regionManagers[this.visibleIframeIndex].nextScreen(b);if(!c)if(this.hasMoreNextFragments())if(a&&b&&this.crossSkeletonBoundary())c=!0;else return this.requestMoreNextPages(),!1;else c=!0;this.considerLoadingMoreFragments(this.direction.NEXT);
this.updateDisplayedPositionsInPage();KindleDebug.log("Next Screen Success:"+c);return c};a.requestMoreNextPages=function(){var a=this.getPagePositionRange(),b=this.contentRange[this.visibleIframeIndex];a.currentBottomOfPage&&KindleRendererPositionLoadingCalculator.updateDisplayedPositionRange(b.endPosition-a.currentBottomOfPage);this.iframeLoadStatus[this.hiddenIframeIndex]=this.loadedType.EMPTY;this.loadNextPages()};a.requestMorePreviousPages=function(){var a=this.getPagePositionRange(),b=this.contentRange[this.visibleIframeIndex];
a.currentTopOfPage&&KindleRendererPositionLoadingCalculator.updateDisplayedPositionRange(a.currentTopOfPage-b.startPosition);this.iframeLoadStatus[this.hiddenIframeIndex]=this.loadedType.EMPTY;this.loadPreviousPages()};a.previousScreen=function(){KindleDebug.log("****Prev screen****");if(this.iframeLoadStatus[this.hiddenIframeIndex]===this.loadedType.PREVIOUS&&this.considerFlippingFrames())return!0;var a=this.isAtBeginningOfDocumentOrSkeleton(),b=this.regionManagers[this.visibleIframeIndex].previousScreen(a);
if(!b&&this.hasMorePreviousFragments())if(a&&this.crossSkeletonBoundary())b=!0;else return this.requestMorePreviousPages(),!1;else!b&&!this.hasMorePreviousFragments()&&KindleDebug.error("PreviousScreen: Was not able to go to previous screen, and there is no more previous fragments.");this.considerLoadingMoreFragments(this.direction.PREVIOUS);this.updateDisplayedPositionsInPage();return b};a.cancelHiddenIframeLoading=function(){var a=this.iframes[this.hiddenIframeIndex];if(a.processingRequestId.id!==
null)a.processingRequestId.id=null,this.cancelCurrentRequest()};a.scaleElementsInIframe=function(a){var b=this.getViewportDimensions(a);if(a&&a.contentDocument&&a.contentDocument.body){a.writingMode=KindleRendererWritingModeFactory.buildIFrameWritingMode(a);a.writingMode.resetIframeDimensions(a);var c;c=this.currentRequest&&this.currentRequest.contentLoadMetrics?this.currentRequest.contentLoadMetrics:KindleMetricsProfiler("content-load");this.ensureElementsWillFit(a,b,c).then(function(){c.endTimer()})}};
a.getViewportDimensions=function(a){var b=$(this.parent).width(),c=this.numColumns-1,f=this.getMargins(this.margin),c=parseInt((b-(this.columnGap-(f.left+f.right))*c)/this.numColumns,10);return{height:$(a).parent().height(),width:c,parentWidth:b}};a.updateSettings=function(a){var b=this.visibleIframeIndex,c=this.hiddenIframeIndex,f=this.getPagePositionRange().currentTopOfPage;if(a.columns!==void 0){if(a.columns.num!==void 0){this.numColumns=a.columns.num;this.regionManagers[b].computeFilledRegionNodes();
this.scaleElementsInIframe(this.iframes[b]);var g=this;setTimeout(function(){g.regionManagers[c].computeFilledRegionNodes();g.scaleElementsInIframe(g.iframes[c]);g=null},0)}if(a.columns.gap!==void 0)this.columnGap=parseInt(a.columns.gap,10)}if(a.margin!==void 0)this.margin=a.margin;KindleRendererIframeLoading.updateSettingsInIframe(this.iframes[b]);var h=this;setTimeout(function(){KindleRendererIframeLoading.updateSettingsInIframe(h.iframes[c]);h=null},0);f&&(this.regionManagers[b].updateView(KindleRegionManagerFactory.VIEW_REQUEST.GO_TO_POSITION,
{position:f}),this.updateDisplayedPositionsInPage())};a.getMargins=function(a){if(this.parent&&a&&a.length>0){var b=document.getElementById("renderer_translation_div");if(!b)b=document.createElement("div"),b.id="renderer_translation_div",$(b).css({visibility:"hidden","z-index":-1E3}),this.parent.appendChild(b);$(b).css({margin:a});a=window.getComputedStyle(b);return{top:parseFloat(a.marginTop),bottom:parseFloat(a.marginBottom),left:parseFloat(a.marginLeft),right:parseFloat(a.marginRight)}}return{top:0,
bottom:0,left:0,right:0}};a.reloadNotification=function(){this.contentRange=[null,null];this.positionData=[null,null];this.cancelHiddenIframeLoading();this.iframeLoadStatus=[this.loadedType.EMPTY,this.loadedType.EMPTY]};a.resizeNotification=function(){var a=this.getPagePositionRange();this.regionManagers[this.visibleIframeIndex].updateView(KindleRegionManagerFactory.VIEW_REQUEST.GO_TO_POSITION,{position:a.currentTopOfPage});this.updateDisplayedPositionsInPage()};a.updateGlyphColorForFrameIndex=function(a){this.iframes[a].hasGlyphs&&
this.iframes[a].contentDocument&&KindleGlyphRenderer.updateTextColor(this.iframes[a])};a.updateGlyphColor=function(){this.updateGlyphColorForFrameIndex(this.visibleIframeIndex);this.updateGlyphColorForFrameIndex(this.hiddenIframeIndex)};a.setAnnotationEventCallback=function(a){this.annotationEventCallback=a};a.getCurrentProcessDfd=function(){return this.currentRequestDfd.promise()};a.getCurrentProcessId=function(){return this.currentRequest.requestId};a.getZoomableAt=function(a,b,c){return KindleRendererZoomablesFactory.buildFromCoord(this.iframes[this.visibleIframeIndex].contentDocument,
a,b,c)};a.getZoomableList=function(a){return KindleRendererZoomablesFactory.buildList(this.iframes[this.visibleIframeIndex].contentDocument,a)};a.addClickHandlers=function(a){var b=this,a=$("mark["+KindleRendererAnnotationRenderer.ANNOTATION_CLICK_ATTRIBUTE+"='true']",a.contentDocument).children();$(a).unbind("click");$(a).click(function(a){b.annotationClickedHandler(a)})};a.createAnnotationElements=function(a,b){KindleRegionAnnotationRenderer.createAnnotationElements(a,b);this.addClickHandlers(a)};
a.addAnnotation=function(a,b,c){a&&b&&c&&b.startPosition<=c.end&&c.start<=b.endPosition&&this.createAnnotationElements(a,[c])};a.removeAnnotation=function(a,b){a&&b&&KindleRegionAnnotationRenderer.removeAnnotationElements(a,b)};a.onOverlayAdded=function(b){a.addAnnotation(a.iframes[0],a.contentRange[0],b.overlay);a.addAnnotation(a.iframes[1],a.contentRange[1],b.overlay)};a.onOverlayRemoved=function(b){a.removeAnnotation(a.iframes[0],b.overlay);a.removeAnnotation(a.iframes[1],b.overlay)};a.setOverlayManager=
function(a){this.overlayManager&&(this.overlayManager.removeEventListener(this.overlayManager.OVERLAY_ADDED_EVENT,this.onOverlayAdded),this.overlayManager.removeEventListener(this.overlayManager.OVERLAY_REMOVED_EVENT,this.onOverlayRemoved));if(this.overlayManager=a)this.overlayManager.addEventListener(this.overlayManager.OVERLAY_ADDED_EVENT,this.onOverlayAdded),this.overlayManager.addEventListener(this.overlayManager.OVERLAY_REMOVED_EVENT,this.onOverlayRemoved)};a.setCanPreloadNext=function(a){this.canPreloadNext=
a};a.setCanPreloadPrevious=function(a){this.canPreloadPrevious=a};a.clearSelection=function(){var a=this.iframes[this.visibleIframeIndex].contentWindow;if(this.selection)this.selection.select(),this.selection=null;a.window.getSelection&&(a.window.getSelection().empty?a.window.getSelection.empty():a.window.getSelection().removeAllRanges&&a.window.getSelection().removeAllRanges());a.document.selection&&a.document.selection.empty&&a.document.selection.empty()};a.getSelection=function(){var a=this.iframes[this.visibleIframeIndex].contentWindow,
b=null,b=KindleHostDeviceDetector.getDevicePlatform(),c=null,f=this.selection;f&&f.select();if((b==="metro"||b==="metroArm"||KindleHostDeviceDetector.isIE())&&a.document.selection)b=a.document.selection,c=this.createSelectionForIE(b);return c};a.createSelectionForIE=function(a){var b=KindleRendererDeviceSpecific.resolutionScale(),c=this.regionManagers[this.visibleIframeIndex].getOffsetTop()*b,a=a.createRange(),f=a.getClientRects(),g=f[f.length-1].width?f[f.length-1]:f[f.length-2],f=f[0],h={},o=null,
o=null;a.text.indexOf(" ")!==0&&a.expand("word");h.context=a.text;o=document.createElement("div");o.innerHTML=a.htmlText;o=this.getSelectionBoundaries(o);h.start=parseInt(o.start,10);h.end=parseInt(o.end,10);h.lowerBounds={};h.lowerBounds.right=g.right/b;h.lowerBounds.bottom=(g.bottom-c)/b;h.lowerBounds.left=g.left/b;h.lowerBounds.top=(g.top-c)/b;h.lowerBounds.width=g.width/b;h.lowerBounds.height=g.height/b;h.upperBounds={};h.upperBounds.left=f.left/b;h.upperBounds.top=(f.top-c)/b;h.upperBounds.right=
f.right/b;h.upperBounds.bottom=(f.bottom-c)/b;h.upperBounds.width=f.width/b;h.upperBounds.height=f.height/b;return h};a.getSelectionBoundaries=function(a){var b=[],c={},b=a.getElementsByTagName("canvas");if(b.length!==0)c.start=b[0].id,c.end=b[b.length-1].id;else if(b=a.getElementsByTagName("span"),b.length!==0){for(a=0;isNaN(b[a].id);)a++;c.start=b[a].id;for(a=1;isNaN(b[b.length-a].id);)a++;c.end=b[b.length-a].id}return c};a.addSelectionListener=function(a){function b(c){if(c.type==="MSPointerDown")g.addPointer(c.pointerId);
else if(c.type==="MSGestureTap"&&a.contentWindow.document.selection.type==="Text")f.selection=null}var c=a.contentDocument.getElementsByTagName("body")[0],f=this;c.onselect=function(b){var c=a.contentWindow.document.selection;if(c&&c.type==="Text"){if(c=c.createRange(),!f.selection||!c.isEqual(f.selection))f.selection=c,c=a.ownerDocument.createEvent("CustomEvent"),c.initCustomEvent(b.type,!0,!0,b),a.dispatchEvent(c)}else f.selection=null};a.contentDocument.onselectionchange=function(b){var c=a.contentWindow.document.selection;
if(c&&c.type==="Text"&&(c=c.createRange(),f.selection&&!c.isEqual(f.selection)))f.selection=null,c=a.ownerDocument.createEvent("CustomEvent"),c.initCustomEvent(b.type,!0,!0,b),a.dispatchEvent(c)};c.onselectstart=function(b){var c=a.contentWindow.document.selection;if(c&&c.type==="None"&&f.selection)f.selection=null,b.preventDefault()};c.ondblclick=function(b){f.selection=null;var c=a.ownerDocument.createEvent("MouseEvent");c.initMouseEvent(b.type,!0,!0,window.parent,b.detail,b.screenX,b.screenY,b.clientX,
b.clientY,b.ctrlKey,b.altKey,b.shiftKey,b.metaKey,b.button,null);a.dispatchEvent(c)};if(window.MSGesture){var g=new MSGesture;g.target=c;c.addEventListener("MSGestureTap",b,!1);c.addEventListener("MSPointerDown",b,!1)}}}var m=0,h=m++,b=m++,c=m++,f=5;return{DATA_LOAD_ERROR:h,IFRAME_ERROR_LOADING:b,IFRAME_ERROR_PAGINATING:c,build:function(a,b){for(var c=[],f=[],j=0;j<2;j+=1){var l,h=j,m=b;l=document.createElement("iframe");var p="flow_"+h;l.index=h;l.processingRequestId={};l.setAttribute("frameBorder",
"0");l.setAttribute("id","frame_"+h);l.setAttribute("name","book_iframe_"+h);l.setAttribute("scrolling","no");l.style.msFlowInto=p;$(l).css({msFlowInto:p,position:"absolute",top:"0px",left:"0px",display:"none"});h=KindleRegionManagerFactory.build(l,p,m);l={iframe:l,regionManager:h};c[j]=l.iframe;f[j]=l.regionManager;b.appendChild(c[j])}a.loadedType={EMPTY:0,GOTO_POSITION:1,NEXT:2,PREVIOUS:3};a.direction={NEXT:2,PREVIOUS:3};a.iframes=c;a.regionManagers=f;a.iframeLoadStatus=[a.loadedType.EMPTY,a.loadedType.EMPTY];
a.contentRange=[null,null];a.positionData=[null,null];a.visibleIframeIndex=0;a.hiddenIframeIndex=1;a.overlayManager=null;a.numColumns=1;a.columnGap=20;a.margin=0;a.parent=b;a.selection=null;g(a)}}}();
function KindleRegionNodeFactory(g){var m=null,h=null,b=null,c=null;return{show:function(){g.style.left="0px"},hide:function(){g.style.left="-9999px"},setPagePositionRange:function(b,a){m=b;h=a},getPagePositionRange:function(){return{topOfPagePosition:m,bottomOfPagePosition:h}},setNumPageBreaks:function(c){b=c},getNumPageBreaks:function(){return b},getRegionContent:function(){return g.msGetRegionContent()},getRegionOverflow:function(){return c=g.msRegionOverflow},getCachedRegionOverflow:function(){return c},
getHeight:function(){return g.clientHeight}}}
function KindleRegionPageBreakPivot(g){var m,h;return{insert:function(b){if(!m){var c=g.contentDocument.createElement("div");c.className="renderer-page-break";for(var f=g.contentWindow.document.getElementById(b);!f.previousSibling&&!KindleRendererUtils.isBlock(f)&&f.parentNode.tagName!=="BODY";)f=f.parentNode;g.contentWindow.document.body.firstElementChild!==f&&(f.parentNode.insertBefore(c,f),h=b,m=c)}},clear:function(){var b=g.contentDocument.getElementsByClassName("renderer-page-break");b&&b.length>
0&&b[0].parentNode.removeChild(b[0]);h=m=null},getPosition:function(){return h}}}
var KindleRegionManagerFactory=function(){function g(f){f.updateView=function(a,b){var c,f=!1,g=b.position,l=b.allowPartialScreen;switch(a){case h.NEXT_PAGE:c=this.findPositionAfter(g);break;case h.PREVIOUS_PAGE:c=this.findPositionBefore(g);if(KindleRendererUtils.isNumeric(c))return f=this.showPreviousPage(c,l);break;case h.GO_TO_POSITION:this.computeFilledRegionNodes(),c=this.findPositionForGoTo(g)}KindleRendererUtils.isNumeric(c)&&(f=this.showPositionAtStart(c));return f};f.createDocumentFragmentWithRegions=
function(a){for(var b=document.createDocumentFragment(),c=0;c<a;c++){var f=document.createElement("div");$(f).css({msFlowFrom:this.flowName,position:"absolute",top:"0px",left:"-9999px",width:"100%",height:"100%","z-index":"100"});b.appendChild(f)}return b};f.computeFilledRegionNodes=function(){function a(a){for(var b=[],c=0;c<a.length;c++)b.push(KindleRegionNodeFactory(a[c]));return b}var b=this.regions,c;this.regionCount===-1&&(b=this.createDocumentFragmentWithRegions(KindleRendererDeviceSpecific.defaultNumRegions()),
this.container.appendChild(b),b=a(this.container.children),b=Array.prototype.slice.call(b));for(c=b[b.length-1].getRegionOverflow();c==="overflow"||c==="fit";)b=this.createDocumentFragmentWithRegions(b.length/4),this.container.appendChild(b),b=a(this.container.children),b=Array.prototype.slice.call(b),c=b[b.length-1].getRegionOverflow();for(var f=0;f<b.length;f++)if(c=b[f].getRegionOverflow(),c==="empty"){this.regionCount=f;break}this.regions=b};f.getRegionWithPosition=function(a){for(var b=this.regions,
c,f=0;f<this.regionCount;f++)if(c=b[f].getPagePositionRange(),a>=c.topOfPagePosition&&a<=c.bottomOfPagePosition)return f;return null};f.showRegionWithPosition=function(a){var b=this.indexVisible,a=this.getRegionWithPosition(a);return a!==null?(this.hideRegion(b),this.showRegion(a),!0):!1};f.showRegion=function(a){var b=this.regions;return a!==null&&a>=0&&a<this.regionCount?(b[a].show(),this.indexVisible=a,!0):!1};f.hideRegion=function(a){var b=this.regions;return a!==null&&a>=0&&a<b.length?(b[a].hide(),
!0):!1};f.findPositionBefore=function(a){return this.findNearestPosition(a,this.DIRECTION.PREV)};f.findPositionAfter=function(a){return this.findNearestPosition(a,this.DIRECTION.NEXT)};f.findNearestPosition=function(a,c){function e(){for(var e=f.iframe.contentWindow.document.querySelectorAll(b),g=null,j=Infinity,h=0;h<e.length;h++){var n=parseInt(e[h].id,10)-a;!(c===f.DIRECTION.PREV&&n>0)&&!(c===f.DIRECTION.NEXT&&n<0)&&(n=Math.abs(n),n>0&&n<j&&(j=n,g=e[h]))}return g}var f=this,g=null,g=(g=this.iframe.contentWindow.document.getElementById(a))?
c===this.DIRECTION.PREV?KindleRendererUtils.previousPositionedNode(g):c===this.DIRECTION.NEXT?KindleRendererUtils.nextPositionedNode(g):KindleRendererUtils.nextPositionedNode(g)||KindleRendererUtils.previousPositionedNode(g):e(),f=null;return g?parseInt(g.id,10):null};f.showPositionAtStart=function(a){return(a=this.iframe.contentWindow.document.getElementById(a))?(this.pageBreakPivot.clear(),this.pageBreakPivot.insert(a.id),this.computeFilledRegionNodes(),this.computePaginationData(),this.showRegionWithPosition(a.id)):
!1};f.fixPaginationDataHack=function(a,b){if(b>1){var c,f;for(c=0;c<b-1;c++){var g=a[c].getPagePositionRange();if(g.topOfPagePosition!==null)for(f=c+1;f<b;f++){var h=a[f].getPagePositionRange();if(h.topOfPagePosition!==null&&h.bottomOfPagePosition!==null){f=null;f=g.topOfPagePosition===h.topOfPagePosition?g.topOfPagePosition:h.topOfPagePosition-1;a[c].setPagePositionRange(g.topOfPagePosition,f);break}}}c=0;for(g=1;g<b;g++)c+=a[g].getNumPageBreaks();a[0].setNumPageBreaks(a[0].getNumPageBreaks()-c)}};
f.computePaginationData=function(){for(var a=this.regions,d=this.regionCount,e=0;e<d;e++){for(var f=a[e],g=f.getRegionContent(),h=[],m=[],o=[],p,n=null,s=null,r=0;r<g.length;r++)o[r]=g[r].cloneContents().querySelectorAll(b),h=h.concat(Array.prototype.slice.call(o[r])),p=g[r].cloneContents().querySelectorAll(c),m=m.concat(Array.prototype.slice.call(p));h.length&&(n=parseInt(h[0].id,10),s=parseInt(h[h.length-1].id,10));f.setPagePositionRange(n,s);f.setNumPageBreaks(m.length)}this.fixPaginationDataHack(a,
d)};f.cleanUp=function(){$(this.container).empty();this.regions=[]};f.getPagePositionRange=function(){var a={},b=this.regions,c=this.indexVisible;b&&c!==null&&(a=b[c].getPagePositionRange(),a={currentTopOfPage:a.topOfPagePosition?a.topOfPagePosition:0,currentBottomOfPage:a.bottomOfPagePosition?a.bottomOfPagePosition:0});return a};f.findNextScreen=function(a,b){for(var c=(KindleRendererUtils.isNumeric(b)?b:this.indexVisible)+1;c<this.regionCount;){var f=this.regions[c].getPagePositionRange();if(f.topOfPagePosition!==
null||f.bottomOfPagePosition!==null){if(a)return c;if(this.findPositionAfter(f.bottomOfPagePosition)===null){for(f=this.iframe.contentWindow.document.getElementById(f.bottomOfPagePosition);f.parentNode&&f.parentNode.tagName!=="BODY";)f=f.parentNode;for(;f.nextSibling;){if(f.nextSibling.nodeName==="DIV"&&f.nextSibling.id!=="content-overlays")return null;f=f.nextSibling}}return c}c++}return null};f.findPreviousScreen=function(a,b){for(var c=(KindleRendererUtils.isNumeric(b)?b:this.indexVisible)-1;c>=
0;){var f=this.regions[c].getPagePositionRange();if(f.topOfPagePosition!==null||f.bottomOfPagePosition!==null){if(a)return c;if(this.findPositionBefore(f.topOfPagePosition)===null){for(f=this.iframe.contentWindow.document.getElementById(f.topOfPagePosition);f.parentNode&&f.parentNode.tagName!=="BODY";)f=f.parentNode;for(;f.previousSibling;){if(f.previousSibling.nodeName==="DIV"&&f.previousSibling.id!=="content-overlays")return null;f=f.previousSibling}}return c}c--}return null};f.hasNextScreen=function(a){return this.findNextScreen(a)!==
null};f.hasPreviousScreen=function(a){return this.findPreviousScreen(a)!==null};f.nextScreen=function(a){var b=!0,b=this.regions,c=this.indexVisible,f=this.findNextScreen(a);this.hideRegion(c);f===null||b[f].getCachedRegionOverflow()!=="overflow"&&!a?(b=!1,KindleDebug.log("NextScreen: No more next screens to show.")):b=this.showRegion(f);return b};f.previousScreen=function(a){var b=!0,c=this.regions,f=this.indexVisible,g=this.findPreviousScreen(a);this.hideRegion(f);if(g===null||c[g].getCachedRegionOverflow()!==
"overflow"&&!a)b=!1,KindleDebug.log("PreviousScreen: No more previous screens to show.");else{if((c=this.pageBreakPivot.getPosition())&&this.getRegionWithPosition(c)-1===g)if(c=this.findPositionBefore(this.getPagePositionRange().currentTopOfPage),KindleRendererUtils.isNumeric(c))return this.showPreviousPage(c,a);else if(a&&g===0)return KindleDebug.log("PreviousScreen: Could not find a position before to show. Assuming it is a cover."),this.pageBreakPivot.clear(),this.computeFilledRegionNodes(),this.computePaginationData(),
this.showRegion(g);wasAbleToGoToNextScreen=this.showRegion(g)}return b};f.getNumColumns=function(){return parseInt(this.iframe.contentWindow.document.body.currentStyle.columnCount,10)};f.showPreviousPage=function(a,d){this.pageBreakPivot.clear();this.computeFilledRegionNodes();this.computePaginationData();var e=this.getRegionWithPosition(a),f=this.regions[e],g=this.getBoundingClientRect(this.iframe.contentWindow.document.getElementById(a)),h=this.container.getBoundingClientRect();if(f.getNumPageBreaks()>
0||f.getPagePositionRange().bottomOfPagePosition===a)return this.showRegionWithPosition(a),!0;var m=this.getNumColumns(),f=g.bottom,o=h.width/m,p=null;if(f-h.top<g.height)return!0;if(m>1)for(h=1;h<=m;h++)if(g.left<o*h){p={start:o*(h-1),end:o*h};break}m=this.findPreviousScreen(d,e);if(m===null)d&&this.showRegionWithPosition(a);else{e=this.regions[m].getRegionContent();if(e.length>0){e=e[0].cloneContents().querySelectorAll(b+","+c);g=null;for(o=h=0;o!==this.regions[m].getNumPageBreaks();){var n=$(e[h]);
(n.hasClass("page-break")||n.hasClass("pagebreak"))&&o++;h++}for(;h<e.length;h++)if(m=this.iframe.contentWindow.document.getElementById(e[h].id),o=this.getBoundingClientRect(m),n=p?o.left>p.start&&o.left<p.end:!0,o.top>f&&n){g=m;break}g&&(this.pageBreakPivot.insert(g.id),this.computeFilledRegionNodes(),this.computePaginationData())}this.showRegionWithPosition(a);return!0}return!1};f.getBoundingClientRect=function(a){var a=a.getBoundingClientRect(),b=KindleRendererDeviceSpecific.resolutionScale();
return{height:a.height/b,width:a.width/b,left:a.left/b,right:a.right/b,top:(a.top%this.container.clientHeight+this.container.getBoundingClientRect().top)/b,bottom:(a.bottom%this.container.clientHeight+this.container.getBoundingClientRect().top)/b}};f.show=function(){this.container.style.left="0px"};f.hide=function(){this.container.style.left="-9999px"};f.getApproximateNumNextScreens=function(a){for(var b=0,c=this.findNextScreen(a,this.indexVisible);c!==null&&c<this.regionCount;)c=this.findNextScreen(a,
c+1),b++;KindleDebug.log("getApproximateNumNextScreens: # of next screens left:"+b);return b};f.getApproximateNumPrevScreens=function(a){for(var b=0,c=this.findPreviousScreen(a,this.indexVisible);c!==null&&c>0;)c=this.findPreviousScreen(a,c-1),b++;KindleDebug.log("getApproximateNumPrevScreens: # of prev screens left:"+b);return b};f.getOffsetTop=function(){return this.regions[this.indexVisible].getHeight()*this.indexVisible};f.findPositionForGoTo=function(a){function b(a){for(var c=a,d=parseInt(c.id,
10),a=a.getClientRects()[0].top;c;)if((c=KindleRendererUtils.previousPositionedNode(c))&&c.getClientRects()[0].top===a)d=parseInt(c.id,10);else break;return d}var c=this.iframe,f=c.contentDocument.getElementById(a);if(!f){var g=this.findPositionAfter(a)||this.findPositionBefore(a);g&&(f=c.contentWindow.document.getElementById(g))}return f?b(f):a}}function m(b){b.nextScreen=function(a){return this.internal.nextScreen(a)};b.previousScreen=function(a){return this.internal.previousScreen(a)};b.hasNextScreen=
function(a){return this.internal.hasNextScreen(a)};b.hasPreviousScreen=function(a){return this.internal.hasPreviousScreen(a)};b.getPagePositionRange=function(){return this.internal.getPagePositionRange()};b.cleanup=function(){this.internal.cleanup()};b.show=function(){this.internal.show()};b.hide=function(){this.internal.hide()};b.updateView=function(a,b){return this.internal.updateView(a,b)};b.getApproximateNumNextScreens=function(a){return this.internal.getApproximateNumNextScreens(a)};b.getApproximateNumPrevScreens=
function(a){return this.internal.getApproximateNumPrevScreens(a)};b.getOffsetTop=function(){return this.internal.getOffsetTop()};b.computeFilledRegionNodes=function(){this.internal.computeFilledRegionNodes()}}var h={GO_TO_POSITION:1,NEXT_PAGE:2,PREVIOUS_PAGE:3},b="span.k4w, canvas.k4wc, img",c=".page-break, .pagebreak";return{VIEW_REQUEST:h,build:function(b,a,c){var e={internal:{}};e.internal.DIRECTION={NEXT:"next",PREV:"prev"};var k=e.internal,h=document.createElement("div");h.id="container_"+a;
$(h).css({position:"absolute",top:"0px",left:"0px",height:"100%",width:"100%"});c.appendChild(h);k.iframe=b;k.flowName=a;k.parent=c;k.container=h;k.regions=[];k.regionCount=-1;k.indexVisible=null;k.pageBreakPivot=KindleRegionPageBreakPivot(b);g(e.internal);m(e);return e}}}(),KindleRendererDeviceSpecific=function(){var g={};return{initialize:function(){var m=KindleHostDeviceDetector.getDevicePlatform();if(m==="desktop"){g.fragmentBufferCapacityForGoTo=2;g.fragmentBufferCapacityForPageFlip=10;g.fragmentBufferCapacityForPageFlipGlyphs=
3;g.drawYieldUpdateTime=25;g.drawYieldScreenManagerFrequency=5E3;g.drawYieldGlyphRendereringFrequency=1E3;g.drawYieldWordMapGenFrequency=5E3;g.drawYieldWordMapGenUpdateTime=25;g.drawYieldHeightMapFrequency=5E3;g.drawYieldHeightMapUpdateTime=25;g.drawYieldSanitizeNodesFrequency=2500;g.drawYieldSanitizeNodesTime=0;g.reflowTimeout=-1;g.maximumCanvases=4900;g.clientRectsExpire=KindleHostDeviceDetector.isIE();g.rendererInitializationTimeout=6E4;g.glyphCacheMaxSize=15;if(KindleHostDeviceDetector.hasCanvasPerformanceProblem())g.maximumCanvases=
1750,g.drawYieldGlyphRendereringFrequency=200;if(m!=="metro"&&KindleHostDeviceDetector.isIE())g.fragmentBufferCapacityForPageFlip=6,g.drawYieldUpdateTime=0,g.drawYieldScreenManagerFrequency=500,g.drawYieldGlyphRendereringFrequency=200,g.drawYieldWordMapGenFrequency=500,g.drawYieldWordMapGenUpdateTime=0,g.drawYieldHeightMapFrequency=500,g.drawYieldHeightMapUpdateTime=25,g.yieldTimeOnContentReceived=0,g.yieldTimeAfterBulkWriteToIframe=0,g.yieldTimeBeforeBulkWriteToIframe=0,g.yieldTimeAfterIframeLoaded=
0,g.yieldTimeLoadNextFragment=0,g.maximumCanvases=1750,g.clientRectsExpire=!0,g.mightUseCSSRegions=!0,g.defaultNumRegions=25,g.mightUseNativeSelection=!0}else m==="lassen"?(g.fragmentBufferCapacityForGoTo=1.2,g.fragmentBufferCapacityForPageFlip=7,g.fragmentBufferCapacityForPageFlipGlyphs=2,g.drawYieldGlyphRendereringFrequency=200,g.reflowTimeout=2E4,g.maximumCanvases=1750,g.rendererInitializationTimeout=2E4,g.drawYieldSanitizeNodesFrequency=2500,g.drawYieldSanitizeNodesTime=0,KindleHostDeviceDetector.isiPhone()?
(g.drawYieldWordMapGenFrequency=20,g.drawYieldWordMapGenUpdateTime=10,g.drawYieldHeightMapFrequency=500,g.drawYieldHeightMapUpdateTime=10,g.drawYieldScreenManagerFrequency=250,g.drawYieldUpdateTime=50):(g.drawYieldWordMapGenFrequency=300,g.drawYieldWordMapGenUpdateTime=50,g.drawYieldHeightMapFrequency=500,g.drawYieldHeightMapUpdateTime=20,g.drawYieldScreenManagerFrequency=250,g.drawYieldUpdateTime=10)):m==="metro"?(g.fragmentBufferCapacityForGoTo=2,g.fragmentBufferCapacityForPageFlip=6,g.fragmentBufferCapacityForPageFlipGlyphs=
3,g.drawYieldUpdateTime=0,g.drawYieldScreenManagerFrequency=500,g.drawYieldGlyphRendereringFrequency=200,g.drawYieldWordMapGenFrequency=500,g.drawYieldWordMapGenUpdateTime=0,g.drawYieldHeightMapFrequency=500,g.drawYieldHeightMapUpdateTime=25,g.yieldTimeOnContentReceived=0,g.yieldTimeAfterBulkWriteToIframe=0,g.yieldTimeBeforeBulkWriteToIframe=0,g.yieldTimeAfterIframeLoaded=0,g.yieldTimeLoadNextFragment=0,g.reflowTimeout=-1,g.maximumCanvases=1750,g.clientRectsExpire=!0,g.rendererInitializationTimeout=
6E4,g.drawYieldSanitizeNodesFrequency=2500,g.drawYieldSanitizeNodesTime=0,g.glyphCacheMaxSize=15,g.mightUseCSSRegions=!0,g.defaultNumRegions=25,g.mightUseNativeSelection=!0):m==="metroArm"?(g.fragmentBufferCapacityForGoTo=1.2,g.fragmentBufferCapacityForPageFlip=5,g.fragmentBufferCapacityForPageFlipGlyphs=2,g.drawYieldUpdateTime=0,g.drawYieldScreenManagerFrequency=500,g.drawYieldGlyphRendereringFrequency=200,g.drawYieldWordMapGenFrequency=500,g.drawYieldWordMapGenUpdateTime=0,g.drawYieldHeightMapFrequency=
500,g.drawYieldHeightMapUpdateTime=25,g.yieldTimeOnContentReceived=0,g.yieldTimeAfterBulkWriteToIframe=0,g.yieldTimeBeforeBulkWriteToIframe=0,g.yieldTimeAfterIframeLoaded=0,g.yieldTimeLoadNextFragment=0,g.reflowTimeout=-1,g.maximumCanvases=1750,g.clientRectsExpire=!0,g.rendererInitializationTimeout=9E4,g.drawYieldSanitizeNodesFrequency=2500,g.drawYieldSanitizeNodesTime=0,g.glyphCacheMaxSize=15,g.animatePageFlip=!1,g.mightUseCSSRegions=!0,g.defaultNumRegions=15,g.mightUseNativeSelection=!0):(g.fragmentBufferCapacityForGoTo=
1.2,g.fragmentBufferCapacityForPageFlip=7,g.fragmentBufferCapacityForPageFlipGlyphs=2,g.drawYieldUpdateTime=50,g.drawYieldScreenManagerFrequency=250,g.drawYieldGlyphRendereringFrequency=200,g.drawYieldWordMapGenFrequency=300,g.drawYieldWordMapGenUpdateTime=50,g.drawYieldHeightMapFrequency=5E3,g.drawYieldHeightMapUpdateTime=50,g.drawYieldSanitizeNodesFrequency=2500,g.drawYieldSanitizeNodesTime=0,g.reflowTimeout=1E4,g.maximumCanvases=1750,g.rendererInitializationTimeout=9E4,g.animatePageFlip=KindleHostDeviceDetector.isiOS()&&
!KindleHostDeviceDetector.isiOS_4x());g.needsReflowOnPageFlip=KindleHostDeviceDetector.isiOS_4x()||KindleHostDeviceDetector.isChrome&&KindleHostDeviceDetector.isChrome()&&navigator.userAgent.indexOf("Chrome/18.")>=0;g.usesDocRelativeVerticalCoordinates=KindleHostDeviceDetector.isiOS();g.needsWritingModeSpecifiedOnBody=KindleHostDeviceDetector.isiOS();g.needsWritingModeSpecifiedOnRoot=KindleHostDeviceDetector.isFirefox()||KindleHostDeviceDetector.isChrome();g.verticalParagraphsScaleSeparately=KindleHostDeviceDetector.isiPhone();
g.needsLanguageSpecificItalicsCheck=KindleHostDeviceDetector.isiOS()&&parseInt(KindleHostDeviceDetector.getOSMajorVersion(),10)===7;g.shouldRotateECJKChar=KindleHostDeviceDetector.isiOS()&&KindleHostDeviceDetector.getOSMajorVersion&&KindleHostDeviceDetector.getOSMinorVersion&&(parseInt(KindleHostDeviceDetector.getOSMajorVersion(),10)<6||parseInt(KindleHostDeviceDetector.getOSMajorVersion(),10)===6&&parseInt(KindleHostDeviceDetector.getOSMinorVersion(),10)===0);g.swapUnderlinesAndOverlines=KindleHostDeviceDetector.isSafari()||
KindleHostDeviceDetector.isiOS()},fragmentBufferCapacityForGoTo:function(){return g.fragmentBufferCapacityForGoTo},fragmentBufferCapacityForPageFlip:function(m){return m?g.fragmentBufferCapacityForPageFlipGlyphs:g.fragmentBufferCapacityForPageFlip},drawYieldUpdateTime:function(){return g.drawYieldUpdateTime},glyphCacheMaxSize:function(){return g.glyphCacheMaxSize||0},drawYieldWordMapGenUpdateTime:function(){return g.drawYieldWordMapGenUpdateTime},drawYieldHeightMapUpdateTime:function(){return g.drawYieldHeightMapUpdateTime},
drawYieldScreenManagerFrequency:function(){return g.drawYieldScreenManagerFrequency},drawYieldGlyphRendereringFrequency:function(){return g.drawYieldGlyphRendereringFrequency},drawYieldWordMapGenFrequency:function(){return g.drawYieldWordMapGenFrequency},drawYieldHeightMapFrequency:function(){return g.drawYieldHeightMapFrequency},drawYieldSanitizeNodesFrequency:function(){return g.drawYieldSanitizeNodesFrequency},yieldTimeOnContentReceived:function(){return g.yieldTimeOnContentReceived},yieldTimeAfterBulkWriteToIframe:function(){return g.yieldTimeAfterBulkWriteToIframe},
yieldTimeBeforeBulkWriteToIframe:function(){return g.yieldTimeBeforeBulkWriteToIframe},yieldTimeAfterIframeLoaded:function(){return g.yieldTimeAfterIframeLoaded},yieldTimeLoadNextFragment:function(){return g.yieldTimeLoadNextFragment},needsReflowOnPageFlip:function(){return g.needsReflowOnPageFlip},shouldRotateECJKChar:function(){return g.shouldRotateECJKChar},needsLanguageSpecificItalicsCheck:function(){return g.needsLanguageSpecificItalicsCheck},usesDocRelativeVerticalCoordinates:function(){return g.usesDocRelativeVerticalCoordinates},
needsWritingModeSpecifiedOnBody:function(){return g.needsWritingModeSpecifiedOnBody},needsWritingModeSpecifiedOnRoot:function(){return g.needsWritingModeSpecifiedOnRoot},verticalParagraphsScaleSeparately:function(){return g.verticalParagraphsScaleSeparately},reflowTimeout:function(){return g.reflowTimeout},maximumCanvases:function(){return g.maximumCanvases},animatePageFlip:function(){return g.animatePageFlip},clientRectsExpire:function(){return g.clientRectsExpire},rendererInitializationTimeout:function(){return g.rendererInitializationTimeout},
drawYieldSanitizeNodesTime:function(){return g.drawYieldSanitizeNodesTime||0},mightUseCSSRegions:function(){return g.mightUseCSSRegions},mightUseNativeSelection:function(){return g.mightUseNativeSelection},defaultNumRegions:function(){return g.defaultNumRegions||0},swapUnderlinesAndOverlines:function(){return g.swapUnderlinesAndOverlines},resolutionScale:function(){var g=1;screen.deviceXDPI&&(g=screen.deviceXDPI/96);return g}}}(),KindleRendererLanguageOptions=function(){function g(g){function s(){var a=
{};a.fontFamilyRegex=d;a.sansFont=k;KindleHostDeviceDetector.isWindows&&KindleHostDeviceDetector.isWindows()?(a.serifFont=j,a.defaultFont=j):(a.serifFont=e,a.defaultFont=e);return a}var g=g&&g.split("-")[0].toLowerCase()||"en",r={};g==="ja"?(r=KindleHostDeviceDetector.isAndroid()?{fontFamilyRegex:c,sansFont:a,serifFont:f,defaultFont:f}:{fontFamilyRegex:m,sansFont:b,serifFont:h,defaultFont:h},p={hasWhitespaceDelimitedWords:!1,language:g,lineHeight:"1.75",allowsVerticalLayout:!0,allowsNegativeTextIndent:!0,
allowsClearStyle:!1,needsPageRefresh:!0,needsFontSanitization:!0,needsDeviceSpecificItalicsCheck:!0,fontOptions:r}):g==="zh"?(r=s(),p={hasWhitespaceDelimitedWords:!1,language:g,lineHeight:"1.4",allowsVerticalLayout:!0,allowsNegativeTextIndent:!0,allowsClearStyle:!0,needsPageRefresh:!0,needsFontSanitization:!0,needsDeviceSpecificItalicsCheck:!1,fontOptions:r}):(r={fontFamilyRegex:l,sansFont:o,serifFont:q,defaultFont:q},p={hasWhitespaceDelimitedWords:!0,language:g,lineHeight:"1.4",allowsVerticalLayout:!1,
allowsNegativeTextIndent:!1,allowsClearStyle:!0,needsPageRefresh:!1,needsFontSanitization:!1,needsDeviceSpecificItalicsCheck:!1,fontOptions:r})}var m=/(Hiragino)|(HiraKaku)/,h="'Hiragino Mincho ProN'",b="HiraKakuProN-W3",c=/(Noto Serif CJK JP)|(Noto Sans CJK JP)/,f="Noto Serif CJK JP",a="Noto Sans CJK JP",d=/(SimSun)|(Songti)|(Heiti)/,e="'Songti SC'",k="'Heiti SC'",j="'SimSun'",l=/(serif)|(sans-serif)|(gothic)/i,q="Georgia, serif",o="sans-serif",p={};g("en");return{initialize:g,getHasWhitespaceDelimitedWords:function(){return p.hasWhitespaceDelimitedWords},
getLanguage:function(){return p.language},getLineHeight:function(){return p.lineHeight},getAllowsVerticalLayout:function(){return p.allowsVerticalLayout},getAllowsNegativeTextIndent:function(){return p.allowsNegativeTextIndent},getAllowsClearStyle:function(){return p.allowsClearStyle},getNeedsPageRefresh:function(){return p.needsPageRefresh},getNeedsFontSanitization:function(){return p.needsFontSanitization},getAcceptedFontFamiliesRegex:function(){return p.fontOptions.fontFamilyRegex},getSansFont:function(){return p.fontOptions.sansFont},
getSerifFont:function(){return p.fontOptions.serifFont},getDefaultFont:function(){return p.fontOptions.defaultFont},getAllowsItalicFont:function(){return!(p.needsDeviceSpecificItalicsCheck&&KindleRendererDeviceSpecific.needsLanguageSpecificItalicsCheck())}}}(),KindleRendererSettings=function(){function g(a,b,c){try{a.styleSheet&&a.styleSheet.addRule?a.styleSheet.addRule(b,c):a.sheet&&a.sheet.insertRule&&a.sheet.insertRule(b+"{"+c+"}",0)}catch(f){}}function m(a){var b=new jQuery.Deferred;a.getMetadata(function(a){if(a.hasFixedContent!==
void 0)c.fixedContent=a.hasFixedContent;if(a.publisherMetadata!==void 0){var g=a.publisherMetadata;if(g[0]==="metadata"&&(g=g[2],g!==void 0))for(var h=g.length,l=0;l<h;++l){var m=g[l][1];if(m!==void 0)if(m.name==="fixed-layout")c.fixedContent=m.content==="true";else if(m.name==="original-resolution"&&(m=m.content.match(/(\d+)[Xx](\d+)/)))c.originalResolution={width:parseInt(m[1],10),height:parseInt(m[2],10)}}}if(a.headerMetadata!==void 0){g=a.headerMetadata;if(g.fixedLayout)c.fixedContent=g.fixedLayout===
"true";if(g.originalResolution&&(h=g.originalResolution.match(/(\d+)[Xx](\d+)/)))c.originalResolution={width:parseInt(h[1],10),height:parseInt(h[2],10)};c.pageProgressionDirection={RTL:0,LTR:1};c.inlineBaseDirection={VERTICAL:0,HORIZONTAL:1};if(g.app_PrimaryWritingMode)c.pageProgressionDirection.value=g.app_PrimaryWritingMode==="vertical-rl"||g.app_PrimaryWritingMode==="horizontal-rl"?c.pageProgressionDirection.RTL:c.pageProgressionDirection.LTR,c.inlineBaseDirection.value=g.app_PrimaryWritingMode.match(/^vertical/)!==
null?c.inlineBaseDirection.VERTICAL:c.inlineBaseDirection.HORIZONTAL;a=a.headerMetadata.app_contentLanguageTag}else a="en";KindleRendererLanguageOptions.initialize(a);if(KindleRendererDeviceSpecific.verticalParagraphsScaleSeparately()&&KindleRendererLanguageOptions.getAllowsVerticalLayout()&&!c.fixedContent)c.initialExpandedBodyHeight=f;c.lineSpacingMultiplier=1;b.resolve()},function(){b.reject()});return b.promise()}function h(){return!c.fixedContent&&KindleRendererDeviceSpecific.mightUseCSSRegions()&&
KindleRendererFragmentLoader.getBookContentType()!=="topaz"&&KindleRendererFragmentLoader.getBookContentType()!=="mobi8"}function b(){return!c.fixedContent&&KindleRendererDeviceSpecific.mightUseNativeSelection()&&KindleRendererFragmentLoader.getBookContentType()!=="topaz"&&KindleRendererFragmentLoader.getBookContentType()!=="mobi8"}var c={},f="500%";return{initialize:function(a){return m(a)},cleanup:function(){c={}},getSettings:function(){return c},updateSettings:function(a){for(var b in a)c[b]=a[b]},
addCSSRules:function(a,d){var e=c,f=a.getElementById("kindleRendererOptionsStylesheet");f!==void 0&&f!==null&&f.parentNode.removeChild(f);f=a.createElement("style");f.type="text/css";f.id="kindleRendererOptionsStylesheet";if(!(/MSIE ((5\.5)|6|(7\.0))/.test(navigator.userAgent)&&navigator.platform==="Win32"))try{if(d.appendChild(f),e.fixedContent)g(f,"body","position : absolute; margin: 0;"),e.originalResolution&&g(f,"body.amzUserPref","background-size: contain !important; width: "+e.originalResolution.width+
"px; height: "+e.originalResolution.height+"px");else{var j;if(e.fontSizes!==void 0){g(f,"body.amzUserPref","font-size : "+e.fontSizes[2]+e.fontSizeUnits+" !important");g(f,"font","font-size : "+e.fontSizes[2]+e.fontSizeUnits+" !important");for(j=0;j<e.fontSizes.length;j+=1)g(f,".font-size-"+(j+1),"font-size : "+e.fontSizes[j]+e.fontSizeUnits+" !important")}if(e.lineSpacingMultiplier!==void 0){var l=KindleRendererLanguageOptions.getLineHeight()*e.lineSpacingMultiplier;g(f,"body.amzUserPref","line-height: "+
l+"  !important")}e.fontColor!==void 0&&g(f,"body.amzUserPref","color : "+e.fontColor+" !important");if(e.fontFamily!==void 0&&(g(f,"body.amzUserPref","font-family : "+e.fontFamily+" !important"),e.fontFaces!==void 0))for(l=0;l<e.fontFaces.length;l++){var m=e.fontFaces[l];g(f,"@font-face","font-family: "+e.fontFamily+"; font-weight: "+(m.fontWeight||"normal")+"; font-style: "+(m.fontStyle||"normal")+"; font-stretch: "+(m.fontStretch||"normal")+"; src: url("+m.fontDataUrl+");")}e.backgroundColor!==
void 0&&g(f,"body.amzUserPref","background-color : "+e.backgroundColor+" !important");e.fontColor!==void 0&&e.backgroundColor!==void 0&&e.backgroundColor==="#000000"&&g(f,"a","color : "+e.fontColor+" !important");e.textAlign!==void 0&&g(f,"body.amzUserPref","text-align : "+e.textAlign+" !important");e.margin!==void 0&&g(f,"body.amzUserPref","margin : "+e.margin+" !important");e.selectionColor!==void 0&&g(f,"div.amazon-selection","background-color : "+e.selectionColor);e.insertBgColor!==void 0&&g(f,
".insert","background-color : "+e.insertBgColor);if(e.annotationStyles!==void 0)for(var o in e.annotationStyles){var p=e.annotationStyles[o],n=p.htmlElementTag?p.htmlElementTag+"."+p.className:"div."+p.className;g(f,n,p.style);if(p.additionalStyles)for(var s in p.additionalStyles){var r=p.additionalStyles[s];g(f,n+"."+r.className,r.style)}}e.clickableElementFeedbackStyles!==void 0&&g(f,"."+e.clickableElementFeedbackStyles.className,e.clickableElementFeedbackStyles.classStyle);if(e.keyframes!==void 0){var w=
e.keyframes,z;for(z in w)g(f,z,w[z])}h()&&e.columns!==void 0&&(g(f,"body","column-count : "+e.columns.num),g(f,"body","column-gap : "+e.columns.gap),g(f,"body","column-fill: auto"),f.styleSheet.cssText+="@media screen and (max-width:320px) { body { column-count: 1 } }");b()&&g(f,"::selection","background-color : "+e.selectionColor);if(e.additionalRules!==void 0&&e.additionalRules.length!==void 0)for(j=0;j<e.additionalRules.length;j+=1)g(f,e.additionalRules[j].selector,e.additionalRules[j].style)}}catch(C){}},
useCSSRegions:h,useNativeSelection:b}}(),KindleRendererContentCorrection=function(){function g(a,b,c){if(c.getWritingMode()==="vertical"){a=$(b.body).find(".azn-ECJK");for(b=0;b<a.length;b++){var c=a[b].firstChild.nodeValue.charCodeAt(0),d;d=c>=65307&&c<=65308?!0:c===65310?!0:c===65293?!0:!1;d&&(c="rotate(90deg) translateX("+(c===65293?o:"0.5")+"em)",$(a[b]).css({display:"inline-block","-webkit-transform":c,width:"1em",height:"1em","text-indent":"0px","vertical-align":"text-top"}))}}}function m(a,
b){var c=a.getComputedStyle(b.body).fontFamily,c=KindleRendererFontHelper.sanitizeFontFamily(c);b.body.setAttribute("style",(b.body.getAttribute("style")||"")+("; font-family: "+c))}function h(a,b){for(var c=$(b.body).find(".azn-UNB"),d=0;d<c.length;++d){var e=c[d].firstChild.nodeValue.charCodeAt(0);if(e===8213||e===8212||e===9472){if(e!==9472)e=String.fromCharCode(9472),c[d].innerHTML=e+e;$(c[d]).css("-webkit-transform","scaleY(.9)")}}}function b(a,b,c){if(c.getWritingMode()==="vertical"){a=$(b.body).find(".azn-NTE");
for(b=0;b<a.length;b++){c=a[b].firstChild.nodeValue.charCodeAt(0);switch(c){case 8220:c=12317;break;case 8221:c=12319}a[b].firstChild.nodeValue=String.fromCharCode(c)}}}function c(a,b){b.documentElement.setAttribute("lang","ja")}function f(a,b,c){if(c.getWritingMode()==="vertical"){a=$("img",b.body).filter(function(){return $(this).css("float")!=="none"&&$(this).parent().css("display")!=="block"});for(b=0;b<a.length;b++)$(a[b]).parent().css("display","block")}}function a(a,b,c){for(var a=$('img[data-isGaiji="true"]',
b.body),d=0;d<a.length;d++)if(c.getWritingMode()==="horizontal")$(a[d]).css("vertical-align","text-top");else if(c.getWritingMode()==="vertical"&&KindleHostDeviceDetector.isAndroid_JellyBean&&KindleHostDeviceDetector.isAndroid_JellyBean()){var e=b.createElement("SPAN");e.style.backgroundSize="1em 1em";e.style.backgroundPosition="center";e.style.backgroundImage="url("+a[d].getAttribute("src")+")";e.style.backgroundRepeat="no-repeat";var f=b.createTextNode("\u00a0\u00a0\u00a0\u00a0");e.appendChild(f);
a[d].parentNode.replaceChild(e,a[d])}}function d(a,b){for(var c,d=$('span:not([class*="azn-"])',b.body),e=0;e<d.length;++e)if(currNode=d[e],c=a.getComputedStyle(currNode),(c.webkitTextCombine==="horizontal"||c.textCombineUpright==="all")&&(c.webkitWritingMode==="vertical-rl"||c.writingMode==="vertical-rl")&&currNode.textContent.length>1&&currNode.textContent.length<5){currNode.setAttribute("data-isTextCombineBlock","true");var f=currNode;c=parseInt(c.fontSize,10);$(f).css("-webkit-text-combine","none");
$(f).css("text-combine-upright","none");var g=f.getClientRects();if(g.length>0){var n=g[0].height,g=-Math.floor((n-c)/2)+"px";c=n>c?" scaleY("+c/n+")":"";$(f).css({"-webkit-transform":"rotate(270deg)"+c,transform:"rotate(270deg)"+c,margin:g+" 0px"})}}}function e(a,b){var c=function(a,b){var c=$(a).css("border-"+b+"-style");return c&&c!=="none"},d=$('a, span, div:not([class*="azn-"])',b.body),e,f,g,n,h;for(e=0;e<d.length;e++)currNode=d[e],f=c(currNode,"top"),g=c(currNode,"bottom"),n=c(currNode,"left"),
h=c(currNode,"right"),(f||g||n||h)&&currNode.setAttribute("data-hasCssBorder","true")}function k(a,b){for(var c=$("rt",b.body),d=0;d<c.length;d++)$(c[d]).css("font-size","")}function j(a,b,c,d,e,f){if(f.getWritingMode()==="vertical"&&b.webkitWritingMode.match(f.getWritingMode())!==null){a:{c=b;b=a;d=(d=$(a).attr("class"))&&d.match(/azn-/)?3:2;for(f=0;f<=d;++f){if(!a)break;(c=a.getAttribute(q)||c.textDecoration)&&(c=c.split(" ")[0]);if(!c||c==="none"){a=a.parentElement;if(!a)break;c=e.getComputedStyle(a)}else{if(b.tagName===
"RUBY"){b:{e=b.parentNode.childNodes;for(a=0;a<e.length;a++)if(e[a].tagName!=="RUBY"&&e[a].nodeType!==Node.TEXT_NODE){e=!1;break b}e=!0}e=e?{node:b.parentNode,decoration:c}:{node:b,decoration:c}}else e={node:a,decoration:c};break a}}e=void 0}e&&!$(e.node).data("decoration-fixed")&&(e.decoration==="underline"?$(e.node).css("text-decoration","overline"):e.decoration==="overline"&&$(e.node).css("text-decoration","underline"),$(e.node).data("decoration-fixed",!0))}}function l(a,b){$("p > span:first-child",
b.body).each(function(){var a=$(this);a.text().trim().length===1&&a.css({"float":"none","font-size":"unset","line-height":"unset","font-weight":"unset",margin:"unset"})})}var q="data-cjktextdecoration",o=".425",p=[],n=[],s=[];return{initialize:function(){var r=KindleRendererLanguageOptions.getLanguage();r==="ja"?(p.push(h),p.push(b),p.push(c),p.push(f),p.push(a),p.push(e),p.push(k),KindleRendererDeviceSpecific.shouldRotateECJKChar()&&p.push(g),document.body&&(document.body.style.webkitWritingMode!==
void 0||document.body.style.writingMode!==void 0)&&p.push(d),KindleRendererDeviceSpecific.swapUnderlinesAndOverlines()&&n.push(j)):r==="zh"&&(p.push(a),p.push(k),p.push(e));KindleRendererLanguageOptions.getNeedsFontSanitization()&&p.push(m);p.push(l)},applyDocumentWideCorrections:function(a,b,c,d){for(var d=d.createSubTimer("correction"),e=0;e<p.length;++e)p[e](a,b,c);d.endTimer()},applyNodeLocalCorrections:function(a,b,c,d,e,f){if(!(n.length===0||!b||b.length===0)){for(var f=f.createSubTimer("correction"),
a=a.nodeType===Node.TEXT_NODE?a.parentNode:a,g=d.getComputedStyle(a),h=0;h<n.length;++h)n[h](a,g,b,c,d,e);f.endTimer()}},cleanup:function(a){for(var b=0;b<s.length;++b)s[b](a)}}}(),KindleRendererDefaults=function(){function g(g,h,b){g.styleSheet&&g.styleSheet.addRule?g.styleSheet.addRule(h,b):g.sheet&&g.sheet.insertRule&&g.sheet.insertRule(h+"{"+b+"}",g.sheet.cssRules?g.sheet.cssRules.length:g.sheet.rules.length)}return{addCSSRules:function(m,h){if(h==="mobi8"){var b=document.createElement("style");
b.type="text/css";b.id="kindleReaderStylesheetDefaults";try{m.insertBefore(b,m.firstChild);KindleRendererSettings.getSettings().fixedContent&&g(b,"html","font-size: 15px;");g(b,"table","color: inherit; font-size: inherit; line-height: inherit; font-weight: inherit; font-variant:inherit; font-style:inherit; white-space: inherit; word-wrap: inherit;");KindleRendererDeviceSpecific.needsWritingModeSpecifiedOnBody()&&(g(b,"body","-webkit-writing-mode: horizontal-tb"),g(b,"body","writing-mode: horizontal-tb"));
KindleRendererLanguageOptions.getDefaultFont()&&g(b,"body","font-family: "+KindleRendererLanguageOptions.getDefaultFont()+";");KindleRendererLanguageOptions.getLineHeight()&&g(b,"body","line-height: "+KindleRendererLanguageOptions.getLineHeight()+";");var c=KindleRendererSettings.getSettings().initialExpandedBodyHeight;c!==void 0&&g(stylesheet,"body","height: "+c+";")}catch(f){}}b=document.createElement("style");b.type="text/css";b.id="kindleReaderStylesheetOverrides";try{m.appendChild(b),h==="mobi7"&&
(g(b,"body","font-family: Georgia, serif; word-wrap: break-word;"),g(b,"p","margin-top: 0px; margin-bottom: 0px; text-indent:2em"),g(b,".was-a-p","margin-top: 0px; margin-bottom: 0px; text-indent:2em;"),g(b,"hr","margin-top: 15px; margin-bottom: 15px;"),g(b,"center,dd,div,dl,dt,li,ol,pre,table,ul,hr,h1,h2,h3,h4,h5,h6","margin-top: 0px; margin-bottom: 0px;"),g(b,"blockquote","text-indent: 0px; margin-top: 0px; margin-bottom: 0px;"),g(b,"ul","list-style-type: disc;"),g(b,"ol, ul, li .was-a-p","text-indent: 0;"),
g(b,"table.amazon-table-style-0","border-collapse:collapse; font-size: inherit;"),g(b,"table.amazon-table-style-0 tr td","border:none; padding:1px;"),g(b,"table.amazon-table-style-0 tr th","border:none; padding:1px; text-align:justify"),g(b,"table.amazon-table-style-1","border-collapse:collapse; font-size: inherit;"),g(b,"table.amazon-table-style-1 tr td","border:1px solid black; padding:1px;"),g(b,"table.amazon-table-style-1 tr th","border:1px solid black; padding:1px; text-align:justify")),h===
"mobi8"&&(g(b,"body","word-wrap: break-word; padding: 0px !important;"),g(b,".azn-FWURG","-webkit-text-orientation: upright;"),g(b,".azn-NTE","-webkit-text-emphasis: none !important")),g(b,".semiTransparentOverlay","z-index: 10 !important; opacity: 0.5"),g(b,"svg img","display: none;"),g(b,".page-break","display:block; padding:1px"),g(b,".pagebreak","display:block; padding:1px"),g(b,".defaultHighlight","background-color:#ffff9b"),g(b,".noDisplay","display:none"),g(b,"body","cursor: default; position: relative;"),
KindleRendererSettings.getSettings().fixedContent||(g(b,"body","background: none !important; background-color: transparent !important;"),g(b,"html, body","width: auto; height: auto;"),g(b,"html","-webkit-text-size-adjust: 100%;")),KindleRendererSettings.useCSSRegions()&&(g(b,".was-a-p","orphans:0; widows:0"),g(b,".page-break","break-before:column"),g(b,".pagebreak","break-before:column"),g(b,".renderer-page-break","width:0px; height:0px; break-before:always")),KindleRendererSettings.useNativeSelection()?
g(b,"body","-webkit-user-select:text; -moz-user-select:text; -ms-user-select:text; unselectable: off;"):g(b,"body","-webkit-user-select:none; -moz-user-select:none; -ms-user-select:none; unselectable: on;"),g(b,".kindle-annotation-wrapper, .kindle-annotation-wrapper *","margin: auto; padding: 0"),g(b,"div#content-overlays","margin: 0px; padding: 0px;")}catch(a){}}}}(),KindleRendererContentStyleSanitization=function(){function g(a,b){var c=a[b];if(c===void 0){var d=l.exec(b);d!==null&&d.length>=3&&
(b=d[1]+d[2].substring(0,1).toUpperCase()+d[2].substring(1),c=a[b])}return c}function m(a,b,c){if(b==="float")return c.hasFloat=!0;if(b==="position")return a=g(a,b),!(a==="inherit"||a==="static")?c.isPositioned=!0:!1;if(b==="width"){a=g(a,b);if(a!==void 0){if(!c.widths)c.widths={percent:[],fixed:[]};a.indexOf("%")>=0?c.widths.percent.push(a):c.widths.fixed.push(a);return!0}return!1}if(b==="height"){a=g(a,b);if(a!==void 0){if(!c.heights)c.heights={percent:[],fixed:[]};a.indexOf("%")>=0?c.heights.percent.push(a):
c.heights.fixed.push(a);return!0}return!1}if(b==="max-width"||b==="max-height"){a=g(a,b);if(a!==void 0&&a.indexOf("%")>=0){if(!c.prcntMaxDimension)c.prcntMaxDimension=[];c.prcntMaxDimension.push(a);return!0}return!1}if(b==="font-size")return a=g(a,b),a!==void 0&&!q.test(a)?(o.test(a)?c.remFontValue=a.trim():c.absFontValue=a.trim(),!0):!1;if(b==="line-height")return a=g(a,b),a!==void 0?(c.lineHeight=a,!0):!1;if(b==="background-color")return a=g(a,b),a!==void 0?(c.backgroundColorRgb=KindleRendererColorHelper.toRgbArray(a.trim()),
!0):!1;if(b==="text-indent")return!KindleRendererLanguageOptions.getAllowsNegativeTextIndent()&&(a=g(a,b),a!==void 0)?(c.textIndent=a,!0):!1;if(b==="color")return c.hasTextColor=!0;if(b==="clear")return!KindleRendererLanguageOptions.getAllowsClearStyle()?c.hasClearStyle=!0:!1;if(b==="-webkit-text-combine")return c.textCombine=g(a,b),!0;if(b==="text-combine-upright")return c.textCombineUpright=g(a,b),!0;if(b==="font-family"&&KindleRendererLanguageOptions.getNeedsFontSanitization())return c.langFontFamily=
g(a,b),!0;if(b==="font-style")return c.fontStyle=g(a,b),!0;if(b==="display")c.display=g(a,b);return!1}function h(a){try{for(var b={},c=a.style.length,d=!1,e=0;e<c;e++)d|=m(a.style,a.style[e],b);if(d)return b}catch(f){}return null}function b(a,c){for(var d=a.rules?a.rules:a.cssRules,e=d&&d.length||0,f=0;f<e;f++){var g=d[f];if(!g.style&&g.media&&g.media.mediaText==="all")b(g,c);else{if(g=h(d[f]))g.selectorText=d[f].selectorText,c.push(g);g=d[f];if(g.selectorText!==void 0&&g.selectorText==="span")g.selectorText=
'span:not([class*="azn-"])';g=[];for(var k=0;k<g.length;++k)c.push(g[k])}}}function c(a,b){var c=KindleRendererScaleHelper.convertLength(a,"px");return c?(c=parseFloat(c),c=Math.floor(c),c=Math.min(c,b),c+"px"):a}function f(a,b,d,e,f,g,h,k){var j="",l=0;if(a.widths){for(var m=a.widths.percent,o=a.widths.fixed,q=0.95*k.width,l=0;l<m.length;l++)j+="width: auto; ",a.display==="inline-block"&&parseInt(m[l],10)>95&&(j+="display: block; ");for(l=0;l<o.length;l++)m=c(o[l],q),j+=parseInt(m,10)<1?"width: auto; ":
"width: "+m+"; "}if(a.heights){m=a.heights.percent;o=a.heights.fixed;q=0.95*k.height;for(l=0;l<m.length;l++)j+="height: auto; ",a.display==="inline-block"&&parseInt(m[l],10)>95&&(j+="display: block; ");for(l=0;l<o.length;l++)m=c(o[l],q),j+=parseInt(m,10)<1?"height: auto; ":"height: "+m+"; "}a.lineHeight&&(l=parseFloat(a.lineHeight),j+=a.lineHeight.indexOf("%")>0&&l>=f*100?"line-height : "+l*g+"%; ":/^\d*(\.\d+)?$/.test(a.lineHeight.trim())&&l>=f?"line-height : "+l*g+"; ":"line-height : "+f*g+"; ");
if(a.prcntMaxDimension)for(l=0;l<a.prcntMaxDimension.length;l++)j+=a.prcntMaxDimension[l]+": none; ";a.hasFloat&&(j+="line-height : "+(f+p)+"; ");a.isPositioned&&(j+="position: inherit; ");a.backgroundColorRgb&&!a.hasTextColor&&b&&(b=KindleRendererColorHelper.calculateTextColorForBackground(b,a.backgroundColorRgb))&&(j+="color : rgb("+b[0]+", "+b[1]+", "+b[2]+"); ");a.absFontValue&&(b=KindleRendererScaleHelper.scaleFont(a.absFontValue,d,e)||a.absFontValue,j+="font-size: "+b+"; ");a.remFontValue&&
(h=Math.round(parseFloat(a.remFontValue)*parseInt(h,10))+"px",d=KindleRendererScaleHelper.scaleFont(h,d,e)||a.absFontValue,j+="font-size: "+d+"; ");a.textIndent&&parseInt(a.textIndent,10)<0&&(k=0.9*k.width,d=a.textIndent.replace(/-/g,""),d.indexOf("%")>0?(d=parseFloat(d,10)/100,d*=k,d=Math.min(d,k),d=Math.floor(d),d=Math.max(d,1),k=d+"px"):k=c(d,k),d=k,j+="text-indent: -"+d+"; padding-left: "+d+"; ");a.hasClearStyle&&(j+="clear:none");a.textCombine&&(j+="-webkit-text-combine: "+a.textCombine+"; display: inline-block; text-indent: 0px; height: auto;");
a.textCombineUpright&&(j+="text-combine-upright: "+a.textCombineUpright+"; display: inline-block; text-indent: 0px; height: auto;");a.langFontFamily&&(k=KindleRendererFontHelper.sanitizeFontFamily(a.langFontFamily),j+="font-family: "+k+";");a.fontStyle&&a.fontStyle==="italic"&&!KindleRendererLanguageOptions.getAllowsItalicFont()&&(j+="font-style: normal;");a.styleString&&(j+=a.styleString);return j}function a(a){var b=a.styleSheets,a=$(a).find('link[rel*="stylesheet"][href], style');if(b.length<a.length)for(var a=
a.filter("link"),b=$.makeArray(b),c=$.map(b,function(a){return a.ownerNode}),d=0;d<a.length;++d){var e=a[d],f=e.sheet||e.styleSheet;f&&(f.rules?f.rules:f.cssRules)&&c.indexOf(e)<0&&b.push(f)}return b}function d(a){function b(){var a,h,k=0;f++;for(KindleRendererProcessTuning.startingOperation("SanitizeNodes");e.length&&k<g;)if(a=e.pop(),k++,a&&a.nodeType===Node.ELEMENT_NODE){(h=a.getAttribute("style"))&&h.length>0&&a.tagName!=="IMG"&&d.push(a);a=a.childNodes;for(h=0;h<a.length;h++)e.push(a[h])}KindleRendererProcessTuning.endingOperation("SanitizeNodes",
k);e.length?setTimeout(b,processTimeout):c.resolve(d,f)}var c=$.Deferred(),d=[],e=[],f=0,g=KindleRendererProcessTuning.drawYieldFrequency("SanitizeNodes");processTimeout=KindleRendererProcessTuning.drawYieldUpdateTime("SanitizeNodes");e.push(a);b();return c.promise()}function e(a){var b=[];if((window.ActiveXObject||"ActiveXObject"in window)&&window.XMLHttpRequest)return a=a.querySelectorAll("[style]:not(HTML):not(BODY):not(IMG)"),$.Deferred().resolve(a);else try{for(var c=(new XPathEvaluator).evaluate("/html/body//*[@style]",
a,null,XPathResult.UNORDERED_NODE_ITERATOR_TYPE,null),e=c.iterateNext();e;)e.style.length>0&&e.tagName!=="IMG"&&b.push(e),e=c.iterateNext()}catch(f){return d(a.body)}return $.Deferred().resolve(b)}function k(a){var b=a.getAttribute("style");b&&(b=b.replace(/-webkit-writing-mode\s*:\s*([a-z\-]+)/g,"writing-mode: $1; $&"),a.setAttribute("style",b))}function j(a){var b=$(a).attr("style");b&&($(a).attr("style",b.replace(/!\s*important/g,"")),k(a))}var l=/^(\w*)-(\w*)(-value)?$/,q=/%|[^r]em|smaller|larger/,
o=/rem/,p=0.2;return{sanitizeCSS:function(c,d,e){for(var g=$('link[type="text/css"][title]',c.head),h=0;h<g.length;++h)g[h].removeAttribute("title");if(!d.fixedContent){h=!1;g=c.getElementById("kindleReaderSanitizationStylesheet");if(!g){g=c.createElement("style");g.id="kindleReaderSanitizationStylesheet";g.type="text/css";for(var h=g,k=a(c),j=[],l=k.length,m=0;m<l;m++)b(k[m],j);h.sanitizationRules=j;h=!0}if(g.sanitizationRules.length>0){for(var k=g.sanitizationRules,j=d.fontColor?KindleRendererColorHelper.toRgbArray(d.fontColor):
null,l=d.fontSizes,m=d.fontSizeUnits,o=KindleRendererLanguageOptions.getLineHeight(),d=d.lineSpacingMultiplier,p=getComputedStyle(c.documentElement).fontSize,q="",J=k.length,E=0;E<J;E++)q+=k[E].selectorText+" { ",q+=f(k[E],j,l,m,o,d,p,e),q+=" } ";g.innerHTML=q}h&&c.head.appendChild(g)}},sanitizeContent:function(a,b,c){var d=$.Deferred();if(b.fixedContent)return d.resolve();j(a.body);e(a).done(function(e){for(var g=b.fontColor?KindleRendererColorHelper.toRgbArray(b.fontColor):null,j=b.fontSizes,l=
b.fontSizeUnits,m=KindleRendererLanguageOptions.getLineHeight(),o=b.lineSpacingMultiplier,p=getComputedStyle(a.documentElement).fontSize,q=e.length,J=0;J<q;J++){var E=e[J],B=E,y=B.getAttribute("data-origStyle");y?B.setAttribute("style",y):B.setAttribute("data-origStyle",B.getAttribute("style"));k(E);if(B=h(e[J]))y=E.getAttribute("style")||"",y+="; ",y+=f(B,g,j,l,m,o,p,c),E.setAttribute("style",y)}d.resolve()});return d.promise()},copySanitizationData:function(a,b){var c=a.getElementById("kindleReaderSanitizationStylesheet"),
d=b.getElementById("kindleReaderSanitizationStylesheet");if(c&&d)d.sanitizationRules=c.sanitizationRules}}}(),KindleRendererColorHelper=function(){function g(c){if(c.charAt(0)==="#")return c.length===4?[parseInt(c.charAt(1)+c.charAt(1),16),parseInt(c.charAt(2)+c.charAt(2),16),parseInt(c.charAt(3)+c.charAt(3),16)]:c.length===7?[parseInt(c.charAt(1)+c.charAt(2),16),parseInt(c.charAt(3)+c.charAt(4),16),parseInt(c.charAt(5)+c.charAt(6),16)]:null;var c=c.toUpperCase(),a=b[c];if(a)return a;c=h.exec(c);
return c!==null&&c.length===4?[parseInt(c[1],10),parseInt(c[2],10),parseInt(c[3],10)]:null}function m(b){return c[0]*b[0]+c[1]*b[1]+c[2]*b[2]}var h=/RGB\s*\(\s*(\d*)\s*,\s*(\d*)\s*,\s*(\d*)\s*\)/,b={ALICEBLUE:[240,248,255],ANTIQUEWHITE:[250,235,215],AQUA:[0,255,255],AQUAMARINE:[127,255,212],AZURE:[240,255,255],BEIGE:[245,245,220],BISQUE:[255,228,196],BLACK:[0,0,0],BLANCHEDALMOND:[255,235,205],BLUE:[0,0,255],BLUEVIOLET:[138,43,226],BROWN:[165,42,42],BURLYWOOD:[222,184,135],CADETBLUE:[95,158,160],CHARTREUSE:[127,
255,0],CHOCOLATE:[210,105,30],CORAL:[255,127,80],CORNFLOWERBLUE:[100,149,237],CORNSILK:[255,248,220],CRIMSON:[220,20,60],CYAN:[0,255,255],DARKBLUE:[0,0,139],DARKCYAN:[0,139,139],DARKGOLDENROD:[184,134,11],DARKGRAY:[169,169,169],DARKGREY:[169,169,169],DARKGREEN:[0,100,0],DARKKHAKI:[189,183,107],DARKMAGENTA:[139,0,139],DARKOLIVEGREEN:[85,107,47],DARKORANGE:[255,140,0],DARKORCHID:[153,50,204],DARKRED:[139,0,0],DARKSALMON:[233,150,122],DARKSEAGREEN:[143,188,143],DARKSLATEBLUE:[72,61,139],DARKSLATEGRAY:[47,
79,79],DARKSLATEGREY:[47,79,79],DARKTURQUOISE:[0,206,209],DARKVIOLET:[148,0,211],DEEPPINK:[255,20,147],DEEPSKYBLUE:[0,191,255],DIMGRAY:[105,105,105],DIMGREY:[105,105,105],DODGERBLUE:[30,144,255],FIREBRICK:[178,34,34],FLORALWHITE:[255,250,240],FORESTGREEN:[34,139,34],FUCHSIA:[255,0,255],GAINSBORO:[220,220,220],GHOSTWHITE:[248,248,255],GOLD:[255,215,0],GOLDENROD:[218,165,32],GRAY:[128,128,128],GREY:[128,128,128],GREEN:[0,128,0],GREENYELLOW:[173,255,47],HONEYDEW:[240,255,240],HOTPINK:[255,105,180],INDIANRED:[205,
92,92],INDIGO:[75,0,130],IVORY:[255,255,240],KHAKI:[240,230,140],LAVENDER:[230,230,250],LAVENDERBLUSH:[255,240,245],LAWNGREEN:[124,252,0],LEMONCHIFFON:[255,250,205],LIGHTBLUE:[173,216,230],LIGHTCORAL:[240,128,128],LIGHTCYAN:[224,255,255],LIGHTGOLDENRODYELLOW:[250,250,210],LIGHTGRAY:[211,211,211],LIGHTGREY:[211,211,211],LIGHTGREEN:[144,238,144],LIGHTPINK:[255,182,193],LIGHTSALMON:[255,160,122],LIGHTSEAGREEN:[32,178,170],LIGHTSKYBLUE:[135,206,250],LIGHTSLATEGRAY:[119,136,153],LIGHTSLATEGREY:[119,136,
153],LIGHTSTEELBLUE:[176,196,222],LIGHTYELLOW:[255,255,224],LIME:[0,255,0],LIMEGREEN:[50,205,50],LINEN:[250,240,230],MAGENTA:[255,0,255],MAROON:[128,0,0],MEDIUMAQUAMARINE:[102,205,170],MEDIUMBLUE:[0,0,205],MEDIUMORCHID:[186,85,211],MEDIUMPURPLE:[147,112,216],MEDIUMSEAGREEN:[60,179,113],MEDIUMSLATEBLUE:[123,104,238],MEDIUMSPRINGGREEN:[0,250,154],MEDIUMTURQUOISE:[72,209,204],MEDIUMVIOLETRED:[199,21,133],MIDNIGHTBLUE:[25,25,112],MINTCREAM:[245,255,250],MISTYROSE:[255,228,225],MOCCASIN:[255,228,181],
NAVAJOWHITE:[255,222,173],NAVY:[0,0,128],OLDLACE:[253,245,230],OLIVE:[128,128,0],OLIVEDRAB:[107,142,35],ORANGE:[255,165,0],ORANGERED:[255,69,0],ORCHID:[218,112,214],PALEGOLDENROD:[238,232,170],PALEGREEN:[152,251,152],PALETURQUOISE:[175,238,238],PALEVIOLETRED:[216,112,147],PAPAYAWHIP:[255,239,213],PEACHPUFF:[255,218,185],PERU:[205,133,63],PINK:[255,192,203],PLUM:[221,160,221],POWDERBLUE:[176,224,230],PURPLE:[128,0,128],RED:[255,0,0],ROSYBROWN:[188,143,143],ROYALBLUE:[65,105,225],SADDLEBROWN:[139,69,
19],SALMON:[250,128,114],SANDYBROWN:[244,164,96],SEAGREEN:[46,139,87],SEASHELL:[255,245,238],SIENNA:[160,82,45],SILVER:[192,192,192],SKYBLUE:[135,206,235],SLATEBLUE:[106,90,205],SLATEGRAY:[112,128,144],SLATEGREY:[112,128,144],SNOW:[255,250,250],SPRINGGREEN:[0,255,127],STEELBLUE:[70,130,180],TAN:[210,180,140],TEAL:[0,128,128],THISTLE:[216,191,216],TOMATO:[255,99,71],TURQUOISE:[64,224,208],VIOLET:[238,130,238],WHEAT:[245,222,179],WHITE:[255,255,255],WHITESMOKE:[245,245,245],YELLOW:[255,255,0],YELLOWGREEN:[154,
205,50]},c=[0.2126/255,0.7152/255,0.0722/255];return{toRgbArray:function(b){return g(b)},calculateTextColorForBackground:function(b,a){var c=Math.abs(m(a)-m(b));if(c<0.3)var e=m(a),g=m(b),e=e<0.5?g<e?160:80:g>e?-160:-80,e=[Math.max(0,Math.min(255,b[0]+e)),Math.max(0,Math.min(255,b[1]+e)),Math.max(0,Math.min(255,b[2]+e))],c=Math.abs(m(e)-m(a))>c?e:null;else c=null;return c}}}(),KindleRendererContentScripts=function(){function g(g){g=g.contentWindow.KindleContentInterface;typeof m.gotoPosition==="function"&&
(g.gotoPosition=function(b,c){m.gotoPosition(c);return!1});typeof m.openStoreDP==="function"&&(g.buyNow=g.showDetails=function(){m.openStoreDP();return!1})}var m;return{addInterfaceScripts:function(h){var b=h.contentDocument.getElementsByTagName("head")[0],c=document.createElement("script");c.language="Javascript";c.type="text/javascript";c.id="kindleContentInterface";if(!(/MSIE ((5\.5)|6|(7\.0))/.test(navigator.userAgent)&&navigator.platform==="Win32"))try{b.appendChild(c),b="var KindleContentInterface = function() { return { ",
b+=" gotoPosition : function(frm, pos) {parent.KindleReaderUI.gotoPosition(pos); return false;}, ",b+=" buyNow : function() {parent.KindleReaderUI.openStoreDP();return false;}, ",b+=" showDetails : function() {parent.KindleReaderUI.openStoreDP();  return false;} ",b+=" };}();",c.text=b,m&&g(h)}catch(f){}},setCallbacks:function(g){m=g}}}(),KindleRendererEventHandler=function(){function g(b){var f=KindleRendererSettings.getSettings().clickableElementFeedbackStyles;if(f!==void 0){var a=f.className,b=
$(b),f=function(){var b=$(this);b.unbind("animationend");b.unbind("webkitAnimationEnd");b.removeClass(a)};b.bind("animationend",f);b.bind("webkitAnimationEnd",f);b.addClass(a)}}function m(c){var f=document.createEvent("MouseEvents");f.initEvent("click",!0,!0);var a=c.getAttribute("onclick");if(a)a=a.replace(h,b),c.setAttribute("onclick",a);else{var a=c.parentElement,d=a.getAttribute("onclick");d&&(d=d.replace(h,b),a.setAttribute("onclick",d))}c.dispatchEvent(f)}var h=/gotoPosition\(,/,b="gotoPosition(0,";
return{handleClick:function(b,f,a){var d;var e;if(e=f)b:{for(e=f;e!==null;){if(e.getAttribute!==void 0){var h=e.getAttribute("onclick")||e.getAttribute("href");if(h!==null&&h.length>0){e=!0;break b}}e=e.parentNode}e=!1}e&&(g(f),m(f),d=!0);if(!(f=d)){b=b.getElementById("annotation-section");b=$(b).find("["+KindleRendererAnnotationRenderer.ANNOTATION_CLICK_ATTRIBUTE+"='true']").children();f=null;d=-Infinity;e=b.length;for(h=0;h<e;h+=1){var j=b[h],l=$(j).offset();l.top-10<a.y&&a.y<l.top+$(j).height()+
10&&l.left-10<a.x&&a.x<l.left+$(j).width()+10&&(l=parseInt($(j).css("z-index"),10),isNaN(l)&&(l=0),l>d&&(d=l,f=j))}if(a=f){if((b=a.parentNode)&&b.getAttribute(KindleRendererAnnotationRenderer.ANNOTATION_CLICK_FEEDBACK_ATTRIBUTE)!=="false"){b=b.childNodes;for(f=0;f<b.length;f++)g(b[f])}m(a);f=!0}else f=!1}return f}}}(),KindleRendererFontHelper=function(){var g=/(sans)|(gothic)/i,m=/serif/i;return{sanitizeFontFamily:function(h){var b=h.split(",");if(KindleRendererLanguageOptions.getNeedsFontSanitization()&&
!h.match(KindleRendererLanguageOptions.getAcceptedFontFamiliesRegex())){for(var h="",c=0;c<b.length;++c){var f=b[c];h+=f.match(g)?KindleRendererLanguageOptions.getSansFont()+", "+f:f.match(m)?KindleRendererLanguageOptions.getSerifFont()+", "+f:f;c<b.length-1&&(h+=",")}h.match(KindleRendererLanguageOptions.getAcceptedFontFamiliesRegex())||(h+=","+KindleRendererLanguageOptions.getDefaultFont());h+=" !important"}return h}}}(),KindleListUtilities=function(){return{binarySearch:function(g,m,h,b,c){if(!g.length)return 0;
var f=g.length-1,a=0,d=0,e=null,k=0;b>a&&b<=f&&(a=b);for(c>=a&&c<f&&(f=c);a<=f;)if(d=Math.floor((a+f)/2),e=g[d],k=0,h===void 0?e>m?k=1:e<m&&(k=-1):k=h(m,e),k>0)f=d-1;else if(k<0)a=d+1;else return d;return d===0||k<0?d:d-1},sortedMerge:function(g,m){var h=[],b=g.length,c=m.length,f=0,a=0;if(b){if(!c)return g}else return m;for(var d,e;f<b&&a<c;)d=g[f],e=m[a],d<e?(h.push(d),++f):(h.push(e),++a);for(;f<b;)h.push(g[f++]);for(;a<c;)h.push(m[a++]);return h},first:function(g){return g[0]},last:function(g){return g[g.length-
1]}}}(),KindleRendererProcessTuning=function(){function g(g){var b,c=m[g];if(c){if(!c.unitTime)return c.frequency;g=c.frequency*c.unitTime;if(g>100){if(b=Math.floor(Math.max(100/c.unitTime,c.minimumFrequency)),b<c.frequency)c.frequency=b}else if(g<50){if(b=Math.ceil(Math.max(50/c.unitTime,c.minimumFrequency)),b>c.frequency)c.frequency=b}else b=c.frequency}else b=KindleRendererDeviceSpecific["drawYield"+g+"Frequency"]?KindleRendererDeviceSpecific["drawYield"+g+"Frequency"]():100,c=KindleRendererDeviceSpecific["drawYield"+
g+"UpdateTime"]?KindleRendererDeviceSpecific["drawYield"+g+"UpdateTime"]():KindleRendererDeviceSpecific.drawYieldUpdateTime(),m[g]={frequency:b,minimumFrequency:b/4,yieldTime:c};return b}var m={};return{runAfterYield:function(g,b,c){b>=2&&g>=0?(b=KindleMetricsProfiler("(YIELD)"),setTimeout(c,g),b.endTimer()):c()},startingOperation:function(h){var b=m[h];b||(g(h),b=m[h]);b.startTime=Date.now()},endingOperation:function(h,b){var c;var f=m[h];f||(g(h),f=m[h]);if(f.startTime){var a=Date.now()-f.startTime;
if(!(b<1)){var d=m[h];a/=b;if(d.unitTime){var e=0.1*b/d.frequency;d.unitTime=e*a+(1-e)*d.unitTime}else d.unitTime=a}f.startTime=0}else c=void 0;return c},drawYieldFrequency:function(h){return g(h)},drawYieldUpdateTime:function(h){var b=m[h];b||(g(time),b=m[h]);return b.yieldTime}}}(),KindleRendererScaleHelper=function(){function g(a,c){if(!f[c])return null;var e=a.match(b);return e?(e=f[e[1]],parseFloat(a,10)*e/f[c]):null}function m(a,b,e){if((a=a.match(h))&&b.length>0){var a=c[a[1]],f=Math.floor((b.length-
1)/2),g=parseFloat(b[0],10),f=parseFloat(b[f],10),b=parseFloat(b[b.length-1],10);return Math.min(b,Math.max(g,a*f))+e}return null}var h=/(xx-small|x-small|small|medium|large|x-large|xx-large)/,b=/(mm|cm|in|pt|pc|px)/,c={"xx-small":0.6,"x-small":0.75,small:0.889,medium:1,large:1.2,"x-large":1.5,"xx-large":2},f={mm:2.835,cm:28.346,"in":72,pt:1,pc:6,px:1.25};return{scaleFont:function(a,d,e){if(e=e.match(b)){var e=e[1],f;if(!(f=m(a,d,e)))f=(a=g(a,"pt"))?m(a<=c["xx-small"]*25?"xx-small":a<=c["x-small"]*
25?"x-small":a<=c.small*25?"small":a<=c.medium*25?"medium":a<=c.large*25?"large":a<=c["x-large"]*25?"x-large":"xx-large",d,e):null;d=f}else d=a;return d},convertLength:function(a,b){var c=g(a,b);return c?c+b:null}}}(),KindleRendererUtils=function(){function g(a){if(a)if(a.firstChild)return a.firstChild;else if(a.nextSibling)return a.nextSibling;else{do a=a.parentNode;while(a&&!a.nextSibling);return a&&a.nextSibling}else return null}function m(a){if(a)if(a.lastChild)return a.lastChild;else if(a.previousSibling)return a.previousSibling;
else{do a=a.parentNode;while(a&&!a.previousSibling);return a&&a.previousSibling}else return null}function h(a){return a?/^(SPAN|CANVAS|IMG)$/i.test(a.tagName)&&isFinite(a.id):!1}var b=/metro/i,c=/desktop/i,f={};return{nextPositionedNode:function(a){for(a=g(a);a;){if(h(a))return a;a=g(a)}return null},previousPositionedNode:function(a){for(a=m(a);a;){if(h(a))return a;a=m(a)}return null},followingNode:function(a){var b;if(a){for(b=a.nextSibling;a&&!b;)a=a.parentNode,b=a.nextSibling;return b}else return null},
precedingNode:function(a){var b;if(a){for(b=a.previousSibling;a&&!b;)a=a.parentNode,b=a.previousSibling;return b}else return null},isBlock:function(a){return a?/^(ADDRESS|ARTICLE|ASIDE|AUDIO|BLOCKQUOTE|DD|DIV|DL|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HGROUP|HR|NOSCRIPT|OL|OUTPUT|P|PRE|SECTION|TABLE|TFOOT|UL|VIDEO)$/i.test(a.tagName):!1},findElementAtOrAfterPosition:function(a,b){for(var c=a.querySelectorAll("span.k4w, canvas.k4wc, img"),f=0;c[f];){if(parseInt(c[f].id,10)>=b)return c[f];
f++}return null},findElementAtOrBeforePosition:function(a,b){for(var c=a.querySelectorAll("span.k4w, canvas.k4wc, img"),f=null,g=0;c[g]&&parseInt(c[g].id,10)<=b;)f=c[g],g++;return f},treeDepth:function(a){for(var b=0;a.parentNode;)b++,a=a.parentNode;return b},elementFromPoint:function(a,d,e){var f=KindleHostDeviceDetector.getDevicePlatform(),g=f&&f.match(b),f=f&&f.match(c)&&KindleHostDeviceDetector.isIE();if(g||f){if(a=a.msElementsFromPoint(d,e),a!==null&&a.length>0)return a[0]}else return a.elementFromPoint(d,
e)},isNumeric:function(a){return!isNaN(parseFloat(a))&&isFinite(a)},count:function(a,b,c){if(a){var g=f[a]||0;c||f[a]===void 0?f[a]=b:b&&(f[a]+=b);return g}}}}(),KindleRendererWordRectsHelper=function(){function g(b,c,f,a){if(c)for(var d=c.length,e=0;e<d;e++)!f&&a?b.push({rect:c[e],dataNid:f,tagName:a}):b.push({rect:c[e],dataNid:f})}function m(b,c,f,a,d){function e(b){if(b&&j[b]){var b=j[b],c=f,e=a,m=d,n=c.querySelector("["+h+"='"+b.dataNid+"']").childNodes[b.childIndex],c=c.createRange();c.setStart(n,
b.startOffset);c.setEnd(n,b.endOffset);var c=c.getClientRects(),o;e&&e.getComputedStyle&&(o=e.getComputedStyle(n.parentNode));l=m.getTransformedClientRects(c,n,o);g(k,l,b.dataNid)}}var k=[],j={},l,m=!1,o,p;for(p=b.start;p<=b.end;p+=1)if(c[p])if(c[p].rects)o&&j[o]&&(e(o),delete j[o]),g(k,c[p].selectableRects||c[p].rects,c[p].dataNid,c[p].tagName),m=!0;else{var n=c[p];if(m||j[o]===void 0||j[o].dataNid!==n.dataNid||j[o].childIndex!==n.childIndex)j[p]={startOffset:n.startOffset,endOffset:n.endOffset,
dataNid:n.dataNid,childIndex:n.childIndex},o=p;else{m=j[o].startOffset;if(m===void 0||m>n.startOffset)j[o].startOffset=n.startOffset;m=j[o].endOffset;if(m===void 0||m<n.endOffset)j[o].endOffset=n.endOffset}m=!1}for(p in j)e(p);return k}var h="data-nid";return{createWordBoundaries:function(b,c,f,a,d){return m(b,c,f,a,d)}}}(),KindleRendererZoomableFixedContentFactory=function(){function g(a,b){return a.data&&b.data?a.data.ordinal!==void 0&&b.data.ordinal!==void 0?a.data.ordinal-b.data.ordinal:a.data.ordinal===
void 0&&b.data.ordinal===void 0?0:a.data.ordinal!==void 0?-1:1:!a.data&&!b.data?0:a.data?-1:1}function m(a,b){if(a.getBoundingClientRect){var c=a.getBoundingClientRect();if(c)return{top:c.top+b.y,right:c.right+b.x,bottom:c.bottom+b.y,left:c.left+b.x,width:c.width,height:c.height}}return null}function h(a){a.setActive=function(a){if(this.sourceElement){var b=this.sourceElement.ownerDocument;if(b&&this.data.targetId){var c=$(b).find("#"+this.data.targetId),f=null;a?(this.data.sourceId&&(f=$(b).find("#"+
this.data.sourceId),c.html().trim().length===0&&(a=f.clone(),a.css({visibility:"visible",color:"black"}),$(c).append(a)),f.hide()),c.show()):(c.hide(),this.data.sourceId&&(f=$(b).find("#"+this.data.sourceId),f.show()))}}};a.isSame=function(a){return a.internalComparison(this.sourceElement)};a.internalComparison=function(a){return this.sourceElement===a};a.getBounds=function(){if(this.sourceElement){var a=this.sourceElement.ownerDocument;if(a&&this.data.targetId&&(a=$(a).find("#"+this.data.targetId),
a.is(":visible"))){var b=a.children(".target-mag"),a=b.length===1?b:a;return m(a.get(0),this.origin)}return m(this.sourceElement,this.origin)}return null}}function b(a,b){a.activate=function(){return b.setActive(!0)};a.deactivate=function(){return b.setActive(!1)};a.isSame=function(a){return b.isSame(a)};a.getBounds=function(){return b.getBounds()};a.internalComparison=function(a){return b.internalComparison(a)}}function c(a,b,c){a.origin=b;a.sourceElement=c;b=c.getAttribute(f);a.data=jQuery.parseJSON(b)}
var f="data-app-amzn-magnify";return{buildList:function(a,d){for(var e=[],f=$(a).find(".app-amzn-magnify").get(),j=0;j<f.length;j++)try{var l={};c(l,d,f[j]);h(l);e.push(l)}catch(m){}e.sort(g);f=[];for(j=0;j<e.length;j++)l={},b(l,e[j]),f.push(l);return f},buildFromCoord:function(a,d,e,f){a:{for(a=KindleRendererUtils.elementFromPoint(a,e-d.x,f-d.y);a;){if($(a).hasClass("app-amzn-magnify")){e=a;break a}a=a.parentNode}e=null}if(e)try{return a={},c(a,d,e),h(a),d={},b(d,a),d}catch(g){}return null}}}(),
KindleRendererZoomableReflowableContentFactory=function(){function g(b){for(;b;){if(b.tagName==="IMG")return b;b=b.parentNode}return null}function m(b){b.clone=function(){if(this.sourceElement)return $(this.sourceElement).clone().get(0)};b.getBounds=function(){var b;if(this.sourceElement)a:{var f=this.sourceElement;b=this.origin;if(f.getBoundingClientRect&&(f=f.getBoundingClientRect())){b={top:f.top+b.y,right:f.right+b.x,bottom:f.bottom+b.y,left:f.left+b.x,width:f.width,height:f.height};break a}b=
null}else b=null;return b}}function h(b,c){b.clone=function(){return c.clone()};b.getBounds=function(){return c.getBounds()}}return{buildFromCoord:function(b,c,f,a){f-=c.x;a-=c.y;var d=KindleRendererUtils.elementFromPoint(b,f,a);if(d&&d.className.match(/amazon-highlight/)){var e=d;e.style.display="none";d=KindleRendererUtils.elementFromPoint(b,f,a);e.style.display="block"}if(f=g(d))try{return b={},b.origin=c,b.sourceElement=f,m(b),c={},h(c,b),c}catch(k){}return null},buildFromElement:function(b,c){var f=
g(b);if(f)try{var a={};a.origin=c;a.sourceElement=f;m(a);f={};h(f,a);return f}catch(d){}return null}}}(),KindleRendererZoomablesFactory=function(){return{buildList:function(g,m){return $(g.body).css("position")==="absolute"?KindleRendererZoomableFixedContentFactory.buildList(g,m):[]},buildFromCoord:function(g,m,h,b){return $(g.body).css("position")==="absolute"?KindleRendererZoomableFixedContentFactory.buildFromCoord(g,m,h,b):KindleRendererZoomableReflowableContentFactory.buildFromCoord(g,m,h,b)}}}();
//# sourceMappingURL=global.dcbbc8f21775dd0c513e.min.js.map