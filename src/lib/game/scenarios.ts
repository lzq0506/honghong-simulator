export interface Scenario {
  id: string;
  title: string;
  /** 会话列表里的预览文案：她发来的最后一条消息 */
  preview: string;
  /** 会话列表右侧显示的深夜时间 */
  time: string;
  icon: "calendar" | "message" | "gamepad" | "dinner" | "clock" | "list";
  initialAnger: number;
  difficulty: 1 | 2 | 3;
  brief: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "anniversary",
    title: "忘记纪念日",
    preview: "你还有心思发朋友圈打球？",
    time: "23:12",
    icon: "calendar",
    initialAnger: 50,
    difficulty: 1,
    brief:
      "今天是你和女友在一起两周年纪念日。她提前一周就旁敲侧击地提醒过你，还悄悄订了你们第一次约会的那家餐厅。结果你完全忘了，晚上还在朋友圈发了和同事打球的照片。她生气的不是一个日期，而是觉得这段感情好像只有她一个人在用心记着。",
  },
  {
    id: "reply-slow",
    title: "回消息太慢",
    preview: "我烧到38度，你就回我三个字？",
    time: "22:47",
    icon: "message",
    initialAnger: 50,
    difficulty: 1,
    brief:
      "她今天发烧38度，中午给你发消息说难受，你因为开会隔了五个小时才回复，而且只回了三个字「多喝水」。她一个人在家，难受又委屈。她生气的不是你忙，而是她最需要你的时候，感觉不到你的在意。",
  },
  {
    id: "gaming",
    title: "游戏比她重要？",
    preview: "行，你打你的游戏吧",
    time: "23:25",
    icon: "gamepad",
    initialAnger: 60,
    difficulty: 2,
    brief:
      "她下班回家想跟你聊聊今天被领导冤枉的事，刚开口说了两句，你正戴着耳机和队友开黑，头也不抬地说「等我这把打完」。她默默回了房间，半小时后你去找她，发现她把门反锁了。她生气不是反对你打游戏，而是她想被倾听的时候，输给了游戏。",
  },
  {
    id: "dinner",
    title: "瞒着她的一顿饭",
    preview: "昨晚那顿饭，你是不是该跟我说点什么",
    time: "22:58",
    icon: "dinner",
    initialAnger: 60,
    difficulty: 2,
    brief:
      "你昨晚和一位女同事单独吃了顿饭谈项目，觉得没什么大事就没提。今天她从共同好友那里听说了这件事，发现你一直没主动说过，心里咯噔一下。她生气的不是那顿饭本身，而是你的隐瞒让她没有了安全感。",
  },
  {
    id: "late",
    title: "约会迟到四十分钟",
    preview: "我在雨里等了你四十分钟",
    time: "23:41",
    icon: "clock",
    initialAnger: 70,
    difficulty: 3,
    brief:
      "你们约好晚上七点看电影，她特意提前下班、化了妆，六点半就到了商场门口。结果你临时被朋友拉住打游戏，手机还没电了，七点四十才出现，她淋着小雨等了你整整四十分钟。她生气不只是因为等，而是觉得你把她排在了所有事情的最后。",
  },
  {
    id: "promise",
    title: "忘了她的交代",
    preview: "快递被退回去了，你知道吗",
    time: "00:07",
    icon: "list",
    initialAnger: 70,
    difficulty: 3,
    brief:
      "她这周出差，临走前反复交代你周三务必帮她取一份重要证件的快递，错过当天就会被退回。你满口答应，结果一忙全忘了，快递被退回了发货地。她晚上视频时问起，你才想起来。她生气的不是快递本身，而是她认真托付的事，在你这里一点都不重要。",
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
