import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  {
    ignores: [
      "dist/**",
      "lib/**",
      "node_modules/**",
      "coverage/**",
      "data/**",
      "scripts/**",
      "server.js",
      "vite.config.ts"
    ]
  },
  // Backend Node files (CommonJS/ESM)
  {
    files: ["server/**/*.{js,ts}", "jest.config.js"],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "no-undef": "off" // TypeScript checks types like NodeJS.Timeout natively
    }
  },
  // Test files (Jest)
  {
    files: ["tests/**/*.{js,ts}"],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2021
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "no-constant-binary-expression": "off", // Allowed in tests to verify falsy values
      "no-undef": "off"
    }
  },
  // Frontend TypeScript/React files
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-empty": ["error", { "allowEmptyCatch": true }]
    }
  },
  // ==========================================================
  // LAUREN TAN CONSTRAINT ARCHITECTURE: POKA-YOKE IMPORT RULES
  // ==========================================================
  {
    // Domain Models: zero dependencies on UI, React or services
    files: ["src/models/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-dom",
                "lucide-react",
                "**/services/**",
                "**/controllers/**",
                "**/views/**",
                "**/components/**",
                "**/utils/httpClient*"
              ],
              message:
                "Clean Architecture violation: Domain models must be pure and have zero dependencies on UI frameworks or external services."
            }
          ]
        }
      ]
    }
  },
  {
    // Views and Components: must never import low-level HTTP clients directly
    files: ["src/components/**/*.{ts,tsx}", "src/views/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "*httpClient*",
                "**/utils/httpClient*",
                "**/services/api*"
              ],
              message:
                "Clean Architecture violation: Components and Views must not import low-level HTTP clients directly. Use controllers or services."
            }
          ]
        }
      ]
    }
  },
  {
    // Frontend Isolation: never import server/backend files
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/server/**", "**/lib/**", "express"],
              message:
                "Boundary violation: Frontend code must not import backend server code."
            }
          ]
        }
      ]
    }
  },
  {
    // Backend Isolation: never import frontend code or React
    files: ["server/**/*.{ts,js}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/src/**", "react", "react-dom"],
              message:
                "Boundary violation: Backend server code must not import frontend modules or React."
            }
          ]
        }
      ]
    }
  }
);
