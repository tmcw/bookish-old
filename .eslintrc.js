module.exports = {
    extends: "eslint:recommended",
    parserOptions: {
        ecmaVersion: 9
    },
    env: {
        node: true
    },
    overrides: [
        {
            "files": [ "*test.js"],
            "env": {
                jest: true
            }
        }
    ]
};
