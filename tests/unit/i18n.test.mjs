import { beforeEach, describe, expect, it } from 'vitest';

describe('i18n', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div>__MSG_testkey__</div>';
    });

    it('should replace __MSG_key__ with translated message', async () => {
        await import(`../../web-extension/i18n.js`);

        expect(document.body.innerHTML).toBe('<div>__translated_testkey__</div>');
        expect(global.i18n.getMessage).toHaveBeenCalledWith('testkey');
    });
});
