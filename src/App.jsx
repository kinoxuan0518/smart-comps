import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calculator, 
  User, 
  Banknote, 
  TrendingUp, 
  FileText, 
  Briefcase, 
  PieChart, 
  AlertCircle, 
  CheckCircle2,
  Save,
  LayoutDashboard,
  Wand2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ArrowRightCircle,
  MoreHorizontal,
  ShieldCheck,
  Coins,
  Printer,
  FileDown,
  X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';

/**
 * SmartComps - 智能薪酬分析与定薪助手 (视觉优化版)
 * * 核心升级：
 * 1. 【顶部看板重构】将 Total Increase 等核心卡片改为上下分层布局，增加分隔线，彻底解决“比例和Gap坨在一起”的问题，视觉更通透。
 * 2. 保持原有的 Word/PDF 导出及所有计算逻辑不变。
 */

// --- 工具函数 ---
const formatCurrency = (value) => {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value || 0);
};

const formatPercent = (value) => {
  if (!value || isNaN(value)) return '0%';
  return new Intl.NumberFormat('zh-CN', { style: 'percent', minimumFractionDigits: 0 }).format(value);
};

const formatPercentPrecise = (value) => {
  if (!value || isNaN(value)) return '0%';
  return new Intl.NumberFormat('zh-CN', { style: 'percent', minimumFractionDigits: 1 }).format(value);
};

const formatDelta = (val) => {
  if (!val) return '-';
  const sign = val > 0 ? '+' : '';
  return `${sign}${formatCurrency(val)}`;
};

const safeParse = (val) => parseFloat(val) || 0;

const COLORS = ['#94a3b8', '#4f46e5', '#10b981', '#f59e0b'];

const SmartSalaryApp = () => {
  // --- 状态管理 ---
  const [showCandidate, setShowCandidate] = useState(true); 
  const [showSocialDetails, setShowSocialDetails] = useState(true); 
  const [showStockDetails, setShowStockDetails] = useState(false); 
  const [showExportModal, setShowExportModal] = useState(false); 

  // 1. 基本信息
  const [candidateInfo, setCandidateInfo] = useState({
    name: '张三',
    age: '28',
    educationType: '全日制本科',
    school: '某某大学',
    workYears: '5',
    position: '高级前端工程师',
    level: 'P7',
    peerReference: '李四 (P7)',
  });

  // 2. 薪资明细
  const [salaryData, setSalaryData] = useState({
    current: {
      baseMonthly: 16672,
      months: 13,
      performanceBonus: 15360,
      fixedAllowance: 0,
      signOnBonus: 0,
      stockValue: 0,
      stockCount: 0,
      strikePrice: 0,
      grantPrice: 0,
      vestingYears: 4,
      other: 0
    },
    offer: {
      baseMonthly: 20000,
      months: 14,
      performanceBonus: 60000,
      fixedAllowance: 0,
      signOnBonus: 0,
      stockValue: 0,
      stockCount: 0,
      strikePrice: 0,
      grantPrice: 0,
      vestingYears: 4,
      other: 0
    }
  });

  // 3. 社保公积金
  const [socialSecurity, setSocialSecurity] = useState({
    city: '上海',
    baseCompany: 20000,
    basePersonal: 20000,
    pensionRate: 0.08,
    medicalRate: 0.02,
    unemploymentRate: 0.005,
    housingRate: 0.07,
  });

  // 4. 流水记录
  const [bankFlows, setBankFlows] = useState(
    Array(12).fill(0).map((_, i) => ({ month: `2023-${String(i + 1).padStart(2, '0')}`, amount: 0 }))
  );

  // 5. 智能模拟参数
  const [adviseParams, setAdviseParams] = useState({
    targetIncrease: 0.30, 
    stockRatio: 0.15,     
  });

  // --- 监听期权明细变化 ---
  const calculateStockAnnual = (type) => {
    const data = salaryData[type];
    const count = safeParse(data.stockCount);
    const grant = safeParse(data.grantPrice);
    const strike = safeParse(data.strikePrice);
    const years = safeParse(data.vestingYears) || 4;

    if (count > 0 && grant > 0) {
      const totalValue = count * (grant - strike);
      const annualValue = totalValue / years;
      return Math.round(annualValue);
    }
    return null;
  };

  useEffect(() => {
    const val = calculateStockAnnual('current');
    if (val !== null && showStockDetails) {
       setSalaryData(prev => ({...prev, current: {...prev.current, stockValue: val}}));
    }
  }, [salaryData.current.stockCount, salaryData.current.strikePrice, salaryData.current.grantPrice, salaryData.current.vestingYears]);

  useEffect(() => {
    const val = calculateStockAnnual('offer');
    if (val !== null && showStockDetails) {
       setSalaryData(prev => ({...prev, offer: {...prev.offer, stockValue: val}}));
    }
  }, [salaryData.offer.stockCount, salaryData.offer.strikePrice, salaryData.offer.grantPrice, salaryData.offer.vestingYears]);


  // --- 计算逻辑 ---
  const calculatePackage = (data) => {
    const baseTotal = safeParse(data.baseMonthly) * safeParse(data.months);
    const allowanceTotal = safeParse(data.fixedAllowance) * 12;
    const cashTotal = baseTotal + allowanceTotal + safeParse(data.performanceBonus) + safeParse(data.signOnBonus) + safeParse(data.other);
    const totalPackage = cashTotal + safeParse(data.stockValue);
    return { 
      baseTotal, 
      allowanceTotal, 
      cashTotal, 
      totalPackage, 
      monthlyCash: safeParse(data.baseMonthly) + safeParse(data.fixedAllowance) 
    };
  };

  const currentPkg = useMemo(() => calculatePackage(salaryData.current), [salaryData.current]);
  const offerPkg = useMemo(() => calculatePackage(salaryData.offer), [salaryData.offer]);

  const suggestedPkg = useMemo(() => {
    const targetTotal = currentPkg.totalPackage * (1 + adviseParams.targetIncrease);
    const stockPart = targetTotal * adviseParams.stockRatio;
    const cashPart = targetTotal - stockPart;
    const months = safeParse(salaryData.offer.months) || safeParse(salaryData.current.months) || 12;
    const bonus = safeParse(salaryData.offer.performanceBonus);
    const signOn = safeParse(salaryData.offer.signOnBonus);
    const allowance = safeParse(salaryData.offer.fixedAllowance) * 12;
    let suggestedBase = (cashPart - bonus - signOn - allowance) / months;
    if (suggestedBase < 0) suggestedBase = 0; 

    return { total: targetTotal, stock: stockPart, baseMonthly: suggestedBase, cashTotal: cashPart };
  }, [currentPkg.totalPackage, adviseParams, salaryData.offer, salaryData.current]);

  const stats = useMemo(() => {
    const cashIncrease = currentPkg.cashTotal > 0 ? (offerPkg.cashTotal - currentPkg.cashTotal) / currentPkg.cashTotal : 0;
    const totalIncrease = currentPkg.totalPackage > 0 ? (offerPkg.totalPackage - currentPkg.totalPackage) / currentPkg.totalPackage : 0;
    const monthlyIncrease = currentPkg.monthlyCash > 0 ? (offerPkg.monthlyCash - currentPkg.monthlyCash) / currentPkg.monthlyCash : 0;
    return { cashIncrease, totalIncrease, monthlyIncrease };
  }, [currentPkg, offerPkg]);

  const calculateDeductions = (base) => {
    const housing = base * socialSecurity.housingRate;
    const pension = base * socialSecurity.pensionRate;
    const medical = base * socialSecurity.medicalRate;
    const unemployment = base * socialSecurity.unemploymentRate;
    const total = housing + pension + medical + unemployment;
    return { housing, pension, medical, unemployment, total };
  };

  const flowStats = useMemo(() => {
    const total = bankFlows.reduce((sum, item) => sum + safeParse(item.amount), 0);
    const avg = bankFlows.filter(f => safeParse(f.amount) > 0).length > 0 ? total / bankFlows.filter(f => safeParse(f.amount) > 0).length : 0;
    return { total, avg };
  }, [bankFlows]);

  const estimatedPreTax = useMemo(() => {
    if (flowStats.avg === 0) return 0;
    const socialRate = socialSecurity.housingRate + socialSecurity.pensionRate + socialSecurity.medicalRate + socialSecurity.unemploymentRate;
    let taxRate = 0.05; 
    if (flowStats.avg > 20000) taxRate = 0.10;
    if (flowStats.avg > 30000) taxRate = 0.15;
    if (flowStats.avg > 50000) taxRate = 0.20;
    return flowStats.avg / (1 - socialRate - taxRate);
  }, [flowStats.avg, socialSecurity]);

  const deductions = useMemo(() => calculateDeductions(socialSecurity.basePersonal), [socialSecurity.basePersonal, socialSecurity.housingRate]);

  const getAdviceText = () => {
    const tips = [];
    if (stats.cashIncrease < 0.10 && stats.cashIncrease >= 0) tips.push({ type: 'warning', text: '现金涨幅低于10%，接Offer意愿可能较低。' });
    if (stats.cashIncrease < 0) tips.push({ type: 'danger', text: '现金负增长，风险极高。' });
    if (safeParse(salaryData.offer.stockValue) / offerPkg.totalPackage > 0.4) tips.push({ type: 'warning', text: '期权占比超40%，依赖长期价值。' });
    if (currentPkg.monthlyCash > offerPkg.monthlyCash) tips.push({ type: 'danger', text: '月薪倒挂。' });
    if(estimatedPreTax > safeParse(salaryData.current.baseMonthly) * 1.15) tips.push({ type: 'info', text: `流水反推月薪(${formatCurrency(estimatedPreTax)})显著偏高，请核查。`});
    if (tips.length === 0 && stats.totalIncrease > 0.15) tips.push({ type: 'good', text: '方案结构平衡，风险可控。' });
    return tips;
  };

  const applySuggestion = (field, value) => {
    setSalaryData({
      ...salaryData,
      offer: { ...salaryData.offer, [field]: Math.round(value / 100) * 100 }
    });
  };

  // --- 导出功能实现 ---

  // 1. 导出 PDF (利用浏览器打印)
  const handlePrintPDF = () => {
    setShowExportModal(false);
    setShowCandidate(true);
    setShowSocialDetails(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // 2. 导出 Word (.doc)
  const handleExportWord = () => {
    const adviceList = getAdviceText().map(a => `<p style="color: ${a.type === 'danger' ? 'red' : a.type === 'warning' ? '#d97706' : '#059669'}; margin: 5px 0;">• ${a.text}</p>`).join('');
    
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>SmartComps Report</title>
        <style>
          body { font-family: 'SimSun', '宋体', serif; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 14px; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .title { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
          .section-title { font-size: 16px; font-weight: bold; background-color: #e5e7eb; padding: 5px; margin-top: 20px; margin-bottom: 10px; }
          .highlight { color: #4f46e5; font-weight: bold; }
          .delta-pos { color: #059669; }
          .delta-neg { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="title">SmartComps 定薪分析报告</div>
        
        <div class="section-title">一、候选人信息</div>
        <table>
          <tr>
            <td>姓名</td><td>${candidateInfo.name}</td>
            <td>工龄</td><td>${candidateInfo.workYears}</td>
          </tr>
          <tr>
            <td>岗位</td><td>${candidateInfo.position}</td>
            <td>定级</td><td>${candidateInfo.level}</td>
          </tr>
          <tr>
            <td>学历</td><td>${candidateInfo.educationType}</td>
            <td>院校</td><td>${candidateInfo.school}</td>
          </tr>
        </table>

        <div class="section-title">二、薪资方案对比</div>
        <table>
          <tr>
            <th>项目</th>
            <th>目前 (Current)</th>
            <th>新方案 (Offer)</th>
            <th>差异 (Delta)</th>
          </tr>
          <tr>
            <td>基本月薪</td>
            <td>${formatCurrency(salaryData.current.baseMonthly)}</td>
            <td class="highlight">${formatCurrency(salaryData.offer.baseMonthly)}</td>
            <td class="${salaryData.offer.baseMonthly > salaryData.current.baseMonthly ? 'delta-pos' : 'delta-neg'}">
              ${formatDelta(salaryData.offer.baseMonthly - salaryData.current.baseMonthly)}
            </td>
          </tr>
          <tr>
            <td>年度现金 (Cash)</td>
            <td>${formatCurrency(currentPkg.cashTotal)}</td>
            <td class="highlight">${formatCurrency(offerPkg.cashTotal)}</td>
            <td class="${stats.cashIncrease >= 0 ? 'delta-pos' : 'delta-neg'}">
               ${formatPercentPrecise(stats.cashIncrease)}
            </td>
          </tr>
          <tr>
            <td>期权价值 (Stock)</td>
            <td>${formatCurrency(salaryData.current.stockValue)}</td>
            <td>${formatCurrency(salaryData.offer.stockValue)}</td>
            <td>${formatDelta(salaryData.offer.stockValue - salaryData.current.stockValue)}</td>
          </tr>
          <tr>
            <td><strong>年度总包 (Total)</strong></td>
            <td><strong>${formatCurrency(currentPkg.totalPackage)}</strong></td>
            <td class="highlight"><strong>${formatCurrency(offerPkg.totalPackage)}</strong></td>
            <td class="${stats.totalIncrease >= 0 ? 'delta-pos' : 'delta-neg'}">
              <strong>${formatPercentPrecise(stats.totalIncrease)}</strong>
            </td>
          </tr>
        </table>

        <div class="section-title">三、AI 风险评估</div>
        <div style="border: 1px solid #e5e7eb; padding: 10px;">
          ${adviceList || '无特殊风险，方案结构稳健。'}
        </div>

        <div class="section-title">四、合规核查</div>
        <table>
          <tr>
            <td>近12个月平均流水</td>
            <td>${formatCurrency(flowStats.avg)}</td>
            <td>反推税前月薪</td>
            <td>≈ ${formatCurrency(estimatedPreTax)}</td>
          </tr>
          <tr>
            <td>公积金基数</td>
            <td>${formatCurrency(socialSecurity.basePersonal)}</td>
            <td>公积金比例</td>
            <td>${formatPercent(socialSecurity.housingRate)}</td>
          </tr>
        </table>
        
        <p style="text-align: right; margin-top: 30px; font-size: 12px; color: #666;">生成的报告时间：${new Date().toLocaleDateString()}</p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `定薪报告_${candidateInfo.name}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10 print:bg-white print:pb-0">
      {/* 顶部导航 (打印时隐藏) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <TrendingUp className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-800">SmartComps <span className="text-slate-400 font-normal text-sm ml-2">定薪工作台</span></span>
            </div>
            <button 
              onClick={() => setShowExportModal(true)}
              className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm font-medium hover:bg-slate-50 px-3 py-2 rounded-lg"
            >
              <Save className="w-4 h-4" /> 导出报告
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 print:py-0 print:space-y-4 print:max-w-none">
        
        {/* 打印页头 (仅打印显示) */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">SmartComps 定薪分析报告</h1>
          <p className="text-sm text-slate-500">生成时间：{new Date().toLocaleDateString()}</p>
        </div>

        {/* 顶部核心指标看板 (上下分层优化版) */}
        <div className="grid grid-cols-4 gap-4">
          {/* Card 1: Total */}
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-600 print:border print:shadow-none flex flex-col justify-between">
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase mb-1">总包涨幅 (Total)</div>
              <div className="text-3xl font-bold text-indigo-700 tracking-tight">{formatPercentPrecise(stats.totalIncrease)}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400">差额 Gap</span>
              <span className="font-bold text-indigo-700">{formatCurrency(offerPkg.totalPackage - currentPkg.totalPackage)}</span>
            </div>
          </div>

          {/* Card 2: Cash */}
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500 print:border print:shadow-none flex flex-col justify-between">
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase mb-1">现金涨幅 (Cash)</div>
              <div className="text-3xl font-bold text-emerald-600 tracking-tight">{formatPercentPrecise(stats.cashIncrease)}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400">差额 Gap</span>
              <span className="font-bold text-emerald-600">{formatCurrency(offerPkg.cashTotal - currentPkg.cashTotal)}</span>
            </div>
          </div>

          {/* Card 3: Equity */}
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-400 print:border print:shadow-none flex flex-col justify-between">
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase mb-1">期权占比 (Equity)</div>
              <div className="text-3xl font-bold text-orange-500 tracking-tight">
                {formatPercentPrecise(offerPkg.totalPackage > 0 ? safeParse(salaryData.offer.stockValue) / offerPkg.totalPackage : 0)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400">目标配置</span>
              <span className="font-bold text-orange-500">{formatPercent(adviseParams.stockRatio)}</span>
            </div>
          </div>

          {/* Card 4: Offer Total */}
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-slate-500 print:border print:shadow-none flex flex-col justify-between">
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase mb-1">Offer 总包</div>
              <div className="text-2xl font-bold text-slate-800 tracking-tight truncate" title={formatCurrency(offerPkg.totalPackage)}>{formatCurrency(offerPkg.totalPackage)}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400">其中现金</span>
              <span className="font-bold text-slate-600">{formatCurrency(offerPkg.cashTotal)}</span>
            </div>
          </div>
        </div>

        {/* 1. 候选人信息 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none">
            <button 
              onClick={() => setShowCandidate(!showCandidate)}
              className="w-full flex justify-between items-center bg-white px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors print:hidden"
            >
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <User className="w-4 h-4 text-blue-600"/> 
                  <span>候选人信息</span>
                  {!showCandidate && (
                    <span className="text-xs font-normal text-slate-400 ml-2">
                      {candidateInfo.name} | {candidateInfo.position} | {candidateInfo.level}
                    </span>
                  )}
              </div>
              {showCandidate ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
            </button>
            {/* 打印时直接显示标题 */}
            <div className="hidden print:block px-4 py-2 font-bold text-sm bg-slate-50 border-b">候选人信息</div>

            {showCandidate && (
              <div className="p-4 bg-slate-50/30 print:bg-white">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <label className="text-[10px] text-slate-400 block mb-1">姓名</label>
                    <input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      value={candidateInfo.name} onChange={e => setCandidateInfo({...candidateInfo, name: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-slate-400 block mb-1">工龄</label>
                    <input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      value={candidateInfo.workYears} onChange={e => setCandidateInfo({...candidateInfo, workYears: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-slate-400 block mb-1">定级</label>
                    <input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      value={candidateInfo.level} onChange={e => setCandidateInfo({...candidateInfo, level: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-slate-400 block mb-1">岗位</label>
                    <input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      value={candidateInfo.position} onChange={e => setCandidateInfo({...candidateInfo, position: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 block mb-1">学历/形式</label>
                    <input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      value={candidateInfo.educationType} onChange={e => setCandidateInfo({...candidateInfo, educationType: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 block mb-1">院校</label>
                    <input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      value={candidateInfo.school} onChange={e => setCandidateInfo({...candidateInfo, school: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* 2. 薪资定薪区 */}
        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden relative print:border print:shadow-none">
          
          {/* 模拟控制器 (打印时隐藏滑块，只显示值) */}
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center print:bg-white print:border-b-2">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center text-sm font-bold text-slate-800">
                <Briefcase className="w-4 h-4 mr-2 text-indigo-600" /> 薪资结构
              </div>
              
              <div className="flex items-center gap-2 ml-4 bg-white/60 px-3 py-1 rounded-lg border border-indigo-100 shadow-sm print:border-none print:shadow-none print:pl-0">
                  <span className="text-[10px] font-semibold text-slate-500">目标涨幅</span>
                  <input 
                    type="range" min="0" max="0.6" step="0.05"
                    className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 print:hidden"
                    value={adviseParams.targetIncrease}
                    onChange={(e) => setAdviseParams({...adviseParams, targetIncrease: parseFloat(e.target.value)})}
                  />
                  <span className="text-xs font-bold text-indigo-600 w-8 text-right">{formatPercent(adviseParams.targetIncrease)}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-lg border border-indigo-100 shadow-sm print:border-none print:shadow-none">
                  <span className="text-[10px] font-semibold text-slate-500">期权比例</span>
                  <input 
                    type="range" min="0" max="0.5" step="0.05"
                    className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 print:hidden"
                    value={adviseParams.stockRatio}
                    onChange={(e) => setAdviseParams({...adviseParams, stockRatio: parseFloat(e.target.value)})}
                  />
                  <span className="text-xs font-bold text-orange-600 w-8 text-right">{formatPercent(adviseParams.stockRatio)}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4">
              <div className="grid grid-cols-12 gap-2 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center items-center">
                <div className="col-span-3 text-left pl-2">项目 (Item)</div>
                <div className="col-span-2">目前 (Current)</div>
                <div className="col-span-3 text-purple-600 bg-purple-50 rounded py-1 border border-purple-100 flex items-center justify-center gap-1 print:bg-white print:border-none">
                  <Wand2 className="w-3 h-3" /> 智能建议
                </div>
                <div className="col-span-2 text-emerald-600 bg-emerald-50 rounded py-1 border border-emerald-100 print:bg-white print:border-none">Offer</div>
                <div className="col-span-2">差额 (Delta)</div>
              </div>

              {/* 录入行 */}
              {[
                { label: '基本月薪 (Base)', key: 'baseMonthly', suggestVal: suggestedPkg.baseMonthly, isMain: true },
                { label: '发薪月数 (Months)', key: 'months', isNum: true, step: 0.5 },
                { label: '月度补贴 (Allowance)', key: 'fixedAllowance' },
                { label: '绩效/年终 (Bonus)', key: 'performanceBonus' },
                { label: '签字费 (Sign-on)', key: 'signOnBonus' },
                { label: '期权年化 (Stock)', key: 'stockValue', suggestVal: suggestedPkg.stock, isMain: true, hasDetail: true },
              ].map((field) => {
                const currVal = safeParse(salaryData.current[field.key]);
                const offerVal = safeParse(salaryData.offer[field.key]);
                const delta = offerVal - currVal;
                const percent = currVal > 0 ? delta / currVal : 0;
                
                let displaySuggest = '-';
                let canApply = false;
                if (field.key === 'baseMonthly' || field.key === 'stockValue') {
                    displaySuggest = formatCurrency(field.suggestVal);
                    canApply = true;
                }

                return (
                  <React.Fragment key={field.key}>
                    <div className={`grid grid-cols-12 gap-2 mb-2 items-center rounded-lg p-1 transition-all ${
                      field.isMain ? 'bg-slate-50 border border-slate-100 shadow-sm py-2 print:bg-white print:border-b' : 'hover:bg-slate-50'
                    }`}>
                      <div className="col-span-3 text-xs text-slate-700 font-medium pl-2 truncate flex items-center gap-2">
                        {field.hasDetail && (
                          <button onClick={() => setShowStockDetails(!showStockDetails)} className="text-slate-400 hover:text-indigo-600 print:hidden">
                             {showStockDetails ? <ChevronDown className="w-3 h-3"/> : <MoreHorizontal className="w-3 h-3"/>}
                          </button>
                        )}
                        <div className="flex flex-col justify-center">
                          <span>{field.label.split(' ')[0]}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{field.label.split(' ')[1]}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <input 
                          type="number" step={field.step || 100}
                          value={salaryData.current[field.key]}
                          onChange={(e) => setSalaryData({ ...salaryData, current: { ...salaryData.current, [field.key]: e.target.value } })}
                          className="w-full px-1 py-1 text-xs border border-transparent hover:border-slate-200 bg-transparent text-center focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded transition-all outline-none text-slate-600 print:border-none"
                          placeholder="0"
                        />
                      </div>

                      <div className="col-span-3 flex items-center justify-between px-2 bg-purple-50/50 rounded border border-purple-100/50 mx-1 h-full print:bg-white print:border-none">
                          <span className={`text-xs font-semibold ${field.isMain ? 'text-purple-700' : 'text-slate-300'}`}>
                            {displaySuggest}
                          </span>
                          {canApply && (
                            <button 
                              onClick={() => applySuggestion(field.key, field.suggestVal)}
                              className="text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded-full p-0.5 transition-colors print:hidden"
                            >
                              <ArrowRightCircle className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                      
                      <div className="col-span-2">
                        <input 
                          type="number" step={field.step || 100}
                          value={salaryData.offer[field.key]}
                          onChange={(e) => setSalaryData({ ...salaryData, offer: { ...salaryData.offer, [field.key]: e.target.value } })}
                          className={`w-full px-1 py-1 text-xs border rounded text-center focus:ring-2 focus:ring-emerald-200 outline-none font-bold transition-all shadow-sm ${
                            offerVal > currVal ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-800'
                          } print:border-none`}
                          placeholder="0"
                        />
                      </div>

                      <div className="col-span-2 flex flex-col items-end pr-2 justify-center h-full">
                        {field.key === 'months' ? (
                            <span className="text-xs text-slate-400">{delta > 0 ? `+${delta}` : delta === 0 ? '-' : delta}</span>
                        ) : (
                          <>
                            <div className={`text-[10px] font-mono leading-tight ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-300'}`}>
                              {formatDelta(delta)}
                            </div>
                            {delta !== 0 && currVal !== 0 && (
                              <div className={`text-[8px] px-1 rounded-sm mt-0.5 ${delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} print:border print:border-slate-200`}>
                                {formatPercent(percent)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 期权明细 (打印时强制展开如果数据存在) */}
                    {field.hasDetail && (showStockDetails || (salaryData.offer.stockCount > 0 && window.matchMedia && window.matchMedia('print').matches)) && (
                      <div className="mb-4 mx-2 p-3 bg-orange-50/50 rounded-lg border border-orange-100 grid grid-cols-12 gap-4 animate-in slide-in-from-top-2 duration-200 print:bg-white print:border-dashed">
                        <div className="col-span-12 text-[10px] font-bold text-orange-800 flex items-center gap-1 mb-1">
                           <Coins className="w-3 h-3"/> 期权Excel明细
                        </div>
                        <div className="col-span-6 space-y-2 border-r border-orange-200 pr-2">
                           <div className="text-[10px] text-slate-500 font-bold">目前 (Current)</div>
                           <div className="grid grid-cols-2 gap-2">
                              <div><label className="text-[9px] text-slate-400 block">股数</label>
                              <input type="number" className="w-full text-xs p-1 border rounded" placeholder="0" value={salaryData.current.stockCount || ''} onChange={e => setSalaryData({...salaryData, current: {...salaryData.current, stockCount: e.target.value}})} /></div>
                              <div><label className="text-[9px] text-slate-400 block">行权价</label>
                              <input type="number" className="w-full text-xs p-1 border rounded" placeholder="0" value={salaryData.current.strikePrice || ''} onChange={e => setSalaryData({...salaryData, current: {...salaryData.current, strikePrice: e.target.value}})} /></div>
                              <div><label className="text-[9px] text-slate-400 block">当前估值</label>
                              <input type="number" className="w-full text-xs p-1 border rounded" placeholder="0" value={salaryData.current.grantPrice || ''} onChange={e => setSalaryData({...salaryData, current: {...salaryData.current, grantPrice: e.target.value}})} /></div>
                              <div><label className="text-[9px] text-slate-400 block">归属(年)</label>
                              <input type="number" className="w-full text-xs p-1 border rounded" placeholder="4" value={salaryData.current.vestingYears} onChange={e => setSalaryData({...salaryData, current: {...salaryData.current, vestingYears: e.target.value}})} /></div>
                           </div>
                        </div>
                        <div className="col-span-6 space-y-2 pl-2">
                           <div className="text-[10px] text-emerald-600 font-bold">新 Offer</div>
                           <div className="grid grid-cols-2 gap-2">
                              <div><label className="text-[9px] text-slate-400 block">股数</label>
                              <input type="number" className="w-full text-xs p-1 border rounded border-emerald-100 bg-white" placeholder="0" value={salaryData.offer.stockCount || ''} onChange={e => setSalaryData({...salaryData, offer: {...salaryData.offer, stockCount: e.target.value}})} /></div>
                              <div><label className="text-[9px] text-slate-400 block">行权价</label>
                              <input type="number" className="w-full text-xs p-1 border rounded border-emerald-100 bg-white" placeholder="0" value={salaryData.offer.strikePrice || ''} onChange={e => setSalaryData({...salaryData, offer: {...salaryData.offer, strikePrice: e.target.value}})} /></div>
                              <div><label className="text-[9px] text-slate-400 block">当前估值</label>
                              <input type="number" className="w-full text-xs p-1 border rounded border-emerald-100 bg-white" placeholder="0" value={salaryData.offer.grantPrice || ''} onChange={e => setSalaryData({...salaryData, offer: {...salaryData.offer, grantPrice: e.target.value}})} /></div>
                              <div><label className="text-[9px] text-slate-400 block">归属(年)</label>
                              <input type="number" className="w-full text-xs p-1 border rounded border-emerald-100 bg-white" placeholder="4" value={salaryData.offer.vestingYears} onChange={e => setSalaryData({...salaryData, offer: {...salaryData.offer, vestingYears: e.target.value}})} /></div>
                           </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
          </div>
          
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 grid grid-cols-12 gap-2 items-center print:bg-white print:border-t-2">
              <div className="col-span-3 text-xs font-bold text-slate-700 pl-2">年度总包 (Total)</div>
              <div className="col-span-2 text-xs font-semibold text-slate-500 text-center">{formatCurrency(currentPkg.totalPackage)}</div>
              <div className="col-span-3 text-xs font-bold text-purple-600 text-center border-x border-slate-200/50 print:border-none">{formatCurrency(suggestedPkg.total)}</div>
              <div className="col-span-2 text-sm font-bold text-emerald-700 text-center">{formatCurrency(offerPkg.totalPackage)}</div>
              <div className="col-span-2 text-right pr-2">
                <span className={`text-xs font-bold ${stats.totalIncrease >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatPercent(stats.totalIncrease)}
                </span>
              </div>
          </div>
        </div>

        {/* 3. AI 评估与结构分析 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none">
               <div className="bg-gradient-to-r from-orange-50 to-white px-4 py-3 border-b border-slate-100 print:bg-white">
                  <span className="font-bold text-slate-800 text-sm flex items-center">
                     <Lightbulb className="w-4 h-4 mr-2 text-orange-500" /> AI 风险评估
                  </span>
               </div>
               <div className="p-4 space-y-2">
                  {getAdviceText().length === 0 ? (
                     <div className="text-slate-400 text-xs italic text-center py-2">暂无特殊风险提示，方案稳健。</div>
                  ) : (
                     getAdviceText().map((tip, idx) => (
                       <div key={idx} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${
                         tip.type === 'warning' ? 'bg-orange-50 border-orange-100 text-orange-800' :
                         tip.type === 'danger' ? 'bg-red-50 border-red-100 text-red-800' :
                         tip.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' :
                         'bg-emerald-50 border-emerald-100 text-emerald-800'
                       } print:bg-white print:border-slate-200 print:text-slate-800`}>
                         <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                         <span className="leading-relaxed">{tip.text}</span>
                       </div>
                     ))
                  )}
               </div>
           </div>

           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 print:border print:shadow-none">
              <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center justify-between">
                <span>结构可视化</span>
                <PieChart className="w-4 h-4 text-slate-400"/>
              </h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: '月薪', current: currentPkg.baseTotal / currentPkg.months, offer: offerPkg.baseTotal / offerPkg.months },
                    { name: '现金', current: currentPkg.cashTotal, offer: offerPkg.cashTotal },
                    { name: '总包', current: currentPkg.totalPackage, offer: offerPkg.totalPackage },
                  ]} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barSize={15}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} dy={5}/>
                    <YAxis hide />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
                      formatter={(val) => new Intl.NumberFormat('zh-CN', { notation: "compact" }).format(val)} 
                    />
                    <Legend iconSize={8} wrapperStyle={{fontSize: '10px'}} verticalAlign="top" align="right"/>
                    <Bar dataKey="current" name="目前" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="offer" name="Offer" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* 4. 社保与流水合规专区 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none">
             <button 
               onClick={() => setShowSocialDetails(!showSocialDetails)}
               className="w-full flex justify-between items-center bg-white px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors print:hidden"
             >
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                   <ShieldCheck className="w-4 h-4 text-indigo-600"/>
                   <span>社保合规 & 流水核查</span>
                   {!showSocialDetails && <span className="text-xs font-normal text-slate-400 ml-2">基数: {formatCurrency(socialSecurity.basePersonal)}</span>}
                </div>
                {showSocialDetails ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
             </button>
             {/* 打印时直接显示标题 */}
             <div className="hidden print:block px-4 py-2 font-bold text-sm bg-slate-50 border-b">社保合规 & 流水核查</div>

             {showSocialDetails && (
               <div className="grid grid-cols-1 md:grid-cols-2">
                 <div className="p-4 border-r border-slate-100 bg-slate-50/30 print:bg-white">
                    <div className="text-xs font-bold text-slate-600 mb-3">1. 基数与流水录入</div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">社保基数</label>
                        <input type="number" value={socialSecurity.basePersonal}
                          onChange={(e) => setSocialSecurity({...socialSecurity, basePersonal: e.target.value})}
                          className="w-full p-1.5 text-xs border border-slate-200 rounded" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">公积金比例</label>
                        <select className="w-full p-1.5 text-xs border border-slate-200 rounded bg-white"
                          value={socialSecurity.housingRate} onChange={(e) => setSocialSecurity({...socialSecurity, housingRate: parseFloat(e.target.value)})}>
                          <option value="0.05">5%</option>
                          <option value="0.07">7%</option>
                          <option value="0.12">12%</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] text-slate-400">近12个月实发 (元)</span>
                         <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                           月均: {formatCurrency(flowStats.avg)}
                         </span>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                         {bankFlows.map((flow, i) => (
                           <input key={i} type="number" placeholder={`M${i+1}`}
                             value={flow.amount === 0 ? '' : flow.amount}
                             onChange={(e) => {
                                const newFlows = [...bankFlows];
                                newFlows[i].amount = e.target.value;
                                setBankFlows(newFlows);
                             }}
                             className="text-[10px] p-1 border border-slate-200 rounded text-center focus:border-indigo-500 outline-none" />
                         ))}
                      </div>
                    </div>
                 </div>

                 <div className="p-4 bg-white">
                    <div className="text-xs font-bold text-slate-600 mb-3">2. 扣除明细与反推结果</div>
                    <div className="space-y-2 mb-4">
                       <div className="flex justify-between text-xs items-center p-2 bg-slate-50 rounded">
                         <span className="text-slate-500">五险一金合计(月)</span>
                         <span className="font-mono font-bold text-slate-700">{formatCurrency(deductions.total)}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 px-2">
                          <div className="flex flex-col">
                            <span>公积金</span>
                            <span className="font-medium text-slate-700">{formatCurrency(deductions.housing)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span>社保</span>
                            <span className="font-medium text-slate-700">{formatCurrency(deductions.pension + deductions.medical + deductions.unemployment)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span>个税预估</span>
                            <span className="font-medium text-slate-400">系统自算</span>
                          </div>
                       </div>
                    </div>

                    <div className="pt-3 border-t border-dashed border-slate-100">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-500">流水反推税前</span>
                          <span className="text-sm font-bold text-indigo-600">{formatCurrency(estimatedPreTax)}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Offer月度税前差额</span>
                          <span className="text-xs font-medium text-emerald-600">
                             {formatDelta(offerPkg.monthlyCash - currentPkg.monthlyCash)}
                          </span>
                       </div>
                    </div>
                 </div>
               </div>
             )}
        </div>
      </div>

      {/* 导出弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">导出定薪分析报告</h3>
                 <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-4">
                 {/* 导出 Word */}
                 <button 
                   onClick={handleExportWord}
                   className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                 >
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                      <FileDown className="w-6 h-6"/>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-slate-700">导出 Word</div>
                      <div className="text-[10px] text-slate-400 mt-1">生成 .doc 文档 (可编辑)</div>
                    </div>
                 </button>

                 {/* 导出 PDF */}
                 <button 
                   onClick={handlePrintPDF}
                   className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                 >
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full group-hover:scale-110 transition-transform">
                      <Printer className="w-6 h-6"/>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-slate-700">导出 PDF</div>
                      <div className="text-[10px] text-slate-400 mt-1">另存为 A4 PDF (打印格式)</div>
                    </div>
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default SmartSalaryApp;