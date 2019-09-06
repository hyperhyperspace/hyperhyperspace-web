import React from 'react';

import { Link } from 'react-router-dom';
//import Link from '@material-ui/core/Link';

import PropTypes from 'prop-types';

import { withRouter } from 'react-router';
import { withStyles } from '@material-ui/core/styles';
import withWidth from '@material-ui/core/withWidth';

import Paper from '@material-ui/core/Paper';
import Hidden from '@material-ui/core/Hidden';
import AppBar from '@material-ui/core/AppBar';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import PersonIcon from '@material-ui/icons/Person';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import ChatBubbleIcon from '@material-ui/icons/ChatBubble';
import SendIcon from '@material-ui/icons/Send';
import CallIcon from '@material-ui/icons/Call';
import DoneIcon from '@material-ui/icons/Done';
import DoneAllIcon from '@material-ui/icons/DoneAll';
import VideocamIcon from '@material-ui/icons/Videocam';
import CallMadeIcon from '@material-ui/icons/CallMade';
import CallMissedIcon from '@material-ui/icons/CallMissed';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import SearchIcon from '@material-ui/icons/Search';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Divider from '@material-ui/core/Divider';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Avatar from '@material-ui/core/Avatar';
import Zoom from '@material-ui/core/Zoom';
import Button from '@material-ui/core/Button';
import SwipeableViews from 'react-swipeable-views';
import Typography from '@material-ui/core/Typography';
import green from '@material-ui/core/colors/green';
import CircularProgress from '@material-ui/core/CircularProgress';
import Toolbar from '@material-ui/core/Toolbar';
import MenuIcon from '@material-ui/icons/Menu';
import IconButton from '@material-ui/core/IconButton';
import Grid from '@material-ui/core/Grid';
import Drawer from '@material-ui/core/Drawer';
import TextField from '@material-ui/core/TextField';

import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import CloseIcon from '@material-ui/icons/Close';

import withMobileDialog from '@material-ui/core/withMobileDialog';

import logo24 from './images/logo24.png';

import HeaderBar from './HeaderBar.js';

function TabContainer(props) {
  const { children } = props;

  return (
    <React.Fragment>
      {children}
    </React.Fragment>

  );
}

TabContainer.propTypes = {
  /*children: PropTypes.node.isRequired,*/
  dir: PropTypes.string.isRequired,
};

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
    width: 500,
    position: 'relative',
    minHeight: 200,
  },
  fab: {
    position: 'fixed',
    bottom: theme.spacing.unit * 2,
    right: theme.spacing.unit * 2,
  },
  fabGreen: {
    color: theme.palette.common.white,
    backgroundColor: green[500],
  },
});

class AllChats extends React.Component {

  static filterContacts(contacts, filter) {

    if (filter === '') {
      return contacts;
    }

    let result = {};

    Object.keys(contacts).forEach( letter => {
      let matches = contacts[letter].filter(
        p => p.name.toLowerCase().includes(filter.toLowerCase().trim()));
      if (matches.length > 0) {
        result[letter] = matches;
      }
    });
    return result;
  }

  constructor(props) {
    super(props);
    // props.match.params.*
    const { classes, theme, width, } = this.props;
    const isSmallDevice = width === 'xs' || width === 'sm';

    this.isSmallDevice = isSmallDevice;

    this.state = {  tabIdx: 0,
                    newChat: this.props.newChat,
                    newChatContactSearch: (this.isSmallDevice?false:true),
                    menuAnchorElement: null,
                    addContacts: this.props.addContacts,
                    contactsFilter: '',
                    showReceiveInviteDialog: this.props.showReceiveInvite,
                    showSendInviteDialogId: null,
                    newInviteRecipientName: ''
                  };
  }

  static getDerivedStateFromProps(props, state) {
    return {newChat: props.newChat,
            addContacts: props.addContacts,
            showReceiveInviteDialog: props.showReceiveInvite};
  }

  handleChange = (event, tabIdx) => {
    this.setState({ tabIdx });
  }

  handleChangeIndex = index => {
    this.setState({tabIdx: index});
  }



  showNewMessageDrawer = () => {
    this.setState({contactsFilter: ''});
    const currentLocation = this.props.history.location.pathname;
    const newChat = '/new-chat';
    const chat    = '/chat';
    const newMessageLocation = newChat + currentLocation.slice(chat.length);
    this.props.history.push(newMessageLocation);
    this.setState({
        newChat: true,
        newChatContactSearch: (this.isSmallDevice?false:true),
        menuAnchorElement: null
      });
  }

  hideNewMessageDrawer = () => {

    const currentLocation = this.props.history.location.pathname;
    const newChat = '/new-chat';
    const chat    = '/chat';
    const chatLocation = chat + currentLocation.slice(newChat.length);
    this.props.history.push(chatLocation);

    this.setState({newChat: false});
  }

  showNewMessageContactSearch = () => {
    this.setState({newChatContactSearch: true});
  }

  showAddContactsDrawer = () => {
    const currentLocation = this.props.history.location.pathname;
    const newChat = '/new-chat';
    const chat    = '/chat';

    var currentAction, currentChat;

    if (currentLocation.slice(0, chat.length) === chat) {
      currentAction = chat;
      currentChat   = currentLocation.slice(chat.length);
    } else {
      currentAction = newChat;
      currentChat   = currentLocation.slice(newChat.length);
    }

    const addContacts = '/add-contacts';

    const addContactsLocation = addContacts + currentChat;
    this.props.history.push(addContactsLocation);

    this.setState({
        newChat: false,
        newChatContactSearch: (this.isSmallDevice?false:true),
        menuAnchorElement: null,
        addContacts: true,
      });

  }

  hideAddContactsDrawer = () => {
    const currentLocation = this.props.history.location.pathname;
    const addContacts = '/add-contacts';
    const chat    = '/chat';
    const chatLocation = chat + currentLocation.slice(addContacts.length);
    this.props.history.push(chatLocation);

    this.setState({addContacts: false});

  }



  render() {

    const { classes, theme, width, } = this.props;

    const transitionDuration = {
      enter: theme.transitions.duration.enteringScreen,
      exit: theme.transitions.duration.leavingScreen,
    };

    const isSmallDevice = width === 'xs' || width === 'sm';

    var actionButtonProps = { };

    var inviteForDialog = null;

    this.props.pendingInvites.forEach(
      invite => {
        if (invite.id === this.state.showSendInviteDialogId) {
          inviteForDialog = invite;
        }
      });

    return (
      <React.Fragment>

      <div style={{flexGrow:'1'}}>
        <AppBar position="static" color="default">
          <Toolbar style={{paddingLeft:'6px', paddingRight:'0px'}}>
            <IconButton color="inherit" aria-label="Menu">
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" color="inherit" style={{flexGrow: '1'}}>
              <img style={{verticalAlign:'middle'}}src={logo24}/> HyperHyperSpace
            </Typography>
            <Hidden smDown>

                {this.state.tabIdx === 0 &&
                  <IconButton onClick={this.showNewMessageDrawer} ><ChatBubbleIcon /></IconButton>
                }
                {this.state.tabIdx === 1 &&
                  <IconButton to="/call" ><CallIcon /></IconButton>
                }

            </Hidden>
            <IconButton onClick={(event) => {this.setState({menuAnchorElement: event.currentTarget}); }}><MoreVertIcon /></IconButton>
            <Menu
              id="all-chats-menu"
              anchorEl={this.state.menuAnchorElement}
              open={Boolean(this.state.menuAnchorElement)}
              onClose={() => {this.setState({menuAnchorElement: null}); }}
            >
              <MenuItem onClick={this.showAddContactsDrawer}>Add contacts</MenuItem>
              <MenuItem>Settings</MenuItem>
            </Menu>
          </Toolbar>

        </AppBar>
      </div>
        <AppBar position="static" color="default">
          <Tabs
            value={this.state.tabIdx}
            onChange={this.handleChange}
            indicatorColor="primary"
            textColor="primary"
            fullWidth
          >
            <Tab label="CHATS" />
            <Tab label="CALLS" />
          </Tabs>
        </AppBar>
        <SwipeableViews
          index={this.state.tabIdx}
          onChangeIndex={this.handleChangeIndex}
        >
          <TabContainer dir={theme.direction}>
            <List component="nav">

            { this.props.chatsSummaryLoading &&

              <CircularProgress className={classes.progress} />

            }

            { this.props.chatsSummary !== null &&
              this.props.chatsSummary.map((chat => {

                const userIsSender = chat.lastMessageUserIsSender;
                const isRead     = (chat.lastMessageStatus === 'read');
                const isReceived = (chat.lastMessageStatus === 'received');
                const isSent     = (chat.lastMessageStatus === 'sent');
                const messageContent = chat.lastMessageContent;
                const messageTime    = chat.lastMessageTime;

                var messageStatus = null;

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

                const currentLink = '/chat/' + chat.counterpartNameUrl + '/' + chat.counterpartId;
                const isSelected = (chat.counterpartId === this.props.counterpartId);

                return (
                  <Link key={'chat-link-' + chat.counterpartId} to={currentLink} style={{ textDecoration: 'none' }}>
                    <ListItem button selected={isSelected}>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                      <ListItemText disableTypography={true} primary={<Typography variant="h6">{chat.counterpartName}</Typography>} secondary={<Typography variant="body1" color="textSecondary">{messageStatus} {messageContent}</Typography>}/>
                      <ListItemSecondaryAction><Typography variant="body1">{messageTime}</Typography></ListItemSecondaryAction>
                    </ListItem>
                  </Link>
                );
              }
              ))
            }
            </List>
          </TabContainer>
          <TabContainer dir={theme.direction}>
          <List component="nav">
            <ListItem button>
              <Avatar>
                <PersonIcon />
              </Avatar>
              <ListItemText disableTypography={true} primary={<Typography variant="subheading">Marilyn Monroe</Typography>} secondary={<Typography color="textSecondary"><span style={{color:'#00ff00'}}><CallMadeIcon color="inherit" fontSize="inherit"/></span> October 30, 4:51PM</Typography>}/>
              <ListItemSecondaryAction><VideocamIcon color="inherit"/></ListItemSecondaryAction>
            </ListItem>
            <ListItem button>
              <Avatar>
                <PersonIcon />
              </Avatar>
              <ListItemText disableTypography={true} primary={<Typography variant="subheading">Charles Darwin</Typography>} secondary={<Typography color="textSecondary"><span style={{color:'#ff0000'}}><CallMissedIcon color="inherit" fontSize="inherit"/></span> October 27, 1:22PM</Typography>}/>
              <ListItemSecondaryAction><CallIcon color="inherit"/></ListItemSecondaryAction>
            </ListItem>
          </List>
          </TabContainer>
        </SwipeableViews>

        <Hidden mdUp>
          <Zoom
            key="message"
            in={this.state.tabIdx === 0}
            timeout={transitionDuration}
            style={{
              transitionDelay: `${this.state.tabIdx === 0 ? transitionDuration.exit : 0}ms`,
            }}
            unmountOnExit
          >
            <Button variant="fab" className={classes.fab} onClick={this.showNewMessageDrawer}><ChatBubbleIcon /></Button>
          </Zoom>
          <Zoom
            key="call"
            in={this.state.tabIdx === 1}
            timeout={transitionDuration}
            style={{
              transitionDelay: `${this.state.tabIdx === 1 ? transitionDuration.exit : 0}ms`,
            }}
            unmountOnExit
          >
            <Button to="/call" variant="fab" className={classes.fab}><CallIcon /></Button>
          </Zoom>
        </Hidden>

        <Drawer open={this.state.newChat} PaperProps={{style:{width:(isSmallDevice?'100%':'33%')}}}>
          <AppBar position="static" color="primary">
            <Toolbar style={{paddingLeft:'6px', paddingRight:'0px', paddingTop:(isSmallDevice?'0px':'40px')}}>
              <IconButton onClick={this.hideNewMessageDrawer} color="default" aria-label="Back">
                <ArrowBackIcon style={{color:'#eeeeee'}}/>
              </IconButton>

              <Typography variant="h6" color="inherit" style={{flexGrow: '1'}}>
                New chat
              </Typography>

              { this.isSmallDevice &&
                <IconButton onClick={this.showNewMessageContactSearch} color="default" aria-label="Search">
                  <SearchIcon style={{color:'#eeeeee'}}/>
                </IconButton>
              }
            </Toolbar>
          </AppBar>
          { this.state.newChatContactSearch &&
            <Toolbar color="default">
              <Input
                id="new-chat-search"
                fullWidth
                placeholder="Search contacts"
                onChange={(e) => {this.setState({contactsFilter: e.target.value});}}
                startAdornment={<InputAdornment position="start" > <SearchIcon /> </InputAdornment>}
              />
            </Toolbar>
          }
          <Paper style={{overflow:'auto', height: '100%', position: 'relative'}}>

          <List component="nav">
            <ListItem button onClick={this.showAddContactsDrawer}>
              <Avatar style={{backgroundColor:'#44aa44'}}>
                <PersonAddIcon />
              </Avatar>
              <ListItemText disableTypography={true} primary={<Typography variant="h6">Add contacts</Typography>} />
            </ListItem>

            { Object.keys(AllChats.filterContacts(this.props.contacts, this.state.contactsFilter)).sort().map(letter => {
                return (
                  <React.Fragment key={'new-chat-letter-' + letter} >
                  <ListItem>
                    <ListItemText disableTypography={true} primary={<Typography variant="h5">{letter}</Typography>} />
                  </ListItem>
                  { AllChats.filterContacts(this.props.contacts, this.state.contactsFilter)[letter].map(contact => {
                      return (
                        <Link key={'new-chat-' + contact.id} to={'/chat/' + contact.nameForUrl + '/' + contact.id} style={{ textDecoration: 'none' }}>
                          <ListItem button>
                            <Avatar>
                              <PersonIcon />
                            </Avatar>
                            <ListItemText disableTypography={true} primary={<Typography variant="h6">{contact.name}</Typography>} secondary={<Typography color="textSecondary" > {/* aca va el status*/} </Typography>}/>
                          </ListItem>
                        </Link>
                      );
                    })
                  }
                  </React.Fragment>
                );
            })
          }

          </List>
          </Paper>
        </Drawer>

        <Drawer open={this.state.addContacts} PaperProps={{style:{width:(isSmallDevice?'100%':'33%')}}}>
          <AppBar position="static" color="primary">
            <Toolbar style={{paddingLeft:'6px', paddingRight:'0px', paddingTop:(isSmallDevice?'0px':'40px')}}>
              <IconButton onClick={this.hideAddContactsDrawer} color="default" aria-label="Back">
                <ArrowBackIcon style={{color:'#eeeeee'}}/>
              </IconButton>

              <Typography variant="h6" color="inherit" style={{flexGrow: '1'}}>
                Add contacts
              </Typography>
            </Toolbar>
          </AppBar>
          <Paper style={{overflow:'auto', height: '100%', position: 'relative'}}>
            <Grid container spacing={0} style={{height:"100%", paddingTop:'2rem', paddingLeft:'1rem', paddingRight: '1rem'}}>
              <Grid item xs={12}>
                <Grid container spacing={0}>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="inherit">To add someone as a new contact, please create an <b>invite link</b> and send it over <b>email</b>, <b>text messaging</b> or other secure medium.</Typography>
                  </Grid>
                  <Grid item xs={12} style={{paddingTop:'0.75rem'}}>
                  <TextField
                            id="new-contact-name"
                            label="Recipient name"
                            style={{width:"100%"}}
                            margin="normal"
                            autoComplete="off"
                            variant="outlined"
                            value={this.state.newInviteRecipientName}
                            onChange={(e) => {this.setState({newInviteRecipientName: e.target.value});}}
                            onKeyPress={(e) => {if (e.key === 'Enter') {e.preventDefault();}}}
                  />
                  </Grid>
                  <Grid item xs={12} style={{paddingTop:'0.25rem'}}>
                    <Button
                        variant="contained"
                        color="primary"
                        style={{width:'100%'}}
                        onClick={() => {
                          this.props.controller.getContactsController().createInvite(this.state.newInviteRecipientName);
                          this.setState({newInviteRecipientName: ''});
                        }}>
                      Create invite link
                    </Button>
                  </Grid>
                  <Grid item xs={12} style={{paddingTop:'2.5rem'}}>
                    <Typography variant="body1" color="inherit">Created invite links:</Typography>
                  </Grid>

                  <Grid item xs={12}>
                  <List >

                  {
                    this.props.pendingInvites !== undefined &&
                    this.props.pendingInvites.map(invite => {
                      return (
                        <ListItem key={'invite-' + invite.id}>
                          <ListItemText disableTypography={true} primary={<Typography variant="h6" style={{verticalAlign:'middle', width:'66%'}}>{invite.receiverName}</Typography>} />
                          <ListItemSecondaryAction>
                             <Button variant="contained" color="primary" size="small" style={{verticalAlign:'middle', marginRight:'4px'}} onClick={()=>{this.setState({showSendInviteDialogId:invite.id});}}>Send</Button>
                             <Button size="small" style={{verticalAlign:'middle'}} onClick={() => {this.props.controller.getContactsController().cancelInvite(invite.id)}}>Cancel</Button>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })
                  }

                  </List>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Drawer>

        <Dialog
                  open={this.state.showSendInviteDialogId===null? false : true}
                  onClose={() => { }}
                  aria-labelledby="send-invite"
                  fullWidth
                  fullScreen={this.props.fullScreen}
                >
                  <DialogTitle id="send-invite-link-dialog">{"Send invite to " + (inviteForDialog===null?'':inviteForDialog.receiverName)}</DialogTitle>
                  <DialogContent>
                    {/*<DialogContentText>*/}
                    <TextField
                              id="invite-link"
                              label="Invite link"
                              defaultValue={window.location.protocol + '//' + window.location.host + "/#/contact-link/" + (inviteForDialog===null?'':inviteForDialog.token)}
                              fullWidth
                              multiline
                              margin="normal"
                              InputProps={{
                                readOnly: true,
                              }}
                              variant="outlined"
                    />
                    {/*</DialogContentText>*/}
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => { 
                      var copyText = document.querySelector("#invite-link");
                      copyText.select();
                      document.execCommand("copy");
                    }} color="primary" autoFocus>
                      Copy link
                    </Button>
                    <Button onClick={() => {this.setState({showSendInviteDialogId: null});}} color="default">
                      Close
                    </Button>

                  </DialogActions>
        </Dialog>

        <Dialog
                  open={this.state.showReceiveInviteDialog}
                  onClose={() => { }}
                  aria-labelledby="receive-invite"
                  fullWidth
                  fullScreen={this.props.fullScreen}
                >
                  <DialogTitle id="receive-invite-dialog" disableTypography>
                    <Typography variant="h6">{"Add " + (this.props.receivedInviteInfo === null ? '' : this.props.receivedInviteInfo.i.name) + " as a contact?"}</Typography>
                    <Link to={'/chat'}>
                      <IconButton aria-label="Close"
                                  onClick={() => {this.setState({'showReceiveInviteDialog':false});}}
                                  style={{position: 'absolute', right: theme.spacing.unit, top: theme.spacing.unit * 1.5}}>
                        <CloseIcon />
                      </IconButton>
                    </Link>
                  </DialogTitle>
                  <DialogContent>
                    <DialogContentText>
                      If you are unsure if the link you received really comes from {(this.props.receivedInviteInfo === null ? '' : this.props.receivedInviteInfo.i.name)}, you can just close this dialong and open the link again later.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Link to={'/chat'} style={{ textDecoration: 'none' }}>
                      <Button onClick={() => { this.props.controller.getContactsController().acceptInvite(this.props.receivedInviteInfo)}} color="primary" autoFocus>
                        Add {(this.props.receivedInviteInfo === null ? '' : this.props.receivedInviteInfo.i.name)}
                      </Button>
                    </Link>
                    <Link to={'/chat'} style={{ textDecoration: 'none' }}>
                      <Button onClick={() => {this.setState({showSendInviteDialogId: false});}} color="default">
                        Decline
                      </Button>
                    </Link>

                  </DialogActions>
        </Dialog>

      </React.Fragment>
    );
  }
}

export default withMobileDialog()(withRouter(withWidth()(withStyles(styles, { withTheme: true })(AllChats))));
