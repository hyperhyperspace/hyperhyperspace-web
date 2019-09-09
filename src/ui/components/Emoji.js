import React from 'react';

import twemoji from 'twemoji';

class Emoji extends React.Component {

  /* constructor(props) {
    super(props);
  } useless-constructor */

  render() {

    const { text, size} = this.props;
    const { onClick } = this.props;

    return (

      <div onClick={onClick} dangerouslySetInnerHTML={{ __html: twemoji.parse(text, {size: 72})
                      .replace('<img ', "<img height='" + size + "' width='" + size + "' ") }}>
         </div>
    );
  }
}

export default Emoji;
