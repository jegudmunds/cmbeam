/* CodeMirror 5.65.20, locally bundled; see LICENSE. */
'use strict';
globalThis.CoursePythonEditor = function (textarea) {
  if (!globalThis.CodeMirror) return textarea;
  const cm = CodeMirror.fromTextArea(textarea, {
    mode: 'python', lineNumbers: true, matchBrackets: true,
    indentUnit: 4, tabSize: 4, indentWithTabs: false,
    viewportMargin: Infinity, inputStyle: 'contenteditable',
    screenReaderLabel: textarea.getAttribute('aria-label') || 'Python-kóði',
    extraKeys: { Tab: (editor) => editor.somethingSelected() ? editor.indentSelection('add') : editor.replaceSelection('    ', 'end'), 'Shift-Tab': 'indentLess' }
  });
  cm.on('change', () => cm.save());
  const adapter = {
    get value() { return cm.getValue(); },
    set value(value) { cm.setValue(value); },
    get selectionStart() { return cm.indexFromPos(cm.getCursor('from')); },
    get selectionEnd() { return cm.indexFromPos(cm.getCursor('to')); },
    set disabled(value) { cm.setOption('readOnly', value); },
    focus() { cm.focus(); },
    setSelectionRange(start, end) { cm.setSelection(cm.posFromIndex(start), cm.posFromIndex(end)); },
    setRangeText(text, start, end) { cm.replaceRange(text, cm.posFromIndex(start), cm.posFromIndex(end)); cm.setCursor(cm.posFromIndex(start + text.length)); },
    addEventListener(name, handler) { if (name === 'keydown') cm.on('keydown', (_, event) => handler(event)); }
  };
  requestAnimationFrame(() => cm.refresh());
  return adapter;
};
