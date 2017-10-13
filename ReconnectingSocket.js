'use strict';
const WebSocket = require('ws');


function WebSocketClient(){
    this.autoReconnectInterval = 1000;    // ms
    this.logConnection = true;
}
WebSocketClient.prototype.open = function(url){
    this.url = url;
	
    this.instance = new WebSocket(this.url);
	
    this.instance.on('open', (function() {
        this.log("Connected.");
        this.onopen();
    }).bind(this));
	
    this.instance.on('message', (function(data, flags) {
        this.onmessage(data,flags);
    }).bind(this));
	
    this.instance.on('close', (function(code) {
        let reconnecting = false;

        switch (code){
        case 1000:  // CLOSE_NORMAL
            //console.log("WebSocketClient on close: Closed");
            break;
        case 1011:  // UNEXPECTED_CONDITION
            this.logError("Closing Websocket")
            break;
        default:    // Abnormal closure
            this.logError('Websocket closed.');
            reconnecting = true;
            break;
        }
        this.onclose(code);
        if (reconnecting) {
            this.reconnect(code);
        } else {
            this.onend(code);
        }
    }).bind(this));
    this.instance.on('error', (function(e) {
        if (e.code) {
            this.logError("Error on connection.", e.message);
        }
        switch (e.code){
        case 'ECONNREFUSED':
            break;
        default:
            this.onerror(e);
            break;
        }
    }).bind(this));
	
    this.instance.on('unexpected-response', (function(request, response) {
        // Parse body
        let buf = '';
        response.on('data', function(data) { buf += data; });
        response.on('end', (function () {
            if (response.statusCode === 401) {
                this.logError('Authentication invalid. Please check your credentials. Message: '+buf);
            } else {
                this.logError('Unexpected response from server ['+response.statusCode+']: '+buf);
            }
            this.log('The WebSocket will terminate. Please manually reconnect.');
            request.abort();
            this.instance.close(1011);
            this.instance.emit('close', 1011);
        }).bind(this))

    }).bind(this))
};

// Forward eventemitter methods
['on', 'off', 'once', 'addListener', 'removeListener', 'emit', 'close'].forEach(function(key) {
    WebSocketClient.prototype[key] = function() {
        this.instance[key].apply(this.instance, arguments);
    };
});

WebSocketClient.prototype.log = function() {
    if (!this.logConnection) return;
    const args = [].slice.call(arguments);
    console.log.apply(console, ['WebSocket [INFO]:'].concat(args));
}

WebSocketClient.prototype.logError = function() {
    const args = [].slice.call(arguments);
    console.error.apply(console, ['WebSocket [ERROR]:'].concat(args));
}

WebSocketClient.prototype.send = function(data, option) {
    try{
        //console.log(data);
        this.instance.send(data, option);
    } catch (e){
        this.instance.emit('error',e);
    }
};

WebSocketClient.prototype.reconnect = function(_code) {
    this.emit('reconnect');
    this.log('Retry in ' + this.autoReconnectInterval + ' ms');
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout( (function() {
        this.instance.close(1000, 'Reconnecting.');
        this.log("Reconnecting...");
        this.open(this.url);
    }).bind(this), this.autoReconnectInterval);
};


WebSocketClient.prototype.reconnect_now = function(_code) {
		this.emit('reconnect');
     
        this.instance.close(1000, 'Reconnecting.');
        this.log("Reconnecting...");
        this.open(this.url);
     
};

module.exports = WebSocketClient;

