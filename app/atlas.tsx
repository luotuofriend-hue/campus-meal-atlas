"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Soup, MapPin, Plus, Minus, LocateFixed, Layers, GraduationCap, CloudCheck, Trash2, LockKeyhole } from "lucide-react";
import universities from "./universities.json";

type Region = { id: string; name: string; province: string; path: string; center: [number, number]; bounds: [number, number, number, number]; point?: boolean };
type MapData = { provinces: Region[]; cities: Region[]; maritime: Region[] };
type Visit = { id: string; university: string; cityId: string; createdAt: string };
type View = { s: number; x: number; y: number };
const initialView = { s: 1, x: 0, y: 0 };
const shortName = (name: string) => name.replace(/维吾尔自治区|壮族自治区|回族自治区|特别行政区|自治区|省|市$/g, "");

export default function Atlas() {
  const [map, setMap] = useState<MapData | null>(null);
  const [mapError, setMapError] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [university, setUniversity] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [view, setView] = useState<View>(initialView);
  const [hovered, setHovered] = useState<Region | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const universityRef = useRef<HTMLInputElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const travel = useRef(0);
  const citiesMode = view.s >= 2;

  const loadMap = useCallback(async () => {
    setMapError(false);
    try { const r = await fetch("/map.json"); if (!r.ok) throw new Error(); setMap(await r.json()); }
    catch { setMapError(true); }
  }, []);
  const loadVisits = useCallback(async () => {
    setLoadError("");
    try {
      const r = await fetch("/api/visits");
      if (r.status === 401) { setSignedOut(true); setLoaded(true); return; }
      const data = await r.json() as Visit[] & { error?: string };
      if (!r.ok) throw new Error(data.error);
      setVisits(data); setLoaded(true); setSignedOut(false);
    } catch { setLoadError("足迹暂时没能加载"); }
  }, []);
  useEffect(() => { void loadMap(); void loadVisits(); }, [loadMap, loadVisits]);

  const cityById = useMemo(() => new Map(map?.cities.map(c => [c.id, c])), [map]);
  const provinceById = useMemo(() => new Map(map?.provinces.map(c => [c.id, c])), [map]);
  const visitedCities = useMemo(() => new Set(visits.map(v => v.cityId)), [visits]);
  const visitedProvinces = useMemo(() => new Set(visits.map(v => cityById.get(v.cityId)?.province).filter(Boolean)), [visits, cityById]);
  const availableCities = map?.cities.filter(c => c.province === province) ?? [];
  const activeRegion = hovered ?? cityById.get(city) ?? provinceById.get(province);
  const matches = useMemo(() => {
    const q = university.trim().toLowerCase();
    if (!q) return [];
    return universities.filter(u => u.name.toLowerCase().includes(q)).sort((a,b) => Number(b.name===q)-Number(a.name===q) || a.name.length-b.name.length).slice(0,12);
  }, [university]);

  const screenPoint = (clientX: number, clientY: number) => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return { x: 500, y: 425 };
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };
  const zoomAt = useCallback((factor: number, x = 500, y = 425) => {
    setView(v => {
      const s = Math.min(12, Math.max(1, v.s * factor));
      if (s === 1) return initialView;
      return { s, x: x - (x - v.x) * s / v.s, y: y - (y - v.y) * s / v.s };
    });
  }, []);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const p = screenPoint(event.clientX, event.clientY);
      zoomAt(Math.exp(-Math.max(-160, Math.min(160, event.deltaY)) * .003), p.x, p.y);
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [map, zoomAt]);

  const focusRegion = (region: Region) => {
    const [a, b, c, d] = region.bounds;
    const s = Math.max(2.5, Math.min(8, Math.min(740 / (c - a), 610 / (d - b))));
    setView({ s, x: 500 - (a + c) / 2 * s, y: 400 - (b + d) / 2 * s });
  };
  const chooseSchool = (school: typeof universities[number]) => {
    setUniversity(school.name); setSchoolId(school.id); setSearchOpen(false); setMessage("");
    const location = cityById.get(school.cityId);
    if (location) { setProvince(location.province); setCity(location.id); focusRegion(location); }
  };
  const selectRegion = (region: Region) => {
    if (dragged.current) return;
    setMessage(""); setProvince(region.province);
    if (citiesMode) { setCity(region.id); universityRef.current?.focus({ preventScroll: true }); }
    else {
      const choices = map!.cities.filter(c => c.province === region.id);
      setCity(choices.length === 1 ? choices[0].id : "");
      focusRegion(region);
    }
  };

  const createVisit = useCallback(async (name: string, cityId: string) => {
    const r = await fetch("/api/visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ university: name, cityId }) });
    const data = await r.json() as Visit & { error?: string };
    if (!r.ok) { if (r.status === 401) setSignedOut(true); throw new Error(data.error || "暂时没能保存，请重试。"); }
    setVisits(v => [data, ...v]);
    return data as Visit;
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(""); setSuccess(false);
    if (!schoolId || !universities.some(u => u.id === schoolId && u.name === university)) { setMessage("请从搜索结果中选择一所大学。"); setSearchOpen(true); return; }
    setSaving(true);
    try {
      const record = await createVisit(university, city);
      setUniversity(""); setSchoolId(""); setSuccess(true); setMessage("已点亮 " + (cityById.get(record.cityId)?.name ?? "这座城市") + "，开饭！");
    } catch (error) { setMessage(error instanceof Error ? error.message : "暂时没能保存，请重试。"); }
    finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    setSaving(true); setMessage(""); setSuccess(false);
    try {
      const r = await fetch("/api/visits?id=" + encodeURIComponent(id), { method: "DELETE" });
      if (!r.ok) { const data = await r.json() as { error?: string }; throw new Error(data.error); }
      setVisits(v => v.filter(x => x.id !== id)); setConfirmDelete("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "暂时没能删除，请重试。"); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    type Context = { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: Context }).modelContext;
    if (!context?.registerTool || !map) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} };
    register({ name: "search_universities", description: "按固定校名搜索大学，返回大学名称及默认所在城市代码。", inputSchema: { type: "object", properties: { query: { type: "string", minLength: 1 } }, required: ["query"], additionalProperties: false }, annotations: { readOnlyHint: true }, execute: (input: unknown) => { const q = (input as {query?: unknown})?.query; if (typeof q !== "string" || !q.trim()) throw new Error("请输入校名关键词"); return universities.filter(u=>u.name.includes(q.trim())).slice(0,20); } });
    register({ name: "list_campus_visits", description: "读取已经保存的大学蹭饭足迹。", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: async () => { const r = await fetch("/api/visits"); if (!r.ok) throw new Error("足迹无法读取"); return r.json(); } });
    register({ name: "create_campus_visit", description: "保存一所去过的大学并点亮所在城市和省份。cityId 必须使用地图中的城市代码。", inputSchema: { type: "object", properties: { university: { type: "string", minLength: 1, maxLength: 80 }, cityId: { type: "string" } }, required: ["university", "cityId"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (input: unknown) => {
      const data = input as { university?: unknown; cityId?: unknown };
      if (!data || typeof data.university !== "string" || !data.university.trim() || data.university.length > 80 || typeof data.cityId !== "string" || !map.cities.some(c => c.id === data.cityId)) throw new Error("大学名称或城市代码不正确");
      return createVisit(data.university, data.cityId);
    } });
    return () => lifecycle.abort();
  }, [map, createVisit]);

  const visibleRegions = citiesMode ? map?.cities : map?.provinces;
  const lit = citiesMode ? visitedCities : visitedProvinces;
  const labels: Region[] = [];
  if (visibleRegions) {
    const sorted = [...visibleRegions].sort((a, b) => Number(lit.has(b.id)) - Number(lit.has(a.id)));
    for (const region of sorted) {
      const [x, y] = region.center;
      const sx = x * view.s + view.x, sy = y * view.s + view.y;
      if (sx < 25 || sx > 975 || sy < 15 || sy > 825) continue;
      if (labels.some(other => Math.abs(other.center[0] - x) * view.s < (citiesMode ? 79 : 53) && Math.abs(other.center[1] - y) * view.s < 23)) continue;
      labels.push(region);
    }
  }

  return <>
    <header><div className="brand"><div className="brand-mark"><img src="/favicon.svg" alt="" width="44" height="44" /></div><div><h1>蹭饭地图</h1><p>CAMPUS MEAL ATLAS</p></div></div><div className="header-note"><CloudCheck size={17} /><span>收藏每一顿校园饭</span></div></header>
    <main className="app"><div className="workspace">
      <section className="map-panel" aria-label="中国大学蹭饭足迹地图">
        <div className="map-top"><div><p className="eyebrow">我的校园食堂足迹</p><h2>中国 · 蹭饭版图</h2></div><div className="level"><Layers size={15}/>{citiesMode ? "城市视图" : "省份视图"}</div></div>
        <div className="map-stage">
          {!map ? <div className="loading">{mapError ? <>地图没能加载<button onClick={loadMap}>重新加载</button></> : "正在展开地图…"}</div> : <svg ref={svgRef} viewBox="0 0 1000 880" aria-label={citiesMode ? "城市地图，点击城市选择所在地点" : "省份地图，点击省份放大查看城市"}
            onPointerDown={event => {
              const p = screenPoint(event.clientX, event.clientY); pointers.current.set(event.pointerId, p);
              if (pointers.current.size === 1) { dragged.current = false; travel.current = 0; }
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
              const old = pointers.current.get(event.pointerId); if (!old) return;
              const now = screenPoint(event.clientX, event.clientY);
              const points = [...pointers.current.entries()];
              if (points.length === 2) {
                dragged.current = true;
                const other = points.find(([id]) => id !== event.pointerId)![1];
                const before = Math.hypot(old.x-other.x,old.y-other.y), after = Math.hypot(now.x-other.x,now.y-other.y);
                if (before > 1) zoomAt(after / before, (old.x + other.x) / 2, (old.y + other.y) / 2);
                setView(v => ({...v, x:v.x+(now.x-old.x)/2, y:v.y+(now.y-old.y)/2}));
              } else {
                const dx = now.x-old.x, dy = now.y-old.y;
                travel.current += Math.hypot(dx,dy);
                if (travel.current > 5) { dragged.current = true; setView(v => ({ ...v, x: v.x + dx, y: v.y + dy })); }
              }
              pointers.current.set(event.pointerId, now);
            }}
            onPointerUp={event => {
              pointers.current.delete(event.pointerId);
              event.currentTarget.releasePointerCapture(event.pointerId);
              if (!dragged.current) {
                const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-region]");
                const region = visibleRegions?.find(r => r.id === target?.getAttribute("data-region"));
                if (region) selectRegion(region);
              }
            }}
            onPointerCancel={event => pointers.current.delete(event.pointerId)}
            onPointerLeave={() => setHovered(null)}
          ><g transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
            {visibleRegions?.filter(r=>!r.point).map(region => <path key={region.id} data-region={region.id} d={region.path} className={"region" + (lit.has(region.id) ? " visited" : "") + (citiesMode && city === region.id && !lit.has(region.id) ? " selected" : "")} onPointerEnter={() => setHovered(region)}><title>{region.name + (lit.has(region.id) ? " · 已点亮" : " · 待探索")}</title></path>)}
            {citiesMode && map.provinces.map(r => <path key={r.id} d={r.path} className="province-outline"/>)}
            {map.maritime.map(r => <path key={r.id} d={r.path} fill="#a6b4bc" stroke="none"/>)}
            {visibleRegions?.filter(r=>r.point).map(r=><circle key={r.id} data-region={r.id} cx={r.center[0]} cy={r.center[1]} r={5/view.s} className={"region"+(lit.has(r.id)?" visited":"")} onPointerEnter={()=>setHovered(r)}><title>{r.name} · 城市点位（暂无边界数据）</title></circle>)}
            {labels.map(region => <text key={region.id} x={region.center[0]} y={region.center[1]} dy=".35em" fontSize={(citiesMode ? 14 : 15)/view.s} className={"map-label"+(lit.has(region.id)?" lit":"")} style={{strokeWidth:2/view.s}}>{shortName(region.name)}</text>)}
          </g></svg>}
          <div className="coordinate">CHINA / {citiesMode ? "CITIES" : "PROVINCES"}</div>
          <div className="map-actions"><button aria-label="放大地图" title="放大" onClick={() => zoomAt(1.55)}><Plus size={19}/></button><button aria-label="缩小地图" title="缩小" onClick={() => zoomAt(1/1.55)}><Minus size={19}/></button><button aria-label="回到全国地图" title="回到全国" onClick={() => {setView(initialView);setHovered(null);}}><LocateFixed size={18}/></button></div>
          <div className="map-hint">滚轮缩放 · 拖动探索 · 点击选择地点</div>
          {activeRegion && <div className="map-place"><strong>{activeRegion.name}</strong>{(citiesMode ? visitedCities.has(activeRegion.id) : visitedProvinces.has(activeRegion.province)) ? "已点亮" : "待探索"}</div>}
        </div>
        <div className="map-footer"><div className="legend"><span><i className="swatch red"/>已点亮</span><span><i className="swatch"/>待探索</span></div><a href="https://datav.aliyun.com/portal/school/atlas/area_selector" target="_blank" rel="noreferrer">地图数据 © DataV.GeoAtlas</a><a href="https://github.com/ronnywang/twgeojson" target="_blank" rel="noreferrer">台湾市县 · twgeojson</a></div>
      </section>
      <aside className="sidebar">
        <div className="stats"><div className="stat"><strong>{loaded ? new Set(visits.map(v=>v.university)).size.toString().padStart(2,"0") : "—"}</strong><span>所大学</span></div><div className="stat"><strong>{loaded ? visitedCities.size.toString().padStart(2,"0") : "—"}</strong><span>座城市</span></div><div className="stat"><strong>{loaded ? visitedProvinces.size.toString().padStart(2,"0") : "—"}</strong><span>个省级地区</span></div></div>
        <section className="entry-card"><h2 className="section-title"><MapPin size={20}/>记录一顿校园饭</h2><p className="section-copy">搜索大学，选中后自动定位所在城市。</p>
          <form onSubmit={submit}><div className="field school-search"><label htmlFor="university">大学名称</label><input ref={universityRef} id="university" role="combobox" aria-autocomplete="list" aria-expanded={searchOpen && !!university.trim()} aria-controls="school-results" aria-activedescendant={searchOpen && matches[activeOption] ? "school-"+matches[activeOption].id : undefined} autoComplete="off" placeholder="搜索大学，如「宁波大学」" maxLength={80} required value={university} onFocus={()=>{if(!schoolId)setSearchOpen(true);}} onChange={e=>{setUniversity(e.target.value);setSchoolId("");setSearchOpen(true);setActiveOption(0);}} onKeyDown={e=>{
            if(e.key==="Escape"){setSearchOpen(false);return;}
            if(e.key==="ArrowDown"){e.preventDefault();setSearchOpen(true);setActiveOption(i=>Math.min(matches.length-1,i+1));}
            if(e.key==="ArrowUp"){e.preventDefault();setActiveOption(i=>Math.max(0,i-1));}
            if(e.key==="Enter" && searchOpen && matches[activeOption]){e.preventDefault();chooseSchool(matches[activeOption]);}
          }} onBlur={e=>{if(!e.currentTarget.parentElement?.contains(e.relatedTarget))setSearchOpen(false);}}/>
          {searchOpen && university.trim() && <div id="school-results" role="listbox" aria-label="匹配的大学" className="school-results">{matches.length ? matches.map((school,i)=>{const c=cityById.get(school.cityId);return <button type="button" role="option" aria-selected={i===activeOption} id={"school-"+school.id} key={school.id} onMouseDown={e=>e.preventDefault()} onClick={()=>chooseSchool(school)} className={i===activeOption?"active":""}><strong>{school.name}</strong><span>{shortName(provinceById.get(c?.province??"")?.name??"")} · {c?.name}</span></button>;}) : <p>没有找到匹配大学，请尝试完整校名。</p>}</div>}
          {schoolId && <span className="school-chosen">已选择固定校名 · 地点已自动填入</span>}</div>
          <div className="field-row"><div className="field"><label htmlFor="province">省级地区</label><select id="province" required value={province} onChange={e=>{setProvince(e.target.value);const choices=map?.cities.filter(c=>c.province===e.target.value)??[];setCity(choices.length===1?choices[0].id:"");}}><option value="">自动匹配</option>{map?.provinces.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="field"><label htmlFor="city">所在城市</label><select id="city" required value={city} onChange={e=>setCity(e.target.value)} disabled={!province}><option value="">自动匹配</option>{availableCities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
          <p className="campus-hint">去的是异地校区？可调整为校区所在城市。</p>
          <button className="submit" disabled={saving || !map || !loaded || !!loadError || signedOut}>{saving ? "正在保存…" : <><Plus size={18}/>点亮这座城</>}</button>
          </form><p className="entry-foot"><LockKeyhole size={12}/>足迹仅自己可见 · 自动保存</p><a className="school-source" href="https://github.com/dataxiv/data-universities" target="_blank" rel="noreferrer">大学库 · {universities.length.toLocaleString()} 所</a>
          {signedOut && <a className="sign-in" href="/signin-with-chatgpt?return_to=%2F" target="_top">登录并保存足迹</a>}
          {message && <p role="status" className={"notice"+(success?" success":"")}>{message}</p>}
          {loadError && <div className="notice" role="alert">{loadError}。<button style={{background:"transparent",color:"inherit",textDecoration:"underline"}} onClick={loadVisits}>重试</button></div>}
        </section>
        <section className="journal"><div className="journal-heading"><h3>我的蹭饭清单</h3><span>{visits.length} 条足迹</span></div>
          {!visits.length ? <div className="empty"><div className="empty-icon"><Soup size={29} strokeWidth={1.3}/></div><strong>{loaded ? "第一顿，从这里开始" : "正在读取你的足迹…"}</strong><p>记录一所大学<br/>让地图多一点烟火气</p></div> : <div className="records">{visits.map(v=>{const c=cityById.get(v.cityId);return <div className="record" key={v.id}><div className="record-stamp"><GraduationCap size={21}/></div><div className="record-copy"><strong>{v.university}</strong><p>{c?.name ?? ""} · {new Date(v.createdAt).toLocaleDateString("zh-CN",{timeZone:"Asia/Shanghai"})}</p></div>{confirmDelete===v.id ? <div className="delete-confirm"><button disabled={saving} onClick={()=>remove(v.id)}>删除</button><button onClick={()=>setConfirmDelete("")}>取消</button></div> : <button className="delete" aria-label={"删除"+v.university+"的足迹"} title="删除足迹" onClick={()=>setConfirmDelete(v.id)}><Trash2 size={16}/></button>}</div>;})}</div>}
        </section>
      </aside>
    </div><div className="bottom-note"><span>缩小看省份，放大看城市。每一顿饭，都算数。</span><span>直辖市、港澳按城市记录</span></div></main>
  </>;
}
