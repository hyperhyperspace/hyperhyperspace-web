import React from 'react';

import { withStyles } from '@material-ui/core/styles';

import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grid from '@material-ui/core/Grid';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import MoodIcon from '@material-ui/icons/Mood';
import Button from '@material-ui/core/Button';
import SendIcon from '@material-ui/icons/Send';

import EmojiPicker from '../components/EmojiPicker.js';

import twemoji from 'twemoji';

const styles = theme => ({
  bottomToolbar: {
    padding: '8px',
  },
  inputToolbar: {
    borderRadius: '24px',
    paddingLeft: '0px',
    paddingRight: '8px',
    backgroundColor: theme.palette.background.paper,
    alignItems: 'center',
    minHeight: '24px',
  },
  emojiButton: {
    paddingLeft: '8px',
    paddingRight: '8px',
    paddingTop: '8px',
    paddingBottom: '8px',
  },
  micButton: {
    marginLeft: '8px',
  },
  chatInputPanel: {
    borderRadius: '24px',
    alignItems: 'center',
    height: '1.5em',
    paddingTop: '2px',
    paddingBottom: '2px',
  },
  textField: {
    marginRight: '6px',
  },
  inputDiv: {
    width: '100%',
    display: 'block',
    outline: '0px solid transparent',
    textAlign: 'left',
    verticalAlign: 'baseline',
    fontSize: '15px',
    lineHeight: '20px',
    minHeight: '20px',
    maxHeight: '100px',
    paddingTop: '0px',
    paddingBottom: '0px',
    borderTopWidth: '0px',
    borderBottomWidth: '0px',
    marginTop: '0px',
    marginBottom: '0px',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    font: 'inherit',
    userSelect: 'text',
  },
  emoji: {
    userSelect: 'text',
    verticalAlign: 'top',
    display: 'inline-block',
    marginLeft: '1px',
    marginRight: '1px',
    marginTop: '0px',
    marginBottom: '0px',
    borderTopWidth: '0px',
    borderBottomWidth: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',

  },
  grow: {
    flexGrow: 1,
  },
});


let emojify = (string, size) => {

  //alert('s: ' + string)

  const original = string.replace(/[<]img[^>]*class[=]["]emoji["][^>]*alt[=]["]([^"]*)["][^>]*[>]/g, '$1');

  //alert('o: ' + original);

  return twemoji.parse(original, {size: 72}).replace(/<img /g, '<img style="user-select: text; vertical-align: top; display: inline-block; margin-left: 1px; margin-right: 1px; margin-top: 0px; margin-bottom: 0px; border-top-width: 0px; border-bottom-width: 0px; padding-top: 0px; padding-bottom: 0px;" height="' + size + 'px" width="' + size + 'px" ')
}


class MessageInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 'showEmojiPicker': false };
    this.messageText = '';
    this.inputDiv   = React.createRef();
    this.startContainer = null;
    this.startOffset = null;
    this.endContainer = null;
    this.endOffset = null;
  }

  handleEmojiPickerChange(e) {
    this.setState(state => ({ showEmojiPicker: !state.showEmojiPicker }));
  }

  handleEmojiPickerClickAway(e) {
    if (this.state.showEmojiPicker) {
        this.setState(state => ({showEmojiPicker: false}));
    }
  }

  handleEmoji(emoji) {
    this.insertTextAtCursor(emoji);
    let innerHtml    = this.inputDiv.current.innerHTML;
    this.messageText = (typeof innerHtml === 'undefined' ? '' : innerHtml);
  }

  handleNewMessageChange(e) {
    this.messageText = this.inputDiv.current.innerHTML;
  }

  handleNewMessageBlur(e) {
    //this.messageText = this.inputDiv.current.innerHTML;

    setTimeout( () => {
      this.saveCursorPosition();

    }, 0);
  }

  render() {

    const { classes, isSmallDevice } = this.props;

    const inputWidth = isSmallDevice? '100%' : '66%';

    const boundHandleEmojiPickerChange = this.handleEmojiPickerChange.bind(this);
    const boundHandleEmojiPickerClickAway = this.handleEmojiPickerClickAway.bind(this);
    const boundHandleEmoji = this.handleEmoji.bind(this);
    const boundHandleNewMessageChange = this.handleNewMessageChange.bind(this);
    const boundHandleNewMessageBlur = this.handleNewMessageBlur.bind(this);

    return (
      <ClickAwayListener onClickAway={boundHandleEmojiPickerClickAway} >
        <Grid style={{position:'fixed', top:'auto', bottom:'0', width:inputWidth }} container>

          <Grid item xs={12}>
            {/*<Grid container direction="row" justify="flex-start">
              <Grid item>*/}
                { this.state.showEmojiPicker && <EmojiPicker onEmoji={boundHandleEmoji} /> }
                  {/*<Slide direction="up" in={this.state.showEmojiPicker} mountOnEnter unmountOnExit>*/}

                  {/*</Slide>*/}

              {/*</Grid>
            </Grid>*/}
          </Grid>

          <Grid item xs={12}>
            {/*className={classes.appBar} position="fixed"  */}
            <AppBar position="relative" color="default">
              <Toolbar className={classes.bottomToolbar}>
                    <div className={classes.grow}>
                      <Toolbar className={classes.inputToolbar}>
                        <IconButton onClick={boundHandleEmojiPickerChange} className={classes.emojiButton} color="inherit" aria-label="Menu">
                          <MoodIcon />
                        </IconButton>
                        {/*<ContentEditable
                          className={classes.inputDiv}
                          innerRef={this.newMessageDisplay}
                          html={emojify(this.state.messageHtml, 20)}
                          disabled={false}
                          onChange={boundHandleNewMessageChange}
                        />*/}



                        <div
                          id={'inputDiv'}
                          key={'inputDiv'}
                          className={classes.inputDiv}
                          contentEditable={true}
                          ref={this.inputDiv}
                          onInput={boundHandleNewMessageChange}
                          onClick={boundHandleNewMessageBlur}
                          onKeyDown={boundHandleNewMessageBlur}
                          onKeyPress={(event) => { if (event.charCode===13) {
                                                      event.preventDefault();
                                                      event.stopPropagation();
                                                      this.sendMessage();
                                                   }
                                                }}
                        />
                        {/*<TextField
                          className={classes.textField}
                          inputRef={this.newMessageInput}
                          defaultValue=""
                          autoFocus
                          placeholder="Type a message"
                          onChange={boundHandleNewMessageInput}
                        />*/}
                      </Toolbar>
                    </div>

                    <Button className={classes.micButton}
                            onPointerCancel={this.someEvent}
                            onContextMenu={this.someEvent}
                            onClick={this.sendMessage}
                            onPointerDown={this.someEvent}
                            onPointerUp={this.someEvent}
                            variant="fab" mini>
                        <SendIcon onClick={this.sendMessage}/></Button>

              </Toolbar>

            </AppBar>
          </Grid>
        </Grid>
      </ClickAwayListener>

    );
  }

  sendMessage = () => {
    if (this.messageText.trim().length > 0) {
      this.props.controller.getChatController().sendChat(
        this.props.counterpartId,
        this.messageText
            .replace(/[<]img[^>]*class[=]["]emoji["][^>]*alt[=]["]([^"]*)["][^>]*[>]/g, '$1')
            .replace(/[<]div[/]?[>]/g, '')
            .trim()
      );
      this.messageText = '';
      this.inputDiv.current.innerHTML='';
      this.inputDiv.current.focus();
      this.setState({showEmojiPicker: false});
      this.props.scrollToBottom();
    }
  };

  saveCursorPosition() {
    let sel = window.getSelection();
    let range = sel.getRangeAt(0);

    if (range) {
      this.startContainer = range.startContainer;
      this.startOffset    = range.startOffset;
      this.endContainer   = range.endContainer;
      this.endOffset      = range.endOffset;
      //console.log('repositioned at ' + range.startOffset + ' of ' + range.startContainer);
    } else {
      this.startContainer = null;
      this.startOffset    = null;
      this.endCointainer  = null;
      this.endOffset      = null;
    }
  }

  restoreCursorPosition() {
    var sel, range;

    sel = window.getSelection();
    if (sel.rangeCount) {
      range = sel.getRangeAt(0);

      this.inputDiv.current.focus();

      let refocus = !range.startContainer || (range.startContainer.id !== 'inputDiv' && range.startContainer.parentElement.id !== 'inputDiv');

      if (refocus) {
        sel = window.getSelection();
        range = sel.getRangeAt(0);
      }

      if (this.startContainer) {
        //console.log('repositioning to ' + this.startOffset + ' in:');
        //console.log(this.startContainer);
        range.setStart(this.startContainer, this.startOffset);
        range.setEnd(this.endContainer, this.endOffset);
      }
    }

  }

  insertTextAtCursor(text) {
      var sel, range;

      if (window.getSelection) {
          sel = window.getSelection();
          if (sel.getRangeAt) {
              if (sel.rangeCount) {
                range = sel.getRangeAt(0);
              } else {
                range = document.createRange();
              }

              let noSelection = range.startContainer == null;

              let foreignSelection = !noSelection && (range.startContainer.id !== 'inputDiv' && (range.startContainer.parentElment == null || range.startContainer.parentElement.id !== 'inputDiv'))

              let refocus = noSelection || foreignSelection;
              let savedCursorPosition = this.startContainer !== null;

              if (refocus) {
                //console.log('refocus');
                this.inputDiv.current.focus();
              }

              if (range && (range.startContainer !== null &&
                            range.startContainer.parentElement === null)) {
                  foreignSelection = true;
              }

              if (savedCursorPosition) {
                range.setStart(this.startContainer, this.startOffset);
                range.setEnd(this.endContainer, this.endOffset);
              }

              if (!savedCursorPosition && foreignSelection) {
                /*
                console.log('foreign range:');
                console.log(range);
                console.log('input:');
                console.log(this.inputDiv.current);
                console.log('start offset: ' + this.startOffset + ' of ');
                console.log(this.startContainer);
                console.log('end offset: ' + this.endOffset + ' of ');
                console.log(this.endContainer);
                */
                if (this.inputDiv.current.children.length === 0 ||
                    this.inputDiv.current.children[this.inputDiv.current.children-1].nodeType !== 3) {
                  let space = document.createTextNode('');
                  this.inputDiv.current.appendChild(space);
                  range.setStart(space, 0);
                  range.setEnd(space, 0);
                }

                //range.setStart(this.inputDiv.current.chi);
                //range.setEnd();
              }

              range.deleteContents();
              let imgstr = emojify(text, 20);
              let img = document.createElement('img');
              //img.setAttribute('', '');

              let re = /([^ =]+)[=]["]([^"]*)["]/g;

              var match = null;

              while ((match = re.exec(imgstr)) !== null) {
                img.setAttribute(match[1], match[2]);
              }

              let space = document.createTextNode('');

              let fragment = document.createDocumentFragment();

              fragment.appendChild(img);

              fragment.appendChild(space);

              range.insertNode( fragment );


              range.setStart(img.nextSibling, 0);
              range.setEnd(img.nextSibling, 0);

              this.startContainer = this.endContainer = space;
              this.startOffset = this.endOffset = 0;
          }
      } else if (document.selection && document.selection.createRange) {
          document.selection.createRange().text = text;
      }

      setTimeout( () => { this.restoreCursorPosition(); }, 0);
  }

}

export default withStyles(styles)(MessageInput);
