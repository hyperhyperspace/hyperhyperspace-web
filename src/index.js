import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

import { WebsocketLinkupConnection } from './core/net/linkup.js';

import { LinkupManager, Endpoint} from './core/net/linkup.js';
import { NetworkManager } from './core/net/network.js'
import { StorageManager, Account, Atom } from './core/data/storage.js';
import { IdentityManager, IdentityKey } from './core/peer/identity.js';
import { Crypto } from './core/peer/crypto.js';
import { Types } from './core/data/types.js';

import { PeerManager } from './core/peer/peering.js';

const storageMgr = new StorageManager();
const identityMgr = new IdentityManager(storageMgr);

//let peerm = new PeerManager();

//peerm.createAccount('person', 'Santiago Bazerque');

/*
const id = new IdentityKey();

id.create({'msg': 'hola'});

console.log(id.serialize());
console.log(id.fingerprint());

id.tag('un_tag');

console.log(id.serialize());
console.log(id.fingerprint());
*/

testNetworking();
//testLinkup();

//identityMgr.createRootIdentityKey('person', 'Santiago Bazerque');


//const fp  = "0154822362e411207089dba43b6097f3e729cade5e"	;
//const store = storageMgr.getStore(fp);
//console.log(store.loadAllByType(Types.IDENTITY_KEY()));


//const secondary4 = root.createAuthKey({'location': 'fourth computer'});
//secondary4.then(x => {console.log(x)});


/*const root = identityMgr.getIdentityNode(fp)

const secondary1 = root.createAuthKey({'location': 'computer'});
secondary1.then(x => {console.log(x)});

const secondary2 = root.createAuthKey({'location': 'second computer'});
secondary2.then(x => {console.log(x)});

const secondary3 = root.createAuthKey({'location': 'third computer'});
secondary3.then(x => {console.log(x)});
*/

/*
const root = identityMgr.getIdentityNode(fp);
const secondary4 = root.createAuthKey({'location': 'fourth computer'});
secondary4.then(x => {console.log(x)});
*/

/*
var fp = null;

storage.createAccount(id).then((accnt) => {

  const store = new Store(accnt.fingerprint);

  const atom = new Atom();

  atom.create(id);

  store.save(atom);

});

storage.getAccounts().then(
  (accnts) => {
    console.log('got all accounts!!');
    accnts.forEach(
      (accnt) => {
        console.log(accnt);
      }
    )
  }
)

*/





//benchmarkCrypto();


ReactDOM.render(<App storageMgr={storageMgr}/>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();


function testNetworking() {

  var linkup1 = new LinkupManager();
  var linkup2 = new LinkupManager();


  var endpoint1 = new Endpoint('ws://localhost:8765', 'peer1');
  var endpoint2 = new Endpoint('ws://localhost:8765', 'peer2');

  //var endpoint1 = new Endpoint('wss://mypeer.net', 'peer1');
  //var endpoint2 = new Endpoint('wss://mypeer.net', 'peer2');

  var network1  = new NetworkManager(linkup1);
  var network2  = new NetworkManager(linkup2);

  var node1 = network1.getNetworkNode(endpoint1);
  var node2 = network2.getNetworkNode(endpoint2);

  node1.setConnectionCallback((conn) => {
      console.log('peer1 established a connection!');
      conn.setMessageCallback((msg) => {
        console.log('peer1 received a message: ' + msg);
        if (msg.includes('hello')) { conn.send('well received peer2'); }
      });
      conn.send('hello peer2');
    });

  node2.setConnectionCallback((conn) => {
    console.log('peer2 established a connection!');
    conn.setMessageCallback((msg) => {
      console.log('peer2 received a message: ' + msg);
      if (msg.includes('hello')) { conn.send('well received peer1'); }
    });
    conn.send('hello peer1');
  });

  node1.start();
  node2.start();

  window.setTimeout(() => {
    node2.open('test call', endpoint1);
  }, 3000);
}

function benchmarkCrypto() {

  var t0 = performance.now();

  var id = new IdentityKey();

  id.create({type:'root', entity:'person', name:'Santiago Bazerque'});


  var t1 = performance.now();

  console.log('generated identity in ' + (t1 - t0) + ' millis');

  t0 = performance.now()
  var k = new IdentityKey();
  k.create({type:'secondary', role:'chat-key', parent:id.getFingerprint()});
  var s = id.sign(k.getFingerprint());
  if (id.verify(k.getFingerprint(), s)) {
    console.log('Identity key validated ok');
  } else {
    console.log('Error validating identity key');
  }
  t1 = performance.now();

  console.log('validated key in ' + (t1 - t0) + ' millis');

  console.log('id: ' + id.fingerprint);


  t0 = performance.now();

  const text = 'hola santi campeon, te estoy mandando un mensajito';
  const cypher = id.encrypt(text);

  t1 = performance.now();

  console.log('encrypted short message in ' + (t1 - t0) + ' millis');
  console.log('cyphertext: ' + cypher);

  t0 = performance.now();

  const decypher = id.decrypt(cypher);

  t1 = performance.now();

  console.log('decrpted short message in ' + (t1 - t0) + ' millis');
  console.log('text: ' + decypher);


  t0 = performance.now();

  console.log(Crypto.fingerprint('hola'));

  t1 = performance.now();

  console.log('hashed in ' + (t1 - t0) + ' millis');
}

function testLinkup() {

  console.log('start test');

  var conn1 = new WebsocketLinkupConnection('wss://mypeer.net');
  var listener1 = conn1.getListener('/santi');
  //conn1.listen('/santi');


  listener1.setDefaultCallback(
    function(channel, msg) {
      console.log('on channel ' + channel + ': ' + msg);
    });

  listener1.registerCallback(
    'test',
    function(msg) {
      console.log(msg + ' received on test for /santi');
    });

/*var caller = new LocalLinkupCaller('pepe');*/
  var conn2 = new WebsocketLinkupConnection('wss://mypeer.net');

  var listener2 = conn2.getListener('/pepe');
  //conn2.listen('/pepe');

  listener2.setDefaultCallback((callId, data) => {
    console.log('call id ' + callId + ' sent this to pepe: ' + data);
  });

  listener2.registerCallback('test', (msg) => console.log(msg + ' received on test for /pepe'));


  var listener21 = conn2.getListener('/papa');

  listener21.setDefaultCallback((callId, data) => console.log('got message for papa: ' + data));
//window.setTimeout(() => {



  window.setTimeout(() => {

    var caller2 = conn2.getCaller('/santi', new Endpoint('wss://mypeer.net', '/pepe'));
    caller2.send('test', 'hola santi, soy pepin');
    caller2.send('wrongchannel', 'this is a stray message');

    var caller1 = conn1.getCaller('/pepe', new Endpoint('wss://mypeer.net', '/santi'));

    caller1.send('test', 'hola pepin, soy santi');
    caller1.send('wrongchannel2', 'this is another stray message');

    caller2.send('test', 'second test');
    caller2.send('test', 'third test');

    caller1.send('test', 'second failed test');

    var caller11 = conn1.getCaller('/papa',  new Endpoint('wss://mypeer.net', '/santi'));
    caller11.send('testo', 'hi PAPA');

    console.log('end test');

  }, 3000);
  //}, 3);


}
