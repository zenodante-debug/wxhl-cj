const __wxhlImportFirst = async (label, urls) => {
  const errors = [];
  for (const url of urls) {
    try {
      const module = await import(url);
      console.info(`[无限回廊手机兼容] ${label} 已从 ${url} 加载`);
      return module;
    } catch (error) {
      errors.push(`${url}: ${error?.message || error}`);
      console.warn(`[无限回廊手机兼容] ${label} 地址失败`, url, error);
    }
  }
  throw new Error(`${label} 所有备用地址均加载失败\n${errors.join('\n')}`);
};

const __wxhlShowBootError = error => {
  try {
    const doc = window.parent.document;
    doc.getElementById('wxhl-mobile-compat-error')?.remove();
    const badge = doc.createElement('button');
    badge.id = 'wxhl-mobile-compat-error';
    badge.type = 'button';
    badge.textContent = '小手机依赖加载失败';
    badge.title = String(error?.message || error);
    badge.style.cssText = 'position:fixed;right:12px;top:42%;z-index:2147483647;padding:10px 12px;border:1px solid #ff8a80;border-radius:10px;background:#7f1d1d;color:#fff;font-size:14px;line-height:1.2;box-shadow:0 4px 18px #000a;';
    badge.addEventListener('click', () => alert(`无限回廊小手机加载失败：\n${badge.title}`));
    doc.body.appendChild(badge);
  } catch (_) {
    /* 忽略 */
  }
};

let __wxhlVue;
let __wxhlPinia;
let __wxhlKlona;
try {
  __wxhlVue = globalThis.Vue || await __wxhlImportFirst('Vue', [
    'https://cdn.jsdelivr.net/npm/vue@3.5.13/+esm',
    'https://testingcf.jsdelivr.net/npm/vue@3.5.13/+esm',
    'https://esm.sh/vue@3.5.13'
  ]);
  globalThis.Vue = __wxhlVue;
  __wxhlPinia = await __wxhlImportFirst('Pinia', [
    'https://cdn.jsdelivr.net/npm/pinia@3.0.4/+esm',
    'https://testingcf.jsdelivr.net/npm/pinia@3.0.4/+esm',
    'https://esm.sh/pinia@3.0.4'
  ]);
  __wxhlKlona = await __wxhlImportFirst('klona', [
    'https://cdn.jsdelivr.net/npm/klona@2.0.6/+esm',
    'https://testingcf.jsdelivr.net/npm/klona@2.0.6/+esm',
    'https://esm.sh/klona@2.0.6'
  ]);
} catch (error) {
  __wxhlShowBootError(error);
  throw error;
}
