import { HashRouter, Route, Routes } from "react-router-dom";
import ConsoleShell from "@/components/layout/ConsoleShell";
import Home from "@/pages/Home";
import Paipan from "@/pages/Paipan";
import Bazi from "@/pages/paipan/Bazi";
import Ziwei from "@/pages/paipan/Ziwei";
import Astrolabe from "@/pages/paipan/Astrolabe";
import Qizheng from "@/pages/paipan/Qizheng";
import Fengshui from "@/pages/paipan/Fengshui";
import Hepan from "@/pages/Hepan";
import Kline from "@/pages/Kline";
import Zeri from "@/pages/Zeri";
import Zhanbu from "@/pages/Zhanbu";
import LiuYao from "@/pages/zhanbu/LiuYao";
import Meihua from "@/pages/zhanbu/Meihua";
import Qimen from "@/pages/zhanbu/Qimen";
import LiuRen from "@/pages/zhanbu/LiuRen";
import Taiyi from "@/pages/zhanbu/Taiyi";
import Huangji from "@/pages/zhanbu/Huangji";
import Wuyun from "@/pages/zhanbu/Wuyun";
import Tarot from "@/pages/zhanbu/Tarot";
import Lingqian from "@/pages/zhanbu/Lingqian";
import Dream from "@/pages/Dream";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<ConsoleShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/paipan" element={<Paipan />} />
          <Route path="/paipan/bazi" element={<Bazi />} />
          <Route path="/paipan/ziwei" element={<Ziwei />} />
          <Route path="/paipan/astrolabe" element={<Astrolabe />} />
          <Route path="/paipan/qizheng" element={<Qizheng />} />
          <Route path="/paipan/fengshui" element={<Fengshui />} />
          <Route path="/hepan" element={<Hepan />} />
          <Route path="/kline" element={<Kline />} />
          <Route path="/zeri" element={<Zeri />} />
          <Route path="/zhanbu" element={<Zhanbu />} />
          <Route path="/zhanbu/liuyao" element={<LiuYao />} />
          <Route path="/zhanbu/meihua" element={<Meihua />} />
          <Route path="/zhanbu/qimen" element={<Qimen />} />
          <Route path="/zhanbu/liuren" element={<LiuRen />} />
          <Route path="/zhanbu/taiyi" element={<Taiyi />} />
          <Route path="/zhanbu/huangji" element={<Huangji />} />
          <Route path="/zhanbu/wuyun" element={<Wuyun />} />
          <Route path="/zhanbu/tarot" element={<Tarot />} />
          <Route path="/zhanbu/lingqian" element={<Lingqian />} />
          <Route path="/dream" element={<Dream />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
