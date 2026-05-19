async function fetchMCXPrices() {
  const inrRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  const inr = (await inrRes.json()).rates.INR;

  const symbols = ['GC=F','SI=F','CL=F','HG=F','NG=F','BZ=F'];
  const q = {};
  await Promise.all(symbols.map(async s => {
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + s + '?interval=1d&range=2d', {headers:{'User-Agent':'Mozilla/5.0'}});
    const meta = (await res.json())?.chart?.result?.[0]?.meta;
    if (meta) q[s] = {usd: meta.regularMarketPrice, prev: meta.previousClose};
  }));

  const pct = (c,p) => (!c||!p) ? '-' : (c>=p?'+':'')+((c-p)/p*100).toFixed(1)+'%';
  const chg = (c,p) => (!c||!p) ? '-' : (c>=p?'+':'')+Math.round(c-p);

  const gold   = q['GC=F'] ? Math.round((q['GC=F'].usd/31.1035)*10*inr*1.132) : null;
  const silver = q['SI=F'] ? Math.round((q['SI=F'].usd/31.1035)*1000*inr*1.157) : null;
  const crude  = q['CL=F'] ? Math.round(q['CL=F'].usd*inr) : null;
  const copper = q['HG=F'] ? Math.round(q['HG=F'].usd*2.20462*inr) : null;
  const natgas = q['NG=F'] ? Math.round(q['NG=F'].usd*inr) : null;

  const pg = q['GC=F'] ? Math.round((q['GC=F'].prev/31.1035)*10*inr*1.132) : null;
  const ps = q['SI=F'] ? Math.round((q['SI=F'].prev/31.1035)*1000*inr*1.157) : null;
  const pc = q['CL=F'] ? Math.round(q['CL=F'].prev*inr) : null;
  const ph = q['HG=F'] ? Math.round(q['HG=F'].prev*2.20462*inr) : null;
  const pn = q['NG=F'] ? Math.round(q['NG=F'].prev*inr) : null;

  return {
    gold:   {inr:gold,   comex:q['GC=F']?.usd, pct:pct(gold,pg),   chg:chg(gold,pg)},
    silver: {inr:silver, comex:q['SI=F']?.usd, pct:pct(silver,ps), chg:chg(silver,ps)},
    crude:  {inr:crude,  comex:q['CL=F']?.usd, pct:pct(crude,pc),  chg:chg(crude,pc)},
    copper: {inr:copper, comex:q['HG=F']?.usd, pct:pct(copper,ph), chg:chg(copper,ph)},
    natgas: {inr:natgas, comex:q['NG=F']?.usd, pct:pct(natgas,pn), chg:chg(natgas,pn)},
    brent:  {usd:q['BZ=F']?.usd},
    usdinr: {rate:inr.toFixed(2)},
  };
}

module.exports = {fetchMCXPrices};
