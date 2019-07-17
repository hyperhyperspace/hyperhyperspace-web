import React, { Component } from 'react';
import { HashRouter, Route, Switch, Redirect } from 'react-router-dom';
import './App.css';

import CssBaseline from '@material-ui/core/CssBaseline';
import 'typeface-roboto';

import AllChatsView from './views/AllChatsView.js';
import ChatView from './views/ChatView.js';
import CreateAccountView from './views/CreateAccountView.js';

import ChatsController from './controllers/ChatsController.js';

class App extends Component {

  constructor(props) {
    super(props);

    this.peerManager = props.peerManager;

    this.chatsController = new ChatsController();
  }


  render() {
    return (
      <React.Fragment>
        <CssBaseline/>
        <div className="App" style={{height:"100%"}}>
          <HashRouter>
            <Switch>
              <Route path="/chat" exact={true} render={({match}) => <AllChatsView controller={this.chatsController} match={match} /> } />
              <Route path="/chat/:name/:id" render={({match}) => <ChatView controller={this.chatsController} match={match} key={'chat-id-' + match.id}/>} />
              <Route path="/new-chat" exact={true} render={({match}) => <AllChatsView controller={this.chatsController} match={match} /> } />
              <Route path="/new-chat/:name/:id" render={({match}) => <ChatView controller={this.chatsController} match={match} key={'chat-id-' + match.id}/>} />
              <Route path="/create-account" exact={true} render={({match}) => <CreateAccountView />} />
              <Redirect from="/" to="/chat" />
            </Switch>
          </HashRouter>
        </div>
      </React.Fragment>
    );
  }
}

export default App;
