export type ChatMessage = {
  id: string;
  content: string;
  user: string;
  role: "user" | "assistant";
  timestamp?: number;
};

export type Message =
  | {
      type: "add";
      id: string;
      content: string;
      user: string;
      role: "user" | "assistant";
      timestamp?: number;
    }
  | {
      type: "update";
      id: string;
      content: string;
      user: string;
      role: "user" | "assistant";
      timestamp?: number;
    }
  | {
      type: "all";
      messages: ChatMessage[];
    };

export const names = [
  "织女",
  "牛郎",
  "嫦娥",
  "月老",
  "玉兔",
  "吴刚",
  "星河",
  "云端",
  "鹊桥",
  "银河",
  "星辰",
  "月光",
  "七夕",
  "相思",
  "牵牛",
  "织云",
  "星河",
  "天孙",
  "金风",
  "玉露",
  "银河",
  "鹊仙",
  "星桥",
  "云锦",
  "天阶",
  "秋夕"
];
