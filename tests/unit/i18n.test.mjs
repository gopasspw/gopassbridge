import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('i18n', () => {
    beforeEach(() => {
        vi.resetModules();
        document.body.innerHTML = '<div>__MSG_testkey__</div>';
    });

    it('should replace __MSG_key__ with translated message', async () => {
        await import(`../../web-extension/i18n.js`);

        expect(document.body.innerHTML).toBe('<div>__translated_testkey__</div>');
        expect(global.i18n.getMessage).toHaveBeenCalledWith('testkey');
    });

    it('should use chrome.i18n if global.i18n is missing', async () => {
        delete global.i18n;
        global.chrome = {
            i18n: {
                getMessage: vi.fn((key) => `__chrome_translated_${key}__`),
            },
        };

        await import(`../../web-extension/i18n.js`);

        expect(document.body.innerHTML).toBe('<div>__chrome_translated_testkey__</div>');
        expect(global.chrome.i18n.getMessage).toHaveBeenCalledWith('testkey');
    });
});
