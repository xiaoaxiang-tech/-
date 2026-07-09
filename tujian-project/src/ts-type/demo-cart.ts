type Color =
  | `#${string}`
  | `rgb(${number}, ${number}, ${number})`
  | `rgba(${number}, ${number}, ${number}, ${number})`;

// 年份：4 位数字
type Year =
  `${string & number}${string & number}${string & number}${string & number}`;

// 月份：01~12
type Month = `0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | `1${0 | 1 | 2}`;

// 日期：01~31
type Day =
  | `0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
  | `1${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
  | `2${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
  | `3${0 | 1}`;

// 最终严格日期类型
type FormatDate = `${Year}/${Month}/${Day}` | `${Year}-${Month}-${Day}`;
type Diffty = "简单" | "中等" | "困难";
export interface IdemoCart {
  id:number
  color: Color;
  css: `${number}%`;
  dateTime: FormatDate;
  difflty: Diffty;
  html: `${number}%`;
  js: `${number}%`;
  video: string;
  url:string;
  demoexplain: {
    title:string,
    realize:string,
    Highlights:string,
    Challenges:string
  }
}


export interface IdemoExplain {
  color:string,
  difflty:"简单" | "中等" | "困难";
  url:string,
  title:string,
  realize:string,
  Highlights:string,
  Challenges:string
}