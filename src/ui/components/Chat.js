import React from 'react';

import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import withWidth from '@material-ui/core/withWidth';
import { Link } from 'react-router-dom';

import Hidden from '@material-ui/core/Hidden';
import Paper from '@material-ui/core/Paper';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import MoodIcon from '@material-ui/icons/Mood';
import MicIcon from '@material-ui/icons/Mic';
import SendIcon from '@material-ui/icons/Send';
import DoneAllIcon from '@material-ui/icons/DoneAll';
import IconButton from '@material-ui/core/IconButton';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import TextField from '@material-ui/core/TextField';
import PersonIcon from '@material-ui/icons/Person';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Slide from '@material-ui/core/Slide';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';

import ChatMessage from '../components/ChatMessage.js';
import EmojiPicker from '../components/EmojiPicker.js';

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
  }

  someEvent(e) {
    if (e.type === 'pointerdown' || e.type === 'click' || e.type === 'contextmenu') {
      e.preventDefault();
    }
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

        <Grid container style={{paddingTop:'8px', paddingBottom:'5rem'}}>
          <Grid item xs={12}>

            {this.props.chats !== null &&
              this.props.chats.messages.map(
                (msg => (
                          <ChatMessage key={msg.id} {...msg} />
                        )
                )
              )
            }



          </Grid>
        </Grid>

        <MessageInput isSmallDevice={isSmallDevice} counterpartId={this.props.chats===null? null : this.props.chats.counterpartId} controller={this.props.controller}/>

      </React.Fragment>

    );
  }
}

export default withStyles(styles)(withWidth()(Chat));
