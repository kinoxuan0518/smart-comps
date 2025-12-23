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
  X,
  ArrowUpRight,
  Percent,
  Swords,
  Plus,
  Trash2,
  Trophy
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';

/**
 * SmartComps - 智能薪酬分析与定薪助手 (候选人信息完整版)
 * * 核心修复：
 * 1. 【候选人信息补全】：恢复并新增“目前公司”、“年龄”、“部门同级参考”等关键字段，采用 3行x4列 布局。
 * 2. 【报告同步】：Word 导出同步包含完整的候选人背景信息。
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

const COLORS = ['#94a3b8', '#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'];

// 默认薪资结构模板
const defaultStructure = {
  baseMonthly: 0,
  months: 13,
  bonusMonths: 0,
  performanceBonus: 0,
  fixedAllowance: 0,
  signOnBonus: 0,
  other: 0,
  stockValue: 0,
  stockCount: 0,
  strikePrice: 0,
  grantPrice: 0,
  vestingYears: 4,
};

const SmartSalaryApp = () => {
  // --- 状态管理 ---
  const [showCandidate, setShowCandidate] = useState(true); 
  const [showSocialDetails, setShowSocialDetails] = useState(true); 
  const [showStockDetails, setShowStockDetails] = useState(false); 
  const [showExportModal, setShowExportModal] = useState(false); 
  const [flowType, setFlowType] = useState('preTax'); 
  const [showCompeting, setShowCompeting] = useState(false); 

  // 1. 基本信息 (字段补全)
  const [candidateInfo, setCandidateInfo] = useState({
    name: '张三',
    age: '28',
    educationType: '全日制本科',
    school: '某某大学',
    workYears: '5',
    currentCompany: '某互联网大厂', // 新增：目前公司
    position: '高级前端工程师',
    level: 'P7',
    peerReference: '李四 (P7)', // 新增：部门同级参考
  });

  // 2. 薪资数据
  const [salaryData, setSalaryData] = useState({
    current: { ...defaultStructure, baseMonthly: 16672, performanceBonus: 15360, stockValue: 50000 },
    offer: { ...defaultStructure, baseMonthly: 22000, months: 14, bonusMonths: 3, performanceBonus: 66000, stockValue: 100000 },
    competitors: [
      { id: 1, name: '竞对 A', data: { ...defaultStructure, baseMonthly: 21000, months: 14, performanceBonus: 40000, stockValue: 80000 } },
      { id: 2, name: '竞对 B', data: { ...defaultStructure, baseMonthly: 23000, months: 13, performanceBonus: 30000, stockValue: 0 } }
    ]
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
    beatCompetitorPremium: 0.05 
  });

  // --- 竞对管理逻辑 ---
  const addCompetitor = () => {
    const newId = salaryData.competitors.length > 0 ? Math.max(...salaryData.competitors.map(c => c.id)) + 1 : 1;
    const nextLabel = String.fromCharCode(65 + salaryData.competitors.length);
    setSalaryData(prev => ({
      ...prev,
      competitors: [...prev.competitors, { id: newId, name: `竞对 ${nextLabel}`, data: { ...defaultStructure } }]
    }));
  };

  const removeCompetitor = (id) => {
    setSalaryData(prev => ({
      ...prev,
      competitors: prev.competitors.filter(c => c.id !== id)
    }));
  };

  const updateCompetitorData = (id, field, value) => {
    setSalaryData(prev => ({
      ...prev,
      competitors: prev.competitors.map(c => 
        c.id === id ? { ...c, data: { ...c.data, [field]: value } } : c
      )
    }));
  };

  const updateCompetitorName = (id, name) => {
    setSalaryData(prev => ({
      ...prev,
      competitors: prev.competitors.map(c => 
        c.id === id ? { ...c, name: name } : c
      )
    }));
  };

  // --- 核心计算逻辑 ---
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
  
  const competitorStats = useMemo(() => {
    let maxPkg = 0;
    let maxComp = null;
    const allPkgs = salaryData.competitors.map(c => {
        const pkg = calculatePackage(c.data);
        if (pkg.totalPackage > maxPkg) {
            maxPkg = pkg.totalPackage;
            maxComp = c;
        }
        return { id: c.id, ...pkg };
    });
    return { maxPkg, maxComp, allPkgs };
  }, [salaryData.competitors]);

  const suggestedPkg = useMemo(() => {
    const targetBasedOnCurrent = currentPkg.totalPackage * (1 + adviseParams.targetIncrease);
    const targetBasedOnCompetitor = competitorStats.maxPkg > 0 
      ? competitorStats.maxPkg * (1 + adviseParams.beatCompetitorPremium) 
      : 0;

    const finalTargetTotal = Math.max(targetBasedOnCurrent, targetBasedOnCompetitor);

    const stockPart = finalTargetTotal * adviseParams.stockRatio;
    const cashPart = finalTargetTotal - stockPart;
    
    const months = safeParse(salaryData.offer.months) || safeParse(salaryData.current.months) || 12;
    const bonus = safeParse(salaryData.offer.performanceBonus);
    const signOn = safeParse(salaryData.offer.signOnBonus);
    const allowance = safeParse(salaryData.offer.fixedAllowance) * 12;
    const other = safeParse(salaryData.offer.other);
    
    let suggestedBase = (cashPart - bonus - signOn - allowance - other) / months;
    if (suggestedBase < 0) suggestedBase = 0; 

    return { 
      total: finalTargetTotal, 
      stock: stockPart, 
      baseMonthly: suggestedBase, 
      cashTotal: cashPart,
      isBasedOnCompetitor: targetBasedOnCompetitor > targetBasedOnCurrent
    };
  }, [currentPkg.totalPackage, adviseParams, salaryData.offer, salaryData.current, competitorStats.maxPkg]);

  const stats = useMemo(() => {
    const cashIncrease = currentPkg.cashTotal > 0 ? (offerPkg.cashTotal - currentPkg.cashTotal) / currentPkg.cashTotal : 0;
    const totalIncrease = currentPkg.totalPackage > 0 ? (offerPkg.totalPackage - currentPkg.totalPackage) / currentPkg.totalPackage : 0;
    const stockIncrease = currentPkg.totalPackage > 0 && salaryData.current.stockValue > 0 
        ? (salaryData.offer.stockValue - salaryData.current.stockValue) / salaryData.current.stockValue 
        : 0;
    return { cashIncrease, totalIncrease, stockIncrease };
  }, [currentPkg, offerPkg, salaryData]);

  const flowStats = useMemo(() => {
    const total = bankFlows.reduce((sum, item) => sum + safeParse(item.amount), 0);
    const avg = bankFlows.filter(f => safeParse(f.amount) > 0).length > 0 ? total / bankFlows.filter(f => safeParse(f.amount) > 0).length : 0;
    return { total, avg };
  }, [bankFlows]);

  const calculateSocialDeduction = (base) => (socialSecurity.housingRate + socialSecurity.pensionRate + socialSecurity.medicalRate + socialSecurity.unemploymentRate) * base;
  
  const reverseCalculatePreTax = (netIncome) => {
    if (!netIncome) return 0;
    const deduction = calculateSocialDeduction(socialSecurity.basePersonal); 
    const threshold = 5000;
    let low = netIncome; let high = netIncome * 2; let guess = low;
    for(let i=0; i<20; i++) { 
       guess = (low + high) / 2;
       const taxable = Math.max(0, guess - deduction - threshold);
       let tax = 0;
       if(taxable <= 3000) tax = taxable * 0.03;
       else if(taxable <= 12000) tax = taxable * 0.1 - 210;
       else if(taxable <= 25000) tax = taxable * 0.2 - 1410;
       else if(taxable <= 35000) tax = taxable * 0.25 - 2660;
       else if(taxable <= 55000) tax = taxable * 0.3 - 4410;
       else if(taxable <= 80000) tax = taxable * 0.35 - 7160;
       else tax = taxable * 0.45 - 15160;
       const calculatedNet = guess - deduction - tax;
       if (Math.abs(calculatedNet - netIncome) < 1) break;
       if (calculatedNet > netIncome) high = guess; else low = guess;
    }
    return guess;
  };

  const realTotalPreTaxIncome = useMemo(() => {
    return bankFlows.reduce((sum, item) => {
      const val = safeParse(item.amount);
      if (val === 0) return sum;
      if (flowType === 'preTax') return sum + val;
      else return sum + reverseCalculatePreTax(val);
    }, 0);
  }, [bankFlows, flowType, socialSecurity]);

  const estimatedPreTax = useMemo(() => {
    if (flowStats.avg === 0) return 0;
    const socialRate = socialSecurity.housingRate + socialSecurity.pensionRate + socialSecurity.medicalRate + socialSecurity.unemploymentRate;
    let taxRate = 0.05; 
    if (flowStats.avg > 20000) taxRate = 0.10;
    if (flowStats.avg > 30000) taxRate = 0.15;
    if (flowStats.avg > 50000) taxRate = 0.20;
    return flowStats.avg / (1 - socialRate - taxRate);
  }, [flowStats.avg, socialSecurity]);

  const deductions = useMemo(() => {
    const rate = socialSecurity.housingRate + socialSecurity.pensionRate + socialSecurity.medicalRate + socialSecurity.unemploymentRate;
    const total = socialSecurity.basePersonal * rate;
    return { total, housing: socialSecurity.basePersonal * socialSecurity.housingRate, pension: socialSecurity.basePersonal * socialSecurity.pensionRate };
  }, [socialSecurity]);

  const calculatedRealBonusMonths = useMemo(() => {
    const base = safeParse(salaryData.current.baseMonthly);
    const fixedMonths = safeParse(salaryData.current.months); 
    const allowance = safeParse(salaryData.current.fixedAllowance) * 12;
    const signOn = safeParse(salaryData.current.signOnBonus);
    const other = safeParse(salaryData.current.other);
    if (base === 0 || realTotalPreTaxIncome === 0) return 0;
    const fixedIncome = (base * fixedMonths) + allowance + signOn + other;
    const bonusPart = realTotalPreTaxIncome - fixedIncome;
    if (bonusPart <= 0) return 0;
    return bonusPart / base;
  }, [realTotalPreTaxIncome, salaryData.current]);

  const handleBonusMonthsChange = (type, months, compId = null) => {
    if (type === 'competing' && compId) {
       const comp = salaryData.competitors.find(c => c.id === compId);
       const base = safeParse(comp.data.baseMonthly);
       updateCompetitorData(compId, 'bonusMonths', months);
       updateCompetitorData(compId, 'performanceBonus', Math.round(base * months));
    } else if (type === 'current' || type === 'offer') {
       const base = safeParse(salaryData[type].baseMonthly);
       setSalaryData(prev => ({ ...prev, [type]: { ...prev[type], bonusMonths: months, performanceBonus: Math.round(base * months) } }));
    }
  };

  const handleBonusAmountChange = (type, amount, compId = null) => {
    if (type === 'competing' && compId) {
       const comp = salaryData.competitors.find(c => c.id === compId);
       const base = safeParse(comp.data.baseMonthly);
       updateCompetitorData(compId, 'performanceBonus', amount);
       if (base > 0) updateCompetitorData(compId, 'bonusMonths', (amount/base).toFixed(1));
    } else if (type === 'current' || type === 'offer') {
       const base = safeParse(salaryData[type].baseMonthly);
       let months = 0; if (base > 0) months = (amount / base).toFixed(1);
       setSalaryData(prev => ({ ...prev, [type]: { ...prev[type], performanceBonus: amount, bonusMonths: months } }));
    }
  };

  const applyRealBonusMonths = () => {
    const months = parseFloat(calculatedRealBonusMonths.toFixed(1));
    handleBonusMonthsChange('current', months);
  };

  const applySuggestion = (field, value) => {
    setSalaryData({
      ...salaryData,
      offer: { ...salaryData.offer, [field]: Math.round(value / 100) * 100 }
    });
  };

  const getAdviceText = () => {
    const tips = [];
    if (suggestedPkg.isBasedOnCompetitor) {
      tips.push({ type: 'info', text: `AI 建议已自动上调，以应对最高竞对 ${competitorStats.maxComp?.name} (${formatCurrency(competitorStats.maxPkg)})。`});
    }
    if (offerPkg.totalPackage < competitorStats.maxPkg) {
      tips.push({ type: 'danger', text: `当前 Offer 总包 (${formatCurrency(offerPkg.totalPackage)}) 低于最高竞对 ${competitorStats.maxComp?.name} (${formatCurrency(competitorStats.maxPkg)})，存在拒签风险。`});
    }
    if (stats.cashIncrease < 0.10 && stats.cashIncrease >= 0) tips.push({ type: 'warning', text: '现金涨幅低于10%，接Offer意愿可能较低。' });
    if (stats.cashIncrease < 0) tips.push({ type: 'danger', text: '现金负增长，风险极高。' });
    if (safeParse(salaryData.offer.stockValue) / offerPkg.totalPackage > 0.4) tips.push({ type: 'warning', text: '期权占比超40%，依赖长期价值。' });
    
    if (tips.length === 0 && stats.totalIncrease > 0.15) tips.push({ type: 'good', text: '方案结构平衡，风险可控。' });
    return tips;
  };

  const handlePrintPDF = () => { setShowExportModal(false); setShowCandidate(true); setShowSocialDetails(true); setTimeout(() => window.print(), 500); };
  
  const handleExportWord = () => {
    const compRows = salaryData.competitors.map(c => `<th>${c.name}</th>`).join('');
    const compCellsBase = salaryData.competitors.map(c => `<td>${formatCurrency(c.data.baseMonthly)}</td>`).join('');
    const compCellsTotal = salaryData.competitors.map(c => {
       const pkg = calculatePackage(c.data);
       return `<td>${formatCurrency(pkg.totalPackage)}</td>`;
    }).join('');

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>SmartComps</title>
      <style>table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #000;padding:8px;text-align:center}</style>
      </head><body>
      <h3>SmartComps 定薪分析报告</h3>
      <div class="section-title">一、候选人信息</div>
      <table>
        <tr><td>姓名</td><td>${candidateInfo.name}</td><td>工龄</td><td>${candidateInfo.workYears}</td></tr>
        <tr><td>岗位</td><td>${candidateInfo.position}</td><td>定级</td><td>${candidateInfo.level}</td></tr>
        <tr><td>学历</td><td>${candidateInfo.educationType}</td><td>院校</td><td>${candidateInfo.school}</td></tr>
        <tr><td>目前公司</td><td>${candidateInfo.currentCompany}</td><td>对标人员</td><td>${candidateInfo.peerReference}</td></tr>
      </table>
      <h4>薪资方案对比</h4>
      <table>
        <tr><th>项目</th><th>目前</th>${compRows}<th>Offer</th><th>差异</th></tr>
        <tr><td>基本月薪</td><td>${formatCurrency(salaryData.current.baseMonthly)}</td>${compCellsBase}<td>${formatCurrency(salaryData.offer.baseMonthly)}</td><td>${formatDelta(salaryData.offer.baseMonthly - salaryData.current.baseMonthly)}</td></tr>
        <tr><td><strong>年度总包</strong></td><td>${formatCurrency(currentPkg.totalPackage)}</td>${compCellsTotal}<td><strong>${formatCurrency(offerPkg.totalPackage)}</strong></td><td>${formatPercentPrecise(stats.totalIncrease)}</td></tr>
      </table>
      </body></html>
    `;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `定薪报告_${candidateInfo.name}.doc`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); setShowExportModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10 print:bg-white print:pb-0">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm print:hidden">
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg"><TrendingUp className="text-white w-4 h-4" /></div>
              <span className="font-bold text-lg tracking-tight text-slate-800">SmartComps <span className="text-slate-400 font-normal text-sm ml-2">定薪工作台</span></span>
            </div>
            <button onClick={() => setShowExportModal(true)} className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm font-medium hover:bg-slate-50 px-3 py-2 rounded-lg">
              <Save className="w-4 h-4" /> 导出报告
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-6 space-y-6 print:py-0 print:space-y-4">
        
        {/* 指标看板 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-600 print:border print:shadow-none flex flex-col justify-between">
            <div><div className="text-slate-500 text-xs font-bold uppercase mb-1">总包涨幅 (Total)</div><div className="text-3xl font-bold text-indigo-700 tracking-tight">{formatPercentPrecise(stats.totalIncrease)}</div></div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs"><span className="text-slate-400">差额 Gap</span><span className="font-bold text-indigo-700">{formatCurrency(offerPkg.totalPackage - currentPkg.totalPackage)}</span></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500 print:border print:shadow-none flex flex-col justify-between">
            <div><div className="text-slate-500 text-xs font-bold uppercase mb-1">现金涨幅 (Cash)</div><div className="text-3xl font-bold text-emerald-600 tracking-tight">{formatPercentPrecise(stats.cashIncrease)}</div></div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs"><span className="text-slate-400">差额 Gap</span><span className="font-bold text-emerald-600">{formatCurrency(offerPkg.cashTotal - currentPkg.cashTotal)}</span></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-400 print:border print:shadow-none flex flex-col justify-between">
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase mb-1">期权占比 / 涨幅</div>
              <div className="flex items-baseline gap-2">
                 <div className="text-3xl font-bold text-orange-500 tracking-tight">{formatPercentPrecise(offerPkg.totalPackage > 0 ? safeParse(salaryData.offer.stockValue) / offerPkg.totalPackage : 0)}</div>
                 {salaryData.current.stockValue > 0 && <div className={`text-xs font-bold ${stats.stockIncrease >= 0 ? 'text-emerald-500' : 'text-red-500'} bg-slate-50 px-1 rounded`}>{stats.stockIncrease > 0 ? '+' : ''}{formatPercent(stats.stockIncrease)} Incr.</div>}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs"><span className="text-slate-400">目标配置</span><span className="font-bold text-orange-500">{formatPercent(adviseParams.stockRatio)}</span></div>
          </div>
          <div className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${offerPkg.totalPackage > competitorStats.maxPkg ? 'border-slate-500' : 'border-red-500'} print:border print:shadow-none flex flex-col justify-between`}>
            <div><div className="text-slate-500 text-xs font-bold uppercase mb-1">Offer 总包</div><div className="text-2xl font-bold text-slate-800 tracking-tight truncate">{formatCurrency(offerPkg.totalPackage)}</div></div>
            {/* Max Threat Indicator */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400">vs 最高竞对</span>
              {competitorStats.maxPkg > 0 ? (
                <span className={`font-bold ${offerPkg.totalPackage > competitorStats.maxPkg ? 'text-emerald-600' : 'text-red-500'}`}>
                  {offerPkg.totalPackage > competitorStats.maxPkg ? '领先' : '落后'} {formatDelta(offerPkg.totalPackage - competitorStats.maxPkg)}
                </span>
              ) : <span className="text-slate-300">暂无竞对</span>}
            </div>
          </div>
        </div>

        {/* 候选人信息 (完整版) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none">
            <button onClick={() => setShowCandidate(!showCandidate)} className="w-full flex justify-between items-center bg-white px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors print:hidden">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm"><User className="w-4 h-4 text-blue-600"/> <span>候选人信息</span></div>
              {showCandidate ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
            </button>
            {showCandidate && (
              <div className="p-4 bg-slate-50/30 print:bg-white">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1"><label className="text-[10px] text-slate-400 block mb-1">姓名</label><input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" value={candidateInfo.name} onChange={e => setCandidateInfo({...candidateInfo, name: e.target.value})} /></div>
                  <div className="col-span-1"><label className="text-[10px] text-slate-400 block mb-1">年龄</label><input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" value={candidateInfo.age} onChange={e => setCandidateInfo({...candidateInfo, age: e.target.value})} /></div>
                  <div className="col-span-1"><label className="text-[10px] text-slate-400 block mb-1">工龄</label><input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" value={candidateInfo.workYears} onChange={e => setCandidateInfo({...candidateInfo, workYears: e.target.value})} /></div>
                  <div className="col-span-1"><label className="text-[10px] text-slate-400 block mb-1">学历/形式</label><input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" value={candidateInfo.educationType} onChange={e => setCandidateInfo({...candidateInfo, educationType: e.target.value})} /></div>
                  
                  <div className="col-span-1"><label className="text-[10px] text-slate-400 block mb-1">毕业院校</label><input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" value={candidateInfo.school} onChange={e => setCandidateInfo({...candidateInfo, school: e.target.value})} /></div>
                  <div className="col-span-1"><label className="text-[10px] text-slate-400 block mb-1">目前公司</label><input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" value={candidateInfo.currentCompany} onChange={e => setCandidateInfo({...candidateInfo, currentCompany: e.target.value})} /></div>
                  <div className="col-span-1"><label className="text-[10px] text-slate-400 block mb-1">岗位</label><input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" value={candidateInfo.position} onChange={e => setCandidateInfo({...candidateInfo, position: e.target.value})} /></div>
                  <div className="col-span-1"><label className="text-[10px] text-slate-400 block mb-1">定级</label><input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" value={candidateInfo.level} onChange={e => setCandidateInfo({...candidateInfo, level: e.target.value})} /></div>
                  
                  <div className="col-span-2"><label className="text-[10px] text-slate-400 block mb-1">部门同级参考</label><input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" value={candidateInfo.peerReference} onChange={e => setCandidateInfo({...candidateInfo, peerReference: e.target.value})} /></div>
                </div>
              </div>
            )}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden relative print:border print:shadow-none">
          {/* Slider Control Bar */}
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center print:bg-white print:border-b-2">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center text-sm font-bold text-slate-800"><Briefcase className="w-4 h-4 mr-2 text-indigo-600" /> 薪资结构</div>
              {/* Target Increase Slider */}
              <div className="flex items-center gap-2 ml-4 bg-white/60 px-3 py-1 rounded-lg border border-indigo-100 shadow-sm print:border-none print:shadow-none print:pl-0">
                  <span className="text-[10px] font-semibold text-slate-500">目标涨幅</span>
                  <input type="range" min="0" max="0.6" step="0.05" className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 print:hidden" value={adviseParams.targetIncrease} onChange={(e) => setAdviseParams({...adviseParams, targetIncrease: parseFloat(e.target.value)})} />
                  <span className="text-xs font-bold text-indigo-600 w-8 text-right">{formatPercent(adviseParams.targetIncrease)}</span>
              </div>
              {/* Stock Ratio Slider */}
              <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-lg border border-indigo-100 shadow-sm print:border-none print:shadow-none">
                  <span className="text-[10px] font-semibold text-slate-500">期权比例</span>
                  <input type="range" min="0" max="0.5" step="0.05" className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 print:hidden" value={adviseParams.stockRatio} onChange={(e) => setAdviseParams({...adviseParams, stockRatio: parseFloat(e.target.value)})} />
                  <span className="text-xs font-bold text-orange-600 w-8 text-right">{formatPercent(adviseParams.stockRatio)}</span>
              </div>
            </div>
            
            {/* 竞对 Offer 开关 */}
            <button onClick={() => setShowCompeting(!showCompeting)} className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-medium border ${showCompeting ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
              <Swords className="w-3.5 h-3.5" /> {showCompeting ? '隐藏竞对' : '添加竞对 Offer'}
            </button>
          </div>
          
          <div className="p-4 overflow-x-auto">
              {/* Dynamic Grid Layout */}
              <div className={`flex gap-4 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center items-center ${showCompeting ? 'min-w-[800px]' : 'w-full grid grid-cols-12'}`}>
                <div className={`${showCompeting ? 'w-24 text-left pl-2 flex-shrink-0' : 'col-span-3 text-left pl-2'}`}>项目</div>
                <div className={`${showCompeting ? 'w-24 flex-shrink-0' : 'col-span-2'}`}>目前 (Current)</div>
                
                {/* 动态渲染竞对列头 (仅在开启时显示) */}
                {showCompeting && salaryData.competitors.map((comp) => (
                  <div key={comp.id} className="w-28 flex-shrink-0 flex flex-col gap-1 relative group">
                     <div className={`rounded py-1 border flex items-center justify-between px-2 ${comp.id === competitorStats.maxComp?.id ? 'bg-red-50 text-red-700 border-red-200' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                        <input className="bg-transparent w-full text-center outline-none font-bold" value={comp.name} onChange={(e) => updateCompetitorName(comp.id, e.target.value)} />
                        <button onClick={() => removeCompetitor(comp.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 absolute -top-2 -right-2 bg-white rounded-full p-0.5 border shadow-sm"><X className="w-3 h-3"/></button>
                     </div>
                     {comp.id === competitorStats.maxComp?.id && <div className="text-[8px] text-red-500 flex justify-center items-center gap-0.5"><Trophy className="w-2 h-2"/> 最高竞对</div>}
                  </div>
                ))}
                {showCompeting && <button onClick={addCompetitor} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-colors flex-shrink-0"><Plus className="w-4 h-4"/></button>}

                {/* AI建议列 */}
                <div className={`${showCompeting ? 'w-28 flex-shrink-0 flex-col justify-center' : 'col-span-3'} text-purple-600 bg-purple-50 rounded py-1 print:hidden flex flex-col items-center justify-center`}>
                   <div className="flex items-center justify-center gap-1"><Wand2 className="w-3 h-3 inline mr-1" />建议值</div>
                   {suggestedPkg.isBasedOnCompetitor && <span className="text-[8px] text-purple-400">已锚定竞对</span>}
                </div>

                <div className={`${showCompeting ? 'w-24 flex-shrink-0' : 'col-span-2'} text-emerald-600 bg-emerald-50 rounded py-1 border border-emerald-100 print:bg-white print:border-none`}>Offer</div>
                <div className={`${showCompeting ? 'w-20 flex-shrink-0' : 'col-span-2'}`}>差额</div>
              </div>

              {/* Rows Generator */}
              {[
                { label: '基本月薪 (Base)', key: 'baseMonthly', suggestVal: suggestedPkg.baseMonthly, isMain: true },
                { label: '发薪月数 (Months)', key: 'months', isNum: true, step: 0.5 },
                { label: '月度补贴 (Allowance)', key: 'fixedAllowance' },
                { label: '年终奖月数 (Bonus M)', key: 'bonusMonths', isNum: true, step: 0.1 }, // Restored
                { label: '绩效/年终 (Bonus)', key: 'performanceBonus' }, 
                { label: '签字费 (Sign-on)', key: 'signOnBonus' },
                { label: '其他奖金 (Other)', key: 'other' },
                { label: '期权年化 (Stock)', key: 'stockValue', suggestVal: suggestedPkg.stock, isMain: true, hasDetail: true },
              ].map((field) => {
                const currVal = safeParse(salaryData.current[field.key]);
                const offerVal = safeParse(salaryData.offer[field.key]);
                const delta = offerVal - currVal;
                
                let displaySuggest = '-';
                let canApply = false;
                if (field.key === 'baseMonthly' || field.key === 'stockValue') {
                    displaySuggest = formatCurrency(field.suggestVal);
                    canApply = true;
                }

                // Detect special rows
                const isBonusAmountRow = field.key === 'performanceBonus';
                const isBonusMonthsRow = field.key === 'bonusMonths';

                // Grid vs Flex conditional classes for row wrapper
                const rowContainerClass = showCompeting 
                  ? "flex gap-4 mb-2 items-center rounded-lg p-1 transition-all min-w-[800px]" 
                  : "grid grid-cols-12 gap-2 mb-2 items-center rounded-lg p-1 transition-all w-full";

                // Cell widths based on mode
                const labelClass = showCompeting ? "w-24 flex-shrink-0" : "col-span-3 text-left pl-2";
                const inputClass = showCompeting ? "w-24 flex-shrink-0" : "col-span-2";
                const suggestClass = showCompeting ? "w-28 flex-shrink-0" : "col-span-3";
                const deltaClass = showCompeting ? "w-20 flex-shrink-0" : "col-span-2";

                return (
                  <div key={field.key} className={`${rowContainerClass} ${field.isMain ? 'bg-slate-50 border border-slate-100 shadow-sm py-2' : 'hover:bg-slate-50'}`}>
                      {/* Label */}
                      <div className={`${labelClass} text-xs text-slate-700 font-medium pl-2 truncate flex items-center gap-2`}>
                        {field.hasDetail && <button onClick={() => setShowStockDetails(!showStockDetails)} className="text-slate-400 hover:text-indigo-600 print:hidden"><MoreHorizontal className="w-3 h-3"/></button>}
                        <div className="flex flex-col justify-center"><span>{field.label.split(' ')[0]}</span><span className="text-[10px] text-slate-400 font-normal">{field.label.split(' ')[1]}</span></div>
                      </div>
                      
                      {/* Current */}
                      <div className={inputClass}>
                        <input 
                          type="number" step={field.step || 100} value={salaryData.current[field.key]} 
                          onChange={(e) => {
                            if (isBonusAmountRow) handleBonusAmountChange('current', e.target.value);
                            else if (isBonusMonthsRow) handleBonusMonthsChange('current', e.target.value);
                            else setSalaryData({ ...salaryData, current: { ...salaryData.current, [field.key]: e.target.value } });
                          }} 
                          className="w-full px-1 py-1 text-xs border border-transparent hover:border-slate-200 bg-transparent text-center focus:bg-white focus:border-indigo-500 rounded outline-none text-slate-600" placeholder="0" 
                        />
                      </div>

                      {/* Competitors Columns (Only visible when active) */}
                      {showCompeting && salaryData.competitors.map(comp => (
                        <div key={comp.id} className="w-28 flex-shrink-0">
                           <input 
                             type="number" step={field.step || 100} value={comp.data[field.key]} 
                             onChange={(e) => {
                               if (isBonusAmountRow) handleBonusAmountChange('competing', e.target.value, comp.id);
                               else if (isBonusMonthsRow) handleBonusMonthsChange('competing', e.target.value, comp.id);
                               else updateCompetitorData(comp.id, field.key, e.target.value);
                             }} 
                             className="w-full px-1 py-1 text-xs border border-purple-100 bg-purple-50/20 rounded text-center text-purple-700 outline-none focus:ring-1 focus:ring-purple-200" placeholder="0" 
                           />
                        </div>
                      ))}
                      {showCompeting && <div className="w-8 flex-shrink-0"></div>}

                      {/* Suggested */}
                      <div className={`${suggestClass} flex items-center justify-between px-2 bg-purple-50/50 rounded border border-purple-100/50 h-full`}>
                          <span className={`text-xs font-semibold ${field.isMain ? 'text-purple-700' : 'text-slate-300'}`}>{displaySuggest}</span>
                          {canApply && <button onClick={() => applySuggestion(field.key, field.suggestVal)} className="text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded-full p-0.5 transition-colors print:hidden"><ArrowRightCircle className="w-4 h-4" /></button>}
                      </div>
                      
                      {/* Offer */}
                      <div className={inputClass}>
                        <input 
                          type="number" step={field.step || 100} value={salaryData.offer[field.key]} 
                          onChange={(e) => {
                            if (isBonusAmountRow) handleBonusAmountChange('offer', e.target.value);
                            else if (isBonusMonthsRow) handleBonusMonthsChange('offer', e.target.value);
                            else setSalaryData({ ...salaryData, offer: { ...salaryData.offer, [field.key]: e.target.value } });
                          }} 
                          className={`w-full px-1 py-1 text-xs border rounded text-center focus:ring-2 focus:ring-emerald-200 outline-none font-bold transition-all shadow-sm ${offerVal > currVal ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-800'}`} placeholder="0" 
                        />
                      </div>

                      {/* Delta */}
                      <div className={`${deltaClass} flex flex-col items-end pr-2 justify-center h-full`}>
                        <div className={`text-[10px] font-mono leading-tight ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-300'}`}>{formatDelta(delta)}</div>
                      </div>
                  </div>
                );
              })}
          </div>
          
          {/* Total Footer (Adaptive) */}
          <div className={`bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center print:bg-white print:border-t-2 ${showCompeting ? 'gap-4 min-w-[800px] overflow-x-auto' : 'grid grid-cols-12 gap-2'}`}>
              <div className={`${showCompeting ? 'w-24' : 'col-span-3 text-left pl-2'} text-xs font-bold text-slate-700 flex-shrink-0`}>年度总包 (Total)</div>
              <div className={`${showCompeting ? 'w-24' : 'col-span-2'} text-xs font-semibold text-slate-500 text-center flex-shrink-0`}>{formatCurrency(currentPkg.totalPackage)}</div>
              
              {showCompeting && salaryData.competitors.map(comp => {
                 const pkg = calculatePackage(comp.data);
                 return <div key={comp.id} className="w-28 text-xs font-bold text-purple-600 text-center flex-shrink-0">{formatCurrency(pkg.totalPackage)}</div>;
              })}
              {showCompeting && <div className="w-8 flex-shrink-0"></div>}

              <div className={`${showCompeting ? 'w-28' : 'col-span-3'} text-xs font-bold text-purple-600 text-center border-x border-slate-200/50 flex-shrink-0`}>{formatCurrency(suggestedPkg.total)}</div>
              <div className={`${showCompeting ? 'w-24' : 'col-span-2'} text-sm font-bold text-emerald-700 text-center flex-shrink-0`}>{formatCurrency(offerPkg.totalPackage)}</div>
              <div className={`${showCompeting ? 'w-20' : 'col-span-2'} text-right pr-2 flex-shrink-0`}><span className={`text-xs font-bold ${stats.totalIncrease >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatPercent(stats.totalIncrease)}</span></div>
          </div>
        </div>

        {/* 3. AI 评估与结构分析 (图表支持多竞对) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none">
               <div className="bg-gradient-to-r from-orange-50 to-white px-4 py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-800 text-sm flex items-center"><Lightbulb className="w-4 h-4 mr-2 text-orange-500" /> AI 风险评估</span>
               </div>
               <div className="p-4 space-y-2">
                  {getAdviceText().length === 0 ? <div className="text-slate-400 text-xs italic text-center py-2">暂无特殊风险提示，方案稳健。</div> : getAdviceText().map((tip, idx) => (<div key={idx} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${tip.type === 'warning' ? 'bg-orange-50 border-orange-100 text-orange-800' : tip.type === 'danger' ? 'bg-red-50 border-red-100 text-red-800' : tip.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span className="leading-relaxed">{tip.text}</span></div>))}
               </div>
           </div>

           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 print:border print:shadow-none">
              <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center justify-between"><span>全景结构对比</span><PieChart className="w-4 h-4 text-slate-400"/></h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: '月薪', current: currentPkg.baseTotal/currentPkg.months, offer: offerPkg.baseTotal/offerPkg.months, ...salaryData.competitors.reduce((acc, c) => ({...acc, [c.name]: safeParse(c.data.baseMonthly)}), {}) },
                    { name: '现金', current: currentPkg.cashTotal, offer: offerPkg.cashTotal, ...salaryData.competitors.reduce((acc, c) => ({...acc, [c.name]: calculatePackage(c.data).cashTotal}), {}) },
                    { name: '总包', current: currentPkg.totalPackage, offer: offerPkg.totalPackage, ...salaryData.competitors.reduce((acc, c) => ({...acc, [c.name]: calculatePackage(c.data).totalPackage}), {}) },
                  ]} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} dy={5}/>
                    <YAxis hide />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} formatter={(val) => new Intl.NumberFormat('zh-CN', { notation: "compact" }).format(val)} />
                    <Legend iconSize={8} wrapperStyle={{fontSize: '10px'}} verticalAlign="top" align="right"/>
                    <Bar dataKey="current" name="目前" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    {showCompeting && salaryData.competitors.map((c, i) => <Bar key={c.id} dataKey={c.name} name={c.name} fill={COLORS[(i+1)%COLORS.length]} radius={[4, 4, 0, 0]} />)}
                    <Bar dataKey="offer" name="Offer" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* 4. 社保与流水合规专区 (保持不变) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none">
             <button onClick={() => setShowSocialDetails(!showSocialDetails)} className="w-full flex justify-between items-center bg-white px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors print:hidden">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm"><ShieldCheck className="w-4 h-4 text-indigo-600"/><span>社保合规 & 流水核查</span></div>
                {showSocialDetails ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
             </button>
             {showSocialDetails && (
               <div className="grid grid-cols-1 md:grid-cols-2">
                 <div className="p-4 border-r border-slate-100 bg-slate-50/30 print:bg-white">
                    <div className="flex justify-between items-center mb-3">
                       <div className="text-xs font-bold text-slate-600">1. 个税APP流水录入</div>
                       <div className="flex bg-slate-200 rounded p-0.5">
                          <button onClick={() => setFlowType('preTax')} className={`text-[10px] px-2 py-0.5 rounded transition-all ${flowType === 'preTax' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>税前申报</button>
                          <button onClick={() => setFlowType('afterTax')} className={`text-[10px] px-2 py-0.5 rounded transition-all ${flowType === 'afterTax' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>银行实发</button>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-slate-200">
                      <div><label className="text-[10px] text-slate-400 block mb-1">社保基数</label><input type="number" className="w-full p-1.5 text-xs border border-slate-200 rounded" value={socialSecurity.basePersonal} onChange={e => setSocialSecurity({...socialSecurity, basePersonal: e.target.value})}/></div>
                      <div><label className="text-[10px] text-slate-400 block mb-1">公积金比例</label><select className="w-full p-1.5 text-xs border border-slate-200 rounded bg-white" value={socialSecurity.housingRate} onChange={e => setSocialSecurity({...socialSecurity, housingRate: parseFloat(e.target.value)})}> <option value="0.05">5%</option> <option value="0.07">7%</option> <option value="0.12">12%</option> </select></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                       {bankFlows.map((flow, i) => (
                         <div key={i} className="relative">
                           <span className="absolute left-1.5 top-1.5 text-[9px] text-slate-400">M{i+1}</span>
                           <input type="number" className="w-full pl-6 p-1 text-[10px] border border-slate-200 rounded text-center focus:border-indigo-500 outline-none" value={flow.amount === 0 ? '' : flow.amount} onChange={(e) => { const newFlows = [...bankFlows]; newFlows[i].amount = e.target.value; setBankFlows(newFlows); }} />
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="p-4 bg-white flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-600 mb-3">2. 智能反推结果</div>
                      <div className="bg-indigo-50 rounded-lg p-3 space-y-2 border border-indigo-100">
                         <div className="flex justify-between items-center text-xs"><span className="text-slate-500">年度实际税前总收入</span><span className="font-bold text-indigo-700">{formatCurrency(realTotalPreTaxIncome)}</span></div>
                         <div className="flex justify-between items-center text-xs"><span className="text-slate-500">扣除固定年薪 (Base×{salaryData.current.months})</span><span className="text-slate-400">-{formatCurrency(safeParse(salaryData.current.baseMonthly) * safeParse(salaryData.current.months) + safeParse(salaryData.current.fixedAllowance)*12 + safeParse(salaryData.current.signOnBonus))}</span></div>
                         <div className="pt-2 border-t border-indigo-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-indigo-800">真实年终奖月数</span>
                            <div className="flex items-center gap-2"><span className="text-lg font-bold text-indigo-600">{calculatedRealBonusMonths.toFixed(1)}</span><span className="text-xs text-indigo-400">个月</span></div>
                         </div>
                      </div>
                    </div>
                    <div className="mt-4">
                       <button onClick={applyRealBonusMonths} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-sm"><ArrowUpRight className="w-3 h-3" />一键填入 Current 结构</button>
                       <p className="text-[9px] text-slate-400 text-center mt-2">点击将自动修改左侧“年终奖月数”并更新年终总额</p>
                    </div>
                 </div>
               </div>
             )}
        </div>

      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800">导出定薪分析报告</h3><button onClick={() => setShowExportModal(false)}><X className="w-5 h-5 text-slate-400"/></button></div>
              <div className="p-6 grid grid-cols-2 gap-4">
                 <button onClick={handleExportWord} className="flex flex-col items-center gap-2 p-4 border border-dashed rounded-xl hover:bg-blue-50"><FileDown className="w-6 h-6 text-blue-500"/><span className="text-sm font-bold text-slate-700">导出 Word</span></button>
                 <button onClick={handlePrintPDF} className="flex flex-col items-center gap-2 p-4 border border-dashed rounded-xl hover:bg-emerald-50"><Printer className="w-6 h-6 text-emerald-500"/><span className="text-sm font-bold text-slate-700">打印 / PDF</span></button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SmartSalaryApp;