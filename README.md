The Hyper Hyper Space webapp
============================

The aim of this project is to create open source peer-to-peer user-facing applications that work *entirely* within the browser, using IndexedDB for storage, WebRTC for peer communications and cryptographic user identities.

The only non-browser dependency is a tiny signalling server that WebRTC needs to establish browser to browser connections.

As a proof of concept, we've created a chat app that works as a single page react application in your web browser.

Check it out: https://hyperhyper.space

It's still in beta.

What we have:

* P2P core engine running in the browser, using:
  * Networking solution using WebRTC and federated signalling
  * Content-addressable storage using IndexedDB
  * Cryptographic identities / validation using JSEncrypt, Hashes and in-browser crypto
  * CRDT-based distributed database

* Chat single-page application UI, created using React and Material-UI

For more information please visit the project website at https://www.hyperhyperspace.org
