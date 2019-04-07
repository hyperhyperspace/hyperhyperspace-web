import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

import LinkupManager, { Endpoint} from './net/linkup.js';
import NetworkManager from './net/network.js'
import { StorageManager, Account, Atom } from './data/storage.js';
import IdentityKey, { IdentityManager } from './peer/identity.js';
import { Crypto } from './peer/crypto.js';

const storageMgr = new StorageManager();
const identityMgr = new IdentityManager(storageMgr);

/*
const id = new IdentityKey();

id.create({'msg': 'hola'});

console.log(id.serialize());
console.log(id.fingerprint());

id.tag('un_tag');

console.log(id.serialize());
console.log(id.fingerprint());
*/
//testNetworking();

//identityMgr.createRootIdentityKey('person', 'Santiago Bazerque');

/*
var fp = null;

storage.createAccount(id).then((accnt) => {

  const store = new AccountStore(accnt.fingerprint);

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

  var endpoint1 = new Endpoint('wss://mypeer.net', 'peer1');
  var endpoint2 = new Endpoint('wss://mypeer.net', 'peer2');

  var network1  = new NetworkManager(linkup1);
  var network2  = new NetworkManager(linkup2);

  var node1 = network1.activateNode(endpoint1);
  var node2 = network2.activateNode(endpoint2);

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

  node2.open('test call', endpoint1);
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
