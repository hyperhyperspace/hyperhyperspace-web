

const VIEW_CHATS_SUMMARY = 'chats_summary';
const VIEW_CHAT          = 'chat';
const CHATS_VIEWS        = [VIEW_CHATS_SUMMARY, VIEW_CHAT];

const chatsSummaryExample = [
  {
    type: 'user-chat',
    recipientId: 'ccc',
    recipientName: 'Batman',
    recipientNameUrl: 'batman',
    recipientImage: null,
    lastMessageUserIsSender: true,
    lastMessageStatus: 'read',
    lastMessageContent: 'Batman, my man, are you there?',
    lastMessageTime: '22:03',
  },
  {
    type: 'user-chat',
    recipientId: 'bbb',
    recipientName: 'Bugs Bunny',
    recipientNameUrl: 'bugs-bunny',
    recipientImage: null,
    lastMessageUserIsSender: false,
    lastMessageStatus: null,
    lastMessageContent: 'Hello folks!',
    lastMessageTime: '03:22',
  },
  {
    type: 'user-chat',
    recipientId: 'ddd',
    recipientName: 'Dr. Strangelove',
    recipientNameUrl: 'dr-strangelove',
    recipientImage: null,
    lastMessageUserIsSender: true,
    lastMessageStatus: 'received',
    lastMessageContent: 'How is the bomb coming doctor?',
    lastMessageTime: 'Yesterday'
  },
  {
    type: 'user-chat',
    recipientId: 'eee',
    recipientName: 'Mahatma Gandhi',
    recipientNameUrl: 'mahatma-gandhi',
    recipientImage: null,
    lastMessageUserIsSender: true,
    lastMessageStatus: 'sent',
    lastMessageContent: 'Are we protesting today Mahatma?',
    lastMessageTime: 'Yesterday'
  },
];

const chatsExample = {
  ccc: {
    type: 'user-chat',
    recipientId: 'ccc',
    recipientName: 'Batman',
    recipientNameUrl: 'batman',
    recipientImage: null,
    messages: [
        {
          id: 'xjakjkasjaksjd',
          userName: null,
          userIsSender: true,
          messageContent: 'Batman, my man, are you there?',
          messageDate: '22:03 PM',
          isSent: true,
          isReceived: true,
          isRead: true,
        },
      ],
  },
  bbb: {
    type: 'user-chat',
    recipientId: 'bbb',
    recipientName: 'Bugs Bunny',
    recipientNameUrl: 'bugs-bunny',
    recipientImage: null,
    messages: [
    ],
  },
  ddd: {
    type: 'user-chat',
    recipientId: 'ddd',
    recipientName: 'Dr. Strangelove',
    recipientNameUrl: 'dr-strangelove',
    recipientImage: null,
    messages: [
    ],
  },
  eee: {
    type: 'user-chat',
    recipientId: 'eee',
    recipientName: 'Mahatma Gandhi',
    recipientNameUrl: 'mahatma-gandhi',
    recipientImage: null,
    messages: [
    ],
  },
};


class ChatsController {

  VIEW_CHATS_SUMMARY() {
    return VIEW_CHATS_SUMMARY;
  }

  VIEW_CHAT() {
    return VIEW_CHAT;
  }


  constructor() {
    this.subscriptions = new Map();
  }

  emitAction(action) {

  }

  queryView(params) {

    if (params['view'] === VIEW_CHATS_SUMMARY) {
      window.setTimeout(() => { params['callback'](params, this._retrieveChatsSummary(params)); }, 0);
    } else if (params['view'] === VIEW_CHAT) {
      window.setTimeout(() => { params['callback'](params, this._retrieveChats(params)); }, 0);
    }

  }

  subscribeToView(params) {
    params['subscribe'] = true;
    this.queryView(params);
  }

  unsubscribeFromView(id) {

  }

  _retrieveChats(params) {
    if (params['recipientId'] in chatsExample){
      return chatsExample[params['recipientId']];
    } else {
      return null;
    }
  }

  _retrieveChatsSummary(params) {
    return chatsSummaryExample;
  }

}

export default ChatsController;
