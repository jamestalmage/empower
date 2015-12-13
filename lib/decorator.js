'use strict';

var forEach = require('core-js/library/fn/array/for-each');
var filter = require('core-js/library/fn/array/filter');
var map = require('core-js/library/fn/array/map');
var signature = require('call-signature');
var decorate = require('./decorate');


function Decorator (receiver, config) {
    this.receiver = receiver;
    this.config = config;
    this.onError = config.onError;
    this.onSuccess = config.onSuccess;
    this.signatures = map(config.patterns, signature.parse);
    this.addtionalMethods = map(config.additionalMethods, signature.parse);
}

Decorator.prototype.enhancement = function () {
    var that = this;
    var container = this.container();
    var wrappedMethods = [];

    function attach(matcher, enhanced) {
        var methodName = detectMethodName(matcher.callee);
        if (typeof that.receiver[methodName] !== 'function' || wrappedMethods.indexOf(methodName) !== -1) {
            return;
        }
        var callSpec = {
            thisObj: that.receiver,
            func: that.receiver[methodName],
            numArgsToCapture: numberOfArgumentsToCapture(matcher),
            enhanced: enhanced
        };
        container[methodName] = decorate(callSpec, that);
        wrappedMethods.push(methodName);
    }

    forEach(filter(this.signatures, methodCall), function (matcher) {
        attach(matcher, true);
    });

    forEach(filter(this.addtionalMethods, methodCall), function (matcher) {
        attach(matcher, false);
    });

    return container;
};

Decorator.prototype.container = function () {
    var basement = {};
    if (typeof this.receiver === 'function') {
        var candidates = filter(this.signatures, functionCall);
        var enhanced = true;
        if (candidates.length === 0) {
            enhanced = false;
            candidates = filter(this.addtionalMethods, functionCall);
        }
        if (candidates.length === 1) {
            var callSpec = {
                thisObj: null,
                func: this.receiver,
                numArgsToCapture: numberOfArgumentsToCapture(candidates[0]),
                enhanced: enhanced
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
    if (context && typeof this.config.modifyMessageBeforeAssert === 'function') {
        message = this.config.modifyMessageBeforeAssert({originalMessage: message, powerAssertContext: context});
    }
    args = args.concat(message);
    var ret;
    try {
        ret = func.apply(thisObj, args);
    } catch (e) {
        if (context) {
            return this.onError({type: 'error', error: e, originalMessage: message, powerAssertContext: context});
        } else {
            return this.onError({type: 'error', error: e, originalMessage: message, args: args});
        }
    }
    if (context) {
        return this.onSuccess({type: 'success', returnValue: ret, originalMessage: message, powerAssertContext: context});
    } else {
        return this.onSuccess({type: 'success', returnValue: ret, originalMessage: message, args: args});
    }
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
