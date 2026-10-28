/* 2027 寒假项目数据（义工游学 + 实习课程）
   来源：竹石/合作渠道 2027 寒假项目表（用户提供两批明细 + 两张官方汇总表）
   规则：只收录项目本身信息（分类/时长/批次/年龄/产出/费用包含/成团/语言），
        **售价、底价、住宿费等报价字段一律不入库**（对外不露价）。*/
(function () {
  const VOL_INC_3MEAL = ['住宿（行程所列酒店）', '餐食：早餐 / 午餐 / 晚餐', '规定时间接送机', '项目活动费（含日程内工作与游览）', '行程内交通', '场地费', '旅行保险', 'NGO 证书 + 志愿时长档案'];
  const VOL_INC_BRUNCH = ['住宿（行程所列酒店）', '餐食：D2–D5 早午餐、D6 早餐', '规定时间接送机', '项目活动费（含日程内工作与游览）', '行程内交通', '场地费', '旅行保险', 'NGO 证书 + 志愿时长档案'];
  const VOL_EXC = ['往返项目地交通', '个人消费', '与项目无关的个人活动'];
  const VOL_REMOTE_INC = ['项目培训费', 'NGO 证书 + 志愿时长档案', '证书邮寄费', '项目相关服务对接'];
  const INT_INC = ['申请费', '项目费', '高端旅行保险'];
  const INT_EXC = ['往返当地交通', '当地境内交通', '住宿', '餐饮及其他个人花费'];
  const INT_ONLINE_INC = ['申请费', '审核费', '讲师费'];
  const INT_ONLINE_EXC = ['个人消费'];

  const items = [
    /* ============ 义工游学 · 国内义工 ============ */
    { id: 'w1', group: 'volunteer', cat: '国内义工', name: '四川大熊猫保护', place: '四川', duration: '4天3晚', mode: '线下', age: '13 岁以上可独立参加，13 岁以下建议家长陪同', hours: '24 小时', minGroup: 4, lang: '中文',
      batches: ['2026.10.02-10.05', '2026.12.12-12.15', '2026.12.16-12.19', '2026.12.20-12.23', '2026.12.24-12.27', '2027.01.11-01.14', '2027.01.16-01.19', '2027.01.22-01.25', '2027.01.27-01.30', '2027.02.01-02.04', '2027.02.11-02.14', '2027.02.16-02.19', '2027.02.20-02.23'],
      outputs: ['24 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_INC_3MEAL, exc: VOL_EXC },
    { id: 'w2', group: 'volunteer', cat: '国内义工', name: '洞庭湖江豚保护', place: '湖南 · 洞庭湖', duration: '4天3晚', mode: '线下', age: '13 岁以上可独立参加，13 岁以下建议家长陪同', hours: '24 小时', minGroup: 8, lang: '中文',
      batches: ['2026.12.20-12.23', '2027.01.19-01.22', '2027.01.27-01.30', '2027.02.11-02.14'],
      outputs: ['24 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_INC_3MEAL, exc: VOL_EXC },
    { id: 'w3', group: 'volunteer', cat: '国内义工', name: '西双版纳大象保护', place: '云南 · 西双版纳', duration: '6天5晚', mode: '线下', age: '13 岁以上可独立参加，13 岁以下建议家长陪同', hours: '32 小时', minGroup: 4, lang: '中文',
      batches: ['2026.12.19-12.24', '2027.01.19-01.24', '2027.01.27-02.01', '2027.02.11-02.16'],
      outputs: ['32 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_INC_BRUNCH, exc: VOL_EXC },
    { id: 'w4', group: 'volunteer', cat: '国内义工', name: '三亚海洋生态保护义工项目', place: '海南 · 三亚', duration: '6天5晚', mode: '线下', age: '13 岁以上可独立参加，13 岁以下建议家长陪同', hours: '32 小时', minGroup: 6, lang: '中文',
      batches: ['2026.12.19-12.24', '2027.01.19-01.24', '2027.01.27-02.01', '2027.02.11-02.16'],
      outputs: ['32 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_INC_BRUNCH, exc: VOL_EXC },
    { id: 'w5', group: 'volunteer', cat: '国内义工', name: '凤凰志愿教学', place: '湖南 · 凤凰', duration: '5天4晚', mode: '线下', age: '16 岁以上可独立参加，16 岁以下建议家长陪同', hours: '24 小时', minGroup: 6, lang: '中文',
      batches: ['2026.10.02-10.06', '2026.12.11-12.15', '2026.12.19-12.23', '2026.12.24-12.28', '2027.01.12-01.16', '2027.01.18-01.22', '2027.01.22-01.26', '2027.01.27-01.31', '2027.02.14-02.18'],
      outputs: ['24 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: ['住宿（5天4晚酒店）', '餐食：D2–D4 三餐', '规定时间接送站', '项目活动费', '行程内交通', '场地费', '旅行保险', 'NGO 证书 + 志愿时长档案'], exc: VOL_EXC },
    { id: 'w6', group: 'volunteer', cat: '国内义工', name: '桂林支教', place: '广西 · 桂林', duration: '8天7晚', mode: '线下', age: '16 岁以上可独立参加，16 岁以下建议家长陪同', hours: '48 小时', minGroup: 12, lang: '中文',
      batches: ['2027.01.23-01.30'],
      outputs: ['48 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_INC_3MEAL, exc: VOL_EXC },
    { id: 'w7', group: 'volunteer', cat: '国内义工', name: '大理文化体验', place: '云南 · 大理', duration: '5天4晚', mode: '线下', age: '13 岁以上可独立参加，13 岁以下建议家长陪同', hours: '24 小时', minGroup: 4, lang: '中文',
      batches: ['2026.12.11-12.15', '2026.12.19-12.23', '2026.12.24-12.28', '2027.01.12-01.16', '2027.01.18-01.22', '2027.01.22-01.26', '2027.01.27-01.31', '2027.02.14-02.18'],
      outputs: ['24 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: ['住宿（5天4晚酒店）', '餐食：D2–D4 早午餐、D5 早餐', '规定时间接送机', '项目活动费', '行程内交通', '场地费', '旅行保险', 'NGO 证书 + 志愿时长档案'], exc: VOL_EXC },
    { id: 'w8', group: 'volunteer', cat: '国内义工', name: '敦煌文化体验', place: '甘肃 · 敦煌', duration: '7天6晚', mode: '线下', age: '13 岁以上可独立参加，13 岁以下建议家长陪同', hours: '40 小时', minGroup: 6, lang: '中文',
      batches: ['2026.12.18-12.24', '2027.01.25-01.31', '2027.02.15-02.19'],
      outputs: ['40 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: ['住宿（7天6晚酒店）', '餐食：D2–D6 早午餐、D7 早餐', '规定时间接送机', '项目活动费', '行程内交通', '场地费', '旅行保险', 'NGO 证书 + 志愿时长档案'], exc: VOL_EXC },

    /* ============ 义工游学 · 国际义工 ============ */
    { id: 'w9', group: 'volunteer', cat: '国际义工', name: '巴厘岛远程支教', place: '巴厘岛（远程）', duration: '7天', mode: '远程', age: '建议 13 岁以上参加', hours: '20 小时', minGroup: 1, lang: '英文',
      batches: ['2026.10.01-10.07', '2026.12.15-12.21', '2026.12.19-12.25', '2027.01.05-01.11', '2027.01.12-01.18', '2027.01.19-01.25', '2027.01.23-01.29', '2027.02.02-02.08', '2027.02.09-02.15', '2027.02.16-02.22', '2027.02.22-02.28'],
      outputs: ['20 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_REMOTE_INC, exc: ['个人消费', '与项目无关的个人活动'] },
    { id: 'w10', group: 'volunteer', cat: '国际义工', name: '巴厘岛支教', place: '巴厘岛（印尼）', duration: '7天6晚', mode: '线下', age: '16 岁以上可独立参加，16 岁以下建议家长陪同', hours: '40 小时', minGroup: 2, lang: '英文',
      batches: ['2026.10.01-10.07', '2026.12.13-12.19', '2026.12.20-12.26', '2027.01.03-01.09', '2027.01.10-01.16', '2027.01.17-01.23', '2027.01.24-01.30', '2027.02.12-02.18', '2027.02.19-02.25'],
      outputs: ['40 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_INC_BRUNCH, exc: VOL_EXC },
    { id: 'w11', group: 'volunteer', cat: '国际义工', name: '巴厘岛海龟', place: '巴厘岛（印尼）', duration: '7天6晚', mode: '线下', age: '16 岁以上可独立参加，16 岁以下建议家长陪同', hours: '40 小时', minGroup: 2, lang: '英文',
      batches: ['2026.10.01-10.07', '2026.12.13-12.19', '2026.12.20-12.26', '2027.01.03-01.09', '2027.01.10-01.16', '2027.01.17-01.23', '2027.01.24-01.30', '2027.01.28-02.03', '2027.02.12-02.18', '2027.02.19-02.25'],
      outputs: ['40 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_INC_BRUNCH, exc: VOL_EXC },
    { id: 'w12', group: 'volunteer', cat: '国际义工', name: '巴厘岛文化体验', place: '巴厘岛（印尼）', duration: '7天6晚', mode: '线下', age: '16 岁以上可独立参加，16 岁以下建议家长陪同', hours: '40 小时', minGroup: 2, lang: '英文',
      batches: ['2026.10.01-10.07', '2026.12.13-12.19', '2026.12.20-12.26', '2027.01.03-01.09', '2027.01.10-01.16', '2027.01.17-01.23', '2027.01.24-01.30', '2027.01.28-02.03', '2027.02.12-02.18', '2027.02.19-02.25'],
      outputs: ['40 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_INC_BRUNCH, exc: VOL_EXC },
    { id: 'w13', group: 'volunteer', cat: '国际义工', name: '尼泊尔支教', place: '尼泊尔', duration: '7天6晚', mode: '线下', age: '16 岁以上可独立参加，16 岁以下建议家长陪同', hours: '40 小时', minGroup: 2, lang: '英文',
      batches: ['2026.10.01-10.07', '2026.12.13-12.19', '2026.12.20-12.26', '2027.01.03-01.09', '2027.01.10-01.16', '2027.01.17-01.23', '2027.01.24-01.30', '2027.01.28-02.03', '2027.02.12-02.18', '2027.02.19-02.25'],
      outputs: ['40 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: ['住宿（7天6晚寄宿家庭）', '餐食：早餐 / 午餐 / 晚餐', '规定时间接送机', '项目活动费', '行程内交通', '场地费', '旅行保险', 'NGO 证书 + 志愿时长档案'], exc: VOL_EXC },
    { id: 'w14', group: 'volunteer', cat: '国际义工', name: '斯里兰卡支教', place: '斯里兰卡', duration: '7天6晚', mode: '线下', age: '16 岁以上可独立参加，16 岁以下建议家长陪同', hours: '40 小时', minGroup: 2, lang: '英文',
      batches: ['2026.10.01-10.07'],
      outputs: ['40 小时志愿时长（志愿汇 / 志愿北京可录入）', '志愿者证书（国家认证 NGO）'], inc: VOL_INC_BRUNCH, exc: VOL_EXC },
    { id: 'w15', group: 'volunteer', cat: '国际义工', name: '马尔代夫海洋保护', place: '马尔代夫', duration: '6天', mode: '线下', age: '18 岁以上可独立参加，18 岁以下建议家长陪同', hours: '', minGroup: null, lang: '',
      batches: [], note: '具体批次日期详见项目海报。', outputs: [], inc: [], exc: [] },
    { id: 'w16', group: 'volunteer', cat: '国际义工', name: '斯里兰卡海龟', place: '斯里兰卡', duration: '7天', mode: '线下', age: '16 岁以上可独立参加，16 岁以下建议家长陪同', hours: '', minGroup: null, lang: '',
      batches: [], note: '具体批次日期详见项目海报。', outputs: [], inc: [], exc: [] },
    { id: 'w17', group: 'volunteer', cat: '国际义工', name: '澳大利亚动物保护义工', place: '澳大利亚', duration: '12天', mode: '线下', age: '18 岁以上可独立参加，18 岁以下建议家长陪同', hours: '', minGroup: null, lang: '',
      batches: [], note: '具体批次日期详见项目海报。', outputs: [], inc: [], exc: [] },

    /* ============ 义工游学 · 国际游学 ============ */
    { id: 'w18', group: 'volunteer', cat: '国际游学', name: '英国游学', place: '英国', duration: '16天', mode: '线下', age: '18 岁以上可独立参加，18 岁以下需家长陪同', hours: '', minGroup: null, lang: '',
      batches: [], note: '具体批次日期详见项目海报。', outputs: [], inc: [], exc: [] },
    { id: 'w19', group: 'volunteer', cat: '国际游学', name: '欧洲游学', place: '欧洲', duration: '16天', mode: '线下', age: '16 岁以上可独立参加，16 岁以下需家长陪同', hours: '', minGroup: null, lang: '',
      batches: [], note: '具体批次日期详见项目海报。', outputs: [], inc: [], exc: [] },

    /* ============ 实习课程 · 世界名企官方实习实训 ============ */
    { id: 'i1', group: 'intern', cat: '名企实习实训', name: '香港 IEP 世界 500 强实训', place: '香港', duration: '7天6晚', mode: '线下', age: '大学生、高中生', headcount: '30 人 / 期', lang: '中文',
      batches: ['2027.01.10-01.16', '2027.01.17-01.23', '2027.01.24-01.30', '2027.02.14-02.20'],
      outputs: ['高管亲笔签名推荐信', '500 强跨国金融集团实习证书', '冠军团队获 500 强公司定制奖杯'], inc: INT_INC, exc: ['往返香港交通', '香港境内交通', '住宿', '餐饮及其他'] },
    { id: 'i2', group: 'intern', cat: '名企实习实训', name: '澳门 IEP 世界 500 强实训', place: '中国澳门', duration: '5天4晚', mode: '线下', age: '大学生、高中生', headcount: '30 人 / 期', lang: '中文',
      batches: ['2027.01.23-01.27'],
      outputs: ['高管亲笔签名推荐信', '500 强跨国金融集团实习证书'], inc: INT_INC, exc: ['往返澳门交通', '澳门境内交通', '住宿', '餐饮及其他'] },
    { id: 'i3', group: 'intern', cat: '名企实习实训', name: '上海投行实习', place: '上海', duration: '7天6晚', mode: '线下', age: '大学生、高中生', headcount: '20 人 / 期', lang: '中文',
      batches: ['2027.01.22-01.28'],
      outputs: ['高管亲笔签名推荐信', '精品投行实习证书', '防伪 ID 项目证书'], inc: ['申请费', '课程费', '场地费', '学习资料费'], exc: ['酒店', '餐饮', '个人花费', '往返上海交通', '项目期间交通'] },
    { id: 'i4', group: 'intern', cat: '名企实习实训', name: '香港传媒演艺行业全链路实习项目', place: '香港', duration: '6天5晚', mode: '线下', age: '大学生、高中生', headcount: '30 人 / 期', lang: '中文',
      batches: ['2027.01.17-01.22'],
      outputs: ['演唱会商业全案（PPT＋预算表＋传播排期＋赞助权益）', '森立演艺实习证明 + 行业推荐信', '结业证书 + 最佳提案 / 个人表现奖'], inc: ['课程费', '场地费', '证书申请及制作费', '保险', '项目组织与执行费', '当地交通（含规定时间接送）'], exc: ['港澳通行证及签注', '酒店', '往返香港交通', '接送机', '香港境内交通', '餐饮'] },
    { id: 'i5', group: 'intern', cat: '名企实习实训', name: '香港世界 100 强远程实训', place: '香港（远程）', duration: '4周', mode: '线上', age: '大学生、高中生', headcount: '20 人及以上', lang: '中文',
      batches: ['2027.01.23-02.13'],
      outputs: ['500 强官方实习证明', '名企高管推荐信', '优秀小组证书'], inc: INT_ONLINE_INC, exc: INT_ONLINE_EXC },
    { id: 'i6', group: 'intern', cat: '名企实习实训', name: '新加坡 IEP 世界 500 强实训', place: '新加坡', duration: '7天6晚', mode: '线下', age: '大学生、高中生', headcount: '30 人 / 期', lang: '中文',
      batches: ['2027.01.23-01.27'],
      outputs: ['高管亲笔签名推荐信', '500 强跨国金融集团实习项目证明'], inc: ['企业实训费', '参访交流费', '新加坡当地交通费', '境外旅游保险费'], exc: ['护照费', '住宿费', '往返新加坡交通', '接送机', '餐饮'] },
    { id: 'i7', group: 'intern', cat: '名企实习实训', name: '上海 ZeroTC × 英伟达人工智能实训（线下）', place: '上海', duration: '7天6晚', mode: '线下', age: '大学生、高中生', headcount: '30 人 / 期', lang: '中文',
      batches: ['2027.01.24-01.30'],
      outputs: ['英伟达生态合作伙伴认证证书（可写入简历头部）', '企业导师亲笔推荐信', 'AI 创新作品集（比赛方案 + 工具报告）'], inc: ['课程费', '场地费', '证书申请及制作费', '保险', '项目组织与执行费'], exc: ['往返上海交通', '午晚餐', '商务酒店住宿（双人间含早）', '当地交通'] },
    { id: 'i8', group: 'intern', cat: '名企实习实训', name: '上海 ZeroTC × 英伟达人工智能实训（线上）', place: '上海（线上）', duration: '4周', mode: '线上', age: '大学生、高中生', headcount: '20 人及以上', lang: '中文',
      batches: ['2027.02.13-03.06'],
      outputs: ['英伟达生态合作伙伴认证证书（可写入简历头部）', '企业导师亲笔推荐信', 'AI 创新作品集（比赛方案 + 工具报告）'], inc: ['课程费', '证书申请及制作费', '项目执行费'], exc: ['个人消费'] },
    { id: 'i9', group: 'intern', cat: '名企实习实训', name: 'Chi design 时尚传媒训练营', place: '线上', duration: '4周', mode: '线上', age: '大学生、高中生', headcount: '20 人及以上', lang: '中文',
      batches: ['2027.02.13-03.06'],
      outputs: ['高管亲笔签名推荐信', '导师签发实习证明', '品牌概念创意推广方案大赛证书', '优秀学员有机会参与国内一线时装周'], inc: INT_ONLINE_INC, exc: INT_ONLINE_EXC },
    { id: 'i10', group: 'intern', cat: '名企实习实训', name: '美国对冲基金技术分析远程实习营', place: '线上', duration: '4周', mode: '线上', age: '大学生、高中生', headcount: '30 人 / 期', lang: '中文',
      batches: ['2027.02.13-03.06'],
      outputs: ['美股技术分析能力（TradingView / 均线 / 量价 / RSI / MACD）', '一份专业化技术分析报告', 'Viridian Fund 实习证明 + 推荐信'], inc: INT_ONLINE_INC, exc: INT_ONLINE_EXC },
    { id: 'i11', group: 'intern', cat: '名企实习实训', name: '香港安盛总部线上实习', place: '香港（线上）', duration: '4周', mode: '线上', age: '大学生、高中生', headcount: '20 人及以上', lang: '中文',
      batches: ['2026.12.28-01.22'],
      outputs: ['高管亲笔签名推荐信', '500 强跨国金融集团实习项目证明'], inc: INT_ONLINE_INC, exc: INT_ONLINE_EXC },

    /* ============ 实习课程 · 世界名校官方境外访学（大学班） ============ */
    { id: 'i12', group: 'intern', cat: '名校访学·大学班', name: '香港大学课程（大学班）', place: '中国香港', duration: '7天', mode: '线下', age: '大学生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },
    { id: 'i13', group: 'intern', cat: '名校访学·大学班', name: '香港中文大学课程（大学班）', place: '中国香港', duration: '7天', mode: '线下', age: '大学生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },
    { id: 'i14', group: 'intern', cat: '名校访学·大学班', name: '香港科技大学课程（大学班）', place: '中国香港', duration: '7天', mode: '线下', age: '大学生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },
    { id: 'i15', group: 'intern', cat: '名校访学·大学班', name: '香港浸会大学课程（大学班）', place: '中国香港', duration: '7天', mode: '线下', age: '大学生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },
    { id: 'i16', group: 'intern', cat: '名校访学·大学班', name: '新加坡国立大学课程（大学班）', place: '新加坡', duration: '7天', mode: '线下', age: '大学生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },
    { id: 'i17', group: 'intern', cat: '名校访学·大学班', name: '南洋理工大学课程（大学班）', place: '新加坡', duration: '7天', mode: '线下', age: '大学生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },
    { id: 'i18', group: 'intern', cat: '名校访学·大学班', name: '剑桥大学实地学术课程项目', place: '英国 · 剑桥', duration: '14天', mode: '线下', age: '大学生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },
    { id: 'i19', group: 'intern', cat: '名校访学·大学班', name: '联合国人才培养计划', place: '境外', duration: '14天', mode: '线下', age: '大学生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },

    /* ============ 实习课程 · 世界名校官方境外访学（高中班） ============ */
    { id: 'i20', group: 'intern', cat: '名校访学·高中班', name: '香港大学课程（高中班）', place: '中国香港', duration: '7天', mode: '线下', age: '10 年级及以上高中生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },
    { id: 'i21', group: 'intern', cat: '名校访学·高中班', name: '新加坡国立大学课程（高中班）', place: '新加坡', duration: '7天', mode: '线下', age: '10 年级及以上高中生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] },
    { id: 'i22', group: 'intern', cat: '名校访学·高中班', name: '南洋理工大学课程（高中班）', place: '新加坡', duration: '7天', mode: '线下', age: '10 年级及以上高中生', headcount: '', lang: '', batches: [], note: '具体日期与产出详见项目简章。', outputs: [], inc: [], exc: [] }
  ];

  window.__WINTER = {
    updated: '2027 寒假',
    source: '合作渠道 2027 寒假项目（义工游学 + 实习课程）',
    groups: [
      { key: 'volunteer', name: '义工游学', desc: '国内义工 / 国际义工 / 国际游学，含志愿时长与证书产出' },
      { key: 'intern', name: '实习课程', desc: '世界名企官方实习实训 / 世界名校官方境外访学' }
    ],
    stats: {
      total: items.length,
      volunteer: items.filter((x) => x.group === 'volunteer').length,
      intern: items.filter((x) => x.group === 'intern').length
    },
    items: items
  };
})();

/* 报价（base64 编码，仅按 P 键时解码显示，非明文） */
window.__WINTER_PRICES_B64="eyJ3MSI6eyJzIjoiNDI4MO+8iOWNgeS4gCA0NTgw77yJIiwiZiI6IjHigJMyMCDkurogMzQwMCAvIDIwIOS6uuS7peS4iiAzMjAw77yI5Y2B5LiA5LiK6LCDIDMwMO+8iSJ9LCJ3MiI6eyJzIjoiNDI4MCIsImYiOiIx4oCTMjAg5Lq6IDM0MDAgLyAyMCDkurrku6XkuIogMzIwMCJ9LCJ3MyI6eyJzIjoiNDgwMCIsImYiOiIx4oCTMjAg5Lq6IDM4MDAgLyAyMCDkurrku6XkuIogMzYwMCJ9LCJ3NCI6eyJzIjoiNTQ4MCIsImYiOiIx4oCTMjAg5Lq6IDQ2MDAgLyAyMCDkurrku6XkuIogNDMwMCJ9LCJ3NSI6eyJzIjoiNDI4MO+8iOWNgeS4gCA0NTgw77yJIiwiZiI6IjHigJMyMCDkurogMzQwMCAvIDIwIOS6uuS7peS4iiAzMjAw77yI5Y2B5LiA5LiK6LCDIDMwMO+8iSJ9LCJ3NiI6eyJzIjoiNDI4MCIsImYiOiIx4oCTMjAg5Lq6IDMyMDAgLyAyMCDkurrku6XkuIogMzAwMCJ9LCJ3NyI6eyJzIjoiNDQ4MCIsImYiOiIx4oCTMjAg5Lq6IDMyMDAgLyAyMCDkurrku6XkuIogMzAwMCJ9LCJ3OCI6eyJzIjoiNDk4MCIsImYiOiIx4oCTMjAg5Lq6IDM5ODAgLyAyMCDkurrku6XkuIogMzc4MCJ9LCJ3OSI6eyJzIjoiMTk4MCIsImYiOiIxMjAwIn0sIncxMCI6eyJzIjoiNDk4MCIsImYiOiIx4oCTMjAg5Lq6IDM2MDAgLyAyMCDkurrku6XkuIogMzQwMCJ9LCJ3MTEiOnsicyI6IjQ5ODAiLCJmIjoiMeKAkzIwIOS6uiAzNjAwIC8gMjAg5Lq65Lul5LiKIDM0MDAifSwidzEyIjp7InMiOiI0OTgwIiwiZiI6IjHigJMyMCDkurogMzYwMCAvIDIwIOS6uuS7peS4iiAzNDAwIn0sIncxMyI6eyJzIjoiNDI4MCIsImYiOiIx4oCTMjAg5Lq6IDMyMDAgLyAyMCDkurrku6XkuIogMzAwMCJ9LCJ3MTQiOnsicyI6IjQ5ODAiLCJmIjoiMeKAkzIwIOS6uiAzNjAwIC8gMjAg5Lq65Lul5LiKIDM0MDAifSwidzE1Ijp7InMiOiI1OTgwIiwiZiI6IuKAlCJ9LCJ3MTYiOnsicyI6IjQ5ODAiLCJmIjoi4oCUIn0sIncxNyI6eyJzIjoiMzA4MDAiLCJmIjoi4oCUIn0sIncxOCI6eyJzIjoiMjI4MDAiLCJmIjoi4oCUIn0sIncxOSI6eyJzIjoiMjQ4MDAiLCJmIjoi4oCUIn0sImkxIjp7InMiOiI1OTgwIiwiZiI6IjM1MDAiLCJsIjoiMjUwMCJ9LCJpMiI6eyJzIjoiMzk4MCIsImYiOiIyNzgwIiwibCI6IjE1MDAifSwiaTMiOnsicyI6IjU5ODAiLCJmIjoiNDIwMCIsImwiOiIxNDgw77yI5Y+M5Lq65qCH6Ze05ZCr5pep77yM5ZCrIDcg5aSpIDYg5pma77yJIn0sImk0Ijp7InMiOiI3OTgwIiwiZiI6IjY1MDAiLCJsIjoiMTMwMCJ9LCJpNSI6eyJzIjoiMzk4MCIsImYiOiIxOTgwIiwibCI6Iue6v+S4iu+8jOaXoOS9j+WuvyJ9LCJpNiI6eyJzIjoiNzk4MCIsImYiOiI1NTAwIiwibCI6IjM1MDAifSwiaTciOnsicyI6Ijg5ODAiLCJmIjoiNjE4MCIsImwiOiIxMzAwIn0sImk4Ijp7InMiOiIzOTgwIiwiZiI6IjI5ODAiLCJsIjoi57q/5LiK77yM5peg5L2P5a6/In0sImk5Ijp7InMiOiIzOTgwIiwiZiI6IjI3ODAiLCJsIjoi57q/5LiK77yM5peg5L2P5a6/In0sImkxMCI6eyJzIjoiNDk4MCIsImYiOiIzNTAwIiwibCI6Iue6v+S4iu+8jOaXoOS9j+WuvyJ9LCJpMTEiOnsicyI6IjM5ODAiLCJmIjoiMjUwMCIsImwiOiLnur/kuIrvvIzml6DkvY/lrr8ifSwiaTEyIjp7InMiOiIxMDUwMCJ9LCJpMTMiOnsicyI6IjEwNTAwIn0sImkxNCI6eyJzIjoiMTA1MDAifSwiaTE1Ijp7InMiOiI4ODAwIn0sImkxNiI6eyJzIjoiMTQ4MDAifSwiaTE3Ijp7InMiOiIxNDgwMCJ9LCJpMTgiOnsicyI6IjMyODAwIn0sImkxOSI6eyJzIjoiMzQ4MDAifSwiaTIwIjp7InMiOiIxNTgwMCJ9LCJpMjEiOnsicyI6IjIyODAwIn0sImkyMiI6eyJzIjoiMjI4MDAifX0=";
