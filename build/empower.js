/**
 * Modules in this bundle
 * @license
 * 
 * @jamestalmage/empower-assert:
 *   license: MIT
 *   author: Takuto Wada <takuto.wada@gmail.com>
 *   contributors: James Talmage
 *   homepage: http://github.com/twada/empower-assert
 *   version: 1.1.1
 * 
 * call-signature:
 *   license: MIT
 *   author: James Talmage <james@talmage.io>
 *   maintainers: jamestalmage <james@talmage.io>, twada <takuto.wada@gmail.com>
 *   homepage: https://github.com/jamestalmage/call-signature#readme
 *   version: 0.0.2
 * 
 * core-js:
 *   license: MIT
 *   maintainers: zloirock <zloirock@zloirock.ru>
 *   homepage: https://github.com/zloirock/core-js#readme
 *   version: 1.2.6
 * 
 * xtend:
 *   license: MIT
 *   author: Raynos <raynos2@gmail.com>
 *   maintainers: raynos <raynos2@gmail.com>
 *   contributors: Jake Verbaten, Matt Esch
 *   homepage: https://github.com/Raynos/xtend
 *   version: 4.0.1
 * 
 * This header is generated by licensify (https://github.com/twada/licensify)
 */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.empower = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw (f.code="MODULE_NOT_FOUND", f)}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/**
 * empower - Power Assert feature enhancer for assert function/object.
 *
 * https://github.com/power-assert-js/empower
 *
 * Copyright (c) 2013-2015 Takuto Wada
 * Licensed under the MIT license.
 *   https://github.com/power-assert-js/empower/blob/master/MIT-LICENSE.txt
 */
var create = _dereq_('core-js/library/fn/object/create');
var extend = _dereq_('xtend/mutable');
var defaultOptions = _dereq_('./lib/default-options');
var Decorator = _dereq_('./lib/decorator');
var capturable = _dereq_('./lib/capturable');
var define = _dereq_('./lib/define-properties');
var slice = Array.prototype.slice;

/**
 * Enhance Power Assert feature to assert function/object.
 * @param assert target assert function or object to enhance
 * @param options enhancement options
 * @return enhanced assert function/object
 */
function empower (assert, options) {
    var typeOfAssert = (typeof assert);
    var enhancedAssert;
    if ((typeOfAssert !== 'object' && typeOfAssert !== 'function') || assert === null) {
        throw new TypeError('empower argument should be a function or object.');
    }
    if (isEmpowered(assert)) {
        return assert;
    }
    switch (typeOfAssert) {
    case 'function':
        enhancedAssert = empowerAssertFunction(assert, options);
        break;
    case 'object':
        enhancedAssert = empowerAssertObject(assert, options);
        break;
    default:
        throw new Error('Cannot be here');
    }
    define(enhancedAssert, capturable());
    return enhancedAssert;
}

function empowerAssertObject (assertObject, options) {
    var config = extend(defaultOptions(), options);
    var target = config.destructive ? assertObject : create(assertObject);
    var decorator = new Decorator(target, config);
    return extend(target, decorator.enhancement());
}

function empowerAssertFunction (assertFunction, options) {
    var config = extend(defaultOptions(), options);
    if (config.destructive) {
        throw new Error('cannot use destructive:true to function.');
    }
    var decorator = new Decorator(assertFunction, config);
    var enhancement = decorator.enhancement();
    var powerAssert;
    if (typeof enhancement === 'function') {
        powerAssert = function powerAssert () {
            return enhancement.apply(null, slice.apply(arguments));
        };
    } else {
        powerAssert = function powerAssert () {
            return assertFunction.apply(null, slice.apply(arguments));
        };
    }
    extend(powerAssert, assertFunction);
    return extend(powerAssert, enhancement);
}

function isEmpowered (assertObjectOrFunction) {
    return (typeof assertObjectOrFunction._capt === 'function') && (typeof assertObjectOrFunction._expr === 'function');
}

empower.defaultOptions = defaultOptions;
module.exports = empower;

},{"./lib/capturable":2,"./lib/decorator":4,"./lib/default-options":5,"./lib/define-properties":6,"core-js/library/fn/object/create":12,"xtend/mutable":27}],2:[function(_dereq_,module,exports){
'use strict';

module.exports = function capturable () {
    var events = [];

    function _capt (value, espath) {
        events.push({value: value, espath: espath});
        return value;
    }

    function _expr (value, args) {
        var captured = events;
        events = [];
        var source = {
            content: args.content,
            filepath: args.filepath,
            line: args.line
        };
        if (args.generator) {
            source.generator = true;
        }
        if (args.async) {
            source.async = true;
        }
        return {
            powerAssertContext: {
                value: value,
                events: captured
            },
            source: source
        };
    }

    return {
        _capt: _capt,
        _expr: _expr
    };
};

},{}],3:[function(_dereq_,module,exports){
'use strict';

var some = _dereq_('core-js/library/fn/array/some');
var map = _dereq_('core-js/library/fn/array/map');
var slice = Array.prototype.slice;

function decorate (callSpec, decorator) {
    var func = callSpec.func;
    var thisObj = callSpec.thisObj;
    var numArgsToCapture = callSpec.numArgsToCapture;

    return function decoratedAssert () {
        var context, message, hasMessage = false, args = slice.apply(arguments);

        if (numArgsToCapture === (args.length - 1)) {
            message = args.pop();
            hasMessage = true;
        }

        var invocation = {
            thisObj: thisObj,
            func: func,
            values: args,
            message: message,
            hasMessage: hasMessage
        };

        if (some(args, isCaptured)) {
            invocation.values = map(args.slice(0, numArgsToCapture), function (arg) {
                if (isNotCaptured(arg)) {
                    return arg;
                }
                if (!context) {
                    context = {
                        source: arg.source,
                        args: []
                    };
                }
                context.args.push({
                    value: arg.powerAssertContext.value,
                    events: arg.powerAssertContext.events
                });
                return arg.powerAssertContext.value;
            });

            return decorator.concreteAssert(invocation, context);
        } else {
            return decorator.fallbackAssert(invocation);
        }
    };
}

function isNotCaptured (value) {
    return !isCaptured(value);
}

function isCaptured (value) {
    return (typeof value === 'object') &&
        (value !== null) &&
        (typeof value.powerAssertContext !== 'undefined');
}

module.exports = decorate;

},{"core-js/library/fn/array/map":10,"core-js/library/fn/array/some":11}],4:[function(_dereq_,module,exports){
'use strict';

var forEach = _dereq_('core-js/library/fn/array/for-each');
var filter = _dereq_('core-js/library/fn/array/filter');
var map = _dereq_('core-js/library/fn/array/map');
var signature = _dereq_('call-signature');
var decorate = _dereq_('./decorate');


function Decorator (receiver, config) {
    this.receiver = receiver;
    this.config = config;
    this.onError = config.onError;
    this.onSuccess = config.onSuccess;
    this.signatures = map(config.patterns, signature.parse);
}

Decorator.prototype.enhancement = function () {
    var that = this;
    var container = this.container();
    forEach(filter(this.signatures, methodCall), function (matcher) {
        var methodName = detectMethodName(matcher.callee);
        if (typeof that.receiver[methodName] === 'function') {
            var callSpec = {
                thisObj: that.receiver,
                func: that.receiver[methodName],
                numArgsToCapture: numberOfArgumentsToCapture(matcher)
            };
            container[methodName] = decorate(callSpec, that);
        }
    });
    return container;
};

Decorator.prototype.container = function () {
    var basement = {};
    if (typeof this.receiver === 'function') {
        var candidates = filter(this.signatures, functionCall);
        if (candidates.length === 1) {
            var callSpec = {
                thisObj: null,
                func: this.receiver,
                numArgsToCapture: numberOfArgumentsToCapture(candidates[0])
            };
            basement = decorate(callSpec, this);
        }
    }
    return basement;
};

Decorator.prototype.concreteAssert = function (invocation, context) {
    var func = invocation.func;
    var thisObj = invocation.thisObj;
    var args = invocation.values;
    var message = invocation.message;
    var ret;
    try {
        ret = func.apply(thisObj, args.concat(message));
    } catch (e) {
        return this.onError({type: 'error', error: e, originalMessage: message, powerAssertContext: context});
    }
    return this.onSuccess({type: 'success', returnValue: ret, originalMessage: message, powerAssertContext: context});
};

Decorator.prototype.fallbackAssert = function (invocation) {
    var func = invocation.func;
    var thisObj = invocation.thisObj;
    var args = invocation.values;
    var message = invocation.message;
    args = args.concat(message);
    var ret;
    try {
        ret = func.apply(thisObj, args);
    } catch (e) {
        return this.onError({type: 'error', error: e, originalMessage: message, args: args});
    }
    return this.onSuccess({type: 'success', returnValue: ret, originalMessage: message, args: args});
};

function numberOfArgumentsToCapture (matcher) {
    var len = matcher.args.length;
    var lastArg;
    if (0 < len) {
        lastArg = matcher.args[len - 1];
        if (lastArg.name === 'message' && lastArg.optional) {
            len -= 1;
        }
    }
    return len;
}


function detectMethodName (callee) {
    if (callee.type === 'MemberExpression') {
        return callee.member;
    }
    return null;
}


function functionCall (matcher) {
    return matcher.callee.type === 'Identifier';
}


function methodCall (matcher) {
    return matcher.callee.type === 'MemberExpression';
}


module.exports = Decorator;

},{"./decorate":3,"call-signature":7,"core-js/library/fn/array/filter":8,"core-js/library/fn/array/for-each":9,"core-js/library/fn/array/map":10}],5:[function(_dereq_,module,exports){
'use strict';

module.exports = function defaultOptions () {
    return {
        destructive: false,
        onError: onError,
        onSuccess: onSuccess,
        patterns: [
            'assert(value, [message])',
            'assert.ok(value, [message])',
            'assert.equal(actual, expected, [message])',
            'assert.notEqual(actual, expected, [message])',
            'assert.strictEqual(actual, expected, [message])',
            'assert.notStrictEqual(actual, expected, [message])',
            'assert.deepEqual(actual, expected, [message])',
            'assert.notDeepEqual(actual, expected, [message])',
            'assert.deepStrictEqual(actual, expected, [message])',
            'assert.notDeepStrictEqual(actual, expected, [message])'
        ]
    };
};

function onError (errorEvent) {
    var e = errorEvent.error;
    if (errorEvent.powerAssertContext && e.name === 'AssertionError') {
        e.powerAssertContext = errorEvent.powerAssertContext;
    }
    throw e;
}

function onSuccess(successEvent) {
    return successEvent.returnValue;
}

},{}],6:[function(_dereq_,module,exports){
'use strict';

var defineProperty = _dereq_('core-js/library/fn/object/define-property');
var foreach = _dereq_('core-js/library/fn/array/for-each');
var keys = _dereq_('core-js/library/fn/object/keys');

var defineProperties = function (object, map) {
  var props = keys(map);
  foreach(props, function (name) {
    defineProperty(object, name, {
      configurable: true,
      enumerable: false,
      value: map[name],
      writable: true
    });
  });
};

module.exports = defineProperties;

},{"core-js/library/fn/array/for-each":9,"core-js/library/fn/object/define-property":13,"core-js/library/fn/object/keys":14}],7:[function(_dereq_,module,exports){
'use strict';
module.exports.parse = parse;
module.exports.generate = generate;

// TODO(jamestalmage): Allow full range of identifier characters instead of just ASCII
//
// This will likely require a build step
//
// SPEC: http://www.ecma-international.org/ecma-262/5.1/#sec-7.6
//
// TOOLING:
//    https://github.com/mathiasbynens/regenerate
//    https://www.npmjs.com/package/regjsgen

var regex = /^\s*(?:([A-Za-z$_][A-Za-z0-9$_]*)\s*\.)?\s*([A-Za-z$_][A-Za-z0-9$_]*)\s*\(\s*((?:[A-Za-z$_][A-Za-z0-9$_]*)|(?:\[\s*[A-Za-z$_][A-Za-z0-9$_]*\s*]))?((?:\s*,\s*(?:(?:[A-Za-z$_][A-Za-z0-9$_]*)|(?:\[\s*[A-Za-z$_][A-Za-z0-9$_]*\s*])))+)?\s*\)\s*$/;

function parse(str) {
	var match = regex.exec(str);
	if (!match) {
		return null;
	}

	var callee;
	if (match[1]) {
		callee = {
			type: 'MemberExpression',
			object: match[1],
			member: match[2]
		};
	} else {
		callee = {
			type: 'Identifier',
			name: match[2]
		};
	}

	var args = match[4] || '';
	args = args.split(',');
	if (match[3]) {
		args[0] = match[3];
	}
	var trimmed = [];
	args.forEach(function (str) {
		var optional = false;
		str = str.replace(/\s+/g, '');
		if (!str.length) {
			return;
		}
		if (str.charAt(0) === '[' && str.charAt(str.length - 1) === ']') {
			optional = true;
			str = str.substring(1, str.length - 1);
		}
		trimmed.push({
			name: str,
			optional: optional
		});
	});

	return {
		callee: callee,
		args: trimmed
	};
}

function generate(parsed) {
	var callee;
	if (parsed.callee.type === 'MemberExpression') {
		callee = [
			parsed.callee.object,
			'.',
			parsed.callee.member
		];
	} else {
		callee = [parsed.callee.name];
	}
	return callee.concat([
		'(',
		parsed.args.map(function (arg) {
			return arg.optional ? '[' + arg.name + ']' : arg.name;
		}).join(', '),
		')'
	]).join('');
}

},{}],8:[function(_dereq_,module,exports){
_dereq_('../../modules/js.array.statics');
module.exports = _dereq_('../../modules/$.core').Array.filter;
},{"../../modules/$.core":16,"../../modules/js.array.statics":26}],9:[function(_dereq_,module,exports){
_dereq_('../../modules/js.array.statics');
module.exports = _dereq_('../../modules/$.core').Array.forEach;
},{"../../modules/$.core":16,"../../modules/js.array.statics":26}],10:[function(_dereq_,module,exports){
_dereq_('../../modules/js.array.statics');
module.exports = _dereq_('../../modules/$.core').Array.map;
},{"../../modules/$.core":16,"../../modules/js.array.statics":26}],11:[function(_dereq_,module,exports){
_dereq_('../../modules/js.array.statics');
module.exports = _dereq_('../../modules/$.core').Array.some;
},{"../../modules/$.core":16,"../../modules/js.array.statics":26}],12:[function(_dereq_,module,exports){
var $ = _dereq_('../../modules/$');
module.exports = function create(P, D){
  return $.create(P, D);
};
},{"../../modules/$":22}],13:[function(_dereq_,module,exports){
var $ = _dereq_('../../modules/$');
module.exports = function defineProperty(it, key, desc){
  return $.setDesc(it, key, desc);
};
},{"../../modules/$":22}],14:[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.keys');
module.exports = _dereq_('../../modules/$.core').Object.keys;
},{"../../modules/$.core":16,"../../modules/es6.object.keys":25}],15:[function(_dereq_,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],16:[function(_dereq_,module,exports){
var core = module.exports = {version: '1.2.6'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],17:[function(_dereq_,module,exports){
// optional / simple context binding
var aFunction = _dereq_('./$.a-function');
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};
},{"./$.a-function":15}],18:[function(_dereq_,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],19:[function(_dereq_,module,exports){
var global    = _dereq_('./$.global')
  , core      = _dereq_('./$.core')
  , ctx       = _dereq_('./$.ctx')
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , IS_WRAP   = type & $export.W
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
    , key, own, out;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && key in target;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function(C){
      var F = function(param){
        return this instanceof C ? new C(param) : C(param);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    if(IS_PROTO)(exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
  }
};
// type bitmap
$export.F = 1;  // forced
$export.G = 2;  // global
$export.S = 4;  // static
$export.P = 8;  // proto
$export.B = 16; // bind
$export.W = 32; // wrap
module.exports = $export;
},{"./$.core":16,"./$.ctx":17,"./$.global":21}],20:[function(_dereq_,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],21:[function(_dereq_,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],22:[function(_dereq_,module,exports){
var $Object = Object;
module.exports = {
  create:     $Object.create,
  getProto:   $Object.getPrototypeOf,
  isEnum:     {}.propertyIsEnumerable,
  getDesc:    $Object.getOwnPropertyDescriptor,
  setDesc:    $Object.defineProperty,
  setDescs:   $Object.defineProperties,
  getKeys:    $Object.keys,
  getNames:   $Object.getOwnPropertyNames,
  getSymbols: $Object.getOwnPropertySymbols,
  each:       [].forEach
};
},{}],23:[function(_dereq_,module,exports){
// most Object methods by ES6 should accept primitives
var $export = _dereq_('./$.export')
  , core    = _dereq_('./$.core')
  , fails   = _dereq_('./$.fails');
module.exports = function(KEY, exec){
  var fn  = (core.Object || {})[KEY] || Object[KEY]
    , exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function(){ fn(1); }), 'Object', exp);
};
},{"./$.core":16,"./$.export":19,"./$.fails":20}],24:[function(_dereq_,module,exports){
// 7.1.13 ToObject(argument)
var defined = _dereq_('./$.defined');
module.exports = function(it){
  return Object(defined(it));
};
},{"./$.defined":18}],25:[function(_dereq_,module,exports){
// 19.1.2.14 Object.keys(O)
var toObject = _dereq_('./$.to-object');

_dereq_('./$.object-sap')('keys', function($keys){
  return function keys(it){
    return $keys(toObject(it));
  };
});
},{"./$.object-sap":23,"./$.to-object":24}],26:[function(_dereq_,module,exports){
// JavaScript 1.6 / Strawman array statics shim
var $       = _dereq_('./$')
  , $export = _dereq_('./$.export')
  , $ctx    = _dereq_('./$.ctx')
  , $Array  = _dereq_('./$.core').Array || Array
  , statics = {};
var setStatics = function(keys, length){
  $.each.call(keys.split(','), function(key){
    if(length == undefined && key in $Array)statics[key] = $Array[key];
    else if(key in [])statics[key] = $ctx(Function.call, [][key], length);
  });
};
setStatics('pop,reverse,shift,keys,values,entries', 1);
setStatics('indexOf,every,some,forEach,map,filter,find,findIndex,includes', 3);
setStatics('join,slice,concat,push,splice,unshift,sort,lastIndexOf,' +
           'reduce,reduceRight,copyWithin,fill');
$export($export.S, 'Array', statics);
},{"./$":22,"./$.core":16,"./$.ctx":17,"./$.export":19}],27:[function(_dereq_,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},[1])(1)
});