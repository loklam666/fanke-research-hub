// 向 scripts/companies.json 追加世界500强/中国500强公司
// 用法: node scripts/add-companies.mjs（本文件为一次性导入数据源，之后可删或保留备用）
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, 'companies.json');

const additions = [
  // ===== 能源与化工（中国500强主力） =====
  { slug: 'sinopec', name: 'Sinopec', nameZh: '中国石化', domain: 'sinopec.com', industry: '能源与化工' },
  { slug: 'cnpc', name: 'CNPC', nameZh: '中国石油', domain: 'cnpc.com.cn', industry: '能源与化工' },
  { slug: 'cnooc', name: 'CNOOC', nameZh: '中国海油', domain: 'cnooc.com.cn', industry: '能源与化工' },
  { slug: 'sgcc', name: 'State Grid', nameZh: '国家电网', domain: 'sgcc.com.cn', industry: '能源与化工' },
  { slug: 'csg', name: 'China Southern Power Grid', nameZh: '南方电网', domain: 'csg.cn', industry: '能源与化工' },
  { slug: 'sinochem', name: 'Sinochem', nameZh: '中国中化', domain: 'sinochem.com', industry: '能源与化工' },
  { slug: 'whchem', name: 'Wanhua Chemical', nameZh: '万华化学', domain: 'whchem.com', industry: '能源与化工' },
  // ===== 电力 =====
  { slug: 'chnenergy', name: 'CHN Energy', nameZh: '国家能源集团', domain: 'chnenergy.com.cn', industry: '能源与化工' },
  { slug: 'chng', name: 'China Huaneng', nameZh: '华能集团', domain: 'chng.com.cn', industry: '能源与化工' },
  { slug: 'china-cdt', name: 'China Datang', nameZh: '大唐集团', domain: 'china-cdt.com', industry: '能源与化工' },
  { slug: 'chd', name: 'China Huadian', nameZh: '华电集团', domain: 'chd.com.cn', industry: '能源与化工' },
  { slug: 'spic', name: 'SPIC', nameZh: '国家电投', domain: 'spic.com.cn', industry: '能源与化工' },
  // ===== 电信运营商 =====
  { slug: 'chinamobile', name: 'China Mobile', nameZh: '中国移动', domain: 'chinamobile.com', industry: '硬件与通信' },
  { slug: 'chinatelecom', name: 'China Telecom', nameZh: '中国电信', domain: 'chinatelecom.com.cn', industry: '硬件与通信' },
  { slug: 'chinaunicom', name: 'China Unicom', nameZh: '中国联通', domain: 'chinaunicom.com', industry: '硬件与通信' },
  // ===== 建筑与基建 =====
  { slug: 'cscec', name: 'CSCEC', nameZh: '中国建筑', domain: 'cscec.com', industry: '建筑与基建' },
  { slug: 'crcc', name: 'CRCC', nameZh: '中国铁建', domain: 'crcc.cn', industry: '建筑与基建' },
  { slug: 'powerchina', name: 'PowerChina', nameZh: '中国电建', domain: 'powerchina.cn', industry: '建筑与基建' },
  { slug: 'ccccltd', name: 'CCCC', nameZh: '中交集团', domain: 'ccccltd.cn', industry: '建筑与基建' },
  { slug: 'mcc', name: 'MCC', nameZh: '中冶集团', domain: 'mcc.com.cn', industry: '建筑与基建' },
  // ===== 汽车与制造 =====
  { slug: 'saic', name: 'SAIC Motor', nameZh: '上汽集团', domain: 'saicmotor.com', industry: '新能源与汽车' },
  { slug: 'faw', name: 'FAW Group', nameZh: '一汽集团', domain: 'faw.com.cn', industry: '新能源与汽车' },
  { slug: 'dfmc', name: 'Dongfeng Motor', nameZh: '东风汽车', domain: 'dfmc.com.cn', industry: '新能源与汽车' },
  { slug: 'geely', name: 'Geely', nameZh: '吉利汽车', domain: 'geely.com', industry: '新能源与汽车' },
  { slug: 'gwm', name: 'Great Wall Motors', nameZh: '长城汽车', domain: 'gwm.com.cn', industry: '新能源与汽车' },
  // ===== 家电与电子制造 =====
  { slug: 'haier', name: 'Haier', nameZh: '海尔', domain: 'haier.com', industry: '硬件与通信' },
  { slug: 'midea', name: 'Midea', nameZh: '美的集团', domain: 'midea.com', industry: '硬件与通信' },
  { slug: 'gree', name: 'Gree', nameZh: '格力电器', domain: 'gree.com', industry: '硬件与通信' },
  { slug: 'hisense', name: 'Hisense', nameZh: '海信集团', domain: 'hisense.com', industry: '硬件与通信' },
  { slug: 'tcl', name: 'TCL', nameZh: 'TCL科技', domain: 'tcl.com', industry: '硬件与通信' },
  { slug: 'crrc', name: 'CRRC', nameZh: '中国中车', domain: 'crrc.cn', industry: '硬件与通信' },
  { slug: 'zte', name: 'ZTE', nameZh: '中兴通讯', domain: 'zte.com.cn', industry: '硬件与通信' },
  { slug: 'inspur', name: 'Inspur', nameZh: '浪潮集团', domain: 'inspur.com', industry: '硬件与通信' },
  { slug: 'boe', name: 'BOE', nameZh: '京东方', domain: 'boe.com', industry: '硬件与通信' },
  { slug: 'luxshare', name: 'Luxshare', nameZh: '立讯精密', domain: 'luxshare-ict.com', industry: '硬件与通信' },
  // ===== 航空/航运/物流 =====
  { slug: 'airchina', name: 'Air China', nameZh: '中国国航', domain: 'airchina.com.cn', industry: '交通与物流' },
  { slug: 'csair', name: 'China Southern Airlines', nameZh: '南方航空', domain: 'csair.com', industry: '交通与物流' },
  { slug: 'ceair', name: 'China Eastern', nameZh: '东方航空', domain: 'ceair.com', industry: '交通与物流' },
  { slug: 'sf-express', name: 'SF Express', nameZh: '顺丰速运', domain: 'sf-express.com', industry: '交通与物流' },
  { slug: 'zto', name: 'ZTO Express', nameZh: '中通快递', domain: 'zto.com', industry: '交通与物流' },
  { slug: 'coscoshipping', name: 'COSCO Shipping', nameZh: '中远海运', domain: 'coscoshipping.com', industry: '交通与物流' },
  // ===== 消费与食品 =====
  { slug: 'yili', name: 'Yili Group', nameZh: '伊利集团', domain: 'yili.com', industry: '快消与零售' },
  { slug: 'mengniu', name: 'Mengniu', nameZh: '蒙牛', domain: 'mengniu.cn', industry: '快消与零售' },
  { slug: 'nongfuspring', name: 'Nongfu Spring', nameZh: '农夫山泉', domain: 'nongfuspring.com', industry: '快消与零售' },
  { slug: 'newhope', name: 'New Hope Group', nameZh: '新希望集团', domain: 'newhopegroup.com', industry: '快消与零售' },
  { slug: 'mcdonalds', name: "McDonald's China", nameZh: '麦当劳中国', domain: 'mcdonalds.com.cn', industry: '快消与零售' },
  { slug: 'yumchina', name: 'Yum China', nameZh: '百胜中国', domain: 'yumchina.com', industry: '快消与零售' },
  { slug: 'starbucks', name: 'Starbucks China', nameZh: '星巴克中国', domain: 'starbucks.com.cn', industry: '快消与零售' },
  { slug: 'nike', name: 'Nike', nameZh: '耐克', domain: 'nike.com', industry: '快消与零售' },
  { slug: 'adidas', name: 'adidas', nameZh: '阿迪达斯', domain: 'adidas.com', industry: '快消与零售' },
  // ===== 医药补充 =====
  { slug: 'sinopharm', name: 'Sinopharm', nameZh: '国药集团', domain: 'sinopharm.com', industry: '医药与健康' },
  { slug: 'fosun', name: 'Fosun', nameZh: '复星国际', domain: 'fosun.com', industry: '医药与健康' },
  // ===== 金融补充（银行/保险/综合） =====
  { slug: 'psbc', name: 'PSBC', nameZh: '邮储银行', domain: 'psbc.com', industry: '金融' },
  { slug: 'spdb', name: 'SPD Bank', nameZh: '浦发银行', domain: 'spdb.com.cn', industry: '金融' },
  { slug: 'cmbc', name: 'CMBC', nameZh: '民生银行', domain: 'cmbc.com.cn', industry: '金融' },
  { slug: 'cib', name: 'CIB', nameZh: '兴业银行', domain: 'cib.com.cn', industry: '金融' },
  { slug: 'cebbank', name: 'CEB', nameZh: '光大银行', domain: 'cebbank.com', industry: '金融' },
  { slug: 'hxb', name: 'Huaxia Bank', nameZh: '华夏银行', domain: 'hxb.com.cn', industry: '金融' },
  { slug: 'cgb', name: 'CGB', nameZh: '广发银行', domain: 'cgb.cn', industry: '金融' },
  { slug: 'cdb', name: 'China Development Bank', nameZh: '国家开发银行', domain: 'cdb.com.cn', industry: '金融' },
  { slug: 'chinalife', name: 'China Life', nameZh: '中国人寿', domain: 'chinalife.com.cn', industry: '金融' },
  { slug: 'picc', name: 'PICC', nameZh: '中国人民保险', domain: 'picc.com', industry: '金融' },
  { slug: 'cpic', name: 'CPIC', nameZh: '太平洋保险', domain: 'cpic.com.cn', industry: '金融' },
  { slug: 'taikang', name: 'Taikang', nameZh: '泰康保险', domain: 'taikang.com', industry: '金融' },
  { slug: 'citicgroup', name: 'CITIC Group', nameZh: '中信集团', domain: 'citic.com', industry: '金融' },
  { slug: 'cmhk', name: 'China Merchants Group', nameZh: '招商局集团', domain: 'cmhk.com', industry: '金融' },
  { slug: 'crc', name: 'China Resources', nameZh: '华润集团', domain: 'crc.com.hk', industry: '快消与零售' },
  // ===== 互联网补充 =====
  { slug: 'vip', name: 'Vipshop', nameZh: '唯品会', domain: 'vip.com', industry: '互联网' },
  { slug: 'suning', name: 'Suning', nameZh: '苏宁易购', domain: 'suning.com', industry: '互联网' },
  { slug: '58', name: '58.com', nameZh: '58同城', domain: '58.com', industry: '互联网' },
  // ===== 世界500强（国际补充） =====
  { slug: 'walmart', name: 'Walmart', nameZh: '沃尔玛', domain: 'walmart.com', industry: '快消与零售' },
  { slug: 'exxonmobil', name: 'ExxonMobil', nameZh: '埃克森美孚', domain: 'exxonmobil.com', industry: '能源与化工' },
  { slug: 'shell', name: 'Shell', nameZh: '壳牌', domain: 'shell.com', industry: '能源与化工' },
  { slug: 'bp', name: 'bp', nameZh: '英国石油', domain: 'bp.com', industry: '能源与化工' },
  { slug: 'toyota', name: 'Toyota', nameZh: '丰田', domain: 'toyota.com', industry: '新能源与汽车' },
  { slug: 'volkswagen', name: 'Volkswagen Group', nameZh: '大众集团', domain: 'volkswagenag.com', industry: '新能源与汽车' },
  { slug: 'bmw', name: 'BMW Group', nameZh: '宝马集团', domain: 'bmwgroup.com', industry: '新能源与汽车' },
  { slug: 'mercedes-benz', name: 'Mercedes-Benz Group', nameZh: '梅赛德斯-奔驰', domain: 'group.mercedes-benz.com', industry: '新能源与汽车' },
  { slug: 'ford', name: 'Ford', nameZh: '福特汽车', domain: 'ford.com', industry: '新能源与汽车' },
  { slug: 'gm', name: 'General Motors', nameZh: '通用汽车', domain: 'gm.com', industry: '新能源与汽车' },
  { slug: 'siemens', name: 'Siemens', nameZh: '西门子', domain: 'siemens.com', industry: '国际科技' },
  { slug: 'ge', name: 'GE Aerospace', nameZh: '通用电气', domain: 'ge.com', industry: '国际科技' },
  { slug: 'boeing', name: 'Boeing', nameZh: '波音', domain: 'boeing.com', industry: '国际科技' },
  { slug: 'airbus', name: 'Airbus', nameZh: '空中客车', domain: 'airbus.com', industry: '国际科技' },
  { slug: 'samsung', name: 'Samsung', nameZh: '三星', domain: 'samsung.com', industry: '国际科技' },
  { slug: 'lg', name: 'LG Group', nameZh: 'LG集团', domain: 'lg.com', industry: '国际科技' },
  { slug: 'sony', name: 'Sony', nameZh: '索尼', domain: 'sony.com', industry: '国际科技' },
  { slug: 'panasonic', name: 'Panasonic', nameZh: '松下电器', domain: 'panasonic.com', industry: '国际科技' },
  { slug: 'nestle', name: 'Nestlé', nameZh: '雀巢', domain: 'nestle.com', industry: '快消与零售' },
  { slug: 'danone', name: 'Danone', nameZh: '达能', domain: 'danone.com', industry: '快消与零售' },
  { slug: 'axa', name: 'AXA', nameZh: '安盛保险', domain: 'axa.com', industry: '金融' },
  { slug: 'allianz', name: 'Allianz', nameZh: '安联保险', domain: 'allianz.com', industry: '金融' },
  { slug: 'visa', name: 'Visa', nameZh: 'Visa', domain: 'visa.com', industry: '金融' },
  { slug: 'mastercard', name: 'Mastercard', nameZh: '万事达卡', domain: 'mastercard.com', industry: '金融' },
  { slug: 'paypal', name: 'PayPal', nameZh: 'PayPal', domain: 'paypal.com', industry: '金融科技' },
  { slug: 'salesforce', name: 'Salesforce', nameZh: 'Salesforce', domain: 'salesforce.com', industry: '国际科技' },
  { slug: 'sap', name: 'SAP', nameZh: 'SAP', domain: 'sap.com', industry: '国际科技' },
  { slug: 'dell', name: 'Dell', nameZh: '戴尔', domain: 'dell.com', industry: '国际科技' },
  { slug: 'hp', name: 'HP', nameZh: '惠普', domain: 'hp.com', industry: '国际科技' },
  { slug: 'cisco', name: 'Cisco', nameZh: '思科', domain: 'cisco.com', industry: '国际科技' },
  { slug: 'ericsson', name: 'Ericsson', nameZh: '爱立信', domain: 'ericsson.com', industry: '硬件与通信' },
  { slug: 'nokia', name: 'Nokia', nameZh: '诺基亚', domain: 'nokia.com', industry: '硬件与通信' },
  { slug: 'tsmc', name: 'TSMC', nameZh: '台积电', domain: 'tsmc.com', industry: '硬件与通信' },
  { slug: 'mediatek', name: 'MediaTek', nameZh: '联发科', domain: 'mediatek.com', industry: '硬件与通信' },
  { slug: 'asml', name: 'ASML', nameZh: '阿斯麦', domain: 'asml.com', industry: '国际科技' },
  { slug: 'dhl', name: 'DHL Group', nameZh: '德国邮政DHL', domain: 'dhl.com', industry: '交通与物流' },
  { slug: 'ups', name: 'UPS', nameZh: '联合包裹', domain: 'ups.com', industry: '交通与物流' },
  { slug: 'fedex', name: 'FedEx', nameZh: '联邦快递', domain: 'fedex.com', industry: '交通与物流' },
  { slug: 'maersk', name: 'A.P. Moller-Maersk', nameZh: '马士基', domain: 'maersk.com', industry: '交通与物流' },
  { slug: 'ikea', name: 'IKEA', nameZh: '宜家', domain: 'ikea.com', industry: '快消与零售' },
];

const j = JSON.parse(readFileSync(FILE, 'utf8'));
const existing = new Set(j.companies.map(c => c.slug));
let added = 0, dup = 0;
for (const c of additions) {
  if (existing.has(c.slug)) { dup++; continue; }
  j.companies.push(c);
  existing.add(c.slug);
  added++;
}
writeFileSync(FILE, JSON.stringify(j, null, 2));
console.log(`added ${added}, skipped ${dup} dup, total ${j.companies.length}`);
