import React, { Component } from 'react';
import { HashRouter, Route, Switch, Redirect } from 'react-router-dom';
import './App.css';

import CssBaseline from '@material-ui/core/CssBaseline';
import 'typeface-roboto';

import AllChatsView from './views/AllChatsView.js';
import ChatView from './views/ChatView.js';
import CreateAccountView from './views/CreateAccountView.js';
import WaitView from './views/WaitView.js';

import MessagingService from '../services/mesh/messaging.js';
import ContactsService from '../services/people/contacts.js';
import ChatService from '../services/people/chat.js';
import ConsoleService from '../services/development/console.js';

class AppControl {
  constructor(app) {
    this.app         = app;
    this.peerManager = app.props.peerManager;
    this.activePeer  = null;
  }

  getPeerManager() {
    return this.peerManager;
  }

  setActivePeer(fingerprint) {
    this.activePeer = this.peerManager.activatePeerForInstance(fingerprint);

    let messaging = new MessagingService(this.activePeer);
    let contacts  = new ContactsService(this.activePeer);
    let devConsole = new ConsoleService(this.activePeer);
    let chat = new ChatService(this.activePeer);

    this.activePeer.start().then(() => {
      this.app.setState({'peer': this.activePeer});
    });
  }

  getActivePeer() {
    return this.activePeer;
  }
}

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {peer: null, askForAccountCreation: false};
    this.appControl = new AppControl(this);
    this.appControl.getPeerManager().getAvailableInstanceRecords().then(
      instanceRecords => {
        // TODO: for now if there is more than one account, we
        //       will just use the first one.
          if (instanceRecords.length > 0) {
            this.appControl
                .setActivePeer(instanceRecords[0]['instance']);
          } else {
            this.setState({askForAccountCreation: true});
          }
        }

      );
  }


  render() {
    return (
      <HashRouter>
      <React.Fragment>
        <CssBaseline/>
        <div className="App" style={{height:"100%"}}>

          { !(this.state.peer !== null ||
              this.state.askForAccountCreation === true)? (
            <WaitView />
          ) : (
          <React.Fragment>


            { this.state.peer === null ? (

              <Route render={({match}) => <CreateAccountView appControl={this.appControl}/>} />

            ) : (
              <Switch>
                <Route path="/chat" exact={true} render={({match}) => <AllChatsView control={this.appControl} controller={this.chatsController} match={match} /> } />
                {/*<Route path="/chat/:name/:id" render={({match}) => <ChatView controller={this.chatsController} match={match} key={'chat-id-' + match.id}/>} />*/}
                <Route path="/chat/:name/:id" render={({match}) => <ChatView control={this.appControl} controller={this.chatsController} match={match} />} />
                <Route path="/new-chat" exact={true} render={({match}) => <AllChatsView control={this.appControl} controller={this.chatsController} match={match} /> } />
                {/*<Route path="/new-chat/:name/:id" render={({match}) => <ChatView controller={this.chatsController} match={match} key={'new-chat-id-' + match.id}/>} />*/}
                <Route path="/new-chat/:name/:id" render={({match}) => <ChatView control={this.appControl} controller={this.chatsController} match={match} />} />
                <Route path="/add-contacts" exact={true} render={({match}) => <AllChatsView control={this.appControl} controller={this.chatsController} match={match} /> } />
                {/*<Route path="/add-contacts/:name/:id" render={({match}) => <ChatView controller={this.chatsController} match={match} key={'add-contacts-chat-id-' + match.id}/>}*/} />
                <Route path="/add-contacts/:name/:id" render={({match}) => <ChatView control={this.appControl} controller={this.chatsController} match={match} />} />
                <Route path="/contact-link/:token" exact={false} render={({match}) => <AllChatsView control={this.appControl} controller={this.chatsController} match={match} />} />
                <Redirect from="/" to="/chat" />
              </Switch>
            )}


          </React.Fragment>
          )}

        </div>
      </React.Fragment>
      </HashRouter>
    );
  }
}

export default App;
