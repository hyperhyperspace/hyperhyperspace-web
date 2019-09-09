import React from 'react';

import Drawer from '@material-ui/core/Drawer';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import PersonIcon from '@material-ui/icons/Person';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';

import SearchIcon from '@material-ui/icons/Search';

import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';

import Avatar from '@material-ui/core/Avatar';

import { Link } from 'react-router-dom';

class NewChatDrawer extends React.Component {

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

    this.state = {
      newChatContactSearch: (this.props.isSmallDevice?false:true),
      contactsFilter: '',
    };
  }

  showNewMessageContactSearch = () => {
    this.setState({newChatContactSearch: true});
  }

  render() {
    return (
      <Drawer open={this.props.open} PaperProps={{style:{width:(this.props.isSmallDevice?'100%':'33%')}}}>
        <AppBar position="static" color="primary">
          <Toolbar style={{paddingLeft:'6px', paddingRight:'0px', paddingTop:(this.props.isSmallDevice?'0px':'40px')}}>
            <IconButton onClick={this.props.hide} color="default" aria-label="Back">
              <ArrowBackIcon style={{color:'#eeeeee'}}/>
            </IconButton>

            <Typography variant="h6" color="inherit" style={{flexGrow: '1'}}>
              New chat
            </Typography>

            { this.props.isSmallDevice &&
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
          <ListItem button onClick={() => { this.setState({newChatContactSearch: (this.isSmallDevice?false:true) }); this.props.addContacts();}}>
            <Avatar style={{backgroundColor:'#44aa44'}}>
              <PersonAddIcon />
            </Avatar>
            <ListItemText disableTypography={true} primary={<Typography variant="h6">Add contacts</Typography>} />
          </ListItem>

          { Object.keys(NewChatDrawer.filterContacts(this.props.contacts, this.state.contactsFilter)).sort().map(letter => {
              return (
                <React.Fragment key={'new-chat-letter-' + letter} >
                <ListItem>
                  <ListItemText disableTypography={true} primary={<Typography variant="h5">{letter}</Typography>} />
                </ListItem>
                { NewChatDrawer.filterContacts(this.props.contacts, this.state.contactsFilter)[letter].map(contact => {
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

    );
  }
}

export default NewChatDrawer;
