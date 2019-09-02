import React from 'react';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import withWidth from '@material-ui/core/withWidth';

import SwipeableViews from 'react-swipeable-views';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import Button from '@material-ui/core/Button';

import MoodIcon from '@material-ui/icons/Mood';
import PetsIcon from '@material-ui/icons/Pets';
import FastFoodIcon from '@material-ui/icons/Fastfood';
import DirectionsRunIcon from '@material-ui/icons/DirectionsRun';
import DirectionsCarIcon from '@material-ui/icons/DirectionsCar';
import ToysIcon from '@material-ui/icons/Toys';
import CodeIcon from '@material-ui/icons/Code';
import FlagIcon from '@material-ui/icons/Flag';

import { ordered, lib } from 'emojilib';

import Emoji from './Emoji.js';

let categories = new Map();

ordered.forEach(
  name => {
      let e = lib[name];
      let categoryList = categories.get(e.category);
      if (!categoryList) {
        categoryList = [];
        categories.set(e.category, categoryList);
      }
      categoryList.push(name);
  }
);

let category_keys = ['people', 'animals_and_nature', 'food_and_drink', 'activity',
                      'travel_and_places', 'objects', 'symbols', 'flags'];
let category_names = ['Smileys & People', 'Animals & Nature', 'Food & Drink', 'Activity',
                      'Travel & Places', 'Objects', 'Symbols', 'Flags'];
let category_emoji = ['😀', '🐻', '🍔', '⚽', '🚘', '💡', '#⃣', '🏳'];

let category_icons = [<MoodIcon />, <PetsIcon /> , <FastFoodIcon />,
                      <DirectionsRunIcon />, <DirectionsCarIcon />, <ToysIcon />,
                      <CodeIcon />, <FlagIcon />,]

// categories are: people, objects, activity, animals & nature, food & drink,
//                 travel & places, symbols, flags

const scrollSize = 100;
const fullSize = scrollSize * 5;



class EmojiPicker extends React.Component {

  constructor(props) {
    super(props);

    const { width }   = this.props;
    const isSmallDevice = this.isSmallWidth(width);

    this.state = { selectedIdx: 0, shownEmojisPerTab: Array(category_keys.length).fill(isSmallDevice?scrollSize:fullSize)};
  }

  handleTabChange(ev, value) {
    this.setState((state, props) => {
      if (state.selecetdIdx === value) {
        return { }
      } else {
        const { width }   = this.props;
        const isSmallDevice = this.isSmallWidth(width);

        return {selectedIdx: value, shownEmojisPerTab: Array(category_keys.length).fill(isSmallDevice?scrollSize:fullSize)};
      }

    });
  }

  handleChangeSelectedIdx(idx) {
    this.setState({selectedIdx: idx});
  }



  handleScroll(e) {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
    if (bottom) {


      this.setState((state, props) => {
        if (state.shownEmojisPerTab[state.selectedIdx] < categories.get(category_keys[state.selectedIdx]).length) {
          //alert(categories.get(category_keys[state.selectedIdx]).length + ' < ' + state.shownEmojisPerTab[state.selectedIdx]);
          let a = state.shownEmojisPerTab.slice();
          a[state.selectedIdx] = a[state.selectedIdx] + scrollSize;

          return { shownEmojisPerTab : a };
        } else {
          return { };
        }
      });


    }
  }

  isSmallWidth(width) {
    return width === 'xs' || width === 'sm';
  }

  render() {

    const { width }   = this.props;
    const isSmallDevice = this.isSmallWidth(width);

    let boundHandleTabChange         = this.handleTabChange.bind(this);
    let boundHandleChangeSelectedIdx = this.handleChangeSelectedIdx.bind(this);
    let boundHandleScroll            = this.handleScroll.bind(this);



    return (
      <Paper elevation={1} >

        <Tabs value={this.state.selectedIdx} onChange={boundHandleTabChange}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(
            idx => (<Tab style={{minWidth: (isSmallDevice? '40px' : '80px')}} icon={category_icons[idx]} />)
          )}
        </Tabs>
        {/*<SwipeableViews index={this.state.selectedIdx} onChangeIndex={boundHandleTabChange}>*/}
          {/*{[0, 1, 2, 3, 4, 5, 6, 7].map(
            idx => (*/}
                <Grid container style={{height: (isSmallDevice? '100px' : '150px'), overflow:'scroll'}} onScroll={boundHandleScroll} spacing={8}>
                  {categories.get(category_keys[this.state.selectedIdx]).slice(0, this.state.shownEmojisPerTab[this.state.selectedIdx]).map((key, i) =>
                    <Grid key={key + '-grid'} item>
                      <Emoji key={key} onClick={((ev) => {this.props.onEmoji((lib[key].char));ev.preventDefault(); ev.stopPropagation();})} text={lib[key].char} size='28px' />
                    </Grid>
                  )}
                </Grid>
            {/*)}*/}
         {/*</SwipeableViews>*/}
      </Paper>
     );;
  }

}

export default withWidth()(EmojiPicker);
