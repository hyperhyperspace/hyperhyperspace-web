import React from 'react';

import { Link } from 'react-router-dom';

import PropTypes from 'prop-types';

import { withRouter } from 'react-router';
import { withStyles } from '@material-ui/core/styles';
import withWidth from '@material-ui/core/withWidth';

import Hidden from '@material-ui/core/Hidden';
import AppBar from '@material-ui/core/AppBar';
import PersonIcon from '@material-ui/icons/Person';
import ChatBubbleIcon from '@material-ui/icons/ChatBubble';
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

import Drawer from '@material-ui/core/Drawer';

import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';

import logo24 from '../../logo24.png';

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

  constructor(props) {
    super(props);
    // props.match.params.*
    const { classes, theme, width, } = this.props;
    const isSmallDevice = width === 'xs' || width === 'sm';

    this.isSmallDevice = isSmallDevice;

    this.state = { tabIdx: 0, newChat: this.props.newChat, newChatContactSearch: (this.isSmallDevice?false:true) };
  }

  static getDerivedStateFromProps(props, state) {
    return {newChat: props.newChat};
  }

  handleChange = (event, tabIdx) => {
    this.setState({ tabIdx });
  }

  handleChangeIndex = index => {
    this.setState({tabIdx: index});
  }

  showNewMessageDrawer = () => {
    const currentLocation = this.props.history.location.pathname;
    const newChat = '/new-chat';
    const chat    = '/chat';
    const newMessageLocation = newChat + currentLocation.slice(chat.length);
    this.props.history.push(newMessageLocation);
    this.setState({newChat: true, newChatContactSearch: (this.isSmallDevice?false:true)});
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

  render() {

    const { classes, theme, width, } = this.props;

    const transitionDuration = {
      enter: theme.transitions.duration.enteringScreen,
      exit: theme.transitions.duration.leavingScreen,
    };

    const isSmallDevice = width === 'xs' || width === 'sm';

    var actionButtonProps = { };

    if (isSmallDevice) {

    }

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
            <IconButton component={Link} to="/options"><MoreVertIcon /></IconButton>
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

                const currentLink = '/chat/' + chat.recipientNameUrl + '/' + chat.recipientId;
                const isSelected = (chat.recipientId === this.props.recipientId);

                return (
                  <Link key={'chat-link-' + chat.recipientId} to={currentLink} style={{ textDecoration: 'none' }}>
                    <ListItem button selected={isSelected}>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                      <ListItemText disableTypography={true} primary={<Typography variant="h6">{chat.recipientName}</Typography>} secondary={<Typography variant="body1" color="textSecondary">{messageStatus} {messageContent}</Typography>}/>
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
              <Input id="new-chat-search" fullWidth placeholder="Search contacts" startAdornment={<InputAdornment position="start" > <SearchIcon /> </InputAdornment>}/>
            </Toolbar>
          }

          <List component="nav">
            <ListItem>
              <ListItemText disableTypography={true} primary={<Typography variant="h5">B</Typography>} />
            </ListItem>
            <Link to={'/chat/batman/ccc'} style={{ textDecoration: 'none' }}>
              <ListItem button>
                <Avatar>
                  <PersonIcon />
                </Avatar>
                <ListItemText disableTypography={true} primary={<Typography variant="h6">Batman</Typography>} secondary={<Typography color="textSecondary" >A villan-superhero </Typography>}/>
              </ListItem>
            </Link>
            <Link to={'/chat/bugs-bunny/bbb'} style={{ textDecoration: 'none' }}>
              <ListItem button>
                <Avatar>
                  <PersonIcon />
                </Avatar>
                <ListItemText disableTypography={true} primary={<Typography variant="h6">Bugs Bunny</Typography>} secondary={<Typography color="textSecondary">Carrot cake lover</Typography>}/>
              </ListItem>
            </Link>
          </List>
          <Divider />
          <List component="nav">
            <ListItem>
              <ListItemText disableTypography={true} primary={<Typography variant="h5">D</Typography>} />
            </ListItem>
            <Link to={'/chat/dr-strangelove/ddd'} style={{ textDecoration: 'none' }}>
              <ListItem button>
                <Avatar>
                  <PersonIcon />
                </Avatar>
                <ListItemText disableTypography={true} primary={<Typography variant="h6">Dr. Strangelove</Typography>} secondary={<Typography color="textSecondary">Blast it to hell</Typography>}/>
              </ListItem>
            </Link>
          </List>
          <Divider />
          <List component="nav">
            <ListItem>
              <ListItemText disableTypography={true} primary={<Typography variant="h5">M</Typography>} />
            </ListItem>
            <Link to={'/chat/mahatma-gandhi/eee'} style={{ textDecoration: 'none' }}>
              <ListItem button>
                <Avatar>
                  <PersonIcon />
                </Avatar>
                <ListItemText disableTypography={true} primary={<Typography variant="h6">Mahatma Gandhi</Typography>} secondary={<Typography color="textSecondary">Peace, no machines</Typography>}/>
              </ListItem>
            </Link>
          </List>
        </Drawer>

      </React.Fragment>
    );
  }
}

export default withRouter(withWidth()(withStyles(styles, { withTheme: true })(AllChats)));
