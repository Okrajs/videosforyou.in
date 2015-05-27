/* global window, document */

;(function(win, doc) {
    'use strict';

    // TODO: Support `set` functionality to send data
    // TODO: Support `call` functionality to denote calling
    // TODO: Support error handling

    var _listeners = {};
    var _providers = {};

    // TODO: Error handling

    var _frameByName = function(frameName) {
        // Avoid memory garbage

        if (frameName === '_parent') {
            return window.parent;
        } else {
            // TODO: Filter frames by name as well
            var frame = document.getElementsByName(frameName)[0];

            if (!frame) {
                return null;
            }

            if (frame.contentWindow) {
                return frame.contentWindow;
            } else {
                return null;
            }
        }
    };

    var _generateNounce = function() {
        var size = 12;
        var text = "";
        var possible = ("ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                        "abcdefghijklmnopqrstuvwxyz" +
                        "0123456789");

        for (var i = 0; i < size; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return '_okra_' + text;
    };

    var _notifyListeners = function (event) {
        if (!_listeners.hasOwnProperty(event.origin)) {
            console.error('Cannot verify that the origin message is actually expected');
            return;
        }
        
        if (event.data && ('get' === event.data.action || 'call' === event.data.action)) {
            var nounce = event.data.nounce;

            if (!nounce || nounce.indexOf('_okra_') !== 0) {
                console.error('Cannot verify that it is a valid listener');
                return;
            }

            if (!_listeners[event.origin].hasOwnProperty(nounce)) {
                console.error('Cannot verify that the nonce exists');
                return;
            }

            var listener = _listeners[event.origin][nounce];

            if (event.source !== _frameByName(listener.frameName)) {
                console.error('Cannot verify that the exact frame is the one sending the event');
                return;
            }

            listener(event.data);
        } else if (event.data && 'event' === event.data.action) {
            // TODO: Check for malicious input?
            var eventName = event.data.name;
            if (!_listeners[event.origin].hasOwnProperty(eventName)) {
                console.error('Cannot verify that the nonce exists');
                return;
            }
            
            var eventListener = _listeners[event.origin][eventName];
            
            if (!eventListener.apply) {
                console.error(
                    'The event listener of', 
                    event.origin, 
                    eventName,
                    'isn`t a function'
               );
               
               return;
            }
            
            eventListener(event.data);
        } else {
            console.error(
                'Unsupported Okra action: `' + event.data.action + '`'
            );
        }
    };

    var _handleRequest = function (event) {
        if (!event.data || !event.data.name) {
            console.error('Request don`t have valid handler name');
            return;
        }

        // Wrap this check in a function
        if (!_providers.hasOwnProperty(event.data.name) ||
            !_providers[event.data.name]) {
            // TODO: Add the parameters to the error log
            console.error('No such provider was found');
            return;
        }

        var providerVariants = _providers[event.data.name];

        if (!providerVariants.hasOwnProperty(event.data.action) ||
            !providerVariants[event.data.action]) {
            console.error('No such provider variant was found');
            return;
        }

        var provider = providerVariants[event.data.action];

        if (!provider.isAllowed(event.origin)) {
            console.error('Origin is not allowed for this provider');
            return;
        }

        if ('set' === event.data.action) {
            provider.callback(event.data.value);
        } else if ('get' === event.data.action || 'call' === event.data.action) {
            if ("string" !== typeof event.data.nounce &&
                event.data.nounce.indexOf('_okra_') !== 0) {
                console.error('Invalid nonce has been provided');
                return;
            }

            // TODO: Support fully `async` call and `get` by using callbacks
            //       instead of `return`
            var value = provider.callback();
            event.source.postMessage({
                type: 'response',
                action: event.data.action,
                value: value,
                nounce: event.data.nounce
            }, event.origin);
        } else if ('event' === event.data.action) {
            provider.addListener(event.source, event.origin);
        } else {
            console.error('Action was not recognized', event.data.action);
        }
    };

    window.addEventListener('message', function (event) {
        if (event.data) {
            if (event.data.type === 'request') {
                _handleRequest(event);
            } else if (event.data.type === 'response') {
                _notifyListeners(event);
            }
        }
    }, false);

    var _referrerToOrigin = function () {
        if (!document.referrer) {
            return null;
        }

        var a = document.createElement('a');
        a.href = document.referrer;
        return a.origin;
    };

    // Send `childLoaded` event to the parent
    if (window !== window.parent) {
        // TODO: Check for possible security issues in allowing
        //       referrer blindly
        // TODO: Convert to a faster event, such as DOMReady
        window.addEventListener('load', function () {
            window.parent.postMessage({
               type: "childLoaded"
            }, _referrerToOrigin());
        }, false);
    }

    var createInlet = function(frameName, origin) {
        var _messagesQueue = [];

        // TODO: Really? that's a lousy check
        var _isFrameLoaded = window !== window.parent;

        // TODO: Find a better name for this
        var _realPostMessage = function (message) {
            // TODO: Rename `_frameByName` to `_windowByFrameName`
            var frame = _frameByName(frameName);
            frame.postMessage(message, origin);
        };

        var _postMessage = function (message) {
            if (_isFrameLoaded) {
                _realPostMessage(message);
            } else {
                _messagesQueue.push(message);
            }
        };

        // Detect a childLoad event
        var _loadListener = function (event) {
            var frameWin = _frameByName(frameName);
            if (event.origin === origin && event.source === frameWin) {
                if (event.data && 'childLoaded' === event.data.type) {
                    while (_messagesQueue.length) {
                        var message = _messagesQueue.pop();
                        _realPostMessage(message);
                    }
                    
                    _isFrameLoaded = true;

                    window.removeEventListener(
                        'message',
                        _loadListener,
                        false
                    );
                }
            }
        };

        window.addEventListener('message', _loadListener, false);
        
        var _getOrCall = function (action, name, cb) {
            // TODO: Check for action??
            var nounce = _generateNounce();

            _listeners[origin] = _listeners[origin] || {};

            _listeners[origin][nounce] = function(data) {
                if (cb) {
                    cb(data.value);
                }
                
                delete _listeners[origin][nounce];
            };

            _listeners[origin][nounce].nounce = nounce;
            _listeners[origin][nounce].frameName = frameName;

            _postMessage({
                type: 'request',
                action: action,
                name: name,
                nounce: nounce
            });
        };
        
        
        // TODO: Support listening to an event only once
        // TODO: Support multiple listeners?
        var _onEvent = function (eventName, cb) {
            _listeners[origin] = _listeners[origin] || {};

            _listeners[origin][eventName] = function (data) {
                cb(data.value);
            };

            _listeners[origin][eventName].frameName = frameName;

            // TODO: Support unregistering an event
            _postMessage({
                type: 'request',
                action: 'event',
                name: eventName
            });
        };

        
        var _setValue = function (valueName, value) {
            _postMessage({
                type: 'request',
                action: 'set',
                name: valueName,
                value: value
            });
        };

        return {
            get: function (valueName, cb) {
                _getOrCall('get', valueName, cb);
            },
            // TODO: Support the `apply` dialect
            call: function (functionName, cb) {
                _getOrCall('call', functionName, cb);
            },
            set: _setValue,
            on:  _onEvent
        };
    };

    var createProvider = function (action, name, cb) {
        var _allowedOrigins = {};
        var _registeredListeners = [];
        
        var provider = {
            // TODO: Support origin globe
            // TODO: Support `deny` and `destroy` methods
            allow: function (origin) {
                _allowedOrigins[origin] = true;
                return provider; // Allow subsequent `allow()` calls
            },
            // TODO: This is vague and may allow security issues, such as
            //       allowing the redirector of an iframe to access a page? 
            //       Seems dangerous, perhaps it should be limited to the 
            //       Referrer when it is the `window.parent`. It could be even 
            //       renamed to `allowReferrerTop()`
            allowReferrer: function () {
                return provider.allow(_referrerToOrigin());
            },
            isAllowed: function (origin) {
                if (origin && _allowedOrigins.hasOwnProperty(origin)) {
                    return !!_allowedOrigins[origin];
                } else {
                    return false;
                }
            }
        };
        
        if (action === 'event') {
            provider.emit = function (data) {
                if ('undefined' === typeof data) {
                    data = {};
                }
                
                for (var i=0; i<_registeredListeners.length; i+=1) {
                    var listener = _registeredListeners[i];
                    listener.frame.postMessage({
                        type: 'response',
                        action: 'event',
                        name: name,
                        value: data
                    }, listener.origin);
                }
            };
            
            // TODO: What happens to the registrar if the frame gets removed 
            //       from the DOM?
            // TODO: Add ability to unregister and event
            // TODO: Rename to differentiate between the two types of listeners
            provider.addListener = function (frame, origin) {
                for(var i=0; i<_registeredListeners.length; i+=1) {
                    var listener = _registeredListeners[i];
                    
                    if (listener.frame === frame && 
                        listener.origin === origin) {
                        return; // Prevent adding duplicate entries
                    }
                }
                
                _registeredListeners.push({
                    frame: frame,
                    origin: origin
                });
            };
        } else if (action === 'get' || action === 'set'  || action === 'call') {
            provider.callback = cb;
        } else {
            console.error('Unsupported Okra action: `' + action + '`');
            return;
        }

        _providers[name] = _providers[name] || {};
        _providers[name][action] = provider;

        return provider;
    };

    var Okra = {
        inlet: createInlet,
        provide: createProvider
    };

    win.Okra = Okra;
}(window, document));

