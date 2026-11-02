import { z } from "zod";
export const activitySchema = z.object({
  code: z.string().regex(/^\d{5}$/),
  met: z.number().positive().max(30),
  description: z.string().min(1),
  category: z.string(),
  source: z.string().url(),
  estimatedMET: z.boolean(),
});
export type Activity = z.infer<typeof activitySchema>;
// App labels supplement, never replace, the original 2024 descriptions and METs.
export const activityLabels: Record<string, string> = {
  "01009": "山地骑行（一般）",
  "01014": "骑行（一般）",
  "01200": "室内固定自行车（一般）",
  "01210": "室内自行车（25–30 W，轻强度）",
  "01214": "室内自行车（50 W，轻强度）",
  "01220": "室内自行车（90–100 W，中至高强度）",
  "01270": "动感单车课程",
  "03010": "芭蕾、现代舞或爵士舞（普通排练或课程）",
  "03011": "芭蕾练习",
  "03012": "芭蕾、现代舞或爵士舞（高强度表演）",
  "03028": "广场舞（芭蕾与藏族舞）",
  "03070": "当代舞（一般）",
  "03078": "爵士舞（一般）",
  "12010": "跑走结合（慢跑部分少于 10 分钟）",
  "12020": "慢跑（自选速度）",
  "12025": "原地慢跑",
  "12026": "慢跑（约 4.2–6.0 km/h）",
  "18260": "蛙泳（训练或比赛）",
  "18270": "蝶泳（一般）",
  "18310": "休闲游泳（非往返泳道）",
  "18320": "侧泳（一般）",
  "18355": "水中有氧健身（一般）",
  "17190": "中速步行（约 4.5–5.5 km/h，平地）",
  "17200": "快走（约 5.6–6.3 km/h，平地）",
  "17220": "很快步行（约 6.4–7.1 km/h）",
  "17160": "休闲散步",
  "17165": "遛狗",
  "17151": "很慢步行（低于 3.2 km/h）",
  "17152": "慢走（约 3.2–3.9 km/h）",
  "17131": "爬楼梯（一般）",
  "17133": "慢速爬楼梯",
  "17134": "快速爬楼梯",
  "17080": "越野徒步",
  "17081": "慢速徒步（不负重）",
  "02000": "有氧运动（一般）",
  "02005": "低冲击有氧舞蹈（中等强度）",
  "02006": "高冲击有氧舞蹈（高强度）",
  "02020": "徒手健身（高强度）",
  "02022": "徒手健身（中等强度）",
  "02024": "轻强度卷腹、平板支撑",
  "02032": "自重循环训练",
  "02048": "椭圆机（中等强度）",
  "02049": "椭圆机（高强度）",
  "02050": "力量训练（高强度）",
  "02054": "多动作力量训练（每组 8–15 次）",
  "02056": "自重力量训练（一般）",
  "02057": "自重力量训练（高强度）",
  "02068": "跳绳（一般）",
  "02071": "划船机（低于 100 W，中等强度）",
  "02072": "划船机（100–149 W，高强度）",
  "02101": "轻柔拉伸",
  "02103": "传统垫上普拉提",
  "02105": "普拉提（一般）",
  "02150": "哈他瑜伽",
  "02155": "热瑜伽",
  "02160": "力量瑜伽",
  "02175": "瑜伽（一般）",
  "02185": "流瑜伽",
  "02210": "间歇训练 HIIT（中等强度）",
  "02214": "间歇训练 HIIT（高强度）",
  "02310": "团体尊巴",
  "02315": "居家视频尊巴",
};
export const activityName = (a: Activity) =>
  activityLabels[a.code] ?? a.description;
let pending: Promise<Activity[]> | null = null;
export function loadActivities() {
  if (!pending)
    pending = fetch(`${import.meta.env.BASE_URL}data/exercises.json`)
      .then((r) => {
        if (!r.ok) throw new Error("运动库加载失败，请重试");
        return r.json();
      })
      .then((v) => {
        if (v.edition !== "2024 Adult") throw new Error("运动库版本不匹配");
        return activitySchema.array().min(1).parse(v.activities);
      })
      .catch((e) => {
        pending = null;
        throw e;
      });
  return pending;
}
