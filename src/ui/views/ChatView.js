import React from 'react';

import Grid from '@material-ui/core/Grid';
import Hidden from '@material-ui/core/Hidden';
import withWidth from '@material-ui/core/withWidth';

import Chat from '../components/Chat.js';
import AllChats from '../components/AllChats.js';

import AllChatsController from '../controllers/AllChatsController.js';
import { InviteInfo } from '../../services/people/contacts.js';
import ChatController from '../controllers/ChatController.js';

class ChatView extends React.Component {
  constructor(props) {
    super(props);

    //this.controller = props.controller;
    this.allChatsController = new AllChatsController(props.control);
    this.chatController     = new ChatController(props.control);

    this.allChatsController.addStateCallback(() => {
      this.setState({pendingInvites: this.allChatsController.getPendingInvites(),
                     contacts: this.allChatsController.getContacts()});
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
                    pendingInvites: this.allChatsController.getPendingInvites(),
                    contacts: this.allChatsController.getContacts(),
                  };

    this.chatController.init(() => {
      this.setState({chatsSummary: this.chatController.getChatSummary(),
                     chats: this.chatController.getChats()[this.props.match.params.id],
                     loadingChats: false,
                     loadingChatsSummary: false
                   });
    });

    this.fetchChat();
    this.fetchSummary();

  }

  static getDerivedStateFromProps(props, state) {
    return {newChat: props.match.url.startsWith('/new-chat'),
            addContacts: props.match.url.startsWith('/add-contacts')};
  }

  fetchChat() {
    /*this.controller.queryView({ view: this.controller.VIEW_CHAT(),
                               callback: this.receiveChats,
                               recipientId: this.props.match.params.id
                             });*/
  }

  fetchSummary() {
    /*this.controller.queryView({ view: this.controller.VIEW_CHATS_SUMMARY(),
                                callback: this.receiveChatsSummary});*/
  }

  receiveChats = (params, chats) => {
    this.setState({chats: chats, loadingChats: false});
  }

  receiveChatsSummary = (params, chatsSummary) => {
    this.setState({chatsSummary: chatsSummary, loadingChatsSummary: false});
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
              controller={this.allChatsController}
            />
          </Hidden>
        </Grid>
        <Grid item xs={12} md={8} style={{overflow:'scroll', height: '100%', position: 'relative'}}>
          <Chat chats={this.state.chats} loadingChats={this.state.loadingChats} controller={this.chatController} />
        </Grid>
      </Grid>

    );
  }

}

export default withWidth()(ChatView);
