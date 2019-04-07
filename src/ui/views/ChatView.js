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

    this.state = {  chats: null,
                    loadingChats: true,
                    chatsSummary: null,
                    loadingChatsSummary: true,
                    newChat: props.match.url.startsWith('/new-chat')
                  };

    this.fetchChat();
    this.fetchSummary();

  }

  static getDerivedStateFromProps(props, state) {
    return {newChat: props.match.url.startsWith('/new-chat')};
  }

  fetchChat() {
    this.controller.queryView({ view: this.controller.VIEW_CHAT(),
                               callback: this.receiveChats,
                               recipientId: this.props.match.params.id
                             });
  }

  fetchSummary() {
    this.controller.queryView({ view: this.controller.VIEW_CHATS_SUMMARY(),
                                callback: this.receiveChatsSummary});
  }

  receiveChats = (params, chats) => {
    this.setState({chats: chats, loadingChats: false});
  }

  receiveChatsSummary = (params, chatsSummary) => {
    this.setState({chatsSummary: chatsSummary, loadingChatsSummary: false});
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if ( prevProps.match.params.id !== this.props.match.params.id ) {

              this.setState({ chats: null,
                              loadingChats: true
                            });
              this.fetchChat();

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
            <AllChats recipientId={this.props.match.params.id} chatsSummary={this.state.chatsSummary} loadingChatsSummary={this.state.loadingChatsSummary} newChat={this.state.newChat}/>
          </Hidden>
        </Grid>
        <Grid item xs={12} md={8} style={{overflow:'scroll', height: '100%', position: 'relative'}}>
          <Chat chats={this.state.chats} loadingChats={this.state.loadingChats} />
        </Grid>
      </Grid>

    );
  }

}

export default withWidth()(ChatView);
