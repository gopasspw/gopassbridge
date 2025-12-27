import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('service_worker', () => {
    let importScriptsMock;

    beforeEach(() => {
        importScriptsMock = vi.fn();
        vi.stubGlobal('importScripts', importScriptsMock);
    });

    it('should import required scripts', async () => {
        await import(`../../web-extension/service_worker.js`);

        expect(importScriptsMock).toHaveBeenCalledTimes(3);
        expect(importScriptsMock).toHaveBeenNthCalledWith(1, 'vendor/browser-polyfill.js');
        expect(importScriptsMock).toHaveBeenNthCalledWith(2, 'generic.js');
        expect(importScriptsMock).toHaveBeenNthCalledWith(3, 'background.js');
    });
});
