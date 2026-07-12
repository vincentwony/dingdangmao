# coding: utf-8
"""Fix crash-prone null-check omissions found by code review."""
from __future__ import print_function

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. toggleCardCollapse — add headerEl null guard
old = '''function toggleCardCollapse(headerEl) {
  var card = headerEl.parentElement;
  if (!card) return;'''
new = '''function toggleCardCollapse(headerEl) {
  if (!headerEl) return;
  var card = headerEl.parentElement;
  if (!card) return;'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 1: toggleCardCollapse')
else: print('MISS 1: toggleCardCollapse')

# 2. toggleBaziCardCollapse — add headerEl null guard
old = '''function toggleBaziCardCollapse(headerEl) {
  var card = headerEl.parentElement;
  if (!card) return;
  card.classList.toggle('collapsed');'''
new = '''function toggleBaziCardCollapse(headerEl) {
  if (!headerEl) return;
  var card = headerEl.parentElement;
  if (!card) return;
  card.classList.toggle('collapsed');'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 2: toggleBaziCardCollapse')
else: print('MISS 2: toggleBaziCardCollapse')

# 3. _restoreBaziCollapseState — add container null guard
old = '''function _restoreBaziCollapseState(container) {
  var state = {};'''
new = '''function _restoreBaziCollapseState(container) {
  if (!container) return;
  var state = {};'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 3: _restoreBaziCollapseState')
else: print('MISS 3: _restoreBaziCollapseState')

# 4. license_showActivation — wrap with null checks
old = '''function license_showActivation() {
  document.getElementById('licenseMachineIdDisplay').textContent = license_getMachineId();
  document.getElementById('licenseInput').value = '';
  document.getElementById('licenseError').classList.remove('show');
  document.getElementById('licenseActivationOverlay').style.display = 'flex';'''
new = '''function license_showActivation() {
  var elMid = document.getElementById('licenseMachineIdDisplay');
  var elInput = document.getElementById('licenseInput');
  var elErr = document.getElementById('licenseError');
  var elOverlay = document.getElementById('licenseActivationOverlay');
  if (!elMid || !elInput || !elErr || !elOverlay) return;
  elMid.textContent = license_getMachineId();
  elInput.value = '';
  elErr.classList.remove('show');
  elOverlay.style.display = 'flex';'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 4: license_showActivation')
else: print('MISS 4: license_showActivation')

# 5. license_closeActivation — wrap with null check
old = '''function license_closeActivation() {
  document.getElementById('licenseActivationOverlay').style.display = 'none';'''
new = '''function license_closeActivation() {
  var el = document.getElementById('licenseActivationOverlay');
  if (el) el.style.display = 'none';'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 5: license_closeActivation')
else: print('MISS 5: license_closeActivation')

# 6. license_showExpiredPage — wrap with null checks
old = '''function license_showExpiredPage() {
  document.getElementById('licenseExpiredMid').textContent = license_getMachineId();
  document.getElementById('licenseExpiredInput').value = '';
  document.getElementById('licenseExpiredError').classList.remove('show');
  document.getElementById('licenseExpiredPage').style.display = 'flex';'''
new = '''function license_showExpiredPage() {
  var elMid = document.getElementById('licenseExpiredMid');
  var elInput = document.getElementById('licenseExpiredInput');
  var elErr = document.getElementById('licenseExpiredError');
  var elPage = document.getElementById('licenseExpiredPage');
  if (!elMid || !elInput || !elErr || !elPage) return;
  elMid.textContent = license_getMachineId();
  elInput.value = '';
  elErr.classList.remove('show');
  elPage.style.display = 'flex';'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 6: license_showExpiredPage')
else: print('MISS 6: license_showExpiredPage')

# 7. license_doActivate — wrap getElementById with null checks
old = '''  var fullData = document.getElementById(inputId).value.trim();
  var errorEl = document.getElementById(errorId);
  if (!fullData) {
    errorEl.textContent = '请输入注册码';
    errorEl.classList.add('show');
    return;
  }
  errorEl.classList.remove('show');'''
new = '''  var inputEl = document.getElementById(inputId);
  var errorEl = document.getElementById(errorId);
  if (!inputEl || !errorEl) return;
  var fullData = inputEl.value.trim();
  if (!fullData) {
    errorEl.textContent = '请输入注册码';
    errorEl.classList.add('show');
    return;
  }
  errorEl.classList.remove('show');'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 7: license_doActivate')
else: print('MISS 7: license_doActivate')

# 8. zb_calc2 — add null guards for Cal_T and Cal_zb
old = '''function zb_calc2() {
  var ct = Cal_T.value;'''
new = '''function zb_calc2() {
  if (typeof Cal_T === 'undefined' || typeof Cal_zb === 'undefined') return;
  var ct = Cal_T.value;'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 8: zb_calc2')
else: print('MISS 8: zb_calc2')

# 9. tick() — guard global ID refs
old = '''function tick() {
  Cal_T.value = JD.toStr();'''
new = '''function tick() {
  if (typeof Cal_T === 'undefined' || typeof Cal_zb === 'undefined') return;
  Cal_T.value = JD.toStr();'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 9: tick()')
else: print('MISS 9: tick()')

# 10. Immediate execution code: guard Sel1s/Sel2s/Sex_input
old = '''Sel1s.selectedIndex = 15;
Sel2s.selectedIndex = 127;
Sex_input.selectedIndex = 1;'''
new = '''if (typeof Sel1s !== 'undefined') Sel1s.selectedIndex = 15;
if (typeof Sel2s !== 'undefined') Sel2s.selectedIndex = 127;
if (typeof Sex_input !== 'undefined') Sex_input.selectedIndex = 1;'''
if old in content:
    content = content.replace(old, new)
    changes += 1; print('OK 10: immediate execution globals')
else: print('MISS 10: immediate execution globals')

# 11. add -webkit-backdrop-filter at line 279 area
old = '''  backdrop-filter: blur(12px);
  display: flex;'''
new = '''  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;'''
# This pattern might appear multiple times — find the one WITHOUT -webkit- prefix
# Let's find the specific occurrence where -webkit-backdrop-filter is missing
# The issue is at the .bottom-tabs line which is now .top-nav... actually this is the old .bottom-tabs class.
# Let me search for the exact pattern
import re
# Find backdrop-filter WITHOUT preceding -webkit-backdrop-filter
pattern = r'(    backdrop-filter: blur\(12px\);\n    display: flex;)'
# Check if -webkit- is already present before it
matches = list(re.finditer(pattern, content))
fixed_backdrop = 0
for m in reversed(matches):
    start = m.start()
    # Check 60 chars before — is there already a -webkit-backdrop-filter?
    before = content[max(0,start-60):start]
    if '-webkit-backdrop-filter' not in before:
        content = content[:start] + '    -webkit-backdrop-filter: blur(12px);\n' + content[start:]
        fixed_backdrop += 1
if fixed_backdrop > 0:
    changes += 1
    print('OK 11: -webkit-backdrop-filter prefix added ({} occurrences)'.format(fixed_backdrop))
else:
    print('SKIP 11: all backdrop-filter already have -webkit- prefix')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n--- Done: {} changes applied ---'.format(changes))
