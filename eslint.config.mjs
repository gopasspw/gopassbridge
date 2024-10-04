import json from "eslint-plugin-json";
import promise from "eslint-plugin-promise";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["web-extension/vendor/**/*"],
}, {
    files: ["**/*.json"],
    ...json.configs.recommended
}, ...compat.extends("eslint:recommended"), {
    plugins: {
        promise,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.webextensions,
            chrome: true,
        },

        ecmaVersion: 6,
        sourceType: "script",
    },

    rules: {
        "no-undef": 0,
        "no-console": 0,
        "no-unused-vars": 0,
        strict: [2, "global"],
    },
}];