(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.grapheneWS = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// var { List } = require("immutable");
var ChainWebSocket = require("./ChainWebSocket");
var GrapheneApi = require("./GrapheneApi");
var ChainConfig = require("./ChainConfig");

var inst;

/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

    Import: import { Apis } from "@graphene/chain"

    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
*/

module.exports = {

    setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
        if (inst) inst.setRpcConnectionStatusCallback(callback);
    },

    /**
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
    */
    reset: function reset() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];

        if (inst) {
            inst.close();
            inst = null;
        }
        inst = new ApisInstance();
        inst.setRpcConnectionStatusCallback(this.statusCb);

        if (inst && connect) {
            inst.connect(cs);
        }

        return inst;
    },
    instance: function instance() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];

        if (!inst) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs);
        }

        return inst;
    },
    chainId: function chainId() {
        return Apis.instance().chain_id;
    },

    close: function close() {
        if (inst) {
            inst.close();
            inst = null;
        }
    }
    // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
    // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
    // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
    // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
};

var ApisInstance = function () {
    function ApisInstance() {
        _classCallCheck(this, ApisInstance);
    }

    _createClass(ApisInstance, [{
        key: "connect",


        /** @arg {string} connection .. */
        value: function connect(cs) {
            var _this = this;

            // console.log("INFO\tApiInstances\tconnect\t", cs);

            var rpc_user = "",
                rpc_password = "";
            if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
                throw new Error("Secure domains require wss connection");
            }

            this.ws_rpc = new ChainWebSocket(cs, this.statusCb);

            this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
                // console.log("Login done");
                _this._db = new GrapheneApi(_this.ws_rpc, "database");
                _this._net = new GrapheneApi(_this.ws_rpc, "network_broadcast");
                _this._hist = new GrapheneApi(_this.ws_rpc, "history");
                _this._crypt = new GrapheneApi(_this.ws_rpc, "crypto");
                var db_promise = _this._db.init().then(function () {
                    //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                    return _this._db.exec("get_chain_id", []).then(function (_chain_id) {
                        _this.chain_id = _chain_id;
                        return ChainConfig.setChainId(_chain_id);
                        //DEBUG console.log("chain_id1",this.chain_id)
                    });
                });
                _this.ws_rpc.on_reconnect = function () {
                    _this.ws_rpc.login("", "").then(function () {
                        _this._db.init().then(function () {
                            if (_this.statusCb) _this.statusCb("reconnect");
                        });
                        _this._net.init();
                        _this._hist.init();
                        _this._crypt.init();
                    });
                };
                return Promise.all([db_promise, _this._net.init(), _this._hist.init(), _this._crypt.init()
                // Temporary squash crypto API error until the API is upgraded everywhere
                .catch(function (e) {
                    return console.error("ApiInstance\tCrypto API Error", e);
                })]);
            });
        }
    }, {
        key: "close",
        value: function close() {
            if (this.ws_rpc) this.ws_rpc.close();
            this.ws_rpc = null;
        }
    }, {
        key: "db_api",
        value: function db_api() {
            return this._db;
        }
    }, {
        key: "network_api",
        value: function network_api() {
            return this._net;
        }
    }, {
        key: "history_api",
        value: function history_api() {
            return this._hist;
        }
    }, {
        key: "crypto_api",
        value: function crypto_api() {
            return this._crypt;
        }
    }, {
        key: "setRpcConnectionStatusCallback",
        value: function setRpcConnectionStatusCallback(callback) {
            this.statusCb = callback;
        }
    }]);

    return ApisInstance;
}();
},{"./ChainConfig":2,"./ChainWebSocket":3,"./GrapheneApi":4}],2:[function(require,module,exports){
(function (process){
"use strict";

var _this;

var ecc_config = {
	address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "EDC"
};

module.exports = _this = {
	core_asset: "EDC",
	address_prefix: "EDC",
	expire_in_secs: 15,
	expire_in_secs_proposal: 24 * 60 * 60,
	networks: {
		Edinar: {
			core_asset: "EDC",
			address_prefix: "EDC",
			chain_id: "979b29912e5546dbf47604692aafc94519f486c56221a5705f0c7f5f294df126"
		}
	},

	/** Set a few properties for known chain IDs. */
	setChainId: function setChainId(chain_id) {

		var i, len, network, network_name, ref;
		ref = Object.keys(_this.networks);

		for (i = 0, len = ref.length; i < len; i++) {

			network_name = ref[i];
			network = _this.networks[network_name];

			if (network.chain_id === chain_id) {

				_this.network_name = network_name;

				if (network.address_prefix) {
					_this.address_prefix = network.address_prefix;
					ecc_config.address_prefix = network.address_prefix;
				}

				// console.log("INFO    Configured for", network_name, ":", network.core_asset, "\n");

				return {
					network_name: network_name,
					network: network
				};
			}
		}

		if (!_this.network_name) {
			console.log("Unknown chain id (this may be a testnet)", chain_id);
		}
	},

	reset: function reset() {
		_this.core_asset = "EDC";
		_this.address_prefix = "EDC";
		ecc_config.address_prefix = "EDC";
		_this.expire_in_secs = 15;
		_this.expire_in_secs_proposal = 24 * 60 * 60;

		console.log("Chain config reset");
	},

	setPrefix: function setPrefix() {
		var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "EDC";

		_this.address_prefix = prefix;
		ecc_config.address_prefix = prefix;
	}
};
}).call(this,require('_process'))

},{"_process":7}],3:[function(require,module,exports){
(function (process){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebSocketClient = void 0;
if (typeof WebSocket === "undefined" && !process.env.browser) {
	WebSocketClient = require("ws");
} else if (typeof WebSocket !== "undefined") {
	WebSocketClient = require("ReconnectingWebSocket");
}

var SOCKET_DEBUG = false;

var ChainWebSocket = function () {
	function ChainWebSocket(ws_server, statusCb) {
		var _this = this;

		_classCallCheck(this, ChainWebSocket);

		this.statusCb = statusCb;

		try {
			this.ws = new WebSocketClient(ws_server);
		} catch (error) {
			console.error("invalid websocket URL:", error);
			this.ws = new WebSocketClient("wss://127.0.0.1:8080");
		}
		this.ws.timeoutInterval = 5000;
		this.current_reject = null;
		this.on_reconnect = null;
		this.connect_promise = new Promise(function (resolve, reject) {
			_this.current_reject = reject;
			_this.ws.onopen = function () {
				if (_this.statusCb) _this.statusCb("open");
				if (_this.on_reconnect) _this.on_reconnect();
				resolve();
			};
			_this.ws.onerror = function (error) {
				if (_this.statusCb) _this.statusCb("error");

				if (_this.current_reject) {
					_this.current_reject(error);
				}
			};
			_this.ws.onmessage = function (message) {
				return _this.listener(JSON.parse(message.data));
			};
			_this.ws.onclose = function () {
				if (_this.statusCb) _this.statusCb("closed");
			};
		});
		this.cbId = 0;
		this.cbs = {};
		this.subs = {};
		this.unsub = {};
	}

	_createClass(ChainWebSocket, [{
		key: "call",
		value: function call(params) {
			var _this2 = this;

			var method = params[1];
			if (SOCKET_DEBUG) console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId + 1), JSON.stringify(params));

			this.cbId += 1;

			if (method === "set_subscribe_callback" || method === "subscribe_to_market" || method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback") {
				// Store callback in subs map
				this.subs[this.cbId] = {
					callback: params[2][0]
				};

				// Replace callback with the callback id
				params[2][0] = this.cbId;
			}

			if (method === "unsubscribe_from_market" || method === "unsubscribe_from_accounts") {
				if (typeof params[2][0] !== "function") {
					throw new Error("First parameter of unsub must be the original callback");
				}

				var unSubCb = params[2].splice(0, 1)[0];

				// Find the corresponding subscription
				for (var id in this.subs) {
					if (this.subs[id].callback === unSubCb) {
						this.unsub[this.cbId] = id;
						break;
					}
				}
			}

			var request = {
				method: "call",
				params: params
			};
			request.id = this.cbId;

			return new Promise(function (resolve, reject) {
				_this2.cbs[_this2.cbId] = {
					time: new Date(),
					resolve: resolve,
					reject: reject
				};
				_this2.ws.onerror = function (error) {
					console.log("!!! ChainWebSocket Error ", error);
					reject(error);
				};
				_this2.ws.send(JSON.stringify(request));
			});
		}
	}, {
		key: "listener",
		value: function listener(response) {
			if (SOCKET_DEBUG) console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

			var sub = false,
			    callback = null;

			if (response.method === "notice") {
				sub = true;
				response.id = response.params[0];
			}

			if (!sub) {
				callback = this.cbs[response.id];
			} else {
				callback = this.subs[response.id].callback;
			}

			if (callback && !sub) {
				if (response.error) {
					callback.reject(response.error);
				} else {
					callback.resolve(response.result);
				}
				delete this.cbs[response.id];

				if (this.unsub[response.id]) {
					delete this.subs[this.unsub[response.id]];
					delete this.unsub[response.id];
				}
			} else if (callback && sub) {
				callback(response.params[1]);
			} else {
				console.log("Warning: unknown websocket response: ", response);
			}
		}
	}, {
		key: "login",
		value: function login(user, password) {
			var _this3 = this;

			return this.connect_promise.then(function () {
				return _this3.call([1, "login", [user, password]]);
			});
		}
	}, {
		key: "close",
		value: function close() {
			this.ws.close();
		}
	}]);

	return ChainWebSocket;
}();

module.exports = ChainWebSocket;
}).call(this,require('_process'))

},{"ReconnectingWebSocket":5,"_process":7,"ws":6}],4:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GrapheneApi = function () {
    function GrapheneApi(ws_rpc, api_name) {
        _classCallCheck(this, GrapheneApi);

        this.ws_rpc = ws_rpc;
        this.api_name = api_name;
    }

    _createClass(GrapheneApi, [{
        key: "init",
        value: function init() {
            var self = this;
            return this.ws_rpc.call([1, this.api_name, []]).then(function (response) {
                //console.log("[GrapheneApi.js:11] ----- GrapheneApi.init ----->", this.api_name, response);
                self.api_id = response;
                return self;
            });
        }
    }, {
        key: "exec",
        value: function exec(method, params) {
            return this.ws_rpc.call([this.api_id, method, params]).catch(function (error) {
                console.log("!!! GrapheneApi error: ", method, params, error, JSON.stringify(error));
                throw error;
            });
        }
    }]);

    return GrapheneApi;
}();

module.exports = GrapheneApi;
},{}],5:[function(require,module,exports){
// MIT License:
//
// Copyright (c) 2010-2012, Joe Walnes
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * This behaves like a WebSocket in every way, except if it fails to connect,
 * or it gets disconnected, it will repeatedly poll until it successfully connects
 * again.
 *
 * It is API compatible, so when you have:
 *   ws = new WebSocket('ws://....');
 * you can replace with:
 *   ws = new ReconnectingWebSocket('ws://....');
 *
 * The event stream will typically look like:
 *  onconnecting
 *  onopen
 *  onmessage
 *  onmessage
 *  onclose // lost connection
 *  onconnecting
 *  onopen  // sometime later...
 *  onmessage
 *  onmessage
 *  etc...
 *
 * It is API compatible with the standard WebSocket API, apart from the following members:
 *
 * - `bufferedAmount`
 * - `extensions`
 * - `binaryType`
 *
 * Latest version: https://github.com/joewalnes/reconnecting-websocket/
 * - Joe Walnes
 *
 * Syntax
 * ======
 * var socket = new ReconnectingWebSocket(url, protocols, options);
 *
 * Parameters
 * ==========
 * url - The url you are connecting to.
 * protocols - Optional string or array of protocols.
 * options - See below
 *
 * Options
 * =======
 * Options can either be passed upon instantiation or set after instantiation:
 *
 * var socket = new ReconnectingWebSocket(url, null, { debug: true, reconnectInterval: 4000 });
 *
 * or
 *
 * var socket = new ReconnectingWebSocket(url);
 * socket.debug = true;
 * socket.reconnectInterval = 4000;
 *
 * debug
 * - Whether this instance should log debug messages. Accepts true or false. Default: false.
 *
 * automaticOpen
 * - Whether or not the websocket should attempt to connect immediately upon instantiation. The socket can be manually opened or closed at any time using ws.open() and ws.close().
 *
 * reconnectInterval
 * - The number of milliseconds to delay before attempting to reconnect. Accepts integer. Default: 1000.
 *
 * maxReconnectInterval
 * - The maximum number of milliseconds to delay a reconnection attempt. Accepts integer. Default: 30000.
 *
 * reconnectDecay
 * - The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. Accepts integer or float. Default: 1.5.
 *
 * timeoutInterval
 * - The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. Accepts integer. Default: 2000.
 *
 */
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports){
        module.exports = factory();
    } else {
        global.ReconnectingWebSocket = factory();
    }
})(this, function () {

    if (typeof window === "undefined" || !('WebSocket' in window)) {
        return;
    }

    function ReconnectingWebSocket(url, protocols, options) {

        // Default settings
        var settings = {

            /** Whether this instance should log debug messages. */
            debug: false,

            /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
            automaticOpen: true,

            /** The number of milliseconds to delay before attempting to reconnect. */
            reconnectInterval: 1000,
            /** The maximum number of milliseconds to delay a reconnection attempt. */
            maxReconnectInterval: 30000,
            /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
            reconnectDecay: 1.5,

            /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
            timeoutInterval: 2000,

            /** The maximum number of reconnection attempts to make. Unlimited if null. */
            maxReconnectAttempts: null,

            /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
            binaryType: 'blob'
        }
        if (!options) { options = {}; }

        // Overwrite and define settings with options if they exist.
        for (var key in settings) {
            if (typeof options[key] !== 'undefined') {
                this[key] = options[key];
            } else {
                this[key] = settings[key];
            }
        }

        // These should be treated as read-only properties

        /** The URL as resolved by the constructor. This is always an absolute URL. Read only. */
        this.url = url;

        /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
        this.reconnectAttempts = 0;

        /**
         * The current state of the connection.
         * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
         * Read only.
         */
        this.readyState = WebSocket.CONNECTING;

        /**
         * A string indicating the name of the sub-protocol the server selected; this will be one of
         * the strings specified in the protocols parameter when creating the WebSocket object.
         * Read only.
         */
        this.protocol = null;

        // Private state variables

        var self = this;
        var ws;
        var forcedClose = false;
        var timedOut = false;
        var t = null;
        var eventTarget = document.createElement('div');

        // Wire up "on*" properties as event handlers

        eventTarget.addEventListener('open',       function(event) { self.onopen(event); });
        eventTarget.addEventListener('close',      function(event) { self.onclose(event); });
        eventTarget.addEventListener('connecting', function(event) { self.onconnecting(event); });
        eventTarget.addEventListener('message',    function(event) { self.onmessage(event); });
        eventTarget.addEventListener('error',      function(event) { self.onerror(event); });

        // Expose the API required by EventTarget

        this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
        this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
        this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);

        /**
         * This function generates an event that is compatible with standard
         * compliant browsers and IE9 - IE11
         *
         * This will prevent the error:
         * Object doesn't support this action
         *
         * http://stackoverflow.com/questions/19345392/why-arent-my-parameters-getting-passed-through-to-a-dispatched-event/19345563#19345563
         * @param s String The name that the event should use
         * @param args Object an optional object that the event will use
         */
        function generateEvent(s, args) {
        	var evt = document.createEvent("CustomEvent");
        	evt.initCustomEvent(s, false, false, args);
        	return evt;
        };

        this.open = function (reconnectAttempt) {
            ws = new WebSocket(self.url, protocols || []);
            ws.binaryType = this.binaryType;

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return;
                }
            } else {
                eventTarget.dispatchEvent(generateEvent('connecting'));
                this.reconnectAttempts = 0;
            }

            if (self.debug || ReconnectingWebSocket.debugAll) {
                console.debug('ReconnectingWebSocket', 'attempt-connect', self.url);
            }

            var localWs = ws;
            var timeout = setTimeout(function() {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'connection-timeout', self.url);
                }
                timedOut = true;
                localWs.close();
                timedOut = false;
            }, self.timeoutInterval);

            ws.onopen = function(event) {
                clearTimeout(timeout);
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onopen', self.url);
                }
                self.protocol = ws.protocol;
                self.readyState = WebSocket.OPEN;
                self.reconnectAttempts = 0;
                var e = generateEvent('open');
                e.isReconnect = reconnectAttempt;
                reconnectAttempt = false;
                eventTarget.dispatchEvent(e);
            };

            ws.onclose = function(event) {
                clearTimeout(timeout);
                ws = null;
                if (forcedClose) {
                    self.readyState = WebSocket.CLOSED;
                    eventTarget.dispatchEvent(generateEvent('close'));
                } else {
                    self.readyState = WebSocket.CONNECTING;
                    var e = generateEvent('connecting');
                    e.code = event.code;
                    e.reason = event.reason;
                    e.wasClean = event.wasClean;
                    eventTarget.dispatchEvent(e);
                    if (!reconnectAttempt && !timedOut) {
                        if (self.debug || ReconnectingWebSocket.debugAll) {
                            console.debug('ReconnectingWebSocket', 'onclose', self.url);
                        }
                        eventTarget.dispatchEvent(generateEvent('close'));
                    }

                    var timeout = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts);
                    t = setTimeout(function() {
                        self.reconnectAttempts++;
                        self.open(true);
                    }, timeout > self.maxReconnectInterval ? self.maxReconnectInterval : timeout);
                }
            };
            ws.onmessage = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onmessage', self.url, event.data);
                }
                var e = generateEvent('message');
                e.data = event.data;
                eventTarget.dispatchEvent(e);
            };
            ws.onerror = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onerror', self.url, event);
                }
                eventTarget.dispatchEvent(generateEvent('error'));
            };
        }

        // Whether or not to create a websocket upon instantiation
        if (this.automaticOpen == true) {
            this.open(false);
        }

        /**
         * Transmits data to the server over the WebSocket connection.
         *
         * @param data a text string, ArrayBuffer or Blob to send to the server.
         */
        this.send = function(data) {
            if (ws) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'send', self.url, data);
                }
                return ws.send(data);
            } else {
                throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
            }
        };

        /**
         * Closes the WebSocket connection or connection attempt, if any.
         * If the connection is already CLOSED, this method does nothing.
         */
        this.close = function(code, reason) {
            // Default CLOSE_NORMAL code
            if (typeof code == 'undefined') {
                code = 1000;
            }
            forcedClose = true;
            if (ws) {
                ws.close(code, reason);
            }
            if (t) {
                clearTimeout(t);
                t = null;
            }
        };

        /**
         * Additional public API method to refresh the connection if still open (close, re-open).
         * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
         */
        this.refresh = function() {
            if (ws) {
                ws.close();
            }
        };
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
     * this indicates that the connection is ready to send and receive data.
     */
    ReconnectingWebSocket.prototype.onopen = function(event) {};
    /** An event listener to be called when the WebSocket connection's readyState changes to CLOSED. */
    ReconnectingWebSocket.prototype.onclose = function(event) {};
    /** An event listener to be called when a connection begins being attempted. */
    ReconnectingWebSocket.prototype.onconnecting = function(event) {};
    /** An event listener to be called when a message is received from the server. */
    ReconnectingWebSocket.prototype.onmessage = function(event) {};
    /** An event listener to be called when an error occurs. */
    ReconnectingWebSocket.prototype.onerror = function(event) {};

    /**
     * Whether all instances of ReconnectingWebSocket should log debug messages.
     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
     */
    ReconnectingWebSocket.debugAll = false;

    ReconnectingWebSocket.CONNECTING = WebSocket.CONNECTING;
    ReconnectingWebSocket.OPEN = WebSocket.OPEN;
    ReconnectingWebSocket.CLOSING = WebSocket.CLOSING;
    ReconnectingWebSocket.CLOSED = WebSocket.CLOSED;

    return ReconnectingWebSocket;
});

},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L3NyYy9BcGlJbnN0YW5jZXMuanMiLCJkaXN0L3NyYy9DaGFpbkNvbmZpZy5qcyIsImRpc3Qvc3JjL0NoYWluV2ViU29ja2V0LmpzIiwiZGlzdC9zcmMvR3JhcGhlbmVBcGkuanMiLCJub2RlX21vZHVsZXMvUmVjb25uZWN0aW5nV2ViU29ja2V0L3JlY29ubmVjdGluZy13ZWJzb2NrZXQuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFhBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG4vLyB2YXIgeyBMaXN0IH0gPSByZXF1aXJlKFwiaW1tdXRhYmxlXCIpO1xudmFyIENoYWluV2ViU29ja2V0ID0gcmVxdWlyZShcIi4vQ2hhaW5XZWJTb2NrZXRcIik7XG52YXIgR3JhcGhlbmVBcGkgPSByZXF1aXJlKFwiLi9HcmFwaGVuZUFwaVwiKTtcbnZhciBDaGFpbkNvbmZpZyA9IHJlcXVpcmUoXCIuL0NoYWluQ29uZmlnXCIpO1xuXG52YXIgaW5zdDtcblxuLyoqXG4gICAgQ29uZmlndXJlOiBjb25maWd1cmUgYXMgZm9sbG93cyBgQXBpcy5pbnN0YW5jZShcIndzOi8vbG9jYWxob3N0OjgwOTBcIikuaW5pdF9wcm9taXNlYC4gIFRoaXMgcmV0dXJucyBhIHByb21pc2UsIG9uY2UgcmVzb2x2ZWQgdGhlIGNvbm5lY3Rpb24gaXMgcmVhZHkuXG5cbiAgICBJbXBvcnQ6IGltcG9ydCB7IEFwaXMgfSBmcm9tIFwiQGdyYXBoZW5lL2NoYWluXCJcblxuICAgIFNob3J0LWhhbmQ6IEFwaXMuZGIoXCJtZXRob2RcIiwgXCJwYXJtMVwiLCAyLCAzLCAuLi4pLiAgUmV0dXJucyBhIHByb21pc2Ugd2l0aCByZXN1bHRzLlxuXG4gICAgQWRkaXRpb25hbCB1c2FnZTogQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMoXCJtZXRob2RcIiwgW1wibWV0aG9kXCIsIFwicGFybTFcIiwgMiwgMywgLi4uXSkuICBSZXR1cm5zIGEgcHJvbWlzZSB3aXRoIHJlc3VsdHMuXG4qL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjazogZnVuY3Rpb24gc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuc3RhdHVzQ2IgPSBjYWxsYmFjaztcbiAgICAgICAgaWYgKGluc3QpIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICAgIEBhcmcge3N0cmluZ30gY3MgaXMgb25seSBwcm92aWRlZCBpbiB0aGUgZmlyc3QgY2FsbFxuICAgICAgICBAcmV0dXJuIHtBcGlzfSBzaW5nbGV0b24gLi4gQ2hlY2sgQXBpcy5pbnN0YW5jZSgpLmluaXRfcHJvbWlzZSB0byBrbm93IHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWRcbiAgICAqL1xuICAgIHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIndzOi8vbG9jYWxob3N0OjgwOTBcIjtcbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG5cbiAgICAgICAgaWYgKGluc3QpIHtcbiAgICAgICAgICAgIGluc3QuY2xvc2UoKTtcbiAgICAgICAgICAgIGluc3QgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGluc3QgPSBuZXcgQXBpc0luc3RhbmNlKCk7XG4gICAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKHRoaXMuc3RhdHVzQ2IpO1xuXG4gICAgICAgIGlmIChpbnN0ICYmIGNvbm5lY3QpIHtcbiAgICAgICAgICAgIGluc3QuY29ubmVjdChjcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdDtcbiAgICB9LFxuICAgIGluc3RhbmNlOiBmdW5jdGlvbiBpbnN0YW5jZSgpIHtcbiAgICAgICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIndzOi8vbG9jYWxob3N0OjgwOTBcIjtcbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG5cbiAgICAgICAgaWYgKCFpbnN0KSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IEFwaXNJbnN0YW5jZSgpO1xuICAgICAgICAgICAgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sodGhpcy5zdGF0dXNDYik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICAgICAgICBpbnN0LmNvbm5lY3QoY3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgfSxcbiAgICBjaGFpbklkOiBmdW5jdGlvbiBjaGFpbklkKCkge1xuICAgICAgICByZXR1cm4gQXBpcy5pbnN0YW5jZSgpLmNoYWluX2lkO1xuICAgIH0sXG5cbiAgICBjbG9zZTogZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgIGlmIChpbnN0KSB7XG4gICAgICAgICAgICBpbnN0LmNsb3NlKCk7XG4gICAgICAgICAgICBpbnN0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBkYjogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIG5ldHdvcms6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5uZXR3b3JrX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGhpc3Rvcnk6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5oaXN0b3J5X2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGNyeXB0bzogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmNyeXB0b19hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKVxufTtcblxudmFyIEFwaXNJbnN0YW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBcGlzSW5zdGFuY2UoKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBBcGlzSW5zdGFuY2UpO1xuICAgIH1cblxuICAgIF9jcmVhdGVDbGFzcyhBcGlzSW5zdGFuY2UsIFt7XG4gICAgICAgIGtleTogXCJjb25uZWN0XCIsXG5cblxuICAgICAgICAvKiogQGFyZyB7c3RyaW5nfSBjb25uZWN0aW9uIC4uICovXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBjb25uZWN0KGNzKSB7XG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIklORk9cXHRBcGlJbnN0YW5jZXNcXHRjb25uZWN0XFx0XCIsIGNzKTtcblxuICAgICAgICAgICAgdmFyIHJwY191c2VyID0gXCJcIixcbiAgICAgICAgICAgICAgICBycGNfcGFzc3dvcmQgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiBjcy5pbmRleE9mKFwid3NzOi8vXCIpIDwgMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY3VyZSBkb21haW5zIHJlcXVpcmUgd3NzIGNvbm5lY3Rpb25cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMud3NfcnBjID0gbmV3IENoYWluV2ViU29ja2V0KGNzLCB0aGlzLnN0YXR1c0NiKTtcblxuICAgICAgICAgICAgdGhpcy5pbml0X3Byb21pc2UgPSB0aGlzLndzX3JwYy5sb2dpbihycGNfdXNlciwgcnBjX3Bhc3N3b3JkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkxvZ2luIGRvbmVcIik7XG4gICAgICAgICAgICAgICAgX3RoaXMuX2RiID0gbmV3IEdyYXBoZW5lQXBpKF90aGlzLndzX3JwYywgXCJkYXRhYmFzZVwiKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5fbmV0ID0gbmV3IEdyYXBoZW5lQXBpKF90aGlzLndzX3JwYywgXCJuZXR3b3JrX2Jyb2FkY2FzdFwiKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5faGlzdCA9IG5ldyBHcmFwaGVuZUFwaShfdGhpcy53c19ycGMsIFwiaGlzdG9yeVwiKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5fY3J5cHQgPSBuZXcgR3JhcGhlbmVBcGkoX3RoaXMud3NfcnBjLCBcImNyeXB0b1wiKTtcbiAgICAgICAgICAgICAgICB2YXIgZGJfcHJvbWlzZSA9IF90aGlzLl9kYi5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vaHR0cHM6Ly9naXRodWIuY29tL2NyeXB0b25vbWV4L2dyYXBoZW5lL3dpa2kvY2hhaW4tbG9ja2VkLXR4XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5fZGIuZXhlYyhcImdldF9jaGFpbl9pZFwiLCBbXSkudGhlbihmdW5jdGlvbiAoX2NoYWluX2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5jaGFpbl9pZCA9IF9jaGFpbl9pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDaGFpbkNvbmZpZy5zZXRDaGFpbklkKF9jaGFpbl9pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL0RFQlVHIGNvbnNvbGUubG9nKFwiY2hhaW5faWQxXCIsdGhpcy5jaGFpbl9pZClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgX3RoaXMud3NfcnBjLm9uX3JlY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMud3NfcnBjLmxvZ2luKFwiXCIsIFwiXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2RiLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwicmVjb25uZWN0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fbmV0LmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9oaXN0LmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9jcnlwdC5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtkYl9wcm9taXNlLCBfdGhpcy5fbmV0LmluaXQoKSwgX3RoaXMuX2hpc3QuaW5pdCgpLCBfdGhpcy5fY3J5cHQuaW5pdCgpXG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJ5IHNxdWFzaCBjcnlwdG8gQVBJIGVycm9yIHVudGlsIHRoZSBBUEkgaXMgdXBncmFkZWQgZXZlcnl3aGVyZVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29uc29sZS5lcnJvcihcIkFwaUluc3RhbmNlXFx0Q3J5cHRvIEFQSSBFcnJvclwiLCBlKTtcbiAgICAgICAgICAgICAgICB9KV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIGtleTogXCJjbG9zZVwiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy53c19ycGMpIHRoaXMud3NfcnBjLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLndzX3JwYyA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIGtleTogXCJkYl9hcGlcIixcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGRiX2FwaSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9kYjtcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAga2V5OiBcIm5ldHdvcmtfYXBpXCIsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBuZXR3b3JrX2FwaSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9uZXQ7XG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIGtleTogXCJoaXN0b3J5X2FwaVwiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gaGlzdG9yeV9hcGkoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faGlzdDtcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAga2V5OiBcImNyeXB0b19hcGlcIixcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNyeXB0b19hcGkoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY3J5cHQ7XG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIGtleTogXCJzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2tcIixcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5zdGF0dXNDYiA9IGNhbGxiYWNrO1xuICAgICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIEFwaXNJbnN0YW5jZTtcbn0oKTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF90aGlzO1xuXG52YXIgZWNjX2NvbmZpZyA9IHtcblx0YWRkcmVzc19wcmVmaXg6IHByb2Nlc3MuZW52Lm5wbV9jb25maWdfX2dyYXBoZW5lX2VjY19kZWZhdWx0X2FkZHJlc3NfcHJlZml4IHx8IFwiRURDXCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3RoaXMgPSB7XG5cdGNvcmVfYXNzZXQ6IFwiRURDXCIsXG5cdGFkZHJlc3NfcHJlZml4OiBcIkVEQ1wiLFxuXHRleHBpcmVfaW5fc2VjczogMTUsXG5cdGV4cGlyZV9pbl9zZWNzX3Byb3Bvc2FsOiAyNCAqIDYwICogNjAsXG5cdG5ldHdvcmtzOiB7XG5cdFx0RWRpbmFyOiB7XG5cdFx0XHRjb3JlX2Fzc2V0OiBcIkVEQ1wiLFxuXHRcdFx0YWRkcmVzc19wcmVmaXg6IFwiRURDXCIsXG5cdFx0XHRjaGFpbl9pZDogXCI5NzliMjk5MTJlNTU0NmRiZjQ3NjA0NjkyYWFmYzk0NTE5ZjQ4NmM1NjIyMWE1NzA1ZjBjN2Y1ZjI5NGRmMTI2XCJcblx0XHR9XG5cdH0sXG5cblx0LyoqIFNldCBhIGZldyBwcm9wZXJ0aWVzIGZvciBrbm93biBjaGFpbiBJRHMuICovXG5cdHNldENoYWluSWQ6IGZ1bmN0aW9uIHNldENoYWluSWQoY2hhaW5faWQpIHtcblxuXHRcdHZhciBpLCBsZW4sIG5ldHdvcmssIG5ldHdvcmtfbmFtZSwgcmVmO1xuXHRcdHJlZiA9IE9iamVjdC5rZXlzKF90aGlzLm5ldHdvcmtzKTtcblxuXHRcdGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXG5cdFx0XHRuZXR3b3JrX25hbWUgPSByZWZbaV07XG5cdFx0XHRuZXR3b3JrID0gX3RoaXMubmV0d29ya3NbbmV0d29ya19uYW1lXTtcblxuXHRcdFx0aWYgKG5ldHdvcmsuY2hhaW5faWQgPT09IGNoYWluX2lkKSB7XG5cblx0XHRcdFx0X3RoaXMubmV0d29ya19uYW1lID0gbmV0d29ya19uYW1lO1xuXG5cdFx0XHRcdGlmIChuZXR3b3JrLmFkZHJlc3NfcHJlZml4KSB7XG5cdFx0XHRcdFx0X3RoaXMuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuXHRcdFx0XHRcdGVjY19jb25maWcuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJJTkZPICAgIENvbmZpZ3VyZWQgZm9yXCIsIG5ldHdvcmtfbmFtZSwgXCI6XCIsIG5ldHdvcmsuY29yZV9hc3NldCwgXCJcXG5cIik7XG5cblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRuZXR3b3JrX25hbWU6IG5ldHdvcmtfbmFtZSxcblx0XHRcdFx0XHRuZXR3b3JrOiBuZXR3b3JrXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKCFfdGhpcy5uZXR3b3JrX25hbWUpIHtcblx0XHRcdGNvbnNvbGUubG9nKFwiVW5rbm93biBjaGFpbiBpZCAodGhpcyBtYXkgYmUgYSB0ZXN0bmV0KVwiLCBjaGFpbl9pZCk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcblx0XHRfdGhpcy5jb3JlX2Fzc2V0ID0gXCJFRENcIjtcblx0XHRfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IFwiRURDXCI7XG5cdFx0ZWNjX2NvbmZpZy5hZGRyZXNzX3ByZWZpeCA9IFwiRURDXCI7XG5cdFx0X3RoaXMuZXhwaXJlX2luX3NlY3MgPSAxNTtcblx0XHRfdGhpcy5leHBpcmVfaW5fc2Vjc19wcm9wb3NhbCA9IDI0ICogNjAgKiA2MDtcblxuXHRcdGNvbnNvbGUubG9nKFwiQ2hhaW4gY29uZmlnIHJlc2V0XCIpO1xuXHR9LFxuXG5cdHNldFByZWZpeDogZnVuY3Rpb24gc2V0UHJlZml4KCkge1xuXHRcdHZhciBwcmVmaXggPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IFwiRURDXCI7XG5cblx0XHRfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IHByZWZpeDtcblx0XHRlY2NfY29uZmlnLmFkZHJlc3NfcHJlZml4ID0gcHJlZml4O1xuXHR9XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgV2ViU29ja2V0Q2xpZW50ID0gdm9pZCAwO1xuaWYgKHR5cGVvZiBXZWJTb2NrZXQgPT09IFwidW5kZWZpbmVkXCIgJiYgIXByb2Nlc3MuZW52LmJyb3dzZXIpIHtcblx0V2ViU29ja2V0Q2xpZW50ID0gcmVxdWlyZShcIndzXCIpO1xufSBlbHNlIGlmICh0eXBlb2YgV2ViU29ja2V0ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdFdlYlNvY2tldENsaWVudCA9IHJlcXVpcmUoXCJSZWNvbm5lY3RpbmdXZWJTb2NrZXRcIik7XG59XG5cbnZhciBTT0NLRVRfREVCVUcgPSBmYWxzZTtcblxudmFyIENoYWluV2ViU29ja2V0ID0gZnVuY3Rpb24gKCkge1xuXHRmdW5jdGlvbiBDaGFpbldlYlNvY2tldCh3c19zZXJ2ZXIsIHN0YXR1c0NiKSB7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdF9jbGFzc0NhbGxDaGVjayh0aGlzLCBDaGFpbldlYlNvY2tldCk7XG5cblx0XHR0aGlzLnN0YXR1c0NiID0gc3RhdHVzQ2I7XG5cblx0XHR0cnkge1xuXHRcdFx0dGhpcy53cyA9IG5ldyBXZWJTb2NrZXRDbGllbnQod3Nfc2VydmVyKTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0Y29uc29sZS5lcnJvcihcImludmFsaWQgd2Vic29ja2V0IFVSTDpcIiwgZXJyb3IpO1xuXHRcdFx0dGhpcy53cyA9IG5ldyBXZWJTb2NrZXRDbGllbnQoXCJ3c3M6Ly8xMjcuMC4wLjE6ODA4MFwiKTtcblx0XHR9XG5cdFx0dGhpcy53cy50aW1lb3V0SW50ZXJ2YWwgPSA1MDAwO1xuXHRcdHRoaXMuY3VycmVudF9yZWplY3QgPSBudWxsO1xuXHRcdHRoaXMub25fcmVjb25uZWN0ID0gbnVsbDtcblx0XHR0aGlzLmNvbm5lY3RfcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdF90aGlzLmN1cnJlbnRfcmVqZWN0ID0gcmVqZWN0O1xuXHRcdFx0X3RoaXMud3Mub25vcGVuID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwib3BlblwiKTtcblx0XHRcdFx0aWYgKF90aGlzLm9uX3JlY29ubmVjdCkgX3RoaXMub25fcmVjb25uZWN0KCk7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH07XG5cdFx0XHRfdGhpcy53cy5vbmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG5cdFx0XHRcdGlmIChfdGhpcy5zdGF0dXNDYikgX3RoaXMuc3RhdHVzQ2IoXCJlcnJvclwiKTtcblxuXHRcdFx0XHRpZiAoX3RoaXMuY3VycmVudF9yZWplY3QpIHtcblx0XHRcdFx0XHRfdGhpcy5jdXJyZW50X3JlamVjdChlcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRfdGhpcy53cy5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuXHRcdFx0XHRyZXR1cm4gX3RoaXMubGlzdGVuZXIoSlNPTi5wYXJzZShtZXNzYWdlLmRhdGEpKTtcblx0XHRcdH07XG5cdFx0XHRfdGhpcy53cy5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwiY2xvc2VkXCIpO1xuXHRcdFx0fTtcblx0XHR9KTtcblx0XHR0aGlzLmNiSWQgPSAwO1xuXHRcdHRoaXMuY2JzID0ge307XG5cdFx0dGhpcy5zdWJzID0ge307XG5cdFx0dGhpcy51bnN1YiA9IHt9O1xuXHR9XG5cblx0X2NyZWF0ZUNsYXNzKENoYWluV2ViU29ja2V0LCBbe1xuXHRcdGtleTogXCJjYWxsXCIsXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIGNhbGwocGFyYW1zKSB7XG5cdFx0XHR2YXIgX3RoaXMyID0gdGhpcztcblxuXHRcdFx0dmFyIG1ldGhvZCA9IHBhcmFtc1sxXTtcblx0XHRcdGlmIChTT0NLRVRfREVCVUcpIGNvbnNvbGUubG9nKFwiW0NoYWluV2ViU29ja2V0XSA+LS0tLSBjYWxsIC0tLS0tPiAgXFxcImlkXFxcIjpcIiArICh0aGlzLmNiSWQgKyAxKSwgSlNPTi5zdHJpbmdpZnkocGFyYW1zKSk7XG5cblx0XHRcdHRoaXMuY2JJZCArPSAxO1xuXG5cdFx0XHRpZiAobWV0aG9kID09PSBcInNldF9zdWJzY3JpYmVfY2FsbGJhY2tcIiB8fCBtZXRob2QgPT09IFwic3Vic2NyaWJlX3RvX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJicm9hZGNhc3RfdHJhbnNhY3Rpb25fd2l0aF9jYWxsYmFja1wiIHx8IG1ldGhvZCA9PT0gXCJzZXRfcGVuZGluZ190cmFuc2FjdGlvbl9jYWxsYmFja1wiKSB7XG5cdFx0XHRcdC8vIFN0b3JlIGNhbGxiYWNrIGluIHN1YnMgbWFwXG5cdFx0XHRcdHRoaXMuc3Vic1t0aGlzLmNiSWRdID0ge1xuXHRcdFx0XHRcdGNhbGxiYWNrOiBwYXJhbXNbMl1bMF1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHQvLyBSZXBsYWNlIGNhbGxiYWNrIHdpdGggdGhlIGNhbGxiYWNrIGlkXG5cdFx0XHRcdHBhcmFtc1syXVswXSA9IHRoaXMuY2JJZDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX2FjY291bnRzXCIpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBwYXJhbXNbMl1bMF0gIT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkZpcnN0IHBhcmFtZXRlciBvZiB1bnN1YiBtdXN0IGJlIHRoZSBvcmlnaW5hbCBjYWxsYmFja1wiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciB1blN1YkNiID0gcGFyYW1zWzJdLnNwbGljZSgwLCAxKVswXTtcblxuXHRcdFx0XHQvLyBGaW5kIHRoZSBjb3JyZXNwb25kaW5nIHN1YnNjcmlwdGlvblxuXHRcdFx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLnN1YnMpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5zdWJzW2lkXS5jYWxsYmFjayA9PT0gdW5TdWJDYikge1xuXHRcdFx0XHRcdFx0dGhpcy51bnN1Ylt0aGlzLmNiSWRdID0gaWQ7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dmFyIHJlcXVlc3QgPSB7XG5cdFx0XHRcdG1ldGhvZDogXCJjYWxsXCIsXG5cdFx0XHRcdHBhcmFtczogcGFyYW1zXG5cdFx0XHR9O1xuXHRcdFx0cmVxdWVzdC5pZCA9IHRoaXMuY2JJZDtcblxuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdFx0X3RoaXMyLmNic1tfdGhpczIuY2JJZF0gPSB7XG5cdFx0XHRcdFx0dGltZTogbmV3IERhdGUoKSxcblx0XHRcdFx0XHRyZXNvbHZlOiByZXNvbHZlLFxuXHRcdFx0XHRcdHJlamVjdDogcmVqZWN0XG5cdFx0XHRcdH07XG5cdFx0XHRcdF90aGlzMi53cy5vbmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCIhISEgQ2hhaW5XZWJTb2NrZXQgRXJyb3IgXCIsIGVycm9yKTtcblx0XHRcdFx0XHRyZWplY3QoZXJyb3IpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRfdGhpczIud3Muc2VuZChKU09OLnN0cmluZ2lmeShyZXF1ZXN0KSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sIHtcblx0XHRrZXk6IFwibGlzdGVuZXJcIixcblx0XHR2YWx1ZTogZnVuY3Rpb24gbGlzdGVuZXIocmVzcG9uc2UpIHtcblx0XHRcdGlmIChTT0NLRVRfREVCVUcpIGNvbnNvbGUubG9nKFwiW0NoYWluV2ViU29ja2V0XSA8LS0tLSByZXBseSAtLS0tPFwiLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuXG5cdFx0XHR2YXIgc3ViID0gZmFsc2UsXG5cdFx0XHQgICAgY2FsbGJhY2sgPSBudWxsO1xuXG5cdFx0XHRpZiAocmVzcG9uc2UubWV0aG9kID09PSBcIm5vdGljZVwiKSB7XG5cdFx0XHRcdHN1YiA9IHRydWU7XG5cdFx0XHRcdHJlc3BvbnNlLmlkID0gcmVzcG9uc2UucGFyYW1zWzBdO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXN1Yikge1xuXHRcdFx0XHRjYWxsYmFjayA9IHRoaXMuY2JzW3Jlc3BvbnNlLmlkXTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNhbGxiYWNrID0gdGhpcy5zdWJzW3Jlc3BvbnNlLmlkXS5jYWxsYmFjaztcblx0XHRcdH1cblxuXHRcdFx0aWYgKGNhbGxiYWNrICYmICFzdWIpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLmVycm9yKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sucmVqZWN0KHJlc3BvbnNlLmVycm9yKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjay5yZXNvbHZlKHJlc3BvbnNlLnJlc3VsdCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGVsZXRlIHRoaXMuY2JzW3Jlc3BvbnNlLmlkXTtcblxuXHRcdFx0XHRpZiAodGhpcy51bnN1YltyZXNwb25zZS5pZF0pIHtcblx0XHRcdFx0XHRkZWxldGUgdGhpcy5zdWJzW3RoaXMudW5zdWJbcmVzcG9uc2UuaWRdXTtcblx0XHRcdFx0XHRkZWxldGUgdGhpcy51bnN1YltyZXNwb25zZS5pZF07XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoY2FsbGJhY2sgJiYgc3ViKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLnBhcmFtc1sxXSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIldhcm5pbmc6IHVua25vd24gd2Vic29ja2V0IHJlc3BvbnNlOiBcIiwgcmVzcG9uc2UpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSwge1xuXHRcdGtleTogXCJsb2dpblwiLFxuXHRcdHZhbHVlOiBmdW5jdGlvbiBsb2dpbih1c2VyLCBwYXNzd29yZCkge1xuXHRcdFx0dmFyIF90aGlzMyA9IHRoaXM7XG5cblx0XHRcdHJldHVybiB0aGlzLmNvbm5lY3RfcHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIF90aGlzMy5jYWxsKFsxLCBcImxvZ2luXCIsIFt1c2VyLCBwYXNzd29yZF1dKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSwge1xuXHRcdGtleTogXCJjbG9zZVwiLFxuXHRcdHZhbHVlOiBmdW5jdGlvbiBjbG9zZSgpIHtcblx0XHRcdHRoaXMud3MuY2xvc2UoKTtcblx0XHR9XG5cdH1dKTtcblxuXHRyZXR1cm4gQ2hhaW5XZWJTb2NrZXQ7XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhaW5XZWJTb2NrZXQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfY3JlYXRlQ2xhc3MgPSBmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KCk7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBHcmFwaGVuZUFwaSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBHcmFwaGVuZUFwaSh3c19ycGMsIGFwaV9uYW1lKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBHcmFwaGVuZUFwaSk7XG5cbiAgICAgICAgdGhpcy53c19ycGMgPSB3c19ycGM7XG4gICAgICAgIHRoaXMuYXBpX25hbWUgPSBhcGlfbmFtZTtcbiAgICB9XG5cbiAgICBfY3JlYXRlQ2xhc3MoR3JhcGhlbmVBcGksIFt7XG4gICAgICAgIGtleTogXCJpbml0XCIsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud3NfcnBjLmNhbGwoWzEsIHRoaXMuYXBpX25hbWUsIFtdXSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiW0dyYXBoZW5lQXBpLmpzOjExXSAtLS0tLSBHcmFwaGVuZUFwaS5pbml0IC0tLS0tPlwiLCB0aGlzLmFwaV9uYW1lLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgc2VsZi5hcGlfaWQgPSByZXNwb25zZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICBrZXk6IFwiZXhlY1wiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gZXhlYyhtZXRob2QsIHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud3NfcnBjLmNhbGwoW3RoaXMuYXBpX2lkLCBtZXRob2QsIHBhcmFtc10pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiISEhIEdyYXBoZW5lQXBpIGVycm9yOiBcIiwgbWV0aG9kLCBwYXJhbXMsIGVycm9yLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gR3JhcGhlbmVBcGk7XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gR3JhcGhlbmVBcGk7IiwiLy8gTUlUIExpY2Vuc2U6XG4vL1xuLy8gQ29weXJpZ2h0IChjKSAyMDEwLTIwMTIsIEpvZSBXYWxuZXNcbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuXG4vKipcbiAqIFRoaXMgYmVoYXZlcyBsaWtlIGEgV2ViU29ja2V0IGluIGV2ZXJ5IHdheSwgZXhjZXB0IGlmIGl0IGZhaWxzIHRvIGNvbm5lY3QsXG4gKiBvciBpdCBnZXRzIGRpc2Nvbm5lY3RlZCwgaXQgd2lsbCByZXBlYXRlZGx5IHBvbGwgdW50aWwgaXQgc3VjY2Vzc2Z1bGx5IGNvbm5lY3RzXG4gKiBhZ2Fpbi5cbiAqXG4gKiBJdCBpcyBBUEkgY29tcGF0aWJsZSwgc28gd2hlbiB5b3UgaGF2ZTpcbiAqICAgd3MgPSBuZXcgV2ViU29ja2V0KCd3czovLy4uLi4nKTtcbiAqIHlvdSBjYW4gcmVwbGFjZSB3aXRoOlxuICogICB3cyA9IG5ldyBSZWNvbm5lY3RpbmdXZWJTb2NrZXQoJ3dzOi8vLi4uLicpO1xuICpcbiAqIFRoZSBldmVudCBzdHJlYW0gd2lsbCB0eXBpY2FsbHkgbG9vayBsaWtlOlxuICogIG9uY29ubmVjdGluZ1xuICogIG9ub3BlblxuICogIG9ubWVzc2FnZVxuICogIG9ubWVzc2FnZVxuICogIG9uY2xvc2UgLy8gbG9zdCBjb25uZWN0aW9uXG4gKiAgb25jb25uZWN0aW5nXG4gKiAgb25vcGVuICAvLyBzb21ldGltZSBsYXRlci4uLlxuICogIG9ubWVzc2FnZVxuICogIG9ubWVzc2FnZVxuICogIGV0Yy4uLlxuICpcbiAqIEl0IGlzIEFQSSBjb21wYXRpYmxlIHdpdGggdGhlIHN0YW5kYXJkIFdlYlNvY2tldCBBUEksIGFwYXJ0IGZyb20gdGhlIGZvbGxvd2luZyBtZW1iZXJzOlxuICpcbiAqIC0gYGJ1ZmZlcmVkQW1vdW50YFxuICogLSBgZXh0ZW5zaW9uc2BcbiAqIC0gYGJpbmFyeVR5cGVgXG4gKlxuICogTGF0ZXN0IHZlcnNpb246IGh0dHBzOi8vZ2l0aHViLmNvbS9qb2V3YWxuZXMvcmVjb25uZWN0aW5nLXdlYnNvY2tldC9cbiAqIC0gSm9lIFdhbG5lc1xuICpcbiAqIFN5bnRheFxuICogPT09PT09XG4gKiB2YXIgc29ja2V0ID0gbmV3IFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwsIHByb3RvY29scywgb3B0aW9ucyk7XG4gKlxuICogUGFyYW1ldGVyc1xuICogPT09PT09PT09PVxuICogdXJsIC0gVGhlIHVybCB5b3UgYXJlIGNvbm5lY3RpbmcgdG8uXG4gKiBwcm90b2NvbHMgLSBPcHRpb25hbCBzdHJpbmcgb3IgYXJyYXkgb2YgcHJvdG9jb2xzLlxuICogb3B0aW9ucyAtIFNlZSBiZWxvd1xuICpcbiAqIE9wdGlvbnNcbiAqID09PT09PT1cbiAqIE9wdGlvbnMgY2FuIGVpdGhlciBiZSBwYXNzZWQgdXBvbiBpbnN0YW50aWF0aW9uIG9yIHNldCBhZnRlciBpbnN0YW50aWF0aW9uOlxuICpcbiAqIHZhciBzb2NrZXQgPSBuZXcgUmVjb25uZWN0aW5nV2ViU29ja2V0KHVybCwgbnVsbCwgeyBkZWJ1ZzogdHJ1ZSwgcmVjb25uZWN0SW50ZXJ2YWw6IDQwMDAgfSk7XG4gKlxuICogb3JcbiAqXG4gKiB2YXIgc29ja2V0ID0gbmV3IFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwpO1xuICogc29ja2V0LmRlYnVnID0gdHJ1ZTtcbiAqIHNvY2tldC5yZWNvbm5lY3RJbnRlcnZhbCA9IDQwMDA7XG4gKlxuICogZGVidWdcbiAqIC0gV2hldGhlciB0aGlzIGluc3RhbmNlIHNob3VsZCBsb2cgZGVidWcgbWVzc2FnZXMuIEFjY2VwdHMgdHJ1ZSBvciBmYWxzZS4gRGVmYXVsdDogZmFsc2UuXG4gKlxuICogYXV0b21hdGljT3BlblxuICogLSBXaGV0aGVyIG9yIG5vdCB0aGUgd2Vic29ja2V0IHNob3VsZCBhdHRlbXB0IHRvIGNvbm5lY3QgaW1tZWRpYXRlbHkgdXBvbiBpbnN0YW50aWF0aW9uLiBUaGUgc29ja2V0IGNhbiBiZSBtYW51YWxseSBvcGVuZWQgb3IgY2xvc2VkIGF0IGFueSB0aW1lIHVzaW5nIHdzLm9wZW4oKSBhbmQgd3MuY2xvc2UoKS5cbiAqXG4gKiByZWNvbm5lY3RJbnRlcnZhbFxuICogLSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBiZWZvcmUgYXR0ZW1wdGluZyB0byByZWNvbm5lY3QuIEFjY2VwdHMgaW50ZWdlci4gRGVmYXVsdDogMTAwMC5cbiAqXG4gKiBtYXhSZWNvbm5lY3RJbnRlcnZhbFxuICogLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5IGEgcmVjb25uZWN0aW9uIGF0dGVtcHQuIEFjY2VwdHMgaW50ZWdlci4gRGVmYXVsdDogMzAwMDAuXG4gKlxuICogcmVjb25uZWN0RGVjYXlcbiAqIC0gVGhlIHJhdGUgb2YgaW5jcmVhc2Ugb2YgdGhlIHJlY29ubmVjdCBkZWxheS4gQWxsb3dzIHJlY29ubmVjdCBhdHRlbXB0cyB0byBiYWNrIG9mZiB3aGVuIHByb2JsZW1zIHBlcnNpc3QuIEFjY2VwdHMgaW50ZWdlciBvciBmbG9hdC4gRGVmYXVsdDogMS41LlxuICpcbiAqIHRpbWVvdXRJbnRlcnZhbFxuICogLSBUaGUgbWF4aW11bSB0aW1lIGluIG1pbGxpc2Vjb25kcyB0byB3YWl0IGZvciBhIGNvbm5lY3Rpb24gdG8gc3VjY2VlZCBiZWZvcmUgY2xvc2luZyBhbmQgcmV0cnlpbmcuIEFjY2VwdHMgaW50ZWdlci4gRGVmYXVsdDogMjAwMC5cbiAqXG4gKi9cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpe1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBnbG9iYWwuUmVjb25uZWN0aW5nV2ViU29ja2V0ID0gZmFjdG9yeSgpO1xuICAgIH1cbn0pKHRoaXMsIGZ1bmN0aW9uICgpIHtcblxuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSBcInVuZGVmaW5lZFwiIHx8ICEoJ1dlYlNvY2tldCcgaW4gd2luZG93KSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gUmVjb25uZWN0aW5nV2ViU29ja2V0KHVybCwgcHJvdG9jb2xzLCBvcHRpb25zKSB7XG5cbiAgICAgICAgLy8gRGVmYXVsdCBzZXR0aW5nc1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSB7XG5cbiAgICAgICAgICAgIC8qKiBXaGV0aGVyIHRoaXMgaW5zdGFuY2Ugc2hvdWxkIGxvZyBkZWJ1ZyBtZXNzYWdlcy4gKi9cbiAgICAgICAgICAgIGRlYnVnOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqIFdoZXRoZXIgb3Igbm90IHRoZSB3ZWJzb2NrZXQgc2hvdWxkIGF0dGVtcHQgdG8gY29ubmVjdCBpbW1lZGlhdGVseSB1cG9uIGluc3RhbnRpYXRpb24uICovXG4gICAgICAgICAgICBhdXRvbWF0aWNPcGVuOiB0cnVlLFxuXG4gICAgICAgICAgICAvKiogVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkgYmVmb3JlIGF0dGVtcHRpbmcgdG8gcmVjb25uZWN0LiAqL1xuICAgICAgICAgICAgcmVjb25uZWN0SW50ZXJ2YWw6IDEwMDAsXG4gICAgICAgICAgICAvKiogVGhlIG1heGltdW0gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBhIHJlY29ubmVjdGlvbiBhdHRlbXB0LiAqL1xuICAgICAgICAgICAgbWF4UmVjb25uZWN0SW50ZXJ2YWw6IDMwMDAwLFxuICAgICAgICAgICAgLyoqIFRoZSByYXRlIG9mIGluY3JlYXNlIG9mIHRoZSByZWNvbm5lY3QgZGVsYXkuIEFsbG93cyByZWNvbm5lY3QgYXR0ZW1wdHMgdG8gYmFjayBvZmYgd2hlbiBwcm9ibGVtcyBwZXJzaXN0LiAqL1xuICAgICAgICAgICAgcmVjb25uZWN0RGVjYXk6IDEuNSxcblxuICAgICAgICAgICAgLyoqIFRoZSBtYXhpbXVtIHRpbWUgaW4gbWlsbGlzZWNvbmRzIHRvIHdhaXQgZm9yIGEgY29ubmVjdGlvbiB0byBzdWNjZWVkIGJlZm9yZSBjbG9zaW5nIGFuZCByZXRyeWluZy4gKi9cbiAgICAgICAgICAgIHRpbWVvdXRJbnRlcnZhbDogMjAwMCxcblxuICAgICAgICAgICAgLyoqIFRoZSBtYXhpbXVtIG51bWJlciBvZiByZWNvbm5lY3Rpb24gYXR0ZW1wdHMgdG8gbWFrZS4gVW5saW1pdGVkIGlmIG51bGwuICovXG4gICAgICAgICAgICBtYXhSZWNvbm5lY3RBdHRlbXB0czogbnVsbCxcblxuICAgICAgICAgICAgLyoqIFRoZSBiaW5hcnkgdHlwZSwgcG9zc2libGUgdmFsdWVzICdibG9iJyBvciAnYXJyYXlidWZmZXInLCBkZWZhdWx0ICdibG9iJy4gKi9cbiAgICAgICAgICAgIGJpbmFyeVR5cGU6ICdibG9iJ1xuICAgICAgICB9XG4gICAgICAgIGlmICghb3B0aW9ucykgeyBvcHRpb25zID0ge307IH1cblxuICAgICAgICAvLyBPdmVyd3JpdGUgYW5kIGRlZmluZSBzZXR0aW5ncyB3aXRoIG9wdGlvbnMgaWYgdGhleSBleGlzdC5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNldHRpbmdzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnNba2V5XSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IHNldHRpbmdzW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGVzZSBzaG91bGQgYmUgdHJlYXRlZCBhcyByZWFkLW9ubHkgcHJvcGVydGllc1xuXG4gICAgICAgIC8qKiBUaGUgVVJMIGFzIHJlc29sdmVkIGJ5IHRoZSBjb25zdHJ1Y3Rvci4gVGhpcyBpcyBhbHdheXMgYW4gYWJzb2x1dGUgVVJMLiBSZWFkIG9ubHkuICovXG4gICAgICAgIHRoaXMudXJsID0gdXJsO1xuXG4gICAgICAgIC8qKiBUaGUgbnVtYmVyIG9mIGF0dGVtcHRlZCByZWNvbm5lY3RzIHNpbmNlIHN0YXJ0aW5nLCBvciB0aGUgbGFzdCBzdWNjZXNzZnVsIGNvbm5lY3Rpb24uIFJlYWQgb25seS4gKi9cbiAgICAgICAgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyA9IDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBjb25uZWN0aW9uLlxuICAgICAgICAgKiBDYW4gYmUgb25lIG9mOiBXZWJTb2NrZXQuQ09OTkVDVElORywgV2ViU29ja2V0Lk9QRU4sIFdlYlNvY2tldC5DTE9TSU5HLCBXZWJTb2NrZXQuQ0xPU0VEXG4gICAgICAgICAqIFJlYWQgb25seS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5DT05ORUNUSU5HO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBIHN0cmluZyBpbmRpY2F0aW5nIHRoZSBuYW1lIG9mIHRoZSBzdWItcHJvdG9jb2wgdGhlIHNlcnZlciBzZWxlY3RlZDsgdGhpcyB3aWxsIGJlIG9uZSBvZlxuICAgICAgICAgKiB0aGUgc3RyaW5ncyBzcGVjaWZpZWQgaW4gdGhlIHByb3RvY29scyBwYXJhbWV0ZXIgd2hlbiBjcmVhdGluZyB0aGUgV2ViU29ja2V0IG9iamVjdC5cbiAgICAgICAgICogUmVhZCBvbmx5LlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5wcm90b2NvbCA9IG51bGw7XG5cbiAgICAgICAgLy8gUHJpdmF0ZSBzdGF0ZSB2YXJpYWJsZXNcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciB3cztcbiAgICAgICAgdmFyIGZvcmNlZENsb3NlID0gZmFsc2U7XG4gICAgICAgIHZhciB0aW1lZE91dCA9IGZhbHNlO1xuICAgICAgICB2YXIgdCA9IG51bGw7XG4gICAgICAgIHZhciBldmVudFRhcmdldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgIC8vIFdpcmUgdXAgXCJvbipcIiBwcm9wZXJ0aWVzIGFzIGV2ZW50IGhhbmRsZXJzXG5cbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignb3BlbicsICAgICAgIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25vcGVuKGV2ZW50KTsgfSk7XG4gICAgICAgIGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgICAgICBmdW5jdGlvbihldmVudCkgeyBzZWxmLm9uY2xvc2UoZXZlbnQpOyB9KTtcbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGluZycsIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25jb25uZWN0aW5nKGV2ZW50KTsgfSk7XG4gICAgICAgIGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAgICBmdW5jdGlvbihldmVudCkgeyBzZWxmLm9ubWVzc2FnZShldmVudCk7IH0pO1xuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsICAgICAgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbmVycm9yKGV2ZW50KTsgfSk7XG5cbiAgICAgICAgLy8gRXhwb3NlIHRoZSBBUEkgcmVxdWlyZWQgYnkgRXZlbnRUYXJnZXRcblxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgPSBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyLmJpbmQoZXZlbnRUYXJnZXQpO1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBldmVudFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyLmJpbmQoZXZlbnRUYXJnZXQpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQgPSBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50LmJpbmQoZXZlbnRUYXJnZXQpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGlzIGZ1bmN0aW9uIGdlbmVyYXRlcyBhbiBldmVudCB0aGF0IGlzIGNvbXBhdGlibGUgd2l0aCBzdGFuZGFyZFxuICAgICAgICAgKiBjb21wbGlhbnQgYnJvd3NlcnMgYW5kIElFOSAtIElFMTFcbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyB3aWxsIHByZXZlbnQgdGhlIGVycm9yOlxuICAgICAgICAgKiBPYmplY3QgZG9lc24ndCBzdXBwb3J0IHRoaXMgYWN0aW9uXG4gICAgICAgICAqXG4gICAgICAgICAqIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTkzNDUzOTIvd2h5LWFyZW50LW15LXBhcmFtZXRlcnMtZ2V0dGluZy1wYXNzZWQtdGhyb3VnaC10by1hLWRpc3BhdGNoZWQtZXZlbnQvMTkzNDU1NjMjMTkzNDU1NjNcbiAgICAgICAgICogQHBhcmFtIHMgU3RyaW5nIFRoZSBuYW1lIHRoYXQgdGhlIGV2ZW50IHNob3VsZCB1c2VcbiAgICAgICAgICogQHBhcmFtIGFyZ3MgT2JqZWN0IGFuIG9wdGlvbmFsIG9iamVjdCB0aGF0IHRoZSBldmVudCB3aWxsIHVzZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZ2VuZXJhdGVFdmVudChzLCBhcmdzKSB7XG4gICAgICAgIFx0dmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiQ3VzdG9tRXZlbnRcIik7XG4gICAgICAgIFx0ZXZ0LmluaXRDdXN0b21FdmVudChzLCBmYWxzZSwgZmFsc2UsIGFyZ3MpO1xuICAgICAgICBcdHJldHVybiBldnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vcGVuID0gZnVuY3Rpb24gKHJlY29ubmVjdEF0dGVtcHQpIHtcbiAgICAgICAgICAgIHdzID0gbmV3IFdlYlNvY2tldChzZWxmLnVybCwgcHJvdG9jb2xzIHx8IFtdKTtcbiAgICAgICAgICAgIHdzLmJpbmFyeVR5cGUgPSB0aGlzLmJpbmFyeVR5cGU7XG5cbiAgICAgICAgICAgIGlmIChyZWNvbm5lY3RBdHRlbXB0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubWF4UmVjb25uZWN0QXR0ZW1wdHMgJiYgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyA+IHRoaXMubWF4UmVjb25uZWN0QXR0ZW1wdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChnZW5lcmF0ZUV2ZW50KCdjb25uZWN0aW5nJykpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnYXR0ZW1wdC1jb25uZWN0Jywgc2VsZi51cmwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbG9jYWxXcyA9IHdzO1xuICAgICAgICAgICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnY29ubmVjdGlvbi10aW1lb3V0Jywgc2VsZi51cmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aW1lZE91dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgbG9jYWxXcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gZmFsc2U7XG4gICAgICAgICAgICB9LCBzZWxmLnRpbWVvdXRJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgIHdzLm9ub3BlbiA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnb25vcGVuJywgc2VsZi51cmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLnByb3RvY29sID0gd3MucHJvdG9jb2w7XG4gICAgICAgICAgICAgICAgc2VsZi5yZWFkeVN0YXRlID0gV2ViU29ja2V0Lk9QRU47XG4gICAgICAgICAgICAgICAgc2VsZi5yZWNvbm5lY3RBdHRlbXB0cyA9IDA7XG4gICAgICAgICAgICAgICAgdmFyIGUgPSBnZW5lcmF0ZUV2ZW50KCdvcGVuJyk7XG4gICAgICAgICAgICAgICAgZS5pc1JlY29ubmVjdCA9IHJlY29ubmVjdEF0dGVtcHQ7XG4gICAgICAgICAgICAgICAgcmVjb25uZWN0QXR0ZW1wdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB3cy5vbmNsb3NlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgd3MgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChmb3JjZWRDbG9zZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ0xPU0VEO1xuICAgICAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGdlbmVyYXRlRXZlbnQoJ2Nsb3NlJykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5DT05ORUNUSU5HO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZSA9IGdlbmVyYXRlRXZlbnQoJ2Nvbm5lY3RpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgZS5jb2RlID0gZXZlbnQuY29kZTtcbiAgICAgICAgICAgICAgICAgICAgZS5yZWFzb24gPSBldmVudC5yZWFzb247XG4gICAgICAgICAgICAgICAgICAgIGUud2FzQ2xlYW4gPSBldmVudC53YXNDbGVhbjtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvbm5lY3RBdHRlbXB0ICYmICF0aW1lZE91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ29uY2xvc2UnLCBzZWxmLnVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGdlbmVyYXRlRXZlbnQoJ2Nsb3NlJykpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVvdXQgPSBzZWxmLnJlY29ubmVjdEludGVydmFsICogTWF0aC5wb3coc2VsZi5yZWNvbm5lY3REZWNheSwgc2VsZi5yZWNvbm5lY3RBdHRlbXB0cyk7XG4gICAgICAgICAgICAgICAgICAgIHQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWNvbm5lY3RBdHRlbXB0cysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5vcGVuKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9LCB0aW1lb3V0ID4gc2VsZi5tYXhSZWNvbm5lY3RJbnRlcnZhbCA/IHNlbGYubWF4UmVjb25uZWN0SW50ZXJ2YWwgOiB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd3Mub25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ29ubWVzc2FnZScsIHNlbGYudXJsLCBldmVudC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGUgPSBnZW5lcmF0ZUV2ZW50KCdtZXNzYWdlJyk7XG4gICAgICAgICAgICAgICAgZS5kYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdzLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnb25lcnJvcicsIHNlbGYudXJsLCBldmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZ2VuZXJhdGVFdmVudCgnZXJyb3InKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2hldGhlciBvciBub3QgdG8gY3JlYXRlIGEgd2Vic29ja2V0IHVwb24gaW5zdGFudGlhdGlvblxuICAgICAgICBpZiAodGhpcy5hdXRvbWF0aWNPcGVuID09IHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMub3BlbihmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogVHJhbnNtaXRzIGRhdGEgdG8gdGhlIHNlcnZlciBvdmVyIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGRhdGEgYSB0ZXh0IHN0cmluZywgQXJyYXlCdWZmZXIgb3IgQmxvYiB0byBzZW5kIHRvIHRoZSBzZXJ2ZXIuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNlbmQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAod3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ3NlbmQnLCBzZWxmLnVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB3cy5zZW5kKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnSU5WQUxJRF9TVEFURV9FUlIgOiBQYXVzaW5nIHRvIHJlY29ubmVjdCB3ZWJzb2NrZXQnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbG9zZXMgdGhlIFdlYlNvY2tldCBjb25uZWN0aW9uIG9yIGNvbm5lY3Rpb24gYXR0ZW1wdCwgaWYgYW55LlxuICAgICAgICAgKiBJZiB0aGUgY29ubmVjdGlvbiBpcyBhbHJlYWR5IENMT1NFRCwgdGhpcyBtZXRob2QgZG9lcyBub3RoaW5nLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKGNvZGUsIHJlYXNvbikge1xuICAgICAgICAgICAgLy8gRGVmYXVsdCBDTE9TRV9OT1JNQUwgY29kZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb2RlID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29kZSA9IDEwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3JjZWRDbG9zZSA9IHRydWU7XG4gICAgICAgICAgICBpZiAod3MpIHtcbiAgICAgICAgICAgICAgICB3cy5jbG9zZShjb2RlLCByZWFzb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodCk7XG4gICAgICAgICAgICAgICAgdCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZGl0aW9uYWwgcHVibGljIEFQSSBtZXRob2QgdG8gcmVmcmVzaCB0aGUgY29ubmVjdGlvbiBpZiBzdGlsbCBvcGVuIChjbG9zZSwgcmUtb3BlbikuXG4gICAgICAgICAqIEZvciBleGFtcGxlLCBpZiB0aGUgYXBwIHN1c3BlY3RzIGJhZCBkYXRhIC8gbWlzc2VkIGhlYXJ0IGJlYXRzLCBpdCBjYW4gdHJ5IHRvIHJlZnJlc2guXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlZnJlc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh3cykge1xuICAgICAgICAgICAgICAgIHdzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gdGhlIFdlYlNvY2tldCBjb25uZWN0aW9uJ3MgcmVhZHlTdGF0ZSBjaGFuZ2VzIHRvIE9QRU47XG4gICAgICogdGhpcyBpbmRpY2F0ZXMgdGhhdCB0aGUgY29ubmVjdGlvbiBpcyByZWFkeSB0byBzZW5kIGFuZCByZWNlaXZlIGRhdGEuXG4gICAgICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbm9wZW4gPSBmdW5jdGlvbihldmVudCkge307XG4gICAgLyoqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbidzIHJlYWR5U3RhdGUgY2hhbmdlcyB0byBDTE9TRUQuICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbmNsb3NlID0gZnVuY3Rpb24oZXZlbnQpIHt9O1xuICAgIC8qKiBBbiBldmVudCBsaXN0ZW5lciB0byBiZSBjYWxsZWQgd2hlbiBhIGNvbm5lY3Rpb24gYmVnaW5zIGJlaW5nIGF0dGVtcHRlZC4gKi9cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQucHJvdG90eXBlLm9uY29ubmVjdGluZyA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcbiAgICAvKiogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gYSBtZXNzYWdlIGlzIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gKi9cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQucHJvdG90eXBlLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcbiAgICAvKiogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gYW4gZXJyb3Igb2NjdXJzLiAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgYWxsIGluc3RhbmNlcyBvZiBSZWNvbm5lY3RpbmdXZWJTb2NrZXQgc2hvdWxkIGxvZyBkZWJ1ZyBtZXNzYWdlcy5cbiAgICAgKiBTZXR0aW5nIHRoaXMgdG8gdHJ1ZSBpcyB0aGUgZXF1aXZhbGVudCBvZiBzZXR0aW5nIGFsbCBpbnN0YW5jZXMgb2YgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnIHRvIHRydWUuXG4gICAgICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsID0gZmFsc2U7XG5cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuQ09OTkVDVElORyA9IFdlYlNvY2tldC5DT05ORUNUSU5HO1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5PUEVOID0gV2ViU29ja2V0Lk9QRU47XG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LkNMT1NJTkcgPSBXZWJTb2NrZXQuQ0xPU0lORztcbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuQ0xPU0VEID0gV2ViU29ja2V0LkNMT1NFRDtcblxuICAgIHJldHVybiBSZWNvbm5lY3RpbmdXZWJTb2NrZXQ7XG59KTtcbiIsIiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
