'use strict';
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v314.0.6/full/';
const editor = CoursePythonEditor(document.querySelector('#terminal-input'));
const runButton = document.querySelector('#run-terminal');
const historyArea = document.querySelector('#terminal-history');
const statusText = document.querySelector('#kernel-status');
const statusDot = document.querySelector('#kernel-indicator');
const viewport = document.querySelector('#terminal-main');
let python = null;
let busy = false;
let commandHistory = [];
let historyIndex = 0;
let scratch = '';

function status(text, mode = '') {
  statusText.textContent = text;
  statusDot.className = 'kernel-indicator' + (mode ? ' ' + mode : '');
}
function setBusy(value) {
  busy = value;
  runButton.disabled = value || !python;
  editor.disabled = value;
  document.querySelectorAll('.history-rerun').forEach((button) => { button.disabled = value || !python; });
}
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Ekki tókst að hlaða Python. Athugaðu nettenginguna.'));
    document.head.appendChild(script);
  });
}
async function setupPython() {
  status('Hleð Python og vísindapökkum…');
  setBusy(true);
  try {
    if (!globalThis.loadPyodide) await loadScript(PYODIDE_BASE + 'pyodide.js');
    python = await globalThis.loadPyodide({ indexURL: PYODIDE_BASE });
    await python.loadPackage(['numpy', 'matplotlib']);
    await python.runPythonAsync("import matplotlib; matplotlib.use('Agg'); import numpy as np; import matplotlib.pyplot as plt");
    status('Python tilbúið', 'ready');
  } catch (error) {
    python = null;
    status('Villa við hleðslu', 'error');
    showSystemMessage(String(error), true);
  } finally {
    setBusy(false);
    editor.focus();
  }
}
function showSystemMessage(text, error = false) {
  const block = document.createElement('div');
  block.className = 'history-block';
  const output = document.createElement('div');
  output.className = 'history-result' + (error ? ' error' : '');
  const pre = document.createElement('pre');
  pre.textContent = text;
  output.appendChild(pre);
  block.appendChild(output);
  historyArea.appendChild(block);
}
function addCommand(code) {
  const block = document.createElement('div');
  block.className = 'history-block';
  const prompt = document.createElement('span');
  prompt.className = 'history-prompt';
  prompt.textContent = '>>>';
  let input = document.createElement('textarea');
  input.className = 'history-code';
  input.value = code;
  input.rows = Math.max(2, Math.min(20, code.split('\n').length));
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Breyta fyrri Python-kóða');
  const codeArea = document.createElement('div');
  codeArea.className = 'history-editor';
  const rerun = document.createElement('button');
  rerun.type = 'button';
  rerun.className = 'history-rerun';
  rerun.textContent = 'Keyra aftur';
  codeArea.append(input, rerun);
  const output = document.createElement('div');
  output.className = 'history-result';
  block.append(prompt, codeArea, output);
  historyArea.appendChild(block);
  input = CoursePythonEditor(input);
  const record = { input, output, rerun };
  rerun.addEventListener('click', () => execute(record));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.shiftKey || event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      execute(record);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      input.setRangeText('    ', input.selectionStart, input.selectionEnd, 'end');
    }
  });
  return record;
}
function addText(container, text, error = false) {
  if (!text) return;
  if (error) container.classList.add('error');
  const pre = document.createElement('pre');
  pre.textContent = text;
  container.appendChild(pre);
}
async function figures() {
  const json = await python.runPythonAsync(`
import io as _terminal_io
import json as _terminal_json
import base64 as _terminal_base64
import warnings as _terminal_warnings
import matplotlib as _terminal_matplotlib
import matplotlib.pyplot as _terminal_plt
_terminal_images = []
for _terminal_number in _terminal_plt.get_fignums():
    _terminal_fig = _terminal_plt.figure(_terminal_number)
    _terminal_buf = _terminal_io.BytesIO()
    with _terminal_warnings.catch_warnings():
        _terminal_warnings.filterwarnings('ignore', category=_terminal_matplotlib.MatplotlibDeprecationWarning)
        _terminal_fig.savefig(_terminal_buf, format='png', dpi=120, bbox_inches='tight')
    _terminal_images.append(_terminal_base64.b64encode(_terminal_buf.getvalue()).decode('ascii'))
    _terminal_plt.close(_terminal_fig)
_terminal_json.dumps(_terminal_images)
`);
  return JSON.parse(String(json));
}
async function execute(record = null) {
  if (!python || busy) return;
  const code = (record ? record.input.value : editor.value).trim();
  if (!code) return;
  commandHistory.push(code);
  historyIndex = commandHistory.length;
  scratch = '';
  if (!record) {
    editor.value = '';
    record = addCommand(code);
  }
  const output = record.output;
  output.replaceChildren();
  output.classList.remove('error');
  setBusy(true);
  status('Keyri…');
  const stdout = [];
  const stderr = [];
  python.setStdout({ batched: (line) => stdout.push(line) });
  python.setStderr({ batched: (line) => stderr.push(line) });
  try {
    await python.loadPackagesFromImports(code);
    const value = await python.runPythonAsync(code);
    const resultText = value === undefined || value === null ? '' : String(value);
    if (value && typeof value.destroy === 'function') value.destroy();
    const imgs = await figures();
    addText(output, [...stdout, ...stderr, resultText].filter(Boolean).join('\n'));
    for (const base64 of imgs) {
      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + base64;
      img.alt = 'Graf búið til með Matplotlib';
      output.appendChild(img);
    }
  } catch (error) {
    addText(output, [...stdout, ...stderr, String(error)].filter(Boolean).join('\n'), true);
    try { await figures(); } catch (_) { /* Keep initial error. */ }
  } finally {
    setBusy(false);
    status('Python tilbúið', 'ready');
    record.input.focus();
    viewport.scrollTop = viewport.scrollHeight;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }
}
function insertAtCursor(text) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.setRangeText(text, start, end, 'end');
}
editor.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.shiftKey || event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    execute();
  } else if (event.key === 'Enter' && event.altKey) {
    event.preventDefault();
    insertAtCursor('\n');
  } else if (event.key === 'Enter' && !editor.value.includes('\n')) {
    event.preventDefault();
    execute();
  } else if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !editor.value.includes('\n') && (editor.selectionStart === 0 || editor.selectionStart === editor.value.length) && commandHistory.length) {
    event.preventDefault();
    if (event.key === 'ArrowUp') {
      if (historyIndex === commandHistory.length) scratch = editor.value;
      historyIndex = Math.max(0, historyIndex - 1);
    } else {
      historyIndex = Math.min(commandHistory.length, historyIndex + 1);
    }
    editor.value = historyIndex === commandHistory.length ? scratch : commandHistory[historyIndex];
    editor.setSelectionRange(editor.value.length, editor.value.length);
  } else if (event.key === 'Tab') {
    event.preventDefault();
    insertAtCursor('    ');
  }
});
runButton.addEventListener('click', () => execute());
document.querySelector('#clear-terminal').addEventListener('click', () => {
  historyArea.replaceChildren();
  editor.focus();
});
document.querySelector('#restart-terminal').addEventListener('click', () => {
  window.location.reload();
});
const themeButton = document.querySelector('#toggle-theme');
function setTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const label = dark ? 'Nota ljósa stillingu' : 'Nota dökka stillingu';
  themeButton.setAttribute('aria-label', label);
  themeButton.title = label;
  themeButton.innerHTML = dark
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg>';
  themeButton.setAttribute('aria-pressed', String(dark));
  try { localStorage.setItem('edl408-python-theme', dark ? 'dark' : 'light'); } catch (_) {}
}
themeButton.addEventListener('click', () => setTheme(document.documentElement.dataset.theme !== 'dark'));
setTheme(document.documentElement.dataset.theme === 'dark');
setupPython();

