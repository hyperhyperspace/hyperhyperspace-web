import React from 'react';

import withWidth from '@material-ui/core/withWidth';
import { withStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';

import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

import DoneAllIcon from '@material-ui/icons/DoneAll';
import DoneIcon from '@material-ui/icons/Done';

import Emoji from './Emoji.js';

import twemoji from 'twemoji';

const styles = theme => ({
    sentMessageBubble: {
      borderTopRightRadius: '0px',
      borderTopLeftRadius: '12px',
      borderBottomLeftRadius: '12px',
      borderBottomRightRadius: '12px',
      backgroundColor: '#e0e0e0',
    },
    sentMessageText: {
      paddingTop: '6px',
      paddingBottom: '6px',
      paddingLeft: '6px',
      paddingRight: '6px',
    },
    receivedMessageBubble: {
      borderTopRightRadius: '12px',
      borderTopLeftRadius: '0px',
      borderBottomRightRadius: '12px',
      borderBottomLeftRadius: '12px',
    },
    receivedMessageText: {
      paddingTop: '6px',
      paddingBottom: '6px',
      paddingLeft: '6px',
      paddingRight: '6px',
    },
});

class ChatMessage extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { classes }       = this.props;

    const { width }         = this.props;
    const { userIsSender }  = this.props;
    const { content }= this.props;
    const { time }    = this.props;
    const { isSent }        = this.props;
    const { isReceived }    = this.props;
    const { isRead }        = this.props;
    const { key }           = this.props;

    const isSmallDevice = width === 'xs' || width === 'sm';

    const sentMessagePadding = '&nbsp'.repeat(20);
    const receivedMessagePadding = '&nbsp'.repeat(18);

    var messageContent;

    let messageElements = [];
    var prevText = '';

    for (const ch of content) {
      const imgstr = twemoji.parse(ch);
      if (imgstr.includes('<img')) {
        if (prevText != '') {
          messageElements.push(<span style={{verticalAlign: 'middle', minHeight: '20px'}} key={key + '_part_' + messageElements.length}>{prevText}</span>);
          prevText = '';
        }

        let re = /src[ ]*[=][ ]*["]([^"]*)["]/g;

        var match = null;

        var src = '';

        while ((match = re.exec(imgstr)) !== null) {
          src = match[1];
        }

        messageElements.push(<img style={{verticalAlign: 'middle'}} className='emoji' height='20px' width='20px' key={key + '_part_' + messageElements.length} src={src} />);
      } else {
        prevText = prevText + ch;
      }
    }

    if (prevText !== '') {
      messageElements.push(<span style={{verticalAlign: 'middle', minHeight: '20px'}} key={key + '_part_' + messageElements.length}>{prevText}</span>)
    }

    if (userIsSender) {
      messageElements.push(<span key={key + '_part_' + messageElements.length}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>);
      messageContent = (<Typography style={{verticalAlign: 'baseline'}}variant="body1" component='div' className={classes.sentMessageText}> { messageElements.map(x => x) }  </Typography>);
    } else {
      messageElements.push(<span key={key + '_part_' + messageElements.length}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>)
      messageContent = (<Typography style={{verticalAlign: 'baseline'}}variant="body1" component='div' className={classes.receivedMessageText}>{messageElements.map(x => x) }  </Typography>);
    }

    //twemoji.parse(messageContent);

    var messageStatus;

    if (userIsSender) {
      if (isRead) {
        messageStatus = <span style={{color:'#0000ff'}}><DoneAllIcon color="inherit" fontSize="inherit"/></span>;
      } else if (isReceived) {
        messageStatus = <DoneAllIcon color="inherit" fontSize="inherit"/>;
      } else if (isSent) {
        messageStatus = <DoneIcon color="inherit" fontSize="inherit"/>
      } else {
        messageStatus = <span></span>;
      }
    } else {
      messageStatus = null;
    }

    return (
      <React.Fragment>

          <Grid container style={ userIsSender? {marginLeft:'20%', width:'75%', marginRight:'5%'} : {marginRight:'20%', width:'75%', marginLeft:'5%'}} key={this.props.recipientId}>

            <Grid item xs={12}>
              <Grid container spacing={0} direction="row" justify={ userIsSender? "flex-end" : "flex-start" }>
                <Grid item>
                  <Paper className={userIsSender? classes.sentMessageBubble : classes.receivedMessageBubble} elevation={1} align="left">

                        {messageContent}

                        <Typography style={{float: 'right', paddingBottom:'4px', marginTop: '-16px', marginRight: '8px', marginBottom: '0px', marginLeft:'4px'}} variant="caption">{time} {messageStatus} </Typography>

                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
      </React.Fragment>
    );

  }

}

export default withStyles(styles)(withWidth()(ChatMessage));
