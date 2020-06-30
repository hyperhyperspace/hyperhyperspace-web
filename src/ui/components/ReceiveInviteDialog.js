import React from 'react';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import Typography from '@material-ui/core/Typography';
import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

import { withStyles } from '@material-ui/core/styles';


const styles = theme => ({ });

class ReceiveInviteDialog extends React.Component {

  /*constructor(props) {
    super(props);
  } useless-constructor */

  render() {

    const { theme } = this.props;

    return (
      <Dialog
                open={this.props.show}
                onClose={() => { }}
                aria-labelledby="receive-invite"
                fullWidth
                fullScreen={this.props.fullScreen}
              >
                <DialogTitle id="receive-invite-dialog" disableTypography>
                  <Typography variant="h6">{"Add " + (this.props.receivedInviteInfo === null ? '' : this.props.receivedInviteInfo.i.name) + " as a contact?"}</Typography>
                  <Link to={'/chat'}>
                    <IconButton aria-label="Close"
                                onClick={this.props.onClose}
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
                    <Button onClick={this.props.onClose} color="default">
                      Decline
                    </Button>
                  </Link>

                </DialogActions>
      </Dialog>

    );
  }

}

export default withStyles(styles, { withTheme: true })(ReceiveInviteDialog);
