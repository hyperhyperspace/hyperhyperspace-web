import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './ui/App.js';
import * as serviceWorker from './serviceWorker';

import { WebsocketLinkupConnection } from './core/net/linkup.js';

import { LinkupManager, Endpoint} from './core/net/linkup.js';
import { NetworkManager } from './core/net/network.js'
import { StorageManager, Account, Atom } from './core/data/storage.js';
import { IdentityKey } from './core/peer/identity.js';
import { Crypto } from './core/peer/crypto.js';
import { Types } from './core/data/types.js';

import { PeerManager, Peer } from './core/peer/peering.js';

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




//testNetworking();
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


testReplication();
//testDelivery();
//testNetworking();
//testAccounts();
//benchmarkCrypto();

const peerManager = new PeerManager();
const storageMgr = new StorageManager();

ReactDOM.render(<App peerManager={peerManager}/>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();


async function testAccounts() {
  const peerMgr = new PeerManager();
  const storageMgr = peerMgr.getStorageManager();

  const instanceRecords = await storageMgr.getAllInstanceRecords();

  console.log(instanceRecords);
  var instanceFP = null;

  if (instanceRecords.length > 0) {
    instanceFP = instanceRecords[0]['instance'];
  }
  //var instanceFP = '01f6654e4bf8a96811b2bfe2969e8db3981a1058e8';
  var instanceCreation = null;

  if (instanceFP === null) {
    let account = peerMgr.createAccount({'type': 'user', 'name': 'Santi Bazerque'});
    instanceCreation = peerMgr.createLocalAccountInstance(account, {'name': 'My first device'});

    instanceCreation.then(store => {
      console.log('created store for instance ' + store.getAccountInstanceFP());
      instanceFP = store.getAccountInstanceFP();
    });
  } else {
    instanceCreation = Promise.resolve(true);
  }

  await instanceCreation;


  console.log(instanceFP);

  let peer = peerMgr.activatePeerForInstance(instanceFP);

  let store = peer.getStore();


  let instance = await store.load(instanceFP);
  let account  = instance.getAccount();
  await account.pull(store);
  console.log('account loaded!');
  console.log(account);

  /*store.load(instanceFP)
       .then(instance2 => instance2.getAccount())
       .then(account => account.pull(store))
       .then(account => {
          console.log('account loaded!');
          console.log(account);
        });*/


}

function testNetworking() {

  var linkup1 = new LinkupManager();
  var linkup2 = new LinkupManager();


  var endpoint1 = new Endpoint('ws://localhost:8765', 'peer1');
  var endpoint2 = new Endpoint('ws://localhost:8765', 'peer2');

  //var endpoint1 = new Endpoint('wss://mypeer.net', 'peer1');
  //var endpoint2 = new Endpoint('wss://mypeer.net', 'peer2');

  var network1  = new NetworkManager(linkup1);
  var network2  = new NetworkManager(linkup2);

  var node1 = network1.getNode(endpoint1);
  var node2 = network2.getNode(endpoint2);

  node1.setConnectionCallback((conn) => {
      console.log('peer1 established a connection!');
      console.log('local callId: ' + conn.getLocalCallId());
      console.log('remote callId: ' + conn.getRemoteCallId());
      conn.setMessageCallback((msg) => {
        console.log('peer1 received a message: ' + msg);
        //console.log(msg);
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
    window.setTimeout(() => { conn.send('one last thing peer 1')}, 60000);
  });

  node1.start();
  node2.start();

  window.setTimeout(() => {
    node2.open('test call', endpoint1);
  }, 3000);


}

async function testDelivery() {

  const peerManager = new PeerManager();

  var pepo = await getPeerForName(peerManager, 'pepo');
  var yiyo = await getPeerForName(peerManager, 'yiyo');

  let pepoInstance = await pepo.getStore().load(pepo.getAccountInstanceFingerprint());
  let yiyoInstance = await yiyo.getStore().load(yiyo.getAccountInstanceFingerprint());



  pepo.start();
  yiyo.start();

  await pepo.waitUntilStartup();
  await yiyo.waitUntilStartup();
  pepo.routeOutgoingMessage(pepoInstance.getAccount().getIdentity().fingerprint(),
                            yiyoInstance.getAccount().getIdentity().fingerprint(),
                            Peer.CONSOLE_SERVICE,
                            'FIRST ROUTED SERVICE MESSAGE EVER'
                          );

}

async function testReplication() {
  const peerManager = new PeerManager();

  var pepo = await getPeerForName(peerManager, 'pepo');
  var yiyo = await getPeerForName(peerManager, 'yiyo');

  pepo.start();
  yiyo.start();

  await pepo.waitUntilStartup();
  await yiyo.waitUntilStartup();


  let pepoInstance = await pepo.getStore().load(pepo.getAccountInstanceFingerprint());
  let yiyoInstance = await yiyo.getStore().load(yiyo.getAccountInstanceFingerprint());

  let yiyoAcct = yiyoInstance.getAccount();
  let pepoAcct = pepoInstance.getAccount();


  //console.log(yiyoAcct.getInstances().fingerprint());
  await yiyoAcct.getInstances().pull(yiyo.getStore());
  //console.log(yiyoAcct.getInstances().getReplicaControl().getReceivers());


  let serial = pepoAcct.getIdentity().serialize();
  let pepoForeign = Types.deserializeWithType(serial);

  yiyoAcct.getInstances()
             .addReceiver(pepoForeign,
                          yiyoAcct.getIdentity());

  await yiyoAcct.getInstances().flush(yiyo.getStore());

  setTimeout(() => {
    yiyo.getStore().load(yiyoAcct.getInstances().fingerprint()).then(
      yiyosViewOfYiyoInst => {
        yiyosViewOfYiyoInst.pull(yiyo.getStore()).then( () => {
            console.log('yiyo instance in his own instance:');
            console.log(yiyosViewOfYiyoInst);
          }
        );
      }
    );
  }, 3000);

  setTimeout(() => {
    pepo.getStore().load(yiyoAcct.getInstances().fingerprint()).then(
      peposViewOfYiyoInst => {
        peposViewOfYiyoInst.pull(pepo.getStore()).then( () => {
            console.log('yiyo instance set as replicated to pepo:');
            console.log(peposViewOfYiyoInst);
          }
        );
      }
    );
  }, 10000);


}

async function getPeerForName(peerManager, name) {
  let irs = await peerManager.getAvailableInstanceRecords();
  for (let ir of irs) {
    if (ir['accountInfo']['name'] == name) {
      return peerManager.activatePeerForInstance(ir['instance']);
    }
  }

  let account = peerManager.createAccount({'name': name});
  let instance = await peerManager.createLocalAccountInstance(account, {'name': 'My first device'});
  return peerManager.activatePeerForInstance(instance.fingerprint());

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
