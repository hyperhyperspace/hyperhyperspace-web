import React from 'react';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

import TextField from '@material-ui/core/TextField';

import Button from '@material-ui/core/Button';


class SendInviteDialog extends React.Component {

  /*constructor(props) {
    super(props);
  } useless-constructor */

  render() {
    return (
      <Dialog
                open={this.props.show}
                onClose={() => { }}
                aria-labelledby="send-invite"
                fullWidth
                fullScreen={this.props.fullScreen}
              >
                <DialogTitle id="send-invite-link-dialog">{"Send invite to " + (this.props.invite===null?'':this.props.invite.receiverName)}</DialogTitle>
                <DialogContent>
                  {/*<DialogContentText>*/}
                  <TextField
                            id="invite-link"
                            label="Invite link"
                            defaultValue={window.location.protocol + '//' + window.location.host + "/#/contact-link/" + (this.props.invite===null?'':this.props.invite.token)}
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
                  <Button onClick={this.props.onClose} color="default">
                    Close
                  </Button>

                </DialogActions>
      </Dialog>

    );
  }
}

export default SendInviteDialog;
