'use strict';
/*

// oneliner for testing //n=function(){};p=function(a){console.log(a)}; var api=require('./bitfinexws1.js')('PUT_KEY_HERE','PUT_SECRET_HERE',{account:{hb:n,os:p,ws:p,ps:p}})
 
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
	send({ "event":"subscribe", "channel":"book", "pair":"tBTCUSD", "prec":"P3", "freq":"F1" });
},
 BitfinexWS1.better_parsers // (optional) my prefered set of parsers, little different from the docs, you can define your own if you like different configuration.            without this, it mutches the official docs.  , the difference from the docs is not an issue. rather good.
);


// to modify better parsers it is possible to use like, below to inherit from better parsers:  
// myparsers={
//	book_snapshot: BitfinexWS1.parsers.book_snapshot_no_parse
// };
// myparsers.__proto__=BitfinexWS1.better_parsers

// you can put reference to your parsers methods here 
// event parser receives an array of arguments. snapshot recevies the array of objects.
// 
//

)




*/


const WebSocketClient = require('./ReconnectingSocket');
const crypto = require('crypto');



function BitfinexWS1(API_KEY,API_SECRET,channels,subscribe,parsers)
{
  'use strict';

  if(!parsers)parsers={}; 
  // Create client and bind listeners.

  const  wsClient = new WebSocketClient();

  function send(data) {
	  console.log("WebSocketClient send - sending data",data)
	  wsClient.send(JSON.stringify(data));
  }

  var bitfinexws={ paused:false, ready:false, send: send, last_hb:Date.now(), channels: (channels||{}) };
  bitfinexws.subscribe=subscribe||function(){};


  
  var chan_id={ };
  var chan_name= bitfinexws.channels||{}; bitfinexws.channels=chan_name;

    
  var onpong  = bitfinexws.channels.onpong   || function(){};
  var onready = bitfinexws.channels.onready  || function(){};
  var onauth  = bitfinexws.channels.onauth   || function(){};
  var onunauth= bitfinexws.channels.onunauth || function(){};
  var onerror = bitfinexws.channels.onerror  || function(e) {console.log('BitfinexWS1 error', e.stack);}

  
  var channel_account=chan_name.account||{};
  channel_account.chanId=0;
  channel_account.name='account';  
  chan_id[channel_account.chanId]=channel_account;
  chan_name[channel_account.name]=channel_account;

  function authparams(){
	const authNonce = Date.now() * 1000;
    const authPayload = 'AUTH'+authNonce;
    const authSig = crypto
      .createHmac('sha384', API_SECRET)
      .update(authPayload)
      .digest('hex');
    return {
      apiKey: API_KEY,
      authSig,
      authNonce,
      authPayload,
      event: 'auth'
    };
  }


  function resubscribe()
  {
	  //unsubscribe all.
	  bitfinexws.channels.forEach(function(a){
		  if(a.chanId)  //should skip 0 channel and unsubscribed channels
			  send({ "event"  : "unsubscribe", "chanId" : a.chanId });
	  });
	  bitfinexws.subscribe.call(bitfinexws,send);
  }

  wsClient.onopen = function() {
		wsClient.opened = true;
		if(!bitfinexws.ready)onready(true);
		bitfinexws.ready=true;
		console.log('Connection to', wsClient.url, 'opened.');

		if(API_KEY&&API_SECRET)
			send(authparams());
		else
			bitfinexws.subscribe.call(bitfinexws,send);

		var hb_timeout=60*1000;
		bitfinexws.hbtimer=setInterval( function(){
			if(  bitfinexws.last_hb  <  ( Date.now() - hb_timeout ) )
			{
				bitfinexws.last_hb  =  Date.now();
				if(bitfinexws.ready)onready(false);
				bitfinexws.ready=false;
				console.log('strategy: no hearbeat ');
			}
		});

  };

  wsClient.onclose = function() {
    wsClient.opened = false;
	if(bitfinexws.ready)onready(false);
	bitfinexws.ready=false;
	if(bitfinexws.hbtimer)clearInterval(bitfinexws.hbtimer);
    console.log('Connection to', wsClient.url, 'closed.');
  };



   function hb(){bitfinexws.last_hb=Date.now();}

 //define parsers
   if( parsers.book_update )            var parse_book_update           = parsers.book_update ;           else   var parse_book_update           = parser_book_update_asis ;
   if( parsers.book_snapshot )          var parse_book_snapshot         = parsers.book_snapshot ;         else   var parse_book_snapshot         = parser_book_snapshot_no_parse ; 
   if( parsers.book_snapshot_R0 )       var parse_book_snapshot_R0      = parsers.book_snapshot_R0 ;      else   var parse_book_snapshot_R0      = parser_book_snapshot_R0 ;
   if( parsers.book_update_R0 )         var parse_book_update_R0        = parsers.book_update_R0 ;        else   var parse_book_update_R0        = parser_book_update_R0 ;
   if( parsers.book_hb )                var parse_book_hb               = parsers.book_hb ;               else   var parse_book_hb               = parser_book_hb ;
   if( parsers.trades_te )              var parse_trades_te             = parsers.trades_te ;             else   var parse_trades_te             = parser_trades_te ;
   if( parsers.trades_tu )              var parse_trades_tu             = parsers.trades_tu ;             else   var parse_trades_tu             = parser_trades_tu ;
   if( parsers.trades_snapshot )        var parse_trades_snapshot       = parsers.trades_snapshot ;       else   var parse_trades_snapshot       = parser_trades_snapshot ;
   if( parsers.trades_hb )              var parse_trades_hb             = parsers.trades_hb ;             else   var parse_trades_hb             = parser_trades_hb ;
   if( parsers.ticker_update )          var parse_ticker_update         = parsers.ticker_update ;         else   var parse_ticker_update         = parser_ticker_update ;
   if( parsers.ticker_hb )              var parse_ticker_hb             = parsers.ticker_hb ;             else   var parse_ticker_hb             = parser_ticker_hb ;
   if( parsers.account_ps )             var parse_account_ps            = parsers.account_ps ;            else   var parse_account_ps            = parser_account_ps ;
   if( parsers.account_pn )             var parse_account_pn            = parsers.account_pn ;            else   var parse_account_pn            = parser_account_pn ;
   if( parsers.account_pu )             var parse_account_pu            = parsers.account_pu ;            else   var parse_account_pu            = parser_account_pu ;
   if( parsers.account_pc )             var parse_account_pc            = parsers.account_pc ;            else   var parse_account_pc            = parser_account_pc ;
   if( parsers.account_wu )             var parse_account_wu            = parsers.account_wu ;            else   var parse_account_wu            = parser_account_wu ;
   if( parsers.account_ws )             var parse_account_ws            = parsers.account_ws ;            else   var parse_account_ws            = parser_account_ws ;
   if( parsers.account_on )             var parse_account_on            = parsers.account_on ;            else   var parse_account_on            = parser_account_on ;
   if( parsers.account_ou )             var parse_account_ou            = parsers.account_ou ;            else   var parse_account_ou            = parser_account_ou ;
   if( parsers.account_oc )             var parse_account_oc            = parsers.account_oc ;            else   var parse_account_oc            = parser_account_oc ;
   if( parsers.account_os )             var parse_account_os            = parsers.account_os ;            else   var parse_account_os            = parser_account_os ;
   if( parsers.account_ts )             var parse_account_ts            = parsers.account_ts ;            else   var parse_account_ts            = parser_account_ts ;
   if( parsers.account_te )             var parse_account_te            = parsers.account_te ;            else   var parse_account_te            = parser_account_te ;
   if( parsers.account_tu )             var parse_account_tu            = parsers.account_tu ;            else   var parse_account_tu            = parser_account_tu ;
   if( parsers.account_hb )             var parse_account_hb            = parsers.account_hb ;            else   var parse_account_hb            = parser_account_hb ;

  wsClient.onmessage = function(data) {

    try {
      data = JSON.parse(data);
    } catch(e) {
      console.log('error', 'Unable to parse incoming data:', data, e.stack);
      return;
    }

	if(!bitfinexws.paused){		
		if(!bitfinexws.ready)onready(true);
		bitfinexws.ready=true;
		bitfinexws.last_hb=Date.now();
	}

	if( data instanceof Array )
	{
		if(bitfinexws.paused) return;
		var chanId=data[0];
		var channel=chan_id[chanId];
		var event=data[1];
		var arg1;
		if(event instanceof Array) 
		{
			args=event;
			event='snapshot';
		}
		else
		{
			var n=2;
			if( channel.name=='book' && data[1]!=='hb' ) {
				event='update';
				n=1;
			}
			else if( channel.name=='ticker'&& data[1]!=='hb' ) {
				event='update';
				n=1;
			}
			else
			{
				event=data[1];
			}
			var args=data.slice(n);
		}
		//channel.R0
		var fn=channel[event];

        //if(event=='hb')  hb();  // not required see line above 'bitfinexws.last_hb=Date.now();'
		if(fn){
			var arg=false;
			if(chanId===0) {
				     if(event=='pn') arg=parse_account_pn(args);
				else if(event=='pu') arg=parse_account_pu(args);
				else if(event=='pc') arg=parse_account_pc(args);
				else if(event=='ps') arg=parse_account_ps(args[0]);
				else if(event=='wu') arg=parse_account_wu(args);
				else if(event=='ws') arg=parse_account_ws(args[0]);
				else if(event=='on') arg=parse_account_on(args);
				else if(event=='ou') arg=parse_account_ou(args);
				else if(event=='oc') arg=parse_account_oc(args);
				else if(event=='os') arg=parse_account_os(args[0]);
				else if(event=='te') arg=parse_account_te(args);
				else if(event=='tu') arg=parse_account_tu(args);
				else if(event=='ts') arg=parse_account_ts(args[0]);
				else if(event=='hb') arg=parse_account_hb(args);
			}
			else if(channel.name==='book'){
				if(channel.R0)
				{
					     if(event=='update')   arg=parse_book_update_R0(args);
					else if(event=='snapshot') arg=parse_book_snapshot_R0(args);
				}
				else {
					     if(event=='update')   arg=parse_book_update(args);
					else if(event=='snapshot') arg=parse_book_snapshot(args);
				}
				if(event=='hb') arg=parser_book_hb(args);
			}
			else if(channel.name==='trades'){
				     if(event=='te')       arg=parse_trades_te(args);
				else if(event=='tu')       arg=parse_trades_tu(args);
				else if(event=='snapshot') arg=parse_trades_snapshot(args);
				else if(event=='hb')       arg=parse_trades_hb(args); // may return skiped hidden order sequance in the argument
			}
			else if(channel.name==='ticker'){
				     if(event=='update')       arg=parse_ticker_update(args);
				else if(event=='hb')           arg=parse_ticker_hb(args);
			}		
			if(arg!==false)fn(arg);
			else 
				console.log('BitfinexWS1 on channel '+channel.name+' unparsed response event \''+event+'\', args=',args,'  data', data);
			//fn.apply(bitfinexws,args);
		}
		
		// uncomment line below to see whats wrong
		//else
		// console.log('BitfinexWS1 on channel '+channel.name+' unused event \''+event+'\', args=',args,'  data', data);
	}
    else if( data instanceof Object )
	{
		if(data.event==='info'){        // { event: 'info', version: 1.1 }
			delete data.event;     
			if(data.version)bitfinexws.version=data.version;
			if(data.code===20051) wsClient.reconnect_now(); // please try to reconnect { event: 'info', code: 20051  }
			if(data.code===20060) { // Please pause { event: 'info', code: 20060  }  Refreshing data from the Trading Engine. Please pause any activity and resume after receiving the info message 20061 (it should take 10 seconds at most).
				bitfinexws.paused=true;
				if(bitfinexws.ready)onready(false);
				bitfinexws.ready=false;
			}
			if(data.code===20061) { // Please pause { event: 'info', code: 20061  }  Refreshing data from the Trading Engine. Please pause any activity and resume after receiving the info message 20061 (it should take 10 seconds at most).
				bitfinexws.paused=true;
				resubscribe();
			} 
		}
		else if(data.event==='auth'){ 		// { event: 'auth', status: 'OK', chanId: 0, userId: 11465 }
			delete data.event;
			bitfinexws.auth=data;
			if(data.status=='OK')
			{
				onauth();
				bitfinexws.subscribe.call(bitfinexws,send);
			}
			else
				onerror(new Error('BitfinexWS1 auth error, status!=\'OK\', data='+JSON.stringify(data)));
		}
		else if(data.event==='unauth'){ 		// { "event":"unauth", "status":"OK", "chanId":0 }
			delete data.event;
			bitfinexws.auth=false;
			if(data.status=='OK')
				onunauth();
			else
				onerror(new Error('BitfinexWS1 auth error, status!=\'OK\', data='+JSON.stringify(data)));
		}
		else if(data.event==='pong'){ 		// { "event":"unauth", "status":"OK", "chanId":0 }
			onpong()
		}
		else if(data.event==='subscribed'){ 		// { event: 'subscribed', channel: 'trades', chanId: 75, pair: 'BTCUSD' }

			var channel=false;
			
			 // take alrady defined handlers ,when receving channel id
			if(data.channel && data.pair  ) {
				if( !chan_name[data.channel] )            chan_name[data.channel]={};
				if( !chan_name[data.channel][data.pair] ) chan_name[data.channel][data.pair]={};
				channel=chan_name[data.channel][data.pair];
			}
			else if(data.channel ){
				if( !chan_name[data.channel] )            chan_name[data.channel]={};
				channel=chan_name[data.channel];
			}
			
			if(channel!==false)
			{
				channel.chanId = data.chanId;
				channel.name   = data.channel;
				if(data.pair)            channel.pair=data.pair;
				if(channel.name=='book') channel.R0=data.prec==='R0';
				chan_id[channel.chanId]=channel;
			}
			else
			{
				console.log('BitfinexWS1 subscribed event but ther is no channel, data', data);
			}
		}
		else if(data.event==='error') { 		// { channel: 'book', pair: 'TCUSD', prec: 'P10', freq: 'F3', event: 'error', msg: 'precision: invalid', code: 10300 }

			var channel=false;
			 // take alrady defined handlers ,when receving channel id
			if(data.channel && data.pair && chan_name[data.channel] && (channel=chan_name[data.channel][data.pair]) && chan_name[data.channel][data.pair].error) {
				delete data.event;
				channel.error(data);
			}
			else if(data.channel && (channel=chan_name[data.channel]) && chan_name[data.channel].error){
				delete data.event;
				channel.error(data);
			}
			else
				onerror( new Error( 'BitfinexWS1 error, data='+JSON.stringify(data) )  );
		}
		else 
			console.log('BitfinexWS1 unknown event data', data);
	}
	else 
		console.log('BitfinexWS1 Error, unknonwn socket message, not objecct and not array')
  };

  wsClient.onerror = function(e) {
    onerror(e);
  };

  wsClient.onend = function(code) {
	onerror(new Error('WebSocket closed. Please check errors above., socket end, code:'+code));
  };

  wsClient.open("wss://api.bitfinex.com/ws");

  wsClient.addListener('reconnect', function() {
    //wsClient.url = makeEndpoint(options);
    console.log('Reconnecting to ', wsClient.url);
  });

  //return wsClient;
  return bitfinexws;
};



function parser_no_parse(a){return a;}



//orderbook






// makes no sense to use objects, they are too slow.
function parser_book_update(a){
	var line= {
			price: a[0],       //	float	Price level.
			count: a[1],       //	int	Number of orders at that price level.
			amount: a[2]       //	float	± Total amount available at that price level.
			                   //          positive values mean bid, negative values mean ask.
	}
	line.isbid=line.amount>0;
	if(line.amount<0) line.amount=-line.amount;
	if(line.count==0)line.amount=0;
	return line;
}

function parser_book_snapshot(arr){
	var asks=[],bids=[],p=parser_book_update;
	for(var i=0;i<arr.length;i++)
	{
		var line=p(arr[i]);
		if(line.isbid) bids.push(line);
		          else asks.push(line);
	}
	return {asks:asks,bids:bids};
}

// arrays are much faster so they make more sense;

function parser_book_update_convenient_array(a){
	var line= [
			a[0],  //price:      //	float	Price level.
			a[2],  //amount:     //	float	± Total amount available at that price level.
			                     //          positive values mean bid, negative values mean ask.
			a[1]   //count:      //	int	Number of orders at that price level.
								//COUNT=0 means that you have to remove the price level from your book.
	]
	var isbid=line[1]>0;
	if(line[2]==0)line[1]=0;
	else if(line[1]<0) line[1]=-line[1];
	return [isbid,line];
}

function parser_book_snapshot_convenient_array(arr){
	var asks=[],bids=[],p=parser_book_update_convenient_array;
	for(var i=0;i<arr.length;i++)
	{
		var line=p(arr[i]);
		if(line[0]) bids.push(line[1]);
		       else asks.push(line[1]);
	}
	return {asks:asks,bids:bids};
}


function parser_book_update_convenient_array_same_order(a){
	var line= [
			a[0],  //price:      //	float	Price level.
			a[1],   //count:      //	int	Number of orders at that price level.
								//COUNT=0 means that you have to remove the price level from your book.
			a[2]   //amount:     //	float	± Total amount available at that price level.
			                     //          positive values mean bid, negative values mean ask.
	]
	var isbid=line[2]>0;
	if(line[1]==0)line[2]=0;
	else if(line[2]<0) line[2]=-line[2];
	return [isbid,line];
}

function parser_book_snapshot_convenient_array_same_order(arr){
	var asks=[],bids=[],p=parser_book_update_convenient_array_same_order;
	for(var i=0;i<arr.length;i++)
	{
		var line=p(arr[i]);
		if(line[0]) bids.push(line[1]);
		       else asks.push(line[1]);
	}
	return {asks:asks,bids:bids};
}


var parser_book_snapshot_no_parse=parser_no_parse;

// arrays are faster so they make more sense;
function parser_book_snapshot_R0_convenient(arr){
	var asks=[],bids=[],p=parser_book_update_R0_convenient;
	for(var i=0;i<arr.length;i++)
	{
		var line=p(arr[i]);
		if(line[0]) bids.push(line[1]);
		       else asks.push(line[1]);
	}
	return {asks:asks,bids:bids};
}


// raw orderbook



function parser_book_update_R0_convenient(a){
	var line= [
			a[0],  //ord_id:      //	int	Order id.
			a[1],  //ord_price:   //	float	Order price.
			a[2]   //±amount:     //	float	Total amount available at that price level.
								  //			Positive values mean bid, negative values mean ask.
	]
	var isbid=line[2]>0; 
	if(line[2]<0) line[2]=-line[2];
	return [isbid,line];  
}


function parser_book_update_R0_object(a) {
	var line= {
			id:a[0],     //ord_id:      //	int	Order id.
			price:a[1],  //ord_price:   //	float	Order price.
			amount:a[2]  //±amount:     //	float	Total amount available at that price level.
								  //			Positive values mean bid, negative values mean ask.
	}
	var isbid=line.amount>0; 
	if(line.amount<0) line.amount=-line.amount;
	return [isbid,line];  
}

// arrays are faster so they make more sense;
function parser_book_snapshot_R0_object(arr){
	var asks=[],bids=[],p=parser_book_update_R0_object;
	for(var i=0;i<arr.length;i++)
	{
		var line=p(arr[i]);
		if(line[0]) bids.push(line[1]);
		       else asks.push(line[1]);
	}
	return {asks:asks,bids:bids};
}

var parser_book_update_R0=parser_no_parse;
// arrays are faster so they make more sense;
var parser_book_snapshot_R0=parser_no_parse;










//trades

function parser_trades_te_convenient(a) {
	var trade= {
			seq: a[0], 	       //		integer	sequance number
			trade_id: null, 	 //		integer	Trade database id
			timestamp: a[1], 	 //		integer	Unix timestamp of the trade.
			id: a[2],		 	 //		integer	Order id
			price: a[3], 	 //		float	Execution price
			amount: a[4], 	 //		float	Positive means buy, negative means sell
		 }
		 trade.type=trade.amount>=0?0:1; // 0=buy , 1=sell
		 trade.amount=trade.amount<0?-1:trade.amount;
		 return trade;
}

function parser_trades_tu_convenient(a) {
	var trade= {
			seq: a[0], 	       //		integer	sequance number
			trade_id: a[1], 	 //		integer	Trade database id
			timestamp: a[2], 	 //		integer	Unix timestamp of the trade.
			id: a[3],		 	 //		integer	Order id
			price: a[4], 	 //		float	Execution price
			amount: a[5], 	 //		float	Positive means buy, negative means sell
		 }
		 trade.type=trade.amount>=0?0:1; // 0=buy , 1=sell
		 trade.amount=trade.amount<0?-1:trade.amount;
		 return trade;
}
function parser_trades_snapshot_convenient(arr){return arr.map(parser_trades_tu_convenient);}

function parser_trades_te(a) {
	var trade= {
			seq: a[0], 	       //		integer	sequance number
//			trade_id: null, 	 //		integer	Trade database id
			timestamp: a[1], 	 //		integer	Unix timestamp of the trade.
			id: a[2],		 	 //		integer	Order id
			price: a[3], 	 //		float	Execution price
			amount: a[4], 	 //		float	Positive means buy, negative means sell
		 }
		 //trade.type=trade.amount>=0?0:1; // 0=buy , 1=sell
		 //trade.amount=trade.amount<0?-1:trade.amount;
		 return trade;
}

function parser_trades_tu(a) {
	var trade= {
			seq: a[0], 	       //		integer	sequance number
			trade_id: a[1], 	 //		integer	Trade database id
			timestamp: a[2], 	 //		integer	Unix timestamp of the trade.
			id: a[3],		 	 //		integer	Order id
			price: a[4], 	 //		float	Execution price
			amount: a[5], 	 //		float	Positive means buy, negative means sell
		 }
		 //trade.type=trade.amount>=0?0:1; // 0=buy , 1=sell
		 //trade.amount=trade.amount<0?-1:trade.amount;
		 return trade;
}
function parser_trades_snapshot(arr){return arr.map(parser_trades_tu);}


function parser_ticker_update(a) {
	var ticker= {
			bid: a[0], 	       		 //	float	price of last highest bid
			bid_size: a[1],    		 //	float	Size of the last highest bid
			ask: a[2], 	       		 //	float	price of last lowest ask
			ask_size: a[3], 	     //	float	Size of the last lowest ask
			daily_change: a[4], 	 //	float	Amount that the last price has changed since yesterday
			daily_change_perc: a[5], //	float	Amount that the price has changed expressed in percentage terms
			last_price: a[6], 	     //	float	Price of the last trade.
			volume: a[7], 	       	 //	float	Daily volume
			high: a[8], 	       	 //	float	Daily high
			low: a[9] 	       		 //	float	daily low
		 }
	 return ticker;
}


function parser_account_pu_convenient(a) {
	var position= {
		pair: a[0], 	       		  //	string	Pair (BTCUSD, …).
		status: a[1], 	       	  //	string	Status (ACTIVE, CLOSED).
		amount: a[2], 	       	  //	float	± Size of the position. Positive values means a long position, negative values means a short position.
		base_price: a[3], 	      //	float	The price at which you entered your position.
		margin_funding: a[4], 	  //	float	The amount of funding being used for this position.
		margin_funding_type: a[5] //	int	0 for daily, 1 for term.
	}
	position.islong=position.amount>=0;
	if(position.amount<0)position.amount=-position.amount;
	return position;
}
var parser_account_pn_convenient=parser_account_pu_convenient;
var parser_account_pc_convenient=parser_account_pu_convenient;
function parser_account_ps_convenient(arr){return arr.map(parser_account_pu_convenient);}


function parser_account_pu(a) {
	var position= {
		pair: a[0], 	       		  //	string	Pair (BTCUSD, …).
		status: a[1], 	       	  //	string	Status (ACTIVE, CLOSED).
		amount: a[2], 	       	  //	float	± Size of the position. Positive values means a long position, negative values means a short position.
		base_price: a[3], 	      //	float	The price at which you entered your position.
		margin_funding: a[4], 	  //	float	The amount of funding being used for this position.
		margin_funding_type: a[5] //	int	0 for daily, 1 for term.
	}
	//position.islong=position.amount>=0;
	//if(position.amount<0)position.amount=-position.amount;
	return position;
}
var parser_account_pn=parser_account_pu;
var parser_account_pc=parser_account_pu;
function parser_account_ps(arr){return arr.map(parser_account_pu);}

function parser_account_wu(a) {
	var wallet= {
		wallet_type: a[0], 			//	string	Wallet name (exchange, margin, funding)
		currency: a[1], 			//	string	Currency (fUSD, etc)
		balance: a[2], 				//	float	Wallet balance
		unsettled_interest: a[3], 	//	float	Unsettled interest
	}
	return wallet;
}
function parser_account_ws(arr){ return arr.map(parser_account_wu); } ;


function parser_account_on_convenient(a) {
	var order= {
		id:  a[0],         //		int	Order ID
		symbol: a[1],     //		string	Pair (tBTCUSD, …)
		amount: a[2],     //		float	Positive means buy, negative means sell.
		amount_orig: a[3], //		float	Original amount
		type: a[4],        //		string	The type of the order: LIMIT, MARKET, STOP, TRAILING STOP, EXCHANGE MARKET, EXCHANGE LIMIT, EXCHANGE STOP, EXCHANGE TRAILING STOP, FOK, EXCHANGE FOK.
		order_status: a[5], //		string	Order Status: ACTIVE, EXECUTED, PARTIALLY FILLED, CANCELED
		price: a[6],        //		float	Price
		price_avg: a[7],    //		float	Average price
		timestamp: a[8],    //		int	Millisecond timestamp of creation
		notify: a[9],          //		int	1 if Notify flag is active, 0 if not
		hidden: a[10],          //		int	1 if Hidden, 0 if not hidden
		placed_id: a[11]       //		int	If another order caused this order to be placed (OCO) this will be that other order's ID
	 }
	 order.method=order.type;
	 delete order.type;
	 order.type=order.amount>=0?0:1; // 0=buy , 1=sell
	 order.amount=order.amount<0?-1:order.amount;
	 order.amount_orig=order.amount_orig<0?-1:order.amount_orig;

	 order.pair=order.symbol.replace(/^[tf](\w{3})(\w{3})$/,"$1/$2");
	 order.wallet=order.symbol[0]==='t'?'exchange':(order.symbol[0]==='f'?'margin':null);			 
	 order.cost_currency=order.pair.split('/')[1];
	 order.cost=parseFloat((order.amount*order.price*(1+(0.2/100))).toFixed(12));

	 return order;
}
var parser_account_ou_convenient=parser_account_on_convenient;
var parser_account_oc_convenient=parser_account_on_convenient;
function parser_account_os_convenient(arr){ return arr.map(parser_account_on_convenient); } ;



function parser_account_on(a) {
	var order= {
		id:  a[0],         //		int	Order ID
		symbol: a[1],     //		string	Pair (tBTCUSD, …)
		amount: a[2],     //		float	Positive means buy, negative means sell.
		amount_orig: a[3], //		float	Original amount
		type: a[4],        //		string	The type of the order: LIMIT, MARKET, STOP, TRAILING STOP, EXCHANGE MARKET, EXCHANGE LIMIT, EXCHANGE STOP, EXCHANGE TRAILING STOP, FOK, EXCHANGE FOK.
		order_status: a[5], //		string	Order Status: ACTIVE, EXECUTED, PARTIALLY FILLED, CANCELED
		price: a[6],        //		float	Price
		price_avg: a[7],    //		float	Average price
		timestamp: a[8],    //		int	Millisecond timestamp of creation
		notify: a[9],          //		int	1 if Notify flag is active, 0 if not
		hidden: a[10],          //		int	1 if Hidden, 0 if not hidden
		placed_id: a[11]       //		int	If another order caused this order to be placed (OCO) this will be that other order's ID
	 }
	 return order;
}
var parser_account_ou=parser_account_on;
var parser_account_oc=parser_account_on;
function parser_account_os(arr){ return arr.map(parser_account_on); } ;


function parser_account_ts_one_convenient(a){
	var trade= {
			trade_id: a[0], 	 //     no trade_id yet
			pair: a[1], 		 //		string	Pair (BTCUSD, …)
			timestamp: a[2], 	 //		integer	Execution timestamp
			id: a[3],		 	 //		integer	Order id
			amount_executed: a[4], 	 //		float	Positive means buy, negative means sell
			price_executed: a[5], 	 //		float	Execution price
			order_type: a[6], 	 //		string	Order type
			order_price: a[7], 	 //		float	Order price
			fee: a[8], 			 //		float	Fee
			fee_currency: a[9] //		string	Fee currency
		 }
		 trade.type=trade.amount_executed>=0?0:1; // 0=buy , 1=sell
		 trade.amount_executed=trade.amount_executed<0?-1:trade.amount_executed;
		 trade.order_method=trade.order_type;
		 delete trade.order_type;
		 return trade;
}
function parser_account_ts_convenient(arr){ return arr.map(parser_account_ts_one_convenient); } ;



function parser_account_ts_one(a){
	var trade= {
			trade_id: a[0], 	 //     no trade_id yet
			pair: a[1], 		 //		string	Pair (BTCUSD, …)
			timestamp: a[2], 	 //		integer	Execution timestamp
			id: a[3],		 	 //		integer	Order id
			amount_executed: a[4], 	 //		float	Positive means buy, negative means sell
			price_executed: a[5], 	 //		float	Execution price
			order_type: a[6], 	 //		string	Order type
			order_price: a[7], 	 //		float	Order price
			fee: a[8], 			 //		float	Fee
			fee_currency: a[9] //		string	Fee currency
		 }
		 //trade.type=trade.amount_executed>=0?0:1; // 0=buy , 1=sell
		 //trade.amount_executed=trade.amount_executed<0?-1:trade.amount_executed;
		 //trade.order_method=trade.order_type;
		 //delete trade.order_type;
		 return trade;
}
function parser_account_ts(arr){ return arr.map(parser_account_ts_one); } ;

function parser_account_te_convenient(a){
	var trade= {
			seq: a[0], 	 //		integer	sequance number
			trade_id: null, 	 //     no trade_id yet
			pair: a[1], 		 //		string	Pair (BTCUSD, …)
			timestamp: a[2], 	 //		integer	Execution timestamp
			id: a[3],		 	 //		integer	Order id
			amount_executed: a[4], 	 //		float	Positive means buy, negative means sell
			price_executed: a[5], 	 //		float	Execution price
			order_type: a[6], 	 //		string	Order type
			order_price: a[7] 	 //		float	Order price
		 }
		 trade.type=trade.amount_executed>=0?0:1; // 0=buy , 1=sell
		 trade.amount_executed=trade.amount_executed<0?-1:trade.amount_executed;
		 trade.order_method=trade.order_type;
		 delete trade.order_type;
		 return trade;
}
function parser_account_tu_convenient(a){
	var trade= {
			seq: a[0], 	       //		integer	sequance number
			trade_id: a[1], 	 //		integer	Trade database id
			pair: a[2], 		 //		string	Pair (BTCUSD, …)
			timestamp: a[3], 	 //		integer	Execution timestamp
			id: a[4],		 	 //		integer	Order id
			amount_executed: a[5], 	 //		float	Positive means buy, negative means sell
			price_executed: a[6], 	 //		float	Execution price
			order_type: a[7], 	 //		string	Order type
			order_price: a[8], 	 //		float	Order price
			fee: a[9], 			 //		float	Fee
			fee_currency: a[10] //		string	Fee currency
		 }
		 trade.type=trade.amount_executed>=0?0:1; // 0=buy , 1=sell
		 trade.amount_executed=trade.amount_executed<0?-1:trade.amount_executed;
		 trade.order_method=trade.order_type;
		 delete trade.order_type;
		 return trade;
}


function parser_account_te(a){
	var trade= {
			seq: a[0], 	 //		integer	sequance number
			trade_id: null, 	 //     no trade_id yet
			pair: a[1], 		 //		string	Pair (BTCUSD, …)
			timestamp: a[2], 	 //		integer	Execution timestamp
			id: a[3],		 	 //		integer	Order id
			amount_executed: a[4], 	 //		float	Positive means buy, negative means sell
			price_executed: a[5], 	 //		float	Execution price
			order_type: a[6], 	 //		string	Order type
			order_price: a[7] 	 //		float	Order price
		 }
		 //trade.type=trade.amount_executed>=0?0:1; // 0=buy , 1=sell
		 //trade.amount_executed=trade.amount_executed<0?-1:trade.amount_executed;
		 //trade.order_method=trade.order_type;
		 //delete trade.order_type;
		 return trade;
}
function parser_account_tu(a){
	var trade= {
			seq: a[0], 	       //		integer	sequance number
			trade_id: a[1], 	 //		integer	Trade database id
			pair: a[2], 		 //		string	Pair (BTCUSD, …)
			timestamp: a[3], 	 //		integer	Execution timestamp
			id: a[4],		 	 //		integer	Order id
			amount_executed: a[5], 	 //		float	Positive means buy, negative means sell
			price_executed: a[6], 	 //		float	Execution price
			order_type: a[7], 	 //		string	Order type
			order_price: a[8], 	 //		float	Order price
			fee: a[9], 			 //		float	Fee
			fee_currency: a[10] //		string	Fee currency
		 }
		 //trade.type=trade.amount_executed>=0?0:1; // 0=buy , 1=sell
		 //trade.amount_executed=trade.amount_executed<0?-1:trade.amount_executed;
		 //trade.order_method=trade.order_type;
		 //delete trade.order_type;
		 return trade;
}


function parser_account_hb(a){
	var trade= {
			seq: a[0], 	       //	may have	integer	sequance number // i guess it is emited on hidden trades on parser_trades_hb
		 }
		 return trade;
}
var parser_book_hb=parser_account_hb;
var parser_trades_hb=parser_account_hb;
var parser_ticker_hb=parser_account_hb;



// exports:

module.exports = BitfinexWS1

var parsers={}

parsers.book_update                                =    parser_book_update      ;
parsers.book_snapshot                              =    parser_book_snapshot    ;
parsers.book_snapshot_no_parse                     =    parser_book_snapshot_no_parse   ;

parsers.  book_update_convenient_array             =      parser_book_update_convenient_array ; // preffered - same order as bitstamp and others
parsers.book_snapshot_convenient_array             =    parser_book_snapshot_convenient_array ;// preffered
                                                   
parsers.  book_update_convenient_array_same_order  =      parser_book_update_convenient_array_same_order   ;
parsers.book_snapshot_convenient_array_same_order  =    parser_book_snapshot_convenient_array_same_order   ;

parsers.book_update_R0                             =    parser_book_update_R0   ;
parsers.book_update_R0_object                      =    parser_book_update_R0_object   ;
parsers.book_snapshot_R0                           =    parser_book_snapshot_R0   ;
parsers.book_snapshot_R0_object                    =    parser_book_snapshot_R0_object   ;

parsers.book_snapshot_R0_convenient                =    parser_book_snapshot_R0_convenient         ; // preffered
parsers.book_update_R0_convenient                  =    parser_book_update_R0_convenient           ; // preffered


parsers.trades_te                                  =    parser_trades_te   ;
parsers.trades_tu                                  =    parser_trades_tu   ;
parsers.trades_snapshot                            =    parser_trades_snapshot   ;

parsers.trades_te_convenient                       =    parser_trades_te_convenient                ; // preffered
parsers.trades_tu_convenient                       =    parser_trades_tu_convenient                ; // preffered
parsers.trades_snapshot_convenient                 =    parser_trades_snapshot_convenient          ; // preffered

parsers.ticker_update                              =    parser_ticker_update            ;

parsers.account_pu                                 =    parser_account_pu   ;
parsers.account_pn                                 =    parser_account_pn   ;
parsers.account_pc                                 =    parser_account_pc   ;
parsers.account_ps                                 =    parser_account_ps   ;
                                                  
parsers.account_pu_convenient                      =    parser_account_pu_convenient   ; // preffered
parsers.account_pn_convenient                      =    parser_account_pn_convenient   ; // preffered
parsers.account_pc_convenient                      =    parser_account_pc_convenient   ; // preffered
parsers.account_ps_convenient                      =    parser_account_ps_convenient   ; // preffered 

parsers.account_wu                                 =    parser_account_wu               ;
parsers.account_ws                                 =    parser_account_ws               ;
                                                  
parsers.account_on                                 =    parser_account_on   ;
parsers.account_ou                                 =    parser_account_ou   ;
parsers.account_oc                                 =    parser_account_oc   ;
parsers.account_os                                 =    parser_account_os   ;

parsers.account_on_convenient                      =    parser_account_on_convenient   ; // preffered
parsers.account_ou_convenient                      =    parser_account_ou_convenient   ; // preffered
parsers.account_oc_convenient                      =    parser_account_oc_convenient   ; // preffered
parsers.account_os_convenient                      =    parser_account_os_convenient   ; // preffered


parsers.account_te                                 =    parser_account_te   ;
parsers.account_tu                                 =    parser_account_tu   ;
parsers.account_ts                                 =    parser_account_ts   ;

parsers.account_te_convenient                      =    parser_account_te_convenient   ; // preffered
parsers.account_tu_convenient                      =    parser_account_tu_convenient   ; // preffered
parsers.account_ts_convenient                      =    parser_account_ts_convenient   ; // preffered



module.exports.parsers=parsers;



// predefined parser set, i prefer

module.exports.better_parsers={

book_update:      BitfinexWS1.parsers.book_update_convenient_array,   // [isbid,[...]],  only positive amount , the order of amount and count is swapped
book_snapshot:    BitfinexWS1.parsers.book_snapshot_convenient_array, // array, of same as above

book_snapshot_R0: BitfinexWS1.parsers.book_snapshot_R0_convenient, // [isbid,[...]], only positive amount
book_update_R0:   BitfinexWS1.parsers.book_update_R0_convenient,   // array, of same as above
book_update_R0:   BitfinexWS1.parsers.book_update_R0_convenient,   // array, of same as above
		 
trades_te: BitfinexWS1.parsers.trades_te_convenient,  // added .type 0=buy , 1=sell, only positive amount
trades_tu: BitfinexWS1.parsers.trades_tu_convenient,  // added .type 0=buy , 1=sell, only positive amount
trades_snapshot: BitfinexWS1.parsers.trades_snapshot_convenient,  // array, of same as above 
             
account_pu: BitfinexWS1.parsers.account_pu_convenient,  // added .islong(bool), only positive amount
account_pn: BitfinexWS1.parsers.account_pn_convenient,  // added .islong(bool), only positive amount
account_pc: BitfinexWS1.parsers.account_pc_convenient,  // added .islong(bool), only positive amount
account_ps: BitfinexWS1.parsers.account_ps_convenient,  // array, of same as above 
 
account_on: BitfinexWS1.parsers.account_on_convenient, // .type renamed to .method, added .type 0=buy , 1=sell , only positive amount, added .pair in format of "BTC/USD", added .wallet = 'exchange' or 'margin', added .cost , added .cost_currency  (this allaws to calculate free amount in wallet)
account_ou: BitfinexWS1.parsers.account_ou_convenient, // .type renamed to .method, added .type 0=buy , 1=sell , only positive amount, added .pair in format of "BTC/USD", added .wallet = 'exchange' or 'margin', added .cost , added .cost_currency  (this allaws to calculate free amount in wallet)
account_oc: BitfinexWS1.parsers.account_oc_convenient, // .type renamed to .method, added .type 0=buy , 1=sell , only positive amount, added .pair in format of "BTC/USD", added .wallet = 'exchange' or 'margin', added .cost , added .cost_currency  (this allaws to calculate free amount in wallet)
account_os: BitfinexWS1.parsers.account_os_convenient, // array, of same as above

account_te: BitfinexWS1.parsers.account_te_convenient,
account_tu: BitfinexWS1.parsers.account_tu_convenient, // added .type 0=buy , 1=sell, only positive amount, renamed .order_type to .order_method
account_ts: BitfinexWS1.parsers.account_ts_convenient, // array, of same as above
 
}

 
module.exports.test=function(API_KEY,API_SECRET) {
	
var bitfinexws=BitfinexWS1(
API_KEY, // key
API_SECRET, // secret
{ // events
	account:
	{
	 pn:function(a){ console.log("account pn",a)},
	 pu:function(a){ console.log("account pu",a)},
	 pc:function(a){ console.log("account pc",a)},
	 ps:function(a){ console.log("account ps",a)},
	 wu:function(a){ console.log("account wu",a)},
	 ws:function(a){ console.log("account ws",a)},
	 on:function(a){ console.log("account on",a)},
	 ou:function(a){ console.log("account ou",a)},
	 oc:function(a){ console.log("account oc",a)},
	 os:function(a){ console.log("account os",a)},
	 ts:function(a){ console.log("account ts",a)},
	 te:function(a){ console.log("account te",a)},
	 tu:function(a){ console.log("account tu",a)},
	 hb:function(a){ console.log("account hb",a)}
    },
	book:
	{
	 BTCUSD:
	 {
		 snapshot:function(a){ console.log("book BTCUSD snapshot",a)},
		 update  :function(a){ console.log("book BTCUSD update",a)},
	     hb      :function(a){ console.log("book BTCUSD hb",a)}
	 }	
	},
	trades:
	{
	 BTCUSD:
	 {
		 snapshot:function(a){ console.log("trades BTCUSD snapshot",a)},
		 te      :function(a){ console.log("trades BTCUSD te",a)},
		 tu      :function(a){ console.log("trades BTCUSD tu",a)},
	     hb      :function(a){ console.log("trades BTCUSD hb",a)}
	 }	
	},
	ticker:
	{
	 BTCUSD:
	 {
		 update  :function(a){ console.log("ticker BTCUSD update",a)},
	     hb      :function(a){ console.log("ticker BTCUSD hb",a)}
	 }	
	}
},
function subscribe(send) // need to be specified because on self reconnect, happens and channels need to be resubscribed;
{
	send({ "event":"subscribe", "channel":"ticker", "pair":"tBTCUSD"});
	send({ "event":"subscribe", "channel":"book",   "pair":"tBTCUSD", "prec":"P3", "freq":"F1" });
},
 BitfinexWS1.better_parsers // (optional) my prefered set of parsers, little different from the docs, you can define your own if you like different configuration.            without this, it mutches the official docs.  , the difference from the docs is not an issue. rather good.
);


// to modify better parsers it is possible to use like, below to inherit from better parsers:  
// myparsers={
//	book_snapshot: BitfinexWS1.parsers.book_snapshot_no_parse
// };
// myparsers.__proto__=BitfinexWS1.better_parsers

// you can put reference to your parsers methods here 
// event parser receives an array of arguments. snapshot recevies the array of objects.
// 
//
 


}
