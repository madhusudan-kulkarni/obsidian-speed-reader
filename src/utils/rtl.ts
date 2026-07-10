const RTL_RE = /[\u0590-\u07FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function isRTL(text: string): boolean {
	return RTL_RE.test(text);
}
