type Color =
  | `#${string}`
  | `rgb(${number}, ${number}, ${number})`
  | `rgba(${number}, ${number}, ${number}, ${number})`;
// 你的对象类型
export interface DifficultyItem {
  dty: string;
  color: Color;
}

// 固定长度 4 的数组
export type DifficultyCart = [
  DifficultyItem,
  DifficultyItem,
  DifficultyItem,
  DifficultyItem,
];
