import React from 'react';

import { withStyles } from '@material-ui/core/styles';
import withWidth from '@material-ui/core/withWidth';
import { Link } from 'react-router-dom';

import Hidden from '@material-ui/core/Hidden';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import IconButton from '@material-ui/core/IconButton';
import PersonIcon from '@material-ui/icons/Person';
import Avatar from '@material-ui/core/Avatar';
import Grid from '@material-ui/core/Grid';

import ChatMessage from '../components/ChatMessage.js';

import MessageInput from '../components/MessageInput.js';

const styles = theme => ({
  appBar: {
    top: 'auto',
    bottom: 0,
  },
  userToolbar: {
    alignItems: 'center',
    paddingLeft: '4px',
  },
  backButton: {
    paddingLeft: '4px',
  },
  chatIconSmallScreen: {

  },
  chatIcon: {
    marginLeft: '8px',
  },
  userName: {
    paddingLeft: '6px',
  },
  chatGrid: {
    paddingTop: '6px',
    paddingLeft: '8px',
    paddingRight: '8px',
  },
});

class Chat extends React.Component {

  constructor(props) {
    super(props);

    this.chatDiv = React.createRef();
    this.userDidScroll    = false;
    this.scrollIsAtBottom = false;
  }

  someEvent(e) {
    if (e.type === 'pointerdown' || e.type === 'click' || e.type === 'contextmenu') {
      e.preventDefault();
    }
  }

  scrolled = () => {
    this.userDidScroll    = true;
    this.scrollIsAtBottom = ((this.chatDiv.current.scrollHeight - this.chatDiv.current.scrollTop) === this.chatDiv.current.clientHeight);
  }

  scrollToBottom() {
    if (this.chatDiv.current !== null) {
      this.chatDiv.current.scrollTop = this.chatDiv.current.scrollHeight;
    }
  }

  componentDidUpdate(prevProps) {

    var newMessage = false;

    if (this.props.counterpartId !== prevProps.counterpartId) {
      newMessage = true;
      this.userDidScroll = false;
    } else {
      if (prevProps.chats === null) {
        newMessage = this.props.chats != null;
      } else {
        if (this.props.chats !== null) {
          newMessage = !(prevProps.chats.messages.length === this.props.chats.messages.length);
        }
      }
    }



    if (newMessage && (!this.userDidScroll || this.scrollIsAtBottom)) {
      setTimeout(() => {this.scrollToBottom();});
    }
  }

  componentDidMount() {
    setTimeout(this.scrollToBottom());
  }

  render() {

    const { classes } = this.props;
    const { width }   = this.props;

    const isSmallDevice = width === 'xs' || width === 'sm';


    var exampleMsg = {
      userIsSender: true,
      messageContent: 'la anidación es fundamental la anidación es fundamental la anidación es fundamental la anidación es fundamental la anidación es fundamental la anidación es fundamental la anidación es fundamental la anidación es fundamental',
      messageDate: '22:02 PM',
      isSent: true,
      isReceived: true,
      isRead: true,
    };

    var exampleMsg2 = {
      userIsSender: false,
      messageContent: 'vos decís?',
      messageDate: '22:03 PM',
    };

    var exampleMsg3 = {
      userIsSender: true,
      messageContent: 'la anidación es fundamental',
      messageDate: '22:02 PM',
      isSent: true,
      isReceived: true,
      isRead: true,
    };

    return (

      <React.Fragment>
        <div ref={this.chatDiv} style={{overflow:'scroll', height: '100%', position: 'relative'}} onScroll={(ev) => {this.scrolled();}}>
        <AppBar position="static" color="default">
          <Toolbar className={classes.userToolbar}>
            <Hidden mdUp>
              <Link to={'/chat'}>
                <IconButton className={classes.backButton} color="primary" aria-label="Back">
                  <ArrowBackIcon style={{color:'#333333'}}/>
                </IconButton>
              </Link>
            </Hidden>
            <Avatar className={isSmallDevice? classes.chatIconSmallScreen : classes.chatIcon}>
              <PersonIcon />
            </Avatar>

            <Typography className={classes.userName} variant="h6" color="inherit">
              {this.props.chats !== null && this.props.chats.counterpartName}
            </Typography>
          </Toolbar>
        </AppBar>

        <Grid container style={{paddingTop:'8px', paddingBottom:'5rem'}}  id="scroll-container">
          <Grid item xs={12}>

            {this.props.chats !== null &&
              this.props.chats.messages.map(
                (msg => (
                          <ChatMessage key={'message-' + msg.id} {...msg} />
                        )
                )
              )
            }



          </Grid>
        </Grid>

        <MessageInput scrollToBottom={() => {this.scrollToBottom();}} isSmallDevice={isSmallDevice} counterpartId={this.props.chats===null? null : this.props.chats.counterpartId} controller={this.props.controller}/>
      </div>
      </React.Fragment>

    );
  }
}

export default withStyles(styles)(withWidth()(Chat));
