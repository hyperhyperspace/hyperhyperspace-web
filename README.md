The Hyper Hyper Space webapp
============================

The aim of this project is to create open source peer-to-peer user-facing applications that work *entirely* within the browser, using IndexedDB for storage, WebRTC for peer communications and cryptographic user identities.

The only non-browser dependency is a tiny signalling server that WebRTC needs to establish browser to browser connections.

As a proof of concept, we're finishing a chat app, created as a single page react application.

It should be ready to use in the following weeks.

What we have:

* P2P core engine running in the browser, using:
  * Networking solution using WebRTC and federated signalling
  * Content-addressable storage using IndexedDB
  * Cryptographic identities / validation using JSEncrypt, Hashes and in-browser crypto
  * CRDT-based distributed database
 
* Chat single-page application UI, created using React and Material-UI

Working:

Integrating the UI with the P2P in-browser backend.
