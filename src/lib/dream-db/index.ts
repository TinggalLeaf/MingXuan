import type { DreamEntry } from "../dream";
import { DB_人物 } from "./人物";
import { DB_动物 } from "./动物";
import { DB_植物 } from "./植物";
import { DB_物品 } from "./物品";
import { DB_身体 } from "./身体";
import { DB_活动 } from "./活动";
import { DB_生活 } from "./生活";
import { DB_自然 } from "./自然";
import { DB_鬼神 } from "./鬼神";
import { DB_建筑 } from "./建筑";
import { DB_其它 } from "./其它";
import { DB_情爱 } from "./情爱";

export const DEFAULT_DREAM_DB: DreamEntry[] = [
  ...(DB_人物),
  ...(DB_动物),
  ...(DB_植物),
  ...(DB_物品),
  ...(DB_身体),
  ...(DB_活动),
  ...(DB_生活),
  ...(DB_自然),
  ...(DB_鬼神),
  ...(DB_建筑),
  ...(DB_其它),
  ...(DB_情爱)
];
