/**
 * 地点搜索服务 · 经纬度自动查询
 *
 * 支持两种地图服务（用户在「设置 → 地点服务」中配置 API Key 后启用）：
 *   - 高德地图 (Amap)：restapi.amap.com/v3/place/text
 *   - 百度地图 (Baidu)：api.map.baidu.com/place/v2/search
 *
 * 无 API Key / 网络失败 → 自动降级到内置 CITY_DB（覆盖 ~150 个常用市/区）。
 *
 * API Key 持久化到 localStorage（"mingxuan.location.key"），用户自行申请。
 * 高德申请：https://lbs.amap.com/dev/key/app  (Web 端 / JS API Key)
 * 百度申请：https://lbsyun.baidu.com/apiconsole/key
 */

export type LocationProvider = "amap" | "baidu" | "local";

export interface LocationResult {
  /** 完整地名（含省市） */
  name: string;
  /** 经度，°E */
  longitude: number;
  /** 纬度，°N */
  latitude: number;
  /** 时区偏移（小时） */
  timezone: number;
  /** 行政区编码 */
  code?: string;
  /** 数据来源（amap / baidu / local） */
  source: LocationProvider;
  /** 原始数据 */
  raw?: unknown;
}

const LS_KEY = "mingxuan.location";
const TIMEOUT = 10000;

export interface LocationConfig {
  provider: LocationProvider;
  apiKey: string;
  /** 高德「安全密钥」或百度「SN 校验」等扩展字段（可选） */
  security?: string;
}

export function loadLocationConfig(): LocationConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { provider: "local", apiKey: "", ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { provider: "local", apiKey: "" };
}

export function saveLocationConfig(cfg: LocationConfig) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent("mx-location-config-changed"));
  } catch { /* ignore */ }
}

// ===== 高德地图 =====
// 文档：https://lbs.amap.com/api/webservice/guide/api/search

interface AmapResponse {
  status: string;
  info: string;
  pois?: Array<{ name: string; location: string; adcode?: string; address?: string }>;
  suggestion?: { cities?: Array<{ name: string; location?: string; adcode?: string }> };
}

async function searchAmap(q: string, apiKey: string): Promise<LocationResult[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(`https://restapi.amap.com/v3/place/text?key=${encodeURIComponent(apiKey)}&keywords=${encodeURIComponent(q)}&offset=10&extensions=base`, {
      signal: ctrl.signal,
    });
    const data = (await r.json()) as AmapResponse;
    if (data.status !== "1") return [];
    const out: LocationResult[] = [];
    if (data.pois) {
      for (const p of data.pois) {
        const [lng, lat] = p.location.split(",").map(Number);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        out.push({
          name: [p.name, p.address].filter(Boolean).join(" ").slice(0, 80),
          longitude: lng,
          latitude: lat,
          timezone: Math.round(lng / 15),
          code: p.adcode,
          source: "amap",
          raw: p,
        });
      }
    }
    if (data.suggestion?.cities) {
      for (const c of data.suggestion.cities) {
        if (!c.location) continue;
        const [lng, lat] = c.location.split(",").map(Number);
        out.push({
          name: c.name,
          longitude: lng,
          latitude: lat,
          timezone: Math.round(lng / 15),
          code: c.adcode,
          source: "amap",
          raw: c,
        });
      }
    }
    return out;
  } finally {
    clearTimeout(t);
  }
}

// ===== 百度地图 =====
// 文档：https://lbsyun.baidu.com/index.php?title=webapi/guide/webservice-placeapi

interface BaiduResponse {
  status: number;
  message: string;
  results?: Array<{ name: string; location: { lat: number; lng: number }; address?: string; adcode?: string }>;
}

async function searchBaidu(q: string, apiKey: string): Promise<LocationResult[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(`https://api.map.baidu.com/place/v2/search?ak=${encodeURIComponent(apiKey)}&output=json&query=${encodeURIComponent(q)}&region=全国&city_limit=false`, {
      signal: ctrl.signal,
    });
    const data = (await r.json()) as BaiduResponse;
    if (data.status !== 0) return [];
    return (data.results ?? []).map((r) => ({
      name: [r.name, r.address].filter(Boolean).join(" ").slice(0, 80),
      longitude: r.location.lng,
      latitude: r.location.lat,
      timezone: Math.round(r.location.lng / 15),
      code: r.adcode,
      source: "baidu",
      raw: r,
    }));
  } finally {
    clearTimeout(t);
  }
}

// ===== 内置城市库（降级方案） =====

const CITY_DB: Record<string, { lng: number; lat: number; tz: number }> = {
  "北京": { lng: 116.4074, lat: 39.9042, tz: 8 },
  "上海": { lng: 121.4737, lat: 31.2304, tz: 8 },
  "广州": { lng: 113.2644, lat: 23.1291, tz: 8 },
  "深圳": { lng: 114.0579, lat: 22.5431, tz: 8 },
  "杭州": { lng: 120.1551, lat: 30.2741, tz: 8 },
  "南京": { lng: 118.7969, lat: 32.0603, tz: 8 },
  "苏州": { lng: 120.5853, lat: 31.2989, tz: 8 },
  "成都": { lng: 104.0668, lat: 30.5728, tz: 8 },
  "重庆": { lng: 106.5516, lat: 29.5630, tz: 8 },
  "武汉": { lng: 114.3055, lat: 30.5928, tz: 8 },
  "西安": { lng: 108.9398, lat: 34.3416, tz: 8 },
  "天津": { lng: 117.1901, lat: 39.1255, tz: 8 },
  "青岛": { lng: 120.3826, lat: 36.0671, tz: 8 },
  "厦门": { lng: 118.1101, lat: 24.4905, tz: 8 },
  "福州": { lng: 119.2965, lat: 26.0745, tz: 8 },
  "济南": { lng: 117.1201, lat: 36.6512, tz: 8 },
  "郑州": { lng: 113.6253, lat: 34.7466, tz: 8 },
  "长沙": { lng: 112.9388, lat: 28.2282, tz: 8 },
  "合肥": { lng: 117.2272, lat: 31.8206, tz: 8 },
  "南昌": { lng: 115.8921, lat: 28.6765, tz: 8 },
  "昆明": { lng: 102.8329, lat: 24.8801, tz: 8 },
  "贵阳": { lng: 106.7135, lat: 26.5783, tz: 8 },
  "南宁": { lng: 108.3669, lat: 22.8170, tz: 8 },
  "海口": { lng: 110.3312, lat: 20.0311, tz: 8 },
  "三亚": { lng: 109.5085, lat: 18.2528, tz: 8 },
  "拉萨": { lng: 91.1322, lat: 29.6603, tz: 8 },
  "乌鲁木齐": { lng: 87.6177, lat: 43.7928, tz: 8 },
  "兰州": { lng: 103.8236, lat: 36.0581, tz: 8 },
  "西宁": { lng: 101.7782, lat: 36.6171, tz: 8 },
  "银川": { lng: 106.2309, lat: 38.4872, tz: 8 },
  "呼和浩特": { lng: 111.7519, lat: 40.8414, tz: 8 },
  "哈尔滨": { lng: 126.5358, lat: 45.8023, tz: 8 },
  "长春": { lng: 125.3245, lat: 43.8868, tz: 8 },
  "沈阳": { lng: 123.4291, lat: 41.7968, tz: 8 },
  "大连": { lng: 121.6147, lat: 38.9140, tz: 8 },
  "石家庄": { lng: 114.5149, lat: 38.0428, tz: 8 },
  "太原": { lng: 112.5489, lat: 37.8706, tz: 8 },
  "宁波": { lng: 121.5440, lat: 29.8683, tz: 8 },
  "无锡": { lng: 120.3119, lat: 31.4912, tz: 8 },
  "温州": { lng: 120.6720, lat: 28.0007, tz: 8 },
  "佛山": { lng: 113.1216, lat: 23.0218, tz: 8 },
  "东莞": { lng: 113.7518, lat: 23.0207, tz: 8 },
  "珠海": { lng: 113.5767, lat: 22.2707, tz: 8 },
  "汕头": { lng: 116.6822, lat: 23.3535, tz: 8 },
  "中山": { lng: 113.3927, lat: 22.5180, tz: 8 },
  "惠州": { lng: 114.4168, lat: 23.1115, tz: 8 },
  "柳州": { lng: 109.4280, lat: 24.3263, tz: 8 },
  "桂林": { lng: 110.2900, lat: 25.2736, tz: 8 },
  "泉州": { lng: 118.6757, lat: 24.8741, tz: 8 },
  "烟台": { lng: 121.4480, lat: 37.4638, tz: 8 },
  "潍坊": { lng: 119.1619, lat: 36.7068, tz: 8 },
  "临沂": { lng: 118.3564, lat: 35.1046, tz: 8 },
  "唐山": { lng: 118.1750, lat: 39.6308, tz: 8 },
  "保定": { lng: 115.4848, lat: 38.8740, tz: 8 },
  "邯郸": { lng: 114.5390, lat: 36.6253, tz: 8 },
  "秦皇岛": { lng: 119.6005, lat: 39.9354, tz: 8 },
  "邢台": { lng: 114.5048, lat: 37.0707, tz: 8 },
  "沧州": { lng: 116.8388, lat: 38.3037, tz: 8 },
  "廊坊": { lng: 116.6836, lat: 39.5378, tz: 8 },
  "大同": { lng: 113.2954, lat: 40.0903, tz: 8 },
  "临汾": { lng: 111.5180, lat: 36.0880, tz: 8 },
  "运城": { lng: 110.9748, lat: 35.0271, tz: 8 },
  "包头": { lng: 109.8404, lat: 40.6574, tz: 8 },
  "鄂尔多斯": { lng: 109.7811, lat: 39.6086, tz: 8 },
  "赤峰": { lng: 118.8889, lat: 42.2587, tz: 8 },
  "通辽": { lng: 122.2656, lat: 43.6173, tz: 8 },
  "齐齐哈尔": { lng: 123.9180, lat: 47.3543, tz: 8 },
  "大庆": { lng: 125.1045, lat: 46.5897, tz: 8 },
  "佳木斯": { lng: 130.3186, lat: 46.7997, tz: 8 },
  "牡丹江": { lng: 129.6320, lat: 44.5826, tz: 8 },
  "吉林": { lng: 126.5494, lat: 43.8378, tz: 8 },
  "延吉": { lng: 129.5136, lat: 42.9069, tz: 8 },
  "通化": { lng: 125.9395, lat: 41.7211, tz: 8 },
  "本溪": { lng: 123.7651, lat: 41.2864, tz: 8 },
  "鞍山": { lng: 122.9946, lat: 41.1086, tz: 8 },
  "抚顺": { lng: 123.9572, lat: 41.8806, tz: 8 },
  "锦州": { lng: 121.1268, lat: 41.0954, tz: 8 },
  "营口": { lng: 122.2351, lat: 40.6675, tz: 8 },
  "葫芦岛": { lng: 120.8366, lat: 40.7110, tz: 8 },
  "盘锦": { lng: 122.0707, lat: 41.1245, tz: 8 },
  "丹东": { lng: 124.3543, lat: 40.0007, tz: 8 },
  "朝阳": { lng: 120.4509, lat: 41.5757, tz: 8 },
  "铁岭": { lng: 123.7263, lat: 42.2233, tz: 8 },
  "阜新": { lng: 121.6588, lat: 42.0119, tz: 8 },
  "辽阳": { lng: 123.1736, lat: 41.2680, tz: 8 },
  "镇江": { lng: 119.4250, lat: 32.1894, tz: 8 },
  "常州": { lng: 119.9740, lat: 31.8113, tz: 8 },
  "南通": { lng: 120.8943, lat: 31.9802, tz: 8 },
  "扬州": { lng: 119.4129, lat: 32.3935, tz: 8 },
  "盐城": { lng: 120.1633, lat: 33.3500, tz: 8 },
  "淮安": { lng: 119.0149, lat: 33.5972, tz: 8 },
  "连云港": { lng: 119.2228, lat: 34.5970, tz: 8 },
  "徐州": { lng: 117.1881, lat: 34.2716, tz: 8 },
  "宿迁": { lng: 118.2752, lat: 33.9630, tz: 8 },
  "泰州": { lng: 119.9251, lat: 32.4554, tz: 8 },
  "绍兴": { lng: 120.5810, lat: 30.0298, tz: 8 },
  "嘉兴": { lng: 120.7506, lat: 30.7622, tz: 8 },
  "湖州": { lng: 120.0880, lat: 30.8921, tz: 8 },
  "金华": { lng: 119.6473, lat: 29.0784, tz: 8 },
  "台州": { lng: 121.4208, lat: 28.6560, tz: 8 },
  "舟山": { lng: 122.2558, lat: 29.9854, tz: 8 },
  "衢州": { lng: 118.8593, lat: 28.9701, tz: 8 },
  "丽水": { lng: 119.9229, lat: 28.4516, tz: 8 },
  "黄山": { lng: 118.3376, lat: 29.7148, tz: 8 },
  "铜陵": { lng: 117.8121, lat: 30.9295, tz: 8 },
  "芜湖": { lng: 118.3762, lat: 31.3266, tz: 8 },
  "蚌埠": { lng: 117.3890, lat: 32.9163, tz: 8 },
  "淮南": { lng: 117.0185, lat: 32.6473, tz: 8 },
  "马鞍山": { lng: 118.5060, lat: 31.6700, tz: 8 },
  "安庆": { lng: 117.0635, lat: 30.5430, tz: 8 },
  "滁州": { lng: 118.3168, lat: 32.3019, tz: 8 },
  "阜阳": { lng: 115.8147, lat: 32.8901, tz: 8 },
  "宿州": { lng: 116.9839, lat: 33.6464, tz: 8 },
  "六安": { lng: 116.5076, lat: 31.7525, tz: 8 },
  "亳州": { lng: 115.7787, lat: 33.8693, tz: 8 },
  "池州": { lng: 117.4915, lat: 30.6646, tz: 8 },
  "宣城": { lng: 118.7587, lat: 30.9407, tz: 8 },
  "莆田": { lng: 119.0078, lat: 25.4540, tz: 8 },
  "宁德": { lng: 119.5275, lat: 26.6592, tz: 8 },
  "龙岩": { lng: 117.0297, lat: 25.0915, tz: 8 },
  "三明": { lng: 117.6390, lat: 26.2655, tz: 8 },
  "南平": { lng: 118.1780, lat: 26.6418, tz: 8 },
  "赣州": { lng: 114.9350, lat: 25.8311, tz: 8 },
  "九江": { lng: 115.9920, lat: 29.7121, tz: 8 },
  "上饶": { lng: 117.9433, lat: 28.4549, tz: 8 },
  "抚州": { lng: 116.3582, lat: 27.9839, tz: 8 },
  "宜春": { lng: 114.3911, lat: 27.8043, tz: 8 },
  "吉安": { lng: 114.9866, lat: 27.1138, tz: 8 },
  "赣榆": { lng: 119.1235, lat: 34.8394, tz: 8 },
  "日照": { lng: 119.5268, lat: 35.4164, tz: 8 },
  "莱芜": { lng: 117.6758, lat: 36.2154, tz: 8 },
  "淄博": { lng: 118.0548, lat: 36.8131, tz: 8 },
  "东营": { lng: 118.6747, lat: 37.4338, tz: 8 },
  "威海": { lng: 122.1206, lat: 37.5128, tz: 8 },
  "济宁": { lng: 116.5871, lat: 35.4154, tz: 8 },
  "泰安": { lng: 117.1289, lat: 36.1949, tz: 8 },
  "滨州": { lng: 117.9706, lat: 37.3835, tz: 8 },
  "德州": { lng: 116.3575, lat: 37.4355, tz: 8 },
  "聊城": { lng: 115.9854, lat: 36.4566, tz: 8 },
  "菏泽": { lng: 115.4810, lat: 35.2333, tz: 8 },
  "枣庄": { lng: 117.3239, lat: 34.8108, tz: 8 },
  "开封": { lng: 114.3415, lat: 34.7972, tz: 8 },
  "洛阳": { lng: 112.4540, lat: 34.6197, tz: 8 },
  "平顶山": { lng: 113.1923, lat: 33.7660, tz: 8 },
  "焦作": { lng: 113.2418, lat: 35.2159, tz: 8 },
  "鹤壁": { lng: 114.2975, lat: 35.7475, tz: 8 },
  "新乡": { lng: 113.9268, lat: 35.3030, tz: 8 },
  "安阳": { lng: 114.3925, lat: 36.0986, tz: 8 },
  "濮阳": { lng: 115.0240, lat: 35.7681, tz: 8 },
  "许昌": { lng: 113.8262, lat: 34.0370, tz: 8 },
  "漯河": { lng: 114.0167, lat: 33.5814, tz: 8 },
  "三门峡": { lng: 111.2003, lat: 34.7726, tz: 8 },
  "南阳": { lng: 112.5288, lat: 32.9908, tz: 8 },
  "商丘": { lng: 115.6505, lat: 34.4148, tz: 8 },
  "信阳": { lng: 114.0913, lat: 32.1473, tz: 8 },
  "周口": { lng: 114.6497, lat: 33.6204, tz: 8 },
  "驻马店": { lng: 114.0249, lat: 32.9802, tz: 8 },
  "黄石": { lng: 115.0772, lat: 30.1985, tz: 8 },
  "十堰": { lng: 110.7980, lat: 32.6299, tz: 8 },
  "宜昌": { lng: 111.2865, lat: 30.6919, tz: 8 },
  "襄阳": { lng: 112.1226, lat: 32.0090, tz: 8 },
  "鄂州": { lng: 114.8949, lat: 30.3965, tz: 8 },
  "荆门": { lng: 112.2049, lat: 31.0354, tz: 8 },
  "孝感": { lng: 113.9165, lat: 30.9263, tz: 8 },
  "荆州": { lng: 112.2410, lat: 30.3346, tz: 8 },
  "黄冈": { lng: 114.8721, lat: 30.4533, tz: 8 },
  "咸宁": { lng: 114.3220, lat: 29.8410, tz: 8 },
  "恩施": { lng: 109.4884, lat: 30.2722, tz: 8 },
  "随州": { lng: 113.3833, lat: 31.6900, tz: 8 },
  "株洲": { lng: 113.1312, lat: 27.8358, tz: 8 },
  "湘潭": { lng: 112.9440, lat: 27.8297, tz: 8 },
  "衡阳": { lng: 112.5722, lat: 26.8943, tz: 8 },
  "邵阳": { lng: 111.4677, lat: 27.2389, tz: 8 },
  "岳阳": { lng: 113.1289, lat: 29.3572, tz: 8 },
  "常德": { lng: 111.6990, lat: 29.0317, tz: 8 },
  "张家界": { lng: 110.4791, lat: 29.1170, tz: 8 },
  "益阳": { lng: 112.3551, lat: 28.5547, tz: 8 },
  "郴州": { lng: 113.0149, lat: 25.7707, tz: 8 },
  "永州": { lng: 111.6132, lat: 26.4194, tz: 8 },
  "怀化": { lng: 110.0012, lat: 27.5589, tz: 8 },
  "娄底": { lng: 111.9968, lat: 27.7280, tz: 8 },
  "香港": { lng: 114.1694, lat: 22.3193, tz: 8 },
  "澳门": { lng: 113.5491, lat: 22.1987, tz: 8 },
  "台北": { lng: 121.5654, lat: 25.0330, tz: 8 },
  "高雄": { lng: 120.3014, lat: 22.6273, tz: 8 },
  "台中": { lng: 120.6709, lat: 24.1477, tz: 8 },
  "基隆": { lng: 121.7418, lat: 25.1302, tz: 8 },
  "新竹": { lng: 120.9675, lat: 24.8138, tz: 8 },
  "台南": { lng: 120.2056, lat: 22.9999, tz: 8 },
  "桃园": { lng: 121.3010, lat: 24.9936, tz: 8 },
};

function searchLocalDb(q: string): LocationResult[] {
  const norm = q.trim();
  if (!norm) return [];
  const out: LocationResult[] = [];
  if (CITY_DB[norm]) out.push({ name: norm, longitude: CITY_DB[norm].lng, latitude: CITY_DB[norm].lat, timezone: CITY_DB[norm].tz, source: "local" });
  for (const [name, v] of Object.entries(CITY_DB)) {
    if (name === norm) continue;
    if (name.startsWith(norm) || name.includes(norm)) {
      out.push({ name, longitude: v.lng, latitude: v.lat, timezone: v.tz, source: "local" });
    }
  }
  return out.slice(0, 10);
}

/** 主入口：按配置 provider 调用 Rust 后端，无 Key 时降级到本地库 */
export async function searchLocation(q: string): Promise<LocationResult[]> {
  if (!q.trim()) return [];
  const cfg = loadLocationConfig();
  // 1) 优先走 Tauri Rust 后端（绕过 CORS、可隐藏 API Key）
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const r = await invoke<LocationResult[]>("location_lookup", {
      provider: cfg.provider,
      apiKey: cfg.apiKey,
      q,
    });
    if (r && r.length) return r;
  } catch {
    /* 非 Tauri 环境或后端命令缺失 */
  }
  // 2) 浏览器直连（仅作为兜底）
  try {
    if (cfg.provider === "amap" && cfg.apiKey) {
      const r = await searchAmap(q, cfg.apiKey);
      if (r.length) return r;
    } else if (cfg.provider === "baidu" && cfg.apiKey) {
      const r = await searchBaidu(q, cfg.apiKey);
      if (r.length) return r;
    }
  } catch {
    /* 失败 → 降级 */
  }
  // 3) 内置库兜底
  return searchLocalDb(q);
}

/** 反向地理编码（经纬度 → 地名） */
export async function reverseGeocode(lng: number, lat: number): Promise<LocationResult | null> {
  const cfg = loadLocationConfig();
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const name = await invoke<string | null>("location_regeo", {
      provider: cfg.provider,
      apiKey: cfg.apiKey,
      longitude: lng,
      latitude: lat,
    });
    if (name) {
      return { name, longitude: lng, latitude: lat, timezone: Math.round(lng / 15), source: cfg.provider };
    }
  } catch { /* ignore */ }
  return null;
}

/** 浏览器原生定位（GPS/WiFi） */
export function getCurrentLocation(): Promise<LocationResult | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        const remote = await reverseGeocode(lng, lat).catch(() => null);
        resolve(
          remote ?? {
            name: "当前位置",
            longitude: lng,
            latitude: lat,
            timezone: Math.round(lng / 15),
            source: "local",
          },
        );
      },
      () => resolve(null),
      { timeout: 8000 },
    );
  });
}