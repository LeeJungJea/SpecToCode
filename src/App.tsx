import { useState, type ReactNode } from 'react';
import { Check, Copy, Code2, FileJson2, Play, RotateCcw, Terminal, Wand2 } from 'lucide-react';
import type { ApiSpecInput, BackendLanguage, BodyType, FrontendLanguage, GeneratedCodeResult, HttpMethod, SpecInputErrors, ResponseType } from './types/specToCode';
import { BACKEND_LANGUAGES, FRONTEND_LANGUAGES, generateCode } from './generators/generatorRegistry';
import LanguageSelect from './components/LanguageSelect';
import { createParsedApiSpec } from './utils/createParsedApiSpec';

type RequestTabKey = 'params' | 'headers' | 'body' | 'response' | 'raw';
type ResultTabKey = 'types' | 'fetchFunction' | 'requestDto' | 'responseDto' | 'controllerMethod';
type FieldType = 'string' | 'number' | 'boolean' | 'file';
type FieldRow = { id: string; key: string; type: FieldType; required: boolean; description: string };
type ResultTab = { key: ResultTabKey; title: string; language: string; filename: string };

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST'];
const REQUEST_TABS: Array<{ key: RequestTabKey; title: string }> = [
  { key: 'params', title: 'URL Params' }, { key: 'headers', title: 'Headers' }, { key: 'body', title: 'Body' }, { key: 'response', title: 'Response' }, { key: 'raw', title: 'Export Spec' }
];
const BODY_TYPES: Array<{ value: BodyType; label: string }> = [
  { value: 'none', label: 'none' }, { value: 'form-data', label: 'form-data' }, { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { value: 'json', label: 'raw / JSON' }, { value: 'raw', label: 'raw / Text' }, { value: 'binary', label: 'binary' }, { value: 'graphql', label: 'GraphQL' }
];
const RESULT_TABS: ResultTab[] = [
  { key: 'types', title: 'API types', language: 'typescript', filename: 'types.ts' },
  { key: 'fetchFunction', title: 'Fetch Function', language: 'typescript', filename: 'client.ts' },
  { key: 'requestDto', title: 'Request DTO', language: 'java', filename: 'RequestDto.java' },
  { key: 'responseDto', title: 'Response DTO', language: 'java', filename: 'ResponseDto.java' },
  { key: 'controllerMethod', title: 'Controller Method', language: 'java', filename: 'Controller.java' }
];

const INITIAL_HEADER_ROWS: FieldRow[] = [
  { id: 'Authorization', key: 'Authorization', type: 'string', required: true, description: 'Bearer access token' },
  { id: 'X-Trace-Id', key: 'X-Trace-Id', type: 'string', required: false, description: 'Request tracking id' }
];
const INITIAL_PATH_PARAM_ROWS: FieldRow[] = [{ id: 'storeId', key: 'storeId', type: 'number', required: true, description: 'Store identifier in URL' }];
const INITIAL_QUERY_PARAM_ROWS: FieldRow[] = [{ id: 'couponCode', key: 'couponCode', type: 'string', required: false, description: 'Optional coupon code' }];
const INITIAL_BODY_ROWS: FieldRow[] = [
  { id: 'userId', key: 'userId', type: 'number', required: true, description: 'User identifier' },
  { id: 'orderType', key: 'orderType', type: 'string', required: true, description: 'DELIVERY or PICKUP' },
  { id: 'memo', key: 'memo', type: 'string', required: false, description: 'Optional request memo' }
];
const INITIAL_RESPONSE_ROWS: FieldRow[] = [
  { id: 'orderId', key: 'orderId', type: 'number', required: true, description: 'Created order id' },
  { id: 'status', key: 'status', type: 'string', required: true, description: 'Order status' },
  { id: 'totalAmount', key: 'totalAmount', type: 'number', required: true, description: 'Final amount' },
  { id: 'paymentRequired', key: 'paymentRequired', type: 'boolean', required: false, description: 'Whether payment step is needed' },
  { id: 'paymentUrl', key: 'paymentUrl', type: 'string', required: false, description: 'Payment page URL' },
  { id: 'createdAt', key: 'createdAt', type: 'string', required: false, description: 'Created timestamp' }
];

const panelClass = 'border border-slate-800 bg-slate-950/80 shadow-2xl shadow-black/30';
const inputClass = 'w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15';
const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400';
const rowsToSchemaText = (rows: FieldRow[]) => JSON.stringify(rows.reduce<Record<string, unknown>>((acc, row) => {
  const key = row.key.trim(); if (!key) return acc;
  const type = row.type === 'file' ? 'unknown' : row.type;
  acc[key] = row.required ? { type, required: true } : type;
  return acc;
}, {}), null, 2);
const INITIAL_SPEC_INPUT: ApiSpecInput = {
  method: 'POST', url: '/api/stores/{storeId}/orders', bodyType: 'json', responseType: 'json',
  headersJsonText: rowsToSchemaText(INITIAL_HEADER_ROWS), queryParamsJsonText: rowsToSchemaText(INITIAL_QUERY_PARAM_ROWS), pathParamsJsonText: rowsToSchemaText(INITIAL_PATH_PARAM_ROWS),
  bodyJsonText: rowsToSchemaText(INITIAL_BODY_ROWS), responseJsonText: rowsToSchemaText(INITIAL_RESPONSE_ROWS), frontendLanguage: 'REACT_TYPESCRIPT', backendLanguage: 'JAVA_SPRING_BOOT'
};
const getRawSpec = (specInput: ApiSpecInput) => { const parse = (v: string) => { try { return JSON.parse(v); } catch { return v; } };
  return JSON.stringify({ method: specInput.method, url: specInput.url, bodyType: specInput.bodyType, responseType: specInput.responseType, headers: parse(specInput.headersJsonText), queryParams: parse(specInput.queryParamsJsonText), pathParams: parse(specInput.pathParamsJsonText), body: parse(specInput.bodyJsonText), response: parse(specInput.responseJsonText), frontendLanguage: specInput.frontendLanguage, backendLanguage: specInput.backendLanguage }, null, 2);
};
const getCodeByTab = (generatedCode: GeneratedCodeResult): Record<ResultTabKey, string> => ({ types: generatedCode.frontend.types, fetchFunction: generatedCode.frontend.fetchFunction, requestDto: generatedCode.backend.requestDto, responseDto: generatedCode.backend.responseDto, controllerMethod: generatedCode.backend.controllerMethod });
const extractPathParamNames = (url: string) => [...new Set([...url.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]))];
const syncPathParamRowsFromUrl = (url: string, rows: FieldRow[]) => {
  const names = extractPathParamNames(url);
  const existingKeys = new Set(rows.map((row) => row.key.trim()).filter(Boolean));
  const keptRows = rows.filter(r => !r.key.trim() || names.includes(r.key.trim()));
  const missing = names.filter((name) => !existingKeys.has(name)).map<FieldRow>((name) => ({ id: `path-${name}`, key: name, type: 'string', required: true, description: 'Detected from URL' }));
  return [...keptRows, ...missing];
};

function App() {
  const [specInput, setSpecInput] = useState<ApiSpecInput>(INITIAL_SPEC_INPUT);
  const [headerRows, setHeaderRows] = useState<FieldRow[]>(INITIAL_HEADER_ROWS);
  const [pathParamRows, setPathParamRows] = useState<FieldRow[]>(INITIAL_PATH_PARAM_ROWS);
  const [queryParamRows, setQueryParamRows] = useState<FieldRow[]>(INITIAL_QUERY_PARAM_ROWS);
  const [bodyRows, setBodyRows] = useState<FieldRow[]>(INITIAL_BODY_ROWS);
  const [responseRows, setResponseRows] = useState<FieldRow[]>(INITIAL_RESPONSE_ROWS);
  const [errors, setErrors] = useState<SpecInputErrors>({});
  const [generatedCode, setGeneratedCode] = useState<GeneratedCodeResult | null>(null);
  const [activeRequestTab, setActiveRequestTab] = useState<RequestTabKey>('params');
  const [activeResultTab, setActiveResultTab] = useState<ResultTabKey>('types');
  const updateSpecInput = <K extends keyof ApiSpecInput>(key: K, value: ApiSpecInput[K]) => setSpecInput((prev) => ({ ...prev, [key]: value }));
  const bindRows = (setter: (rows: FieldRow[]) => void, key: keyof ApiSpecInput) => (rows: FieldRow[]) => { setter(rows); updateSpecInput(key, rowsToSchemaText(rows) as never); };
  const updateHeaderRows = bindRows(setHeaderRows, 'headersJsonText');
  const updateQueryParamRows = bindRows(setQueryParamRows, 'queryParamsJsonText');
  const updateBodyRows = bindRows(setBodyRows, 'bodyJsonText');
  const updateResponseRows = bindRows(setResponseRows, 'responseJsonText');
  const updatePathParamRows = (nextRows: FieldRow[]) => {
    let newUrl = specInput.url;
    pathParamRows.forEach(oldRow => {
      const newRow = nextRows.find(r => r.id === oldRow.id);
      if (newRow) {
        if (oldRow.key && newRow.key && oldRow.key !== newRow.key) {
          newUrl = newUrl.replace(new RegExp(`\\{${oldRow.key}\\}`, 'g'), `{${newRow.key}}`);
        } else if (!oldRow.key && newRow.key) {
          if (!newUrl.includes(`{${newRow.key}}`)) {
            const parts = newUrl.split('?');
            let path = parts[0];
            if (!path.endsWith('/')) path += '/';
            path += `{${newRow.key}}`;
            newUrl = parts.length > 1 ? `${path}?${parts.slice(1).join('?')}` : path;
          }
        } else if (oldRow.key && !newRow.key) {
          newUrl = newUrl.replace(new RegExp(`\\/?\\{${oldRow.key}\\}`, 'g'), '');
        }
      } else if (oldRow.key) {
        newUrl = newUrl.replace(new RegExp(`\\/?\\{${oldRow.key}\\}`, 'g'), '');
      }
    });
    nextRows.forEach(newRow => {
      if (newRow.key && !pathParamRows.some(r => r.id === newRow.id)) {
        if (!newUrl.includes(`{${newRow.key}}`)) {
          const parts = newUrl.split('?');
          let path = parts[0];
          if (!path.endsWith('/')) path += '/';
          path += `{${newRow.key}}`;
          newUrl = parts.length > 1 ? `${path}?${parts.slice(1).join('?')}` : path;
        }
      }
    });
    newUrl = newUrl.replace(/(?<!:)\/\//g, '/');
    setPathParamRows(nextRows);
    setSpecInput(prev => ({ ...prev, url: newUrl, pathParamsJsonText: rowsToSchemaText(nextRows) }));
  };
  const handleUrlChange = (url: string) => { const nextPathRows = syncPathParamRowsFromUrl(url, pathParamRows); setPathParamRows(nextPathRows); setSpecInput((prev) => ({ ...prev, url, pathParamsJsonText: rowsToSchemaText(nextPathRows) })); };
  const handleGenerate = () => { const parsed = createParsedApiSpec(specInput); if (!parsed.ok) { setErrors(parsed.errors); return; } setErrors({}); setGeneratedCode(generateCode(parsed.spec, specInput.frontendLanguage, specInput.backendLanguage)); setActiveResultTab('types'); };
  const handleReset = () => { 
    setSpecInput(prev => ({
      ...prev,
      method: 'GET',
      url: '',
      bodyType: 'json',
      responseType: 'json',
      headersJsonText: '{}',
      queryParamsJsonText: '{}',
      pathParamsJsonText: '{}',
      bodyJsonText: '{}',
      responseJsonText: '{}'
    }));
    setHeaderRows([]); 
    setPathParamRows([]); 
    setQueryParamRows([]); 
    setBodyRows([]); 
    setResponseRows([]); 
    setErrors({}); 
    setGeneratedCode(null); 
    setActiveRequestTab('params'); 
    setActiveResultTab('types'); 
  };

  return <main className="min-h-screen bg-[#0b1020] text-slate-100"><div className="flex min-h-screen flex-col"><TopBar />
    <section className="grid flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(520px,0.9fr)_minmax(520px,1.1fr)]"><div className="space-y-4 overflow-auto p-4"><aside className="border border-slate-800 bg-slate-950/70"><div className="border-b border-slate-800 px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><FileJson2 size={16} className="text-cyan-300" />request.builder</div></div>
      <div className="space-y-4 p-4"><section className={`${panelClass} rounded-lg`}><div className="border-b border-slate-800 px-4 py-3"><h2 className="text-sm font-semibold text-slate-100">Endpoint</h2><p className="mt-1 text-xs text-slate-500">Choose the API method and route.</p></div><div className="space-y-4 p-4"><div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
            <label className="block"><span className={labelClass}>Method</span><select className={`${inputClass} h-10`} value={specInput.method} onChange={(e) => updateSpecInput('method', e.target.value as HttpMethod)}>{HTTP_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
            <label className="block"><span className={labelClass}>URL</span><input className={`${inputClass} h-10`} value={specInput.url} onChange={(e) => handleUrlChange(e.target.value)} placeholder="/api/stores/{storeId}/orders" />{errors.url && <ErrorText>{errors.url}</ErrorText>}</label>
          </div></div></section>
      <section className={`${panelClass} rounded-lg`}><div className="border-b border-slate-800 px-4 py-3"><h2 className="text-sm font-semibold text-slate-100">Generators</h2><p className="mt-1 text-xs text-slate-500">Select frontend and backend output targets.</p></div><div className="p-4"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className={labelClass}>Frontend</span><LanguageSelect options={FRONTEND_LANGUAGES} value={specInput.frontendLanguage} onChange={(v) => updateSpecInput('frontendLanguage', v as FrontendLanguage)} /></label><label className="block"><span className={labelClass}>Backend</span><LanguageSelect options={BACKEND_LANGUAGES} value={specInput.backendLanguage} onChange={(v) => updateSpecInput('backendLanguage', v as BackendLanguage)} /></label></div></div></section>
      <div className="flex items-center gap-2"><button type="button" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-300" onClick={handleGenerate}><Play size={16} />Generate</button><button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800" onClick={handleReset}><RotateCcw size={16} />Reset</button></div><ErrorSummary errors={errors} /><div className="rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-slate-500"><strong className="text-slate-300">Required rule</strong><br />Unchecked fields are optional. Check only fields that must be sent or returned.</div></div></aside>
      <RequestPanel specInput={specInput} headerRows={headerRows} pathParamRows={pathParamRows} queryParamRows={queryParamRows} bodyRows={bodyRows} responseRows={responseRows} errors={errors} activeTab={activeRequestTab} onTabChange={setActiveRequestTab} onChange={updateSpecInput} onHeaderRowsChange={updateHeaderRows} onPathParamRowsChange={updatePathParamRows} onQueryParamRowsChange={updateQueryParamRows} onBodyRowsChange={updateBodyRows} onResponseRowsChange={updateResponseRows} /></div>
      <CodeResultPanel generatedCode={generatedCode} activeTab={activeResultTab} onTabChange={setActiveResultTab} /></section></div></main>;
}
function TopBar() {
  return <header className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-950 px-4"><div className="flex items-center gap-3"><div className="flex gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-500" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" /></div><div className="flex items-center gap-2 border-l border-slate-800 pl-3"><Terminal size={17} className="text-cyan-300" /><strong className="text-sm text-slate-100">SpecToCode</strong><span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">devtools</span></div></div></header>;
}

type RequestPanelProps = {
  specInput: ApiSpecInput; headerRows: FieldRow[]; pathParamRows: FieldRow[]; queryParamRows: FieldRow[]; bodyRows: FieldRow[]; responseRows: FieldRow[]; errors: SpecInputErrors; activeTab: RequestTabKey;
  onTabChange: (tab: RequestTabKey) => void; onChange: <K extends keyof ApiSpecInput>(key: K, value: ApiSpecInput[K]) => void;
  onHeaderRowsChange: (rows: FieldRow[]) => void; onPathParamRowsChange: (rows: FieldRow[]) => void; onQueryParamRowsChange: (rows: FieldRow[]) => void; onBodyRowsChange: (rows: FieldRow[]) => void; onResponseRowsChange: (rows: FieldRow[]) => void;
};
function RequestPanel(props: RequestPanelProps) {
  return <section className={`${panelClass} overflow-hidden rounded-lg`}><div className="flex min-h-10 items-stretch overflow-x-auto border-b border-slate-800 bg-slate-900/80 text-xs">{REQUEST_TABS.map((tab) => { const active = tab.key === props.activeTab; return <button key={tab.key} type="button" className={`flex shrink-0 items-center gap-2 border-r border-slate-800 px-4 font-semibold transition ${active ? 'border-t-2 border-t-cyan-400 bg-[#0b1020] text-slate-100' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}`} onClick={() => props.onTabChange(tab.key)}><FileJson2 size={14} />{tab.title}</button>; })}</div>{getActiveRequestEditor(props)}</section>;
}

function getActiveRequestEditor(p: RequestPanelProps) {
  if (p.activeTab === 'params') return <div className="grid gap-4 bg-[#070b14] p-4"><FieldTableEditor title="Path Params" subtitle="Values embedded in the route, like /stores/{storeId}/orders" badge="Auto-detected" rows={p.pathParamRows} error={p.errors.pathParamsJson} onRowsChange={p.onPathParamRowsChange} /><FieldTableEditor title="Query Params" subtitle="Values after ?, like ?couponCode=SPRING" badge="Optional" rows={p.queryParamRows} error={p.errors.queryParamsJson} onRowsChange={p.onQueryParamRowsChange} /></div>;
  if (p.activeTab === 'headers') return <div className="bg-[#070b14] p-4"><FieldTableEditor title="Headers" subtitle="Request metadata, auth tokens, client ids, and trace values" badge="Optional" rows={p.headerRows} error={p.errors.headersJson} onRowsChange={p.onHeaderRowsChange} /></div>;
  if (p.activeTab === 'body') return <BodyTableEditor bodyType={p.specInput.bodyType} rows={p.bodyRows} error={p.errors.bodyJson} onBodyTypeChange={(bodyType) => p.onChange('bodyType', bodyType)} onRowsChange={p.onBodyRowsChange} />;
  if (p.activeTab === 'response') return <div className="space-y-4 bg-[#070b14] p-4">
    <div className="rounded-lg border border-slate-800 p-4">
      <label className="block max-w-xs">
        <span className={labelClass}>Response Type</span>
        <select className={`${inputClass} h-10`} value={p.specInput.responseType} onChange={(e) => p.onChange('responseType', e.target.value as ResponseType)}>
          <option value="json">JSON (json)</option>
          <option value="blob">Blob (blob)</option>
          <option value="text">Text (text)</option>
          <option value="arrayBuffer">ArrayBuffer (arrayBuffer)</option>
        </select>
      </label>
    </div>
    <FieldTableEditor title="Response" subtitle="Fields returned by the API response (applicable if JSON)" badge="Output" rows={p.responseRows} error={p.errors.responseJson} onRowsChange={p.onResponseRowsChange} />
  </div>;
  return <ReadOnlyEditor title="Export Spec" subtitle="request.spec.json generated from the builder" value={getRawSpec(p.specInput)} />;
}

function BodyTableEditor({ bodyType, rows, error, onBodyTypeChange, onRowsChange }: { bodyType: BodyType; rows: FieldRow[]; error?: string; onBodyTypeChange: (bodyType: BodyType) => void; onRowsChange: (rows: FieldRow[]) => void }) {
  return <section className="overflow-hidden"><EditorHeader title="Body" subtitle="Postman-style body builder" badge="Optional" /><div className="space-y-4 bg-[#070b14] p-4"><label className="block max-w-xs"><span className={labelClass}>Body Type</span><select className={`${inputClass} h-10`} value={bodyType} onChange={(e) => onBodyTypeChange(e.target.value as BodyType)}>{BODY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>{bodyType === 'none' ? <EmptyStateText>This request does not use a body.</EmptyStateText> : bodyType === 'binary' ? <EmptyStateText>Binary body will be generated as a file or raw binary payload.</EmptyStateText> : <FieldTable rows={rows} onRowsChange={onRowsChange} allowFile={bodyType === 'form-data'} />}{error && <ErrorBox>{error}</ErrorBox>}</div></section>;
}
function FieldTableEditor({ title, subtitle, badge, rows, error, onRowsChange }: { title: string; subtitle: string; badge?: string; rows: FieldRow[]; error?: string; onRowsChange: (rows: FieldRow[]) => void }) {
  return <section className="overflow-hidden rounded-lg border border-slate-800"><EditorHeader title={title} subtitle={subtitle} badge={badge} /><div className="space-y-3 bg-[#070b14] p-3"><FieldTable rows={rows} onRowsChange={onRowsChange} />{error && <ErrorBox>{error}</ErrorBox>}</div></section>;
}
function FieldTable({ rows, onRowsChange, allowFile = false }: { rows: FieldRow[]; onRowsChange: (rows: FieldRow[]) => void; allowFile?: boolean }) {
  const updateRow = (id: string, patch: Partial<FieldRow>) => onRowsChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  const addRow = () => onRowsChange([...rows, { id: `field-${Date.now()}`, key: '', type: 'string', required: false, description: '' }]);
  const removeRow = (id: string) => onRowsChange(rows.filter((row) => row.id !== id));
  return <div className="overflow-auto rounded-lg border border-slate-800"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500"><tr><th className="border-b border-slate-800 px-3 py-2">Key</th><th className="border-b border-slate-800 px-3 py-2">Type</th><th className="border-b border-slate-800 px-3 py-2 text-center">Required</th><th className="border-b border-slate-800 px-3 py-2">Description</th><th className="border-b border-slate-800 px-3 py-2" /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-900"><td className="px-3 py-2"><input className={`${inputClass} h-9 font-mono`} value={row.key} onChange={(e) => updateRow(row.id, { key: e.target.value })} placeholder="fieldName" /></td><td className="px-3 py-2"><select className={`${inputClass} h-9`} value={row.type} onChange={(e) => updateRow(row.id, { type: e.target.value as FieldType })}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option>{allowFile && <option value="file">file</option>}</select></td><td className="px-3 py-2 text-center"><input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={row.required} onChange={(e) => updateRow(row.id, { required: e.target.checked })} /></td><td className="px-3 py-2"><input className={`${inputClass} h-9`} value={row.description} onChange={(e) => updateRow(row.id, { description: e.target.value })} placeholder="field description" /></td><td className="px-3 py-2 text-right"><button type="button" className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-rose-300" onClick={() => removeRow(row.id)}>Delete</button></td></tr>)}</tbody></table><div className="border-t border-slate-800 bg-slate-950 p-3"><button type="button" className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400 hover:text-cyan-200" onClick={addRow}>Add field</button></div></div>;
}

function ReadOnlyEditor({ title, subtitle, value }: { title: string; subtitle: string; value: string }) {
  return <section className="overflow-hidden"><EditorHeader title={title} subtitle={subtitle} badge="Read only" /><CodeSurface value={value} /></section>;
}
function CodeResultPanel({ generatedCode, activeTab, onTabChange }: { generatedCode: GeneratedCodeResult | null; activeTab: ResultTabKey; onTabChange: (tab: ResultTabKey) => void }) {
  if (!generatedCode) return <aside className={`${panelClass} flex min-h-[640px] items-center justify-center rounded-lg p-8 text-center`}><div><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-cyan-300"><Wand2 size={28} /></div><h2 className="text-lg font-semibold text-slate-100">No output yet</h2><p className="mt-2 max-w-sm text-sm text-slate-500">Click Generate to create example code for the selected target stack.</p></div></aside>;
  const activeTabMeta = RESULT_TABS.find((tab) => tab.key === activeTab) || RESULT_TABS[0]; const codeByTab = getCodeByTab(generatedCode);
  return <aside className={`${panelClass} overflow-hidden rounded-lg`}><div className="flex min-h-10 items-stretch overflow-x-auto border-b border-slate-800 bg-slate-900/80 text-xs">{RESULT_TABS.map((tab) => { const active = tab.key === activeTab; return <button key={tab.key} type="button" className={`flex shrink-0 items-center gap-2 border-r border-slate-800 px-4 font-semibold transition ${active ? 'border-t-2 border-t-cyan-400 bg-[#0b1020] text-slate-100' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}`} onClick={() => onTabChange(tab.key)}><Code2 size={14} />{tab.title}</button>; })}</div><CodeBlock title={activeTabMeta.title} language={activeTabMeta.language} filename={activeTabMeta.filename} code={codeByTab[activeTab]} /></aside>;
}
function CodeBlock({ title, language, filename, code }: { title: string; language: string; filename: string; code: string }) {
  const [copied, setCopied] = useState(false); const handleCopy = async () => { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };
  return <article className="overflow-hidden"><EditorHeader title={title} subtitle={`${filename} / ${language}`} action={<CopyButton copied={copied} onClick={handleCopy} />} /><CodeSurface value={code} /></article>;
}
function CodeSurface({ value }: { value: string }) {
  return <div className="max-h-[calc(100vh-154px)] min-h-[596px] overflow-auto bg-[#070b14]"><div className="grid min-w-max grid-cols-[44px_minmax(0,1fr)] font-mono text-sm"><LineNumbers value={value} /><pre className="m-0 px-3 py-3 leading-6 text-slate-100"><code>{value}</code></pre></div></div>;
}
function EditorHeader({ title, subtitle, badge, action }: { title: string; subtitle: string; badge?: string; action?: ReactNode }) {
  return <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4"><div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><h2 className="truncate text-sm font-semibold text-slate-100">{title}</h2>{badge && <span className="shrink-0 rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] font-semibold text-slate-400">{badge}</span>}</div><p className="truncate text-xs text-slate-500">{subtitle}</p></div>{action}</div>;
}
function LineNumbers({ value }: { value: string }) { return <div className="select-none border-r border-slate-800 bg-slate-950 px-2 py-3 text-right font-mono text-xs leading-6 text-slate-600">{Array.from({ length: Math.max(value.split('\n').length, 1) }).map((_, i) => <div key={i}>{i + 1}</div>)}</div>; }
function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) { return <button type="button" className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${copied ? 'border-[#10b981] bg-slate-950 text-[#10b981]' : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-400 hover:text-cyan-200'}`} onClick={onClick}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied!' : 'Copy Code'}</button>; }
function EmptyStateText({ children }: { children: ReactNode }) { return <div className="rounded-md border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">{children}</div>; }
function ErrorBox({ children }: { children: ReactNode }) { return <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">{children}</div>; }
function ErrorText({ children }: { children: ReactNode }) { return <em className="mt-1 block text-xs not-italic text-rose-300">{children}</em>; }
function ErrorSummary({ errors }: { errors: SpecInputErrors }) {
  const items = [errors.headersJson && `Headers: ${errors.headersJson}`, errors.queryParamsJson && `Query Params: ${errors.queryParamsJson}`, errors.pathParamsJson && `Path Params: ${errors.pathParamsJson}`, errors.bodyJson && `Body: ${errors.bodyJson}`, errors.responseJson && `Response: ${errors.responseJson}`].filter(Boolean);
  if (!items.length) return null;
  return <div className="space-y-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">{items.map((item) => <p key={item}>{item}</p>)}</div>;
}
export default App;
