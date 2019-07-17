import React from 'react';

import withWidth from '@material-ui/core/withWidth';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
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
        <AppBar position={appBarPosition}>
          <Typography variant="h4" color="inherit" style={{marginTop: '8px', marginBottom: '8px'}}><img style={{verticalAlign:'middle'}}src={logo32}/> Hyper Hyper Space</Typography>
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
                <Grid xs={12} item><TextField autoFocus={true} onChange={(e) => {this.setState({name:e.target.value});}} onKeyPress={(e) => {if (e.key === 'Enter') {e.preventDefault();}}}{...nameProps} style={{marginLeft:'8px', marginRight:'8px', marginTop: '4px', marginBottom: '12px'}} label="Your name" margin="normal" /></Grid>
                {/*<Grid xs={12} item><TextField autoFocus={true} onChange={(e) => {this.setState({name:e.target.value});}} onKeyPress={(e) => {if (e.key === 'Enter') {e.preventDefault();}}}{...nameProps} style={{marginLeft:'8px', marginRight:'8px', marginTop: '4px', marginBottom: '12px'}} label="Device name" margin="normal" value="My computer"/></Grid>*/}
                <Grid xs={12} item><Button onClick={boundShowDialog}style={{marginLeft:'8px', marginRight:'8px', marginTop: '16px', marginBottom: '4px'}} variant="contained" color="primary">OK, let's go!</Button></Grid>
              </Grid>
            </form>
          </Grid>
          </Grid>
          </Grid>
        </Paper>

        <Dialog
          fullScreen={fullScreen}
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
