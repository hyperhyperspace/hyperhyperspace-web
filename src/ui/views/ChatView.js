import React from 'react';

import Grid from '@material-ui/core/Grid';
import Hidden from '@material-ui/core/Hidden';
import withWidth from '@material-ui/core/withWidth';

import Chat from '../components/Chat.js';
import AllChats from '../components/AllChats.js';

class ChatView extends React.Component {
  constructor(props) {
    super(props);

    this.controller = props.controller;
    this.contactsController = this.controller.getContactsController();
    this.chatController     = this.controller.getChatController();

    this.contactsController.addStateCallback(() => {
      this.setState({pendingInvites: this.contactsController.getPendingInvites(),
                     contacts: this.contactsController.getContacts()});
    });

    this.chatController.addStateCallback(() => {
      this.setState({chatsSummary: this.chatController.getChatSummary(),
                     chats: this.chatController.getChats()[this.props.match.params.id]});
    });

    this.state = {  chats: null,
                    loadingChats: true,
                    chatsSummary: null,
                    loadingChatsSummary: true,
                    newChat: props.match.url.startsWith('/new-chat'),
                    addContacts: props.match.url.startsWith('/add-contacts'),
                    pendingInvites: this.contactsController.getPendingInvites(),
                    contacts: this.contactsController.getContacts(),
                  };

    this.chatController.init(() => {
      this.setState({chatsSummary: this.chatController.getChatSummary(),
                     chats: this.chatController.getChats()[this.props.match.params.id],
                     loadingChats: false,
                     loadingChatsSummary: false
                   });
    });

  }

  static getDerivedStateFromProps(props, state) {
    return {newChat: props.match.url.startsWith('/new-chat'),
            addContacts: props.match.url.startsWith('/add-contacts')};
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if ( prevProps.match.params.id !== this.props.match.params.id ) {

              this.setState({ chats: this.chatController.getChats()[this.props.match.params.id],
                            });


    }

  }

  render() {

    const { width }   = this.props;

    const isSmallDevice = width === 'xs' || width === 'sm';

    var style = {overflow:'auto', height: '100%', position: 'relative' };

    if (!isSmallDevice) {
      style.borderRight = 'solid 1px';
      style.borderColor = '#dddddd';
    }

    return (

      <Grid container style={{height:"100%"}}>
        <Grid item xs={false} md={4} style={style}>
          <Hidden smDown>
            <AllChats
              counterpartId={this.props.match.params.id}
              chatsSummary={this.state.chatsSummary}
              loadingChatsSummary={this.state.loadingChatsSummary}
              newChat={this.state.newChat}
              addContacts={this.state.addContacts}
              showReceiveInvite={false}
              contacts={this.state.contacts}
              pendingInvites={this.state.pendingInvites}
              receivedInviteInfo={null}
              controller={this.controller}
            />
          </Hidden>
        </Grid>
        <Grid item xs={12} md={8} style={{overflow:'scroll', height: '100%', position: 'relative'}}>
          <Chat counterpartId={this.props.match.params.id} chats={this.state.chats} loadingChats={this.state.loadingChats} controller={this.controller} />
        </Grid>
      </Grid>

    );
  }

}

export default withWidth()(ChatView);
