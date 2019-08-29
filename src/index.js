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



//import { testReplication } from './scratchpad.js';
//testReplication();

//import { testMessaging } from './scratchpad.js';
//testMessaging();

//import { testContacts } from './scratchpad.js';
//testContacts();


const peerManager = new PeerManager();

ReactDOM.render(<App peerManager={peerManager}/>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
