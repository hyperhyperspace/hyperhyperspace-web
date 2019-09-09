import React from 'react';

import Grid from '@material-ui/core/Grid';
import Drawer from '@material-ui/core/Drawer';
import TextField from '@material-ui/core/TextField';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';

class AddContactsDrawer extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      newInviteRecipientName: ''
    };
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
                           <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            style={{verticalAlign:'middle', marginRight:'4px'}}
                            onClick={()=>{if (navigator.share !== undefined) {navigator.share({title:'Invitation to hyperhyper.space', url:window.location.protocol + '//' + window.location.host + "/#/contact-link/" + invite.token});} else { this.props.showSendInvite(invite.id); }}}
                          >Send</Button>
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

    );
  }

}

export default AddContactsDrawer;
