import React from 'react';

import Grid from '@material-ui/core/Grid';

import AllChats from '../components/AllChats.js';

class AllChatsView extends React.Component {
  constructor(props) {
    super(props);
    // props.match.params.*



    this.state = { chatsSummary: null, loadingChatsSummary: true, newChat: props.match.url.startsWith('/new-chat')};
    this.controller = props.controller;
    this.controller.queryView({view: this.controller.VIEW_CHATS_SUMMARY(), callback: this.receiveChatsSummary});
  }

  static getDerivedStateFromProps(props, state) {
    return {newChat: props.match.url.startsWith('/new-chat')};
  }

  receiveChatsSummary = (params, chatsSummary) => {
    this.setState({chatsSummary: chatsSummary, loadingChatsSummary: false});
  }

  render() {
    return (
      <Grid container style={{height:"100%"}}>
        <Grid item xs={12} md={4} style={{overflow:'auto', height: '100%', position: 'relative'}}>
          <AllChats recipientId={null} chatsSummary={this.state.chatsSummary} loadingChatsSummary={this.state.loadingChatsSummary} newChat={this.state.newChat}/>
        </Grid>
        <Grid item xs={false} md={8}>

        </Grid>
      </Grid>
    );
  }
}

export default AllChatsView;
