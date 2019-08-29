import React from 'react';

import withWidth from '@material-ui/core/withWidth';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';


import AppBar from '@material-ui/core/AppBar';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import withMobileDialog from '@material-ui/core/withMobileDialog';

import logo32 from '../components/images/logo32.png';

class CreateAccountView extends React.Component {

  constructor(props) {
    super(props);

    this.state = { showDialog: false, name: '', dialogRequested: false, bypassDialog: false};


  }

  showDialog() {
    if (this.state.name !== '') {
      this.setState({showDialog: true});
    } else {
      this.setState({dialogRequested: true});
    }
  }

  render() {

    const { width }   = this.props;

    const isSmallDevice = width === 'xs' || width === 'sm';

    var paperStyle = { };
    var appBarPosition = 'relative';

    const nameProps = { error: (this.state.name === '' && this.state.dialogRequested) };

    if (isSmallDevice) {
      paperStyle.height = '100%';
      paperStyle.paddingTop = '30px';
      paperStyle.paddingBottom = '30px';
      //paperStyle.scroll = 'overflow';
    } else {
      paperStyle.height = '100%';
      appBarPosition    = 'absolute';
    }

    const { fullScreen } = this.props;

    let boundShowDialog = this.showDialog.bind(this);

    return (

      <React.Fragment>

        <Paper style={paperStyle}>

          <Grid container direction="column" alignItems="center" justify="center" style={{height:'100%', width: '100%'}}>
          <Grid item style={{width:'100%'}}>
          <Grid container style={{width:'100%'}}>
            <Grid xs={1}  md={3} item></Grid>
            <Grid xs={10} md={6} item style={{width:'100%'}}>

                  <CircularProgress />
                  <Typography variant="body2">Please wait a moment...</Typography>
                  <br />

            </Grid>
            <Grid xs={1}  md={3} item></Grid>
          </Grid>


          </Grid>
          </Grid>
        </Paper>

        <Dialog

          open={this.state.showDialog}
          onClose={() => { }}
          aria-labelledby="confirm-name"
        >
          <DialogTitle id="confirm-name-dialog">{"About your name"}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              <p>{"You can use "} <b> {"any name you want "} </b> {" in the Hyper Hyper Space."}  </p> <p> {"However, for security reasons, the name you choose "} <b> {"can't be changed later"} </b> {" without starting over."}  </p> <p> {" Do you want to continue using the name  "} <b>{this.state.name}</b>{"?"}</p>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {this.setState({showDialog: false, dialogRequested: false, bypassDialog: true});}} color="default">
              No
            </Button>
            <Button onClick={() => { }} color="primary" autoFocus>
              Yes
            </Button>
          </DialogActions>
        </Dialog>
      </React.Fragment>

    );
  }

  doAction() {

  }

}

export default withWidth()(CreateAccountView);
