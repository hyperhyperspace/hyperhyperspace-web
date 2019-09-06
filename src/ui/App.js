import React, { Component } from 'react';
import { HashRouter, Route, Switch, Redirect } from 'react-router-dom';
import './App.css';

import CssBaseline from '@material-ui/core/CssBaseline';
import 'typeface-roboto';

import AllChatsView from './views/AllChatsView.js';
import ChatView from './views/ChatView.js';
import CreateAccountView from './views/CreateAccountView.js';
import WaitView from './views/WaitView.js';

import RootController from './controllers/RootController.js';


class App extends Component {

  constructor(props) {
    super(props);

    this.state = {peer: null, askForAccountCreation: false};
    this.controller = new RootController(this.props.peerManager);
    this.controller.addPeerActivationCallback((activePeer) => {
      this.setState({'peer': activePeer});
    });
    this.controller.getPeerManager().getAvailableInstanceRecords().then(
      instanceRecords => {
        // TODO: for now if there is more than one account, we
        //       will just use the first one.
          if (instanceRecords.length > 0) {
            this.controller
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

              <Route render={({match}) => <CreateAccountView controller={this.controller}/>} />

            ) : (
              <Switch>
                <Route path="/chat" exact={true} render={({match}) => <AllChatsView controller={this.controller} match={match} /> } />
                {/*<Route path="/chat/:name/:id" render={({match}) => <ChatView controller={this.chatsController} match={match} key={'chat-id-' + match.id}/>} />*/}
                <Route path="/chat/:name/:id" render={({match}) => <ChatView controller={this.controller} match={match} />} />
                <Route path="/new-chat" exact={true} render={({match}) => <AllChatsView controller={this.controller} match={match} /> } />
                {/*<Route path="/new-chat/:name/:id" render={({match}) => <ChatView controller={this.chatsController} match={match} key={'new-chat-id-' + match.id}/>} />*/}
                <Route path="/new-chat/:name/:id" render={({match}) => <ChatView controller={this.controller} match={match} />} />
                <Route path="/add-contacts" exact={true} render={({match}) => <AllChatsView controller={this.controller} match={match} /> } />
                {/*<Route path="/add-contacts/:name/:id" render={({match}) => <ChatView controller={this.chatsController} match={match} key={'add-contacts-chat-id-' + match.id}/>}*/} />
                <Route path="/add-contacts/:name/:id" render={({match}) => <ChatView controller={this.controller} match={match} />} />
                <Route path="/contact-link/:token" exact={false} render={({match}) => <AllChatsView controller={this.controller} match={match} />} />
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
