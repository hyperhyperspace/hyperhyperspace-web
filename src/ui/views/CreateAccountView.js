import React from 'react';

import withWidth from '@material-ui/core/withWidth';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import AppBar from '@material-ui/core/AppBar';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import CircularProgress from '@material-ui/core/CircularProgress';

import { withRouter } from 'react-router';

import logo32 from '../components/images/logo32.png';

class CreateAccountView extends React.Component {

  constructor(props) {
    super(props);

    const currentLocation = this.props.history.location.pathname;
    var nextLocation = '/';

    if (currentLocation !== undefined &&
        currentLocation !== '/create-account' &&
        currentLocation !== '/create-account/') {

      this.props.history.replace('/create-account');
      nextLocation = currentLocation;
    }

    this.state = { showDialog      : false,
                   name            : '',
                   dialogRequested : false,
                   creatingAccount : false,
                   accountReady    : false,
                   nextLocation    : nextLocation,
                   controller      : this.props.controller
                 };


  }

  static getDerivedStateFromProps(props, state) {
    return {'controller': props.controller};
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
      paperStyle.paddingTop = '30px';
      paperStyle.paddingBottom = '30px';
      //paperStyle.scroll = 'overflow';
    } else {
      paperStyle.height = '100%';
      appBarPosition    = 'absolute';
    }

    let boundShowDialog = this.showDialog.bind(this);

    return (

      <React.Fragment>

        <AppBar position={appBarPosition}>
          <Typography variant="h4" color="inherit" style={{marginTop: '8px', marginBottom: '8px'}}><img style={{verticalAlign:'middle'}}src={logo32} alt='logo'/> Hyper Hyper Space</Typography>
        </AppBar>
        <Paper style={paperStyle}>

          <Grid container direction="column" alignItems="center" justify="center" style={{height:'100%'}}>
          <Grid item>
          <Grid container style={{width:'100%'}}>
            <Grid xs={1}  md={3} item></Grid>
            <Grid xs={10} md={6} item>

                  <Typography variant="h4">Create your account</Typography>
                  <br />
                  <Typography variant="body1">This website is a <b>non-for-profit</b> effort to turn your web browser into a <b>communications platform</b> where you can chat, share pictures or audio messages, and make calls and videoconferences with friends, family and colleagues.
                  All your data will be stored here in your web browser, inaccessible to anyone but you and the people you share it with. To be clear: <b>we intend to make no money</b> from your usage of this site. We won't show you ads, and can't track you or sell your information. Enter your name below and give it a try. </Typography>

            </Grid>
            <Grid xs={1}  md={3} item></Grid>
          </Grid>

          <Grid item>
            <form noValidate autoComplete="off" style={{marginTop:'20px'}}>
              <Grid container>
                    <Grid xs={12} item><TextField autoFocus={true} onChange={(e) => { this.setState({ name: e.target.value }); }} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); boundShowDialog();}}} {...nameProps} style={{marginLeft:'8px', marginRight:'8px', marginTop: '4px', marginBottom: '12px'}} label="Your name" margin="normal" /></Grid>
                {/*<Grid xs={12} item><TextField autoFocus={true} onChange={(e) => {this.setState({name:e.target.value});}} onKeyPress={(e) => {if (e.key === 'Enter') {e.preventDefault();}}}{...nameProps} style={{marginLeft:'8px', marginRight:'8px', marginTop: '4px', marginBottom: '12px'}} label="Device name" margin="normal" value="My computer"/></Grid>*/}
                <Grid xs={12} item><Button onClick={boundShowDialog}style={{marginLeft:'8px', marginRight:'8px', marginTop: '16px', marginBottom: '4px'}} variant="contained" color="primary">OK, let's go!</Button></Grid>
              </Grid>
            </form>
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
              {"You can use "} <b> {"any name you want "} </b> {" in the Hyper Hyper Space."}  <br /> {"However, for security reasons, the name you choose "} <b> {"can't be changed later"} </b> {" without starting over."}  <br /> {" Do you want to continue using the name  "} <b>{this.state.name}</b>{"?"}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
                this.setState({showDialog: false, dialogRequested: false});
              }} color="default">
              No
            </Button>
            <Button onClick={() => {
                this.setState({showDialog: false, dialogRequested: false, creatingAccount: true});
                setTimeout(() => {
                  let account  = this.state.controller
                                     .getPeerManager()
                                     .createAccount({'name' : this.state.name});
                  account.addLinkupServer('wss://mypeer.net');
                  this.state.controller
                      .getPeerManager()
                      .createLocalAccountInstance(account,
                                                  {'name': 'My first device'})
                      .then(
                            (instance) => {
                              this.state.controller.setActivePeer(instance.fingerprint());
                              this.props.history.push(this.state.nextLocation);
                            });
                }, 50)
              }} color="primary" autoFocus>
              Yes
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog

          open={this.state.creatingAccount}
          onClose={() => { }}
          aria-labelledby="creating-account"
        >
          <DialogTitle id="creating-account-dialog">{"Creating your account"}</DialogTitle>
          <DialogContent>

            <CircularProgress />
            <DialogContentText>
              {"Your web browsing is creating your secret key and initializing your account. Please don't close this window."}
            </DialogContentText>
          </DialogContent>
        </Dialog>

    </React.Fragment>
    );
  }

}

export default withRouter(withWidth()(CreateAccountView));
