# bitfinexws1
bitfinex websocket, v1 , a better , self reconnecting, parsing all responses.

this websocket handels reconnection, and heartbeat, parses and handles all events, 
allows authentication. parses all messages into objects,

you use send method to subscribe to chnnels as described in the bitfinex api v1 manual, 

and this library handles and parses the response, on events you specified it returnes the parsed responses in easy to use objects.


i did my best to parse all messages.

donate bitcoins to: 1QJybGtq3wA3vz8izWvDMRTsrQL3RVDK9T


## BitfinexWS1(API_KEY,API_SECRET,channels_and_events,subscribe,parsers)

this is a factory method it returns an object with some access to settings and other things. one useful thing is the status of it `bitfinexws.ready (bool)`

to use without authentication put "" in API_KEY and in API_SECRET.

the main channel (0) called account.

the event names are as described in the documentation

the api described at https://docs.bitfinex.com/v1/reference

look at the parsers to know the names of the parameters or just try it...


```javascript

// example:

var BitfinexWS1=require('bitfinexws1');
var bitfinexws=BitfinexWS1('PUT_KEY_HERE','PUT_SECRET_HERE',
{
	account:
	{
	 pn : function(a){ console.log("account pn",a)},
	 pu : function(a){ console.log("account pu",a)},
	 pc : function(a){ console.log("account pc",a)},
	 ps : function(a){ console.log("account ps",a)},
	 wu : function(a){ console.log("account wu",a)},
	 ws : function(a){ console.log("account ws",a)},
	 on : function(a){ console.log("account on",a)},
	 ou : function(a){ console.log("account ou",a)},
	 oc : function(a){ console.log("account oc",a)},
	 os : function(a){ console.log("account os",a)},
	 ts : function(a){ console.log("account ts",a)},
	 te : function(a){ console.log("account te",a)},
	 tu : function(a){ console.log("account tu",a)},
	 hb : function(a){ console.log("account hb",a)}
    },
	book:
	{
	 BTCUSD:
	 {
		 snapshot : function(a){ console.log("book BTCUSD snapshot",a)},
		 update   : function(a){ console.log("book BTCUSD update",a)},
	     hb       : function(a){ console.log("book BTCUSD hb",a)}
	 }	
	},
	bookR0:
	{
	 BTCUSD:
	 {
		 snapshot : function(a){ console.log("bookR0 BTCUSD snapshot",a)},
		 update   : function(a){ console.log("bookR0 BTCUSD update",a)},
	     hb       : function(a){ console.log("bookR0 BTCUSD hb",a)}
	 }	
	},
	bookP3F2:
	{
	 BTCUSD:
	 {
		 snapshot : function(a){ console.log("bookP3F2 BTCUSD snapshot",a)},
		 update   : function(a){ console.log("bookP3F2 BTCUSD update",a)},
	     hb       : function(a){ console.log("bookP3F2 BTCUSD hb",a)}
	 }	
	},
	trades:
	{
	 BTCUSD:
	 {
		 snapshot : function(a){ console.log("trades BTCUSD snapshot",a)},
		 te       : function(a){ console.log("trades BTCUSD te",a)},
		 tu       : function(a){ console.log("trades BTCUSD tu",a)},
	     hb       : function(a){ console.log("trades BTCUSD hb",a)}
	 }	
	},
	ticker:
	{
	 BTCUSD:
	 {
		 update  : function(a){ console.log("ticker BTCUSD update",a)},
	     hb      : function(a){ console.log("ticker BTCUSD hb",a)}
	 }	
	},
	onpong   : function(){ console.log("onpong")},
	onready  : function(){ console.log("onready")},
	onauth   : function(){ console.log("onauth")},
	onunauth : function(){ console.log("onunauth")},
	onerror  : function(e){console.log('BitfinexWS1 error', e.stack)}
},
function subscribe(send) // need to be specified because on self reconnect, happens and channels need to be resubscribed;
{
	send({ "event":"subscribe", "channel":"ticker", "pair":"tBTCUSD"});
	send({ "event":"subscribe", "channel":"trades", "pair":"tBTCUSD"});
	send({ "event":"subscribe", "channel":"book",   "pair":"tBTCUSD", "prec":"P3", "freq":"F1" });
	send({ "event":"subscribe", "channel":"book",   "pair":"tBTCUSD", "prec":"P3", "freq":"F2" });
	send({ "event":"subscribe", "channel":"book",   "pair":"tBTCUSD", "prec":"R0" });
},
 BitfinexWS1.better_parsers // (optional argument, parsers to replace ) my prefered set of parsers, little different from the docs, you can define your own if you like different configuration. without this, it matches the official docs. the difference from the docs is not an issue. rather good.
);

```


idea: 

is possible to inherit from BitfinexWS1.better_parsers to modify just a part of it:  

```javascript
var myparsers={
 book_snapshot: BitfinexWS1.parsers.no_parse
};
myparsers.__proto__=BitfinexWS1.better_parsers;
```


## parser

update parser receives an array of arguments.

snapshot parser  recevies the array of objects.
 


is possible to put reference to your parsers methods
like i did, i made with better parsers

in the examplpe it uses all the parses i like 
it is defined here: (look for line ' module.exports.better_parsers={  ' )
https://github.com/shimondoodkin/bitfinexws1/blob/master/index.js#L1123 


to see all the parsers look in the code
each function parser function is defined here: (look for line ' ///parsers  ' )
https://github.com/shimondoodkin/bitfinexws1/blob/master/index.js#L508



